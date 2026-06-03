package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.DxfEntityChangeDTO;
import com.momorialPro.CadMemorial.dto.MemorialStandardDTO;
import com.momorialPro.CadMemorial.dto.PropertyDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.util.*;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemorialApiService {

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
        long startTime = System.currentTimeMillis();

        // Gera chave de cache e limpa entrada existente para forçar regeneração
        String cacheKey = cacheService.generateCacheKey(r);
        cacheService.removeFromCache(cacheKey);

        // VERIFICA SE A API KEY DO CLAUDE ESTÁ CONFIGURADA
        if (claudeApiKey == null || claudeApiKey.equals("PLACEHOLDER_KEY") || claudeApiKey.trim().isEmpty()) {
            log.error("❌ ERRO CRÍTICO: API Key do Claude não configurada!");
            
            if (fallbackEnabled) {
                log.warn("🔄 Usando modo FALLBACK - gerando memorial sem IA");
                return generateFallbackMemorial(r, standardId);
            } else {
                return "ERRO DE CONFIGURACAO\\n\\nA chave do provedor de geracao assistida nao esta configurada.";
            }
        }

        // ===== EXTRAÇÃO AVANÇADA DE DADOS DO DXF =====
        // Converter entidades para formato compatível
        List<Map<String, Object>> allEntities = convertToEntityMaps(r);
        
        // Extrair pontos
        List<SimplePoint> extractedPoints = extractPointsFromEntities(r);
        
        if (extractedPoints.isEmpty()) {
            log.warn("⚠️ AVISO: Nenhuma coordenada real extraída do DXF!");
            
            // NÃO desistir - continuar com dados da propriedade
            extractedPoints = new ArrayList<>(); // Lista vazia, mas continua processamento
        }

        // ===== EXTRAÇÃO AVANÇADA DE COORDENADAS SIRGAS 2000 =====
        DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase = 
                geoExtractorService.extrairCoordenadaBase(allEntities);
        
        // ===== FALLBACK: COORDENADAS SIRGAS MANUAIS =====
        if (coordenadaBase == null && propertyId != null && userId != null) {
            try {
                PropertyDTO property = propertyService.findByIdWithRelationships(propertyId, userId);
                if (property != null) {
                    coordenadaBase = tentarCoordenadaManual(property);
                }
            } catch (Exception e) {
                log.warn("⚠️ Erro ao buscar propriedade para coordenadas SIRGAS: {}", e.getMessage());
            }
        }
        
        // Manter compatibilidade com sistema antigo
        Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates = new HashMap<>();
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
            log.warn("⚠️ COORDENADA SIRGAS NÃO ENCONTRADA - Usando extração antiga como fallback");
            realCoordinates = coordinateExtractionService.extractRealCoordinates(allEntities);
        }

        List<String> streetNames = dxfTextExtractorService.extractStreetNames(allEntities);

        Map<String, List<String>> confrontations = dxfTextExtractorService.extractConfrontations(allEntities);

        Map<String, Double> individualAreas = dxfTextExtractorService.calculateIndividualAreas(allEntities);

        if (realCoordinates.isEmpty()) {
            log.warn("⚠️ NENHUMA COORDENADA REAL EXTRAÍDA - Usando coordenadas genéricas");
        }
        
        // Verificar se temos coordenada base SIRGAS
        boolean temCoordenadaSIRGAS = coordenadaBase != null;
        if (temCoordenadaSIRGAS) {
        } else {
            log.warn("⚠️ USANDO COORDENADAS GENÉRICAS NO MEMORIAL");
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

        // Estimar número de lotes
        int estimatedLotCount = safeEstimateLotCount(r);

        // DECISÃO: Usar particionamento ou geração única?
        // Particiona projetos maiores para respeitar limites de resposta do provedor.
        int haikuThreshold = Math.max(1, partitionThreshold);
        
        if (partitionEnabled && estimatedLotCount > haikuThreshold) {
            return generateWithPartitioning(r, standard, property, extractedPoints, realCoordinates,
                    streetNames, confrontations, individualAreas, standardId, userId, propertyId, startTime, coordenadaBase);
        } else {
            return generateSingleCall(r, standard, property, extractedPoints, realCoordinates,
                    streetNames, confrontations, individualAreas, standardId, userId, propertyId, startTime);
        }
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
            long startTime) {

        int estimatedLotCount = safeEstimateLotCount(r);
        String prompt = buildPrompt(r, standard, property, extractedPoints, realCoordinates, streetNames, confrontations, individualAreas);

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
                String content = extractContentFromClaudeResponse(responseBody);

                // Validação de completude
                boolean isComplete = validateCompleteness(content, estimatedLotCount);
                if (!isComplete) {
                    log.warn("⚠️ MEMORIAL INCOMPLETO: Não contém todos os {} lotes esperados", estimatedLotCount);
                    content = String.format("⚠️ AVISO: Este memorial está incompleto. Foram gerados apenas alguns lotes.\\n" +
                            "Para memorial completo com %d lotes, tente gerar novamente.\\n\\n", estimatedLotCount) + content;
                }

                String result = content;

                // Adiciona metadados
                String projectName = property != null && property.getName() != null ? property.getName() : "Projeto sem nome";
                String fileName = r.getNewFileName() != null ? r.getNewFileName() : "Arquivo DXF";
                String aiInfo = String.format("Memorial Descritivo\\n Projeto: %s\\n Arquivo: %s\\n Data: %s\\n",
                        projectName,
                        fileName,
                        java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));

                result = aiInfo + String.format("<!-- Gerado por: %s em %s -->\\n",
                        claudeModel,
                        java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"))) + result;

                // Registra métricas e cache
                long processingTime = System.currentTimeMillis() - startTime;
                int estimatedLots = safeEstimateLotCount(r);
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
                        return generateFallbackMemorial(r, standardId);
                    } else {
                        throw new RuntimeException("Falha na geração do memorial após " + maxRetries + " tentativas: " + e.getMessage());
                    }
                }
            }
        }

        return "Erro inesperado na geração do memorial";
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
            DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase) {

        int totalLots = safeEstimateLotCount(r);
        
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
                        extractedPoints, realCoordinates, streetNames, confrontations, individualAreas, coordenadaBase);
                
                finalMemorial.append(chunkContent).append("\n");
                long chunkTime = System.currentTimeMillis() - chunkStartTime;
                
                // Delay entre chunks para evitar rate limit
                if (chunk < totalChunks - 1) {
                    Thread.sleep(chunkDelay);
                }
                
            } catch (Exception e) {
                log.error("❌ Erro no chunk {}: {}", chunk + 1, e.getMessage());
                
                // Continuar com próximo chunk em caso de erro
                finalMemorial.append("LOTES ").append(startLot).append(" a ").append(endLot)
                           .append(": Erro na geração - revisar manualmente.\n\n");
            }
        }
        
        // Adicionar conclusão
        finalMemorial.append(generateConclusion(property));
        
        // Adicionar metadados
        String result = addMetadata(finalMemorial.toString(), property, r, totalLots, "Particionado");
        
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
                                   Map<String, Double> individualAreas, DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase) {

        StringBuilder chunkPrompt = new StringBuilder();
        int estimatedLots = safeEstimateLotCount(r);
        Double areaReferencia = resolveReferenceArea(property, individualAreas, estimatedLots);
        Double perimetroReferencia = resolveReferencePerimeter(property, estimatedLots);

        chunkPrompt.append("=== FORMATO OBRIGATORIO PARA CADA LOTE ===\n");
        chunkPrompt.append("LOTE X:\n");
        chunkPrompt.append("Um imovel urbano, localizado na [RUA], bairro [BAIRRO], [CIDADE]/[ESTADO],\n");
        chunkPrompt.append("possuindo formato poligonal conforme vertices e coordenadas efetivamente identificados no levantamento,\n");
        chunkPrompt.append("com perimetro, area e confrontacoes compativeis com os dados tecnicos disponiveis.\n");
        chunkPrompt.append("AO NORTE: informar medida, sentido e confrontante com base no levantamento.\n");
        chunkPrompt.append("AO SUL: informar medida, sentido e confrontante com base no levantamento.\n");
        chunkPrompt.append("AO LESTE: informar medida, sentido e confrontante com base no levantamento.\n");
        chunkPrompt.append("AO OESTE: informar medida, sentido e confrontante com base no levantamento.\n");
        chunkPrompt.append("----------------------------------------------------------------------\n\n");

        chunkPrompt.append("Gere descricao completa dos LOTES ").append(startLot).append(" a ").append(endLot).append(".\n");
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
        chunkPrompt.append("Quando um valor nao puder ser determinado com seguranca, registre a necessidade de conferencia tecnica em vez de inventar numeros.\n\n");

        String location = property != null && property.getStreet() != null ? property.getStreet() : "[NAO INFORMADA]";
        String bairro = property != null && property.getNeighborhood() != null ? property.getNeighborhood() : "[NAO INFORMADO]";
        String cidade = property != null && property.getCity() != null ? property.getCity() : "[NAO INFORMADA]";
        String estado = property != null && property.getState() != null ? property.getState() : "[UF NAO INFORMADA]";

        chunkPrompt.append("DADOS DO LOCAL:\n");
        chunkPrompt.append("Rua: ").append(location).append("\n");
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
        
        // Fazer chamada para Claude
        Map<String, Object> body = new HashMap<>();
        body.put("model", claudeModel);
        body.put("max_tokens", 3500); // Seguro para chunk pequeno
        body.put("temperature", 0.2);
        
        body.put("messages", new Object[]{
                Map.of("role", "user", "content", chunkPrompt.toString())
        });
        
        try {
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
            return extractContentFromClaudeResponse(responseBody);
            
        } catch (Exception e) {
            log.error("❌ Erro ao gerar chunk lotes {}-{}: {}", startLot, endLot, e.getMessage());
            throw new RuntimeException("Erro no chunk: " + e.getMessage());
        }
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
        
        String header = String.format("Memorial Descritivo - %s\nProjeto: %s\nArquivo: %s\nData: %s\nMétodo: %s (%d lotes)\n\n",
                method,
                projectName,
                fileName,
                java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                method,
                totalLots);
        
        return header + memorial;
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

    /**
     * Constrói o prompt para a IA
     */
    private String buildPrompt(DxfCompareResultDTO r, MemorialStandardDTO standard, PropertyDTO property,
                              List<SimplePoint> extractedPoints, Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
                              List<String> streetNames, Map<String, List<String>> confrontations,
                              Map<String, Double> individualAreas) {

        StringBuilder promptBuilder = new StringBuilder();
        int estimatedLots = safeEstimateLotCount(r);
        Double areaReferencia = resolveReferenceArea(property, individualAreas, estimatedLots);
        Double perimetroReferencia = resolveReferencePerimeter(property, estimatedLots);

        promptBuilder.append("GERE ").append(estimatedLots).append(" LOTES COMPLETOS (1 a ").append(estimatedLots).append("). ");
        promptBuilder.append("Descreva cada lote individualmente com base nos dados reais da propriedade e do DXF. ");
        promptBuilder.append("NAO use '...' ou 'demais lotes'. ");
        promptBuilder.append("NAO invente area, perimetro, testada, profundidade, confrontantes ou coordenadas quando esses dados nao puderem ser inferidos com seguranca.\n\n");

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

        promptBuilder.append("\n=== FORMATO OBRIGATORIO PARA CADA LOTE ===\n");
        promptBuilder.append("LOTE X:\n");
        promptBuilder.append("Um imovel urbano, localizado na [RUA], bairro [BAIRRO], [CIDADE]/[ESTADO],\n");
        promptBuilder.append("possuindo formato poligonal conforme vertices e coordenadas efetivamente identificados no levantamento,\n");
        promptBuilder.append("com perimetro, area e confrontacoes compativeis com os dados tecnicos disponiveis.\n");
        promptBuilder.append("AO NORTE: informar medida, sentido e confrontante com base no levantamento.\n");
        promptBuilder.append("AO SUL: informar medida, sentido e confrontante com base no levantamento.\n");
        promptBuilder.append("AO LESTE: informar medida, sentido e confrontante com base no levantamento.\n");
        promptBuilder.append("AO OESTE: informar medida, sentido e confrontante com base no levantamento.\n");
        promptBuilder.append("----------------------------------------------------------------------\n");
        promptBuilder.append("USE EXATAMENTE ESTE FORMATO. Nao replique um lote padrao sem base tecnica.\n");

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
            log.error("❌ ERRO CRÍTICO: Nenhuma coordenada encontrada no DXF!");
            promptBuilder.append("\nCOORDENADAS: nao foi possivel identificar referencia georreferenciada confiavel no arquivo DXF.\n");
            promptBuilder.append("Quando necessario, registre a necessidade de conferencia topografica complementar.\n");
        }

        promptBuilder.append("\nGere memorial completo com ").append(estimatedLots).append(" lotes usando dados da propriedade.\n");

        String prompt = promptBuilder.toString();
        return prompt;
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
            boolean found = memorial.contains("LOTE " + i) || 
                           memorial.contains("Lote " + i) ||
                           memorial.contains("lote " + i) ||
                           memorial.contains("LOTE Nº " + i) ||
                           memorial.contains("Lote nº " + i);
            
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
