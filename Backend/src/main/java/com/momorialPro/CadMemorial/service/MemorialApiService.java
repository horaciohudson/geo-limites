package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.DxfEntityChangeDTO;
import com.momorialPro.CadMemorial.dto.MemorialStandardDTO;
import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.dto.SelectedConfrontationTextDTO;
import com.momorialPro.CadMemorial.exception.OpenAiQuotaExceededException;
import com.momorialPro.CadMemorial.exception.OpenAiRateLimitException;
import com.momorialPro.CadMemorial.util.CoordinateUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import org.springframework.web.client.HttpStatusCodeException;

import java.util.*;
import java.util.stream.Collectors;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemorialApiService {
    private static final Pattern LOT_BLOCK_PATTERN = Pattern.compile("(?ims)^LOTE\\s+(\\d+)\\s*:\\s*.*?(?=^LOTE\\s+\\d+\\s*:|\\z)");
    private static final Pattern ORDER_LABEL_PATTERN = Pattern.compile(
            "(?i)^\\s*(?:P|PT|PONTO|V|ESTACA|E)\\s*[-_:/#]*\\s*0*(\\d{1,4})\\s*$"
    );

    private final MemorialStandardService memorialStandardService;
    private final MemorialCacheService cacheService;
    private final MemorialMetricsService metricsService;
    private final PropertyService propertyService;

    @Autowired
    private ConfrontationDetectionService confrontationDetectionService;

    @Autowired
    private DxfTextExtractorService dxfTextExtractorService;

    @Autowired
    private MemorialChunkService chunkService;

    @Autowired
    private ClaudePromptCacheService promptCacheService;

    @Autowired
    private CoordinateExtractionService coordinateExtractionService;

    @Autowired
    private LegalTemplateService legalTemplateService;

    @Autowired
    private DxfGeoReferenciaExtractorService geoExtractorService;

    @Autowired
    private ApiSettingsService apiSettingsService;

    @Value("${OPENAI_API_KEY:}")
    private String openaiApiKey;

    // Configurações Claude (ÚNICO PROVIDER)
    @Value("${memorialpro.claude.model}")
    private String claudeModel;

    @Value("${memorialpro.claude.api-key}")
    private String claudeApiKey;

    @Value("${memorialpro.claude.endpoint}")
    private String claudeEndpoint;

    @Value("${memorialpro.claude.max-tokens:8000}")
    private int claudeMaxTokens;

    @Value("${memorialpro.claude.timeout:300000}")
    private int timeout;

    @Value("${memorialpro.claude.max-retries:3}")
    private int maxRetries;

    @Value("${memorialpro.claude.chunk-delay:10000}")
    private long chunkDelay;

    // Configurações de particionamento
    @Value("${memorialpro.memorial.partition.enabled:true}")
    private boolean partitionEnabled;

    @Value("${memorialpro.memorial.partition.threshold:15}")
    private int partitionThreshold;

    // Fallback
    @Value("${memorialpro.llm.fallback-enabled:true}")
    private boolean fallbackEnabled;

    /**
     * Método principal de geração de memorial.
     * Usa geracao assistida com particionamento inteligente quando necessario.
     */
    public String generate(DxfCompareResultDTO r, UUID standardId, UUID userId, UUID propertyId) {
        return generate(r, standardId, userId, propertyId, null, null, null);
    }

    public String generate(DxfCompareResultDTO r, UUID standardId, UUID userId, UUID propertyId,
                           Integer lotCountOverride, List<String> selectedLayers,
                           List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        long startTime = System.currentTimeMillis();
        String provider = resolveMemorialProvider();

        // Gera chave de cache e limpa entrada existente para forçar regeneração
        String cacheKey = cacheService.generateCacheKey(r);
        cacheService.removeFromCache(cacheKey);

        if (!hasValidConfiguredProviderKey(provider)) {
            log.error("Provedor {} configurado sem credencial valida para memoriais", provider);

            if (fallbackEnabled) {
                log.warn("Usando modo FALLBACK - gerando memorial sem IA");
                return generateFallbackMemorial(r, standardId);
            }

            return "ERRO DE CONFIGURACAO\\n\\nA chave do provedor de geracao assistida nao esta configurada.";
        }

        // ===== EXTRAÇÃO AVANÇADA DE DADOS DO DXF =====
        // Converter entidades para formato compatível
        List<Map<String, Object>> allEntities = convertToEntityMaps(r);

        // Buscar dados da propriedade o quanto antes para apoiar georreferenciamento e prompts
        PropertyDTO property = null;
        if (propertyId != null) {
            try {
                property = propertyService.findByIdWithRelationships(propertyId, userId);
                if (property == null) {
                    log.warn("⚠️ Propriedade não encontrada");
                }
            } catch (Exception e) {
                log.error("❌ Erro ao buscar propriedade: {}", e.getMessage());
            }
        }
        
        // Extrair pontos
        List<SimplePoint> extractedPoints = extractPointsFromEntities(r);

        DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform =
                geoExtractorService.buildTransformFromLandmarks(allEntities, property);

        if (georeferencingTransform != null) {
            extractedPoints = applyGeoreferencingTransform(extractedPoints, georeferencingTransform);
            log.info(
                    "✅ Georreferenciamento aplicado por pontos cadastrados: correspondencias={} rotacao={} escala={} residuoMedio={}m",
                    georeferencingTransform.matchedPoints().size(),
                    String.format(Locale.US, "%.4f", georeferencingTransform.rotationDegrees()),
                    String.format(Locale.US, "%.8f", georeferencingTransform.scale()),
                    String.format(Locale.US, "%.4f", georeferencingTransform.averageResidualMeters())
            );
        }
        
        if (extractedPoints.isEmpty()) {
            log.warn("Nao foram encontradas coordenadas confiaveis nesta leitura do DXF");
            
            // NÃO desistir - continuar com dados da propriedade
            extractedPoints = new ArrayList<>(); // Lista vazia, mas continua processamento
        }

        // ===== EXTRAÇÃO AVANÇADA DE COORDENADAS SIRGAS 2000 =====
        DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase = 
                geoExtractorService.extrairCoordenadaBase(allEntities);
        
        // ===== FALLBACK: COORDENADAS SIRGAS MANUAIS =====
        if (coordenadaBase == null && property != null) {
            coordenadaBase = tentarCoordenadaManual(property);
        }
        
        // Manter compatibilidade com sistema antigo
        Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates = new HashMap<>();
        if (georeferencingTransform != null) {
            realCoordinates.putAll(buildRealCoordinatesFromTransform(georeferencingTransform));
        }
        if (coordenadaBase != null) {
            // Converter para formato compatível
            CoordinateExtractionService.RealCoordinate baseCoord = 
                    new CoordinateExtractionService.RealCoordinate(
                            coordenadaBase.getE(), 
                            coordenadaBase.getN(), 
                            coordenadaBase.getFonte()
                    );
            realCoordinates.put("BASE_SIRGAS", baseCoord);
        } else {
            log.warn("⚠️ COORDENADA BASE SIRGAS NÃO INFORMADA - tentando extrair coordenadas reais do DXF");
            realCoordinates = coordinateExtractionService.extractRealCoordinates(allEntities);
        }

        List<String> streetNames = mergeManualStreetNames(
                dxfTextExtractorService.extractStreetNames(allEntities),
                selectedConfrontationTexts
        );

        Map<String, List<String>> confrontations = mergeManualConfrontations(
                dxfTextExtractorService.extractConfrontations(allEntities),
                selectedConfrontationTexts
        );

        Map<String, Double> individualAreas = dxfTextExtractorService.calculateIndividualAreas(allEntities);

        boolean temCoordenadaBaseSirgas = coordenadaBase != null;
        boolean temCoordenadasReaisExtraidas = !realCoordinates.isEmpty();

        if (temCoordenadaBaseSirgas) {
            log.info("✅ USANDO COORDENADA BASE SIRGAS NO MEMORIAL");
        } else if (temCoordenadasReaisExtraidas) {
            log.warn("⚠️ COORDENADA BASE SIRGAS AUSENTE - usando {} coordenadas extraídas do DXF como fallback no memorial",
                    realCoordinates.size());
        } else {
            log.warn("⚠️ NENHUMA COORDENADA REAL DISPONÍVEL - memorial pode usar referências genéricas");
        }

        // ===== FILTRAR PONTOS EXTRAÍDOS PARA REDUZIR VOLUME =====
        List<SimplePoint> filteredPoints = filterAndReducePoints(extractedPoints);
        
        // Usar pontos filtrados ao invés dos originais
        extractedPoints = filteredPoints;

        // Buscar norma
        MemorialStandardDTO standard = memorialStandardService.findById(standardId).orElse(null);
        if (standard == null) {
            log.error("❌ ERRO CRÍTICO: Norma com ID {} não encontrada!", standardId);
            throw new RuntimeException("Norma não encontrada: " + standardId);
        }

        // Buscar dados da propriedade
        // Estimar número de lotes
        int estimatedLotCount = resolveRequestedLotCount(r, lotCountOverride);

        // DECISÃO: Usar particionamento ou geração única?
        // Particiona projetos maiores para respeitar limites de resposta do provedor.
        int haikuThreshold = Math.max(1, partitionThreshold);
        
        if (partitionEnabled && estimatedLotCount > haikuThreshold) {
            return generateWithPartitioning(r, standard, property, extractedPoints, realCoordinates,
                    streetNames, confrontations, individualAreas, standardId, userId, propertyId, startTime,
                    coordenadaBase, georeferencingTransform, provider, estimatedLotCount, allEntities, selectedLayers, selectedConfrontationTexts);
        } else {
            return generateSingleCall(r, standard, property, extractedPoints, realCoordinates,
                    streetNames, confrontations, individualAreas, standardId, userId, propertyId, startTime,
                    provider, estimatedLotCount, allEntities, selectedLayers, selectedConfrontationTexts, georeferencingTransform);
        }
    }

    private String resolveMemorialProvider() {
        String provider = apiSettingsService.getSettings().getMemorialApiProvider();
        return provider == null || provider.isBlank() ? "CLAUDE" : provider.trim();
    }

    private boolean isOpenAiProvider(String provider) {
        return "OPENAI".equalsIgnoreCase(provider) || "GPT".equalsIgnoreCase(provider);
    }

    private boolean hasValidConfiguredProviderKey(String provider) {
        if (isOpenAiProvider(provider)) {
            return openaiApiKey != null && !openaiApiKey.trim().isEmpty();
        }

        return claudeApiKey != null
                && !claudeApiKey.equals("PLACEHOLDER_KEY")
                && !claudeApiKey.trim().isEmpty();
    }

    /**
     * Gera memorial em uma unica chamada para projetos pequenos ou medios.
     */
    private String generateSingleCall(
            DxfCompareResultDTO r,
            MemorialStandardDTO standard,
            PropertyDTO property,
            List<SimplePoint> extractedPoints,
            Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
            List<String> streetNames,
            Map<String, List<String>> confrontations,
            Map<String, Double> individualAreas,
            UUID standardId,
            UUID userId,
            UUID propertyId,
            long startTime,
            String provider,
            int estimatedLotCount,
            List<Map<String, Object>> allEntities,
            List<String> selectedLayers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {

        String prompt = buildPrompt(r, standard, property, extractedPoints, realCoordinates, streetNames,
                confrontations, individualAreas, allEntities, selectedLayers, selectedConfrontationTexts, estimatedLotCount, georeferencingTransform);
        List<LotTechnicalSummary> expectedSummaries = selectLotTechnicalSummaries(
                allEntities,
                confrontations,
                selectedConfrontationTexts,
                georeferencingTransform,
                1,
                estimatedLotCount
        );

        // Calcula max_tokens dinamicamente
        int dynamicMaxTokens = calculateDynamicMaxTokens(estimatedLotCount, claudeMaxTokens, 8000);

        // Constrói payload para Claude
        Map<String, Object> body = new HashMap<>();
        body.put("model", claudeModel);
        body.put("max_tokens", dynamicMaxTokens);
        body.put("temperature", 0.2);

        // System prompt
        List<Map<String, Object>> systemPrompt = promptCacheService.buildCachedSystemPrompt(standard);
        body.put("system", systemPrompt);

        // Mensagem do usuário
        body.put("messages", new Object[]{
                Map.of("role", "user", "content", prompt)
        });

        if ("OPENAI".equalsIgnoreCase(provider) || "GPT".equalsIgnoreCase(provider)) {
            return generateWithOpenAi(prompt, systemPrompt, expectedSummaries, estimatedLotCount, r, standard, property);
        }

        // TENTATIVA COM RETRY
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                RestTemplate restTemplate = new RestTemplate();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("x-api-key", claudeApiKey);
                headers.set("anthropic-version", "2023-06-01");

                promptCacheService.addCacheHeaders(headers);

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

                ResponseEntity<Map> response = restTemplate.exchange(
                        claudeEndpoint,
                        HttpMethod.POST,
                        entity,
                        Map.class
                );

                Map<String, Object> responseBody = response.getBody();
                String content = normalizeMemorialLotOrdering(
                        sanitizeMemorialText(extractContentFromClaudeResponse(responseBody))
                );
                MemorialAlignmentCheck alignmentCheck = validateMemorialAlignment("single-call", content, expectedSummaries);
                logMemorialAlignment("single-call", content, expectedSummaries, alignmentCheck);

                // Validação de completude
                boolean isComplete = validateCompleteness(content, estimatedLotCount);
                if (!alignmentCheck.valid() || !isComplete) {
                    if (!alignmentCheck.valid()) {
                        log.warn("Resposta da IA rejeitada no modo unico: {}", alignmentCheck.blockingIssues());
                    }
                    if (!isComplete) {
                        log.warn("⚠️ MEMORIAL INCOMPLETO: Não contém todos os {} lotes esperados", estimatedLotCount);
                    }

                    if (attempt < maxRetries) {
                        continue;
                    }

                    return buildDeterministicFullMemorial(
                            "single-call",
                            standard,
                            property,
                            r,
                            expectedSummaries,
                            alignmentCheck.valid() ? null : new RuntimeException(String.join(" | ", alignmentCheck.blockingIssues()))
                    );
                }

                String result = content;

                // Registra métricas e cache
                long processingTime = System.currentTimeMillis() - startTime;
                int estimatedLots = estimatedLotCount;
                int entitiesProcessed = (r.getAdded() != null ? r.getAdded().size() : 0) +
                        (r.getRemoved() != null ? r.getRemoved().size() : 0) +
                        (r.getModified() != null ? r.getModified().size() : 0);

                metricsService.recordSuccessfulGeneration(processingTime, estimatedLots, entitiesProcessed, result.length());

                // Cache do resultado
                String cacheKey = cacheService.generateCacheKey(r);
                cacheService.putInCache(cacheKey, result, estimatedLots);

                return result;

            } catch (Exception e) {
                log.error("💥 Exceção na tentativa {}: {}", attempt, e.getMessage(), e);

                if (attempt < maxRetries) {
                    long waitTime = attempt * 2000; // Backoff exponencial
                    try {
                        Thread.sleep(waitTime);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    if (fallbackEnabled) {
                        log.warn("🔄 Todas as tentativas falharam, usando fallback");
                        if (!expectedSummaries.isEmpty()) {
                            return buildDeterministicFullMemorial("single-call", standard, property, r, expectedSummaries, e);
                        }
                        return generateFallbackMemorial(r, standardId);
                    } else {
                        throw new RuntimeException("Falha na geração do memorial após " + maxRetries + " tentativas: " + e.getMessage());
                    }
                }
            }
        }

        return "Erro inesperado na geração do memorial";
    }

    private String generateWithOpenAi(
            String prompt,
            List<Map<String, Object>> systemPrompt,
            List<LotTechnicalSummary> expectedSummaries,
            int estimatedLotCount,
            DxfCompareResultDTO r,
            MemorialStandardDTO standard,
            PropertyDTO property) {
        if (openaiApiKey == null || openaiApiKey.trim().isEmpty()) {
            throw new IllegalStateException("API Key da OpenAI não configurada (OPENAI_API_KEY).");
        }

        long startTime = System.currentTimeMillis();

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                RestTemplate restTemplate = new RestTemplate();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(openaiApiKey);

                Map<String, Object> body = new HashMap<>();
                body.put("model", "gpt-4o");
                body.put("temperature", 0.2);

                List<Map<String, Object>> messages = new ArrayList<>();
                for (Map<String, Object> sp : systemPrompt) {
                    messages.add(Map.of("role", "system", "content", sp.get("text") != null ? sp.get("text") : ""));
                }
                messages.add(Map.of("role", "user", "content", prompt));
                body.put("messages", messages);

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
                ResponseEntity<Map> response = restTemplate.exchange(
                        "https://api.openai.com/v1/chat/completions",
                        HttpMethod.POST,
                        entity,
                        Map.class
                );

                Map<String, Object> responseBody = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                String content = normalizeMemorialLotOrdering(
                        sanitizeMemorialText((String) message.get("content"))
                );
                MemorialAlignmentCheck alignmentCheck = validateMemorialAlignment("single-call-openai", content, expectedSummaries);
                logMemorialAlignment("single-call-openai", content, expectedSummaries, alignmentCheck);

                boolean isComplete = validateCompleteness(content, estimatedLotCount);
                if (!alignmentCheck.valid() || !isComplete) {
                    if (!alignmentCheck.valid()) {
                        log.warn("Resposta da OpenAI rejeitada no modo unico: {}", alignmentCheck.blockingIssues());
                    }
                    if (!isComplete) {
                        log.warn("⚠️ MEMORIAL INCOMPLETO (OpenAI)");
                    }

                    if (attempt < maxRetries) {
                        continue;
                    }

                    return buildDeterministicFullMemorial(
                            "single-call-openai",
                            standard,
                            property,
                            r,
                            expectedSummaries,
                            alignmentCheck.valid() ? null : new RuntimeException(String.join(" | ", alignmentCheck.blockingIssues()))
                    );
                }

                String result = content;

                long processingTime = System.currentTimeMillis() - startTime;
                int entitiesProcessed = (r.getAdded() != null ? r.getAdded().size() : 0) +
                        (r.getRemoved() != null ? r.getRemoved().size() : 0) +
                        (r.getModified() != null ? r.getModified().size() : 0);
                metricsService.recordSuccessfulGeneration(processingTime, estimatedLotCount, entitiesProcessed, result.length());

                String cacheKey = cacheService.generateCacheKey(r);
                cacheService.putInCache(cacheKey, result, estimatedLotCount);

                return result;

            } catch (HttpStatusCodeException e) {
                String responseBody = e.getResponseBodyAsString();
                log.error("Exceção na tentativa {} da OpenAI: {}", attempt, e.getMessage());

                if (isOpenAiQuotaExceeded(e, responseBody)) {
                    throw new OpenAiQuotaExceededException(
                            "A conta da OpenAI esta sem cota disponivel ou com problema de faturamento.",
                            e
                    );
                }

                if (isOpenAiRateLimit(e, responseBody)) {
                    if (attempt == maxRetries) {
                        if (!expectedSummaries.isEmpty()) {
                            log.warn("Rate limit da OpenAI no modo unico; ativando fallback tecnico deterministico.");
                            return buildDeterministicFullMemorial("single-call-openai", standard, property, r, expectedSummaries, e);
                        }
                        if (fallbackEnabled) {
                            return generateFallbackMemorial(r, null);
                        }
                        throw new OpenAiRateLimitException(
                                "A OpenAI atingiu o limite temporario de requisicoes/tokens. Tente novamente em alguns segundos.",
                                e
                        );
                    }
                    try { Thread.sleep(2000L * attempt); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    continue;
                }

                if (attempt == maxRetries) {
                    if (fallbackEnabled) {
                        if (!expectedSummaries.isEmpty()) {
                            return buildDeterministicFullMemorial("single-call-openai", standard, property, r, expectedSummaries, e);
                        }
                        return generateFallbackMemorial(r, null);
                    }
                    throw new RuntimeException("Falha na geração do memorial (OpenAI) após " + maxRetries + " tentativas: " + e.getMessage(), e);
                }
                try { Thread.sleep(2000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
            } catch (Exception e) {
                log.error("Exceção na tentativa {} da OpenAI: {}", attempt, e.getMessage());
                if (attempt == maxRetries) {
                    if (fallbackEnabled) {
                        if (!expectedSummaries.isEmpty()) {
                            return buildDeterministicFullMemorial("single-call-openai", standard, property, r, expectedSummaries, e);
                        }
                        return generateFallbackMemorial(r, null);
                    }
                    throw new RuntimeException("Falha na geração do memorial (OpenAI) após " + maxRetries + " tentativas: " + e.getMessage(), e);
                }
                try { Thread.sleep(2000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
            }
        }
        return "Erro inesperado na geração do memorial (OpenAI)";
    }

    private boolean isOpenAiQuotaExceeded(HttpStatusCodeException exception, String responseBody) {
        String combined = ((exception.getMessage() != null ? exception.getMessage() : "") + " "
                + (responseBody != null ? responseBody : "")).toLowerCase(Locale.ROOT);

        return combined.contains("insufficient_quota")
                || combined.contains("you exceeded your current quota")
                || combined.contains("billing")
                || combined.contains("credit balance is too low");
    }

    private boolean isOpenAiRateLimit(HttpStatusCodeException exception, String responseBody) {
        String combined = ((exception.getMessage() != null ? exception.getMessage() : "") + " "
                + (responseBody != null ? responseBody : "")).toLowerCase(Locale.ROOT);

        return exception.getStatusCode().value() == 429
                && (combined.contains("rate_limit_exceeded")
                || combined.contains("tokens per min")
                || combined.contains("requests per min")
                || combined.contains("too many requests")
                || combined.contains("please try again in"));
    }

    /**
     * Classe interna para representar pontos simples
     */
    public static class SimplePoint {
        private final double x;
        private final double y;
        private final String id;

        public SimplePoint(double x, double y, String id) {
            this.x = x;
            this.y = y;
            this.id = id;
        }

        public double getX() { return x; }
        public double getY() { return y; }
        public String getId() { return id; }
    }

    /**
     * Extrai pontos das entidades DXF
     */
    private List<SimplePoint> extractPointsFromEntities(DxfCompareResultDTO r) {
        List<SimplePoint> points = new ArrayList<>();
        int pointId = 1;

        if (r.getAdded() != null) {
            for (DxfEntityChangeDTO entity : r.getAdded()) {
                // Extrair coordenadas principais
                if (entity.getX() != null && entity.getY() != null) {
                    // Validar se as coordenadas são reais (não fictícias)
                    if (isValidCoordinate(entity.getX(), entity.getY())) {
                        points.add(new SimplePoint(entity.getX(), entity.getY(), "P" + pointId++));
                    }
                }
                
                // Extrair coordenadas secundárias (para linhas, polylines)
                if (entity.getX2() != null && entity.getY2() != null) {
                    if (isValidCoordinate(entity.getX2(), entity.getY2())) {
                        points.add(new SimplePoint(entity.getX2(), entity.getY2(), "P" + pointId++));
                    }
                }

                // Extrair vértices de polylines se disponíveis
                if (entity.getVertices() != null && !entity.getVertices().isEmpty()) {
                    for (Object vertex : entity.getVertices()) {
                        if (vertex instanceof Map) {
                            Map<?, ?> vertexMap = (Map<?, ?>) vertex;
                            Object xObj = vertexMap.get("x");
                            Object yObj = vertexMap.get("y");
                            
                            if (xObj != null && yObj != null) {
                                try {
                                    double x = Double.parseDouble(xObj.toString());
                                    double y = Double.parseDouble(yObj.toString());
                                    
                                    if (isValidCoordinate(x, y)) {
                                        points.add(new SimplePoint(x, y, "V" + pointId++));
                                    }
                                } catch (NumberFormatException e) {
                                    // Log apenas erros críticos
                                    if (log.isTraceEnabled()) {
                                        log.trace("Erro ao converter vértice: {}", vertexMap);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Processar entidades modificadas e removidas também
        if (r.getModified() != null) {
            for (DxfEntityChangeDTO entity : r.getModified()) {
                if (entity.getX() != null && entity.getY() != null && isValidCoordinate(entity.getX(), entity.getY())) {
                    points.add(new SimplePoint(entity.getX(), entity.getY(), "M" + pointId++));
                }
            }
        }

        if (r.getRemoved() != null) {
            for (DxfEntityChangeDTO entity : r.getRemoved()) {
                if (entity.getX() != null && entity.getY() != null && isValidCoordinate(entity.getX(), entity.getY())) {
                    points.add(new SimplePoint(entity.getX(), entity.getY(), "R" + pointId++));
                }
            }
        }

        return points;
    }

    /**
     * Valida se uma coordenada é real (não fictícia)
     */
    private boolean isValidCoordinate(double x, double y) {
        // Aceita coordenadas UTM (grandes) ou coordenadas locais (médias)
        // Rejeita apenas coordenadas muito pequenas (0, 1, 2, etc.)
        return (x >= 10.0 && y >= 10.0) || 
               (x > 100000 && y > 1000000); // UTM válido
    }

    private List<SimplePoint> applyGeoreferencingTransform(
            List<SimplePoint> points,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform transform) {
        if (points == null || points.isEmpty() || transform == null) {
            return points;
        }

        List<SimplePoint> transformed = new ArrayList<>(points.size());
        for (SimplePoint point : points) {
            double[] projected = geoExtractorService.transform(point.getX(), point.getY(), transform);
            transformed.add(new SimplePoint(projected[0], projected[1], point.getId()));
        }
        return transformed;
    }

    private Map<String, CoordinateExtractionService.RealCoordinate> buildRealCoordinatesFromTransform(
            DxfGeoReferenciaExtractorService.GeoreferencingTransform transform) {
        Map<String, CoordinateExtractionService.RealCoordinate> transformedCoordinates = new LinkedHashMap<>();
        if (transform == null || transform.matchedPoints() == null) {
            return transformedCoordinates;
        }

        for (DxfGeoReferenciaExtractorService.MatchedReferencePoint matchedPoint : transform.matchedPoints()) {
            transformedCoordinates.put(
                    matchedPoint.propertyLabel(),
                    new CoordinateExtractionService.RealCoordinate(
                            matchedPoint.realE(),
                            matchedPoint.realN(),
                            transform.source()
                    )
            );
        }
        return transformedCoordinates;
    }

    private double projectVertexX(
            double x,
            double y,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {
        if (georeferencingTransform == null) {
            return x;
        }
        return geoExtractorService.transform(x, y, georeferencingTransform)[0];
    }

    private double projectVertexY(
            double x,
            double y,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {
        if (georeferencingTransform == null) {
            return y;
        }
        return geoExtractorService.transform(x, y, georeferencingTransform)[1];
    }

    /**
     * Filtra e reduz pontos extraídos para evitar sobrecarga
     * CORREÇÃO AGRESSIVA: Reduz de 586+ pontos para máximo 25-30 pontos essenciais
     */
    private List<SimplePoint> filterAndReducePoints(List<SimplePoint> allPoints) {
        if (allPoints == null || allPoints.isEmpty()) {
            return new ArrayList<>();
        }

        List<SimplePoint> filteredPoints = new ArrayList<>();
        
        // ESTRATÉGIA 1: Tolerância maior para eliminar mais duplicatas
        Set<String> processedCoordinates = new HashSet<>();
        double tolerance = 5.0; // 5 metros de tolerância (mais agressivo)
        
        for (SimplePoint point : allPoints) {
            // Arredondar coordenadas para eliminar duplicatas próximas
            int roundedX = (int) Math.round(point.getX() / tolerance);
            int roundedY = (int) Math.round(point.getY() / tolerance);
            String coordKey = roundedX + "," + roundedY;
            
            if (!processedCoordinates.contains(coordKey)) {
                processedCoordinates.add(coordKey);
                filteredPoints.add(point);
            }
        }
        
        // ESTRATÉGIA 2: Priorizar pontos SIRGAS primeiro
        List<SimplePoint> sirgasPoints = filteredPoints.stream()
                .filter(p -> isSirgasCoordinate(p.getX(), p.getY()))
                .collect(Collectors.toList());
        
        List<SimplePoint> finalPoints = new ArrayList<>();
        
        if (!sirgasPoints.isEmpty()) {
            // Limitar a 20 pontos SIRGAS
            finalPoints.addAll(sirgasPoints.stream().limit(20).collect(Collectors.toList()));
        }
        
        // ESTRATÉGIA 3: Completar com pontos gerais se necessário (máximo 10 adicionais)
        if (finalPoints.size() < 25) {
            int needed = Math.min(10, 25 - finalPoints.size());
            final List<SimplePoint> currentFinalPoints = finalPoints; // Create final reference for lambda
            List<SimplePoint> additionalPoints = filteredPoints.stream()
                .filter(p -> !currentFinalPoints.contains(p))
                .limit(needed)
                .collect(Collectors.toList());
            finalPoints.addAll(additionalPoints);
        }
        
        // ESTRATÉGIA 4: Se ainda há muitos, fazer amostragem final
        if (finalPoints.size() > 30) {
            List<SimplePoint> sampledPoints = new ArrayList<>();
            int step = Math.max(1, finalPoints.size() / 30);
            
            for (int i = 0; i < finalPoints.size(); i += step) {
                if (sampledPoints.size() < 30) {
                    sampledPoints.add(finalPoints.get(i));
                }
            }
            finalPoints = sampledPoints;
        }

        return finalPoints;
    }

    /**
     * Verifica se as coordenadas são válidas para SIRGAS 2000 no Ceará
     */
    private boolean isSirgasCoordinate(double x, double y) {
        // Ceará está aproximadamente em:
        // E: 200.000 a 800.000
        // N: 9.000.000 a 10.000.000
        return x >= 200000 && x <= 800000 && y >= 9000000 && y <= 10000000;
    }

    /**
     * Converte entidades DXF para formato de mapa compatível com CoordinateExtractionService
     */
    private List<Map<String, Object>> convertToEntityMaps(DxfCompareResultDTO r) {
        List<Map<String, Object>> entities = new ArrayList<>();

        if (r.getAdded() != null) {
            for (DxfEntityChangeDTO entity : r.getAdded()) {
                Map<String, Object> entityMap = new HashMap<>();
                entityMap.put("type", entity.getType());
                entityMap.put("layer", entity.getLayer());
                entityMap.put("x", entity.getX());
                entityMap.put("y", entity.getY());
                entityMap.put("x2", entity.getX2());
                entityMap.put("y2", entity.getY2());
                
                // Adicionar propriedades para textos
                if ("TEXT".equals(entity.getType()) || "MTEXT".equals(entity.getType())) {
                    Map<String, Object> properties = new HashMap<>();
                    properties.put("text", entity.getText());
                    entityMap.put("properties", properties);
                }
                
                // Adicionar propriedades para polylines
                if ("POLYLINE".equals(entity.getType()) || "LWPOLYLINE".equals(entity.getType())) {
                    Map<String, Object> properties = new HashMap<>();
                    
                    // Converter vértices se disponíveis
                    if (entity.getVertices() != null && !entity.getVertices().isEmpty()) {
                        List<Map<String, Object>> vertices = new ArrayList<>();
                        
                        for (Object vertex : entity.getVertices()) {
                            if (vertex instanceof Map) {
                                Map<?, ?> vertexMap = (Map<?, ?>) vertex;
                                Map<String, Object> convertedVertex = new HashMap<>();
                                convertedVertex.put("x", vertexMap.get("x"));
                                convertedVertex.put("y", vertexMap.get("y"));
                                vertices.add(convertedVertex);
                            }
                        }
                        
                        properties.put("vertices", vertices);
                    }
                    
                    entityMap.put("properties", properties);
                }
                
                entities.add(entityMap);
            }
        }

        return entities;
    }

    private int resolveRequestedLotCount(DxfCompareResultDTO r, Integer lotCountOverride) {
        if (lotCountOverride != null && lotCountOverride > 0) {
            return lotCountOverride;
        }
        return safeEstimateLotCount(r);
    }

    /**
     * Estima o número de lotes de forma segura
     */
    private int safeEstimateLotCount(DxfCompareResultDTO r) {
        try {
            int entityCount = 0;
            int polylineCount = 0;
            int textCount = 0;
            int lotTextCount = 0;
            
            // Contar entidades por tipo
            if (r.getAdded() != null) {
                entityCount += r.getAdded().size();
                
                for (DxfEntityChangeDTO entity : r.getAdded()) {
                    String type = entity.getType();
                    if (type != null) {
                        if (type.contains("POLYLINE") || type.contains("LWPOLYLINE")) {
                            polylineCount++;
                        } else if (type.equals("TEXT") || type.equals("MTEXT")) {
                            textCount++;
                            
                            // Verificar se o texto contém números de lotes
                            String text = entity.getText();
                            if (text != null && (text.matches(".*\\b\\d+\\b.*") || 
                                               text.toLowerCase().contains("lote") ||
                                               text.toLowerCase().contains("lot"))) {
                                lotTextCount++;
                            }
                        }
                    }
                }
            }

            // ESTRATÉGIA DE ESTIMATIVA INTELIGENTE
            int estimated = Math.max(1, lotTextCount);
            
            // Método 1: Baseado em polylines (mais confiável)
            if (polylineCount > 0) {
                // Cada lote geralmente tem 1 polyline principal
                estimated = Math.max(estimated, polylineCount);
            }
            
            // Método 2: Baseado em textos de lotes
            if (lotTextCount > 0) {
                estimated = Math.max(estimated, lotTextCount);
            }
            
            // Método 3: Baseado no total de entidades (fallback)
            if (entityCount > 50) {
                int entityBasedEstimate = Math.max(1, entityCount / 12); // 1 lote para cada 12 entidades
                estimated = Math.max(estimated, entityBasedEstimate);
            }
            
            // Limitar entre valores razoáveis
            estimated = Math.min(100, Math.max(1, estimated));

            return estimated;
            
        } catch (Exception e) {
            log.error("❌ Erro ao estimar lotes: {}", e.getMessage(), e);
            log.warn("🔄 Usando estimativa padrão mínima: 1 lote");
            return 1;
        }
    }

    /**
     * Gera memorial com particionamento
     */
    private String generateWithPartitioning(
            DxfCompareResultDTO r,
            MemorialStandardDTO standard,
            PropertyDTO property,
            List<SimplePoint> extractedPoints,
            Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
            List<String> streetNames,
            Map<String, List<String>> confrontations,
            Map<String, Double> individualAreas,
            UUID standardId,
            UUID userId,
            UUID propertyId,
            long startTime,
            DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform,
            String provider,
            int totalLots,
            List<Map<String, Object>> allEntities,
            List<String> selectedLayers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        
        // Claude Haiku: máximo ~10 lotes por chunk para caber em 4096 tokens
        int lotsPerChunk = Math.max(1, Math.min(7, partitionThreshold));
        int totalChunks = (int) Math.ceil((double) totalLots / lotsPerChunk);
        
        StringBuilder finalMemorial = new StringBuilder();
        
        // Gerar preâmbulo uma vez
        String preamble = generatePreamble(standard, property);
        finalMemorial.append(preamble).append("\n\n");
        
        // Gerar cada chunk de lotes
        for (int chunk = 0; chunk < totalChunks; chunk++) {
            int startLot = (chunk * lotsPerChunk) + 1;
            int endLot = Math.min(startLot + lotsPerChunk - 1, totalLots);
            long chunkStartTime = System.currentTimeMillis();
            
            try {
                String chunkContent = generateLotChunk(startLot, endLot, r, standard, property, 
                        extractedPoints, realCoordinates, streetNames, confrontations, individualAreas,
                        coordenadaBase, georeferencingTransform, provider, allEntities, selectedLayers, selectedConfrontationTexts, totalLots);

                String normalizedChunk = normalizeChunkOutput(chunkContent, startLot, endLot);
                finalMemorial.append(normalizedChunk).append("\n");
                long chunkTime = System.currentTimeMillis() - chunkStartTime;
                
                // Delay entre chunks para evitar rate limit
                if (chunk < totalChunks - 1) {
                    Thread.sleep(chunkDelay);
                }
                
            } catch (Exception e) {
                log.error("❌ Erro no chunk {}: {}", chunk + 1, e.getMessage());

                List<LotTechnicalSummary> fallbackSummaries = selectLotTechnicalSummaries(
                        allEntities,
                        confrontations,
                        selectedConfrontationTexts,
                        georeferencingTransform,
                        startLot,
                        Math.max(1, endLot - startLot + 1)
                );
                if (!fallbackSummaries.isEmpty()) {
                    finalMemorial.append(buildDeterministicChunkFallback(
                            "partition-loop-" + startLot + "-" + endLot,
                            property,
                            fallbackSummaries,
                            e
                    )).append("\n");
                    continue;
                }

                finalMemorial.append("LOTES ").append(startLot).append(" a ").append(endLot)
                        .append(": Erro na geração - revisar manualmente.\n\n");
            }
        }
        
        // Adicionar conclusão
        finalMemorial.append(generateConclusion(property));

        String normalizedMemorial = normalizeMemorialLotOrdering(finalMemorial.toString());
        
        // Adicionar metadados
        String result = addMetadata(normalizedMemorial, property, r, totalLots, "Particionado");
        
        // Registrar métricas
        long processingTime = System.currentTimeMillis() - startTime;
        int entitiesProcessed = (r.getAdded() != null ? r.getAdded().size() : 0) +
                (r.getRemoved() != null ? r.getRemoved().size() : 0) +
                (r.getModified() != null ? r.getModified().size() : 0);

        metricsService.recordSuccessfulGeneration(processingTime, totalLots, entitiesProcessed, result.length());
        
        return result;
    }
    
    /**
     * Gera preâmbulo do memorial usando templates legais profissionais
     */
    private String generatePreamble(MemorialStandardDTO standard, PropertyDTO property) {
        // Usa o serviço de templates legais para gerar preâmbulo profissional
        String legalPreamble = legalTemplateService.generateLegalPreamble(property, standard);
        
        if (legalPreamble != null && !legalPreamble.trim().isEmpty()) {
            return legalPreamble;
        }
        
        // Fallback caso o serviço falhe
        log.warn("⚠️ LegalTemplateService falhou, usando preâmbulo simplificado");
        StringBuilder preamble = new StringBuilder();
        
        preamble.append("MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE ÁREA\n\n");
        
        if (property != null) {
            if (property.getName() != null) {
                preamble.append("IMÓVEL: ").append(property.getName()).append("\n");
            }
            if (property.getOwnerName() != null) {
                preamble.append("PROPRIETÁRIO: ").append(property.getOwnerName()).append("\n");
            }
            if (property.getCity() != null && property.getState() != null) {
                preamble.append("LOCALIZAÇÃO: ").append(property.getCity()).append("/").append(property.getState()).append("\n");
            }
        }
        
        preamble.append("\nDESCRIÇÃO DOS LOTES:\n");
        
        return preamble.toString();
    }
    
    /**
     * Gera um chunk específico de lotes
     */
    private String generateLotChunk(int startLot, int endLot, DxfCompareResultDTO r,
                                   MemorialStandardDTO standard, PropertyDTO property,
                                   List<SimplePoint> extractedPoints, Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
                                   List<String> streetNames, Map<String, List<String>> confrontations,
                                   Map<String, Double> individualAreas, DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase,
                                   DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform,
                                   String provider, List<Map<String, Object>> allEntities, List<String> selectedLayers,
                                   List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
                                   int requestedLotCount) {

        StringBuilder chunkPrompt = new StringBuilder();
        int estimatedLots = requestedLotCount;
        Double areaReferencia = resolveReferenceArea(property, individualAreas, estimatedLots);
        Double perimetroReferencia = resolveReferencePerimeter(property, estimatedLots);
        String location = resolveLotStreetReference(streetNames);
        String bairro = property != null && property.getNeighborhood() != null ? property.getNeighborhood() : "nao informado no cadastro";
        String cidade = property != null && property.getCity() != null ? property.getCity() : "nao informada";
        String estado = property != null && property.getState() != null ? property.getState() : "UF nao informada";
        String northBoundaryReference = resolveDrawingBoundaryReference(confrontations, "NORTE");
        String southBoundaryReference = resolveDrawingBoundaryReference(confrontations, "SUL");
        String eastBoundaryReference = resolveDrawingBoundaryReference(confrontations, "LESTE");
        String westBoundaryReference = resolveDrawingBoundaryReference(confrontations, "OESTE");

        chunkPrompt.append("=== FORMATO OBRIGATORIO PARA CADA LOTE ===\n");
        chunkPrompt.append("Para cada lote, responda APENAS no formato abaixo, sem qualquer secao adicional:\n");
        chunkPrompt.append("LOTE X:\n");
        chunkPrompt.append("Um imóvel urbano integrante da área/loteamento em ").append(cidade).append("/").append(estado)
                .append(", possuindo formato poligonal ");
        chunkPrompt.append("conforme seus pontos e coordenadas efetivamente identificados no levantamento, perfazendo assim, ");
        chunkPrompt.append("um perímetro de [valor real]m e uma área territorial de [valor real]m², com as seguintes medidas e confrontações:\n");
        chunkPrompt.append("AO NORTE: ...\n");
        chunkPrompt.append("AO SUL: ...\n");
        chunkPrompt.append("AO LESTE: ...\n");
        chunkPrompt.append("AO OESTE: ...\n");
        chunkPrompt.append("NAO use o endereco cadastral da propriedade/empresa dentro da descricao do lote; esse dado pertence ao cabecalho do memorial.\n");
        chunkPrompt.append("Se precisar citar vias no lote, use apenas as vias efetivamente identificadas no desenho/DXF.\n");
        chunkPrompt.append("NUNCA use nome de proprietario, empresa, pessoa fisica ou expressao 'propriedade de Fulano' como confrontante do lote.\n");
        chunkPrompt.append("NUNCA gere PREAMBULO, IDENTIFICACAO DO TERRENO, SITUACAO ANTES, SITUACAO DEPOIS, DECLARACAO FINAL ou MEMORIAL DESCRITIVO completo dentro do chunk.\n");
        chunkPrompt.append("NUNCA use placeholders com colchetes, como [BAIRRO], [MATRICULA], [ZONA] ou similares.\n");
        chunkPrompt.append("NUNCA escreva 0,0000 m2, 0,0000 m ou 'nao aplicavel' para terreno original, porque este chunk descreve apenas lotes.\n");
        chunkPrompt.append("NUNCA repita LOTE 01 para todos os casos. Use a numeracao real de ").append(startLot).append(" a ").append(endLot).append(".\n");
        chunkPrompt.append("Se algum dado nao existir no cadastro ou no DXF, escreva de forma direta 'nao informado no cadastro' ou 'nao identificado no DXF', sem usar colchetes.\n");
        chunkPrompt.append("NUNCA USE '*', '**', '#' OU '- ' NO INICIO DAS FRASES. ESCREVA EXATAMENTE NESTE FORMATO LIMPO.\n");
        chunkPrompt.append("----------------------------------------------------------------------\n\n");

        chunkPrompt.append("Gere descricao completa dos LOTES ").append(startLot).append(" a ").append(endLot).append(".\n");
        chunkPrompt.append("Mantenha os lotes em ordem crescente e respeite a sequencia grafica dos pontos/estacas informada para cada poligono.\n");
        chunkPrompt.append("Nao intercale vertices, medidas ou confrontacoes de lotes diferentes.\n");
        chunkPrompt.append("NAO replique lote padrao de 130m2, 5,20m x 25,00m ou perimetro 60,40m sem base tecnica.\n");
        if (areaReferencia != null) {
            chunkPrompt.append("Area media de referencia apurada: ")
                    .append(String.format(Locale.US, "%.2f", areaReferencia))
                    .append(" m2.\n");
        }
        if (perimetroReferencia != null) {
            chunkPrompt.append("Perimetro medio de referencia apurado: ")
                    .append(String.format(Locale.US, "%.2f", perimetroReferencia))
                    .append(" m.\n");
        }
        chunkPrompt.append("Quando um valor nao puder ser determinado com seguranca, registre 'nao identificado no DXF' em vez de inventar numeros.\n");
        chunkPrompt.append("Se um lado do lote nao estiver voltado para via publica e nao houver confrontante externo nominal confiavel no desenho, use a expressao 'divisa interna do loteamento'.\n");
        chunkPrompt.append("Nao use a expressao 'a confirmar em conferencia tecnica' como substituto generico para todas as confrontacoes.\n\n");
        if (!streetNames.isEmpty()) {
            chunkPrompt.append("Quando houver vias identificadas no desenho, priorize essas vias nas confrontacoes do lote antes de usar 'confrontante nao identificado no DXF'.\n");
            chunkPrompt.append("So use fallback generico quando nenhuma via ou confrontante puder ser inferido com seguranca.\n\n");
        }
        chunkPrompt.append("A IA atua apenas como redatora neste fluxo.\n");
        chunkPrompt.append("Use exclusivamente o resumo tecnico validado abaixo, sem recalcular, sem redistribuir medidas e sem inferir confrontacoes adicionais.\n\n");
        chunkPrompt.append("REFERENCIAS PREFERENCIAIS DE CONFRONTACAO EXTRAIDAS DO DESENHO:\n");
        chunkPrompt.append("- Norte: ").append(northBoundaryReference).append("\n");
        chunkPrompt.append("- Sul: ").append(southBoundaryReference).append("\n");
        chunkPrompt.append("- Leste: ").append(eastBoundaryReference).append("\n");
        chunkPrompt.append("- Oeste: ").append(westBoundaryReference).append("\n");
        chunkPrompt.append("Se uma dessas referencias estiver identificada no desenho, prefira usa-la no respectivo lado do lote.\n");
        chunkPrompt.append("MODELO PREFERENCIAL DE CONFRONTACOES PARA ESTE CONJUNTO:\n");
        chunkPrompt.append("AO NORTE: usar preferencialmente ").append(northBoundaryReference).append(".\n");
        chunkPrompt.append("AO SUL: usar preferencialmente ").append(southBoundaryReference).append(".\n");
        chunkPrompt.append("AO LESTE: usar preferencialmente ").append(eastBoundaryReference).append(".\n");
        chunkPrompt.append("AO OESTE: usar preferencialmente ").append(westBoundaryReference).append(".\n");
        chunkPrompt.append("Se Norte/Sul/Leste ja estiverem identificados com vias do desenho, NAO troque o lado Oeste por proprietario nominal ou fallback generico se houver referencia para Oeste acima.\n");
        chunkPrompt.append("Quando nao houver referencia externa segura para um lado interno, escreva 'divisa interna do loteamento' em vez de 'confrontante nao identificado no DXF'.\n\n");

        List<Map<String, Object>> chunkLotEntities = selectLotEntitiesForRange(
                allEntities,
                startLot,
                Math.max(1, endLot - startLot + 1)
        );

        if (selectedLayers != null && !selectedLayers.isEmpty()) {
            chunkPrompt.append("LAYERS/POLIGONOS SELECIONADOS:\n");
            chunkPrompt.append("- ").append(String.join(", ", selectedLayers)).append("\n\n");
        }
        appendSelectedConfrontationTextsPrompt(chunkPrompt, selectedConfrontationTexts);
        appendManualFrontageAnalysisPrompt(chunkPrompt, chunkLotEntities, selectedConfrontationTexts);

        String technicalSummaryContext = buildLotTechnicalSummaryContext(
                allEntities,
                confrontations,
                selectedConfrontationTexts,
                georeferencingTransform,
                startLot,
                Math.max(1, endLot - startLot + 1)
        );
        List<LotTechnicalSummary> expectedChunkSummaries = selectLotTechnicalSummaries(
                allEntities,
                confrontations,
                selectedConfrontationTexts,
                georeferencingTransform,
                startLot,
                Math.max(1, endLot - startLot + 1)
        );
        if (!technicalSummaryContext.isBlank()) {
            chunkPrompt.append("RESUMO TECNICO VALIDADO DOS LOTES:\n");
            chunkPrompt.append(technicalSummaryContext).append("\n");
            chunkPrompt.append("Redija o memorial preservando exatamente essa sequencia de vertices, arestas, medidas e confrontacoes.\n\n");
        }

        String selectedLotContext = buildSelectedLotContext(
                allEntities,
                startLot,
                Math.max(1, endLot - startLot + 1)
        );
        if (!selectedLotContext.isBlank()) {
            chunkPrompt.append("POLIGONOS EFETIVAMENTE ENVIADOS PARA ESTE MEMORIAL:\n");
            chunkPrompt.append(selectedLotContext).append("\n");
            chunkPrompt.append("Use os poligonos acima para distinguir os lotes. Nao repita LOTE 01 sem base geometrica.\n");
            chunkPrompt.append("A ordem apresentada nos poligonos ja esta em sequencia crescente e deve ser preservada na resposta final.\n\n");
        }

        chunkPrompt.append("DADOS DO LOCAL:\n");
        chunkPrompt.append("Endereco cadastral da propriedade (usar apenas no cabecalho, nao no lote): ");
        if (property != null && property.getStreet() != null) {
            chunkPrompt.append(property.getStreet());
            if (property.getNumber() != null) {
                chunkPrompt.append(", ").append(property.getNumber());
            }
        } else {
            chunkPrompt.append("nao informado no cadastro");
        }
        chunkPrompt.append("\n");
        chunkPrompt.append("Vias identificadas no desenho para uso nos lotes/confrontacoes: ").append(location).append("\n");
        chunkPrompt.append("Bairro: ").append(bairro).append("\n");
        chunkPrompt.append("Cidade/Estado: ").append(cidade).append("/").append(estado).append("\n\n");

        if (!streetNames.isEmpty()) {
            chunkPrompt.append("Ruas do entorno: ")
                    .append(String.join(", ", streetNames.subList(0, Math.min(3, streetNames.size()))))
                    .append("\n\n");
        }

        if (coordenadaBase != null) {
            chunkPrompt.append("REFERENCIA GEOESPACIAL IDENTIFICADA:\n");
            chunkPrompt.append(String.format(Locale.US, "- Ponto base SIRGAS 2000: E %.2fm N %.2fm (%s)\n",
                    coordenadaBase.getE(), coordenadaBase.getN(), coordenadaBase.getFonte()));
            chunkPrompt.append("Use esta referencia apenas como apoio tecnico. Nao crie vertices artificiais para cada lote.\n\n");
        } else if (!realCoordinates.isEmpty()) {
            chunkPrompt.append("COORDENADAS EXTRAIDAS DO DXF:\n");
            realCoordinates.entrySet().stream().limit(8).forEach(entry ->
                    chunkPrompt.append(String.format(Locale.US, "- %s: E %.2fm N %.2fm (%s)\n",
                            entry.getKey(), entry.getValue().getE(), entry.getValue().getN(), entry.getValue().getSource()))
            );
            chunkPrompt.append("\nUse apenas coordenadas efetivamente extraidas do levantamento.\n\n");
        } else if (!extractedPoints.isEmpty()) {
            chunkPrompt.append("AMOSTRA DE PONTOS EXTRAIDOS DO LEVANTAMENTO:\n");
            extractedPoints.stream().limit(8).forEach(point ->
                    chunkPrompt.append(String.format(Locale.US, "- %s: X %.2f Y %.2f\n", point.getId(), point.getX(), point.getY()))
            );
            chunkPrompt.append("Se nao houver coordenadas georreferenciadas suficientes por lote, informe a limitacao de forma tecnica.\n\n");
        } else {
            log.error("❌ ERRO CRÍTICO: Coordenadas SIRGAS não encontradas para chunk {}-{}", startLot, endLot);
            chunkPrompt.append("COORDENADAS: nao foi possivel identificar referencia georreferenciada confiavel no DXF enviado.\n");
            chunkPrompt.append("Nao invente coordenadas. Registre a necessidade de conferencia topografica complementar quando necessario.\n\n");
        }

        chunkPrompt.append("CONFRONTANTES DE REFERENCIA:\n");
        chunkPrompt.append("- Norte: ").append(resolveBoundary(property, confrontations, "NORTE")).append("\n");
        chunkPrompt.append("- Sul: ").append(resolveBoundary(property, confrontations, "SUL")).append("\n");
        chunkPrompt.append("- Leste: ").append(resolveBoundary(property, confrontations, "LESTE")).append("\n");
        chunkPrompt.append("- Oeste: ").append(resolveBoundary(property, confrontations, "OESTE")).append("\n\n");
        
        if (isOpenAiProvider(provider)) {
            return generateChunkWithOpenAi(chunkPrompt.toString(), expectedChunkSummaries, property, startLot, endLot);
        }

        String scope = "chunk-" + startLot + "-" + endLot;
        String effectivePrompt = chunkPrompt.toString();
        int chunkAttempts = Math.max(1, Math.min(2, maxRetries));
        RuntimeException lastError = null;

        for (int attempt = 1; attempt <= chunkAttempts; attempt++) {
            try {
                String normalizedContent = requestClaudeChunk(effectivePrompt, startLot, endLot);
                MemorialAlignmentCheck alignmentCheck = validateMemorialAlignment(scope, normalizedContent, expectedChunkSummaries);
                logMemorialAlignment(scope, normalizedContent, expectedChunkSummaries, alignmentCheck);
                if (alignmentCheck.valid()) {
                    return normalizedContent;
                }

                lastError = new RuntimeException("Chunk invalido: " + String.join(" | ", alignmentCheck.blockingIssues()));
                if (attempt < chunkAttempts) {
                    log.warn(
                            "Regenerando {} apos resposta fora do contexto na tentativa {}: {}",
                            scope,
                            attempt,
                            alignmentCheck.blockingIssues()
                    );
                    effectivePrompt = buildRetryChunkPrompt(chunkPrompt.toString(), alignmentCheck, startLot, endLot);
                    continue;
                }
            } catch (Exception e) {
                lastError = e instanceof RuntimeException ? (RuntimeException) e : new RuntimeException(e.getMessage(), e);
                log.error("❌ Erro ao gerar {} na tentativa {}: {}", scope, attempt, e.getMessage());
            }
        }

        return buildDeterministicChunkFallback(scope, property, expectedChunkSummaries, lastError);
    }

    private String generateChunkWithOpenAi(
            String chunkPrompt,
            List<LotTechnicalSummary> expectedChunkSummaries,
            PropertyDTO property,
            int startLot,
            int endLot) {
        String scope = "chunk-openai-" + startLot + "-" + endLot;
        String effectivePrompt = chunkPrompt;
        int chunkAttempts = Math.max(1, Math.min(2, maxRetries));
        RuntimeException lastError = null;

        for (int attempt = 1; attempt <= chunkAttempts; attempt++) {
            try {
                String normalizedContent = requestOpenAiChunk(effectivePrompt, startLot, endLot);
                MemorialAlignmentCheck alignmentCheck = validateMemorialAlignment(scope, normalizedContent, expectedChunkSummaries);
                logMemorialAlignment(scope, normalizedContent, expectedChunkSummaries, alignmentCheck);
                if (alignmentCheck.valid()) {
                    return normalizedContent;
                }

                lastError = new RuntimeException("Chunk invalido: " + String.join(" | ", alignmentCheck.blockingIssues()));
                if (attempt < chunkAttempts) {
                    log.warn(
                            "Regenerando {} apos resposta fora do contexto na tentativa {}: {}",
                            scope,
                            attempt,
                            alignmentCheck.blockingIssues()
                    );
                    effectivePrompt = buildRetryChunkPrompt(chunkPrompt, alignmentCheck, startLot, endLot);
                    continue;
                }
            } catch (Exception e) {
                lastError = e instanceof RuntimeException ? (RuntimeException) e : new RuntimeException(e.getMessage(), e);
                log.error("Erro ao gerar {} na tentativa {}: {}", scope, attempt, e.getMessage());
            }
        }

        return buildDeterministicChunkFallback(scope, property, expectedChunkSummaries, lastError);
    }

    private String requestClaudeChunk(String chunkPrompt, int startLot, int endLot) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", claudeModel);
        body.put("max_tokens", 3500);
        body.put("temperature", 0.2);
        body.put("messages", new Object[]{
                Map.of("role", "user", "content", chunkPrompt)
        });
        body.put("system", buildLotOnlySystemPrompt(startLot, endLot));

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", claudeApiKey);
        headers.set("anthropic-version", "2023-06-01");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.exchange(
                claudeEndpoint,
                HttpMethod.POST,
                entity,
                Map.class
        );

        Map<String, Object> responseBody = response.getBody();
        return normalizeChunkOutput(
                sanitizeMemorialText(extractContentFromClaudeResponse(responseBody)),
                startLot,
                endLot
        );
    }

    @SuppressWarnings("unchecked")
    private String requestOpenAiChunk(String chunkPrompt, int startLot, int endLot) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openaiApiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", "gpt-4o");
        body.put("max_tokens", 3500);
        body.put("temperature", 0.2);

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", buildLotOnlySystemPrompt(startLot, endLot)));
        messages.add(Map.of("role", "user", "content", chunkPrompt));
        body.put("messages", messages);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.exchange(
                "https://api.openai.com/v1/chat/completions",
                HttpMethod.POST,
                entity,
                Map.class
        );

        Map<String, Object> responseBody = response.getBody();
        List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return normalizeChunkOutput(
                sanitizeMemorialText((String) message.get("content")),
                startLot,
                endLot
        );
    }

    private String buildRetryChunkPrompt(
            String baseChunkPrompt,
            MemorialAlignmentCheck alignmentCheck,
            int startLot,
            int endLot) {
        StringBuilder retryPrompt = new StringBuilder(baseChunkPrompt);
        retryPrompt.append("\nATENCAO: A RESPOSTA ANTERIOR FOI REJEITADA PELO BACKEND.\n");
        retryPrompt.append("Corrija integralmente o memorial dos LOTES ")
                .append(startLot)
                .append(" a ")
                .append(endLot)
                .append(" obedecendo estritamente o resumo tecnico.\n");
        retryPrompt.append("ERROS BLOQUEANTES IDENTIFICADOS:\n");
        alignmentCheck.blockingIssues().stream()
                .limit(6)
                .forEach(issue -> retryPrompt.append("- ").append(issue).append("\n"));
        retryPrompt.append("Nao inclua lotes fora da faixa, nao omita lotes esperados e mantenha as linhas AO NORTE/SUL/LESTE/OESTE para cada lote.\n");
        retryPrompt.append("Se houver frente viaria validada no resumo tecnico, ela deve aparecer no lote correspondente.\n");
        retryPrompt.append("Responda novamente apenas com o memorial corrigido.\n");
        return retryPrompt.toString();
    }

    private String buildDeterministicChunkFallback(
            String scope,
            PropertyDTO property,
            List<LotTechnicalSummary> expectedChunkSummaries,
            Exception cause) {
        if (expectedChunkSummaries == null || expectedChunkSummaries.isEmpty()) {
            throw new RuntimeException(
                    "Erro no chunk sem dados tecnicos suficientes para fallback deterministico",
                    cause
            );
        }

        log.warn(
                "Usando fallback deterministico no escopo {} apos falha da IA: {}",
                scope,
                cause != null ? cause.getMessage() : "motivo nao informado"
        );

        return expectedChunkSummaries.stream()
                .map(summary -> buildDeterministicLotDescription(summary, property))
                .collect(Collectors.joining("\n\n"));
    }

    private String buildDeterministicFullMemorial(
            String scope,
            MemorialStandardDTO standard,
            PropertyDTO property,
            DxfCompareResultDTO compareResult,
            List<LotTechnicalSummary> expectedSummaries,
            Exception cause) {
        if (expectedSummaries == null || expectedSummaries.isEmpty()) {
            throw new RuntimeException(
                    "Erro no memorial completo sem dados tecnicos suficientes para fallback deterministico",
                    cause
            );
        }

        log.warn(
                "Usando fallback deterministico no memorial completo {} apos falha da IA: {}",
                scope,
                cause != null ? cause.getMessage() : "motivo nao informado"
        );

        StringBuilder builder = new StringBuilder();
        String preamble = generatePreamble(standard, property);
        if (preamble != null && !preamble.isBlank()) {
            builder.append(preamble.trim()).append("\n\n");
        }

        builder.append(expectedSummaries.stream()
                .map(summary -> buildDeterministicLotDescription(summary, property))
                .collect(Collectors.joining("\n\n")));

        String conclusion = generateConclusion(property);
        if (conclusion != null && !conclusion.isBlank()) {
            builder.append("\n\n").append(conclusion.trim());
        }

        int totalLots = expectedSummaries.size();
        return addMetadata(builder.toString(), property, compareResult, totalLots, "Deterministico");
    }

    private String buildDeterministicLotDescription(LotTechnicalSummary summary, PropertyDTO property) {
        String cidade = property != null && property.getCity() != null ? property.getCity() : "nao informada";
        String estado = property != null && property.getState() != null ? property.getState() : "UF nao informada";
        String orderedPoints = buildOrderedPointSequence(summary);
        String firstPoint = summary.vertexSequence().isEmpty()
                ? "ponto inicial nao identificado"
                : summary.vertexSequence().get(0).label();

        StringBuilder builder = new StringBuilder();
        builder.append("LOTE ")
                .append(String.format(Locale.US, "%02d", summary.lotNumber()))
                .append(":\n");
        builder.append("Um imovel urbano integrante da area/loteamento em ")
                .append(cidade)
                .append("/")
                .append(estado);

        if (!"ponto inicial nao identificado".equals(firstPoint)) {
            builder.append(", com inicio no ponto ")
                    .append(firstPoint);
        }

        if (!orderedPoints.isBlank()) {
            builder.append(", seguindo a sequencia perimetral ")
                    .append(orderedPoints);
        }

        builder.append(", possuindo formato poligonal conforme o levantamento tecnico validado, perfazendo assim, um perimetro de ")
                .append(formatMetric(summary.perimeter(), "m"))
                .append(" e uma area territorial de ")
                .append(formatMetric(summary.area(), "m2"))
                .append(", com a seguinte descricao perimetral e respectivas confrontacoes:\n");

        for (String direction : List.of("NORTE", "SUL", "LESTE", "OESTE")) {
            builder.append("AO ")
                    .append(direction)
                    .append(": ")
                    .append(buildDeterministicDirectionDescription(summary, direction))
                    .append("\n");
        }

        return builder.toString().trim();
    }

    private String buildDeterministicDirectionDescription(LotTechnicalSummary summary, String direction) {
        List<TechnicalSideSummary> sides = summary.sideSummaries().stream()
                .filter(side -> direction.equalsIgnoreCase(side.direction()))
                .collect(Collectors.toList());
        if (sides.isEmpty()) {
            return "nao identificado no DXF.";
        }

        if (sides.size() == 1) {
            return buildDeterministicSideSentence(sides.get(0));
        }

        StringBuilder builder = new StringBuilder();
        builder.append("por segmentos sucessivos, ");
        for (int i = 0; i < sides.size(); i++) {
            TechnicalSideSummary side = sides.get(i);
            if (i == 0) {
                builder.append(buildDeterministicSideClause(side, "iniciando-se"));
            } else if (i == sides.size() - 1) {
                builder.append("; e por fim, ")
                        .append(buildDeterministicSideClause(side, "seguindo"));
            } else {
                builder.append("; deste segue, ")
                        .append(buildDeterministicSideClause(side, "seguindo"));
            }
        }
        builder.append(".");
        return builder.toString();
    }

    private String buildDeterministicSideSentence(TechnicalSideSummary side) {
        return buildDeterministicSideClause(side, null) + ".";
    }

    private String buildDeterministicSideClause(TechnicalSideSummary side, String connector) {
        StringBuilder builder = new StringBuilder();
        if (connector != null && !connector.isBlank()) {
            builder.append(connector).append(" ");
        }
        builder.append("do ponto ")
                .append(side.startLabel())
                .append(" ao ponto ")
                .append(side.endLabel())
                .append(", com distancia de ")
                .append(formatMetric(side.length(), "m"))
                .append(", rumo ")
                .append(safeTechnicalBearing(side.technicalBearing()))
                .append(", confrontando neste segmento com ")
                .append(normalizeReferenceForFallback(side.reference()));
        return builder.toString();
    }

    private String buildOrderedPointSequence(LotTechnicalSummary summary) {
        if (summary == null || summary.vertexSequence() == null || summary.vertexSequence().isEmpty()) {
            return "";
        }

        return summary.vertexSequence().stream()
                .map(VertexTechnicalPoint::label)
                .filter(Objects::nonNull)
                .filter(label -> !label.isBlank())
                .collect(Collectors.joining(" -> "));
    }

    private String formatMetric(Double value, String unit) {
        if (value == null) {
            return "nao identificado no DXF";
        }
        return String.format(Locale.US, "%.2f %s", value, unit);
    }

    private String safeTechnicalBearing(String bearing) {
        if (bearing == null || bearing.isBlank()) {
            return "nao identificado no DXF";
        }
        return bearing;
    }

    private String normalizeReferenceForFallback(String reference) {
        if (reference == null || reference.isBlank()) {
            return "divisa interna do loteamento";
        }
        return reference;
    }

    /**
     * Tenta obter coordenada SIRGAS manual da propriedade
     */
    private DxfGeoReferenciaExtractorService.CoordenadaGeo tentarCoordenadaManual(PropertyDTO property) {
        // Verificar se a propriedade tem coordenadas SIRGAS configuradas
        // Pode vir de campos específicos ou observações

        // OPÇÃO 1: Campos específicos SIRGAS
        if (property.getSirgas_e() != null && property.getSirgas_n() != null) {
            double coordE = property.getSirgas_e().doubleValue();
            double coordN = property.getSirgas_n().doubleValue();

            // Validar se são coordenadas SIRGAS válidas
            if (coordE >= 160000 && coordE <= 850000 && coordN >= 750000 && coordN <= 10500000) {
                String fonte = property.getSirgas_source() != null ?
                        property.getSirgas_source() : "PROPERTY_MANUAL";
                return new DxfGeoReferenciaExtractorService.CoordenadaGeo(coordE, coordN, fonte);
            }
        }

        // OPÇÃO 2: Parse das observações
        if (property.getObservations() != null) {
            DxfGeoReferenciaExtractorService.CoordenadaGeo coordFromObs =
                    parseCoordenadaFromObservations(property.getObservations());
            if (coordFromObs != null) {
                return coordFromObs;
            }
        }
        return null;
    }

    /**
     * Extrai coordenadas SIRGAS das observações da propriedade
     */
    private DxfGeoReferenciaExtractorService.CoordenadaGeo parseCoordenadaFromObservations(String observations) {
        if (observations == null || observations.trim().isEmpty()) {
            return null;
        }
        
        try {
            // Padrões para coordenadas SIRGAS nas observações
            java.util.regex.Pattern patternE = java.util.regex.Pattern.compile(
                    "(?:SIRGAS|UTM|E)[:\\s=]*([0-9]{6,7})[,.]?([0-9]{0,2})", 
                    java.util.regex.Pattern.CASE_INSENSITIVE);
            java.util.regex.Pattern patternN = java.util.regex.Pattern.compile(
                    "(?:SIRGAS|UTM|N)[:\\s=]*([0-9]{7,8})[,.]?([0-9]{0,2})", 
                    java.util.regex.Pattern.CASE_INSENSITIVE);
            
            java.util.regex.Matcher matcherE = patternE.matcher(observations);
            java.util.regex.Matcher matcherN = patternN.matcher(observations);
            
            Double coordE = null;
            Double coordN = null;
            
            if (matcherE.find()) {
                String parteInteira = matcherE.group(1);
                String parteDecimal = matcherE.groupCount() > 1 ? matcherE.group(2) : "00";
                coordE = Double.parseDouble(parteInteira + "." + parteDecimal);
            }
            
            if (matcherN.find()) {
                String parteInteira = matcherN.group(1);
                String parteDecimal = matcherN.groupCount() > 1 ? matcherN.group(2) : "00";
                coordN = Double.parseDouble(parteInteira + "." + parteDecimal);
            }
            
            if (coordE != null && coordN != null) {
                // Validar se são coordenadas SIRGAS válidas
                if (coordE >= 160000 && coordE <= 850000 && coordN >= 750000 && coordN <= 10500000) {
                    return new DxfGeoReferenciaExtractorService.CoordenadaGeo(
                            coordE, coordN, "OBSERVATIONS_PARSED");
                }
            }
            
        } catch (Exception e) {
            return null;
        }
        
        return null;
    }
    
    /**
     * Gera conclusão do memorial usando template legal profissional
     */
    private String generateConclusion(PropertyDTO property) {
        // Usa o serviço de templates legais para gerar declaração conforme LRP
        String legalDeclaration = legalTemplateService.generateLegalDeclaration(property);
        
        if (legalDeclaration != null && !legalDeclaration.trim().isEmpty()) {
            return "\n__________________________________________\n\n" + legalDeclaration;
        }
        
        // Fallback caso o serviço falhe
        log.warn("⚠️ LegalTemplateService falhou, usando declaração simplificada");
        StringBuilder conclusion = new StringBuilder();
        
        conclusion.append("\n__________________________________________\n\n");
        conclusion.append("DECLARAÇÃO FINAL:\n");
        conclusion.append("Este memorial descritivo foi elaborado com base nos dados técnicos disponíveis ");
        conclusion.append("e nas coordenadas extraídas do levantamento topográfico.\n\n");
        
        conclusion.append("Data: ").append(java.time.LocalDate.now().format(
                java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("\n");
        
        return conclusion.toString();
    }
    
    /**
     * Adiciona metadados ao memorial
     */
    private String addMetadata(String memorial, PropertyDTO property, DxfCompareResultDTO r, int totalLots, String method) {
        String projectName = property != null && property.getName() != null ? property.getName() : "Projeto sem nome";
        String fileName = r.getNewFileName() != null ? r.getNewFileName() : "Arquivo DXF";

        String metadataBlock = String.format("Projeto: %s\nArquivo: %s\nData: %s\nMetodo: %s (%d lotes)\n",
                projectName,
                fileName,
                java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                method,
                totalLots);

        if (memorial != null && memorial.matches("(?is)^\\s*memorial\\s+descritivo.*")) {
            return memorial.replaceFirst(
                    "(?is)^\\s*memorial\\s+descritivo\\s*\\n+",
                    "MEMORIAL DESCRITIVO\n" + Matcher.quoteReplacement(metadataBlock) + "\n"
            );
        }

        return "MEMORIAL DESCRITIVO\n" + metadataBlock + "\n" + (memorial != null ? memorial : "");
    }

    /**
     * Extrai conteúdo da resposta do Claude
     */
    private String extractContentFromClaudeResponse(Map<String, Object> responseBody) {
        if (responseBody == null) {
            throw new RuntimeException("Response body is null");
        }

        try {
            Object contentObj = responseBody.get("content");
            if (contentObj instanceof List) {
                List<?> contentList = (List<?>) contentObj;
                if (!contentList.isEmpty() && contentList.get(0) instanceof Map) {
                    Map<?, ?> firstContent = (Map<?, ?>) contentList.get(0);
                    Object text = firstContent.get("text");
                    if (text != null) {
                        return text.toString();
                    }
                }
            }
            throw new RuntimeException("Invalid Claude response structure");
        } catch (Exception e) {
            throw new RuntimeException("Error extracting content from Claude response: " + e.getMessage());
        }
    }

    private String sanitizeMemorialText(String content) {
        if (content == null) {
            return null;
        }

        String sanitized = content
                .replace("\r\n", "\n")
                .replace("\\r\\n", "\n")
                .replace("\\n", "\n")
                .replace("```markdown", "")
                .replace("```text", "")
                .replace("```", "")
                .replace("“", "")
                .replace("”", "")
                .replace("\"", "")
                .replaceAll("(?is)<!--.*?-->", "")
                .replaceAll("(?m)^\\s*AVISO: Este memorial esta incompleto\\..*$", "")
                .replaceAll("(?m)^\\s*Foram gerados apenas alguns lotes\\..*$", "")
                .replaceAll("(?m)^\\s*Para memorial completo com .*tente gerar novamente\\..*$", "")
                .replaceAll("\n{3,}", "\n\n")
                .trim();

        if (sanitized.startsWith("'") && sanitized.endsWith("'") && sanitized.length() > 1) {
            sanitized = sanitized.substring(1, sanitized.length() - 1).trim();
        }

        return sanitized;
    }

    private String buildLotOnlySystemPrompt(int startLot, int endLot) {
        return "Voce esta gerando apenas blocos de lotes para um memorial particionado. " +
                "Responda somente com os lotes no intervalo solicitado. " +
                "Nao gere preambulo, memorial descritivo completo, identificacao do terreno, situacao antes, situacao depois, declaracao final, assinatura ou secoes numeradas. " +
                "Cada bloco deve comecar com 'LOTE N:' e seguir diretamente com a descricao tecnica do lote. " +
                "Nao use placeholders com colchetes. " +
                "Nao use valores zerados como 0,0000 m2 ou 0,0000 m para terreno original. " +
                "Nao invente dados; quando faltar informacao, escreva 'nao informado no cadastro' ou 'nao identificado no DXF'. " +
                "Use apenas a numeracao de lotes entre " + startLot + " e " + endLot + ".";
    }

    private String normalizeChunkOutput(String content, int startLot, int endLot) {
        String sanitized = normalizeMemorialLotOrdering(sanitizeMemorialText(content));
        if (sanitized == null || sanitized.isBlank()) {
            return sanitized;
        }

        sanitized = sanitized
                .replaceAll("(?i)\\[BAIRRO\\]", "nao informado no cadastro")
                .replaceAll("(?i)\\[MATR[IÍ]CULA\\]", "nao informada")
                .replaceAll("(?i)\\[ZONA\\]", "nao informada")
                .replaceAll("(?i)\\[[^\\]]+\\]", "nao informado");

        String extractedLots = extractLotBlocksOnly(sanitized, startLot, endLot);
        if (!extractedLots.isBlank()) {
            sanitized = extractedLots;
        }

        List<String> cleanedLines = new ArrayList<>();
        for (String line : sanitized.split("\\n")) {
            String trimmed = line.trim();
            if (trimmed.isBlank()) {
                if (cleanedLines.isEmpty() || cleanedLines.get(cleanedLines.size() - 1).isBlank()) {
                    continue;
                }
                cleanedLines.add("");
                continue;
            }

            String upper = trimmed.toUpperCase(Locale.ROOT);
            if (upper.startsWith("MEMORIAL DESCRITIVO")
                    || upper.startsWith("1. PREAMBULO")
                    || upper.startsWith("2. IDENTIFICACAO DO TERRENO")
                    || upper.startsWith("3. SITUACAO ANTES")
                    || upper.startsWith("4. SITUACAO DEPOIS")
                    || upper.startsWith("5. DECLARACAO FINAL")
                    || upper.startsWith("PREÂMBULO")
                    || upper.startsWith("IDENTIFICAÇÃO DO TERRENO")
                    || upper.startsWith("SITUAÇÃO ANTES")
                    || upper.startsWith("SITUAÇÃO DEPOIS")
                    || upper.startsWith("DECLARAÇÃO FINAL")
                    || upper.startsWith("COMARCA DE ")) {
                continue;
            }

            String compact = upper.replaceAll("\\s+", " ");
            if (compact.contains("0,0000 M²") || compact.contains("0,0000 M2") || compact.contains("0,0000 M.")) {
                continue;
            }

            cleanedLines.add(trimmed);
        }

        return String.join("\n", cleanedLines)
                .replaceAll("\n{3,}", "\n\n")
                .trim();
    }

    private String extractLotBlocksOnly(String content, int startLot, int endLot) {
        Matcher matcher = LOT_BLOCK_PATTERN.matcher(content);
        Map<Integer, String> blocksByLot = new TreeMap<>();

        while (matcher.find()) {
            int lotNumber = Integer.parseInt(matcher.group(1));
            if (lotNumber >= startLot && lotNumber <= endLot) {
                String cleanedBlock = cleanLotBlockContent(matcher.group());
                if (!cleanedBlock.isBlank()) {
                    blocksByLot.merge(lotNumber, cleanedBlock, this::selectPreferredLotBlock);
                }
            }
        }

        return blocksByLot.values().stream()
                .collect(Collectors.joining("\n\n"));
    }

    /**
     * Constrói o prompt para a IA
     */
    private String buildPrompt(DxfCompareResultDTO r, MemorialStandardDTO standard, PropertyDTO property,
                              List<SimplePoint> extractedPoints, Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
                              List<String> streetNames, Map<String, List<String>> confrontations,
                              Map<String, Double> individualAreas, List<Map<String, Object>> allEntities,
                              List<String> selectedLayers, List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
                              int estimatedLots,
                              DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {

        StringBuilder promptBuilder = new StringBuilder();
        Double areaReferencia = resolveReferenceArea(property, individualAreas, estimatedLots);
        Double perimetroReferencia = resolveReferencePerimeter(property, estimatedLots);
        String lotStreetReference = resolveLotStreetReference(streetNames);
        String northBoundaryReference = resolveDrawingBoundaryReference(confrontations, "NORTE");
        String southBoundaryReference = resolveDrawingBoundaryReference(confrontations, "SUL");
        String eastBoundaryReference = resolveDrawingBoundaryReference(confrontations, "LESTE");
        String westBoundaryReference = resolveDrawingBoundaryReference(confrontations, "OESTE");

        if (estimatedLots == 1) {
            promptBuilder.append("GERE APENAS 1 LOTE COMPLETO com base exclusiva nas entidades filtradas/selecionadas. ");
        } else {
            promptBuilder.append("GERE ").append(estimatedLots).append(" LOTES COMPLETOS (1 a ").append(estimatedLots).append("). ");
        }
        promptBuilder.append("Descreva cada lote individualmente com base nos dados reais da propriedade e do DXF. ");
        promptBuilder.append("O endereco cadastral da propriedade/empresa pertence ao cabecalho e NAO deve ser repetido no corpo de cada lote. ");
        promptBuilder.append("Quando citar ruas, use apenas vias efetivamente identificadas no desenho/DXF. ");
        promptBuilder.append("NAO use '...' ou 'demais lotes'. ");
        promptBuilder.append("NAO invente area, perimetro, testada, profundidade, confrontantes ou coordenadas quando esses dados nao puderem ser inferidos com seguranca. ");
        promptBuilder.append("Respeite a ordem crescente dos lotes e a sequencia grafica dos pontos/estacas associada a cada poligono. ");
        promptBuilder.append("Atue apenas como redatora com base no resumo tecnico validado pelo backend.\n\n");

        if (standard != null && standard.getStandardText() != null) {
            promptBuilder.append("NORMA A SEGUIR:\n");
            promptBuilder.append(standard.getStandardText());
            promptBuilder.append("\n\n");
        }

        if (property != null) {
            promptBuilder.append("DADOS REAIS DA PROPRIEDADE:\n");
            if (property.getName() != null) {
                promptBuilder.append("Nome: ").append(property.getName()).append("\n");
            }
            if (property.getOwnerName() != null) {
                promptBuilder.append("Proprietário: ").append(property.getOwnerName()).append("\n");
            }
            if (property.getOwnerDocument() != null) {
                promptBuilder.append("CPF/CNPJ: ").append(property.getOwnerDocument()).append("\n");
            }
            if (property.getStreet() != null) {
                promptBuilder.append("Endereço: ").append(property.getStreet());
                if (property.getNumber() != null) {
                    promptBuilder.append(", ").append(property.getNumber());
                }
                promptBuilder.append("\n");
            }
            if (property.getCity() != null && property.getState() != null) {
                promptBuilder.append("Cidade/Estado: ").append(property.getCity()).append("/").append(property.getState()).append("\n");
            }
            if (property.getTotalArea() != null) {
                promptBuilder.append("Área Total: ").append(property.getTotalArea()).append(" m²\n");
            }
            if (property.getTotalPerimeter() != null) {
                promptBuilder.append("Perímetro Total: ").append(property.getTotalPerimeter()).append(" m\n");
            }
            promptBuilder.append("\n");
        }

        if (selectedLayers != null && !selectedLayers.isEmpty()) {
            promptBuilder.append("LAYERS/POLIGONOS SELECIONADOS NO FRONTEND:\n");
            promptBuilder.append("- ").append(String.join(", ", selectedLayers)).append("\n\n");
        }
        appendSelectedConfrontationTextsPrompt(promptBuilder, selectedConfrontationTexts);
        appendManualFrontageAnalysisPrompt(promptBuilder, allEntities, selectedConfrontationTexts);

        String technicalSummaryContext = buildLotTechnicalSummaryContext(
                allEntities,
                confrontations,
                selectedConfrontationTexts,
                georeferencingTransform,
                1,
                estimatedLots
        );
        if (!technicalSummaryContext.isBlank()) {
            promptBuilder.append("RESUMO TECNICO VALIDADO DOS LOTES:\n");
            promptBuilder.append(technicalSummaryContext).append("\n");
            promptBuilder.append("Use exclusivamente esse resumo para redigir o memorial. Nao recalcule medidas, nao redistribua lados e nao crie confrontacoes fora do resumo.\n\n");
        }

        promptBuilder.append("ORIENTACAO DE ENDERECO E VIAS:\n");
        if (property != null && property.getStreet() != null) {
            promptBuilder.append("- Endereco cadastral (somente cabecalho): ").append(property.getStreet());
            if (property.getNumber() != null) {
                promptBuilder.append(", ").append(property.getNumber());
            }
            promptBuilder.append("\n");
        }
        promptBuilder.append("- Vias identificadas no desenho para uso nos lotes/confrontacoes: ")
                .append(lotStreetReference).append("\n\n");
        promptBuilder.append("REFERENCIAS PREFERENCIAIS DE CONFRONTACAO EXTRAIDAS DO DESENHO:\n");
        promptBuilder.append("- Norte: ").append(northBoundaryReference).append("\n");
        promptBuilder.append("- Sul: ").append(southBoundaryReference).append("\n");
        promptBuilder.append("- Leste: ").append(eastBoundaryReference).append("\n");
        promptBuilder.append("- Oeste: ").append(westBoundaryReference).append("\n");
        promptBuilder.append("MODELO PREFERENCIAL DE CONFRONTACOES PARA ESTE CONJUNTO:\n");
        promptBuilder.append("AO NORTE: usar preferencialmente ").append(northBoundaryReference).append(".\n");
        promptBuilder.append("AO SUL: usar preferencialmente ").append(southBoundaryReference).append(".\n");
        promptBuilder.append("AO LESTE: usar preferencialmente ").append(eastBoundaryReference).append(".\n");
        promptBuilder.append("AO OESTE: usar preferencialmente ").append(westBoundaryReference).append(".\n\n");

        promptBuilder.append("DADOS EXTRAIDOS DO DXF:\n");
        promptBuilder.append("Total de entidades: ").append(
                (r.getAdded() != null ? r.getAdded().size() : 0) +
                (r.getModified() != null ? r.getModified().size() : 0) +
                (r.getRemoved() != null ? r.getRemoved().size() : 0)
        ).append("\n");
        promptBuilder.append("Coordenadas extraidas: ").append(extractedPoints.size()).append(" pontos\n");

        if (!streetNames.isEmpty()) {
            promptBuilder.append("Ruas identificadas: ").append(String.join(", ", streetNames)).append("\n");
        }
        if (!individualAreas.isEmpty()) {
            promptBuilder.append("Áreas individuais calculadas: ").append(individualAreas.size()).append(" lotes\n");
        }
        if (areaReferencia != null) {
            promptBuilder.append("Área média de referência: ").append(String.format(Locale.US, "%.2f", areaReferencia)).append(" m²\n");
        }
        if (perimetroReferencia != null) {
            promptBuilder.append("Perímetro médio de referência: ").append(String.format(Locale.US, "%.2f", perimetroReferencia)).append(" m\n");
        }
        promptBuilder.append("Confrontantes de referência:\n");
        promptBuilder.append("- Norte: ").append(resolveBoundary(property, confrontations, "NORTE")).append("\n");
        promptBuilder.append("- Sul: ").append(resolveBoundary(property, confrontations, "SUL")).append("\n");
        promptBuilder.append("- Leste: ").append(resolveBoundary(property, confrontations, "LESTE")).append("\n");
        promptBuilder.append("- Oeste: ").append(resolveBoundary(property, confrontations, "OESTE")).append("\n");

        String selectedLotContext = buildSelectedLotContext(allEntities, estimatedLots);
        if (!selectedLotContext.isBlank()) {
            promptBuilder.append("\nPOLIGONOS EFETIVAMENTE ENVIADOS:\n");
            promptBuilder.append(selectedLotContext);
            promptBuilder.append("Use esses poligonos como fonte principal para diferenciar os lotes.\n");
            promptBuilder.append("A ordem apresentada ja esta crescente e deve ser mantida no memorial.\n");
        }

        promptBuilder.append("\n=== FORMATO OBRIGATORIO PARA CADA LOTE ===\n");
        promptBuilder.append("LOTE X:\n");
        promptBuilder.append("Um imovel urbano integrante da area/loteamento em [CIDADE]/[ESTADO],\n");
        promptBuilder.append("possuindo formato poligonal conforme o resumo tecnico validado do backend,\n");
        promptBuilder.append("com perimetro, area e confrontacoes reproduzidos exatamente a partir dos dados tecnicos fornecidos.\n");
        promptBuilder.append("Descreva o perimetro em ordem sequencial dos pontos/estacas do lote, sem inverter a sequencia.\n");
        promptBuilder.append("----------------------------------------------------------------------\n");
        promptBuilder.append("USE EXATAMENTE ESTE FORMATO. Nao replique um lote padrao sem base tecnica.\n");
        promptBuilder.append("NAO escreva 'localizado na Rua " + (property != null && property.getStreet() != null ? property.getStreet() : "nao informado no cadastro") + "' no corpo do lote.\n");
        promptBuilder.append("Se precisar mencionar vias, use apenas: ").append(lotStreetReference).append(".\n");
        promptBuilder.append("Se essas vias estiverem identificadas no desenho, prefira usa-las nas confrontacoes antes de recorrer a fallback generico.\n");
        promptBuilder.append("Se houver referencia preferencial para Oeste no desenho, use essa referencia no AO OESTE em vez de fallback generico.\n");
        promptBuilder.append("Se a geometria do lote tocar duas ou mais vias em arestas distintas, aceite dupla frente ou esquina real; nao force um unico lado externo.\n");
        promptBuilder.append("Se um segmento manual terminar antes do lote, mas permanecer alinhado com aresta externa ou vertice de esquina do poligono, aceite continuidade geometrica da via.\n");
        promptBuilder.append("Se um lado do lote for interno e nao houver confrontante externo nominal confiavel, use 'divisa interna do loteamento'.\n");
        promptBuilder.append("NUNCA use nome de proprietario, empresa, pessoa fisica ou expressao 'propriedade de Fulano' como confrontante do lote.\n");

        if (!realCoordinates.isEmpty() && realCoordinates.containsKey("BASE_SIRGAS")) {
            CoordinateExtractionService.RealCoordinate baseSirgas = realCoordinates.get("BASE_SIRGAS");
            promptBuilder.append("\nREFERENCIA GEOESPACIAL PRINCIPAL:\n");
            promptBuilder.append(String.format(Locale.US, "- BASE_SIRGAS: E %.2fm N %.2fm (%s)\n",
                    baseSirgas.getE(), baseSirgas.getN(), baseSirgas.getSource()));
            promptBuilder.append("Use essa referencia apenas como apoio e nao para criar vertices artificiais.\n");
        } else if (!realCoordinates.isEmpty()) {
            promptBuilder.append("\nCOORDENADAS REAIS EXTRAIDAS:\n");
            realCoordinates.entrySet().stream().limit(8).forEach(entry -> {
                CoordinateExtractionService.RealCoordinate coord = entry.getValue();
                promptBuilder.append("- ").append(entry.getKey())
                        .append(": E ").append(String.format(Locale.US, "%.2f", coord.getE()))
                        .append("m N ").append(String.format(Locale.US, "%.2f", coord.getN())).append("m\n");
            });
            promptBuilder.append("Use somente coordenadas efetivamente extraidas do DXF.\n");
        } else if (!extractedPoints.isEmpty()) {
            promptBuilder.append("\nAMOSTRA DE PONTOS EXTRAIDOS:\n");
            extractedPoints.stream().limit(5).forEach(p ->
                    promptBuilder.append("- X ")
                            .append(String.format(Locale.US, "%.0f", p.getX()))
                            .append(" Y ")
                            .append(String.format(Locale.US, "%.0f", p.getY()))
                            .append("\n")
            );
            promptBuilder.append("Nao converta automaticamente esses pontos em coordenadas SIRGAS ficticias.\n");
        } else {
            log.warn("O arquivo analisado nao trouxe referencia georreferenciada confiavel para apoiar o memorial");
            promptBuilder.append("\nCOORDENADAS: nao foi possivel identificar referencia georreferenciada confiavel no arquivo DXF.\n");
            promptBuilder.append("Quando necessario, registre a necessidade de conferencia topografica complementar.\n");
        }

        promptBuilder.append("\nGere memorial completo com ").append(estimatedLots).append(" lotes usando dados da propriedade.\n");

        String prompt = promptBuilder.toString();
        return prompt;
    }

    private String buildSelectedLotContext(List<Map<String, Object>> entities, int maxLots) {
        return buildSelectedLotContext(entities, 1, maxLots);
    }

    private String buildSelectedLotContext(List<Map<String, Object>> entities, int startLotNumber, int maxLots) {
        if (entities == null || entities.isEmpty()) {
            return "";
        }

        StringBuilder context = new StringBuilder();
        int lotIndex = 1;
        List<OrderedLotContext> orderedLots = selectOrderedLotContexts(entities, startLotNumber, maxLots);

        for (OrderedLotContext orderedLot : orderedLots) {
            context.append("- LOTE_")
                    .append(String.format(Locale.US, "%02d", startLotNumber + lotIndex - 1))
                    .append(" | layer: ")
                    .append(orderedLot.entity().getOrDefault("layer", "sem-layer"));

            if (orderedLot.area() != null) {
                context.append(" | area calculada: ")
                        .append(String.format(Locale.US, "%.2f", orderedLot.area()))
                        .append(" m2");
            }
            if (orderedLot.perimeter() != null) {
                context.append(" | perimetro calculado: ")
                        .append(String.format(Locale.US, "%.2f", orderedLot.perimeter()))
                        .append(" m");
            }
            if (!orderedLot.orderLabels().isEmpty()) {
                context.append(" | ordem grafica: ")
                        .append(String.join(" -> ", orderedLot.orderLabels()))
                        .append(" | primeiro marco: ")
                        .append(orderedLot.orderLabels().get(0));
            }
            if (!orderedLot.vertices().isEmpty()) {
                context.append(" | vertices: ");
                int previewCount = Math.min(4, orderedLot.vertices().size());
                for (int i = 0; i < previewCount; i++) {
                    Map<String, Object> vertex = orderedLot.vertices().get(i);
                    Object x = vertex.get("x");
                    Object y = vertex.get("y");
                    context.append("(")
                            .append(formatNumericPreview(x))
                            .append(", ")
                            .append(formatNumericPreview(y))
                            .append(")");
                    if (i < previewCount - 1) {
                        context.append(" ");
                    }
                }
            }

            context.append("\n");
            lotIndex++;

            if (lotIndex > maxLots) {
                break;
            }
        }

        return context.toString();
    }

    private List<OrderedLotContext> selectOrderedLotContexts(
            List<Map<String, Object>> entities,
            int startLotNumber,
            int maxLots) {
        if (entities == null || entities.isEmpty() || maxLots <= 0) {
            return List.of();
        }

        int startIndex = Math.max(0, startLotNumber - 1);
        return buildOrderedLotContexts(entities).stream()
                .skip(startIndex)
                .limit(maxLots)
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> selectLotEntitiesForRange(
            List<Map<String, Object>> entities,
            int startLotNumber,
            int maxLots) {
        return selectOrderedLotContexts(entities, startLotNumber, maxLots).stream()
                .map(OrderedLotContext::entity)
                .collect(Collectors.toList());
    }

    private List<OrderedLotContext> buildOrderedLotContexts(List<Map<String, Object>> entities) {
        List<OrderLabelReference> orderLabels = extractOrderLabelReferences(entities);
        List<OrderedLotContext> orderedLots = new ArrayList<>();
        int fallbackIndex = 0;

        for (Map<String, Object> entity : entities) {
            String type = String.valueOf(entity.get("type"));
            if (!"POLYLINE".equals(type) && !"LWPOLYLINE".equals(type)) {
                continue;
            }

            List<Map<String, Object>> vertices = extractVertices(entity);
            if (vertices.isEmpty()) {
                continue;
            }

            List<Map<String, Object>> singleEntityList = List.of(entity);
            Double area = dxfTextExtractorService.calculateIndividualAreas(singleEntityList)
                    .values()
                    .stream()
                    .findFirst()
                    .orElse(null);
            Double perimeter = dxfTextExtractorService.calculateDistances(singleEntityList)
                    .values()
                    .stream()
                    .findFirst()
                    .orElse(null);

            List<OrderLabelReference> labelsForPolygon = findOrderLabelsForPolygon(vertices, orderLabels);
            List<String> orderedLabelNames = labelsForPolygon.stream()
                    .map(OrderLabelReference::label)
                    .distinct()
                    .collect(Collectors.toList());

            double centroidX = vertices.stream()
                    .mapToDouble(vertex -> parseDouble(vertex.get("x")))
                    .filter(value -> !Double.isNaN(value))
                    .average()
                    .orElse(Double.MAX_VALUE);
            double centroidY = vertices.stream()
                    .mapToDouble(vertex -> parseDouble(vertex.get("y")))
                    .filter(value -> !Double.isNaN(value))
                    .average()
                    .orElse(Double.MAX_VALUE);
            int firstOrderNumber = labelsForPolygon.stream()
                    .map(OrderLabelReference::orderNumber)
                    .min(Integer::compareTo)
                    .orElse(Integer.MAX_VALUE);

            orderedLots.add(new OrderedLotContext(
                    entity,
                    vertices,
                    area,
                    perimeter,
                    orderedLabelNames,
                    firstOrderNumber,
                    centroidX,
                    centroidY,
                    fallbackIndex++
            ));
        }

        orderedLots.sort(Comparator
                .comparingInt(OrderedLotContext::firstOrderNumber)
                .thenComparingDouble(OrderedLotContext::centroidY)
                .thenComparingDouble(OrderedLotContext::centroidX)
                .thenComparingInt(OrderedLotContext::fallbackIndex));

        return orderedLots;
    }

    private List<OrderLabelReference> extractOrderLabelReferences(List<Map<String, Object>> entities) {
        List<OrderLabelReference> labels = new ArrayList<>();
        for (Map<String, Object> entity : entities) {
            String type = String.valueOf(entity.get("type"));
            if (!"TEXT".equals(type) && !"MTEXT".equals(type)) {
                continue;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> properties = (Map<String, Object>) entity.get("properties");
            if (properties == null) {
                continue;
            }

            String rawText = Objects.toString(properties.get("text"), "").trim();
            Matcher matcher = ORDER_LABEL_PATTERN.matcher(rawText);
            if (!matcher.matches()) {
                continue;
            }

            double x = parseDouble(entity.get("x"));
            double y = parseDouble(entity.get("y"));
            if (Double.isNaN(x) || Double.isNaN(y)) {
                continue;
            }

            int orderNumber = Integer.parseInt(matcher.group(1));
            labels.add(new OrderLabelReference(
                    normalizeOrderLabel(rawText, orderNumber),
                    orderNumber,
                    x,
                    y
            ));
        }
        return labels;
    }

    private String normalizeOrderLabel(String rawText, int orderNumber) {
        String normalized = rawText.trim().toUpperCase(Locale.ROOT)
                .replaceAll("\\s+", " ")
                .replaceAll("[-_:/#]", " ")
                .trim();
        String prefix = normalized.replaceAll("\\d+", "").trim();
        if (prefix.isBlank() || "P".equals(prefix) || "PT".equals(prefix) || "PONTO".equals(prefix)) {
            return String.format(Locale.US, "P%02d", orderNumber);
        }
        if ("ESTACA".equals(prefix) || "E".equals(prefix)) {
            return String.format(Locale.US, "ESTACA %02d", orderNumber);
        }
        return prefix + " " + String.format(Locale.US, "%02d", orderNumber);
    }

    private List<Map<String, Object>> extractVertices(Map<String, Object> entity) {
        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) entity.get("properties");
        if (properties == null || !(properties.get("vertices") instanceof List<?> rawVertices)) {
            return List.of();
        }

        List<Map<String, Object>> vertices = new ArrayList<>();
        for (Object rawVertex : rawVertices) {
            if (!(rawVertex instanceof Map<?, ?> rawMap)) {
                continue;
            }
            Map<String, Object> vertex = new LinkedHashMap<>();
            vertex.put("x", rawMap.get("x"));
            vertex.put("y", rawMap.get("y"));
            vertices.add(vertex);
        }
        return vertices;
    }

    private List<OrderLabelReference> findOrderLabelsForPolygon(
            List<Map<String, Object>> vertices,
            List<OrderLabelReference> orderLabels) {
        if (vertices.isEmpty() || orderLabels.isEmpty()) {
            return List.of();
        }

        double minX = Double.POSITIVE_INFINITY;
        double minY = Double.POSITIVE_INFINITY;
        double maxX = Double.NEGATIVE_INFINITY;
        double maxY = Double.NEGATIVE_INFINITY;
        for (Map<String, Object> vertex : vertices) {
            double x = parseDouble(vertex.get("x"));
            double y = parseDouble(vertex.get("y"));
            if (Double.isNaN(x) || Double.isNaN(y)) {
                continue;
            }
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }

        if (!Double.isFinite(minX) || !Double.isFinite(minY) || !Double.isFinite(maxX) || !Double.isFinite(maxY)) {
            return List.of();
        }

        double diagonal = Math.hypot(maxX - minX, maxY - minY);
        double bboxPadding = Math.max(10.0, Math.min(40.0, diagonal * 0.25));
        double matchThreshold = Math.max(12.0, Math.min(60.0, diagonal * 0.40));

        List<OrderLabelReference> matches = new ArrayList<>();
        Set<Integer> seenOrders = new LinkedHashSet<>();
        for (OrderLabelReference label : orderLabels) {
            if (label.x() < minX - bboxPadding || label.x() > maxX + bboxPadding
                    || label.y() < minY - bboxPadding || label.y() > maxY + bboxPadding) {
                continue;
            }

            double bestDistance = Double.MAX_VALUE;
            for (Map<String, Object> vertex : vertices) {
                double x = parseDouble(vertex.get("x"));
                double y = parseDouble(vertex.get("y"));
                if (Double.isNaN(x) || Double.isNaN(y)) {
                    continue;
                }
                bestDistance = Math.min(bestDistance, distance(label.x(), label.y(), x, y));
            }

            if (bestDistance <= matchThreshold && seenOrders.add(label.orderNumber())) {
                matches.add(label);
            }
        }

        matches.sort(Comparator.comparingInt(OrderLabelReference::orderNumber));
        return matches;
    }

    private String normalizeMemorialLotOrdering(String content) {
        if (content == null || content.isBlank()) {
            return content;
        }

        Matcher matcher = LOT_BLOCK_PATTERN.matcher(content);
        List<LotBlock> blocks = new ArrayList<>();
        while (matcher.find()) {
            blocks.add(new LotBlock(
                    Integer.parseInt(matcher.group(1)),
                    matcher.group().trim(),
                    matcher.start(),
                    matcher.end()
            ));
        }

        if (blocks.isEmpty()) {
            return content;
        }

        int firstStart = blocks.get(0).start();
        int lastEnd = blocks.get(blocks.size() - 1).end();
        String prefix = content.substring(0, firstStart);
        String suffix = content.substring(lastEnd);

        Map<Integer, String> blocksByLot = new TreeMap<>();
        for (LotBlock block : blocks) {
            String cleanedBlock = cleanLotBlockContent(block.content());
            if (!cleanedBlock.isBlank()) {
                blocksByLot.merge(block.lotNumber(), cleanedBlock, this::selectPreferredLotBlock);
            }
        }

        if (blocksByLot.isEmpty()) {
            return (prefix + suffix).trim();
        }

        return prefix
                + blocksByLot.values().stream()
                .collect(Collectors.joining("\n\n"))
                + suffix;
    }

    private String cleanLotBlockContent(String blockContent) {
        if (blockContent == null || blockContent.isBlank()) {
            return "";
        }

        String cleaned = sanitizeMemorialText(blockContent).trim();
        cleaned = cleaned
                .replaceAll("(?is)\\n\\s*Coordenadas dos v[ée]rtices.*?(?=\\n\\s*AO\\s+NORTE:|\\n\\s*AO\\s+SUL:|\\n\\s*AO\\s+LESTE:|\\n\\s*AO\\s+OESTE:|\\z)", "\n")
                .replaceAll("(?is)\\n\\s*Descri[cç][aã]o do per[ií]metro.*?(?=\\n\\s*AO\\s+NORTE:|\\n\\s*AO\\s+SUL:|\\n\\s*AO\\s+LESTE:|\\n\\s*AO\\s+OESTE:|\\z)", "\n")
                .replaceAll("(?im)^\\s*Confronta[cç][oõ]es espec[ií]ficas\\s*:?\\s*$", "")
                .replaceAll("(?i)resumo t[eé]cnico validado do backend", "levantamento tecnico validado")
                .replaceAll("(?i),\\s*com per[ií]metro,\\s*[áa]rea e confronta[cç][õo]es reproduzidos exatamente a partir dos dados t[eé]cnicos fornecidos\\.?", "")
                .replaceAll("(?is)\\n\\s*_{5,}.*$", "")
                .replaceAll("(?im)^\\s*DECLARA[ÇC][AÃ]O(?:\\s+FINAL)?\\s*$", "")
                .replaceAll("(?im)^\\s*Fortaleza,\\s*\\d{1,2}\\s+de\\s+.*$", "")
                .replaceAll("(?im)^\\s*Eng\\.\\s*Respons[aá]vel.*$", "")
                .replaceAll("(?im)^\\s*CREA/.*$", "")
                .replaceAll("(?im)^\\s*RNP:.*$", "")
                .replaceAll("(?im)^\\s*[_-]{5,}\\s*$", "")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();

        return cleaned;
    }

    private String selectPreferredLotBlock(String currentBlock, String candidateBlock) {
        if (currentBlock == null || currentBlock.isBlank()) {
            return candidateBlock;
        }
        if (candidateBlock == null || candidateBlock.isBlank()) {
            return currentBlock;
        }
        return scoreLotBlock(candidateBlock) > scoreLotBlock(currentBlock) ? candidateBlock : currentBlock;
    }

    private int scoreLotBlock(String block) {
        if (block == null || block.isBlank()) {
            return Integer.MIN_VALUE;
        }

        String upper = block.toUpperCase(Locale.ROOT);
        int score = Math.min(block.length(), 200);

        if (upper.contains("AO NORTE:")) {
            score += 25;
        }
        if (upper.contains("AO SUL:")) {
            score += 25;
        }
        if (upper.contains("AO LESTE:")) {
            score += 25;
        }
        if (upper.contains("AO OESTE:")) {
            score += 25;
        }
        if (upper.contains("COORDENADAS DOS V")) {
            score -= 40;
        }
        if (upper.contains("RESUMO TECNICO VALIDADO DO BACKEND")) {
            score -= 40;
        }
        if (upper.contains("CONFRONTACOES ESPECIFICAS")) {
            score -= 20;
        }
        if (upper.contains("DECLARA") || upper.contains("RESPONSAVEL TECNICO")) {
            score -= 60;
        }

        return score;
    }

    private String buildLotTechnicalSummaryContext(
            List<Map<String, Object>> entities,
            Map<String, List<String>> confrontations,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform,
            int startLotNumber,
            int maxLots) {
        if (entities == null || entities.isEmpty() || maxLots <= 0) {
            return "";
        }

        List<LotTechnicalSummary> summaries = selectLotTechnicalSummaries(
                entities,
                confrontations,
                selectedConfrontationTexts,
                georeferencingTransform,
                startLotNumber,
                maxLots
        );

        return summaries.stream()
                .map(this::formatLotTechnicalSummary)
                .collect(Collectors.joining("\n\n"));
    }

    private List<LotTechnicalSummary> buildLotTechnicalSummaries(
            List<Map<String, Object>> entities,
            Map<String, List<String>> confrontations,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {
        List<OrderedLotContext> orderedLots = buildOrderedLotContexts(entities);
        List<OrderLabelReference> orderLabels = extractOrderLabelReferences(entities);
        List<LotTechnicalSummary> summaries = new ArrayList<>();

        for (int index = 0; index < orderedLots.size(); index++) {
            OrderedLotContext orderedLot = orderedLots.get(index);
            List<OrderLabelReference> labelsForPolygon = findOrderLabelsForPolygon(orderedLot.vertices(), orderLabels);
            List<VertexTechnicalPoint> vertexSequence = buildVertexSequence(
                    orderedLot.vertices(),
                    labelsForPolygon,
                    georeferencingTransform
            );
            if (vertexSequence.size() < 2) {
                continue;
            }

            List<TechnicalSideSummary> sideSummaries = buildTechnicalSideSummaries(
                    vertexSequence,
                    confrontations,
                    selectedConfrontationTexts
            );

            List<String> streetFrontages = sideSummaries.stream()
                    .map(TechnicalSideSummary::reference)
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(reference -> !reference.isBlank())
                    .filter(this::looksLikeStreetReference)
                    .distinct()
                    .collect(Collectors.toList());

            boolean hasDualFrontage = streetFrontages.size() >= 2;
            boolean isCornerLot = sideSummaries.stream()
                    .map(TechnicalSideSummary::direction)
                    .distinct()
                    .count() >= 2 && hasDualFrontage;

            LotTechnicalSummary summary = new LotTechnicalSummary(
                    index + 1,
                    orderedLot.area(),
                    orderedLot.perimeter(),
                    vertexSequence,
                    sideSummaries,
                    streetFrontages,
                    isCornerLot,
                    hasDualFrontage,
                    georeferencingTransform != null
            );
            logLotTechnicalSummary(summary);
            summaries.add(summary);
        }

        return summaries;
    }

    private List<LotTechnicalSummary> selectLotTechnicalSummaries(
            List<Map<String, Object>> entities,
            Map<String, List<String>> confrontations,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform,
            int startLotNumber,
            int maxLots) {
        if (entities == null || entities.isEmpty() || maxLots <= 0) {
            return List.of();
        }

        return buildLotTechnicalSummaries(
                entities,
                confrontations,
                selectedConfrontationTexts,
                georeferencingTransform
        ).stream()
                .filter(summary -> summary.lotNumber() >= startLotNumber)
                .limit(maxLots)
                .collect(Collectors.toList());
    }

    private void logMemorialAlignment(String scope, String content, List<LotTechnicalSummary> expectedSummaries) {
        logMemorialAlignment(scope, content, expectedSummaries, validateMemorialAlignment(scope, content, expectedSummaries));
    }

    private void logMemorialAlignment(
            String scope,
            String content,
            List<LotTechnicalSummary> expectedSummaries,
            MemorialAlignmentCheck alignmentCheck) {
        if (expectedSummaries == null || expectedSummaries.isEmpty()) {
            log.debug("Sem resumos tecnicos para validar o retorno da IA no escopo {}", scope);
            return;
        }

        if (content == null || content.isBlank()) {
            log.warn("Resposta vazia da IA no escopo {} para {} lotes esperados", scope, expectedSummaries.size());
            return;
        }

        for (String issue : alignmentCheck.blockingIssues()) {
            log.warn("Escopo {} - bloqueio de alinhamento: {}", scope, issue);
        }
        for (String warning : alignmentCheck.warnings()) {
            log.info("Escopo {} - observacao de alinhamento: {}", scope, warning);
        }
    }

    private MemorialAlignmentCheck validateMemorialAlignment(
            String scope,
            String content,
            List<LotTechnicalSummary> expectedSummaries) {
        if (expectedSummaries == null || expectedSummaries.isEmpty()) {
            return new MemorialAlignmentCheck(true, List.of(), List.of());
        }

        List<String> blockingIssues = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        if (content == null || content.isBlank()) {
            blockingIssues.add("resposta vazia da IA para o escopo " + scope);
            return new MemorialAlignmentCheck(false, blockingIssues, warnings);
        }

        Map<Integer, String> actualBlocks = extractLotBlocks(content).stream()
                .collect(Collectors.toMap(
                        LotBlock::lotNumber,
                        LotBlock::content,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        Set<Integer> expectedLotNumbers = expectedSummaries.stream()
                .map(LotTechnicalSummary::lotNumber)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        for (Integer returnedLot : actualBlocks.keySet()) {
            if (!expectedLotNumbers.contains(returnedLot)) {
                blockingIssues.add("retornou lote fora da faixa esperada: lote " + returnedLot);
            }
        }

        for (LotTechnicalSummary summary : expectedSummaries) {
            String block = actualBlocks.get(summary.lotNumber());
            if (block == null || block.isBlank()) {
                blockingIssues.add("nao retornou o lote " + summary.lotNumber() + " esperado pelo backend");
                continue;
            }

            String blockUpper = block.toUpperCase(Locale.ROOT);
            long confrontationLineCount = countMatches(block, "(?im)^AO\\s+(?:NORTE|SUL|LESTE|OESTE):");
            if (confrontationLineCount == 0) {
                blockingIssues.add("lote " + summary.lotNumber() + " sem linhas AO NORTE/SUL/LESTE/OESTE");
            } else {
                warnings.add("lote " + summary.lotNumber()
                        + " validado com "
                        + confrontationLineCount
                        + " linhas de confrontacao para "
                        + summary.sideSummaries().size()
                        + " arestas esperadas");
            }

            List<String> expectedStreetRefs = summary.streetFrontages().stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(reference -> !reference.isBlank())
                    .distinct()
                    .collect(Collectors.toList());
            if (!expectedStreetRefs.isEmpty()) {
                long matchedStreetRefs = expectedStreetRefs.stream()
                        .filter(reference -> blockUpper.contains(reference.toUpperCase(Locale.ROOT)))
                        .count();
                if (matchedStreetRefs == 0) {
                    blockingIssues.add("lote " + summary.lotNumber()
                            + " nao mencionou nenhuma frente viaria esperada " + expectedStreetRefs);
                } else {
                    warnings.add("lote " + summary.lotNumber()
                            + " confirmou "
                            + matchedStreetRefs
                            + " de "
                            + expectedStreetRefs.size()
                            + " frentes viarias esperadas");
                }
            }

            List<String> orderedLabels = summary.vertexSequence().stream()
                    .map(VertexTechnicalPoint::label)
                    .filter(Objects::nonNull)
                    .filter(label -> !label.isBlank())
                    .filter(label -> !label.startsWith("V"))
                    .distinct()
                    .collect(Collectors.toList());
            if (!orderedLabels.isEmpty()) {
                long matchedLabels = orderedLabels.stream()
                        .filter(label -> blockUpper.contains(label.toUpperCase(Locale.ROOT)))
                        .count();
                if (matchedLabels == 0) {
                    warnings.add("lote " + summary.lotNumber()
                            + " nao citou pontos/estacas esperados " + orderedLabels);
                }
            }
        }

        return new MemorialAlignmentCheck(blockingIssues.isEmpty(), blockingIssues, warnings);
    }

    private long countMatches(String content, String regex) {
        if (content == null || content.isBlank()) {
            return 0L;
        }

        long count = 0L;
        Matcher matcher = Pattern.compile(regex).matcher(content);
        while (matcher.find()) {
            count++;
        }
        return count;
    }

    private List<LotBlock> extractLotBlocks(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }

        Matcher matcher = LOT_BLOCK_PATTERN.matcher(content);
        List<LotBlock> blocks = new ArrayList<>();
        while (matcher.find()) {
            blocks.add(new LotBlock(
                    Integer.parseInt(matcher.group(1)),
                    matcher.group().trim(),
                    matcher.start(),
                    matcher.end()
            ));
        }
        return blocks;
    }

    private List<VertexTechnicalPoint> buildVertexSequence(
            List<Map<String, Object>> vertices,
            List<OrderLabelReference> labelsForPolygon,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {
        if (vertices == null || vertices.isEmpty()) {
            return List.of();
        }

        double minX = Double.POSITIVE_INFINITY;
        double minY = Double.POSITIVE_INFINITY;
        double maxX = Double.NEGATIVE_INFINITY;
        double maxY = Double.NEGATIVE_INFINITY;
        for (Map<String, Object> vertex : vertices) {
            double x = parseDouble(vertex.get("x"));
            double y = parseDouble(vertex.get("y"));
            if (Double.isNaN(x) || Double.isNaN(y)) {
                continue;
            }
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }

        double diagonal = Math.hypot(maxX - minX, maxY - minY);
        double labelThreshold = Math.max(8.0, Math.min(50.0, diagonal * 0.35));
        Set<Integer> usedOrders = new LinkedHashSet<>();
        List<VertexTechnicalPoint> sequence = new ArrayList<>();

        for (int i = 0; i < vertices.size(); i++) {
            Map<String, Object> vertex = vertices.get(i);
            double x = parseDouble(vertex.get("x"));
            double y = parseDouble(vertex.get("y"));
            if (Double.isNaN(x) || Double.isNaN(y)) {
                continue;
            }

            OrderLabelReference nearestLabel = null;
            double nearestDistance = Double.MAX_VALUE;
            for (OrderLabelReference label : labelsForPolygon) {
                if (usedOrders.contains(label.orderNumber())) {
                    continue;
                }
                double currentDistance = distance(x, y, label.x(), label.y());
                if (currentDistance <= labelThreshold && currentDistance < nearestDistance) {
                    nearestLabel = label;
                    nearestDistance = currentDistance;
                }
            }

            if (nearestLabel != null) {
                usedOrders.add(nearestLabel.orderNumber());
            }

            sequence.add(new VertexTechnicalPoint(
                    i,
                    nearestLabel != null ? nearestLabel.label() : String.format(Locale.US, "V%02d", i + 1),
                    nearestLabel != null ? nearestLabel.orderNumber() : Integer.MAX_VALUE,
                    projectVertexX(x, y, georeferencingTransform),
                    projectVertexY(x, y, georeferencingTransform)
            ));
        }

        OptionalInt firstOrderedVertexIndex = sequence.stream()
                .filter(vertex -> vertex.orderNumber() != Integer.MAX_VALUE)
                .mapToInt(VertexTechnicalPoint::originalIndex)
                .min();

        if (firstOrderedVertexIndex.isPresent()) {
            int startIndex = firstOrderedVertexIndex.getAsInt();
            List<VertexTechnicalPoint> rotated = new ArrayList<>();
            for (int i = 0; i < sequence.size(); i++) {
                rotated.add(sequence.get((startIndex + i) % sequence.size()));
            }
            sequence = rotated;
        }

        List<VertexTechnicalPoint> normalizedSequence = new ArrayList<>();
        for (int i = 0; i < sequence.size(); i++) {
            VertexTechnicalPoint current = sequence.get(i);
            String normalizedLabel = current.orderNumber() != Integer.MAX_VALUE
                    ? current.label()
                    : String.format(Locale.US, "V%02d", i + 1);
            normalizedSequence.add(new VertexTechnicalPoint(
                    current.originalIndex(),
                    normalizedLabel,
                    current.orderNumber(),
                    current.x(),
                    current.y()
            ));
        }

        return normalizedSequence;
    }

    private List<TechnicalSideSummary> buildTechnicalSideSummaries(
            List<VertexTechnicalPoint> vertexSequence,
            Map<String, List<String>> confrontations,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        List<PolygonEdge> edges = buildPolygonEdges(vertexSequence);
        Map<String, FrontageReference> manualFrontages = buildManualFrontageByDirection(edges, selectedConfrontationTexts);
        List<TechnicalSideSummary> sideSummaries = new ArrayList<>();

        for (int i = 0; i < vertexSequence.size(); i++) {
            VertexTechnicalPoint start = vertexSequence.get(i);
            VertexTechnicalPoint end = vertexSequence.get((i + 1) % vertexSequence.size());
            PolygonEdge edge = edges.get(i);
            FrontageReference frontage = resolveFrontageReference(edge.side(), manualFrontages, confrontations);
            double azimuth = calculateAzimuth(start.x(), start.y(), end.x(), end.y());

            sideSummaries.add(new TechnicalSideSummary(
                    i + 1,
                    start.label(),
                    end.label(),
                    edge.length(),
                    edge.side(),
                    CoordinateUtils.azimuthToTechnicalBearing(azimuth),
                    frontage.reference(),
                    frontage.source(),
                    frontage.reason()
            ));
        }

        return sideSummaries;
    }

    private List<PolygonEdge> buildPolygonEdges(List<VertexTechnicalPoint> vertexSequence) {
        if (vertexSequence.size() < 2) {
            return List.of();
        }

        double centroidX = vertexSequence.stream()
                .mapToDouble(VertexTechnicalPoint::x)
                .average()
                .orElse(0.0);
        double centroidY = vertexSequence.stream()
                .mapToDouble(VertexTechnicalPoint::y)
                .average()
                .orElse(0.0);

        List<PolygonEdge> edges = new ArrayList<>();
        for (int i = 0; i < vertexSequence.size(); i++) {
            VertexTechnicalPoint current = vertexSequence.get(i);
            VertexTechnicalPoint next = vertexSequence.get((i + 1) % vertexSequence.size());
            double midpointX = (current.x() + next.x()) / 2.0;
            double midpointY = (current.y() + next.y()) / 2.0;
            double dx = midpointX - centroidX;
            double dy = midpointY - centroidY;
            String side;
            if (Math.abs(dx) > Math.abs(dy)) {
                side = dx >= 0 ? "LESTE" : "OESTE";
            } else {
                side = dy >= 0 ? "NORTE" : "SUL";
            }

            edges.add(new PolygonEdge(
                    current.x(),
                    current.y(),
                    next.x(),
                    next.y(),
                    side,
                    calculateSegmentLength(current.x(), current.y(), next.x(), next.y()),
                    calculateSegmentAngle(current.x(), current.y(), next.x(), next.y())
            ));
        }

        return edges;
    }

    private Map<String, FrontageReference> buildManualFrontageByDirection(
            List<PolygonEdge> lotEdges,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        Map<String, FrontageReference> references = new LinkedHashMap<>();
        if (selectedConfrontationTexts == null || selectedConfrontationTexts.isEmpty()) {
            return references;
        }

        for (SelectedConfrontationTextDTO selectedText : selectedConfrontationTexts) {
            ManualFrontageEvidence evidence = analyzeManualFrontage(lotEdges, selectedText);
            if (evidence == null) {
                continue;
            }

            String direction = evidence.inferredSide() != null ? evidence.inferredSide() : evidence.sourceDirection();
            if (direction == null || evidence.streetName() == null || evidence.streetName().isBlank()) {
                continue;
            }

            int confidenceScore = evidence.directTouch() ? 3 : evidence.cornerContinuation() ? 2 : 1;
            FrontageReference current = references.get(direction);
            if (current != null && current.confidenceScore() >= confidenceScore) {
                continue;
            }

            String source = evidence.directTouch()
                    ? "manual_segmento"
                    : evidence.cornerContinuation() ? "continuidade_esquina" : "manual_texto";
            String reason = evidence.directTouch()
                    ? "toque geometrico direto"
                    : evidence.cornerContinuation() ? "continuidade de esquina" : "direcao inferida do texto manual";

            references.put(direction, new FrontageReference(
                    evidence.streetName().trim(),
                    source,
                    confidenceScore,
                    reason
            ));
        }

        return references;
    }

    private FrontageReference resolveFrontageReference(
            String direction,
            Map<String, FrontageReference> manualFrontages,
            Map<String, List<String>> confrontations) {
        if (direction != null && manualFrontages != null && manualFrontages.containsKey(direction)) {
            return manualFrontages.get(direction);
        }

        String drawingReference = resolveDrawingBoundaryReference(confrontations, direction);
        if (!"nao identificado no DXF".equalsIgnoreCase(drawingReference)) {
            return new FrontageReference(
                    drawingReference,
                    "texto_dxf",
                    1,
                    "referencia extraida do desenho para o lado " + direction
            );
        }

        return new FrontageReference(
                "divisa interna do loteamento",
                "fallback_interno",
                0,
                "sem confrontante externo confiavel para o lado " + direction
        );
    }

    private String formatLotTechnicalSummary(LotTechnicalSummary summary) {
        StringBuilder builder = new StringBuilder();
        builder.append("LOTE ")
                .append(String.format(Locale.US, "%02d", summary.lotNumber()))
                .append(" | area validada: ")
                .append(summary.area() != null ? String.format(Locale.US, "%.2f m2", summary.area()) : "nao identificada")
                .append(" | perimetro validado: ")
                .append(summary.perimeter() != null ? String.format(Locale.US, "%.2f m", summary.perimeter()) : "nao identificado")
                .append(" | esquina: ")
                .append(summary.isCornerLot() ? "sim" : "nao")
                .append(" | dupla frente: ")
                .append(summary.hasDualFrontage() ? "sim" : "nao")
                .append(" | vertices georreferenciados: ")
                .append(summary.hasGeoreferencedVertices() ? "sim" : "nao")
                .append("\n");

        builder.append("PONTOS/ESTACAS EM ORDEM: ")
                .append(summary.vertexSequence().stream()
                        .map(VertexTechnicalPoint::label)
                        .collect(Collectors.joining(" -> ")))
                .append("\n");

        builder.append(summary.hasGeoreferencedVertices()
                        ? "VERTICES VALIDADOS EM COORDENADAS REAIS:\n"
                        : "VERTICES VALIDADOS NO SISTEMA LOCAL DO DXF:\n");
        for (VertexTechnicalPoint vertex : summary.vertexSequence()) {
            builder.append("- ")
                    .append(vertex.label())
                    .append(" | ")
                    .append(summary.hasGeoreferencedVertices() ? "E" : "X")
                    .append(": ")
                    .append(String.format(Locale.US, "%.3f", vertex.x()))
                    .append(" | ")
                    .append(summary.hasGeoreferencedVertices() ? "N" : "Y")
                    .append(": ")
                    .append(String.format(Locale.US, "%.3f", vertex.y()))
                    .append("\n");
        }

        if (!summary.streetFrontages().isEmpty()) {
            builder.append("FRENTES VIARIAS VALIDADAS: ")
                    .append(String.join(", ", summary.streetFrontages()))
                    .append("\n");
        }

        builder.append("ARESTAS VALIDADAS:\n");
        for (TechnicalSideSummary side : summary.sideSummaries()) {
            builder.append("- Aresta ")
                    .append(String.format(Locale.US, "%02d", side.sideIndex()))
                    .append(": ")
                    .append(side.startLabel())
                    .append(" -> ")
                    .append(side.endLabel())
                    .append(" | comprimento: ")
                    .append(String.format(Locale.US, "%.2f m", side.length()))
                    .append(" | direcao predominante: ")
                    .append(side.direction())
                    .append(" | rumo: ")
                    .append(side.technicalBearing())
                    .append(" | confrontacao validada: ")
                    .append(side.reference())
                    .append(" | origem: ")
                    .append(side.referenceSource());
            if (side.reason() != null && !side.reason().isBlank()) {
                builder.append(" | motivo: ").append(side.reason());
            }
            builder.append("\n");
        }

        return builder.toString().trim();
    }

    private void logLotTechnicalSummary(LotTechnicalSummary summary) {
        log.info(
                "Lote {} resumido no backend: area={} perimetro={} frentes={} esquina={} duplaFrente={} verticesGeorreferenciados={}",
                String.format(Locale.US, "%02d", summary.lotNumber()),
                summary.area() != null ? String.format(Locale.US, "%.2f", summary.area()) : "n/d",
                summary.perimeter() != null ? String.format(Locale.US, "%.2f", summary.perimeter()) : "n/d",
                summary.streetFrontages().isEmpty() ? "nenhuma" : String.join(", ", summary.streetFrontages()),
                summary.isCornerLot(),
                summary.hasDualFrontage(),
                summary.hasGeoreferencedVertices()
        );

        for (VertexTechnicalPoint vertex : summary.vertexSequence()) {
            log.info(
                    "Lote {} vertice {}: {}={} {}={}",
                    String.format(Locale.US, "%02d", summary.lotNumber()),
                    vertex.label(),
                    summary.hasGeoreferencedVertices() ? "E" : "X",
                    String.format(Locale.US, "%.3f", vertex.x()),
                    summary.hasGeoreferencedVertices() ? "N" : "Y",
                    String.format(Locale.US, "%.3f", vertex.y())
            );
        }

        for (TechnicalSideSummary side : summary.sideSummaries()) {
            log.info(
                    "Lote {} aresta {} {}->{}: comprimento={} direcao={} confrontacao={} origem={}",
                    String.format(Locale.US, "%02d", summary.lotNumber()),
                    String.format(Locale.US, "%02d", side.sideIndex()),
                    side.startLabel(),
                    side.endLabel(),
                    String.format(Locale.US, "%.2f", side.length()),
                    side.direction(),
                    side.reference(),
                    side.referenceSource()
            );
        }
    }

    private double calculateAzimuth(double startX, double startY, double endX, double endY) {
        double azimuth = Math.toDegrees(Math.atan2(endX - startX, endY - startY));
        return azimuth < 0 ? azimuth + 360.0 : azimuth;
    }

    private String resolveLotStreetReference(List<String> streetNames) {
        if (streetNames == null || streetNames.isEmpty()) {
            return "nao identificado no DXF";
        }

        LinkedHashSet<String> uniqueStreetNames = new LinkedHashSet<>();
        for (String streetName : streetNames) {
            if (streetName == null) {
                continue;
            }
            String normalized = streetName.trim();
            if (!normalized.isBlank()) {
                uniqueStreetNames.add(normalized);
            }
            if (uniqueStreetNames.size() >= 3) {
                break;
            }
        }

        if (uniqueStreetNames.isEmpty()) {
            return "nao identificado no DXF";
        }

        return String.join(", ", uniqueStreetNames);
    }

    private List<String> mergeManualStreetNames(
            List<String> streetNames,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        LinkedHashSet<String> merged = new LinkedHashSet<>();
        if (streetNames != null) {
            streetNames.stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .forEach(merged::add);
        }

        if (selectedConfrontationTexts != null) {
            selectedConfrontationTexts.stream()
                    .map(SelectedConfrontationTextDTO::text)
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .filter(this::looksLikeStreetReference)
                    .forEach(merged::add);
        }

        return new ArrayList<>(merged);
    }

    private Map<String, List<String>> mergeManualConfrontations(
            Map<String, List<String>> confrontations,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        Map<String, List<String>> merged = new LinkedHashMap<>();
        if (confrontations != null) {
            confrontations.forEach((direction, values) -> merged.put(
                    direction,
                    values != null ? new ArrayList<>(values) : new ArrayList<>()
            ));
        }

        if (selectedConfrontationTexts == null) {
            return merged;
        }

        for (SelectedConfrontationTextDTO selectedText : selectedConfrontationTexts) {
            if (selectedText == null || selectedText.text() == null || selectedText.text().isBlank()) {
                continue;
            }

            String direction = normalizeDirection(selectedText.inferredDirection());
            if (direction == null) {
                continue;
            }

            merged.computeIfAbsent(direction, key -> new ArrayList<>());
            String normalizedText = selectedText.text().trim();
            if (!merged.get(direction).contains(normalizedText)) {
                if ("segment".equalsIgnoreCase(selectedText.selectionMode())) {
                    merged.get(direction).add(0, normalizedText);
                } else {
                    merged.get(direction).add(normalizedText);
                }
            }
        }

        return merged;
    }

    private void appendSelectedConfrontationTextsPrompt(
            StringBuilder promptBuilder,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        if (selectedConfrontationTexts == null || selectedConfrontationTexts.isEmpty()) {
            return;
        }

        promptBuilder.append("TEXTOS DE CONFRONTACAO SELECIONADOS MANUALMENTE NO FRONTEND:\n");
        for (SelectedConfrontationTextDTO selectedText : selectedConfrontationTexts) {
            if (selectedText == null || selectedText.text() == null || selectedText.text().isBlank()) {
                continue;
            }

            String direction = normalizeDirection(selectedText.inferredDirection());
            promptBuilder.append("- ");
            if (direction != null) {
                promptBuilder.append(direction).append(": ");
            }
            promptBuilder.append(selectedText.text().trim());
            if (selectedText.layer() != null && !selectedText.layer().isBlank()) {
                promptBuilder.append(" [layer=").append(selectedText.layer().trim()).append("]");
            }
            if ("segment".equalsIgnoreCase(selectedText.selectionMode())
                    && selectedText.segmentStartX() != null && selectedText.segmentStartY() != null
                    && selectedText.segmentEndX() != null && selectedText.segmentEndY() != null) {
                promptBuilder.append(String.format(Locale.US,
                        " [trecho=(%.2f, %.2f)->(%.2f, %.2f)]",
                        selectedText.segmentStartX(),
                        selectedText.segmentStartY(),
                        selectedText.segmentEndX(),
                        selectedText.segmentEndY()));
            }
            promptBuilder.append("\n");
        }
        promptBuilder.append("Quando esses textos manuais estiverem presentes, eles devem ter prioridade sobre heuristicas genericas do desenho.\n");
        promptBuilder.append("Se o item manual vier com trecho geometrico selecionado, trate essa via como confrontacao preferencial dos lotes que tocam esse segmento.\n\n");
    }

    private void appendManualFrontageAnalysisPrompt(
            StringBuilder promptBuilder,
            List<Map<String, Object>> allEntities,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        String analysis = buildManualFrontageAnalysis(allEntities, selectedConfrontationTexts);
        if (analysis.isBlank()) {
            return;
        }

        promptBuilder.append("ANALISE GEOMETRICA DE FRENTES E ESQUINAS:\n");
        promptBuilder.append(analysis);
        promptBuilder.append("\n");
    }

    private String normalizeDirection(String direction) {
        if (direction == null || direction.isBlank()) {
            return null;
        }

        return switch (direction.trim().toUpperCase(Locale.ROOT)) {
            case "NORTE" -> "NORTE";
            case "SUL" -> "SUL";
            case "LESTE" -> "LESTE";
            case "OESTE" -> "OESTE";
            default -> null;
        };
    }

    private boolean looksLikeStreetReference(String text) {
        String normalized = text.toUpperCase(Locale.ROOT);
        return normalized.contains("RUA ")
                || normalized.startsWith("RUA")
                || normalized.contains("AVENIDA")
                || normalized.contains("AV.")
                || normalized.contains("TRAVESSA")
                || normalized.contains("ALAMEDA")
                || normalized.contains("RODOVIA")
                || normalized.contains("ESTRADA")
                || normalized.contains("SDO");
    }

    private String buildManualFrontageAnalysis(
            List<Map<String, Object>> allEntities,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        if (selectedConfrontationTexts == null || selectedConfrontationTexts.isEmpty()) {
            return "";
        }

        List<PolygonEdge> lotEdges = extractLotEdges(allEntities);
        if (lotEdges.isEmpty()) {
            return "";
        }

        List<ManualFrontageEvidence> evidences = new ArrayList<>();
        for (SelectedConfrontationTextDTO selectedText : selectedConfrontationTexts) {
            if (selectedText == null || selectedText.text() == null || selectedText.text().isBlank()) {
                continue;
            }

            ManualFrontageEvidence evidence = analyzeManualFrontage(lotEdges, selectedText);
            if (evidence != null) {
                evidences.add(evidence);
            }
        }

        if (evidences.isEmpty()) {
            return "";
        }

        StringBuilder analysis = new StringBuilder();
        LinkedHashSet<String> distinctExternalSides = new LinkedHashSet<>();
        LinkedHashSet<String> distinctStreetNames = new LinkedHashSet<>();
        boolean hasCornerContinuation = false;

        for (ManualFrontageEvidence evidence : evidences) {
            distinctStreetNames.add(evidence.streetName());
            if (evidence.inferredSide() != null && !"INTERNO".equals(evidence.inferredSide())) {
                distinctExternalSides.add(evidence.inferredSide());
            }
            if (evidence.cornerContinuation()) {
                hasCornerContinuation = true;
            }

            analysis.append("- Via manual '")
                    .append(evidence.streetName())
                    .append("' associada preferencialmente ao lado ")
                    .append(evidence.inferredSide() != null ? evidence.inferredSide() : "mais proximo")
                    .append(" do poligono");

            if (evidence.directTouch()) {
                analysis.append(" com toque geometrico direto");
            } else if (evidence.cornerContinuation()) {
                analysis.append(" por continuidade de esquina");
            } else {
                analysis.append(" por alinhamento geometrico");
            }

            if (evidence.sourceDirection() != null) {
                analysis.append(" (direcao manual: ").append(evidence.sourceDirection()).append(")");
            }

            analysis.append(".\n");
        }

        if (distinctStreetNames.size() >= 2 && distinctExternalSides.size() >= 2) {
            analysis.append("- O poligono admite dupla frente real ou lote de esquina irregular; preserve mais de uma via publica quando os lados forem distintos.\n");
        }

        if (hasCornerContinuation) {
            analysis.append("- Mesmo que o trecho manual termine antes do lote, a confrontacao pode ser estendida por continuidade de esquina se a aresta externa permanecer alinhada.\n");
        }

        analysis.append("- So use 'divisa interna do loteamento' nos lados sem toque viario plausivel.\n");
        return analysis.toString();
    }

    private ManualFrontageEvidence analyzeManualFrontage(
            List<PolygonEdge> lotEdges,
            SelectedConfrontationTextDTO selectedText) {
        String streetName = selectedText.text().trim();
        String sourceDirection = normalizeDirection(selectedText.inferredDirection());

        if (!"segment".equalsIgnoreCase(selectedText.selectionMode())
                || selectedText.segmentStartX() == null
                || selectedText.segmentStartY() == null
                || selectedText.segmentEndX() == null
                || selectedText.segmentEndY() == null) {
            return new ManualFrontageEvidence(
                    streetName,
                    sourceDirection,
                    sourceDirection,
                    false,
                    false
            );
        }

        double segmentAngle = calculateSegmentAngle(
                selectedText.segmentStartX(),
                selectedText.segmentStartY(),
                selectedText.segmentEndX(),
                selectedText.segmentEndY()
        );

        PolygonEdge bestEdge = null;
        boolean bestDirectTouch = false;
        boolean bestCornerContinuation = false;
        double bestScore = Double.MAX_VALUE;

        for (PolygonEdge edge : lotEdges) {
            double angleDifference = normalizedAngleDifference(segmentAngle, edge.angleDegrees());
            if (angleDifference > 25.0) {
                continue;
            }

            double lineDistance = minimumDistanceBetweenSegments(
                    selectedText.segmentStartX(),
                    selectedText.segmentStartY(),
                    selectedText.segmentEndX(),
                    selectedText.segmentEndY(),
                    edge.startX(),
                    edge.startY(),
                    edge.endX(),
                    edge.endY()
            );

            boolean directTouch = lineDistance <= 18.0;
            boolean cornerContinuation = !directTouch
                    && (isPointNearSegment(edge.startX(), edge.startY(),
                    selectedText.segmentStartX(), selectedText.segmentStartY(),
                    selectedText.segmentEndX(), selectedText.segmentEndY(), 28.0)
                    || isPointNearSegment(edge.endX(), edge.endY(),
                    selectedText.segmentStartX(), selectedText.segmentStartY(),
                    selectedText.segmentEndX(), selectedText.segmentEndY(), 28.0)
                    || distance(edge.startX(), edge.startY(), selectedText.segmentEndX(), selectedText.segmentEndY()) <= 35.0
                    || distance(edge.endX(), edge.endY(), selectedText.segmentEndX(), selectedText.segmentEndY()) <= 35.0
                    || distance(edge.startX(), edge.startY(), selectedText.segmentStartX(), selectedText.segmentStartY()) <= 35.0
                    || distance(edge.endX(), edge.endY(), selectedText.segmentStartX(), selectedText.segmentStartY()) <= 35.0);

            if (!directTouch && !cornerContinuation) {
                continue;
            }

            double score = lineDistance + angleDifference;
            if (score < bestScore) {
                bestScore = score;
                bestEdge = edge;
                bestDirectTouch = directTouch;
                bestCornerContinuation = cornerContinuation;
            }
        }

        String inferredSide = bestEdge != null
                ? bestEdge.side()
                : sourceDirection;

        return new ManualFrontageEvidence(
                streetName,
                sourceDirection,
                inferredSide,
                bestDirectTouch,
                bestCornerContinuation
        );
    }

    private List<PolygonEdge> extractLotEdges(List<Map<String, Object>> allEntities) {
        if (allEntities == null || allEntities.isEmpty()) {
            return List.of();
        }

        List<PolygonEdge> edges = new ArrayList<>();
        for (Map<String, Object> entity : allEntities) {
            String type = String.valueOf(entity.get("type"));
            if (!"POLYLINE".equals(type) && !"LWPOLYLINE".equals(type)) {
                continue;
            }

            List<Map<String, Object>> vertices = extractVertices(entity);
            if (vertices.size() < 2) {
                continue;
            }

            double centroidX = vertices.stream()
                    .mapToDouble(vertex -> parseDouble(vertex.get("x")))
                    .average()
                    .orElse(0.0);
            double centroidY = vertices.stream()
                    .mapToDouble(vertex -> parseDouble(vertex.get("y")))
                    .average()
                    .orElse(0.0);

            for (int i = 0; i < vertices.size(); i++) {
                Map<String, Object> current = vertices.get(i);
                Map<String, Object> next = vertices.get((i + 1) % vertices.size());
            double startX = parseDouble(current.get("x"));
            double startY = parseDouble(current.get("y"));
            double endX = parseDouble(next.get("x"));
            double endY = parseDouble(next.get("y"));

            if (Double.isNaN(startX) || Double.isNaN(startY) || Double.isNaN(endX) || Double.isNaN(endY)) {
                continue;
            }

            double midpointX = (startX + endX) / 2.0;
            double midpointY = (startY + endY) / 2.0;
            double dx = midpointX - centroidX;
            double dy = midpointY - centroidY;
            String side;
            if (Math.abs(dx) > Math.abs(dy)) {
                side = dx >= 0 ? "LESTE" : "OESTE";
            } else {
                side = dy >= 0 ? "NORTE" : "SUL";
            }

                edges.add(new PolygonEdge(
                        startX,
                        startY,
                        endX,
                        endY,
                        side,
                        calculateSegmentLength(startX, startY, endX, endY),
                        calculateSegmentAngle(startX, startY, endX, endY)
                ));
            }
        }

        return edges;
    }

    private double parseDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value == null) {
            return Double.NaN;
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return Double.NaN;
        }
    }

    private double calculateSegmentLength(double startX, double startY, double endX, double endY) {
        return Math.hypot(endX - startX, endY - startY);
    }

    private double calculateSegmentAngle(double startX, double startY, double endX, double endY) {
        double angle = Math.toDegrees(Math.atan2(endY - startY, endX - startX));
        return angle < 0 ? angle + 180.0 : angle % 180.0;
    }

    private double normalizedAngleDifference(double angleA, double angleB) {
        double difference = Math.abs(angleA - angleB);
        return difference > 90.0 ? 180.0 - difference : difference;
    }

    private double minimumDistanceBetweenSegments(
            double ax1, double ay1, double ax2, double ay2,
            double bx1, double by1, double bx2, double by2) {
        return Math.min(
                Math.min(distancePointToSegment(ax1, ay1, bx1, by1, bx2, by2),
                        distancePointToSegment(ax2, ay2, bx1, by1, bx2, by2)),
                Math.min(distancePointToSegment(bx1, by1, ax1, ay1, ax2, ay2),
                        distancePointToSegment(bx2, by2, ax1, ay1, ax2, ay2))
        );
    }

    private boolean isPointNearSegment(
            double px, double py,
            double x1, double y1,
            double x2, double y2,
            double tolerance) {
        return distancePointToSegment(px, py, x1, y1, x2, y2) <= tolerance;
    }

    private double distancePointToSegment(
            double px, double py,
            double x1, double y1,
            double x2, double y2) {
        double dx = x2 - x1;
        double dy = y2 - y1;
        if (dx == 0 && dy == 0) {
            return distance(px, py, x1, y1);
        }

        double projection = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
        double clampedProjection = Math.max(0.0, Math.min(1.0, projection));
        double closestX = x1 + clampedProjection * dx;
        double closestY = y1 + clampedProjection * dy;
        return distance(px, py, closestX, closestY);
    }

    private double distance(double x1, double y1, double x2, double y2) {
        return Math.hypot(x2 - x1, y2 - y1);
    }

    private String resolveDrawingBoundaryReference(Map<String, List<String>> confrontations, String direction) {
        if (confrontations == null || direction == null) {
            return "nao identificado no DXF";
        }

        List<String> extracted = confrontations.get(direction);
        if (extracted == null || extracted.isEmpty()) {
            return "nao identificado no DXF";
        }

        for (String candidate : extracted) {
            if (candidate == null) {
                continue;
            }
            String normalized = candidate.trim();
            if (!normalized.isBlank()) {
                return normalized;
            }
        }

        return "nao identificado no DXF";
    }

    private record PolygonEdge(
            double startX,
            double startY,
            double endX,
            double endY,
            String side,
            double length,
            double angleDegrees
    ) {}

    private record ManualFrontageEvidence(
            String streetName,
            String sourceDirection,
            String inferredSide,
            boolean directTouch,
            boolean cornerContinuation
    ) {}

    private record OrderLabelReference(
            String label,
            int orderNumber,
            double x,
            double y
    ) {}

    private record OrderedLotContext(
            Map<String, Object> entity,
            List<Map<String, Object>> vertices,
            Double area,
            Double perimeter,
            List<String> orderLabels,
            int firstOrderNumber,
            double centroidX,
            double centroidY,
            int fallbackIndex
    ) {}

    private record LotBlock(
            int lotNumber,
            String content,
            int start,
            int end
    ) {}

    private record VertexTechnicalPoint(
            int originalIndex,
            String label,
            int orderNumber,
            double x,
            double y
    ) {}

    private record TechnicalSideSummary(
            int sideIndex,
            String startLabel,
            String endLabel,
            double length,
            String direction,
            String technicalBearing,
            String reference,
            String referenceSource,
            String reason
    ) {}

    private record FrontageReference(
            String reference,
            String source,
            int confidenceScore,
            String reason
    ) {}

    private record LotTechnicalSummary(
            int lotNumber,
            Double area,
            Double perimeter,
            List<VertexTechnicalPoint> vertexSequence,
            List<TechnicalSideSummary> sideSummaries,
            List<String> streetFrontages,
            boolean isCornerLot,
            boolean hasDualFrontage,
            boolean hasGeoreferencedVertices
    ) {}

    private record MemorialAlignmentCheck(
            boolean valid,
            List<String> blockingIssues,
            List<String> warnings
    ) {}

    private String formatNumericPreview(Object value) {
        if (value instanceof Number number) {
            return String.format(Locale.US, "%.2f", number.doubleValue());
        }
        return String.valueOf(value);
    }

    private Double resolveReferenceArea(PropertyDTO property, Map<String, Double> individualAreas, int estimatedLots) {
        if (individualAreas != null && !individualAreas.isEmpty()) {
            return individualAreas.values().stream()
                    .filter(Objects::nonNull)
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .orElse(0.0);
        }
        if (property != null && property.getTotalArea() != null && estimatedLots > 0) {
            return property.getTotalArea().doubleValue() / estimatedLots;
        }
        return null;
    }

    private Double resolveReferencePerimeter(PropertyDTO property, int estimatedLots) {
        if (property == null) {
            return null;
        }
        if (property.getMainFrontage() != null && property.getAverageDepth() != null) {
            return (property.getMainFrontage().doubleValue() * 2) + (property.getAverageDepth().doubleValue() * 2);
        }
        if (property.getTotalPerimeter() != null && estimatedLots == 1) {
            return property.getTotalPerimeter().doubleValue();
        }
        return null;
    }

    private String resolveBoundary(PropertyDTO property, Map<String, List<String>> confrontations, String direction) {
        String propertyBoundary = null;
        if (property != null) {
            switch (direction) {
                case "NORTE":
                    propertyBoundary = property.getNorthBoundary();
                    break;
                case "SUL":
                    propertyBoundary = property.getSouthBoundary();
                    break;
                case "LESTE":
                    propertyBoundary = property.getEastBoundary();
                    break;
                case "OESTE":
                    propertyBoundary = property.getWestBoundary();
                    break;
                default:
                    break;
            }
        }
        if (propertyBoundary != null && !propertyBoundary.isBlank()) {
            return propertyBoundary;
        }
        if (confrontations != null) {
            List<String> extracted = confrontations.get(direction);
            if (extracted != null && !extracted.isEmpty()) {
                return extracted.get(0);
            }
        }
        return "confrontante a confirmar em conferencia tecnica";
    }

    /**
     * Valida se o memorial está completo
     */
    private boolean validateCompleteness(String memorial, int expectedLots) {
        if (memorial == null || memorial.trim().isEmpty()) {
            log.warn("❌ Memorial vazio ou nulo");
            return false;
        }

        // Conta quantos lotes foram gerados
        int lotesFound = 0;
        int maxLoteNumber = 0;

        for (int i = 1; i <= expectedLots; i++) {
            boolean found = containsLotNumber(memorial, i);

            if (found) {
                lotesFound++;
                maxLoteNumber = i;
            }
        }

        // Verifica se contém placeholders proibidos
        boolean hasPlaceholders = memorial.contains("[REPETIR") ||
                memorial.contains("[CONTINUAR") ||
                memorial.contains("[Repita o padrão") ||
                memorial.contains("...") ||
                memorial.contains("demais lotes") ||
                memorial.contains("seguir o mesmo padrão") ||
                memorial.contains("e assim por diante") ||
                memorial.contains("etc.");

        if (expectedLots <= 1) {
            return !hasPlaceholders;
        }

        // VALIDAÇÃO RIGOROSA: Memorial só é completo se:
        // 1. Tem PELO MENOS 95% dos lotes esperados
        // 2. O maior número de lote encontrado >= expectedLots - 2
        // 3. Não tem placeholders
        int minLotsRequired = Math.max(1, (int) (expectedLots * 0.95)); // 95% dos lotes
        boolean hasEnoughLots = (lotesFound >= minLotsRequired);
        boolean hasSequentialLots = (maxLoteNumber >= expectedLots - 2);
        boolean isComplete = hasEnoughLots && hasSequentialLots && !hasPlaceholders;

        if (!isComplete) {
            log.warn("❌ Memorial INCOMPLETO:");
            log.warn("   - Lotes suficientes: {} (mínimo: {})", hasEnoughLots, minLotsRequired);
            log.warn("   - Sequência completa: {} (máximo: {})", hasSequentialLots, maxLoteNumber);
            log.warn("   - Sem placeholders: {}", !hasPlaceholders);
        }

        return isComplete;
    }

    private boolean containsLotNumber(String memorial, int lotNumber) {
        String pattern = "(?i)\\bLOTE\\s*(?:N[ºO]\\s*)?0*" + lotNumber + "\\b";
        return Pattern.compile(pattern).matcher(memorial).find();
    }

    /**
     * Calcula max_tokens dinamicamente
     */
    private int calculateDynamicMaxTokens(int lotCount, int configuredMax, int modelLimit) {
        // LIMITE CRÍTICO: Claude Haiku tem máximo de 4096 tokens
        final int CLAUDE_HAIKU_MAX = 4096;
        
        // Base: tokens para preâmbulo, identificação, situação antes, declaração final
        int baseTokens = 1000;
        
        // Por lote: tokens para descrição completa (coordenadas, área, perímetro, confrontações)
        int tokensPerLot = 120; // Reduzido para caber no limite do Haiku
        
        int calculated = baseTokens + (lotCount * tokensPerLot);
        
        // SEMPRE respeitar o limite do Claude Haiku
        int result = Math.min(calculated, CLAUDE_HAIKU_MAX);
        
        // Se o projeto é muito grande para o Haiku, usar o máximo possível
        if (calculated > CLAUDE_HAIKU_MAX) {
            result = CLAUDE_HAIKU_MAX;
            log.warn("⚠️ Projeto grande ({} lotes) limitado a {} tokens do Claude Haiku", lotCount, CLAUDE_HAIKU_MAX);
            log.warn("💡 Para projetos grandes, considere usar Claude Sonnet que suporta mais tokens");
        }
        return result;
    }

    /**
     * Gera memorial de fallback quando a IA falha
     */
    private String generateFallbackMemorial(DxfCompareResultDTO r, UUID standardId) {
        log.warn("Gerando memorial em modo fallback");
        
        StringBuilder fallback = new StringBuilder();
        fallback.append("MEMORIAL DESCRITIVO (MODO FALLBACK)\n\n");
        fallback.append("Este memorial foi gerado em modo de emergência devido a falhas na IA.\n");
        fallback.append("Dados extraídos do arquivo DXF:\n\n");
        
        if (r.getAdded() != null) {
            fallback.append("Entidades adicionadas: ").append(r.getAdded().size()).append("\n");
        }
        
        fallback.append("\nPor favor, revise e complete manualmente as informações necessárias.\n");
        
        return fallback.toString();
    }

    /**
     * Gera mensagem de erro de extração
     */
    private String generateExtractionErrorMessage(String errorType, DxfCompareResultDTO r) {
        return "ERRO NA EXTRAÇÃO DE DADOS\n\n" +
               "Tipo do erro: " + errorType + "\n" +
               "Não foi possível extrair dados suficientes do arquivo DXF para gerar o memorial.\n" +
               "Verifique se o arquivo contém coordenadas válidas.";
    }
}
