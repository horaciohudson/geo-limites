package com.momorialPro.CadMemorial.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.DxfEntityChangeDTO;
import com.momorialPro.CadMemorial.dto.MemorialStandardDTO;
import com.momorialPro.CadMemorial.dto.ProcessingContextStatusDTO;
import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.dto.SelectedConfrontationTextDTO;
import com.momorialPro.CadMemorial.dto.SelectedReferencePointDTO;
import com.momorialPro.CadMemorial.exception.OpenAiQuotaExceededException;
import com.momorialPro.CadMemorial.exception.OpenAiRateLimitException;
import com.momorialPro.CadMemorial.security.AuthUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemorialApiService {

    private enum DerivationScope {
        TECHNICAL_SUMMARY("resumo tecnico"),
        LEGACY_MEMORIAL("memorial legado");

        private final String label;

        DerivationScope(String label) {
            this.label = label;
        }
    }

    private static final Pattern ORDER_LABEL_PATTERN = Pattern.compile(
            "(?i)^\\s*(?:P|PT|PONTO|V|ESTACA|E)\\s*[-_:/#]*\\s*0*(\\d{1,4})\\s*$"
    );
    private final MemorialStandardService memorialStandardService;
    private final MemorialCacheService cacheService;
    private final MemorialMetricsService metricsService;
    private final PropertyService propertyService;
    private final ManualFrontageAnalysisService manualFrontageAnalysisService;
    private final LotTopologyService lotTopologyService;
    private final MemorialAlignmentService memorialAlignmentService;
    private final TechnicalSummaryService technicalSummaryService;
    private final DeterministicMemorialService deterministicMemorialService;
    private final MemorialLlmSupportService memorialLlmSupportService;
    private final MemorialPromptContextService memorialPromptContextService;
    private final MemorialPreparationService memorialPreparationService;
    private final MemorialDocumentAssemblyService memorialDocumentAssemblyService;
    private final TemplateService templateService;

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
    private ObjectMapper objectMapper;

    @Autowired
    private ApiSettingsService apiSettingsService;

    @Value("${memorialpro.claude.max-retries:3}")
    private int maxRetries;

    // Configurações de particionamento
    @Value("${memorialpro.memorial.partition.enabled:true}")
    private boolean partitionEnabled;

    @Value("${memorialpro.memorial.partition.threshold:15}")
    private int partitionThreshold;

    @Value("${memorialpro.memorial.partition.chunk-size:10}")
    private int sovereignLotsPerChunk;

    // Fallback
    @Value("${memorialpro.llm.fallback-enabled:true}")
    private boolean fallbackEnabled;

    /**
     * Método principal de geração de memorial.
     * Usa geracao assistida com particionamento inteligente quando necessario.
     */
    public String generate(DxfCompareResultDTO r, UUID standardId, UUID userId, UUID propertyId) {
        return generate(r, standardId, userId, propertyId, null, null, null, null);
    }

    public String generate(DxfCompareResultDTO r, UUID standardId, UUID userId, UUID propertyId,
                           Integer lotCountOverride, List<String> selectedLayers,
                           List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        return generate(r, standardId, userId, propertyId, lotCountOverride, selectedLayers, selectedConfrontationTexts, null);
    }

    public String generate(DxfCompareResultDTO r, UUID standardId, UUID userId, UUID propertyId,
                           Integer lotCountOverride, List<String> selectedLayers,
                           List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
                           List<SelectedReferencePointDTO> selectedReferencePoints) {
        long startTime = System.currentTimeMillis();
        String provider = resolveMemorialProvider();

        // Gera chave de cache e limpa entrada existente para forçar regeneração
        String cacheKey = cacheService.generateCacheKey(r);
        cacheService.removeFromCache(cacheKey);

        if (!memorialLlmSupportService.hasValidConfiguredProviderKey(provider)) {
            log.error("Provedor {} configurado sem credencial valida para memoriais", provider);

            if (fallbackEnabled) {
                log.warn("Usando modo FALLBACK - gerando memorial sem IA");
                return generateFallbackMemorial(r, standardId);
            }

            return "ERRO DE CONFIGURACAO\\n\\nA chave do provedor de geracao assistida nao esta configurada.";
        }

        LegacyGenerationContext context = buildLegacyGenerationContext(
                r,
                standardId,
                userId,
                propertyId,
                lotCountOverride,
                selectedConfrontationTexts,
                selectedReferencePoints
        );

        // Buscar norma
        MemorialStandardDTO standard = memorialStandardService.findById(standardId).orElse(null);
        if (standard == null) {
            log.error("❌ ERRO CRÍTICO: Norma com ID {} não encontrada!", standardId);
            throw new RuntimeException("Norma não encontrada: " + standardId);
        }

        // DECISÃO: Usar particionamento ou geração única?
        // Particiona projetos maiores para respeitar limites de resposta do provedor.
        int haikuThreshold = Math.max(1, partitionThreshold);
        
        if (partitionEnabled && context.estimatedLotCount() > haikuThreshold) {
            return generateWithPartitioning(
                    r,
                    standard,
                    startTime,
                    provider,
                    context,
                    selectedLayers,
                    selectedConfrontationTexts
            );
        } else {
            return generateSingleCall(
                    r,
                    standard,
                    standardId,
                    startTime,
                    provider,
                    context,
                    selectedLayers,
                    selectedConfrontationTexts
            );
        }
    }

    public String generateFromTechnicalSummary(
            DxfCompareResultDTO compareResult,
            UUID standardId,
            UUID userId,
            UUID propertyId,
            Integer lotCountOverride,
            List<String> selectedLayers,
            String technicalSummaryJson,
            String documentSummaryJson,
            String templateName,
            String templateBackendId) {
        long startTime = System.currentTimeMillis();
        String cacheKey = generateTechnicalSummaryCacheKey(
                standardId,
                propertyId,
                lotCountOverride,
                selectedLayers,
                technicalSummaryJson,
                templateName,
                templateBackendId
        );
        cacheService.removeFromCache(cacheKey);

        MemorialStandardDTO standard = memorialStandardService.findById(standardId).orElse(null);
        if (standard == null) {
            log.error("Norma com ID {} nao encontrada para geracao por resumo tecnico", standardId);
            throw new RuntimeException("Norma nao encontrada: " + standardId);
        }

        PropertyDTO property = null;
        if (propertyId != null) {
            try {
                property = propertyService.findByIdWithRelationships(propertyId, userId);
            } catch (Exception e) {
                log.error("Erro ao buscar propriedade para memorial por resumo tecnico: {}", e.getMessage());
            }
        }

        TechnicalSummaryService.ParsedTechnicalSummary parsedSummary =
                technicalSummaryService.parseTechnicalSummaryJson(technicalSummaryJson);
        List<LotTechnicalSummary> expectedSummaries = new ArrayList<>(parsedSummary.summaries());
        if (lotCountOverride != null && lotCountOverride > 0 && lotCountOverride < expectedSummaries.size()) {
            expectedSummaries = new ArrayList<>(expectedSummaries.subList(0, lotCountOverride));
        }
        if (expectedSummaries.isEmpty()) {
            throw new IllegalArgumentException("O resumo tecnico nao trouxe lotes suficientes para gerar o memorial.");
        }

        TemplateService.AppliedTemplateContext appliedTemplate =
                templateService.resolveAppliedTemplate(templateBackendId, templateName);
        String resolvedDocumentSummaryJson = resolveDocumentSummaryJson(
                compareResult,
                property,
                expectedSummaries,
                selectedLayers,
                parsedSummary.processingContext(),
                documentSummaryJson
        );

        log.info(
                "Fluxo soberano do memorial: propertyId={}, lotes={}, technicalSummaryJsonChars={}, documentSummaryJsonChars={}, templateBackendId='{}', templateName='{}', templateContentChars={}",
                propertyId,
                expectedSummaries.size(),
                technicalSummaryJson != null ? technicalSummaryJson.length() : 0,
                resolvedDocumentSummaryJson != null ? resolvedDocumentSummaryJson.length() : 0,
                templateBackendId != null ? templateBackendId : "",
                appliedTemplate.templateName() != null ? appliedTemplate.templateName() : "",
                appliedTemplate.templateContent() != null ? appliedTemplate.templateContent().length() : 0
        );

        int estimatedLotCount = expectedSummaries.size();
        String result = buildSovereignTechnicalSummaryMemorial(
                "technical-summary-sovereign",
                standard,
                property,
                compareResult,
                expectedSummaries,
                technicalSummaryJson,
                resolvedDocumentSummaryJson,
                appliedTemplate.templateName(),
                appliedTemplate.templateContent()
        );
        long processingTime = System.currentTimeMillis() - startTime;
        int entitiesProcessed = (compareResult.getAdded() != null ? compareResult.getAdded().size() : 0) +
                (compareResult.getRemoved() != null ? compareResult.getRemoved().size() : 0) +
                (compareResult.getModified() != null ? compareResult.getModified().size() : 0);
        metricsService.recordSuccessfulGeneration(processingTime, estimatedLotCount, entitiesProcessed, result.length());
        cacheService.putInCache(cacheKey, result, estimatedLotCount);
        return result;
    }

    public String generateTechnicalSummary(
            DxfCompareResultDTO r,
            UUID userId,
            UUID propertyId,
            Integer lotCountOverride,
            List<String> selectedLayers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        return generateTechnicalSummary(
                r,
                userId,
                propertyId,
                lotCountOverride,
                selectedLayers,
                selectedConfrontationTexts,
                null
        );
    }

    public String generateTechnicalSummary(
            DxfCompareResultDTO r,
            UUID userId,
            UUID propertyId,
            Integer lotCountOverride,
            List<String> selectedLayers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            List<SelectedReferencePointDTO> selectedReferencePoints) {
        return generateTechnicalSummaryPayload(
                r,
                userId,
                propertyId,
                lotCountOverride,
                selectedLayers,
                null,
                null,
                null,
                null,
                selectedConfrontationTexts,
                selectedReferencePoints
        ).summaryText();
    }

    public TechnicalSummaryPayload generateTechnicalSummaryPayload(
            DxfCompareResultDTO r,
            UUID userId,
            UUID propertyId,
            Integer lotCountOverride,
            List<String> selectedLayers,
            List<Integer> detectedLotNumbers,
            List<Integer> selectedLotNumbers,
            List<Integer> partialReplacementLotNumbers,
            List<Integer> manualReviewLotNumbers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        return generateTechnicalSummaryPayload(
                r,
                userId,
                propertyId,
                lotCountOverride,
                selectedLayers,
                detectedLotNumbers,
                selectedLotNumbers,
                partialReplacementLotNumbers,
                manualReviewLotNumbers,
                selectedConfrontationTexts,
                null
        );
    }

    public TechnicalSummaryPayload generateTechnicalSummaryPayload(
            DxfCompareResultDTO r,
            UUID userId,
            UUID propertyId,
            Integer lotCountOverride,
            List<String> selectedLayers,
            List<Integer> detectedLotNumbers,
            List<Integer> selectedLotNumbers,
            List<Integer> partialReplacementLotNumbers,
            List<Integer> manualReviewLotNumbers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            List<SelectedReferencePointDTO> selectedReferencePoints) {
        TechnicalSummaryDerivationContext derivationContext = prepareTechnicalSummaryDerivationContext(
                r,
                userId,
                propertyId,
                lotCountOverride,
                selectedConfrontationTexts,
                selectedReferencePoints,
                DerivationScope.TECHNICAL_SUMMARY,
                false
        );
        LotScope lotScope = resolveLotScope(selectedLayers, derivationContext.estimatedLotCount());

        List<LotTechnicalSummary> summaries = deriveLotTechnicalSummariesFromEntities(
                derivationContext.allEntities(),
                derivationContext.confrontations(),
                detectedLotNumbers,
                selectedConfrontationTexts,
                derivationContext.georeferencingTransform(),
                lotScope.startLotNumber(),
                lotScope.maxLots()
        );
        summaries = filterSummariesBySelectedLotNumbers(summaries, selectedLotNumbers);
        summaries = applyManualReviewLotOverrides(summaries, manualReviewLotNumbers);

        return buildTechnicalSummaryPayload(
                r,
                derivationContext.property(),
                summaries,
                selectedLayers,
                derivationContext.processingContext(),
                selectedLotNumbers,
                partialReplacementLotNumbers,
                manualReviewLotNumbers
        );
    }

    private LegacyGenerationContext buildLegacyGenerationContext(
            DxfCompareResultDTO compareResult,
            UUID standardId,
            UUID userId,
            UUID propertyId,
            Integer lotCountOverride,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            List<SelectedReferencePointDTO> selectedReferencePoints) {
        TechnicalSummaryDerivationContext derivationContext = prepareTechnicalSummaryDerivationContext(
                compareResult,
                userId,
                propertyId,
                lotCountOverride,
                selectedConfrontationTexts,
                selectedReferencePoints,
                DerivationScope.LEGACY_MEMORIAL,
                true
        );
        List<Map<String, Object>> allEntities = derivationContext.allEntities();
        PropertyDTO property = derivationContext.property();
        DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform =
                derivationContext.georeferencingTransform();
        LegacySpatialContext spatialContext = prepareLegacySpatialContext(
                compareResult,
                property,
                allEntities,
                georeferencingTransform
        );

        LegacyTextContext legacyTextContext = prepareLegacyTextContext(allEntities, selectedConfrontationTexts);
        int estimatedLotCount = derivationContext.estimatedLotCount();
        List<LotTechnicalSummary> expectedSummaries = derivationContext.expectedSummaries();

        UUID tenantId = AuthUtils.getCurrentTenantId();
        String memorialBaseJson = memorialPreparationService.buildMemorialBaseJson(
                compareResult,
                property,
                tenantId,
                userId,
                propertyId,
                standardId,
                spatialContext.realCoordinates(),
                legacyTextContext.streetNames(),
                derivationContext.confrontations(),
                legacyTextContext.individualAreas(),
                estimatedLotCount,
                georeferencingTransform,
                spatialContext.coordenadaBase()
        );

        return new LegacyGenerationContext(
                property,
                spatialContext.extractedPoints(),
                spatialContext.realCoordinates(),
                legacyTextContext.streetNames(),
                derivationContext.confrontations(),
                legacyTextContext.individualAreas(),
                expectedSummaries,
                estimatedLotCount,
                spatialContext.coordenadaBase(),
                georeferencingTransform,
                derivationContext.processingContext(),
                memorialBaseJson
        );
    }

    private TechnicalSummaryDerivationContext prepareTechnicalSummaryDerivationContext(
            DxfCompareResultDTO compareResult,
            UUID userId,
            UUID propertyId,
            Integer lotCountOverride,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            List<SelectedReferencePointDTO> selectedReferencePoints,
            DerivationScope scope,
            boolean includeExpectedSummaries) {
        List<Map<String, Object>> allEntities = convertToEntityMaps(compareResult);

        PropertyDTO property = null;
        if (propertyId != null) {
            try {
                property = propertyService.findByIdWithRelationships(propertyId, userId);
            } catch (Exception e) {
                log.error("Erro ao buscar propriedade para {}: {}", scope.label, e.getMessage());
            }
        }
        property = memorialPreparationService.mergeSelectedReferencePointsIntoProperty(property, selectedReferencePoints);

        DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform =
                geoExtractorService.buildTransformFromLandmarks(allEntities, property);

        Map<String, List<String>> confrontations = manualFrontageAnalysisService.mergeManualConfrontations(
                dxfTextExtractorService.extractConfrontations(allEntities),
                selectedConfrontationTexts
        );

        int estimatedLotCount = resolveRequestedLotCount(compareResult, lotCountOverride, countScopedLots(allEntities));
        MemorialProcessingContext processingContext = memorialPreparationService.extractProcessingContext(selectedReferencePoints);
        List<LotTechnicalSummary> expectedSummaries = includeExpectedSummaries
                ? deriveLotTechnicalSummariesFromEntities(
                        allEntities,
                        confrontations,
                        null,
                        selectedConfrontationTexts,
                        georeferencingTransform,
                        1,
                        estimatedLotCount
                )
                : List.of();

        return new TechnicalSummaryDerivationContext(
                property,
                allEntities,
                georeferencingTransform,
                confrontations,
                processingContext,
                estimatedLotCount,
                expectedSummaries
        );
    }

    private LegacySpatialContext prepareLegacySpatialContext(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<Map<String, Object>> allEntities,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {
        List<SimplePoint> extractedPoints = memorialPreparationService.extractPointsFromEntities(compareResult);
        Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates;
        DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase = null;

        if (georeferencingTransform != null) {
            extractedPoints = memorialPreparationService.applyGeoreferencingTransform(extractedPoints, georeferencingTransform);
            realCoordinates = memorialPreparationService.buildRealCoordinatesFromTransform(georeferencingTransform);
        } else {
            realCoordinates = coordinateExtractionService.extractRealCoordinates(allEntities);
            coordenadaBase = memorialPreparationService.tentarCoordenadaManual(property);
            if (coordenadaBase == null) {
                coordenadaBase = geoExtractorService.extrairCoordenadaBase(allEntities);
            }

            if (coordenadaBase != null) {
                Map<String, CoordinateExtractionService.RealCoordinate> coordinatesWithBase = new LinkedHashMap<>();
                if (realCoordinates != null && !realCoordinates.isEmpty()) {
                    coordinatesWithBase.putAll(realCoordinates);
                }
                coordinatesWithBase.putIfAbsent(
                        "BASE_SIRGAS",
                        new CoordinateExtractionService.RealCoordinate(
                                coordenadaBase.getE(),
                                coordenadaBase.getN(),
                                coordenadaBase.getFonte()
                        )
                );
                realCoordinates = coordinatesWithBase;
            }
        }

        return new LegacySpatialContext(
                memorialPreparationService.filterAndReducePoints(extractedPoints),
                realCoordinates,
                coordenadaBase
        );
    }

    private LegacyTextContext prepareLegacyTextContext(
            List<Map<String, Object>> allEntities,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        List<String> streetNames = manualFrontageAnalysisService.mergeManualStreetNames(
                dxfTextExtractorService.extractStreetNames(allEntities),
                selectedConfrontationTexts
        );

        Map<String, Double> individualAreas = dxfTextExtractorService.calculateIndividualAreas(allEntities);

        return new LegacyTextContext(streetNames, individualAreas);
    }

    private String resolveMemorialProvider() {
        String provider = apiSettingsService.getSettings().getMemorialApiProvider();
        return provider == null || provider.isBlank() ? "CLAUDE" : provider.trim();
    }

    /**
     * Gera memorial em uma unica chamada para projetos pequenos ou medios.
     */
    private String generateSingleCall(
            DxfCompareResultDTO r,
            MemorialStandardDTO standard,
            UUID standardId,
            long startTime,
            String provider,
            LegacyGenerationContext context,
            List<String> selectedLayers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        List<LotTechnicalSummary> expectedSummaries = resolveScopedExpectedSummaries(context, selectedLayers);

        String prompt = memorialPromptContextService.buildPrompt(
                r,
                standard,
                context.property(),
                context.extractedPoints(),
                context.realCoordinates(),
                context.streetNames(),
                context.confrontations(),
                context.individualAreas(),
                selectedLayers,
                selectedConfrontationTexts,
                expectedSummaries,
                context.estimatedLotCount(),
                context.memorialBaseJson()
        );

        // Calcula max_tokens dinamicamente
        int dynamicMaxTokens = memorialLlmSupportService.calculateDynamicMaxTokens(context.estimatedLotCount());

        // System prompt
        List<Map<String, Object>> systemPrompt = promptCacheService.buildCachedSystemPrompt(standard);

        if (memorialLlmSupportService.isOpenAiProvider(provider)) {
            return generateWithOpenAi(
                    prompt,
                    systemPrompt,
                    expectedSummaries,
                    context.estimatedLotCount(),
                    r,
                    standard,
                    context.property(),
                    context.processingContext()
            );
        }

        // TENTATIVA COM RETRY
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String content = enforceDeterministicConfrontationSections(
                                memorialDocumentAssemblyService.normalizeMemorialLotOrdering(
                                memorialLlmSupportService.sanitizeMemorialText(
                                        memorialLlmSupportService.requestClaudeSingleCall(prompt, systemPrompt, dynamicMaxTokens)
                                )
                        ),
                        expectedSummaries
                );
                MemorialAlignmentCheck alignmentCheck = validateMemorialAlignment("single-call", content, expectedSummaries);
                logMemorialAlignment("single-call", content, expectedSummaries, alignmentCheck);

                // Validação de completude
                boolean isComplete = memorialAlignmentService.validateCompleteness(content, expectedSummaries);
                if (!alignmentCheck.valid() || !isComplete) {
                    if (!alignmentCheck.valid()) {
                        log.warn("Resposta da IA rejeitada no modo unico: {}", alignmentCheck.blockingIssues());
                    }
                    if (!isComplete) {
                        log.warn("⚠️ MEMORIAL INCOMPLETO: Não contém todos os {} lotes esperados", context.estimatedLotCount());
                    }

                    if (attempt < maxRetries) {
                        continue;
                    }

                    return buildDeterministicFullMemorial(
                            "single-call",
                            standard,
                            context.property(),
                            r,
                            expectedSummaries,
                            context.processingContext(),
                            alignmentCheck.valid() ? null : new RuntimeException(String.join(" | ", alignmentCheck.blockingIssues()))
                    );
                }

                String result = content;

                // Registra métricas e cache
                long processingTime = System.currentTimeMillis() - startTime;
                int estimatedLots = context.estimatedLotCount();
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
                    continue;
                } else {
                    if (fallbackEnabled) {
                        log.warn("🔄 Todas as tentativas falharam, usando fallback");
                        if (!expectedSummaries.isEmpty()) {
                            return buildDeterministicFullMemorial(
                                    "single-call",
                                    standard,
                                    context.property(),
                                    r,
                                    expectedSummaries,
                                    context.processingContext(),
                                    e
                            );
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
            PropertyDTO property,
            MemorialProcessingContext processingContext) {
        if (!memorialLlmSupportService.hasValidConfiguredProviderKey("OPENAI")) {
            throw new IllegalStateException("API Key da OpenAI não configurada (OPENAI_API_KEY).");
        }

        long startTime = System.currentTimeMillis();

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String content = enforceDeterministicConfrontationSections(
                        memorialDocumentAssemblyService.normalizeMemorialLotOrdering(
                                memorialLlmSupportService.sanitizeMemorialText(
                                        memorialLlmSupportService.requestOpenAiSingleCall(prompt, systemPrompt)
                                )
                        ),
                        expectedSummaries
                );
                MemorialAlignmentCheck alignmentCheck = validateMemorialAlignment("single-call-openai", content, expectedSummaries);
                logMemorialAlignment("single-call-openai", content, expectedSummaries, alignmentCheck);

                boolean isComplete = memorialAlignmentService.validateCompleteness(content, expectedSummaries);
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
                            processingContext,
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

                if (memorialLlmSupportService.isOpenAiQuotaExceeded(e, responseBody)) {
                    throw new OpenAiQuotaExceededException(
                            "A conta da OpenAI esta sem cota disponivel ou com problema de faturamento.",
                            e
                    );
                }

                if (memorialLlmSupportService.isOpenAiRateLimit(e, responseBody)) {
                    if (attempt == maxRetries) {
                        if (!expectedSummaries.isEmpty()) {
                            log.warn("Rate limit da OpenAI no modo unico; ativando fallback tecnico deterministico.");
                            return buildDeterministicFullMemorial(
                                    "single-call-openai",
                                    standard,
                                    property,
                                    r,
                                    expectedSummaries,
                                    processingContext,
                                    e
                            );
                        }
                        if (fallbackEnabled) {
                            return generateFallbackMemorial(r, null);
                        }
                        throw new OpenAiRateLimitException(
                                "A OpenAI atingiu o limite temporario de requisicoes/tokens. Tente novamente em alguns segundos.",
                                e
                        );
                    }
                    continue;
                }

                if (attempt == maxRetries) {
                    if (fallbackEnabled) {
                        if (!expectedSummaries.isEmpty()) {
                            return buildDeterministicFullMemorial(
                                    "single-call-openai",
                                    standard,
                                    property,
                                    r,
                                    expectedSummaries,
                                    processingContext,
                                    e
                            );
                        }
                        return generateFallbackMemorial(r, null);
                    }
                    throw new RuntimeException("Falha na geração do memorial (OpenAI) após " + maxRetries + " tentativas: " + e.getMessage(), e);
                }
                continue;
            } catch (Exception e) {
                log.error("Exceção na tentativa {} da OpenAI: {}", attempt, e.getMessage());
                if (attempt == maxRetries) {
                    if (fallbackEnabled) {
                        if (!expectedSummaries.isEmpty()) {
                            return buildDeterministicFullMemorial(
                                    "single-call-openai",
                                    standard,
                                    property,
                                    r,
                                    expectedSummaries,
                                    processingContext,
                                    e
                            );
                        }
                        return generateFallbackMemorial(r, null);
                    }
                    throw new RuntimeException("Falha na geração do memorial (OpenAI) após " + maxRetries + " tentativas: " + e.getMessage(), e);
                }
                continue;
            }
        }
        return "Erro inesperado na geração do memorial (OpenAI)";
    }
    /**
     * Converte entidades DXF para formato de mapa compatível com CoordinateExtractionService
     */
    private List<Map<String, Object>> convertToEntityMaps(DxfCompareResultDTO r) {
        List<Map<String, Object>> entities = new ArrayList<>();

        if (r.getAdded() != null) {
            for (DxfEntityChangeDTO entity : r.getAdded()) {
                Map<String, Object> entityMap = new LinkedHashMap<>();
                entityMap.put("type", entity.getType());
                entityMap.put("layer", entity.getLayer());
                entityMap.put("x", entity.getX());
                entityMap.put("y", entity.getY());
                entityMap.put("z", entity.getZ());
                entityMap.put("x2", entity.getX2());
                entityMap.put("y2", entity.getY2());
                entityMap.put("z2", entity.getZ2());
                entityMap.put("radius", entity.getRadius());
                entityMap.put("startAngle", entity.getStartAngle());
                entityMap.put("endAngle", entity.getEndAngle());
                entityMap.put("text", entity.getText());
                entityMap.put("textStyle", entity.getTextStyle());
                entityMap.put("textHeight", entity.getTextHeight());
                entityMap.put("textRotation", entity.getTextRotation());

                Map<String, Object> properties = buildEntityProperties(entity);
                if (!properties.isEmpty()) {
                    entityMap.put("properties", properties);
                }
                entities.add(entityMap);
            }
        }

        return entities;
    }

    private Map<String, Object> buildEntityProperties(DxfEntityChangeDTO entity) {
        Map<String, Object> properties = new LinkedHashMap<>();
        if (entity != null && entity.getProperties() != null && !entity.getProperties().isEmpty()) {
            properties.putAll(entity.getProperties());
        }

        if (entity == null) {
            return properties;
        }

        putIfNotNull(properties, "x", entity.getX());
        putIfNotNull(properties, "y", entity.getY());
        putIfNotNull(properties, "z", entity.getZ());
        putIfNotNull(properties, "x2", entity.getX2());
        putIfNotNull(properties, "y2", entity.getY2());
        putIfNotNull(properties, "z2", entity.getZ2());
        putIfNotNull(properties, "radius", entity.getRadius());
        putIfNotNull(properties, "startAngle", entity.getStartAngle());
        putIfNotNull(properties, "endAngle", entity.getEndAngle());
        putIfNotNull(properties, "text", entity.getText());
        putIfNotNull(properties, "textStyle", entity.getTextStyle());
        putIfNotNull(properties, "textHeight", entity.getTextHeight());
        putIfNotNull(properties, "textRotation", entity.getTextRotation());

        List<Map<String, Object>> convertedVertices = convertEntityVertices(entity.getVertices());
        if (!convertedVertices.isEmpty()) {
            properties.put("vertices", convertedVertices);
        }

        return properties;
    }

    private List<Map<String, Object>> convertEntityVertices(List<Map<String, Double>> vertices) {
        if (vertices == null || vertices.isEmpty()) {
            return List.of();
        }

        List<Map<String, Object>> convertedVertices = new ArrayList<>();
        for (Map<String, Double> vertex : vertices) {
            if (vertex == null || vertex.isEmpty()) {
                continue;
            }
            Map<String, Object> convertedVertex = new LinkedHashMap<>();
            if (vertex.containsKey("x")) {
                convertedVertex.put("x", vertex.get("x"));
            }
            if (vertex.containsKey("y")) {
                convertedVertex.put("y", vertex.get("y"));
            }
            if (!convertedVertex.isEmpty()) {
                convertedVertices.add(convertedVertex);
            }
        }
        return convertedVertices;
    }

    private void putIfNotNull(Map<String, Object> target, String key, Object value) {
        if (target == null || key == null || value == null) {
            return;
        }
        target.putIfAbsent(key, value);
    }

    private int resolveRequestedLotCount(DxfCompareResultDTO r, Integer lotCountOverride, int scopedLotCount) {
        if (scopedLotCount > 0) {
            if (lotCountOverride != null && lotCountOverride > 0 && lotCountOverride < scopedLotCount) {
                log.info("Usando limite manual de {} lote(s) dentro do escopo ativo de {} lote(s)", lotCountOverride, scopedLotCount);
                return lotCountOverride;
            }
            if (lotCountOverride != null && lotCountOverride > scopedLotCount) {
                log.warn("Limite manual de {} lote(s) excede o escopo ativo de {} lote(s); usando apenas o escopo ativo",
                        lotCountOverride, scopedLotCount);
            }
            return scopedLotCount;
        }
        if (lotCountOverride != null && lotCountOverride > 0) {
            return lotCountOverride;
        }
        return safeEstimateLotCount(r);
    }

    private int countScopedLots(List<Map<String, Object>> entities) {
        return lotTopologyService.countScopedLots(entities);
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
            long startTime,
            String provider,
            LegacyGenerationContext context,
            List<String> selectedLayers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        
        int lotsPerChunk = resolveSovereignLotsPerChunk();
        int totalLots = context.estimatedLotCount();
        int totalChunks = (int) Math.ceil((double) totalLots / lotsPerChunk);
        List<LotTechnicalSummary> partitionExpectedSummaries = context.expectedSummaries();
        
        StringBuilder finalMemorial = new StringBuilder();
        
        // Gerar preâmbulo uma vez
        String preamble = memorialDocumentAssemblyService.generatePreamble(
                standard,
                context.property(),
                context.processingContext()
        );
        finalMemorial.append(preamble).append("\n\n");
        
        // Gerar cada chunk de lotes
        for (int chunk = 0; chunk < totalChunks; chunk++) {
            int startLot = (chunk * lotsPerChunk) + 1;
            int endLot = Math.min(startLot + lotsPerChunk - 1, totalLots);
            List<LotTechnicalSummary> expectedChunkSummaries = sliceLotTechnicalSummaries(
                    partitionExpectedSummaries,
                    startLot,
                    endLot
            );
            
            try {
                String chunkContent = generateLotChunk(startLot, endLot, r, standard, context.property(),
                        context.extractedPoints(), context.realCoordinates(), context.streetNames(), context.confrontations(), context.individualAreas(),
                        context.coordenadaBase(), provider, selectedLayers, selectedConfrontationTexts, totalLots,
                        expectedChunkSummaries,
                        context.memorialBaseJson());

                String normalizedChunk = memorialLlmSupportService.normalizeChunkOutput(
                        chunkContent,
                        startLot,
                        endLot,
                        memorialDocumentAssemblyService::normalizeMemorialLotOrdering
                );
                finalMemorial.append(normalizedChunk).append("\n");
                
            } catch (Exception e) {
                log.error("❌ Erro no chunk {}: {}", chunk + 1, e.getMessage());

                if (!expectedChunkSummaries.isEmpty()) {
                    finalMemorial.append(buildDeterministicChunkFallback(
                            "partition-loop-" + startLot + "-" + endLot,
                            context.property(),
                            expectedChunkSummaries,
                            e
                    )).append("\n");
                    continue;
                }

                finalMemorial.append("LOTES ").append(startLot).append(" a ").append(endLot)
                        .append(": Erro na geração - revisar manualmente.\n\n");
            }
        }
        
        // Adicionar conclusão
        finalMemorial.append(memorialDocumentAssemblyService.generateConclusion(context.property()));

        String normalizedMemorial = memorialDocumentAssemblyService.normalizeMemorialLotOrdering(finalMemorial.toString());
        
        // Adicionar metadados
        String result = memorialDocumentAssemblyService.addMetadata(normalizedMemorial, context.property(), r);
        
        // Registrar métricas
        long processingTime = System.currentTimeMillis() - startTime;
        int entitiesProcessed = (r.getAdded() != null ? r.getAdded().size() : 0) +
                (r.getRemoved() != null ? r.getRemoved().size() : 0) +
                (r.getModified() != null ? r.getModified().size() : 0);

        metricsService.recordSuccessfulGeneration(processingTime, totalLots, entitiesProcessed, result.length());
        
        return result;
    }
    
    /**
     * Gera um chunk específico de lotes
     */
    private String generateLotChunk(int startLot, int endLot, DxfCompareResultDTO r,
                                   MemorialStandardDTO standard, PropertyDTO property,
                                   List<SimplePoint> extractedPoints, Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
                                   List<String> streetNames, Map<String, List<String>> confrontations,
                                   Map<String, Double> individualAreas, DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase,
                                   String provider, List<String> selectedLayers,
                                   List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
                                   int requestedLotCount,
                                   List<LotTechnicalSummary> fallbackChunkSummaries,
                                   String memorialBaseJson) {

        MemorialPromptContextService.ChunkPromptPayload chunkPromptPayload =
                memorialPromptContextService.buildChunkPrompt(
                        startLot,
                        endLot,
                        property,
                        extractedPoints,
                        realCoordinates,
                        streetNames,
                        confrontations,
                        individualAreas,
                        coordenadaBase,
                        selectedLayers,
                        selectedConfrontationTexts,
                        fallbackChunkSummaries,
                        requestedLotCount,
                        memorialBaseJson
                );
        String chunkPrompt = chunkPromptPayload.prompt();
        List<LotTechnicalSummary> expectedChunkSummaries = !chunkPromptPayload.expectedSummaries().isEmpty()
                ? chunkPromptPayload.expectedSummaries()
                : fallbackChunkSummaries;
        
        if (memorialLlmSupportService.isOpenAiProvider(provider)) {
            return generateChunkWithOpenAi(chunkPrompt, expectedChunkSummaries, property, startLot, endLot);
        }

        String scope = "chunk-" + startLot + "-" + endLot;
        String effectivePrompt = chunkPrompt;
        int chunkAttempts = Math.max(1, Math.min(2, maxRetries));
        RuntimeException lastError = null;

        for (int attempt = 1; attempt <= chunkAttempts; attempt++) {
            try {
                String normalizedContent = enforceDeterministicConfrontationSections(
                        memorialLlmSupportService.normalizeChunkOutput(
                                memorialLlmSupportService.requestClaudeChunk(effectivePrompt, startLot, endLot),
                                startLot,
                                endLot,
                        memorialDocumentAssemblyService::normalizeMemorialLotOrdering
                        ),
                        expectedChunkSummaries
                );
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
                    effectivePrompt = memorialLlmSupportService.buildRetryChunkPrompt(
                            chunkPrompt,
                            alignmentCheck,
                            startLot,
                            endLot
                    );
                    continue;
                }
            } catch (Exception e) {
                lastError = e instanceof RuntimeException ? (RuntimeException) e : new RuntimeException(e.getMessage(), e);
                log.error("❌ Erro ao gerar {} na tentativa {}: {}", scope, attempt, e.getMessage());
            }
        }

        return buildDeterministicChunkFallback(scope, property, expectedChunkSummaries, lastError);
    }

    private List<LotTechnicalSummary> sliceLotTechnicalSummaries(
            List<LotTechnicalSummary> summaries,
            int startLot,
            int endLot) {
        if (summaries == null || summaries.isEmpty()) {
            return List.of();
        }

        return summaries.stream()
                .filter(summary -> summary != null)
                .filter(summary -> summary.lotNumber() >= startLot && summary.lotNumber() <= endLot)
                .sorted(Comparator.comparingInt(LotTechnicalSummary::lotNumber))
                .collect(Collectors.toList());
    }

    private List<LotTechnicalSummary> resolveScopedExpectedSummaries(
            LegacyGenerationContext context,
            List<String> selectedLayers) {
        List<LotTechnicalSummary> expectedSummaries = context.expectedSummaries();
        if (expectedSummaries == null || expectedSummaries.isEmpty()) {
            return List.of();
        }

        if (context.estimatedLotCount() != 1) {
            return expectedSummaries;
        }

        int expectedLotNumber = resolveLotScope(selectedLayers, 1).startLotNumber();
        List<LotTechnicalSummary> sliced = sliceLotTechnicalSummaries(expectedSummaries, expectedLotNumber, expectedLotNumber);
        if (!sliced.isEmpty()) {
            return sliced;
        }

        if (expectedSummaries.size() == 1) {
            LotTechnicalSummary singleSummary = expectedSummaries.get(0);
            if (singleSummary != null && singleSummary.lotNumber() != expectedLotNumber) {
                return List.of(relabelLotTechnicalSummary(singleSummary, expectedLotNumber));
            }
        }

        return expectedSummaries;
    }

    private LotScope resolveLotScope(List<String> selectedLayers, int estimatedLotCount) {
        OptionalInt selectedLotNumber = extractSelectedLotNumber(selectedLayers);
        int startLotNumber = selectedLotNumber.isPresent() ? selectedLotNumber.getAsInt() : 1;
        int maxLots = selectedLotNumber.isPresent() ? 1 : estimatedLotCount;
        return new LotScope(startLotNumber, maxLots);
    }

    private LotTechnicalSummary relabelLotTechnicalSummary(LotTechnicalSummary summary, int lotNumber) {
        return new LotTechnicalSummary(
                lotNumber,
                summary.area(),
                summary.areaExtenso(),
                summary.perimeter(),
                summary.perimeterExtenso(),
                summary.vertexSequence(),
                summary.sideSummaries(),
                summary.consolidatedConfrontations(),
                summary.confrontacoesFormatadas(),
                summary.streetFrontages(),
                summary.isCornerLot(),
                summary.hasDualFrontage(),
                summary.hasGeoreferencedVertices(),
                summary.supplementalValidationIssues()
        );
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
                String normalizedContent = enforceDeterministicConfrontationSections(
                        memorialLlmSupportService.normalizeChunkOutput(
                                memorialLlmSupportService.requestOpenAiChunk(effectivePrompt, startLot, endLot),
                                startLot,
                                endLot,
                        memorialDocumentAssemblyService::normalizeMemorialLotOrdering
                        ),
                        expectedChunkSummaries
                );
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
                    effectivePrompt = memorialLlmSupportService.buildRetryChunkPrompt(
                            chunkPrompt,
                            alignmentCheck,
                            startLot,
                            endLot
                    );
                    continue;
                }
            } catch (Exception e) {
                lastError = e instanceof RuntimeException ? (RuntimeException) e : new RuntimeException(e.getMessage(), e);
                log.error("Erro ao gerar {} na tentativa {}: {}", scope, attempt, e.getMessage());
            }
        }

        return buildDeterministicChunkFallback(scope, property, expectedChunkSummaries, lastError);
    }

    private String buildDeterministicChunkFallback(
            String scope,
            PropertyDTO property,
            List<LotTechnicalSummary> expectedChunkSummaries,
            Exception cause) {
        return deterministicMemorialService.buildDeterministicChunkFallback(scope, property, expectedChunkSummaries, cause);
    }

    private String enforceDeterministicConfrontationSections(
            String content,
            List<LotTechnicalSummary> expectedSummaries) {
        List<LotBlock> blocks = memorialAlignmentService.extractLotBlocks(content);
        return deterministicMemorialService.enforceDeterministicConfrontationSections(content, expectedSummaries, blocks);
    }

    private String buildDeterministicDirectionReference(LotTechnicalSummary summary, String direction) {
        return deterministicMemorialService.buildDeterministicDirectionReference(summary, direction);
    }

    private boolean hasSelfReferencedDirection(LotTechnicalSummary summary, String direction) {
        return deterministicMemorialService.hasSelfReferencedDirection(summary, direction);
    }

    private String buildDeterministicDirectionReferenceDisplay(LotTechnicalSummary summary, String direction) {
        return deterministicMemorialService.buildDeterministicDirectionReferenceDisplay(summary, direction);
    }

    private String buildDeterministicFullMemorial(
            String scope,
            MemorialStandardDTO standard,
            PropertyDTO property,
            DxfCompareResultDTO compareResult,
            List<LotTechnicalSummary> expectedSummaries,
            MemorialProcessingContext processingContext,
            Exception cause) {
        return buildDeterministicFullMemorial(
                scope,
                standard,
                property,
                compareResult,
                expectedSummaries,
                processingContext,
                null,
                null,
                cause
        );
    }

    private String buildDeterministicFullMemorial(
            String scope,
            MemorialStandardDTO standard,
            PropertyDTO property,
            DxfCompareResultDTO compareResult,
            List<LotTechnicalSummary> expectedSummaries,
            MemorialProcessingContext processingContext,
            String templateName,
            String templateJson,
            Exception cause) {
        String preamble = memorialDocumentAssemblyService.generatePreamble(standard, property, processingContext);
        String conclusion = memorialDocumentAssemblyService.generateConclusion(property);
        return deterministicMemorialService.buildDeterministicFullMemorial(
                scope,
                property,
                expectedSummaries,
                null,
                preamble,
                conclusion,
                content -> memorialDocumentAssemblyService.addMetadata(content, property, compareResult),
                templateName,
                templateJson,
                cause
        );
    }

    private String buildSovereignTechnicalSummaryMemorial(
            String scope,
            MemorialStandardDTO standard,
            PropertyDTO property,
            DxfCompareResultDTO compareResult,
            List<LotTechnicalSummary> expectedSummaries,
            String technicalSummaryJson,
            String documentSummaryJson,
            String templateName,
            String templateJson) {
        String provider = resolveMemorialProvider();
        MemorialProcessingContext processingContext = resolveProcessingContext(documentSummaryJson, technicalSummaryJson);
        String preamble = memorialDocumentAssemblyService.generatePreamble(standard, property, processingContext);
        String conclusion = memorialDocumentAssemblyService.generateConclusion(property);

        if (expectedSummaries.size() > resolveSovereignLotsPerChunk()) {
            return generateSovereignTechnicalSummaryWithChunking(
                    scope,
                    provider,
                    standard,
                    property,
                    compareResult,
                    expectedSummaries,
                    technicalSummaryJson,
                    documentSummaryJson,
                    preamble,
                    conclusion,
                    templateName,
                    templateJson
            );
        }

        if (!memorialLlmSupportService.hasValidConfiguredProviderKey(provider)) {
            log.warn(
                    "Fluxo soberano do memorial sem credencial valida para o provedor {}; usando montagem deterministica.",
                    provider
            );
            return buildDeterministicSovereignTechnicalSummaryMemorial(
                    scope,
                    property,
                    compareResult,
                    expectedSummaries,
                    documentSummaryJson,
                    preamble,
                    conclusion,
                    templateName,
                    templateJson
            );
        }

        String prompt = memorialPromptContextService.buildPromptFromTechnicalSummary(
                standard,
                property,
                expectedSummaries,
                null,
                technicalSummaryJson,
                templateName,
                templateJson
        );
        List<Map<String, Object>> systemPrompt = promptCacheService.buildCachedSystemPrompt(standard);
        int dynamicMaxTokens = memorialLlmSupportService.calculateDynamicMaxTokens(expectedSummaries.size());

        if (memorialLlmSupportService.isOpenAiProvider(provider)) {
            return generateSovereignTechnicalSummaryWithOpenAi(
                    scope,
                    prompt,
                    systemPrompt,
                    property,
                    compareResult,
                    expectedSummaries,
                    documentSummaryJson,
                    preamble,
                    conclusion,
                    templateName,
                    templateJson
            );
        }

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String content = enforceDeterministicConfrontationSections(
                        memorialDocumentAssemblyService.normalizeMemorialLotOrdering(
                                memorialLlmSupportService.sanitizeMemorialText(
                                        memorialLlmSupportService.requestClaudeSingleCall(prompt, systemPrompt, dynamicMaxTokens)
                                )
                        ),
                        expectedSummaries
                );
                MemorialAlignmentCheck alignmentCheck = validateMemorialAlignment(scope + "-claude", content, expectedSummaries);
                logMemorialAlignment(scope + "-claude", content, expectedSummaries, alignmentCheck);
                boolean isComplete = memorialAlignmentService.validateCompleteness(content, expectedSummaries);

                if (!alignmentCheck.valid() || !isComplete) {
                    if (!alignmentCheck.valid()) {
                        log.warn("Resposta soberana da IA rejeitada no provedor {}: {}", provider, alignmentCheck.blockingIssues());
                    }
                    if (!isComplete) {
                        log.warn("Memorial soberano da IA incompleto no provedor {}", provider);
                    }
                    if (attempt < maxRetries) {
                        continue;
                    }
                    return buildDeterministicSovereignTechnicalSummaryMemorial(
                            scope,
                            property,
                            compareResult,
                            expectedSummaries,
                            documentSummaryJson,
                            preamble,
                            conclusion,
                            templateName,
                            templateJson
                    );
                }

                return memorialDocumentAssemblyService.addMetadata(
                        memorialDocumentAssemblyService.assembleMemorialDocument(content, preamble, conclusion),
                        property,
                        compareResult
                );
            } catch (Exception e) {
                log.error("Falha na tentativa {} do fluxo soberano com provedor {}: {}", attempt, provider, e.getMessage(), e);
                if (attempt < maxRetries) {
                    continue;
                }
                return buildDeterministicSovereignTechnicalSummaryMemorial(
                        scope,
                        property,
                        compareResult,
                        expectedSummaries,
                        documentSummaryJson,
                        preamble,
                        conclusion,
                        templateName,
                        templateJson
                );
            }
        }

        return buildDeterministicSovereignTechnicalSummaryMemorial(
                scope,
                property,
                compareResult,
                expectedSummaries,
                documentSummaryJson,
                preamble,
                conclusion,
                templateName,
                templateJson
        );
    }

    private String generateSovereignTechnicalSummaryWithChunking(
            String scope,
            String provider,
            MemorialStandardDTO standard,
            PropertyDTO property,
            DxfCompareResultDTO compareResult,
            List<LotTechnicalSummary> expectedSummaries,
            String technicalSummaryJson,
            String documentSummaryJson,
            String preamble,
            String conclusion,
            String templateName,
            String templateJson) {
        if (!memorialLlmSupportService.hasValidConfiguredProviderKey(provider)) {
            log.warn(
                    "Fluxo soberano particionado sem credencial valida para o provedor {}; usando montagem deterministica.",
                    provider
            );
            return buildDeterministicSovereignTechnicalSummaryMemorial(
                    scope,
                    property,
                    compareResult,
                    expectedSummaries,
                    documentSummaryJson,
                    preamble,
                    conclusion,
                    templateName,
                    templateJson
            );
        }

        int lotsPerChunk = resolveSovereignLotsPerChunk();
        int totalLots = expectedSummaries.size();
        int totalChunks = (int) Math.ceil((double) totalLots / lotsPerChunk);
        StringBuilder finalMemorial = new StringBuilder();
        finalMemorial.append(preamble).append("\n\n");

        for (int chunk = 0; chunk < totalChunks; chunk++) {
            int startLot = (chunk * lotsPerChunk) + 1;
            int endLot = Math.min(startLot + lotsPerChunk - 1, totalLots);
            List<LotTechnicalSummary> expectedChunkSummaries = sliceLotTechnicalSummaries(
                    expectedSummaries,
                    startLot,
                    endLot
            );

            if (expectedChunkSummaries.isEmpty()) {
                continue;
            }

            try {
                String chunkContent = generateSovereignTechnicalSummaryChunk(
                        provider,
                        standard,
                        property,
                        expectedChunkSummaries,
                        startLot,
                        endLot,
                        totalLots,
                        technicalSummaryJson,
                        templateName,
                        templateJson
                );
                finalMemorial.append(chunkContent).append("\n\n");
            } catch (Exception e) {
                log.error("Falha no chunk soberano {}-{} com provedor {}: {}", startLot, endLot, provider, e.getMessage(), e);
                finalMemorial.append(buildDeterministicChunkFallback(
                        scope + "-chunk-" + startLot + "-" + endLot,
                        property,
                        expectedChunkSummaries,
                        e
                )).append("\n\n");
            }
        }

        finalMemorial.append(conclusion);
        String normalizedMemorial = memorialDocumentAssemblyService.normalizeMemorialLotOrdering(finalMemorial.toString());
        return memorialDocumentAssemblyService.addMetadata(normalizedMemorial, property, compareResult);
    }

    private String generateSovereignTechnicalSummaryChunk(
            String provider,
            MemorialStandardDTO standard,
            PropertyDTO property,
            List<LotTechnicalSummary> expectedChunkSummaries,
            int startLot,
            int endLot,
            int totalLots,
            String technicalSummaryJson,
            String templateName,
            String templateJson) {
        String chunkPrompt = memorialPromptContextService.buildTechnicalSummaryChunkPrompt(
                startLot,
                endLot,
                totalLots,
                standard,
                property,
                expectedChunkSummaries,
                technicalSummaryJson,
                templateName,
                templateJson
        );

        if (memorialLlmSupportService.isOpenAiProvider(provider)) {
            return generateSovereignTechnicalSummaryChunkWithOpenAi(
                    chunkPrompt,
                    expectedChunkSummaries,
                    property,
                    startLot,
                    endLot
            );
        }

        String scope = "technical-summary-sovereign-chunk-" + startLot + "-" + endLot;
        String effectivePrompt = chunkPrompt;
        int chunkAttempts = Math.max(1, Math.min(2, maxRetries));
        RuntimeException lastError = null;

        for (int attempt = 1; attempt <= chunkAttempts; attempt++) {
            try {
                String normalizedContent = enforceDeterministicConfrontationSections(
                        memorialLlmSupportService.normalizeChunkOutput(
                                memorialLlmSupportService.requestClaudeChunk(effectivePrompt, startLot, endLot),
                                startLot,
                                endLot,
                                memorialDocumentAssemblyService::normalizeMemorialLotOrdering
                        ),
                        expectedChunkSummaries
                );
                MemorialAlignmentCheck alignmentCheck = validateMemorialAlignment(scope, normalizedContent, expectedChunkSummaries);
                logMemorialAlignment(scope, normalizedContent, expectedChunkSummaries, alignmentCheck);
                if (alignmentCheck.valid()) {
                    return normalizedContent;
                }

                lastError = new RuntimeException("Chunk soberano invalido: " + String.join(" | ", alignmentCheck.blockingIssues()));
                if (attempt < chunkAttempts) {
                    effectivePrompt = memorialLlmSupportService.buildRetryChunkPrompt(
                            chunkPrompt,
                            alignmentCheck,
                            startLot,
                            endLot
                    );
                }
            } catch (Exception e) {
                lastError = e instanceof RuntimeException ? (RuntimeException) e : new RuntimeException(e.getMessage(), e);
                log.error("Falha ao gerar chunk soberano {} na tentativa {}: {}", scope, attempt, e.getMessage(), e);
            }
        }

        return buildDeterministicChunkFallback(scope, property, expectedChunkSummaries, lastError);
    }

    private String generateSovereignTechnicalSummaryChunkWithOpenAi(
            String chunkPrompt,
            List<LotTechnicalSummary> expectedChunkSummaries,
            PropertyDTO property,
            int startLot,
            int endLot) {
        String scope = "technical-summary-sovereign-openai-chunk-" + startLot + "-" + endLot;
        String effectivePrompt = chunkPrompt;
        int chunkAttempts = Math.max(1, Math.min(2, maxRetries));
        RuntimeException lastError = null;

        for (int attempt = 1; attempt <= chunkAttempts; attempt++) {
            try {
                String normalizedContent = enforceDeterministicConfrontationSections(
                        memorialLlmSupportService.normalizeChunkOutput(
                                memorialLlmSupportService.requestOpenAiChunk(effectivePrompt, startLot, endLot),
                                startLot,
                                endLot,
                                memorialDocumentAssemblyService::normalizeMemorialLotOrdering
                        ),
                        expectedChunkSummaries
                );
                MemorialAlignmentCheck alignmentCheck = validateMemorialAlignment(scope, normalizedContent, expectedChunkSummaries);
                logMemorialAlignment(scope, normalizedContent, expectedChunkSummaries, alignmentCheck);
                if (alignmentCheck.valid()) {
                    return normalizedContent;
                }

                lastError = new RuntimeException("Chunk soberano OpenAI invalido: " + String.join(" | ", alignmentCheck.blockingIssues()));
                if (attempt < chunkAttempts) {
                    effectivePrompt = memorialLlmSupportService.buildRetryChunkPrompt(
                            chunkPrompt,
                            alignmentCheck,
                            startLot,
                            endLot
                    );
                }
            } catch (HttpStatusCodeException e) {
                String responseBody = e.getResponseBodyAsString();
                lastError = new RuntimeException(e.getMessage(), e);
                log.error("Falha HTTP ao gerar chunk soberano OpenAI {} na tentativa {}: {}", scope, attempt, e.getMessage(), e);

                if (memorialLlmSupportService.isOpenAiQuotaExceeded(e, responseBody)) {
                    throw new OpenAiQuotaExceededException(
                            "A conta da OpenAI esta sem cota disponivel ou com problema de faturamento.",
                            e
                    );
                }

                if ((memorialLlmSupportService.isOpenAiRateLimit(e, responseBody)
                        || memorialLlmSupportService.isOpenAiTransientUnavailable(e, responseBody))
                        && attempt < chunkAttempts) {
                    continue;
                }
            } catch (Exception e) {
                lastError = e instanceof RuntimeException ? (RuntimeException) e : new RuntimeException(e.getMessage(), e);
                log.error("Falha ao gerar chunk soberano OpenAI {} na tentativa {}: {}", scope, attempt, e.getMessage(), e);
            }
        }

        return buildDeterministicChunkFallback(scope, property, expectedChunkSummaries, lastError);
    }

    private String generateSovereignTechnicalSummaryWithOpenAi(
            String scope,
            String prompt,
            List<Map<String, Object>> systemPrompt,
            PropertyDTO property,
            DxfCompareResultDTO compareResult,
            List<LotTechnicalSummary> expectedSummaries,
            String documentSummaryJson,
            String preamble,
            String conclusion,
            String templateName,
            String templateJson) {
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String content = enforceDeterministicConfrontationSections(
                        memorialDocumentAssemblyService.normalizeMemorialLotOrdering(
                                memorialLlmSupportService.sanitizeMemorialText(
                                        memorialLlmSupportService.requestOpenAiSingleCall(prompt, systemPrompt)
                                )
                        ),
                        expectedSummaries
                );
                MemorialAlignmentCheck alignmentCheck = validateMemorialAlignment(scope + "-openai", content, expectedSummaries);
                logMemorialAlignment(scope + "-openai", content, expectedSummaries, alignmentCheck);
                boolean isComplete = memorialAlignmentService.validateCompleteness(content, expectedSummaries);

                if (!alignmentCheck.valid() || !isComplete) {
                    if (!alignmentCheck.valid()) {
                        log.warn("Resposta soberana da OpenAI rejeitada: {}", alignmentCheck.blockingIssues());
                    }
                    if (!isComplete) {
                        log.warn("Memorial soberano da OpenAI incompleto.");
                    }
                    if (attempt < maxRetries) {
                        continue;
                    }
                    return buildDeterministicSovereignTechnicalSummaryMemorial(
                            scope,
                            property,
                            compareResult,
                            expectedSummaries,
                            documentSummaryJson,
                            preamble,
                            conclusion,
                            templateName,
                            templateJson
                    );
                }

                return memorialDocumentAssemblyService.addMetadata(
                        memorialDocumentAssemblyService.assembleMemorialDocument(content, preamble, conclusion),
                        property,
                        compareResult
                );
            } catch (HttpStatusCodeException e) {
                String responseBody = e.getResponseBodyAsString();
                log.error("Falha HTTP na tentativa {} do fluxo soberano com OpenAI: {}", attempt, e.getMessage());

                if (memorialLlmSupportService.isOpenAiQuotaExceeded(e, responseBody)) {
                    throw new OpenAiQuotaExceededException(
                            "A conta da OpenAI esta sem cota disponivel ou com problema de faturamento.",
                            e
                    );
                }

                if (memorialLlmSupportService.isOpenAiRateLimit(e, responseBody) && attempt < maxRetries) {
                    continue;
                }

                return buildDeterministicSovereignTechnicalSummaryMemorial(
                        scope,
                        property,
                        compareResult,
                        expectedSummaries,
                        documentSummaryJson,
                        preamble,
                        conclusion,
                        templateName,
                        templateJson
                );
            } catch (Exception e) {
                log.error("Falha na tentativa {} do fluxo soberano com OpenAI: {}", attempt, e.getMessage(), e);
                if (attempt < maxRetries) {
                    continue;
                }
                return buildDeterministicSovereignTechnicalSummaryMemorial(
                        scope,
                        property,
                        compareResult,
                        expectedSummaries,
                        documentSummaryJson,
                        preamble,
                        conclusion,
                        templateName,
                        templateJson
                );
            }
        }

        return buildDeterministicSovereignTechnicalSummaryMemorial(
                scope,
                property,
                compareResult,
                expectedSummaries,
                documentSummaryJson,
                preamble,
                conclusion,
                templateName,
                templateJson
        );
    }

    private int resolveSovereignLotsPerChunk() {
        return Math.max(1, Math.min(12, sovereignLotsPerChunk));
    }

    private String buildDeterministicSovereignTechnicalSummaryMemorial(
            String scope,
            PropertyDTO property,
            DxfCompareResultDTO compareResult,
            List<LotTechnicalSummary> expectedSummaries,
            String documentSummaryJson,
            String preamble,
            String conclusion,
            String templateName,
            String templateJson) {
        return deterministicMemorialService.buildSovereignMemorialFromTechnicalSummary(
                scope,
                property,
                expectedSummaries,
                documentSummaryJson,
                preamble,
                conclusion,
                content -> memorialDocumentAssemblyService.addMetadata(content, property, compareResult),
                templateName,
                templateJson
        );
    }

    private String resolveDocumentSummaryJson(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            List<String> selectedLayers,
            MemorialProcessingContext processingContext,
            String documentSummaryJson) {
        if (documentSummaryJson != null && !documentSummaryJson.isBlank()) {
            return documentSummaryJson;
        }
        return technicalSummaryService.buildDocumentSummaryJson(
                compareResult,
                property,
                expectedSummaries,
                selectedLayers,
                processingContext
        );
    }

    private MemorialProcessingContext resolveProcessingContext(String documentSummaryJson, String technicalSummaryJson) {
        MemorialProcessingContext documentSummaryContext = parseProcessingContextFromSummaryJson(documentSummaryJson);
        if (documentSummaryContext != null && documentSummaryContext.hasBaseArea()) {
            return documentSummaryContext;
        }

        MemorialProcessingContext technicalSummaryContext = parseProcessingContextFromSummaryJson(technicalSummaryJson);
        if (technicalSummaryContext != null && technicalSummaryContext.hasBaseArea()) {
            return technicalSummaryContext;
        }

        return documentSummaryContext != null ? documentSummaryContext : technicalSummaryContext;
    }

    private MemorialProcessingContext parseProcessingContextFromSummaryJson(String summaryJson) {
        if (summaryJson == null || summaryJson.isBlank()) {
            return null;
        }

        try {
            JsonNode rootNode = objectMapper.readTree(summaryJson);
            JsonNode processingContextNode = rootNode.path("processingContext");
            if (processingContextNode.isMissingNode() || processingContextNode.isNull()) {
                return null;
            }

            MemorialProcessingContext.BaseAreaContext baseArea = parseBoundaryContext(
                    processingContextNode.path("baseArea"),
                    "AREA_TOTAL",
                    "AREA_TOTAL_P%02d"
            );
            MemorialProcessingContext.OriginalPropertyContext originalProperty = parseOriginalPropertyContext(
                    processingContextNode.path("originalProperty")
            );
            MemorialProcessingContext.RemainingAreaContext remainingArea = parseRemainingAreaContext(
                    processingContextNode.path("remainingArea")
            );

            if (baseArea == null && originalProperty == null && remainingArea == null) {
                return null;
            }

            return new MemorialProcessingContext(baseArea, originalProperty, remainingArea);
        } catch (Exception e) {
            log.debug("Nao foi possivel extrair processingContext do resumo para o preambulo legal: {}", e.getMessage());
            return null;
        }
    }

    private MemorialProcessingContext.BaseAreaContext parseBoundaryContext(
            JsonNode boundaryNode,
            String defaultLabel,
            String labelPattern) {
        if (boundaryNode == null || boundaryNode.isMissingNode() || boundaryNode.isNull()) {
            return null;
        }

        List<MemorialProcessingContext.BaseAreaPoint> points = parseBoundaryVertices(boundaryNode.path("vertices"), labelPattern);
        if (points.isEmpty()) {
            return null;
        }

        return new MemorialProcessingContext.BaseAreaContext(
                defaultText(textValue(boundaryNode, "label"), defaultLabel),
                points
        );
    }

    private MemorialProcessingContext.OriginalPropertyContext parseOriginalPropertyContext(JsonNode originalPropertyNode) {
        if (originalPropertyNode == null || originalPropertyNode.isMissingNode() || originalPropertyNode.isNull()) {
            return null;
        }

        List<MemorialProcessingContext.BaseAreaPoint> points = parseBoundaryVertices(
                originalPropertyNode.path("vertices"),
                "TERRENO_ORIGINAL_P%02d"
        );
        if (points.isEmpty()) {
            return null;
        }

        return new MemorialProcessingContext.OriginalPropertyContext(
                defaultText(textValue(originalPropertyNode, "label"), "TERRENO_ORIGINAL"),
                defaultText(textValue(originalPropertyNode, "source"), "BASE_AREA"),
                defaultText(textValue(originalPropertyNode, "narrativeRole"), "TERRENO_ORIGINAL"),
                points
        );
    }

    private MemorialProcessingContext.RemainingAreaContext parseRemainingAreaContext(JsonNode remainingAreaNode) {
        if (remainingAreaNode == null || remainingAreaNode.isMissingNode() || remainingAreaNode.isNull()) {
            return null;
        }

        List<MemorialProcessingContext.BaseAreaPoint> points = parseBoundaryVertices(
                remainingAreaNode.path("vertices"),
                "AREA_REMANESCENTE_P%02d"
        );
        if (points.isEmpty()) {
            return null;
        }

        return new MemorialProcessingContext.RemainingAreaContext(
                defaultText(textValue(remainingAreaNode, "label"), "AREA_REMANESCENTE"),
                defaultText(textValue(remainingAreaNode, "source"), "PROCESSING_CONTEXT"),
                defaultText(textValue(remainingAreaNode, "narrativeRole"), "AREA_REMANESCENTE"),
                points
        );
    }

    private List<MemorialProcessingContext.BaseAreaPoint> parseBoundaryVertices(JsonNode verticesNode, String labelPattern) {
        List<MemorialProcessingContext.BaseAreaPoint> points = new ArrayList<>();
        if (verticesNode == null || !verticesNode.isArray()) {
            return points;
        }

        int fallbackOrder = 1;
        for (JsonNode vertexNode : verticesNode) {
            Double x = firstDoubleValue(vertexNode, "x", "easting");
            Double y = firstDoubleValue(vertexNode, "y", "northing");
            if (x == null || y == null) {
                continue;
            }

            points.add(new MemorialProcessingContext.BaseAreaPoint(
                    intValue(vertexNode, "orderNumber", fallbackOrder),
                    defaultText(textValue(vertexNode, "label"), String.format(Locale.US, labelPattern, fallbackOrder)),
                    x,
                    y
            ));
            fallbackOrder++;
        }
        return points;
    }

    private String textValue(JsonNode node, String fieldName) {
        if (node == null || fieldName == null) {
            return null;
        }

        JsonNode fieldNode = node.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull()) {
            return null;
        }
        String value = fieldNode.asText(null);
        return value != null && !value.isBlank() ? value.trim() : null;
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private int intValue(JsonNode node, String fieldName, int fallback) {
        if (node == null || fieldName == null) {
            return fallback;
        }

        JsonNode fieldNode = node.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull()) {
            return fallback;
        }
        return fieldNode.canConvertToInt() ? fieldNode.asInt() : fallback;
    }

    private Double firstDoubleValue(JsonNode node, String primaryField, String fallbackField) {
        Double primaryValue = doubleValue(node, primaryField);
        return primaryValue != null ? primaryValue : doubleValue(node, fallbackField);
    }

    private Double doubleValue(JsonNode node, String fieldName) {
        if (node == null || fieldName == null) {
            return null;
        }

        JsonNode fieldNode = node.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull()) {
            return null;
        }

        if (fieldNode.isNumber()) {
            return fieldNode.asDouble();
        }

        if (fieldNode.isTextual()) {
            try {
                return Double.parseDouble(fieldNode.asText().trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }

        return null;
    }

    private String formatSummarySideReference(String reference, int lotNumber) {
        return deterministicMemorialService.formatSummarySideReference(reference, lotNumber);
    }

    private String sanitizeConfrontationReference(String reference) {
        return deterministicMemorialService.sanitizeConfrontationReference(reference);
    }

    private Integer extractReferencedLotNumber(String reference) {
        return deterministicMemorialService.extractReferencedLotNumber(reference);
    }
    private List<LotTechnicalSummary> deriveLotTechnicalSummariesFromEntities(
            List<Map<String, Object>> entities,
            Map<String, List<String>> confrontations,
            List<Integer> detectedLotNumbers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform,
            int startLotNumber,
            int maxLots) {
        return lotTopologyService.selectLotTechnicalSummaries(
                entities,
                confrontations,
                detectedLotNumbers,
                selectedConfrontationTexts,
                georeferencingTransform,
                startLotNumber,
                maxLots
        );
    }

    private List<LotTechnicalSummary> filterSummariesBySelectedLotNumbers(
            List<LotTechnicalSummary> summaries,
            List<Integer> selectedLotNumbers) {
        if (summaries == null || summaries.isEmpty() || selectedLotNumbers == null || selectedLotNumbers.isEmpty()) {
            return summaries;
        }

        Set<Integer> selectedLotNumberSet = selectedLotNumbers.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (selectedLotNumberSet.isEmpty()) {
            return summaries;
        }

        List<LotTechnicalSummary> filtered = summaries.stream()
                .filter(summary -> selectedLotNumberSet.contains(summary.lotNumber()))
                .toList();
        return filtered.isEmpty() ? summaries : filtered;
    }

    private OptionalInt extractSelectedLotNumber(List<String> selectedLayers) {
        if (selectedLayers == null || selectedLayers.isEmpty()) {
            return OptionalInt.empty();
        }

        Pattern pattern = Pattern.compile("(\\d+)");
        for (String layer : selectedLayers) {
            if (layer == null || layer.isBlank()) {
                continue;
            }

            Matcher matcher = pattern.matcher(layer);
            if (matcher.find()) {
                try {
                    return OptionalInt.of(Integer.parseInt(matcher.group(1)));
                } catch (NumberFormatException ignored) {
                    // tenta a proxima layer
                }
            }
        }

        return OptionalInt.empty();
    }

    private void logMemorialAlignment(String scope, String content, List<LotTechnicalSummary> expectedSummaries) {
        logMemorialAlignment(scope, content, expectedSummaries, validateMemorialAlignment(scope, content, expectedSummaries));
    }

    private void logMemorialAlignment(
            String scope,
            String content,
            List<LotTechnicalSummary> expectedSummaries,
            MemorialAlignmentCheck alignmentCheck) {
        memorialAlignmentService.logMemorialAlignment(scope, content, expectedSummaries, alignmentCheck);
    }

    private MemorialAlignmentCheck validateMemorialAlignment(
            String scope,
            String content,
            List<LotTechnicalSummary> expectedSummaries) {
        return memorialAlignmentService.validateMemorialAlignment(
                scope,
                content,
                expectedSummaries,
                this::buildDeterministicDirectionReference
        );
    }

    private TechnicalSummaryPayload buildTechnicalSummaryPayload(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers,
            MemorialProcessingContext processingContext,
            List<Integer> selectedLotNumbers,
            List<Integer> partialReplacementLotNumbers,
            List<Integer> manualReviewLotNumbers) {
        return technicalSummaryService.buildTechnicalSummaryPayload(
                compareResult,
                property,
                summaries,
                selectedLayers,
                processingContext,
                selectedLotNumbers,
                partialReplacementLotNumbers,
                manualReviewLotNumbers
        );
    }

    private List<LotTechnicalSummary> applyManualReviewLotOverrides(
            List<LotTechnicalSummary> summaries,
            List<Integer> manualReviewLotNumbers) {
        if (summaries == null || summaries.isEmpty() || manualReviewLotNumbers == null || manualReviewLotNumbers.isEmpty()) {
            return summaries;
        }

        Set<Integer> normalizedManualReviewLotNumbers = manualReviewLotNumbers.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (normalizedManualReviewLotNumbers.isEmpty()) {
            return summaries;
        }

        return summaries.stream()
                .map(summary -> {
                    if (summary == null || !normalizedManualReviewLotNumbers.contains(summary.lotNumber())) {
                        return summary;
                    }

                    List<ValidationIssue> supplementalIssues = new ArrayList<>();
                    if (summary.supplementalValidationIssues() != null && !summary.supplementalValidationIssues().isEmpty()) {
                        supplementalIssues.addAll(summary.supplementalValidationIssues());
                    }
                    supplementalIssues.add(new ValidationIssue(
                            "REVISAO_MANUAL_SOLICITADA",
                            "AVISO",
                            "REVISAO_MANUAL_SOLICITADA: lote marcado manualmente no editor para conferencia dedicada."
                    ));

                    return new LotTechnicalSummary(
                            summary.lotNumber(),
                            summary.area(),
                            summary.areaExtenso(),
                            summary.perimeter(),
                            summary.perimeterExtenso(),
                            summary.vertexSequence(),
                            summary.sideSummaries(),
                            summary.consolidatedConfrontations(),
                            summary.confrontacoesFormatadas(),
                            summary.streetFrontages(),
                            summary.isCornerLot(),
                            summary.hasDualFrontage(),
                            summary.hasGeoreferencedVertices(),
                            supplementalIssues
                    );
                })
                .toList();
    }

    private String generateTechnicalSummaryCacheKey(
            UUID standardId,
            UUID propertyId,
            Integer lotCountOverride,
            List<String> selectedLayers,
            String technicalSummaryJson,
            String templateName,
            String templateBackendId) {
        String normalizedScope = selectedLayers == null || selectedLayers.isEmpty()
                ? ""
                : selectedLayers.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .collect(Collectors.joining(","));

        String normalizedSummary = technicalSummaryJson == null ? "" : technicalSummaryJson.trim();
        String normalizedTemplateName = templateName == null ? "" : templateName.trim();
        String normalizedTemplateBackendId = templateBackendId == null ? "" : templateBackendId.trim();

        String payload = String.join("|",
                "technical-summary-memorial",
                standardId != null ? standardId.toString() : "",
                propertyId != null ? propertyId.toString() : "",
                lotCountOverride != null ? lotCountOverride.toString() : "",
                normalizedScope,
                normalizedTemplateName,
                normalizedTemplateBackendId,
                normalizedSummary
        );

        return cacheService.generateCacheKey(payload);
    }

    public record TechnicalSummaryPayload(
            String summaryText,
            String technicalSummaryJson,
            String documentSummaryJson,
            ProcessingContextStatusDTO processingContextStatus
    ) {}

    private record TechnicalSummaryDerivationContext(
            PropertyDTO property,
            List<Map<String, Object>> allEntities,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform,
            Map<String, List<String>> confrontations,
            MemorialProcessingContext processingContext,
            int estimatedLotCount,
            List<LotTechnicalSummary> expectedSummaries
    ) {}

    private record LotScope(
            int startLotNumber,
            int maxLots
    ) {}

    private record LegacySpatialContext(
            List<SimplePoint> extractedPoints,
            Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
            DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase
    ) {}

    private record LegacyTextContext(
            List<String> streetNames,
            Map<String, Double> individualAreas
    ) {}

    private record LegacyGenerationContext(
            PropertyDTO property,
            List<SimplePoint> extractedPoints,
            Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
            List<String> streetNames,
            Map<String, List<String>> confrontations,
            Map<String, Double> individualAreas,
            List<LotTechnicalSummary> expectedSummaries,
            int estimatedLotCount,
            DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform,
            MemorialProcessingContext processingContext,
            String memorialBaseJson
    ) {}

    /**
     * Valida se o memorial está completo
     */
    private boolean containsLotNumber(String memorial, int lotNumber) {
        return memorialAlignmentService.containsLotNumber(memorial, lotNumber);
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
