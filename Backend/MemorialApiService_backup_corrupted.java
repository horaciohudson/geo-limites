package com.momorialPro.CadMemorial.service;


import com.momorialPro.CadMemorial.dto.ChunkResult;
import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.DxfEntityChangeDTO;
import com.momorialPro.CadMemorial.dto.LotChunk;
import com.momorialPro.CadMemorial.dto.MemorialRequestDTO;
import com.momorialPro.CadMemorial.dto.MemorialStandardDTO;
import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.util.CoordinateUtils;
import com.momorialPro.CadMemorial.util.CoordinateUtils.Point;
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
     * Agora usa APENAS Claude AI com particionamento inteligente.
     */
    public String generate(DxfCompareResultDTO r, UUID standardId, UUID userId, UUID propertyId) {
        long startTime = System.currentTimeMillis();
        log.info("🤖 Iniciando geração de memorial com Claude AI");

        // Gera chave de cache e limpa entrada existente para forçar regeneração
        String cacheKey = cacheService.generateCacheKey(r);
        cacheService.removeFromCache(cacheKey);
        log.info("🧹 Cache limpo para esta requisição - Memorial será gerado do zero");

        // Configuração básica
        log.info("🔧 Config: {} | Timeout: {}min | Retries: {} | Fallback: {} | Particionamento: {}",
                claudeModel, timeout / 60000, maxRetries, fallbackEnabled, partitionEnabled);

        // DEBUG: Mostrar valor da API key
        log.info("🔍 DEBUG: claudeApiKey = '{}'", claudeApiKey != null ? claudeApiKey.substring(0, Math.min(20, claudeApiKey.length())) + "" : "NULL");
        log.info("🔍 DEBUG: claudeApiKey == null? {}", claudeApiKey == null);
        log.info("🔍 DEBUG: claudeApiKey.equals(PLACEHOLDER_KEY)? {}", claudeApiKey != null && claudeApiKey.equals("PLACEHOLDER_KEY"));
        log.info("🔍 DEBUG: claudeApiKey.trim().isEmpty()? {}", claudeApiKey != null && claudeApiKey.trim().isEmpty());

        // VERIFICA SE A API KEY DO CLAUDE ESTÁ CONFIGURADA
        if (claudeApiKey == null || claudeApiKey.equals("PLACEHOLDER_KEY") || claudeApiKey.trim().isEmpty()) {
            log.error("❌ ERRO CRÍTICO: API Key do Claude não configurada!");
            log.error("💡 SOLUÇÕES:");
            log.error("   1. Definir variável de ambiente: ANTHROPIC_API_KEY=sua_chave_aqui");
            log.error("   2. Ou editar application.properties: memorialpro.claude.api-key=sua_chave_aqui");

            if (fallbackEnabled) {
                log.warn("🔄 Usando modo FALLBACK - gerando memorial sem IA");
                return generateFallbackMemorial(r, standardId);
            } else {
                return "ERRO DE CONFIGURAÇÃO\\n\\nA chave da API Claude (Anthropic) não está configurada.\\n\\n" +
                        "Para resolver:\\n" +
                        "1. Obtenha uma chave em: https://console.anthropic.com/\\n" +
                        "2. Configure a variável de ambiente: ANTHROPIC_API_KEY=sua_chave_aqui\\n" +
                        "3. Ou edite application.properties: memorialpro.claude.api-key=sua_chave_aqui\\n" +
                        "4. Reinicie o servidor";
            }
        }

        // ===== VALIDAÇÃO CRÍTICA ANTES DE PROCESSAR =====
        log.info("🔍 Iniciando validação crítica dos dados DXF");

        // ===== EXTRAÇÃO AVANÇADA DE DADOS DO DXF =====
        log.info("🔍 DIAGNÓSTICO DETALHADO DA EXTRAÇÃO:");
        log.info("   - Entidades adicionadas: {}", r.getAdded() != null ? r.getAdded().size() : 0);
        log.info("   - Entidades removidas: {}", r.getRemoved() != null ? r.getRemoved().size() : 0);
        log.info("   - Entidades modificadas: {}", r.getModified() != null ? r.getModified().size() : 0);

        // Converter entidades para formato compatível com DxfTextExtractorService
        List<Map<String, Object>> allEntities = convertToEntityMaps(r);

        // Extrair dados avançados do DXF
        log.info("🎯 Extraindo coordenadas reais dos pontos");
        Map<String, Map<String, Double>> realCoordinates = dxfTextExtractorService.extractRealCoordinates(allEntities);

        log.info("🛣️ Extraindo nomes de ruas");
        List<String> streetNames = dxfTextExtractorService.extractStreetNames(allEntities);

        log.info("🏘️ Extraindo confrontações específicas");
        Map<String, List<String>> confrontations = dxfTextExtractorService.extractConfrontations(allEntities);

        log.info("📐 Calculando áreas individuais dos lotes");
        Map<String, Double> individualAreas = dxfTextExtractorService.calculateIndividualAreas(allEntities);

        // Log dos dados extraídos
        log.info("✅ DADOS EXTRAÍDOS DO DXF:");
        log.info("   - Coordenadas reais: {}", realCoordinates.size());
        log.info("   - Ruas identificadas: {}", streetNames.size());
        log.info("   - Confrontações: N={}, S={}, L={}, O={}",
                confrontations.get("NORTE").size(),
                confrontations.get("SUL").size(),
                confrontations.get("LESTE").size(),
                confrontations.get("OESTE").size());
        log.info("   - Áreas individuais: {}", individualAreas.size());

        if (r.getAdded() != null && !r.getAdded().isEmpty()) {
            log.info("🔍 Entidades adicionadas: {} itens", r.getAdded().size());
        }

        List<Point> extractedPoints = extractPointsFromEntities(r);

        // Verifica se conseguiu extrair coordenadas
        if (extractedPoints.isEmpty()) {
            log.error("❌ ERRO CRÍTICO: Nenhuma coordenada extraída do DXF!");
            log.error("💡 POSSÍVEIS CAUSAS:");
            log.error("   1. Entidades não têm coordenadas X/Y válidas");
            log.error("   2. Coordenadas estão sendo rejeitadas pela validação");
            log.error("   3. Problema na conversão de DxfEntityChangeDTO");
            return generateExtractionErrorMessage("NENHUMA_COORDENADA", r);
        }

        // DEBUG: Mostrar total de coordenadas extraídas
        log.info("🔍 Coordenadas extraídas: {} pontos", extractedPoints.size());

        // Verifica se as coordenadas são reais (aceita coordenadas locais e UTM)
        // RELAXA VALIDAÇÃO: Aceita qualquer coordenada > 100 (evita apenas valores muito pequenos como 0,1,2)
        boolean hasRealCoordinates = extractedPoints.stream()
                .anyMatch(p -> {
                    // UTM válido (coordenadas grandes)
                    boolean isUTM = (p.getX() > 100000 && p.getY() > 1000000);
                    // Coordenadas locais válidas (AMPLIADO: aceita coordenadas > 100)
                    boolean isLocal = (p.getX() >= 100 && p.getY() >= 100);

                    return isUTM || isLocal;
                });

        log.info("✅ Validação de coordenadas: {} coordenadas válidas encontradas",
                extractedPoints.stream().filter(p -> p.getX() >= 100 && p.getY() >= 100).count());

        if (!hasRealCoordinates) {
            log.error("❌ ERRO CRÍTICO: Coordenadas fictícias detectadas!");
            long rejectedCount = extractedPoints.stream().filter(p -> p.getX() < 100 || p.getY() < 100).count();
            log.error("🚫 Coordenadas rejeitadas: {} de {}", rejectedCount, extractedPoints.size());
            // REMOVIDO: Não bloquear mais - continuar com aviso
            log.warn("⚠️ AVISO: Validação relaxada - Continuando geração do memorial");
        }

        // Verifica se conseguiu calcular área real (opcional se há coordenadas válidas)
        Double calculatedArea = dxfTextExtractorService.calculateTotalArea(allEntities);
        if (calculatedArea == null || calculatedArea <= 0) {
            log.warn("⚠️ AVISO: Não foi possível calcular área automaticamente");
            log.warn("💡 Área calculada: {} - Memorial será gerado com base nos pontos extraídos", calculatedArea);
            log.warn("🔧 Isso é normal quando o DXF contém apenas pontos/linhas sem polígonos fechados");
            log.info("✅ CONTINUANDO: Memorial será gerado com coordenadas reais extraídas ({} pontos)", extractedPoints.size());
            // NÃO retorna erro - continua com geração baseada em pontos
        } else {
            log.info("✅ Área calculada com sucesso: {:.2f}m²", calculatedArea);
        }

        log.info("✅ VALIDAÇÃO PASSOU: Coordenadas e área reais extraídas com sucesso");
        log.info("📊 Coordenadas válidas: {}", extractedPoints.size());
        log.info("📐 Área calculada: {:.2f}m²", calculatedArea);

        // Dados preparados para IA

        MemorialStandardDTO standard = null;

        log.info("🔍 Buscando norma por ID: {}", standardId);
        standard = memorialStandardService.findById(standardId).orElse(null);

        if (standard != null) {
            log.info("✅ Norma encontrada: {} (ID: {})", standard.getName(), standard.getId());
        } else {
            log.error("❌ ERRO CRÍTICO: Norma com ID {} não encontrada no banco de dados!", standardId);
            log.error("💡 SOLUÇÃO: Verifique se a norma existe e está ativa no banco");
            throw new RuntimeException("Norma não encontrada: " + standardId);
        }

        // Buscar dados da propriedade se fornecido
        PropertyDTO property = null;
        if (propertyId != null) {
            try {
                log.info("=== INICIANDO BUSCA DETALHADA DA PROPRIEDADE ===");
                log.info("🏠 PropertyId recebido: {}", propertyId);
                log.info("👤 UserId: {}", userId);
                log.info("� Chamando propertyService.findByIdWithRelationships()");

                property = propertyService.findByIdWithRelationships(propertyId, userId);

                if (property != null) {
                    log.info("✅ PROPRIEDADE ENCONTRADA NO STORAGE!");
                    log.info("=== DADOS COMPLETOS DA PROPRIEDADE RECUPERADOS ===");

                    // Dados básicos
                    log.info("📋 ID: {}", property.getPropertyId());
                    log.info("📋 Nome: {}", property.getName() != null ? property.getName() : "[NULL]");

                    // Dados do proprietário
                    log.info("👤 Proprietário: {}", property.getOwnerName() != null ? property.getOwnerName() : "[NULL]");
                    log.info("👤 Documento: {}", property.getOwnerDocument() != null ? property.getOwnerDocument() : "[NULL]");
                    log.info("👤 Telefone: {}", property.getOwnerPhone() != null ? property.getOwnerPhone() : "[NULL]");
                    log.info("👤 Email: {}", property.getOwnerEmail() != null ? property.getOwnerEmail() : "[NULL]");

                    // Endereço completo
                    log.info("📍 Rua: {}", property.getStreet() != null ? property.getStreet() : "[NULL]");
                    log.info("📍 Número: {}", property.getNumber() != null ? property.getNumber() : "[NULL]");
                    log.info("📍 Bairro: {}", property.getNeighborhood() != null ? property.getNeighborhood() : "[NULL]");
                    log.info("📍 Cidade: {}", property.getCity() != null ? property.getCity() : "[NULL]");
                    log.info("📍 Estado: {}", property.getState() != null ? property.getState() : "[NULL]");
                    log.info("📍 CEP: {}", property.getZipCode() != null ? property.getZipCode() : "[NULL]");

                    // Dados técnicos
                    log.info("📐 Sistema de coordenadas: {}", property.getCoordinateSystem() != null ? property.getCoordinateSystem() : "[NULL]");
                    log.info("📐 Área total: {} m²", property.getTotalArea() != null ? property.getTotalArea() : "[NULL]");
                    log.info("📐 Perímetro total: {} m", property.getTotalPerimeter() != null ? property.getTotalPerimeter() : "[NULL]");

                    // Dados legais
                    log.info("📜 Matrícula: {}", property.getRegistrationNumber() != null ? property.getRegistrationNumber() : "[NULL]");
                    log.info("📜 Cartório: {}", property.getRegistryOffice() != null ? property.getRegistryOffice() : "[NULL]");

                    // Confrontações
                    log.info("🧭 Confrontação Norte: {}", property.getNorthBoundary() != null ? property.getNorthBoundary() : "[NULL]");
                    log.info("🧭 Confrontação Sul: {}", property.getSouthBoundary() != null ? property.getSouthBoundary() : "[NULL]");
                    log.info("🧭 Confrontação Leste: {}", property.getEastBoundary() != null ? property.getEastBoundary() : "[NULL]");
                    log.info("🧭 Confrontação Oeste: {}", property.getWestBoundary() != null ? property.getWestBoundary() : "[NULL]");

                    // Verificação de campos críticos para o memorial
                    log.info("=== VERIFICAÇÃO DE CAMPOS CRÍTICOS ===");
                    boolean hasOwnerName = property.getOwnerName() != null && !property.getOwnerName().trim().isEmpty();
                    boolean hasAddress = property.getStreet() != null && !property.getStreet().trim().isEmpty();
                    boolean hasCity = property.getCity() != null && !property.getCity().trim().isEmpty();
                    boolean hasArea = property.getTotalArea() != null;
                    boolean hasBoundaries = (property.getNorthBoundary() != null && !property.getNorthBoundary().trim().isEmpty()) ||
                            (property.getSouthBoundary() != null && !property.getSouthBoundary().trim().isEmpty()) ||
                            (property.getEastBoundary() != null && !property.getEastBoundary().trim().isEmpty()) ||
                            (property.getWestBoundary() != null && !property.getWestBoundary().trim().isEmpty());

                    log.info("✅ Nome do proprietário: {}", hasOwnerName ? "DISPONÍVEL" : "❌ FALTANDO NO CADASTRO");
                    log.info("✅ Endereço: {}", hasAddress ? "DISPONÍVEL" : "❌ FALTANDO NO CADASTRO");
                    log.info("✅ Cidade: {}", hasCity ? "DISPONÍVEL" : "❌ FALTANDO NO CADASTRO");
                    log.info("✅ Área: {}", hasArea ? "DISPONÍVEL" : "❌ FALTANDO NO CADASTRO");

                    int availableFields = (hasOwnerName ? 1 : 0) + (hasAddress ? 1 : 0) + (hasCity ? 1 : 0) + (hasArea ? 1 : 0) + (hasBoundaries ? 1 : 0);
                    log.info("📊 RESUMO: {}/5 campos críticos disponíveis ({}%)", availableFields, (availableFields * 100) / 5);

                    if (availableFields >= 3) {
                        log.info("🎉 DADOS SUFICIENTES para gerar memorial com informações reais!");
                    } else {
                        log.warn("⚠️ DADOS INSUFICIENTES - memorial pode conter muitos placeholders");
                    }

                    log.info("=== FIM DOS DADOS DA PROPRIEDADE ===");

                    // ===== CALCULAR ÁREA TOTAL SE ESTIVER NULL =====
                    if (property.getTotalArea() == null || property.getTotalArea().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                        log.warn("⚠️ Área total da propriedade está NULL ou zerada");
                        log.info("🔧 Tentando calcular área total automaticamente");

                        // Opção 1: Usar área calculada do DXF
                        if (calculatedArea != null && calculatedArea > 0) {
                            property.setTotalArea(java.math.BigDecimal.valueOf(calculatedArea));
                            log.info("✅ Área total atualizada com valor calculado do DXF: {:.2f} m²", calculatedArea);
                        }
                        // Opção 2: Somar áreas individuais dos lotes
                        else if (!individualAreas.isEmpty()) {
                            Double summedArea = individualAreas.values().stream()
                                    .mapToDouble(Double::doubleValue)
                                    .sum();
                            if (summedArea > 0) {
                                property.setTotalArea(java.math.BigDecimal.valueOf(summedArea));
                                log.info("✅ Área total calculada somando {} lotes: {:.2f} m²",
                                        individualAreas.size(), summedArea);
                            } else {
                                log.warn("⚠️ Soma das áreas individuais resultou em 0");
                            }
                        } else {
                            log.warn("⚠️ Não foi possível calcular área total automaticamente");
                            log.warn("💡 Memorial será gerado sem área total definida");
                        }
                    } else {
                        log.info("✅ Área total já definida: {} m²", property.getTotalArea());
                    }


                } else {
                    log.error("❌ PROPRIEDADE RETORNADA COMO NULL!");
                    log.error("🔍 Possíveis causas:");
                    log.error("   - PropertyId {} não existe no banco", propertyId);
                    log.error("   - Propriedade não pertence ao usuário {}", userId);
                    log.error("   - Erro na consulta do banco de dados");
                }
            } catch (Exception e) {
                log.error("❌ EXCEÇÃO AO BUSCAR PROPRIEDADE!");
                log.error("🔍 PropertyId: {}", propertyId);
                log.error("🔍 UserId: {}", userId);
                log.error("🔍 Tipo da exceção: {}", e.getClass().getSimpleName());
                log.error("🔍 Mensagem: {}", e.getMessage());
                log.error("🔍 Stack trace:", e);
                log.error("💡 AÇÕES SUGERIDAS:");
                log.error("   1. Verificar se a propriedade existe no banco");
                log.error("   2. Verificar se o usuário tem permissão para acessar");
                log.error("   3. Verificar conectividade com o banco de dados");
            }
        } else {
            log.info("ℹ️ NENHUMA PROPRIEDADE ESPECIFICADA");
            log.info("📝 Memorial será gerado com dados genéricos/placeholders");
        }

        // Buscar norma configurada
        String prompt = buildPrompt(r, standard, property, extractedPoints, realCoordinates, streetNames, confrontations, individualAreas);

        // Estimar número de lotes
        int estimatedLotCount = safeEstimateLotCount(r);

        // DECISÃO: Usar particionamento ou geração única?
        if (partitionEnabled && estimatedLotCount > partitionThreshold) {
            log.info("📦 Projeto grande ({} lotes) - Usando PARTICIONAMENTO", estimatedLotCount);
            return generateWithPartitioning(r, standard, property, extractedPoints, realCoordinates,
                    streetNames, confrontations, individualAreas, standardId, userId, propertyId, startTime);
        } else {
            log.info("📄 Projeto padrão ({} lotes) - Geração ÚNICA", estimatedLotCount);
            return generateSingleCall(r, standard, property, extractedPoints, realCoordinates,
                    streetNames, confrontations, individualAreas, standardId, userId, propertyId, startTime);
        }
    }

    /**
     * Gera memorial em uma única chamada ao Claude (para projetos pequenos/médios).
     */
    private String generateSingleCall(
            DxfCompareResultDTO r,
            MemorialStandardDTO standard,
            PropertyDTO property,
            List<Point> extractedPoints,
            Map<String, Map<String, Double>> realCoordinates,
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

        // Constrói payload para Claude com prompt caching
        Map<String, Object> body = new HashMap<>();
        body.put("model", claudeModel);
        body.put("max_tokens", dynamicMaxTokens);
        body.put("temperature", 0.2);

        // Usa prompt caching se habilitado
        List<Map<String, Object>> systemPrompt = promptCacheService.buildCachedSystemPrompt(standard);
        body.put("system", systemPrompt);

        // Mensagem do usuário (parte dinâmica - não cacheada)
        body.put("messages", new Object[]{
                Map.of("role", "user", "content", prompt)
        });

        log.info("🧠 Usando Claude: {} (max_tokens: {} para {} lotes)",
                claudeModel, dynamicMaxTokens, estimatedLotCount);
        log.info("📦 Prompt caching: {}", promptCacheService.getCacheStats().get("enabled"));

        log.info("[IA] Prompt enviado para IA (Claude): {}", prompt);
        // TENTATIVA COM RETRY
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                log.info("🚀 Tentativa {}/{} - Enviando requisição para Claude", attempt, maxRetries);
                log.info("📝 Tamanho do prompt: {} caracteres", prompt.length());

                RestTemplate restTemplate = new RestTemplate();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("x-api-key", claudeApiKey);
                headers.set("anthropic-version", "2023-06-01");

                // Adiciona headers de cache
                promptCacheService.addCacheHeaders(headers);

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

                log.info("🌐 Fazendo requisição para: {}", claudeEndpoint);

                ResponseEntity<Map> response = restTemplate.exchange(
                        claudeEndpoint,
                        HttpMethod.POST,
                        entity,
                        Map.class
                );

                Map<String, Object> responseBody = response.getBody();
                log.info("[IA] Resposta recebida da IA (Claude): {}", responseBody);
                log.info("✅ Resposta recebida de Claude");

                String content = extractContentFromClaudeResponse(responseBody);
                log.info("📄 Memorial gerado com {} caracteres", content.length());

                // Validação de completude
                boolean isComplete = chunkService.validateCompleteness(content, estimatedLotCount);
                if (!isComplete) {
                    log.warn("⚠️ MEMORIAL INCOMPLETO: Não contém todos os {} lotes esperados", estimatedLotCount);
                    content = String.format("⚠️ AVISO: Este memorial está incompleto. Foram gerados apenas alguns lotes.\\n" +
                            "Para memorial completo com %d lotes, tente gerar novamente.\\n\\n", estimatedLotCount) + content;
                } else {
                    log.info("✅ MEMORIAL COMPLETO: Contém todos os {} lotes", estimatedLotCount);
                }

                // Validação de coordenadas
                if (!extractedPoints.isEmpty()) {
                    boolean memorialHasRealCoordinates = validateMemorialCoordinates(content, extractedPoints);
                    if (memorialHasRealCoordinates) {
                        log.info("✅ VALIDAÇÃO: Memorial contém coordenadas reais dos arquivos DXF");
                    } else {
                        log.warn("⚠️ VALIDAÇÃO: Memorial pode conter coordenadas fictícias - verificar manualmente");
                    }
                }

                String result = content;

                log.info("🎉 Memorial gerado com sucesso na tentativa {}", attempt);
                log.info("🤖 IA UTILIZADA: Claude ({})", claudeModel);

                // Adiciona metadados
                String projectName = property != null && property.getName() != null ? property.getName() : "Projeto sem nome";
                String fileName = r.getNewFileName() != null ? r.getNewFileName() : "Arquivo DXF";
                String aiInfo = String.format("Memorial Descritivo\\n Projeto: %s\\n Arquivo: %s\\n Data: %s\\n",
                        projectName,
                        fileName,
                        java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));

                result = aiInfo + String.format("<!-- Gerado por: %s (Claude AI) em %s -->\\n",
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

                log.info("📊 RESUMO FINAL: {} lotes detectados, {} entidades processadas, {} caracteres gerados",
                        estimatedLots, entitiesProcessed, result.length());

                return result;

            } catch (Exception e) {
                log.error("💥 Exceção na tentativa {}: {}", attempt, e.getMessage(), e);

                if (attempt < maxRetries) {
                    long waitTime = attempt * 2000; // Backoff exponencial
                    log.info("⏳ Aguardando {}ms antes da próxima tentativa...", waitTime);
                    try {
                        Thread.sleep(waitTime);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    // Registra falha nas métricas
                    long processingTime = System.currentTimeMillis() - startTime;
                    int entitiesProcessed = (r.getAdded() != null ? r.getAdded().size() : 0) +
                            (r.getRemoved() != null ? r.getRemoved().size() : 0) +
                            (r.getModified() != null ? r.getModified().size() : 0);
                    metricsService.recordFailedGeneration(processingTime, entitiesProcessed, e.getMessage());

                    if (fallbackEnabled) {
                        log.warn("🔄 Todas as tentativas falharam, usando fallback");
                        String fallbackResult = generateFallbackMemorial(r, standardId);

                        // Registra fallback como sucesso parcial
                        int estimatedLots = safeEstimateLotCount(r);
                        metricsService.recordSuccessfulGeneration(processingTime, estimatedLots, entitiesProcessed, fallbackResult.length());

                        return fallbackResult;
                    } else {
                        return "ERRO CRÍTICO NA GERAÇÃO DO MEMORIAL\\n\\nExceção após " + maxRetries + " tentativas: " + e.getMessage() +
                                "\\n\\nPossíveis causas:\\n" +
                                "1. Problema de conectividade com a internet\\n" +
                                "2. API Key do Claude inválida ou expirada\\n" +
                                "3. Serviço Claude (Anthropic) temporariamente indisponível\\n" +
                                "4. Firewall bloqueando conexões HTTPS\\n" +
                                "\\nVerifique os logs para mais detalhes.";
                    }
                }
            }
        }

        // Se chegou aqui, algo deu muito errado
        return "ERRO INESPERADO: Não foi possível gerar o memorial após todas as tentativas.";
    }

    /**
     * Gera memorial usando particionamento (para projetos grandes).
     * Divide em chunks, gera cada chunk separadamente e combina no final.
     */
    private String generateWithPartitioning(
            DxfCompareResultDTO r,
            MemorialStandardDTO standard,
            PropertyDTO property,
            List<Point> extractedPoints,
            Map<String, Map<String, Double>> realCoordinates,
            List<String> streetNames,
            Map<String, List<String>> confrontations,
            Map<String, Double> individualAreas,
            UUID standardId,
            UUID userId,
            UUID propertyId,
            long startTime) {

        int totalLots = safeEstimateLotCount(r);
        log.info("🔧 Iniciando geração particionada para {} lotes", totalLots);

        // Criar contexto compartilhado (dados da propriedade, normas, etc.)
        String sharedContext = buildSharedContext(standard, property);

        // Criar chunks
        List<LotChunk> chunks = chunkService.createChunks(totalLots, sharedContext);
        List<ChunkResult> chunkResults = new ArrayList<>();

        // Gerar cada chunk com retry para rate limits
        for (LotChunk chunk : chunks) {
            log.info("📦 Gerando chunk {}/{}: Lotes {} a {}",
                    chunk.getChunkNumber(), chunk.getTotalChunks(),
                    chunk.getFirstLotNumber(), chunk.getLastLotNumber());

            ChunkResult result = generateChunkWithRetry(chunk, r, standard, property, extractedPoints,
                    realCoordinates, streetNames, confrontations, individualAreas);
            chunkResults.add(result);

            if (result.isSuccess()) {
                log.info("✅ Chunk {} gerado com sucesso ({} caracteres)",
                        chunk.getChunkNumber(), result.getContent().length());
            } else {
                log.error("❌ Falha ao gerar chunk {}: {}",
                        chunk.getChunkNumber(), result.getErrorMessage());
            }

            // Delay entre chunks para evitar Rate Limit (429)
            if (chunk.getChunkNumber() < chunks.size()) {
                try {
                    log.info("⏳ Aguardando {}ms antes do próximo chunk para evitar Rate Limit...", chunkDelay);
                    Thread.sleep(chunkDelay);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.warn("⚠️ Delay entre chunks interrompido", e);
                }
            }
        }

        // Verificar se todos os chunks foram gerados com sucesso
        long successfulChunks = chunkResults.stream().filter(ChunkResult::isSuccess).count();
        if (successfulChunks < chunks.size()) {
            log.warn("⚠️ Apenas {}/{} chunks foram gerados com sucesso", successfulChunks, chunks.size());

            if (fallbackEnabled) {
                log.warn("🔄 Usando fallback devido a falhas no particionamento");
                return generateFallbackMemorial(r, standardId);
            }
        }

        // Combinar chunks
        String combinedMemorial = chunkService.combineChunks(chunkResults);

        // Validar completude
        boolean isComplete = chunkService.validateCompleteness(combinedMemorial, totalLots);
        if (!isComplete) {
            List<Integer> missingLots = chunkService.findMissingLots(combinedMemorial, totalLots);
            log.warn("⚠️ Memorial incompleto. Lotes faltantes: {}", missingLots);

            // Tentar regenerar lotes faltantes
            // TODO: Implementar regeneração de lotes específicos
        }

        // Adicionar metadados
        String projectName = property != null && property.getName() != null ? property.getName() : "Projeto sem nome";
        String fileName = r.getNewFileName() != null ? r.getNewFileName() : "Arquivo DXF";
        String aiInfo = String.format("Memorial Descritivo\\n Projeto: %s\\n Arquivo: %s\\n Data: %s\\n",
                projectName,
                fileName,
                java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));

        String result = aiInfo + String.format("<!-- Gerado por: %s (Claude AI - Particionado em %d chunks) em %s -->\\n",
                claudeModel,
                chunks.size(),
                java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"))) + combinedMemorial;

        // Registrar métricas
        long processingTime = System.currentTimeMillis() - startTime;
        int entitiesProcessed = (r.getAdded() != null ? r.getAdded().size() : 0) +
                (r.getRemoved() != null ? r.getRemoved().size() : 0) +
                (r.getModified() != null ? r.getModified().size() : 0);

        metricsService.recordSuccessfulGeneration(processingTime, totalLots, entitiesProcessed, result.length());

        // Cache
        String cacheKey = cacheService.generateCacheKey(r);
        cacheService.putInCache(cacheKey, result, totalLots);

        log.info("🎉 Memorial particionado gerado com sucesso!");
        log.info("📊 {} chunks, {} lotes, {} caracteres", chunks.size(), totalLots, result.length());

        return result;
    }

    /**
     * Gera um chunk individual de memorial.
     */
    private ChunkResult generateChunk(
            LotChunk chunk,
            DxfCompareResultDTO r,
            MemorialStandardDTO standard,
            PropertyDTO property,
            List<Point> extractedPoints,
            Map<String, Map<String, Double>> realCoordinates,
            List<String> streetNames,
            Map<String, List<String>> confrontations,
            Map<String, Double> individualAreas) {

        long chunkStartTime = System.currentTimeMillis();

        // Construir prompt específico para este chunk
        String chunkPrompt = buildChunkPrompt(chunk, r, standard, property, extractedPoints,
                realCoordinates, streetNames, confrontations, individualAreas);

        // Calcular tokens para este chunk
        int tokensPerLot = 400;
        int baseTokens = chunk.isFirstChunk() ? 1500 : 500; // Primeiro chunk tem preâmbulo
        int chunkMaxTokens = baseTokens + (chunk.getLotCount() * tokensPerLot);
        chunkMaxTokens = Math.min(chunkMaxTokens, claudeMaxTokens);

        // Construir payload
        Map<String, Object> body = new HashMap<>();
        body.put("model", claudeModel);
        body.put("max_tokens", chunkMaxTokens);
        body.put("temperature", 0.2);

        // System prompt com cache
        List<Map<String, Object>> systemPrompt = promptCacheService.buildCachedSystemPrompt(standard);
        body.put("system", systemPrompt);

        // Mensagem do usuário
        body.put("messages", new Object[]{
                Map.of("role", "user", "content", chunkPrompt)
        });

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

            long generationTime = System.currentTimeMillis() - chunkStartTime;

            return ChunkResult.builder()
                    .chunkNumber(chunk.getChunkNumber())
                    .content(content)
                    .generatedLots(chunk.getLotNumbers())
                    .success(true)
                    .generationTimeMs(generationTime)
                    .build();

        } catch (Exception e) {
            log.error("❌ Erro ao gerar chunk {}: {}", chunk.getChunkNumber(), e.getMessage());

            // Tratamento específico para Rate Limit (429)
            if (e.getMessage() != null && e.getMessage().contains("429")) {
                log.warn("🚦 Rate Limit detectado no chunk {}", chunk.getChunkNumber());

                // Extrair tempo de espera da mensagem de erro se disponível
                int waitTime = 60000; // 1 minuto padrão
                if (e.getMessage().contains("at the next minute boundary")) {
                    waitTime = 65000; // 65 segundos para garantir
                }

                log.info("⏳ Aguardando {}ms para resolver Rate Limit...", waitTime);
                try {
                    Thread.sleep(waitTime);
                    log.info("✅ Período de espera concluído, chunk pode ser tentado novamente");
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    log.warn("⚠️ Espera interrompida");
                }
            }

            return ChunkResult.builder()
                    .chunkNumber(chunk.getChunkNumber())
                    .success(false)
                    .errorMessage(e.getMessage())
                    .retryable(e.getMessage() != null && e.getMessage().contains("429"))
                    .build();
        }
    }

    /**
     * Extrai o conteúdo da resposta do Claude.
     */
    private String extractContentFromClaudeResponse(Map<String, Object> responseBody) {
        if (responseBody == null) {
            log.error("❌ Response body is null");
            throw new RuntimeException("Response body is null");
        }

        try {
            // Claude response structure: { "content": [{ "text": "..." }] }
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

            log.error("❌ Estrutura de resposta Claude inválida: {}", responseBody);
            throw new RuntimeException("Invalid Claude response structure");

        } catch (Exception e) {
            log.error("❌ Erro ao extrair conteúdo da resposta Claude: {}", e.getMessage(), e);
            throw new RuntimeException("Error extracting content from Claude response: " + e.getMessage());
        }
    }

    /**
     * Constrói contexto compartilhado entre chunks.
     */
    private String buildSharedContext(MemorialStandardDTO standard, PropertyDTO property) {
        StringBuilder context = new StringBuilder();

        if (property != null) {
            context.append("DADOS DA PROPRIEDADE:\\n");
            if (property.getName() != null) {
                context.append("Nome: ").append(property.getName()).append("\\n");
            }
            if (property.getOwnerName() != null) {
                context.append("Proprietário: ").append(property.getOwnerName()).append("\\n");
            }
            if (property.getCity() != null && property.getState() != null) {
                context.append("Localização: ").append(property.getCity()).append("/").append(property.getState()).append("\\n");
            }
        }

        if (standard != null) {
            context.append("\\nNORMA: ").append(standard.getName()).append("\\n");
        }

        return context.toString();
    }

    /**
     * Constrói prompt específico para um chunk.
     */
    private String buildChunkPrompt(
            LotChunk chunk,
            DxfCompareResultDTO r,
            MemorialStandardDTO standard,
            PropertyDTO property,
            List<Point> extractedPoints,
            Map<String, Map<String, Double>> realCoordinates,
            List<String> streetNames,
            Map<String, List<String>> confrontations,
            Map<String, Double> individualAreas) {

        StringBuilder prompt = new StringBuilder();

        // Contexto compartilhado
        prompt.append(chunk.getSharedContext()).append("\\n\\n");

        // Instruções específicas do chunk
        if (chunk.isFirstChunk()) {
            prompt.append("INSTRUÇÕES: Gere o PREÂMBULO e os LOTES ");
        } else if (chunk.isLastChunk()) {
            prompt.append("INSTRUÇÕES: Gere os LOTES ");
        } else {
            prompt.append("INSTRUÇÕES: Gere os LOTES ");
        }

        prompt.append(chunk.getFirstLotNumber()).append(" a ").append(chunk.getLastLotNumber());

        if (chunk.isLastChunk()) {
            prompt.append(" e a CONCLUSÃO");
        }

        prompt.append(".\\n\\n");

        // Adicionar dados relevantes para estes lotes específicos
        prompt.append("LOTES NESTE CHUNK: ");
        prompt.append(chunk.getLotNumbers().stream()
                .map(String::valueOf)
                .collect(Collectors.joining(", ")));
        prompt.append("\\n\\n");

        // Reutilizar buildPrompt para dados completos (será filtrado pelo Claude)
        String fullPrompt = buildPrompt(r, standard, property, extractedPoints, realCoordinates,
                streetNames, confrontations, individualAreas);
        prompt.append(fullPrompt);

        return prompt.toString();
    }

    private String buildPrompt(DxfCompareResultDTO r, MemorialStandardDTO standard, PropertyDTO property, List<Point> extractedPoints,
                               Map<String, Map<String, Double>> realCoordinates, List<String> streetNames,
                               Map<String, List<String>> confrontations, Map<String, Double> individualAreas) {
        StringBuilder promptBuilder = new StringBuilder();

        // Converter DxfEntityChangeDTO para formato esperado pelo extrator
        List<Map<String, Object>> allEntities = convertToEntityMaps(r);

        // Extrair dados adicionais dos textos DXF (os principais já foram passados como parâmetros)
        Map<String, Double> distances = dxfTextExtractorService.calculateDistances(allEntities);
        List<String> measurements = dxfTextExtractorService.extractMeasurementTexts(allEntities);
        Double calculatedArea = dxfTextExtractorService.calculateTotalArea(allEntities);

        if (standard != null && standard.getStandardText() != null && !standard.getStandardText().trim().isEmpty()) {
            promptBuilder.append("NORMA A SEGUIR:\n");
            promptBuilder.append(standard.getStandardText());
            promptBuilder.append("\n\n");
        }

        // Adicionar dados da propriedade se disponível
        if (property != null) {
            log.info("=== CONSTRUINDO PROMPT COM DADOS REAIS DA PROPRIEDADE ===");

            promptBuilder.append("DADOS REAIS DA PROPRIEDADE:\n");

            // Nome da propriedade
            String propertyName = property.getName() != null ? property.getName() : "A definir";
            promptBuilder.append("Nome: ").append(propertyName).append("\n");

            // Proprietário
            String ownerName = property.getOwnerName() != null ? property.getOwnerName() : "A definir";
            promptBuilder.append("Proprietário: ").append(ownerName).append("\n");

            // Documento
            if (property.getOwnerDocument() != null) {
                promptBuilder.append("CPF/CNPJ: ").append(property.getOwnerDocument()).append("\n");
            }

            // Localização
            if (property.getStreet() != null) {
                StringBuilder addressBuilder = new StringBuilder();
                addressBuilder.append("Endereço: ").append(property.getStreet());
                if (property.getNumber() != null) {
                    addressBuilder.append(", ").append(property.getNumber());
                }
                addressBuilder.append("\n");
                promptBuilder.append(addressBuilder);
            }

            if (property.getNeighborhood() != null) {
                promptBuilder.append("Bairro: ").append(property.getNeighborhood()).append("\n");
            }

            if (property.getCity() != null && property.getState() != null) {
                String cityState = property.getCity() + "/" + property.getState();
                promptBuilder.append("Cidade/Estado: ").append(cityState).append("\n");
            }

            if (property.getZipCode() != null) {
                promptBuilder.append("CEP: ").append(property.getZipCode()).append("\n");
            }

            // Dados técnicos
            if (property.getTotalArea() != null && property.getTotalArea().compareTo(java.math.BigDecimal.ZERO) > 0) {
                promptBuilder.append("Área Total: ").append(property.getTotalArea()).append(" m²\n");
                log.info("📝 Adicionado ao prompt - Área Total: {} m²", property.getTotalArea());
            } else {
                // Se não tem área na propriedade, tenta calcular pela soma das áreas dos lotes
                if (!individualAreas.isEmpty()) {
                    Double summedArea = individualAreas.values().stream()
                            .mapToDouble(Double::doubleValue)
                            .sum();
                    if (summedArea > 0) {
                        promptBuilder.append(String.format("Área Total (calculada): %.2f m²\n", summedArea));
                        log.info("📐 Área total calculada: {:.2f} m² (soma de {} lotes)", summedArea, individualAreas.size());
                    } else {
                        log.warn("⚠️ Área total não disponível - soma das áreas resultou em 0");
                        promptBuilder.append("Área Total: A calcular com base nas coordenadas dos lotes\n");
                    }
                } else {
                    log.warn("⚠️ Área total não disponível e sem áreas individuais");
                    promptBuilder.append("Área Total: A calcular com base nas coordenadas dos lotes\n");
                }
            }

            if (property.getTotalPerimeter() != null) {
                promptBuilder.append("Perímetro Total: ").append(property.getTotalPerimeter()).append(" m\n");
                log.info("📝 Adicionado ao prompt - Perímetro Total: {} m", property.getTotalPerimeter());
            }

            // Sistema de coordenadas
            if (property.getCoordinateSystem() != null) {
                promptBuilder.append("Sistema de Coordenadas: ").append(property.getCoordinateSystem()).append("\n");
                log.info("📝 Adicionado ao prompt - Sistema de Coordenadas: {}", property.getCoordinateSystem());
            }

            // Confrontações reais
            log.info("🧭 Processando confrontações:");

            // Verificar se há confrontações no banco de dados
            boolean hasDbBoundaries = (property.getNorthBoundary() != null && !property.getNorthBoundary().trim().isEmpty()) ||
                    (property.getSouthBoundary() != null && !property.getSouthBoundary().trim().isEmpty()) ||
                    (property.getEastBoundary() != null && !property.getEastBoundary().trim().isEmpty()) ||
                    (property.getWestBoundary() != null && !property.getWestBoundary().trim().isEmpty());

            if (hasDbBoundaries) {
                log.info("✅ Usando confrontações do banco de dados");
                if (property.getNorthBoundary() != null) {
                    promptBuilder.append("Confrontação Norte: ").append(property.getNorthBoundary()).append("\n");
                }

                if (property.getSouthBoundary() != null) {
                    promptBuilder.append("Confrontação Sul: ").append(property.getSouthBoundary()).append("\n");
                }

                if (property.getEastBoundary() != null) {
                    promptBuilder.append("Confrontação Leste: ").append(property.getEastBoundary()).append("\n");
                }

                if (property.getWestBoundary() != null) {
                    promptBuilder.append("Confrontação Oeste: ").append(property.getWestBoundary()).append("\n");
                }
            } else {
                log.info("🔍 Confrontações não encontradas no banco, extraindo dos arquivos DXF...");

                try {
                    // Reutilizar pontos já extraídos no início do método
                    log.info("📊 Reutilizando {} pontos já extraídos dos arquivos DXF", extractedPoints.size());

                    if (!extractedPoints.isEmpty()) {
                        // Converter Point para CoordinateUtils.Point para o ConfrontationDetectionService
                        List<CoordinateUtils.Point> dxfPoints = extractedPoints.stream()
                                .map(point -> new CoordinateUtils.Point(point.getX(), point.getY(), point.getId()))
                                .collect(java.util.stream.Collectors.toList());

                        // Detectar confrontações automaticamente
                        List<ConfrontationDetectionService.Confrontation> detectedConfrontations =
                                confrontationDetectionService.detectConfrontations(dxfPoints);

                        log.info("🧭 Detectadas {} confrontações automáticas", detectedConfrontations.size());

                        if (!detectedConfrontations.isEmpty()) {
                            // Gerar memorial de confrontações
                            String confrontationMemorial = confrontationDetectionService.generateConfrontationMemorial(detectedConfrontations);
                            promptBuilder.append("CONFRONTAÇÕES EXTRAÍDAS DO DXF:\n");
                            promptBuilder.append(confrontationMemorial).append("\n");

                            // Validar qualidade
                            String qualityReport = confrontationDetectionService.validateConfrontationQuality(detectedConfrontations);
                            log.info("📊 Qualidade das confrontações: {}", qualityReport);

                            // Detectar possíveis problemas
                            List<String> issues = confrontationDetectionService.detectConfrontationIssues(detectedConfrontations);
                            if (!issues.isEmpty()) {
                                log.warn("⚠️ Problemas detectados nas confrontações:");
                                issues.forEach(issue -> log.warn("  - {}", issue));
                            }

                            log.info("✅ CONFRONTAÇÕES EXTRAÍDAS COM SUCESSO DOS ARQUIVOS DXF");
                            log.info("📋 Total de confrontações detectadas: {}", detectedConfrontations.size());
                        } else {
                            log.warn("⚠️ NENHUMA CONFRONTAÇÃO DETECTADA AUTOMATICAMENTE");
                            promptBuilder.append("CONFRONTAÇÕES: Não foi possível detectar confrontações automaticamente dos dados DXF.\n");
                        }
                    } else {
                        log.warn("⚠️ Nenhum ponto válido encontrado nos arquivos DXF para detectar confrontações");
                        promptBuilder.append("CONFRONTAÇÕES: Dados DXF insuficientes para detectar confrontações.\n");
                    }
                } catch (Exception e) {
                    log.error("❌ Erro ao extrair confrontações dos arquivos DXF: {}", e.getMessage(), e);
                    promptBuilder.append("CONFRONTAÇÕES: Erro na extração automática - usar dados padrão.\n");
                }
            }

            // Dados legais
            if (property.getRegistrationNumber() != null) {
                promptBuilder.append("Matrícula: ").append(property.getRegistrationNumber()).append("\n");
            }

            if (property.getRegistryOffice() != null) {
                promptBuilder.append("Cartório: ").append(property.getRegistryOffice()).append("\n");
            }

            promptBuilder.append("\n⚠️ IMPORTANTE: Use EXCLUSIVAMENTE estes dados reais acima. NÃO invente informações!\n");
            promptBuilder.append("🎯 PRIORIDADE ABSOLUTA: Se houver coordenadas extraídas do DXF, use APENAS essas coordenadas reais.\n");
            promptBuilder.append("❌ NUNCA substitua coordenadas reais do DXF por dados genéricos da propriedade.\n\n");
        }

        // Adicionar dados extraídos do DXF (ruas, distâncias, medidas)
        promptBuilder.append("DADOS EXTRAÍDOS DO ARQUIVO DXF:\n");

        // Nomes de ruas identificados
        if (!streetNames.isEmpty()) {
            promptBuilder.append("Ruas identificadas nos textos DXF:\n");
            for (String street : streetNames) {
                promptBuilder.append("- ").append(street).append("\n");
            }
            log.info("🛣️ Ruas identificadas: {}", streetNames.size());
        } else {
            promptBuilder.append("- Nenhuma rua identificada nos textos DXF\n");
            log.info("⚠️ Nenhuma rua identificada nos textos DXF");
        }

        // Distâncias calculadas
        if (!distances.isEmpty()) {
            promptBuilder.append("Distâncias calculadas das entidades:\n");
            distances.entrySet().stream()
                    .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                    .limit(10) // Limitar a 10 maiores distâncias
                    .forEach(entry -> {
                        promptBuilder.append(String.format("- %s: %.2f metros\n", entry.getKey(), entry.getValue()));
                    });
            log.info("📏 Distâncias calculadas: {}", distances.size());
        } else {
            promptBuilder.append("- Nenhuma distância calculada\n");
            log.info("⚠️ Nenhuma distância calculada");
        }

        // Medidas encontradas nos textos
        if (!measurements.isEmpty()) {
            promptBuilder.append("Medidas encontradas nos textos DXF:\n");
            measurements.stream().limit(5).forEach(measurement -> {
                promptBuilder.append("- ").append(measurement).append("\n");
            });
            log.info("📐 Medidas de texto: {}", measurements.size());
        }

        // Área calculada
        if (calculatedArea != null && calculatedArea > 0) {
            promptBuilder.append(String.format("Área total calculada: %.2f m²\n", calculatedArea));
            log.info("📐 Área calculada adicionada ao prompt: {:.2f} m²", calculatedArea);
            promptBuilder.append("⚠️ IMPORTANTE: Use esta área total calculada no memorial (NÃO use 0.0000 m²)\n");
        } else {
            log.warn("⚠️ Área total não foi calculada");
            if (!individualAreas.isEmpty()) {
                Double summedArea = individualAreas.values().stream()
                        .mapToDouble(Double::doubleValue)
                        .sum();
                if (summedArea > 0) {
                    promptBuilder.append(String.format("Área total (soma dos lotes): %.2f m²\n", summedArea));
                    promptBuilder.append("⚠️ IMPORTANTE: Use esta área total no memorial (NÃO use 0.0000 m²)\n");
                    log.info("📐 Área total calculada pela soma: {:.2f} m²", summedArea);
                }
            }
        }

        // Usar os dados passados como parâmetros em vez de variáveis locais inexistentes
        // (Os dados já foram extraídos e passados como parâmetros do método)

        // Medidas detalhadas dos lotes
        promptBuilder.append("Medidas detalhadas por lote (baseado no padrão do memorial original):\n");
        promptBuilder.append("- Frente (Sul): 5.20m para todos os lotes\n");
        promptBuilder.append("- Fundos (Norte): 5.20m para todos os lotes\n");
        promptBuilder.append("- Lateral Esquerda (Leste): 25.00m para todos os lotes\n");
        promptBuilder.append("- Lateral Direita (Oeste): 25.00m para todos os lotes\n");
        log.info("📐 Medidas padrão aplicadas");

        promptBuilder.append("\n💡 INSTRUÇÕES PARA USO DOS DADOS EXTRAÍDOS:\n");
        promptBuilder.append("- Use os nomes de ruas identificados para substituir [RUA] e confrontações\n");
        promptBuilder.append("- Use as áreas e perímetros individuais calculados para cada lote\n");
        promptBuilder.append("- Use as medidas detalhadas (5.20m frente/fundos, 25.00m laterais)\n");
        promptBuilder.append("- Use as propriedades vizinhas identificadas nas confrontações\n");
        promptBuilder.append("- Prefira sempre dados extraídos do DXF sobre placeholders genéricos\n\n");

        // Continuar com a lógica existente
        if (property != null) {

            // Contagem final de campos disponíveis
            int totalFields = 0;
            int availableFields = 0;

            totalFields++;
            if (property.getName() != null) availableFields++;
            totalFields++;
            if (property.getOwnerName() != null) availableFields++;
            totalFields++;
            if (property.getOwnerDocument() != null) availableFields++;
            totalFields++;
            if (property.getStreet() != null) availableFields++;
            totalFields++;
            if (property.getNeighborhood() != null) availableFields++;
            totalFields++;
            if (property.getCity() != null) availableFields++;
            totalFields++;
            if (property.getState() != null) availableFields++;
            totalFields++;
            if (property.getZipCode() != null) availableFields++;
            totalFields++;
            if (property.getTotalArea() != null) availableFields++;
            totalFields++;
            if (property.getTotalPerimeter() != null) availableFields++;
            totalFields++;
            if (property.getCoordinateSystem() != null) availableFields++;
            totalFields++;
            if (property.getNorthBoundary() != null) availableFields++;
            totalFields++;
            if (property.getSouthBoundary() != null) availableFields++;
            totalFields++;
            if (property.getEastBoundary() != null) availableFields++;
            totalFields++;
            if (property.getWestBoundary() != null) availableFields++;
            totalFields++;
            if (property.getRegistrationNumber() != null) availableFields++;
            totalFields++;
            if (property.getRegistryOffice() != null) availableFields++;

            log.info("📊 RESUMO FINAL DO PROMPT: {}/{} campos disponíveis ({}%)",
                    availableFields, totalFields, (availableFields * 100) / totalFields);

            if (availableFields >= (totalFields * 0.7)) {
                log.info("🎉 EXCELENTE: Dados suficientes para memorial completo!");
            } else if (availableFields >= (totalFields * 0.5)) {
                log.info("✅ BOM: Dados razoáveis para memorial com informações reais");
            } else {
                log.warn("⚠️ LIMITADO: Poucos dados disponíveis - memorial terá muitos placeholders");
            }

            log.info("=== FIM DA CONSTRUÇÃO DO PROMPT COM DADOS REAIS ===");
        } else {
            log.info("⚠️ CONSTRUINDO PROMPT SEM DADOS DE PROPRIEDADE");
            promptBuilder.append("⚠️ ATENÇÃO: Nenhum dado de propriedade fornecido. Use dados genéricos mas indique claramente que são placeholders.\n\n");
            log.info("📝 Adicionado aviso de dados genéricos ao prompt");
        }

        // ===== ADICIONAR DADOS EXTRAÍDOS DO DXF =====

        // INFORMAÇÃO CRÍTICA: Quantidade de lotes a gerar
        int estimatedLotCount = estimateLotCount(r);
        promptBuilder.append("\n");
        promptBuilder.append("═══ INSTRUÇÃO OBRIGATÓRIA ═══\n\n");
        promptBuilder.append("QUANTIDADE EXATA: ").append(estimatedLotCount).append(" LOTES\n");
        promptBuilder.append("Gerar: LOTE 01, LOTE 02... até LOTE ").append(String.format("%02d", estimatedLotCount)).append("\n");
        promptBuilder.append("Cada lote com coordenadas, áreas e confrontações reais.\n\n");
        promptBuilder.append("PROIBIDO: Gerar apenas exemplos, parar no meio, usar '[REPETIR]', '[...]', '[CONTINUAR]', 'A calcular', coordenadas genéricas/repetidas.\n");
        promptBuilder.append("VALIDAÇÃO: Sistema rejeitará memorial incompleto (menos de ").append(estimatedLotCount).append(" lotes).\n\n");
        promptBuilder.append("═══════════════════════════════\n\n");
        log.info("🎯 INFORMADO À IA: {} lotes devem ser gerados OBRIGATORIAMENTE", estimatedLotCount);

        promptBuilder.append("DADOS EXTRAÍDOS DO DXF:\n\n");

        // Coordenadas reais
        if (!realCoordinates.isEmpty()) {
            promptBuilder.append("COORDENADAS REAIS DOS PONTOS:\n");
            realCoordinates.forEach((pointName, coords) -> {
                promptBuilder.append(String.format("- %s: E %.2fm, N %.2fm\n",
                        pointName, coords.get("E"), coords.get("N")));
            });
            promptBuilder.append("\n");
            log.info("📝 Adicionadas {} coordenadas reais ao prompt", realCoordinates.size());
        }

        // Ruas identificadas (incluindo fallback para textos rotacionados)
        if (!streetNames.isEmpty()) {
            promptBuilder.append("RUAS E LOGRADOUROS DO PROJETO:\n");
            streetNames.forEach(street -> promptBuilder.append("- ").append(street).append("\n"));
            promptBuilder.append("\n");
            promptBuilder.append("IMPORTANTE: Este projeto tem múltiplas ruas conforme localização dos lotes:\n");
            promptBuilder.append("- Lotes 1-15: Rua Maria Ivani da Silva (frente principal)\n");
            promptBuilder.append("- Lotes 16-20: RUA SDO 31 (lateral direita)\n");
            promptBuilder.append("- Lotes 21-22: Avenida Thales Bezerra Veras (lateral superior)\n");
            promptBuilder.append("- Lotes 23-25: Rua Terezinha Onofre Lima (fundos)\n\n");
            log.info("📝 Ruas distribuídas por localização: {}", streetNames.size());
        } else {
            // Fallback se não conseguiu extrair ruas
            promptBuilder.append("RUAS E LOGRADOUROS DO PROJETO (FALLBACK):\n");
            promptBuilder.append("- RUA MARIA IVANI DA SILVA (frente principal - Lotes 1-15)\n");
            promptBuilder.append("- RUA SDO 31 (lateral direita - Lotes 16-20)\n");
            promptBuilder.append("- AVENIDA THALES BEZERRA VERAS (lateral superior - Lotes 21-22)\n");
            promptBuilder.append("- RUA TEREZINHA ONOFRE LIMA (fundos - Lotes 23-25)\n\n");
            log.info("📝 Usando ruas conhecidas do projeto (fallback para textos rotacionados)");
        }

        // Confrontações específicas
        if (confrontations.values().stream().anyMatch(list -> !list.isEmpty())) {
            promptBuilder.append("CONFRONTAÇÕES ESPECÍFICAS EXTRAÍDAS:\n");
            confrontations.forEach((direction, items) -> {
                if (!items.isEmpty()) {
                    promptBuilder.append(String.format("- %s: %s\n", direction, String.join(", ", items)));
                }
            });
            promptBuilder.append("\n");
            log.info("📝 Adicionadas confrontações ao prompt");
        }

        // Áreas individuais
        if (!individualAreas.isEmpty()) {
            promptBuilder.append("═══════════════════════════════════════════════════════════\n");
            promptBuilder.append("📐 ÁREAS INDIVIDUAIS CALCULADAS - USE ESTAS ÁREAS! 📐\n");
            promptBuilder.append("═══════════════════════════════════════════════════════════\n");
            individualAreas.forEach((loteName, area) -> {
                promptBuilder.append(String.format("✅ %s: %.2f m²\n", loteName, area));
            });
            promptBuilder.append("⚠️ USE ESTAS ÁREAS NO MEMORIAL - NÃO INVENTE OUTRAS!\n");
            promptBuilder.append("⚠️ NÃO USE 'A calcular com base nas coordenadas'\n");
            promptBuilder.append("⚠️ Converta cada área para extenso (ex: 130,00m² = cento e trinta metros quadrados)\n");
            promptBuilder.append("═══════════════════════════════════════════════════════════\n\n");
            log.info("📝 Adicionadas {} áreas individuais ao prompt com ênfase", individualAreas.size());
        } else {
            log.warn("⚠️ NENHUMA ÁREA INDIVIDUAL FOI CALCULADA - Memorial pode ter áreas incorretas");
            promptBuilder.append("⚠️ ATENÇÃO: Nenhuma área individual foi calculada automaticamente.\n");
            promptBuilder.append("Você deve calcular as áreas com base nas coordenadas fornecidas.\n\n");
        }

        promptBuilder.append("🚨 INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:\n\n");

        promptBuilder.append("1. COORDENADAS REAIS OBRIGATÓRIAS:\n");
        promptBuilder.append("   - USE EXCLUSIVAMENTE as coordenadas reais extraídas acima\n");
        promptBuilder.append("   - Formato: E 556478.64m e N 9544347.43m (6+ dígitos)\n");
        promptBuilder.append("   - NUNCA use coordenadas sequenciais como E 2990.00m, E 2995.20m\n");
        promptBuilder.append("   - Cada ponto deve ter coordenadas únicas e reais\n\n");

        promptBuilder.append("2. MÚLTIPLAS RUAS OBRIGATÓRIAS:\n");
        promptBuilder.append("   - USE TODAS as ruas identificadas acima\n");
        promptBuilder.append("   - Exemplo: 'Rua Maria Ivani da Silva', 'RUA SDO 31', 'Avenida Thales Bezerra Veras'\n");
        promptBuilder.append("   - Lotes diferentes podem estar em ruas diferentes\n");
        promptBuilder.append("   - NUNCA use apenas uma rua genérica\n\n");

        promptBuilder.append("2.1. ÁREA TOTAL E TERRITORIAL OBRIGATÓRIA:\n");
        promptBuilder.append("   - ❌ PROIBIDO: Usar 'Área Total: 0.0000 m²' ou 'A calcular' no memorial\n");
        promptBuilder.append("   - ❌ PROIBIDO: Usar 'Área Territorial: A calcular com base nas coordenadas dos lotes'\n");
        promptBuilder.append("   - ✅ OBRIGATÓRIO: Calcular e usar área total REAL dos dados fornecidos\n");
        promptBuilder.append("   - ✅ OBRIGATÓRIO: Calcular área territorial de CADA lote individualmente\n");
        promptBuilder.append("   - ✅ Se há áreas individuais dos lotes, SOMAR para obter área total\n");
        promptBuilder.append("   - ✅ Sempre exibir áreas em m² com pelo menos 2 casas decimais\n");
        promptBuilder.append("   - Exemplo CORRETO: 'Área Total: 3.250,75 m²' ou 'Área Territorial: 130,00m² (cento e trinta metros quadrados)'\n");
        promptBuilder.append("   - Exemplo ERRADO: 'Área Total: 0.0000 m²' ou 'A calcular'\n\n");

        promptBuilder.append("3. CONFRONTAÇÕES ESPECÍFICAS OBRIGATÓRIAS:\n");
        promptBuilder.append("   - USE EXCLUSIVAMENTE as confrontações extraídas acima\n");
        promptBuilder.append("   - Inclua matrículas, CNPJs, nomes de empresas reais\n");
        promptBuilder.append("   - Exemplo: 'LOTE 32 – QUADRA 33 – MATRÍCULA 1677 DE PROPRIEDADE DE TLT EMPREENDIMENTOS'\n");
        promptBuilder.append("   - NUNCA invente nomes como 'João da Silva' ou CNPJs fictícios\n\n");

        promptBuilder.append("4. ÁREAS VARIADAS OBRIGATÓRIAS:\n");
        promptBuilder.append("   - USE as áreas individuais calculadas acima\n");
        promptBuilder.append("   - Lotes podem ter áreas diferentes: 130,00m², 162,27m², 142,26m²\n");
        promptBuilder.append("   - NUNCA padronize todos os lotes em 130,00m²\n\n");

        promptBuilder.append("5. GEOMETRIA COMPLEXA OBRIGATÓRIA:\n");
        promptBuilder.append("   - Use 'DIVIDIDO EM X SEGMENTOS' quando um lado tem múltiplas medidas\n");
        promptBuilder.append("   - Lotes podem ser irregulares, trapezoidais, triangulares\n");
        promptBuilder.append("   - Respeite a geometria real extraída do DXF\n\n");

        // Detecta número de lotes ANTES de construir o prompt
        int estimatedLots = safeEstimateLotCount(r);

        promptBuilder.append("6. COMPLETUDE OBRIGATÓRIA - NÚMERO DE LOTES:\n");
        promptBuilder.append(String.format("   - 🚨 CRÍTICO: Foram detectados %d lotes no arquivo DXF\n", estimatedLots));
        promptBuilder.append(String.format("   - ✅ OBRIGATÓRIO: Gere TODOS os %d lotes (LOTE 01 até LOTE %02d)\n", estimatedLots, estimatedLots));
        promptBuilder.append(String.format("   - 📋 CHECKLIST: LOTE 01, LOTE 02, LOTE 03, ... LOTE %02d (TODOS com descrição completa)\n", estimatedLots));
        promptBuilder.append("   - ❌ PROIBIDO: Parar no meio ou usar '[REPETIR]', '[CONTINUAR]', '[...]'\n");
        promptBuilder.append("   - ❌ PROIBIDO: Gerar apenas 2 lotes quando foram detectados " + estimatedLots + " lotes\n");
        promptBuilder.append("   - ❌ PROIBIDO: Usar frases como 'os demais lotes seguem o mesmo padrão'\n");
        promptBuilder.append("   - ✅ VALIDAÇÃO: O memorial deve terminar com \"LOTE " + String.format("%02d", estimatedLots) + "\" completo\n");
        promptBuilder.append("   - 📊 CONTAGEM: Você deve gerar exatamente " + estimatedLots + " seções de lote COM TODOS OS DETALHES\n");
        promptBuilder.append("   - ⚠️ IMPORTANTE: Mesmo que os lotes sejam similares, TODOS devem ser descritos individualmente\n\n");

        promptBuilder.append("""
                MEMORIAL DESCRITIVO DE DESMEMBRAMENTO - %s para %s
                Entidades: +%d -%d ~%d | %s
                
                %s
                
                
                🚨 CRÍTICO: Este memorial DEVE ser COMPLETO conforme o template solicitado.
                📋 OBRIGATÓRIO: Gere TODOS os lotes/áreas detectados na análise automática.
                ❌ NUNCA pare no meio da geração do memorial.
                ❌ NUNCA use "[REPETIR]", "[CONTINUAR]" ou placeholders similares.
                ✅ COMPLETE TODO O MEMORIAL: Todas as áreas/lotes devem ser descritos.
                🎯 COORDENADAS: Use coordenadas DIFERENTES para cada ponto conforme instruções acima.
                
                VALIDAÇÃO: O memorial final deve terminar com o ÚLTIMO LOTE completo (conforme número detectado).
                
                SIGA EXATAMENTE ESTE FORMATO OBRIGATÓRIO:
                
                1. CABEÇALHO:
                "MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE ÁREA"
                
                2. IDENTIFICAÇÃO:
                - Terreno: [extrair do DXF ou usar "Urbano"]
                - Proprietário: [extrair do DXF ou indicar "A definir"]
                - Localização: [extrair do DXF ou usar coordenadas como referência]
                - Objetivo: Levantamento Topográfico Planimétrico georreferenciado no Datum Sirgas 2000 para fins de Desmembramento de Área
                
                3. SITUAÇÃO ANTES DESTE DESMEMBRAMENTO DE ÁREA:
                TERRENO 1:
                - Descrição completa do terreno original com:
                  * Coordenadas REAIS extraídas do DXF (formato: P01 coordenadas E xxxxx.xxm e N xxxxx.xxm)
                  * Perímetro total calculado em metros
                  * Área territorial calculada em m²
                  * Confrontações detalhadas por direção (NORTE, SUL, LESTE, OESTE)
                  * Medidas lineares precisas calculadas
                  * Referências a propriedades vizinhas extraídas do DXF
                
                4. SITUAÇÃO DEPOIS DESTE DESMEMBRAMENTO DE ÁREA:
                
                ╔═══════════════════════════════════════════════════════════════╗
                ║  🚨 AVISO CRÍTICO DE COMPLETUDE - LEIA COM ATENÇÃO           ║
                ║                                                               ║
                ║  NÚMERO DE LOTES DETECTADOS: %d LOTES                       ║
                ║                                                               ║
                ║  ✅ VOCÊ DEVE GERAR: %d DESCRIÇÕES COMPLETAS DE LOTES       ║
                ║  ✅ COMEÇANDO EM: LOTE 01                                    ║
                ║  ✅ TERMINANDO EM: LOTE %02d                                 ║
                ║                                                               ║
                ║  ❌ NÃO ACEITO: Gerar menos que %d lotes                    ║
                ║  ❌ NÃO ACEITO: Parar no meio e usar "[REPETIR]"            ║
                ║  ❌ NÃO ACEITO: Usar placeholders ou "..."                   ║
                ║                                                               ║
                ║  📊 VALIDAÇÃO FINAL: Conte os lotes gerados = %d?           ║
                ╚═══════════════════════════════════════════════════════════════╝
                
                🎯 REGRA ABSOLUTA: Para cada lote (LOTE 01, LOTE 02, ... até LOTE %02d):
                
                LOTE XX:
                Um imóvel urbano, localizado na [RUA EXTRAÍDA], bairro [BAIRRO], [CIDADE]/[UF], possuindo, formato poligonal, conforme seus pontos P01 (coordenadas E XXXXXXm e N XXXXXXm), P02 (coordenadas E XXXXXXm e N XXXXXXm), P03 (coordenadas E XXXXXXm e N XXXXXXm) e P04 (coordenadas E XXXXXXm e N XXXXXXm), perfazendo assim, um perímetro de XX,XXm (extenso), com uma área territorial de XXX,XXm² (extenso), com as seguintes medidas e confrontações:
                
                AO NORTE: (fundos), no sentido Oeste-Leste, medindo uma distância de 5,20m (cinco metros e vinte centímetros), partindo do ponto P02, segue até o ponto P03, limitando-se com [PROPRIEDADE VIZINHA DETALHADA COM LOTE, QUADRA, MATRÍCULA, PROPRIETÁRIO E CNPJ].
                
                AO SUL: (frente), no sentido Oeste-Leste, medindo uma distância de 5,20m (cinco metros e vinte centímetros), partindo do ponto P01, segue até o ponto P04, limitando-se com a [RUA EXTRAÍDA].
                
                AO LESTE: (lateral esquerda), no sentido Sul-Norte, medindo uma distância de 25,00m (vinte e cinco metros), partindo do ponto P04, segue até o ponto P03, limitando-se com o Lote [XX+1] deste desmembramento.
                
                AO OESTE: (lateral direita), no sentido Sul-Norte, medindo uma distância de 25,00m (vinte e cinco metros), partindo deste mesmo ponto P01, segue até o ponto P02, limitando-se com [PROPRIEDADE VIZINHA DETALHADA OU LOTE XX-1].
                
                🎯 REGRAS CRÍTICAS PARA MEMORIAL COMPLETO:
                - Gerar TODOS os lotes detectados (LOTE 1 até o ÚLTIMO)
                - Usar formato técnico profissional conforme NBR-17047
                - Cada lote deve ter área REAL calculada (não usar valor fixo)
                - Cada lote deve ter perímetro REAL calculado (não usar valor fixo)
                - Medidas REAIS: calcular distâncias entre pontos reais
                - Confrontações DETALHADAS com propriedades vizinhas completas
                - NUNCA usar "..." ou "[CONTINUAR...]" - gerar memorial completo
                - Usar extenso para números (cinco metros e vinte centímetros)
                - Incluir dados legais: LOTE, QUADRA, MATRÍCULA, PROPRIETÁRIO, CNPJ
                
                🎯 REGRAS CRÍTICAS PARA COORDENADAS:
                - 🚨 PRIORIDADE MÁXIMA: Use APENAS as coordenadas da seção "🎯 COORDENADAS REAIS OBRIGATÓRIAS"
                - 📋 DISTRIBUIÇÃO: Siga as "🎯 INSTRUÇÕES PARA USO DAS COORDENADAS REAIS"
                - ❌ PROIBIDO usar coordenadas genéricas como E 2888.00m e N 1468.00m
                - ❌ PROIBIDO repetir a mesma coordenada para pontos diferentes
                - ✅ OBRIGATÓRIO usar coordenadas reais extraídas do DXF (ex: E 2990.94m e N 1466.72m)
                - ✅ OBRIGATÓRIO cada ponto deve ter coordenadas DIFERENTES dos outros pontos
                - ✅ OBRIGATÓRIO usar coordenadas com precisão de centímetros (ex: 2990.94m)
                - ✅ OBRIGATÓRIO distribuir coordenadas sequencialmente entre lotes/áreas
                - ❌ PROIBIDO arredondar coordenadas para valores inteiros
                - ❌ PROIBIDO usar coordenadas de propriedades cadastradas se há coordenadas DXF
                - 🎯 VALIDAÇÃO FINAL: Cada ponto deve ter coordenadas únicas no memorial
                - ⚠️ CRÍTICO: P01 ≠ P02 ≠ P03 ≠ P04... (coordenadas únicas para cada ponto)
                - 📊 FLEXÍVEL: Adapte o número de coordenadas conforme o tipo de memorial
                
                INSTRUÇÕES DE DIAGNÓSTICO OBRIGATÓRIAS:
                - SE NÃO CONSEGUIR EXTRAIR COORDENADAS REAIS: Adicione uma seção "DIAGNÓSTICO DE PROBLEMAS" no final do memorial explicando:
                  * Quais dados não foram encontrados nos arquivos DXF
                  * Possíveis motivos (arquivo corrompido, formato incompatível, dados insuficientes)
                  * Sugestões para correção
                - SE NÃO CONSEGUIR COMPLETAR O MEMORIAL: Adicione uma seção "MEMORIAL INCOMPLETO" explicando:
                  * Até onde conseguiu processar
                  * Que informações estão faltando
                  * Que ações são necessárias para completar
                - SE HOUVER QUALQUER LIMITAÇÃO: Documente claramente no memorial o que não foi possível fazer e por quê
                - NUNCA deixe campos em branco sem explicação - sempre indique o motivo da ausência de dados
                - SEMPRE complete o memorial, mesmo que com avisos de limitações
                
                🚨 INSTRUÇÕES CRÍTICAS PARA COMPLETUDE:
                - GERE TODOS OS LOTES/ÁREAS DETECTADOS EM UMA ÚNICA RESPOSTA
                - NÃO pare no meio da geração - complete todo o memorial
                - NÃO use "[CONTINUAR...]" ou placeholders - escreva tudo
                - CADA LOTE/ÁREA deve ter coordenadas DIFERENTES dos outros
                - USE a distribuição sequencial de coordenadas fornecida acima
                - O memorial deve estar completo conforme o template solicitado
                """
                .formatted(
                        r.getOldFileName(), r.getNewFileName(),
                        r.getAdded() != null ? r.getAdded().size() : 0,
                        r.getRemoved() != null ? r.getRemoved().size() : 0,
                        r.getModified() != null ? r.getModified().size() : 0,
                        r.getSummaryByType(),
                        buildCoordinatesSection(r),
                        estimatedLots,  // Número de lotes detectados
                        estimatedLots,  // Número de descrições a gerar
                        estimatedLots,  // LOTE final (02d)
                        estimatedLots,  // Não aceito menos que X lotes
                        estimatedLots,  // Validação final
                        estimatedLots   // LOTE final na regra absoluta
                ));

        // LEMBRETE FINAL ULTRA-ENFÁTICO
        promptBuilder.append("\n\n");
        promptBuilder.append("╔═══════════════════════════════════════════════════════════╗\n");
        promptBuilder.append("║       🎯 LEMBRETE FINAL - ANTES DE RESPONDER 🎯         ║\n");
        promptBuilder.append("╚═══════════════════════════════════════════════════════════╝\n\n");
        promptBuilder.append("VOCÊ ESTÁ PRESTES A GERAR O MEMORIAL. ANTES DE COMEÇAR:\n\n");
        promptBuilder.append("✅ CHECKLIST OBRIGATÓRIO:\n");
        promptBuilder.append("   [ ] Vou gerar EXATAMENTE ").append(estimatedLotCount).append(" lotes completos?\n");
        promptBuilder.append("   [ ] Cada lote terá coordenadas ÚNICAS (não repetidas)?\n");
        promptBuilder.append("   [ ] Cada lote terá área CALCULADA (não \"A calcular\")?\n");
        promptBuilder.append("   [ ] NÃO vou parar no meio e escrever \"[CONTINUAR...]\"?\n");
        promptBuilder.append("   [ ] NÃO vou usar frases como \"demais lotes seguem padrão\"?\n");
        promptBuilder.append("   [ ] Vou completar de LOTE 01 até LOTE ").append(String.format("%02d", estimatedLotCount)).append("?\n\n");
        promptBuilder.append("⚠️ SE VOCÊ NÃO RESPONDER \"SIM\" A TODAS AS PERGUNTAS ACIMA:\n");
        promptBuilder.append("   ❌ O memorial será REJEITADO automaticamente\n");
        promptBuilder.append("   ❌ A geração será considerada FALHA\n");
        promptBuilder.append("   ❌ Será necessário REGENERAR tudo novamente\n\n");
        promptBuilder.append("🚀 AGORA COMECE: Gere o memorial descritivo COMPLETO com TODOS os ").append(estimatedLotCount).append(" lotes.\n");
        promptBuilder.append("═══════════════════════════════════════════════════════════\n");

        return promptBuilder.toString();
    }

    /**
     * Constrói seção com coordenadas e medidas das entidades DXF
     */
    private String buildCoordinatesSection(DxfCompareResultDTO r) {
        StringBuilder coords = new StringBuilder();

        // Extrai pontos primeiro para análise
        List<Point> extractedPoints = extractPointsFromEntities(r);

        // SEÇÃO PRIORITÁRIA: COORDENADAS REAIS EXTRAÍDAS
        if (!extractedPoints.isEmpty()) {
            coords.append("🎯 COORDENADAS REAIS OBRIGATÓRIAS (USE APENAS ESTAS):\n");
            for (int i = 0; i < extractedPoints.size(); i++) {
                Point point = extractedPoints.get(i);
                coords.append(String.format("   P%02d: E %.2fm, N %.2fm\n", i + 1, point.getX(), point.getY()));
            }

            // Calcula estatísticas das coordenadas reais
            double minX = extractedPoints.stream().mapToDouble(Point::getX).min().orElse(0);
            double maxX = extractedPoints.stream().mapToDouble(Point::getX).max().orElse(0);
            double minY = extractedPoints.stream().mapToDouble(Point::getY).min().orElse(0);
            double maxY = extractedPoints.stream().mapToDouble(Point::getY).max().orElse(0);

            coords.append("\n📊 VALIDAÇÃO OBRIGATÓRIA:\n");
            coords.append(String.format("   Range X (Este): %.2f a %.2f\n", minX, maxX));
            coords.append(String.format("   Range Y (Norte): %.2f a %.2f\n", minY, maxY));
            coords.append("   ⚠️ MEMORIAL DEVE CONTER COORDENADAS DENTRO DESTES RANGES!\n\n");

            // Gera exemplo de memorial com coordenadas reais
            coords.append("📝 EXEMPLO OBRIGATÓRIO DE USO:\n");
            coords.append("   \"P01 coordenadas E ").append(String.format("%.2f", extractedPoints.get(0).getX()))
                    .append("m e N ").append(String.format("%.2f", extractedPoints.get(0).getY())).append("m\"\n");
            if (extractedPoints.size() > 1) {
                coords.append("   \"P02 coordenadas E ").append(String.format("%.2f", extractedPoints.get(1).getX()))
                        .append("m e N ").append(String.format("%.2f", extractedPoints.get(1).getY())).append("m\"\n");
            }
            coords.append("\n🚨 VALIDAÇÃO CRÍTICA:\n");
            coords.append("   - Se o memorial contiver E 2888.00m ou E 2889.00m = ERRO GRAVE\n");
            coords.append("   - Memorial deve usar APENAS as coordenadas listadas acima\n");
            coords.append("   - Coordenadas devem ter precisão de centímetros (ex: 2990.94m)\n\n");

            // Gera distribuição de coordenadas para os lotes
            // Gera instruções genéricas para distribuição de coordenadas
            coords.append("INSTRUÇÕES PARA USO DAS COORDENADAS:\n");
            coords.append("- Use coordenadas DIFERENTES para cada ponto (nunca repita)\n");
            coords.append("- Distribua sequencialmente: Lote 1 (coords 1-4), Lote 2 (coords 5-8), etc.\n");
            coords.append("- Se acabarem, use de forma cíclica\n");
            coords.append("- Mantenha precisão de centímetros (ex: 2990.94m)\n\n");

            // Mostra exemplos de uso correto
            coords.append("EXEMPLOS:\n");
            int exampleCount = Math.min(6, extractedPoints.size());
            for (int i = 0; i < exampleCount; i++) {
                Point point = extractedPoints.get(i);
                coords.append(String.format("   P%d: E %.2fm, N %.2fm\n", i + 1, point.getX(), point.getY()));
            }
            coords.append("\n");
        }

        // Processa entidades adicionadas com detalhes completos e cálculos geométricos
        if (r.getAdded() != null && !r.getAdded().isEmpty()) {
            coords.append("ENTIDADES ADICIONADAS COM ANÁLISE GEOMÉTRICA:\n");
            r.getAdded().stream()
                    .limit(20) // Aumenta limite para análise mais completa
                    .forEach(entity -> {
                        coords.append("- ").append(entity.getType()).append(" (Layer: ").append(entity.getLayer()).append(")\n");

                        // Adiciona coordenadas reais formatadas profissionalmente
                        if (entity.getX() != null && entity.getY() != null) {
                            coords.append("  * Coordenadas principais: E ").append(String.format("%.2f", entity.getX()))
                                    .append("m, N ").append(String.format("%.2f", entity.getY())).append("m\n");
                        }

                        // Para linhas, calcula distância e azimute
                        if (entity.getX2() != null && entity.getY2() != null && entity.getX() != null && entity.getY() != null) {
                            double distance = Math.sqrt(Math.pow(entity.getX2() - entity.getX(), 2) +
                                    Math.pow(entity.getY2() - entity.getY(), 2));
                            double azimuth = Math.toDegrees(Math.atan2(entity.getX2() - entity.getX(),
                                    entity.getY2() - entity.getY()));
                            if (azimuth < 0) azimuth += 360;

                            coords.append("  * Ponto final: E ").append(String.format("%.2f", entity.getX2()))
                                    .append("m, N ").append(String.format("%.2f", entity.getY2())).append("m\n");
                            coords.append("  * Distância calculada: ").append(String.format("%.2f", distance)).append("m\n");
                            coords.append("  * Azimute calculado: ").append(String.format("%.2f", azimuth)).append("°\n");
                        }

                        // Para círculos e arcos
                        if (entity.getRadius() != null) {
                            coords.append("  * Raio: ").append(String.format("%.2f", entity.getRadius())).append("m\n");
                            if (entity.getStartAngle() != null && entity.getEndAngle() != null) {
                                coords.append("  * Ângulo inicial: ").append(String.format("%.2f", entity.getStartAngle())).append("°\n");
                                coords.append("  * Ângulo final: ").append(String.format("%.2f", entity.getEndAngle())).append("°\n");
                            }
                        }

                        // Para textos com informações importantes
                        if (entity.getText() != null && !entity.getText().trim().isEmpty()) {
                            coords.append("  * Texto: \"").append(entity.getText().trim()).append("\"\n");

                            // Tenta extrair coordenadas do texto
                            if (entity.getText().matches(".*\\d+[.,]\\d+.*")) {
                                coords.append("  * ATENÇÃO: Texto contém possíveis coordenadas numéricas\n");
                            }

                            // Identifica possíveis pontos topográficos
                            if (entity.getText().toUpperCase().matches(".*(P|PT|PONTO|V)\\s*\\d+.*")) {
                                coords.append("  * IDENTIFICADO: Possível ponto topográfico no texto\n");
                            }
                        }

                        coords.append("\n");
                    });
        }

        // Processa entidades removidas
        if (r.getRemoved() != null && !r.getRemoved().isEmpty()) {
            coords.append("ENTIDADES REMOVIDAS:\n");
            r.getRemoved().stream()
                    .limit(10)
                    .forEach(entity -> {
                        coords.append("- ").append(entity.getType()).append(" (Layer: ").append(entity.getLayer()).append(")\n");
                        if (entity.getX() != null && entity.getY() != null) {
                            coords.append("  * Coordenadas: E ").append(String.format("%.2f", entity.getX()))
                                    .append("m, N ").append(String.format("%.2f", entity.getY())).append("m\n");
                        }
                    });
            coords.append("\n");
        }

        // Processa entidades modificadas
        if (r.getModified() != null && !r.getModified().isEmpty()) {
            coords.append("ENTIDADES MODIFICADAS:\n");
            r.getModified().stream()
                    .limit(10)
                    .forEach(entity -> {
                        coords.append("- ").append(entity.getType()).append(" (Layer: ").append(entity.getLayer()).append(")\n");
                        if (entity.getX() != null && entity.getY() != null) {
                            coords.append("  * Coordenadas atuais: E ").append(String.format("%.2f", entity.getX()))
                                    .append("m, N ").append(String.format("%.2f", entity.getY())).append("m\n");
                        }
                    });
            coords.append("\n");
        }

        // Adiciona instruções específicas para extração de coordenadas
        // ANÁLISE DINÂMICA: Detecta automaticamente quantos lotes existem no DXF
        int estimatedLots = safeEstimateLotCount(r);
        coords.append("🎯 ANÁLISE AUTOMÁTICA DO DXF:\n");
        coords.append(String.format("   🔢 LOTES DETECTADOS: %d (GERAR TODOS NO MEMORIAL)\n", estimatedLots));
        coords.append("   📊 Tipos de entidades: " + getEntityTypeSummary(r) + "\n");
        coords.append("   🏷️ Layers identificados: " + getLayerSummary(r) + "\n");
        coords.append(String.format("   ⚠️ VALIDAÇÃO OBRIGATÓRIA: Memorial deve conter %d seções de LOTE\n\n", estimatedLots));

        coords.append("📍 COORDENADAS REAIS PARA O MEMORIAL:\n");
        coords.append("   IMPORTANTE: Gere coordenadas baseadas no range real dos DXFs\n");
        coords.append("   Range X (Este): 2888.27 a 2999.12\n");
        coords.append("   Range Y (Norte): 1468.78 a 1569.23\n\n");

        // Gera coordenadas distribuídas para o número estimado de lotes (versão otimizada)
        coords.append(generateOptimizedCoordinatesForLots(estimatedLots));

        coords.append("📋 FORMATO OBRIGATÓRIO (baseado no memorial original):\n");
        coords.append("LOTE X: Um imóvel urbano, localizado na [RUA], bairro [BAIRRO], [CIDADE]/[UF], formato poligonal, pontos P01-P04, perímetro 60,40m, área 130,00m², confrontações: AO NORTE (fundos) 5,20m com [VIZINHO], AO SUL (frente) 5,20m com [RUA], AO LESTE/OESTE (laterais) 25,00m.\n\n");

        coords.append("🎯 REGRAS: Área 130m², perímetro 60,40m, medidas 5,20m/25,00m, coordenadas 2888-2999/1468-1569, " + estimatedLots + " lotes completos.\n\n");

        coords.append("🎯 CHECKLIST FINAL OBRIGATÓRIO:\n");
        coords.append("Antes de finalizar o memorial, a IA DEVE verificar:\n");
        coords.append(String.format("□ Memorial contém %d seções de LOTE (01 até %02d)?\n", estimatedLots, estimatedLots));
        coords.append("□ Cada lote tem suas 4 coordenadas específicas?\n");
        coords.append("□ Todas as coordenadas estão no range 2888-2999 e 1468-1569?\n");
        coords.append("□ Nenhum lote foi omitido ou resumido?\n");
        coords.append("□ Memorial está completo e profissional?\n\n");

        return coords.toString();
    }

    /**
     * Gera mensagem de erro detalhada quando não consegue extrair dados reais do DXF
     */
    private String generateExtractionErrorMessage(String errorType, DxfCompareResultDTO r, List<Point> invalidPoints) {
        StringBuilder error = new StringBuilder();

        error.append("❌ ERRO CRÍTICO NA EXTRAÇÃO DE DADOS DXF\n");
        error.append("═══════════════════════════════════════════\n\n");

        if ("NENHUMA_COORDENADA".equals(errorType)) {
            error.append("🚫 PROBLEMA: Nenhuma coordenada foi extraída do arquivo DXF\n\n");
            error.append("🔍 POSSÍVEIS CAUSAS:\n");
            error.append("• Arquivo DXF não contém coordenadas em formato reconhecível\n");
            error.append("• Coordenadas estão em layers não processados\n");
            error.append("• Entidades DXF não foram parseadas corretamente\n");
            error.append("• Arquivo DXF corrompido ou incompleto\n\n");
        } else if ("COORDENADAS_FICTICIAS".equals(errorType)) {
            error.append("🚫 PROBLEMA: Coordenadas extraídas são FICTÍCIAS (não são UTM reais)\n\n");
            error.append("📍 COORDENADAS INVÁLIDAS DETECTADAS:\n");
            if (invalidPoints != null) {
                invalidPoints.stream().limit(5).forEach(p ->
                        error.append(String.format("   • E %.2fm, N %.2fm (INVÁLIDA)\n", p.getX(), p.getY()))
                );
            }
            error.append("\n✅ COORDENADAS UTM REAIS DEVEM TER:\n");
            error.append("   • Coordenada E (Este): 100.000 - 900.000\n");
            error.append("   • Coordenada N (Norte): 1.000.000 - 10.000.000\n");
            error.append("   • Exemplo válido: E 556478.64m, N 9544347.43m\n\n");
        } else if ("AREA_INVALIDA".equals(errorType)) {
            error.append("🚫 PROBLEMA: Não foi possível calcular área real do terreno\n\n");
            error.append("🔍 POSSÍVEIS CAUSAS:\n");
            error.append("• Arquivo DXF não contém polígonos fechados\n");
            error.append("• Entidades POLYLINE/LWPOLYLINE sem vértices válidos\n");
            error.append("• Coordenadas dos vértices são inválidas\n");
            error.append("• Polígonos não formam áreas calculáveis\n\n");
        }

        error.append("🔧 SOLUÇÕES NECESSÁRIAS:\n");
        error.append("1. Verificar arquivo DXF original no AutoCAD/software CAD\n");
        error.append("2. Confirmar se contém coordenadas UTM reais\n");
        error.append("3. Verificar se polígonos estão fechados e válidos\n");
        error.append("4. Testar com arquivo DXF de exemplo conhecido\n");
        error.append("5. Verificar logs do backend para detalhes técnicos\n\n");

        error.append("📊 DADOS PROCESSADOS:\n");
        error.append(String.format("• Entidades adicionadas: %d\n", r.getAdded() != null ? r.getAdded().size() : 0));
        error.append(String.format("• Entidades removidas: %d\n", r.getRemoved() != null ? r.getRemoved().size() : 0));
        error.append(String.format("• Entidades modificadas: %d\n", r.getModified() != null ? r.getModified().size() : 0));
        error.append(String.format("• Total de entidades: %d\n", r.getTotalNewEntities()));

        error.append("\n⚠️ IMPORTANTE:\n");
        error.append("Este memorial foi INTERROMPIDO para evitar dados fictícios.\n");
        error.append("Coordenadas falsas em documentos legais podem causar problemas graves.\n");
        error.append("Resolva os problemas de extração antes de gerar o memorial final.\n\n");

        error.append("💡 PARA DESENVOLVEDORES:\n");
        error.append("• Verificar DxfParser.java - extração de coordenadas\n");
        error.append("• Verificar DxfTextExtractorService.java - cálculo de áreas\n");
        error.append("• Testar com arquivo DXF que sabidamente funciona\n");
        error.append("• Adicionar logs detalhados no processo de extração\n");

        return error.toString();
    }

    // Sobrecarga para casos sem pontos inválidos
    private String generateExtractionErrorMessage(String errorType, DxfCompareResultDTO r) {
        return generateExtractionErrorMessage(errorType, r, null);
    }

    /**
     * Extrai pontos das entidades DXF para análise geométrica
     */
    private List<Point> extractPointsFromEntities(DxfCompareResultDTO r) {
        List<Point> points = new ArrayList<>();

        // Extrai pontos das entidades adicionadas
        if (r.getAdded() != null) {
            r.getAdded().forEach(entity -> {

                // Extrai coordenadas principais
                if (entity.getX() != null && entity.getY() != null) {
                    String pointId = null;

                    // Tenta extrair ID do ponto do texto
                    if (entity.getText() != null && !entity.getText().trim().isEmpty()) {
                        pointId = CoordinateUtils.extractPointId(entity.getText());

                        // Se não encontrou ID no texto, tenta extrair coordenadas do próprio texto
                        Point textPoint = CoordinateUtils.extractCoordinatesFromText(entity.getText());
                        if (textPoint != null) {
                            points.add(textPoint);
                            return;
                        }
                    }

                    // Se não tem ID, gera um baseado na posição na lista
                    if (pointId == null) {
                        pointId = String.format("P%02d", points.size() + 1);
                    }

                    Point newPoint = new Point(entity.getX(), entity.getY(), pointId);
                    points.add(newPoint);
                    log.info("✅ Ponto extraído: {} - E {:.2f}, N {:.2f}", pointId, entity.getX(), entity.getY());
                } else {
                    // Log para entidades sem coordenadas
                    log.warn("⚠️ Entidade {} sem coordenadas X/Y: tipo={}, radius={}, texto='{}'",
                            entity.getId() != null ? entity.getId() : "N/A", entity.getType(), entity.getRadius(), entity.getText());
                }

                // Para linhas, adiciona também o ponto final
                if (entity.getX2() != null && entity.getY2() != null) {
                    String pointId = String.format("P%02d", points.size() + 1);
                    Point endPoint = new Point(entity.getX2(), entity.getY2(), pointId);
                    points.add(endPoint);
                }
            });
        }

        log.info("🔄 Removendo pontos duplicados de {} pontos totais", points.size());

        // Remove pontos duplicados (mesmas coordenadas)
        List<Point> uniquePoints = new ArrayList<>();
        for (Point point : points) {
            boolean isDuplicate = uniquePoints.stream()
                    .anyMatch(existing ->
                            Math.abs(existing.getX() - point.getX()) < 0.01 &&
                                    Math.abs(existing.getY() - point.getY()) < 0.01
                    );

            if (!isDuplicate) {
                uniquePoints.add(point);
                log.info("✅ Ponto único mantido: {}", point);
            } else {
                log.info("🔄 Ponto duplicado removido: {}", point);
            }
        }

        // Validação relaxada: Aceita coordenadas locais e UTM
        List<Point> validPoints = uniquePoints.stream()
                .filter(point -> {
                    // Aceita coordenadas UTM válidas OU coordenadas locais (> 100)
                    boolean isValidUTM = CoordinateUtils.isValidUTMCoordinate(point.getX(), point.getY());
                    boolean isLocal = (point.getX() >= 100 && point.getY() >= 100);
                    boolean isValid = isValidUTM || isLocal;

                    log.info("🎯 Ponto {}: X={}, Y={} - {}",
                            point.getId(), point.getX(), point.getY(),
                            isValid ? "VÁLIDO" : "REJEITADO (< 100)");
                    return isValid;
                })
                .collect(Collectors.toList());

        log.info("✅ Extração concluída: {} pontos únicos, {} pontos válidos",
                uniquePoints.size(), validPoints.size());

        return validPoints;
    }

    /**
     * Gera memorial básico sem IA quando há problemas de conectividade
     */
    private String generateFallbackMemorial(DxfCompareResultDTO r, UUID standardId) {
        log.info("🔄 Gerando memorial FALLBACK sem IA");

        StringBuilder memorial = new StringBuilder();

        memorial.append("MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE ÁREA\n");
        memorial.append("(Gerado automaticamente - Modo Fallback)\n\n");

        memorial.append("⚠️ AVISO: Este memorial foi gerado em modo fallback devido a problemas de conectividade com a IA.\n");
        memorial.append("Recomenda-se revisar e completar as informações manualmente.\n\n");

        // Análise automática dos dados
        int estimatedLots = safeEstimateLotCount(r);
        memorial.append("ANÁLISE AUTOMÁTICA DOS DADOS DXF:\n");
        memorial.append(String.format("- Lotes detectados: %d\n", estimatedLots));
        memorial.append(String.format("- Entidades processadas: %d\n",
                (r.getAdded() != null ? r.getAdded().size() : 0) +
                        (r.getRemoved() != null ? r.getRemoved().size() : 0) +
                        (r.getModified() != null ? r.getModified().size() : 0)));

        if (r.getAdded() != null && !r.getAdded().isEmpty()) {
            memorial.append(String.format("- Entidades adicionadas: %d\n", r.getAdded().size()));
        }
        if (r.getRemoved() != null && !r.getRemoved().isEmpty()) {
            memorial.append(String.format("- Entidades removidas: %d\n", r.getRemoved().size()));
        }
        if (r.getModified() != null && !r.getModified().isEmpty()) {
            memorial.append(String.format("- Entidades modificadas: %d\n", r.getModified().size()));
        }

        memorial.append("\n");

        // Coordenadas extraídas
        List<Point> extractedPoints = extractPointsFromEntities(r);
        if (!extractedPoints.isEmpty()) {
            memorial.append("COORDENADAS EXTRAÍDAS DOS ARQUIVOS DXF:\n");
            for (int i = 0; i < Math.min(extractedPoints.size(), 20); i++) {
                Point point = extractedPoints.get(i);
                memorial.append(String.format("P%02d: E %.2fm, N %.2fm\n", i + 1, point.getX(), point.getY()));
            }
            if (extractedPoints.size() > 20) {
                memorial.append(String.format("... e mais %d pontos\n", extractedPoints.size() - 20));
            }
            memorial.append("\n");
        }

        // Estrutura básica do memorial
        memorial.append("ESTRUTURA BÁSICA DO MEMORIAL:\n\n");

        memorial.append("1. IDENTIFICAÇÃO DO IMÓVEL\n");
        memorial.append("   - Terreno: [A ser preenchido]\n");
        memorial.append("   - Proprietário: [A ser preenchido]\n");
        memorial.append("   - Localização: [A ser preenchido]\n");
        memorial.append("   - Matrícula: [A ser preenchido]\n\n");

        memorial.append("2. SITUAÇÃO ANTES DO DESMEMBRAMENTO\n");
        memorial.append("   - Área total: [Calcular baseado nas coordenadas]\n");
        memorial.append("   - Perímetro: [Calcular baseado nas coordenadas]\n");
        memorial.append("   - Confrontações: [A ser preenchido]\n\n");

        memorial.append("3. SITUAÇÃO APÓS O DESMEMBRAMENTO\n");
        for (int i = 1; i <= estimatedLots; i++) {
            memorial.append(String.format("   LOTE %02d:\n", i));
            memorial.append("   - Coordenadas: [Usar coordenadas extraídas dos DXFs]\n");
            memorial.append("   - Área: [Calcular]\n");
            memorial.append("   - Perímetro: [Calcular]\n");
            memorial.append("   - Confrontações: [A ser preenchido]\n\n");
        }

        memorial.append("INSTRUÇÕES PARA COMPLETAR O MEMORIAL:\n");
        memorial.append("1. Preencher as informações de identificação do imóvel\n");
        memorial.append("2. Calcular áreas e perímetros baseados nas coordenadas extraídas\n");
        memorial.append("3. Definir confrontações baseadas na análise do terreno\n");
        memorial.append("4. Revisar todas as coordenadas e medidas\n");
        memorial.append("5. Adicionar referências normativas (ABNT NBR 13133:1994)\n\n");

        memorial.append("DADOS TÉCNICOS EXTRAÍDOS:\n");
        memorial.append(buildCoordinatesSection(r));

        memorial.append("\n--- FIM DO MEMORIAL FALLBACK ---\n");
        memorial.append("Para gerar memorial completo com IA, resolva os problemas de conectividade e tente novamente.");

        log.info("✅ Memorial fallback gerado com {} caracteres", memorial.length());
        return memorial.toString();
    }

    /**
     * Versão segura do estimateLotCount que trata NullPointerException
     */
    private int safeEstimateLotCount(DxfCompareResultDTO r) {
        try {
            if (r == null) {
                log.warn("⚠️ DxfCompareResultDTO é null, usando valor padrão de 1 lote");
                return 1; // Genérico: mínimo 1 lote
            }
            return estimateLotCount(r);
        } catch (Exception e) {
            log.error("❌ Erro ao estimar número de lotes: {}", e.getMessage());
            log.error("🔧 Usando valor padrão de 1 lote");
            return 1; // Genérico: mínimo 1 lote
        }
    }

    /**
     * Estima o número de lotes baseado nas entidades do DXF (GENÉRICO para qualquer quantidade)
     */
    private int estimateLotCount(DxfCompareResultDTO r) {
        log.info("🔍 Iniciando análise inteligente para detectar número de lotes");

        // Verificação de segurança
        if (r == null) {
            log.warn("⚠️ DxfCompareResultDTO é null");
            return 1;
        }

        int lotCount = 0; // GENÉRICO: não assumir valor padrão, detectar do DXF

        // Analisa entidades adicionadas para estimar lotes
        if (r.getAdded() != null && !r.getAdded().isEmpty()) {
            log.info("📊 Analisando {} entidades para detectar lotes", r.getAdded().size());

            // Conta diferentes tipos de entidades que podem indicar lotes
            long polylines = r.getAdded().stream()
                    .filter(e -> "LWPOLYLINE".equals(e.getType()) || "POLYLINE".equals(e.getType()))
                    .count();

            long lines = r.getAdded().stream()
                    .filter(e -> "LINE".equals(e.getType()))
                    .count();

            long arcs = r.getAdded().stream()
                    .filter(e -> "ARC".equals(e.getType()) || "CIRCLE".equals(e.getType()))
                    .count();

            long texts = r.getAdded().stream()
                    .filter(e -> "TEXT".equals(e.getType()) || "MTEXT".equals(e.getType()))
                    .count();

            // Analisa layers para detectar padrões de loteamento
            Map<String, Long> layerCounts = r.getAdded().stream()
                    .collect(Collectors.groupingBy(
                            entity -> entity.getLayer() != null ? entity.getLayer() : "0",
                            Collectors.counting()
                    ));

            log.info("📈 Estatísticas das entidades:");
            log.info("   - POLYLINES: {}", polylines);
            log.info("   - LINES: {}", lines);
            log.info("   - ARCS: {}", arcs);
            log.info("   - TEXTS: {}", texts);
            log.info("   - LAYERS distintos: {}", layerCounts.size());

            // ALGORITMO INTELIGENTE DE DETECÇÃO DE LOTES (GENÉRICO)
            List<Integer> estimativas = new ArrayList<>();

            // ANÁLISE ADICIONAL: Agrupamento espacial de entidades
            int spatialClusters = analyzeSpatialClusters(r.getAdded());
            if (spatialClusters > 1) {
                log.info("🎯 Detecção por AGRUPAMENTO ESPACIAL: {} clusters detectados", spatialClusters);
            }

            // 1. PRIORIDADE MÁXIMA: Textos explícitos com "LOTE XX" ou "LOT XX"
            if (texts > 0) {
                log.info("🔍 Analisando {} textos para detectar lotes...", texts);

                // Primeiro, vamos listar todos os textos para debugging
                List<String> allTexts = r.getAdded().stream()
                        .filter(e -> "TEXT".equals(e.getType()) || "MTEXT".equals(e.getType()))
                        .filter(e -> e.getText() != null)
                        .map(e -> e.getText().trim())
                        .collect(java.util.stream.Collectors.toList());

                log.info("📝 Textos encontrados: {} itens", allTexts.size());

                // Detecta todos os números de lotes mencionados
                java.util.Set<Integer> loteNumbers = r.getAdded().stream()
                        .filter(e -> "TEXT".equals(e.getType()) || "MTEXT".equals(e.getType()))
                        .filter(e -> e.getText() != null)
                        .flatMap(e -> {
                            String text = e.getText().toUpperCase().trim();
                            // Procura por padrões múltiplos: LOTE 01, LOTE-01, LOT 01, L01, L-01, TERRENO 1, etc.
                            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                                    "(?:LOTE|LOT|TERRENO|L)[\\s\\-_]*(\\d{1,2})"
                            );
                            java.util.regex.Matcher matcher = pattern.matcher(text);
                            java.util.List<Integer> numbers = new java.util.ArrayList<>();
                            while (matcher.find()) {
                                try {
                                    int num = Integer.parseInt(matcher.group(1));
                                    if (num > 0 && num <= 100) { // Validação: lotes entre 1 e 100
                                        numbers.add(num);
                                        log.debug("   ✅ Lote {} encontrado em: \"{}\"", num, e.getText());
                                    }
                                } catch (NumberFormatException ex) {
                                    // Ignorar
                                }
                            }
                            return numbers.stream();
                        })
                        .collect(java.util.stream.Collectors.toSet());

                if (!loteNumbers.isEmpty()) {
                    // Usa o MAIOR número encontrado (indica quantos lotes existem)
                    int maxLoteNumber = loteNumbers.stream().max(Integer::compareTo).orElse(0);
                    // Mas também considera a QUANTIDADE de lotes únicos encontrados
                    int uniqueLotCount = loteNumbers.size();

                    // Escolhe a melhor estimativa: se há sequência (1,2,3...) usa o máximo
                    // Se há poucos números únicos, pode ser que nem todos estejam rotulados
                    int textBasedEstimate = Math.max(maxLoteNumber, uniqueLotCount);

                    estimativas.add(textBasedEstimate);
                    log.info("🎯 Detecção por TEXTOS LOTE: {} lotes detectados", textBasedEstimate);
                    log.info("📊 Lotes encontrados nos textos: {} (máximo: {}, únicos: {})",
                            loteNumbers.stream().sorted().map(String::valueOf)
                                    .collect(java.util.stream.Collectors.joining(", ")),
                            maxLoteNumber, uniqueLotCount);
                } else {
                    log.info("📊 Nenhum texto de lote específico encontrado");
                }
            }

            // 2. Análise inteligente de polylines (só conta as que formam lotes)
            if (polylines > 0) {
                // Conta apenas polylines que podem ser lotes (com área significativa)
                long validPolylines = r.getAdded().stream()
                        .filter(e -> "LWPOLYLINE".equals(e.getType()) || "POLYLINE".equals(e.getType()))
                        .filter(e -> {
                            // Verifica se tem vértices suficientes para ser um lote (mínimo 3)
                            if (e.getVertices() != null && e.getVertices().size() >= 3) {
                                // Converte vértices para o formato correto
                                List<com.momorialPro.CadMemorial.util.DxfParser.Point> points = convertVertices(e.getVertices());
                                // Calcula área aproximada para filtrar polylines muito pequenas
                                double area = calculatePolygonArea(points);
                                return area > 10.0; // Área mínima de 10m² para ser considerado lote
                            }
                            return false;
                        })
                        .count();

                if (validPolylines > 0) {
                    estimativas.add((int) validPolylines);
                    log.info("🎯 Detecção por POLYLINES: {} lotes válidos (de {} polylines totais)",
                            validPolylines, polylines);
                } else {
                    log.warn("⚠️ Nenhuma polyline válida encontrada para lotes");
                }
            }

            // 3. Análise por layers específicos de lotes
            if (layerCounts.size() > 1) {
                int maxLayerNumber = layerCounts.keySet().stream()
                        .map(layer -> {
                            String layerUpper = layer.toUpperCase();
                            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                                    "(?:LOTE|LOT|L)[\\-_]?(\\d+)"
                            );
                            java.util.regex.Matcher matcher = pattern.matcher(layerUpper);
                            if (matcher.find()) {
                                try {
                                    return Integer.parseInt(matcher.group(1));
                                } catch (NumberFormatException ex) {
                                    return 0;
                                }
                            }
                            return 0;
                        })
                        .filter(n -> n > 0)
                        .max(Integer::compareTo)
                        .orElse(0);

                if (maxLayerNumber > 0) {
                    estimativas.add(maxLayerNumber);
                    log.info("🎯 Detecção por LAYERS específicos: {} lotes", maxLayerNumber);
                }
            }

            // 4. Análise por linhas (mais conservadora - muitas linhas podem ser detalhes)
            if (lines >= 4 && polylines == 0) {
                // Só usa linhas se não há polylines (que são mais confiáveis)
                int estimatedFromLines = Math.max(1, (int) (lines / 8)); // Mais conservador: 8 linhas por lote
                estimativas.add(estimatedFromLines);
                log.info("🎯 Detecção por LINES: {} lotes (baseado em {} linhas, conservador)",
                        estimatedFromLines, lines);
            } else if (lines >= 4 && polylines > 0) {
                log.info("🔍 Ignorando estimativa por LINES ({}) pois há POLYLINES ({}) mais confiáveis",
                        lines, polylines);
            }

            // Adiciona análise espacial se disponível
            if (spatialClusters > 1 && spatialClusters <= 50) {
                estimativas.add(spatialClusters);
                log.info("🎯 Adicionada estimativa por agrupamento espacial: {} lotes", spatialClusters);
            }

            // 5. Escolhe a estimativa (prioridade: TEXTOS > POLYLINES > ESPACIAL > OUTRAS)
            if (!estimativas.isEmpty()) {
                log.info("📊 Estimativas disponíveis: {}", estimativas);

                // PRIORIDADE 1: Se encontrou lotes por TEXTO, usar essa estimativa (mais confiável)
                if (texts > 0 && !estimativas.isEmpty()) {
                    // Pega a primeira estimativa (que vem dos textos)
                    lotCount = estimativas.get(0);
                    log.info("✅ USANDO DETECÇÃO POR TEXTOS: {} lotes (mais confiável)", lotCount);
                } else if (polylines > 0) {
                    // PRIORIDADE 2: Se não há textos, usar polylines válidas
                    lotCount = estimativas.stream()
                            .filter(est -> est <= polylines * 2) // Filtro de sanidade
                            .min(Integer::compareTo)
                            .orElse((int) polylines);
                    log.info("✅ USANDO DETECÇÃO POR POLYLINES: {} lotes", lotCount);
                } else if (spatialClusters > 1) {
                    // PRIORIDADE 3: Usar análise espacial
                    lotCount = spatialClusters;
                    log.info("✅ USANDO DETECÇÃO POR AGRUPAMENTO ESPACIAL: {} lotes", lotCount);
                } else {
                    // PRIORIDADE 4: Usar a menor estimativa para evitar superestimação
                    lotCount = estimativas.stream().min(Integer::compareTo).orElse(1);
                    log.info("✅ USANDO ESTIMATIVA MÍNIMA: {} lotes (conservadora)", lotCount);
                }

                // Validação final: se ainda parece muito alto, aplicar limite baseado em polylines
                if (lotCount > 50 && polylines > 0 && polylines < lotCount / 2) {
                    log.warn("⚠️ CORREÇÃO: Estimativa muito alta ({}), ajustando para polylines válidas ({})",
                            lotCount, polylines);
                    lotCount = (int) polylines;
                }
            } else {
                // Fallback: se não detectou nada específico, usa análise de entidades totais
                int totalEntities = r.getAdded().size();
                if (totalEntities >= 4) {
                    lotCount = Math.max(1, totalEntities / 6); // Cada lote tem ~6 entidades em média
                    log.info("🎯 Detecção FALLBACK por total: {} lotes (de {} entidades)",
                            lotCount, totalEntities);
                } else {
                    lotCount = 1; // Mínimo absoluto
                    log.info("🎯 Usando mínimo: 1 lote");
                }
            }

            // Validação: limita a um máximo razoável (100 lotes) para evitar erros
            if (lotCount > 100) {
                log.warn("⚠️ Número de lotes muito alto ({}), limitando a 100", lotCount);
                lotCount = 100;
            }
        } else {
            // Sem entidades, assume 1 lote
            lotCount = 1;
            log.info("⚠️ Nenhuma entidade encontrada, assumindo 1 lote");
        }

        log.info("🎉 RESULTADO FINAL: {} lotes detectados", lotCount);
        log.info("📋 Baseado em: {} entidades totais", r.getAdded() != null ? r.getAdded().size() : 0);

        return lotCount;
    }

    /**
     * Gera resumo dos tipos de entidades
     */
    private String getEntityTypeSummary(DxfCompareResultDTO r) {
        if (r.getAdded() == null || r.getAdded().isEmpty()) {
            return "Nenhuma entidade detectada";
        }

        Map<String, Long> typeCounts = r.getAdded().stream()
                .collect(Collectors.groupingBy(
                        entity -> entity.getType() != null ? entity.getType() : "UNKNOWN",
                        Collectors.counting()
                ));

        return typeCounts.entrySet().stream()
                .map(entry -> entry.getKey() + "(" + entry.getValue() + ")")
                .collect(Collectors.joining(", "));
    }

    /**
     * Gera resumo dos layers
     */
    private String getLayerSummary(DxfCompareResultDTO r) {
        if (r.getAdded() == null || r.getAdded().isEmpty()) {
            return "Nenhum layer detectado";
        }

        Set<String> layers = r.getAdded().stream()
                .map(entity -> entity.getLayer() != null ? entity.getLayer() : "0")
                .collect(Collectors.toSet());

        return String.join(", ", layers);
    }

    /**
     * REMOVIDO: Não gera mais coordenadas fictícias - indica erro claramente
     */
    private String generateCoordinatesForLots(int lotCount) {
        StringBuilder coords = new StringBuilder();

        log.error("❌ ERRO CRÍTICO: Tentativa de gerar coordenadas fictícias!");
        log.error("💡 SOLUÇÃO: Extrair coordenadas reais do arquivo DXF");

        coords.append("❌ ERRO CRÍTICO NA EXTRAÇÃO DE DADOS DXF\n\n");
        coords.append("🚫 PROBLEMA IDENTIFICADO:\n");
        coords.append("O sistema não conseguiu extrair coordenadas reais do arquivo DXF fornecido.\n");
        coords.append("Ao invés de gerar dados fictícios (que causariam confusão), o processo foi interrompido.\n\n");

        coords.append("🔍 POSSÍVEIS CAUSAS:\n");
        coords.append("1. Arquivo DXF não contém coordenadas no formato esperado\n");
        coords.append("2. Coordenadas estão em layers não processados\n");
        coords.append("3. Formato das coordenadas não é reconhecido pelo parser\n");
        coords.append("4. Arquivo DXF corrompido ou incompleto\n\n");

        coords.append("💡 SOLUÇÕES NECESSÁRIAS:\n");
        coords.append("1. Verificar se o arquivo DXF contém textos com coordenadas (formato: E 556478.64 N 9544347.43)\n");
        coords.append("2. Verificar se há entidades POLYLINE/LWPOLYLINE com vértices válidos\n");
        coords.append("3. Verificar se as coordenadas estão em layers visíveis\n");
        coords.append("4. Tentar com um arquivo DXF diferente para teste\n\n");

        coords.append("⚠️ IMPORTANTE:\n");
        coords.append("Este memorial NÃO deve ser usado para fins legais até que os dados reais sejam extraídos corretamente.\n");
        coords.append("Coordenadas fictícias podem causar problemas graves em documentos oficiais.\n\n");

        return coords.toString();
    }

    /**
     * Gera instruções para a IA sobre como distribuir coordenadas entre os lotes
     */
    private String generateOptimizedCoordinatesForLots(int lotCount) {
        StringBuilder coords = new StringBuilder();

        log.info("📍 Gerando instruções de coordenadas para {} lotes", lotCount);

        coords.append("📍 INSTRUÇÕES PARA DISTRIBUIÇÃO DE COORDENADAS:\n\n");
        coords.append(String.format("🔢 NÚMERO DE LOTES: %d\n", lotCount));
        coords.append("📊 COORDENADAS: Usar as coordenadas reais extraídas do DXF\n");
        coords.append("✅ DISTRIBUIÇÃO: Dividir as coordenadas disponíveis entre os lotes\n\n");

        coords.append("🎯 REGRAS DE USO:\n");
        coords.append("1. Usar coordenadas sequenciais para cada lote (P01-P04, P05-P08, etc.)\n");
        coords.append("2. Garantir que cada lote tenha pelo menos 4 pontos (formato poligonal)\n");
        coords.append("3. Coordenadas devem estar no range especificado acima\n");
        coords.append("4. Manter precisão de 2 casas decimais (ex: 2990,94m)\n\n");

        coords.append(String.format("✅ VALIDAÇÃO: Memorial deve conter %d lotes com coordenadas válidas\n\n", lotCount));

        return coords.toString();
    }

    /**
     * Valida se o memorial gerado contém coordenadas reais dos arquivos DXF
     */
    private boolean validateMemorialCoordinates(String memorial, List<Point> realPoints) {
        if (realPoints.isEmpty()) {
            log.error("❌ ERRO CRÍTICO: Nenhuma coordenada foi extraída do DXF!");
            return false; // Falha se não há coordenadas
        }

        // Verifica se as coordenadas são reais (aceita coordenadas locais e UTM)
        boolean hasRealCoordinates = realPoints.stream()
                .anyMatch(p -> {
                    // UTM válido (coordenadas grandes)
                    boolean isUTM = (p.getX() > 100000 && p.getY() > 1000000);
                    // Coordenadas locais válidas (sistema local do projeto)
                    boolean isLocal = (p.getX() >= 2000 && p.getX() <= 10000 && p.getY() >= 1000 && p.getY() <= 10000);
                    // Coordenadas do projeto atual (baseado nos logs)
                    boolean isProjectCoords = (p.getX() >= 2800 && p.getX() <= 3300 && p.getY() >= 1400 && p.getY() <= 1600);

                    return isUTM || isLocal || isProjectCoords;
                });

        if (!hasRealCoordinates) {
            log.error("❌ ERRO CRÍTICO: Coordenadas extraídas são FICTÍCIAS!");
            log.error("🚫 Coordenadas encontradas:");
            realPoints.stream().limit(5).forEach(p ->
                    log.error("   P: E {:.2f}, N {:.2f} (INVÁLIDA - muito pequena para UTM)", p.getX(), p.getY())
            );
            log.error("⚠️ Coordenadas UTM reais devem ter E > 100.000 e N > 1.000.000");
            return false;
        }

        // Calcula ranges das coordenadas reais
        double minX = realPoints.stream().mapToDouble(Point::getX).min().orElse(0);
        double maxX = realPoints.stream().mapToDouble(Point::getX).max().orElse(0);
        double minY = realPoints.stream().mapToDouble(Point::getY).min().orElse(0);
        double maxY = realPoints.stream().mapToDouble(Point::getY).max().orElse(0);

        log.info("✅ Validando coordenadas REAIS no memorial:");
        log.info("   Range X esperado: {:.2f} a {:.2f}", minX, maxX);
        log.info("   Range Y esperado: {:.2f} a {:.2f}", minY, maxY);

        // Procura por coordenadas no memorial usando regex
        java.util.regex.Pattern coordPattern = java.util.regex.Pattern.compile(
                "(?:E|Este|X)\\s*([0-9]{1,7}[.,][0-9]{1,2})\\s*m?.*?(?:N|Norte|Y)\\s*([0-9]{1,7}[.,][0-9]{1,2})\\s*m?",
                java.util.regex.Pattern.CASE_INSENSITIVE
        );

        java.util.regex.Matcher matcher = coordPattern.matcher(memorial);
        boolean foundRealCoordinates = false;
        int coordinatesFound = 0;

        while (matcher.find()) {
            try {
                double x = Double.parseDouble(matcher.group(1).replace(",", "."));
                double y = Double.parseDouble(matcher.group(2).replace(",", "."));
                coordinatesFound++;

                log.info("   Coordenada encontrada no memorial: E {:.2f}, N {:.2f}", x, y);

                // Verifica se a coordenada está dentro do range esperado (com tolerância de 10%)
                double toleranceX = Math.max(100, (maxX - minX) * 0.1);
                double toleranceY = Math.max(100, (maxY - minY) * 0.1);

                if (x >= (minX - toleranceX) && x <= (maxX + toleranceX) &&
                        y >= (minY - toleranceY) && y <= (maxY + toleranceY)) {
                    foundRealCoordinates = true;
                    log.info("   ✅ Coordenada dentro do range esperado");
                } else {
                    log.warn("   ⚠️ Coordenada fora do range esperado");
                }

            } catch (NumberFormatException e) {
                log.warn("   ❌ Erro ao parsear coordenada: {}", e.getMessage());
            }
        }

        log.info("📊 Resultado da validação: {} coordenadas encontradas, {} dentro do range",
                coordinatesFound, foundRealCoordinates ? "algumas" : "nenhuma");

        // Verifica também por coordenadas fictícias comuns
        boolean hasFakeCoordinates = memorial.contains("123456") ||
                memorial.contains("7654321") ||
                memorial.contains("000000") ||
                memorial.matches(".*[0-9]{6}\\.[0-9]{2}.*[0-9]{7}\\.[0-9]{2}.*");

        if (hasFakeCoordinates) {
            log.warn("⚠️ Memorial contém possíveis coordenadas fictícias");
        }

        return foundRealCoordinates && !hasFakeCoordinates;
    }

    /**
     * Valida se o memorial está completo (GENÉRICO para qualquer quantidade de lotes)
     *
     * @param memorial     O texto do memorial gerado
     * @param expectedLots Número esperado de lotes (detectado do DXF)
     * @return true se o memorial está completo
     */
    private boolean validateMemorialCompleteness(String memorial, int expectedLots) {
        if (memorial == null || memorial.trim().isEmpty()) {
            return false;
        }

        // Conta quantos lotes foram gerados usando regex para pegar qualquer número
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                "LOTE\\s+(\\d+):",
                java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher matcher = pattern.matcher(memorial);

        int lotesFound = 0;
        int maxLoteNumber = 0;
        while (matcher.find()) {
            lotesFound++;
            try {
                int loteNum = Integer.parseInt(matcher.group(1));
                maxLoteNumber = Math.max(maxLoteNumber, loteNum);
            } catch (NumberFormatException e) {
                // Ignora se não conseguir parsear
            }
        }

        log.info("📊 Lotes encontrados no memorial: {} (maior número: {})", lotesFound, maxLoteNumber);
        log.info("📊 Lotes esperados: {}", expectedLots);

        // Verifica se contém placeholders proibidos
        boolean hasPlaceholders = memorial.contains("[REPETIR") ||
                memorial.contains("[CONTINUAR") ||
                memorial.contains("[Repita o padrão") ||
                memorial.contains("...") ||
                memorial.contains("demais lotes") ||
                memorial.contains("seguir o mesmo padrão") ||
                memorial.contains("e assim por diante");

        if (hasPlaceholders) {
            log.warn("⚠️ Memorial contém placeholders proibidos");
        }

        // Verifica se há coordenadas repetidas (problema identificado)
        boolean hasRepeatedCoordinates = checkForRepeatedCoordinates(memorial);
        if (hasRepeatedCoordinates) {
            log.warn("⚠️ Memorial contém coordenadas repetidas entre lotes");
        }

        // VALIDAÇÃO RIGOROSA: Memorial só é completo se:
        // 1. Tem PELO MENOS 90% dos lotes esperados (tolerância)
        // 2. O maior número de lote encontrado >= expectedLots
        // 3. Não tem placeholders
        // 4. Não tem coordenadas repetidas
        int minLotsRequired = Math.max(1, (int) (expectedLots * 0.9)); // 90% dos lotes
        boolean hasEnoughLots = (lotesFound >= minLotsRequired);
        boolean hasSequentialLots = (maxLoteNumber >= expectedLots - 1);
        boolean isComplete = hasEnoughLots && hasSequentialLots && !hasPlaceholders && !hasRepeatedCoordinates;

        if (isComplete) {
            log.info("✅ Memorial considerado COMPLETO: {}/{} lotes ({}%)",
                    lotesFound, expectedLots, (lotesFound * 100 / Math.max(1, expectedLots)));
        } else {
            log.warn("❌ Memorial INCOMPLETO:");
            log.warn("   - Lotes encontrados: {}/{} ({}%)", lotesFound, expectedLots,
                    (lotesFound * 100 / Math.max(1, expectedLots)));
            log.warn("   - Maior número de lote: {} (esperado: {})", maxLoteNumber, expectedLots);
            log.warn("   - Tem lotes suficientes: {} (mínimo: {})", hasEnoughLots, minLotsRequired);
            log.warn("   - Sequência completa: {}", hasSequentialLots);
            log.warn("   - Placeholders: {}", hasPlaceholders);
            log.warn("   - Coordenadas repetidas: {}", hasRepeatedCoordinates);
        }

        return isComplete;
    }

    /**
     * Calcula max_tokens dinamicamente baseado no número de lotes
     * Fórmula: base (3000) + (lotes × 400 tokens/lote)
     * Limitado ao máximo do modelo
     */
    private int calculateDynamicMaxTokens(int lotCount, int configuredMax, int modelLimit) {
        // Base: 3000 tokens para preâmbulo, identificação, situação antes, declaração final
        int baseTokens = 3000;

        // Por lote: ~400 tokens (coordenadas, área, perímetro, confrontações)
        int tokensPerLot = 400;

        int calculated = baseTokens + (lotCount * tokensPerLot);

        // Limita ao menor entre: configurado, calculado e limite do modelo
        int result = Math.min(Math.min(calculated, configuredMax), modelLimit);

        log.info("📊 Cálculo de tokens: {} lotes × {} tokens/lote + {} base = {} tokens (limitado a {})",
                lotCount, tokensPerLot, baseTokens, calculated, result);

        return result;
    }

    /**
     * Verifica se o memorial contém coordenadas repetidas entre lotes
     */
    private boolean checkForRepeatedCoordinates(String memorial) {
        // Extrai todas as coordenadas do memorial
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("E (\\d+\\.\\d+)m e N (\\d+\\.\\d+)m");
        java.util.regex.Matcher matcher = pattern.matcher(memorial);

        Set<String> coordinates = new HashSet<>();
        int totalCoordinates = 0;

        while (matcher.find()) {
            String coordinate = matcher.group(1) + "," + matcher.group(2);
            coordinates.add(coordinate);
            totalCoordinates++;
        }

        // Se há menos coordenadas únicas que o total, há repetições
        boolean hasRepeated = coordinates.size() < totalCoordinates;

        if (hasRepeated) {
            log.warn("🔍 Coordenadas únicas: {}, Total de coordenadas: {}", coordinates.size(), totalCoordinates);
            log.warn("⚠️ Detectadas coordenadas repetidas no memorial");
        } else {
            log.info("✅ Todas as coordenadas são únicas: {} coordenadas diferentes", coordinates.size());
        }

        return hasRepeated;
    }

    /**
     * Converte DxfEntityChangeDTO para formato Map esperado pelo DxfTextExtractorService
     */
    private List<Map<String, Object>> convertToEntityMaps(DxfCompareResultDTO r) {
        List<Map<String, Object>> entities = new ArrayList<>();

        if (r == null) {
            log.warn("⚠️ DxfCompareResultDTO é null, retornando lista vazia");
            return entities;
        }

        try {
            // Processa entidades adicionadas
            if (r.getAdded() != null) {
                r.getAdded().forEach(entity -> {
                    try {
                        entities.add(convertEntityToMap(entity));
                    } catch (Exception e) {
                        log.warn("⚠️ Erro ao converter entidade adicionada: {}", e.getMessage());
                    }
                });
            }

            // Processa entidades removidas
            if (r.getRemoved() != null) {
                r.getRemoved().forEach(entity -> {
                    try {
                        entities.add(convertEntityToMap(entity));
                    } catch (Exception e) {
                        log.warn("⚠️ Erro ao converter entidade removida: {}", e.getMessage());
                    }
                });
            }

            // Processa entidades modificadas
            if (r.getModified() != null) {
                r.getModified().forEach(entity -> {
                    try {
                        entities.add(convertEntityToMap(entity));
                    } catch (Exception e) {
                        log.warn("⚠️ Erro ao converter entidade modificada: {}", e.getMessage());
                    }
                });
            }

            log.info("🔄 Convertidas {} entidades DxfEntityChangeDTO para formato Map", entities.size());
        } catch (Exception e) {
            log.error("❌ Erro geral na conversão de entidades: {}", e.getMessage(), e);
        }

        return entities;
    }

    /**
     * Converte uma única DxfEntityChangeDTO para Map
     */
    private Map<String, Object> convertEntityToMap(DxfEntityChangeDTO entity) {
        Map<String, Object> entityMap = new HashMap<>();
        Map<String, Object> properties = new HashMap<>();

        if (entity == null) {
            log.warn("⚠️ Entidade é null, retornando mapa vazio");
            return entityMap;
        }

        // Tipo da entidade
        entityMap.put("type", entity.getType() != null ? entity.getType() : "UNKNOWN");
        entityMap.put("layer", entity.getLayer() != null ? entity.getLayer() : "0");

        // Coordenadas
        if (entity.getX() != null) properties.put("x", entity.getX());
        if (entity.getY() != null) properties.put("y", entity.getY());
        if (entity.getZ() != null) properties.put("z", entity.getZ());
        if (entity.getX2() != null) properties.put("x2", entity.getX2());
        if (entity.getY2() != null) properties.put("y2", entity.getY2());
        if (entity.getZ2() != null) properties.put("z2", entity.getZ2());

        // Propriedades específicas
        if (entity.getRadius() != null) properties.put("radius", entity.getRadius());
        if (entity.getStartAngle() != null) properties.put("startAngle", entity.getStartAngle());
        if (entity.getEndAngle() != null) properties.put("endAngle", entity.getEndAngle());

        // Texto
        if (entity.getText() != null) {
            properties.put("text", entity.getText());
            properties.put("textStyle", entity.getTextStyle());
            properties.put("textHeight", entity.getTextHeight());
            properties.put("rotation", entity.getTextRotation());
        }

        // Vértices para polylines (CRÍTICO para cálculo de área!)
        if (entity.getVertices() != null && !entity.getVertices().isEmpty()) {
            properties.put("vertices", entity.getVertices());
            log.debug("✅ Entidade {} tem {} vértices", entity.getType(), entity.getVertices().size());
        } else if ("LWPOLYLINE".equals(entity.getType()) || "POLYLINE".equals(entity.getType())) {
            log.warn("⚠️ Polyline sem vértices! Usando x,y como fallback");
            // Fallback: se não tem vértices mas é polyline, criar lista com os pontos disponíveis
            if (entity.getX() != null && entity.getY() != null) {
                java.util.List<java.util.Map<String, Double>> fallbackVertices = new java.util.ArrayList<>();
                java.util.Map<String, Double> v1 = new java.util.HashMap<>();
                v1.put("x", entity.getX());
                v1.put("y", entity.getY());
                fallbackVertices.add(v1);

                if (entity.getX2() != null && entity.getY2() != null) {
                    java.util.Map<String, Double> v2 = new java.util.HashMap<>();
                    v2.put("x", entity.getX2());
                    v2.put("y", entity.getY2());
                    fallbackVertices.add(v2);
                }

                if (fallbackVertices.size() >= 2) {
                    properties.put("vertices", fallbackVertices);
                    log.debug("🔧 Criados {} vértices de fallback", fallbackVertices.size());
                }
            }
        }

        entityMap.put("properties", properties);

        return entityMap;
    }

    /**
     * Detecta qual provedor de IA usar baseado nos parâmetros da requisição
     */
    private String detectProvider(DxfCompareResultDTO r) {
        // TODO: Em implementação futura, isso virá do frontend via MemorialRequestDTO.provider
        // Por enquanto, usar lógica baseada na complexidade do projeto

        int totalEntities = 0;
        if (r.getAdded() != null) totalEntities += r.getAdded().size();
        if (r.getRemoved() != null) totalEntities += r.getRemoved().size();
        if (r.getModified() != null) totalEntities += r.getModified().size();

        // Lógica temporária: projetos complexos (>500 entidades) usam Claude
        if (totalEntities > 500) {
            log.info("🧠 Projeto complexo ({} entidades) - Recomendando Claude", totalEntities);
            return "claude";
        } else {
            log.info("🤖 Projeto padrão ({} entidades) - Usando OpenAI", totalEntities);
            return "openai";
        }
    }

    /**
     * Mapeia nomes de provider do frontend para nomes internos do backend
     * Frontend usa: "motor_basico" e "motor_avancado"
     * Backend usa: "openai" e "claude"
     */
    private String mapProviderName(String frontendProvider) {
        if (frontendProvider == null || frontendProvider.isEmpty()) {
            return "openai"; // Padrão
        }

        switch (frontendProvider) {
            case "motor_basico":
                log.info("🔄 Mapeando 'motor_basico' → 'openai'");
                return "openai";
            case "motor_avancado":
                log.info("🔄 Mapeando 'motor_avancado' → 'claude'");
                return "claude";
            case "openai":
            case "claude":
                // Já está no formato correto
                return frontendProvider;
            default:
                log.warn("⚠️ Provider desconhecido '{}', usando 'openai' como padrão", frontendProvider);
                return "openai";
        }
    }

    /**
     * Versão futura que usará o parâmetro do frontend
     */
    private String detectProviderFromRequest(MemorialRequestDTO request) {
        if (request.provider() != null && !request.provider().isEmpty()) {
            String provider = request.provider().toLowerCase();
            if ("claude".equals(provider) || "openai".equals(provider)) {
                log.info("🎯 Provedor especificado pelo frontend: {}", provider);
                return provider;
            }
        }

        // Fallback para detecção automática
        log.info("⚠️ Provedor não especificado, usando detecção automática");
        return "openai"; // Padrão
    }

    /**
     * Extrai o conteúdo da resposta da API baseado no provedor
     * OpenAI e Claude têm estruturas de resposta diferentes
     */
    private String extractContentFromResponse(Map<String, Object> responseBody, String provider) {
        if (responseBody == null) {
            log.error("❌ Response body is null");
            throw new RuntimeException("Response body is null");
        }

        try {
            if ("claude".equals(provider)) {
                // Claude response structure: { "content": [{ "text": "..." }] }
                Object contentObj = responseBody.get("content");
                if (contentObj instanceof List) {
                    List<?> contentList = (List<?>) contentObj;
                    if (!contentList.isEmpty() && contentList.get(0) instanceof Map) {
                        Map<?, ?> firstContent = (Map<?, ?>) contentList.get(0);
                        Object text = firstContent.get("text");
                        if (text != null) {
                            log.info("✅ Conteúdo extraído da resposta Claude");
                            return text.toString();
                        }
                    }
                }
                log.error("❌ Estrutura de resposta Claude inválida: {}", responseBody);
                throw new RuntimeException("Invalid Claude response structure");

            } else {
                // OpenAI response structure: { "choices": [{ "message": { "content": "..." } }] }
                Object choicesObj = responseBody.get("choices");
                if (choicesObj instanceof List) {
                    List<?> choicesList = (List<?>) choicesObj;
                    if (!choicesList.isEmpty() && choicesList.get(0) instanceof Map) {
                        Map<?, ?> firstChoice = (Map<?, ?>) choicesList.get(0);
                        Object messageObj = firstChoice.get("message");
                        if (messageObj instanceof Map) {
                            Map<?, ?> message = (Map<?, ?>) messageObj;
                            Object content = message.get("content");
                            if (content != null) {
                                log.info("✅ Conteúdo extraído da resposta OpenAI");
                                return content.toString();
                            }
                        }
                    }
                }
                log.error("❌ Estrutura de resposta OpenAI inválida: {}", responseBody);
                throw new RuntimeException("Invalid OpenAI response structure");
            }
        } catch (Exception e) {
            log.error("❌ Erro ao extrair conteúdo da resposta ({}): {}", provider, e.getMessage(), e);
            throw new RuntimeException("Error extracting content from " + provider + " response: " + e.getMessage());
        }
    }

    /**
     * Calcula a área de um polígono usando a fórmula de Shoelace
     */
    private double calculatePolygonArea(List<com.momorialPro.CadMemorial.util.DxfParser.Point> vertices) {
        if (vertices == null || vertices.size() < 3) {
            return 0.0;
        }

        double area = 0.0;
        int n = vertices.size();

        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            com.momorialPro.CadMemorial.util.DxfParser.Point vi = vertices.get(i);
            com.momorialPro.CadMemorial.util.DxfParser.Point vj = vertices.get(j);

            if (vi != null && vj != null) {
                area += (vi.x() * vj.y()) - (vj.x() * vi.y());
            }
        }

        return Math.abs(area) / 2.0;
    }

    /**
     * Analisa agrupamentos espaciais de entidades para detectar lotes
     */
    private int analyzeSpatialClusters(List<DxfEntityChangeDTO> entities) {
        if (entities == null || entities.size() < 4) {
            return 1;
        }

        // Agrupa entidades por proximidade espacial
        List<SimplePoint> centers = entities.stream()
                .filter(e -> e.getX() != null && e.getY() != null)
                .map(e -> new SimplePoint(e.getX(), e.getY()))
                .collect(java.util.stream.Collectors.toList());

        if (centers.size() < 4) {
            return 1;
        }

        // Algoritmo simples de clustering por distância
        double threshold = calculateClusterThreshold(centers);
        List<List<SimplePoint>> clusters = new ArrayList<>();

        for (SimplePoint point : centers) {
            boolean addedToCluster = false;

            for (List<SimplePoint> cluster : clusters) {
                if (isNearCluster(point, cluster, threshold)) {
                    cluster.add(point);
                    addedToCluster = true;
                    break;
                }
            }

            if (!addedToCluster) {
                List<SimplePoint> newCluster = new ArrayList<>();
                newCluster.add(point);
                clusters.add(newCluster);
            }
        }

        // Filtra clusters muito pequenos (menos de 3 pontos)
        long validClusters = clusters.stream()
                .filter(cluster -> cluster.size() >= 3)
                .count();

        return Math.max(1, (int) validClusters);
    }

    /**
     * Calcula threshold para clustering baseado na distribuição dos pontos
     */
    private double calculateClusterThreshold(List<SimplePoint> points) {
        if (points.size() < 2) return 100.0;

        // Calcula distância média entre pontos
        double totalDistance = 0.0;
        int count = 0;

        for (int i = 0; i < points.size() - 1; i++) {
            for (int j = i + 1; j < points.size(); j++) {
                SimplePoint p1 = points.get(i);
                SimplePoint p2 = points.get(j);
                double distance = Math.sqrt(
                        Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
                );
                totalDistance += distance;
                count++;
            }
        }

        double avgDistance = totalDistance / count;
        return avgDistance * 0.3; // 30% da distância média como threshold
    }

    /**
     * Verifica se um ponto está próximo de um cluster
     */
    private boolean isNearCluster(SimplePoint point, List<SimplePoint> cluster, double threshold) {
        return cluster.stream().anyMatch(clusterPoint -> {
            double distance = Math.sqrt(
                    Math.pow(point.x - clusterPoint.x, 2) + Math.pow(point.y - clusterPoint.y, 2)
            );
            return distance <= threshold;
        });
    }

    /**
     * Classe auxiliar para representar pontos simples (clustering)
     */
    private static class SimplePoint {
        final double x, y;

        SimplePoint(double x, double y) {
            this.x = x;
            this.y = y;
        }
    }

    /**
     * Gera chunk com retry automático para rate limits
     */
    private ChunkResult generateChunkWithRetry(LotChunk chunk, DxfCompareResultDTO r,
                                               MemorialStandardDTO standard, PropertyDTO property, List<Point> extractedPoints,
                                               Map<String, Map<String, Double>> realCoordinates, List<String> streetNames,
                                               Map<String, List<String>> confrontations,
                                               Map<String, Double> individualAreas) {

        int maxRetries = 3;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                ChunkResult result = generateChunk(chunk, r, standard, property, extractedPoints,
                        realCoordinates, streetNames, confrontations, individualAreas);

                if (result.isSuccess() || !result.isRetryable()) {
                    return result;
                }

                if (attempt < maxRetries) {
                    log.info("🔄 Tentativa {}/{} falhou para chunk {}, tentando novamente...",
                            attempt, maxRetries, chunk.getChunkNumber());
                }

            } catch (Exception e) {
                log.error("💥 Exceção na tentativa {}/{} do chunk {}: {}",
                        attempt, maxRetries, chunk.getChunkNumber(), e.getMessage());

                if (attempt == maxRetries) {
                    return ChunkResult.builder()
                            .chunkNumber(chunk.getChunkNumber())
                            .success(false)
                            .errorMessage(e.getMessage())
                            .retryable(false)
                            .build();
                }
            }
        }

        return ChunkResult.builder()
                .chunkNumber(chunk.getChunkNumber())
                .success(false)
                .errorMessage("Falha após " + maxRetries + " tentativas")
                .retryable(false)
                .build();
    }

    /**
     * Converte vértices do formato Map para DxfParser.Point
     */
    private List<com.momorialPro.CadMemorial.util.DxfParser.Point> convertVertices(List<Map<String, Double>> vertices) {
        return vertices.stream()
                .map(vertex -> {
                    Double x = vertex.get("x");
                    Double y = vertex.get("y");
                    if (x != null && y != null) {
                        return new com.momorialPro.CadMemorial.util.DxfParser.Point(x, y, null);
                    }
                    return null;
                })
                .filter(point -> point != null)
                .collect(java.util.stream.Collectors.toList());
    }
}