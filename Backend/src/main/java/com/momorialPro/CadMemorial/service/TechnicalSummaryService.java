package com.momorialPro.CadMemorial.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.ProcessingContextStatusDTO;
import com.momorialPro.CadMemorial.dto.PropertyDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class TechnicalSummaryService {
    private static final Pattern POINT_LIKE_REFERENCE_PATTERN = Pattern.compile(
            "(?i)^\\s*(?:P|PT|PONTO|V|VERTICE|VERTEX|ESTACA|E|POINT|POINT:|ESTACA:)\\s*[-_:/# ]*\\s*0*(\\d{1,4})\\s*\\.?\\s*$"
    );

    private final ObjectMapper objectMapper;
    private final CadSystemSettingsService cadSystemSettingsService;

    @Autowired
    public TechnicalSummaryService(
            ObjectMapper objectMapper,
            CadSystemSettingsService cadSystemSettingsService) {
        this.objectMapper = objectMapper;
        this.cadSystemSettingsService = cadSystemSettingsService;
    }

    public TechnicalSummaryService(ObjectMapper objectMapper) {
        this(objectMapper, null);
    }

    public ParsedTechnicalSummary parseTechnicalSummaryJson(String technicalSummaryJson) {
        if (technicalSummaryJson == null || technicalSummaryJson.isBlank()) {
            throw new IllegalArgumentException("Resumo tecnico JSON nao informado para a geracao do memorial.");
        }

        try {
            JsonNode rootNode = objectMapper.readTree(technicalSummaryJson);
            JsonNode lotsNode = rootNode.path("lots");
            if (!lotsNode.isArray() || lotsNode.isEmpty()) {
                throw new IllegalArgumentException("O resumo tecnico JSON nao trouxe lotes validos para gerar o memorial.");
            }

            List<LotTechnicalSummary> summaries = new ArrayList<>();
            int fallbackLotNumber = 1;
            for (JsonNode lotNode : lotsNode) {
                summaries.add(parseLotTechnicalSummaryNode(lotNode, fallbackLotNumber++));
            }

            return new ParsedTechnicalSummary(
                    textValue(rootNode, "analyzedFile"),
                    parseScope(rootNode.path("scope")),
                    parseProcessingContext(rootNode.path("processingContext")),
                    summaries
            );
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Nao foi possivel interpretar o resumo tecnico JSON informado.", e);
        }
    }

    public MemorialApiService.TechnicalSummaryPayload buildTechnicalSummaryPayload(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers) {
        return buildTechnicalSummaryPayload(compareResult, property, summaries, selectedLayers, null);
    }

    public MemorialApiService.TechnicalSummaryPayload buildTechnicalSummaryPayload(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers,
            MemorialProcessingContext processingContext) {
        return buildTechnicalSummaryPayload(compareResult, property, summaries, selectedLayers, processingContext, null, null, null);
    }

    public MemorialApiService.TechnicalSummaryPayload buildTechnicalSummaryPayload(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers,
            MemorialProcessingContext processingContext,
            List<Integer> selectedLotNumbers,
            List<Integer> partialReplacementLotNumbers,
            List<Integer> manualReviewLotNumbers) {
        ProcessingContextStatusDTO processingContextStatus = buildProcessingContextStatus(processingContext);
        return new MemorialApiService.TechnicalSummaryPayload(
                buildTechnicalSummaryDocument(compareResult, property, summaries, selectedLayers, processingContext, selectedLotNumbers),
                buildTechnicalSummaryJson(compareResult, property, summaries, selectedLayers, processingContext, selectedLotNumbers, partialReplacementLotNumbers, manualReviewLotNumbers),
                buildDocumentSummaryJson(compareResult, property, summaries, selectedLayers, processingContext, selectedLotNumbers, partialReplacementLotNumbers, manualReviewLotNumbers),
                processingContextStatus
        );
    }

    public String buildDocumentSummaryJson(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers) {
        return buildDocumentSummaryJson(compareResult, property, summaries, selectedLayers, null);
    }

    public String buildDocumentSummaryJson(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers,
            MemorialProcessingContext processingContext) {
        return buildDocumentSummaryJson(compareResult, property, summaries, selectedLayers, processingContext, null, null);
    }

    public String buildDocumentSummaryJson(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers,
            MemorialProcessingContext processingContext,
            List<Integer> partialReplacementLotNumbers,
            List<Integer> manualReviewLotNumbers) {
        return buildDocumentSummaryJson(
                compareResult,
                property,
                summaries,
                selectedLayers,
                processingContext,
                null,
                partialReplacementLotNumbers,
                manualReviewLotNumbers
        );
    }

    public String buildDocumentSummaryJson(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers,
            MemorialProcessingContext processingContext,
            List<Integer> selectedLotNumbers,
            List<Integer> partialReplacementLotNumbers,
            List<Integer> manualReviewLotNumbers) {
        return buildDocumentSummaryJsonInternal(
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

    public record ParsedTechnicalSummary(
            String analyzedFile,
            List<String> scope,
            MemorialProcessingContext processingContext,
            List<LotTechnicalSummary> summaries
    ) {}

    private LotTechnicalSummary parseLotTechnicalSummaryNode(JsonNode lotNode, int fallbackLotNumber) {
        int lotNumber = intValue(lotNode, "lotNumber", fallbackLotNumber);
        boolean hasGeoreferencedVertices = booleanValue(lotNode, "hasGeoreferencedVertices");
        List<VertexTechnicalPoint> vertices = parseVertexSequence(lotNode.path("vertices"), hasGeoreferencedVertices);
        List<TechnicalSideSummary> sides = parseSideSummaries(lotNode.path("sides"), vertices, lotNumber);

        return new LotTechnicalSummary(
                lotNumber,
                doubleValue(lotNode, "area"),
                textValue(lotNode, "areaExtenso"),
                doubleValue(lotNode, "perimeter"),
                textValue(lotNode, "perimeterExtenso"),
                vertices,
                sides,
                parseConsolidatedConfrontations(lotNode.path("consolidatedConfrontations"), sides, lotNumber),
                textValue(lotNode, "confrontacoesFormatadas"),
                parseStringList(lotNode.path("streetFrontages")),
                booleanValue(lotNode, "isCornerLot"),
                booleanValue(lotNode, "hasDualFrontage"),
                hasGeoreferencedVertices,
                parseValidationIssues(lotNode.path("validacaoTecnica"))
        );
    }

    private Map<String, String> parseConsolidatedConfrontations(
            JsonNode consolidatedNode,
            List<TechnicalSideSummary> sides,
            int lotNumber) {
        Map<String, String> result = new LinkedHashMap<>();

        if (consolidatedNode != null && consolidatedNode.isObject() && !consolidatedNode.isEmpty()) {
            for (String direction : List.of("NORTE", "SUL", "LESTE", "OESTE")) {
                JsonNode directionNode = consolidatedNode.path(direction);
                String reference = textValue(directionNode, "referencia");
                String normalizedReference = normalizeReferenceForLotSummary(reference, lotNumber);
                if (normalizedReference != null && !normalizedReference.isBlank()) {
                    result.put(direction, normalizedReference);
                }
            }
        }

        if (!result.isEmpty()) {
            return result;
        }

        if (sides == null || sides.isEmpty()) {
            return Map.of();
        }

        for (String direction : List.of("NORTE", "SUL", "LESTE", "OESTE")) {
            List<String> references = sides.stream()
                    .filter(side -> direction.equalsIgnoreCase(side.direction()))
                    .map(TechnicalSideSummary::reference)
                    .map(reference -> normalizeReferenceForLotSummary(reference, lotNumber))
                    .filter(Objects::nonNull)
                    .filter(reference -> !reference.isBlank())
                    .distinct()
                    .toList();

            if (!references.isEmpty()) {
                result.put(direction, references.get(0));
            }
        }

        return result.isEmpty() ? Map.of() : result;
    }

    private List<String> parseScope(JsonNode scopeNode) {
        if (scopeNode == null || scopeNode.isMissingNode() || scopeNode.isNull()) {
            return List.of();
        }
        if (scopeNode.isArray()) {
            return parseStringList(scopeNode);
        }

        String singleScope = scopeNode.asText("").trim();
        return singleScope.isEmpty() ? List.of() : List.of(singleScope);
    }

    private String resolveSummaryScopeLabel(List<String> selectedLayers, List<Integer> selectedLotNumbers) {
        if (selectedLayers != null && !selectedLayers.isEmpty()) {
            return String.join(", ", selectedLayers);
        }
        if (selectedLotNumbers != null && selectedLotNumbers.stream().anyMatch(Objects::nonNull)) {
            return "escopo parcial";
        }
        return "arquivo completo";
    }

    private MemorialProcessingContext parseProcessingContext(JsonNode processingContextNode) {
        if (processingContextNode == null || processingContextNode.isMissingNode() || processingContextNode.isNull()) {
            return new MemorialProcessingContext(null);
        }

        JsonNode baseAreaNode = processingContextNode.path("baseArea");
        MemorialProcessingContext.BaseAreaContext baseArea = parseBoundaryContext(
                baseAreaNode,
                "AREA_TOTAL",
                "AREA_TOTAL_P%02d"
        );

        JsonNode originalPropertyNode = processingContextNode.path("originalProperty");
        MemorialProcessingContext.OriginalPropertyContext originalProperty = parseOriginalPropertyContext(originalPropertyNode);
        JsonNode remainingAreaNode = processingContextNode.path("remainingArea");
        MemorialProcessingContext.RemainingAreaContext remainingArea = parseRemainingAreaContext(remainingAreaNode);

        if (baseArea == null && originalProperty == null && remainingArea == null) {
            return new MemorialProcessingContext(null);
        }

        return new MemorialProcessingContext(baseArea, originalProperty, remainingArea);
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
        if (!verticesNode.isArray()) {
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

    private List<VertexTechnicalPoint> parseVertexSequence(JsonNode verticesNode, boolean hasGeoreferencedVertices) {
        if (!verticesNode.isArray() || verticesNode.isEmpty()) {
            return List.of();
        }

        List<VertexTechnicalPoint> vertices = new ArrayList<>();
        int fallbackOrderNumber = 1;
        for (JsonNode vertexNode : verticesNode) {
            int orderNumber = intValue(vertexNode, "orderNumber", fallbackOrderNumber);
            String label = textValue(vertexNode, "label");
            if (label == null || label.isBlank()) {
                label = String.format(Locale.US, "P%02d", orderNumber);
            }

            Double x = hasGeoreferencedVertices
                    ? firstDoubleValue(vertexNode, "easting", "x")
                    : firstDoubleValue(vertexNode, "x", "easting");
            Double y = hasGeoreferencedVertices
                    ? firstDoubleValue(vertexNode, "northing", "y")
                    : firstDoubleValue(vertexNode, "y", "northing");

            vertices.add(new VertexTechnicalPoint(
                    intValue(vertexNode, "originalIndex", fallbackOrderNumber - 1),
                    label,
                    orderNumber,
                    x != null ? x : 0d,
                    y != null ? y : 0d
            ));
            fallbackOrderNumber++;
        }

        return vertices;
    }

    private List<TechnicalSideSummary> parseSideSummaries(
            JsonNode sidesNode,
            List<VertexTechnicalPoint> vertices,
            int lotNumber) {
        if (!sidesNode.isArray() || sidesNode.isEmpty()) {
            return List.of();
        }

        List<TechnicalSideSummary> sides = new ArrayList<>();
        int fallbackSideIndex = 1;
        for (JsonNode sideNode : sidesNode) {
            String startLabel = textValue(sideNode, "startLabel");
            String endLabel = textValue(sideNode, "endLabel");
            if ((startLabel == null || startLabel.isBlank()) && fallbackSideIndex - 1 < vertices.size()) {
                startLabel = vertices.get(fallbackSideIndex - 1).label();
            }
            if ((endLabel == null || endLabel.isBlank()) && !vertices.isEmpty()) {
                int nextIndex = fallbackSideIndex < vertices.size() ? fallbackSideIndex : 0;
                endLabel = vertices.get(nextIndex).label();
            }

            String reference = textValue(sideNode, "reference");
            sides.add(new TechnicalSideSummary(
                    intValue(sideNode, "sideIndex", fallbackSideIndex),
                    startLabel != null ? startLabel : String.format(Locale.US, "P%02d", fallbackSideIndex),
                    endLabel != null ? endLabel : String.format(Locale.US, "P%02d", fallbackSideIndex + 1),
                    doubleValue(sideNode, "length") != null ? doubleValue(sideNode, "length") : 0d,
                    textValue(sideNode, "lengthExtenso"),
                    defaultText(textValue(sideNode, "direction"), "NAO_IDENTIFICADA"),
                    textValue(sideNode, "posicaoCartorial"),
                    textValue(sideNode, "sentidoCaminhamento"),
                    defaultText(textValue(sideNode, "technicalBearing"), "nao informado"),
                    normalizeReferenceForLotSummary(reference, lotNumber),
                    defaultText(textValue(sideNode, "referenceSource"), "technicalSummaryJson"),
                    textValue(sideNode, "reason")
            ));
            fallbackSideIndex++;
        }

        return sides;
    }

    private List<ValidationIssue> parseValidationIssues(JsonNode validationNode) {
        if (validationNode == null || validationNode.isMissingNode() || validationNode.isNull()) {
            return List.of();
        }

        Map<String, ValidationIssue> issues = new LinkedHashMap<>();
        collectValidationIssues(issues, validationNode.path("bloqueantes"), "BLOQUEANTE");
        collectValidationIssues(issues, validationNode.path("avisos"), "AVISO");
        collectValidationIssues(issues, validationNode.path("pendencias"), null);
        return new ArrayList<>(issues.values());
    }

    private void collectValidationIssues(
            Map<String, ValidationIssue> issues,
            JsonNode issueListNode,
            String forcedSeverity) {
        if (!issueListNode.isArray()) {
            return;
        }

        int counter = 1;
        for (JsonNode issueNode : issueListNode) {
            String rawMessage = issueNode.asText("").trim();
            if (rawMessage.isEmpty()) {
                continue;
            }

            String code = extractValidationCode(rawMessage, counter++);
            String severity = forcedSeverity != null ? forcedSeverity : resolveValidationSeverity(code);
            issues.putIfAbsent(
                    code + "|" + rawMessage,
                    new ValidationIssue(code, severity, rawMessage)
            );
        }
    }

    private String extractValidationCode(String rawMessage, int fallbackCounter) {
        int separatorIndex = rawMessage.indexOf(':');
        if (separatorIndex > 0) {
            String candidate = rawMessage.substring(0, separatorIndex).trim().toUpperCase(Locale.ROOT);
            if (!candidate.isBlank()) {
                return candidate;
            }
        }

        return "ISSUE_" + fallbackCounter;
    }

    private List<String> parseStringList(JsonNode arrayNode) {
        if (!arrayNode.isArray() || arrayNode.isEmpty()) {
            return List.of();
        }

        List<String> values = new ArrayList<>();
        for (JsonNode itemNode : arrayNode) {
            String value = itemNode.asText("").trim();
            if (!value.isEmpty()) {
                values.add(value);
            }
        }
        return values;
    }

    private String textValue(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        JsonNode fieldNode = node.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull()) {
            return null;
        }

        String value = fieldNode.asText("");
        return value != null && !value.trim().isEmpty() ? value.trim() : null;
    }

    private Integer intValue(JsonNode node, String fieldName, int fallbackValue) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return fallbackValue;
        }

        JsonNode fieldNode = node.path(fieldName);
        if (fieldNode.isInt() || fieldNode.isLong()) {
            return fieldNode.asInt();
        }
        if (fieldNode.isTextual()) {
            try {
                return Integer.parseInt(fieldNode.asText().trim());
            } catch (NumberFormatException ignored) {
                return fallbackValue;
            }
        }
        return fallbackValue;
    }

    private Double doubleValue(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        JsonNode fieldNode = node.path(fieldName);
        if (fieldNode.isNumber()) {
            return fieldNode.asDouble();
        }
        if (fieldNode.isTextual()) {
            try {
                return Double.parseDouble(fieldNode.asText().trim().replace(",", "."));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private Double firstDoubleValue(JsonNode node, String primaryField, String fallbackField) {
        Double primaryValue = doubleValue(node, primaryField);
        return primaryValue != null ? primaryValue : doubleValue(node, fallbackField);
    }

    private boolean booleanValue(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return false;
        }

        JsonNode fieldNode = node.path(fieldName);
        if (fieldNode.isBoolean()) {
            return fieldNode.asBoolean();
        }
        if (fieldNode.isTextual()) {
            return Boolean.parseBoolean(fieldNode.asText().trim());
        }
        return false;
    }

    private String defaultText(String value, String fallbackValue) {
        return value == null || value.isBlank() ? fallbackValue : value.trim();
    }

    private ProcessingContextStatusDTO buildProcessingContextStatus(MemorialProcessingContext processingContext) {
        MemorialProcessingContext.BaseAreaContext baseArea =
                processingContext != null ? processingContext.baseArea() : null;
        MemorialProcessingContext.OriginalPropertyContext originalProperty =
                processingContext != null ? processingContext.effectiveOriginalProperty() : null;
        MemorialProcessingContext.RemainingAreaContext remainingArea =
                processingContext != null ? processingContext.effectiveRemainingArea() : null;

        int baseAreaPointCount = baseArea != null && baseArea.vertices() != null ? baseArea.vertices().size() : 0;
        int originalPropertyPointCount = originalProperty != null && originalProperty.vertices() != null
                ? originalProperty.vertices().size()
                : 0;
        int remainingAreaPointCount = remainingArea != null && remainingArea.vertices() != null
                ? remainingArea.vertices().size()
                : 0;

        boolean hasBaseArea = baseAreaPointCount > 0;
        boolean hasOriginalProperty = originalPropertyPointCount > 0;
        boolean hasRemainingArea = remainingAreaPointCount > 0;

        if (!hasBaseArea && !hasOriginalProperty) {
            return new ProcessingContextStatusDTO(
                    "absent",
                    false,
                    false,
                    false,
                    0,
                    0,
                    0,
                    "Contexto territorial ausente",
                    "O resumo tecnico foi gerado sem o contorno primario do terreno registrado no processingContext.",
                    List.of(new ProcessingContextStatusDTO.ProcessingContextNoticeDTO(
                            "missing-primary-boundary",
                            "Primarias ausentes no resumo",
                            "O memorial ainda pode ser gerado, mas sem o contorno primario salvo em Operacoes. Confirme se isso faz sentido para esta operacao."
                    ))
            );
        }

        if (!hasBaseArea && hasOriginalProperty) {
            return new ProcessingContextStatusDTO(
                    "partial",
                    false,
                    hasOriginalProperty,
                    hasRemainingArea,
                    0,
                    originalPropertyPointCount,
                    remainingAreaPointCount,
                    "Contexto territorial parcial",
                    "O resumo tecnico preservou o terreno original, mas sem a Area Total primaria registrada explicitamente no processingContext.",
                    List.of(new ProcessingContextStatusDTO.ProcessingContextNoticeDTO(
                            "missing-base-area",
                            "Area Total ausente",
                            "O resumo tecnico informa apenas o terreno original. Revise se as Primarias foram salvas antes de confiar no memorial final."
                    ))
            );
        }

        return new ProcessingContextStatusDTO(
                "complete",
                true,
                hasOriginalProperty,
                hasRemainingArea,
                baseAreaPointCount,
                originalPropertyPointCount,
                remainingAreaPointCount,
                "Contexto territorial completo",
                "O resumo tecnico contem o contorno primario salvo em Operacoes no processingContext.",
                List.of()
        );
    }

    private String buildTechnicalSummaryDocument(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers,
            MemorialProcessingContext processingContext,
            List<Integer> selectedLotNumbers) {
        MeasurementFormatting measurementFormatting = resolveMeasurementFormatting();
        String scopeLabel = resolveSummaryScopeLabel(selectedLayers, selectedLotNumbers);
        StringBuilder builder = new StringBuilder();
        builder.append("RESUMO TECNICO DO MEMORIAL\n");
        builder.append("==========================\n");
        builder.append("Data de geracao: ")
                .append(java.time.LocalDate.now(java.time.ZoneId.of("America/Sao_Paulo")).format(
                        java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .append("\n\n");

        builder.append("ARQUIVO ANALISADO: ")
                .append(compareResult != null && compareResult.getNewFileName() != null
                        ? compareResult.getNewFileName()
                        : "Nao informado")
                .append("\n");

        if (selectedLayers != null && !selectedLayers.isEmpty()) {
            builder.append("ESCOPO SELECIONADO: ")
                    .append(String.join(", ", selectedLayers))
                    .append("\n");
        } else {
            builder.append("ESCOPO SELECIONADO: ").append(scopeLabel).append("\n");
        }

        if (processingContext != null && processingContext.hasBaseArea()) {
            builder.append("AREA TOTAL SALVA: ")
                    .append(processingContext.baseArea().vertices().size())
                    .append(" ponto(s) de contorno\n");
        }
        if (processingContext != null && processingContext.hasRemainingArea()) {
            builder.append("AREA REMANESCENTE CONTEXTUALIZADA: ")
                    .append(processingContext.effectiveRemainingArea().pointCount())
                    .append(" ponto(s) de contorno\n");
        }

        int lotCount = summaries != null ? summaries.size() : 0;
        builder.append("LOTES IDENTIFICADOS: ").append(lotCount).append("\n");

        if (summaries == null || summaries.isEmpty()) {
            builder.append("\nNenhum lote tecnico foi identificado neste escopo.\n");
            return builder.toString().trim();
        }

        double totalArea = summaries.stream()
                .filter(s -> s.area() != null)
                .mapToDouble(LotTechnicalSummary::area)
                .sum();
        long pendingLots = summaries.stream()
                .filter(s -> buildLotValidationEntries(s, summaries).stream().anyMatch(issue -> "BLOQUEANTE".equals(issue.severity())))
                .count();
        long lotsWithWarningsOnly = summaries.stream()
                .filter(s -> {
                    List<ValidationIssue> issues = buildLotValidationEntries(s, summaries);
                    boolean hasBlocking = issues.stream().anyMatch(issue -> "BLOQUEANTE".equals(issue.severity()));
                    boolean hasWarnings = issues.stream().anyMatch(issue -> "AVISO".equals(issue.severity()));
                    return !hasBlocking && hasWarnings;
                })
                .count();
        long approvedLots = summaries.size() - pendingLots - lotsWithWarningsOnly;
        long totalBlockingIssues = summaries.stream()
                .map(summary -> buildLotValidationEntries(summary, summaries))
                .flatMap(List::stream)
                .filter(issue -> "BLOQUEANTE".equals(issue.severity()))
                .count();
        long totalWarningIssues = summaries.stream()
                .map(summary -> buildLotValidationEntries(summary, summaries))
                .flatMap(List::stream)
                .filter(issue -> "AVISO".equals(issue.severity()))
                .count();
        String overallStatus = pendingLots > 0
                ? "PENDENTE"
                : lotsWithWarningsOnly > 0 ? "APROVADO_COM_RESSALVAS" : "APROVADO";

        builder.append("AREA TOTAL DOS LOTES: ")
                .append(formatArea(totalArea, measurementFormatting))
                .append("\n");
        builder.append("STATUS GERAL DO ARQUIVO: ").append(formatValidationStatusLabel(overallStatus)).append("\n");
        builder.append("LOTES APROVADOS: ").append(approvedLots).append("\n");
        builder.append("LOTES COM RESSALVAS: ").append(lotsWithWarningsOnly).append("\n");
        builder.append("LOTES PENDENTES: ").append(pendingLots).append("\n");
        builder.append("TOTAL DE BLOQUEANTES: ").append(totalBlockingIssues).append("\n");
        builder.append("TOTAL DE AVISOS: ").append(totalWarningIssues).append("\n\n");
        builder.append("--------------------------------------------------\n");

        for (LotTechnicalSummary summary : summaries) {
            builder.append("\n");
            builder.append(formatLotTechnicalDocument(summary, summaries, measurementFormatting));
            builder.append("\n");
            builder.append("--------------------------------------------------");
        }

        return builder.toString().trim();
    }

    private String buildTechnicalSummaryJson(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers,
            MemorialProcessingContext processingContext,
            List<Integer> selectedLotNumbers,
            List<Integer> partialReplacementLotNumbers,
            List<Integer> manualReviewLotNumbers) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(
                    buildTechnicalSummaryJsonModel(
                            compareResult,
                            property,
                            summaries,
                            selectedLayers,
                            processingContext,
                            selectedLotNumbers,
                            partialReplacementLotNumbers,
                            manualReviewLotNumbers
                    )
            );
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Nao foi possivel serializar o resumo tecnico em JSON", e);
        }
    }

    private String buildDocumentSummaryJsonInternal(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers,
            MemorialProcessingContext processingContext,
            List<Integer> selectedLotNumbers,
            List<Integer> partialReplacementLotNumbers,
            List<Integer> manualReviewLotNumbers) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(
                    buildDocumentSummaryJsonModel(
                            compareResult,
                            property,
                            summaries,
                            selectedLayers,
                            processingContext,
                            selectedLotNumbers,
                            partialReplacementLotNumbers,
                            manualReviewLotNumbers
                    )
            );
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Nao foi possivel serializar o resumo documental linear em JSON", e);
        }
    }

    private Map<String, Object> buildTechnicalSummaryJsonModel(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers,
            MemorialProcessingContext processingContext,
            List<Integer> selectedLotNumbers,
            List<Integer> partialReplacementLotNumbers,
            List<Integer> manualReviewLotNumbers) {
        MeasurementFormatting measurementFormatting = resolveMeasurementFormatting();
        Set<Integer> normalizedManualReviewLotNumbers = normalizeManualReviewLotNumbers(manualReviewLotNumbers);
        String scopeLabel = resolveSummaryScopeLabel(selectedLayers, selectedLotNumbers);
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("documentType", "RESUMO_TECNICO_MEMORIAL");
        document.put("generatedAt", java.time.OffsetDateTime.now().toString());
        document.put(
                "analyzedFile",
                compareResult != null && compareResult.getNewFileName() != null
                        ? compareResult.getNewFileName()
                        : null
        );
        document.put("scope", (selectedLayers == null || selectedLayers.isEmpty()) ? scopeLabel : selectedLayers);
        document.put("lotCount", summaries != null ? summaries.size() : 0);
        document.put("measurementUnit", measurementFormatting.lengthUnit());
        document.put("areaUnit", measurementFormatting.areaUnit());

        document.put("property", buildSuppressedTechnicalSummaryPropertyNode());
        appendProcessingContext(document, processingContext);
        appendPartialReplacementContext(document, summaries, partialReplacementLotNumbers);
        appendManualReviewContext(document, summaries, normalizedManualReviewLotNumbers);

        List<Map<String, Object>> lots = new ArrayList<>();
        if (summaries != null) {
            for (LotTechnicalSummary summary : summaries) {
                lots.add(buildLotTechnicalSummaryJsonNode(summary, normalizedManualReviewLotNumbers.contains(summary.lotNumber()), summaries));
            }
        }
        document.put("lots", lots);
        return document;
    }

    private Map<String, Object> buildDocumentSummaryJsonModel(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers,
            MemorialProcessingContext processingContext,
            List<Integer> selectedLotNumbers,
            List<Integer> partialReplacementLotNumbers,
            List<Integer> manualReviewLotNumbers) {
        MeasurementFormatting measurementFormatting = resolveMeasurementFormatting();
        Set<Integer> normalizedManualReviewLotNumbers = normalizeManualReviewLotNumbers(manualReviewLotNumbers);
        String scopeLabel = resolveSummaryScopeLabel(selectedLayers, selectedLotNumbers);
        List<LotTechnicalSummary> safeSummaries = summaries != null ? summaries : List.of();
        double totalArea = safeSummaries.stream()
                .filter(summary -> summary.area() != null)
                .mapToDouble(LotTechnicalSummary::area)
                .sum();
        long pendingLots = safeSummaries.stream()
                .filter(summary -> buildLotValidationEntries(summary).stream()
                        .anyMatch(issue -> "BLOQUEANTE".equals(issue.severity())))
                .count();
        long lotsWithWarningsOnly = safeSummaries.stream()
                .filter(summary -> {
                    List<ValidationIssue> issues = buildLotValidationEntries(summary, safeSummaries);
                    boolean hasBlocking = issues.stream().anyMatch(issue -> "BLOQUEANTE".equals(issue.severity()));
                    boolean hasWarnings = issues.stream().anyMatch(issue -> "AVISO".equals(issue.severity()));
                    return !hasBlocking && hasWarnings;
                })
                .count();
        long approvedLots = safeSummaries.size() - pendingLots - lotsWithWarningsOnly;
        long totalBlockingIssues = safeSummaries.stream()
                .map(this::buildLotValidationEntries)
                .flatMap(List::stream)
                .filter(issue -> "BLOQUEANTE".equals(issue.severity()))
                .count();
        long totalWarningIssues = safeSummaries.stream()
                .map(this::buildLotValidationEntries)
                .flatMap(List::stream)
                .filter(issue -> "AVISO".equals(issue.severity()))
                .count();
        String overallStatus = pendingLots > 0
                ? "PENDENTE"
                : lotsWithWarningsOnly > 0 ? "APROVADO_COM_RESSALVAS" : "APROVADO";

        Map<String, Object> document = new LinkedHashMap<>();
        document.put("documentType", "RESUMO_DOCUMENTAL_LINEAR");
        document.put("sourceDocumentType", "RESUMO_TECNICO_MEMORIAL");
        document.put("generatedAt", java.time.OffsetDateTime.now().toString());
        document.put(
                "analyzedFile",
                compareResult != null && compareResult.getNewFileName() != null
                        ? compareResult.getNewFileName()
                        : null
        );
        document.put("scope", (selectedLayers == null || selectedLayers.isEmpty()) ? scopeLabel : selectedLayers);
        document.put("lotCount", safeSummaries.size());
        document.put("measurementUnit", measurementFormatting.lengthUnit());
        document.put("areaUnit", measurementFormatting.areaUnit());

        document.put("property", buildSuppressedTechnicalSummaryPropertyNode());
        appendProcessingContext(document, processingContext);
        appendPartialReplacementContext(document, safeSummaries, partialReplacementLotNumbers);
        appendManualReviewContext(document, safeSummaries, normalizedManualReviewLotNumbers);

        Map<String, Object> reportSummary = new LinkedHashMap<>();
        reportSummary.put("overallStatus", overallStatus);
        reportSummary.put("overallStatusLabel", formatValidationStatusLabel(overallStatus));
        reportSummary.put("totalArea", totalArea);
        reportSummary.put("totalAreaFormatted", formatArea(totalArea, measurementFormatting));
        reportSummary.put("approvedLots", approvedLots);
        reportSummary.put("lotsWithWarnings", lotsWithWarningsOnly);
        reportSummary.put("pendingLots", pendingLots);
        reportSummary.put("totalBlockingIssues", totalBlockingIssues);
        reportSummary.put("totalWarningIssues", totalWarningIssues);
        document.put("reportSummary", reportSummary);

        List<Map<String, Object>> lots = new ArrayList<>();
        for (LotTechnicalSummary summary : safeSummaries) {
                lots.add(buildLotDocumentSummaryJsonNode(
                    summary,
                    measurementFormatting,
                    normalizedManualReviewLotNumbers.contains(summary.lotNumber()),
                    safeSummaries
            ));
        }
        document.put("lots", lots);
        return document;
    }

    private Map<String, Object> buildSuppressedTechnicalSummaryPropertyNode() {
        return new LinkedHashMap<>();
    }

    private void appendProcessingContext(
            Map<String, Object> document,
            MemorialProcessingContext processingContext) {
        if (document == null || processingContext == null) {
            return;
        }

        Map<String, Object> processingContextNode = new LinkedHashMap<>();
        if (processingContext.hasBaseArea()) {
            processingContextNode.put("baseArea", serializeBoundaryContext(processingContext.baseArea()));
        }

        MemorialProcessingContext.OriginalPropertyContext originalProperty = processingContext.effectiveOriginalProperty();
        if (originalProperty != null && originalProperty.hasVertices()) {
            Map<String, Object> originalPropertyNode = serializeBoundaryContext(
                    new MemorialProcessingContext.BaseAreaContext(
                            originalProperty.resolvedLabel(),
                            originalProperty.vertices()
                    )
            );
            originalPropertyNode.put("source", originalProperty.resolvedSource());
            originalPropertyNode.put("narrativeRole", originalProperty.resolvedNarrativeRole());
            processingContextNode.put("originalProperty", originalPropertyNode);
        }

        MemorialProcessingContext.RemainingAreaContext remainingArea = processingContext.effectiveRemainingArea();
        if (remainingArea != null && remainingArea.hasVertices()) {
            Map<String, Object> remainingAreaNode = serializeBoundaryContext(
                    new MemorialProcessingContext.BaseAreaContext(
                            remainingArea.resolvedLabel(),
                            remainingArea.vertices()
                    )
            );
            remainingAreaNode.put("source", remainingArea.resolvedSource());
            remainingAreaNode.put("narrativeRole", remainingArea.resolvedNarrativeRole());
            processingContextNode.put("remainingArea", remainingAreaNode);
        }

        if (processingContextNode.isEmpty()) {
            return;
        }

        document.put("processingContext", processingContextNode);
    }

    private Set<Integer> normalizeManualReviewLotNumbers(List<Integer> manualReviewLotNumbers) {
        if (manualReviewLotNumbers == null || manualReviewLotNumbers.isEmpty()) {
            return Set.of();
        }

        return manualReviewLotNumbers.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private void appendManualReviewContext(
            Map<String, Object> document,
            List<LotTechnicalSummary> summaries,
            Set<Integer> manualReviewLotNumbers) {
        if (document == null || manualReviewLotNumbers == null || manualReviewLotNumbers.isEmpty()) {
            return;
        }

        Set<Integer> matchedLotNumbers = (summaries == null ? List.<LotTechnicalSummary>of() : summaries).stream()
                .map(LotTechnicalSummary::lotNumber)
                .filter(manualReviewLotNumbers::contains)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<Integer> missingLotNumbers = manualReviewLotNumbers.stream()
                .filter(lotNumber -> !matchedLotNumbers.contains(lotNumber))
                .toList();

        Map<String, Object> manualReviewNode = new LinkedHashMap<>();
        manualReviewNode.put("reviewRequired", true);
        manualReviewNode.put("requestedLotNumbers", new ArrayList<>(manualReviewLotNumbers));
        manualReviewNode.put("matchedLotNumbers", new ArrayList<>(matchedLotNumbers));
        manualReviewNode.put("missingLotNumbers", missingLotNumbers);
        manualReviewNode.put("requestedCount", manualReviewLotNumbers.size());
        manualReviewNode.put("matchedCount", matchedLotNumbers.size());
        manualReviewNode.put("missingCount", missingLotNumbers.size());
        manualReviewNode.put(
                "note",
                "Esses lotes foram marcados manualmente no editor e exigem conferencia dedicada no resumo tecnico."
        );
        document.put("manualReview", manualReviewNode);
    }

    private void appendPartialReplacementContext(
            Map<String, Object> document,
            List<LotTechnicalSummary> summaries,
            List<Integer> partialReplacementLotNumbers) {
        if (document == null || partialReplacementLotNumbers == null || partialReplacementLotNumbers.isEmpty()) {
            return;
        }

        Set<Integer> normalizedPartialReplacementLotNumbers = partialReplacementLotNumbers.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<Integer> matchedLotNumbers = (summaries == null ? List.<LotTechnicalSummary>of() : summaries).stream()
                .map(LotTechnicalSummary::lotNumber)
                .filter(normalizedPartialReplacementLotNumbers::contains)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<Integer> missingLotNumbers = normalizedPartialReplacementLotNumbers.stream()
                .filter(lotNumber -> !matchedLotNumbers.contains(lotNumber))
                .toList();

        Map<String, Object> partialReplacementNode = new LinkedHashMap<>();
        partialReplacementNode.put("applied", true);
        partialReplacementNode.put("requestedLotNumbers", new ArrayList<>(normalizedPartialReplacementLotNumbers));
        partialReplacementNode.put("matchedLotNumbers", new ArrayList<>(matchedLotNumbers));
        partialReplacementNode.put("missingLotNumbers", missingLotNumbers);
        partialReplacementNode.put("requestedCount", normalizedPartialReplacementLotNumbers.size());
        partialReplacementNode.put("matchedCount", matchedLotNumbers.size());
        partialReplacementNode.put("missingCount", missingLotNumbers.size());
        partialReplacementNode.put(
                "note",
                "Esses lotes foram substituidos pelas geometrias salvas em parcial e entram normalmente no resumo tecnico."
        );
        document.put("partialReplacements", partialReplacementNode);
    }

    private Map<String, Object> serializeBoundaryContext(MemorialProcessingContext.BaseAreaContext boundaryContext) {
        Map<String, Object> boundaryNode = new LinkedHashMap<>();
        boundaryNode.put("label", boundaryContext.label());
        boundaryNode.put("pointCount", boundaryContext.vertices().size());
        boundaryNode.put("coordinateAxis", List.of("X", "Y"));

        List<Map<String, Object>> vertices = new ArrayList<>();
        for (MemorialProcessingContext.BaseAreaPoint vertex : boundaryContext.vertices()) {
            Map<String, Object> vertexNode = new LinkedHashMap<>();
            vertexNode.put("orderNumber", vertex.orderNumber());
            vertexNode.put("label", vertex.label());
            vertexNode.put("x", vertex.x());
            vertexNode.put("y", vertex.y());
            vertices.add(vertexNode);
        }
        boundaryNode.put("vertices", vertices);
        return boundaryNode;
    }

    private Map<String, Object> buildLotTechnicalSummaryJsonNode(
            LotTechnicalSummary summary,
            boolean manualReviewRequested,
            List<LotTechnicalSummary> summaryContext) {
        Map<String, Object> lot = new LinkedHashMap<>();
        lot.put("lotNumber", summary.lotNumber());
        lot.put("manualReviewRequested", manualReviewRequested);
        lot.put("area", summary.area());
        lot.put("areaExtenso", summary.areaExtenso());
        lot.put("perimeter", summary.perimeter());
        lot.put("perimeterExtenso", summary.perimeterExtenso());
        lot.put("confrontacoesFormatadas", summary.confrontacoesFormatadas());
        lot.put("isCornerLot", summary.isCornerLot());
        lot.put("hasDualFrontage", summary.hasDualFrontage());
        lot.put("hasGeoreferencedVertices", summary.hasGeoreferencedVertices());
        lot.put("coordinateAxis", summary.hasGeoreferencedVertices() ? List.of("E", "N") : List.of("X", "Y"));
        lot.put("streetFrontages", summary.streetFrontages());
        lot.put("pointOrder", summary.vertexSequence().stream()
                .map(VertexTechnicalPoint::label)
                .filter(Objects::nonNull)
                .collect(Collectors.toList()));

        List<Map<String, Object>> vertices = new ArrayList<>();
        for (VertexTechnicalPoint vertex : summary.vertexSequence()) {
            Map<String, Object> vertexNode = new LinkedHashMap<>();
            vertexNode.put("originalIndex", vertex.originalIndex());
            vertexNode.put("label", vertex.label());
            vertexNode.put("orderNumber", vertex.orderNumber());
            vertexNode.put(summary.hasGeoreferencedVertices() ? "easting" : "x", vertex.x());
            vertexNode.put(summary.hasGeoreferencedVertices() ? "northing" : "y", vertex.y());
            vertices.add(vertexNode);
        }
        lot.put("vertices", vertices);

        List<Map<String, Object>> sides = new ArrayList<>();
        for (TechnicalSideSummary side : summary.sideSummaries()) {
            Map<String, Object> sideNode = new LinkedHashMap<>();
            sideNode.put("sideIndex", side.sideIndex());
            sideNode.put("startLabel", side.startLabel());
            sideNode.put("endLabel", side.endLabel());
            sideNode.put("length", side.length());
            sideNode.put("direction", side.direction());
            sideNode.put("technicalBearing", side.technicalBearing());
            sideNode.put("reference", normalizeReferenceForLotSummary(side.reference(), summary.lotNumber()));
            sideNode.put("referenceSource", side.referenceSource());
            sideNode.put("reason", side.reason());
            sides.add(sideNode);
        }
        lot.put("sides", sides);

        Map<String, Object> consolidatedConfrontations = new LinkedHashMap<>();
        for (String direction : List.of("NORTE", "SUL", "LESTE", "OESTE")) {
            String ref = buildDeterministicDirectionReference(summary, direction);
            String displayRef = buildDeterministicDirectionReferenceDisplay(summary, direction);
            boolean isUnidentified = isUnidentifiedReference(ref);
            boolean isSelfReferencedDirection = hasSelfReferencedDirection(summary, direction);
            boolean isPlaceholder = isInternalSubdivisionReference(ref);
            Map<String, Object> confrontNode = new LinkedHashMap<>();
            confrontNode.put("referencia", isUnidentified ? null : displayRef);
            confrontNode.put("status", isUnidentified ? "NAO_IDENTIFICADA"
                    : isSelfReferencedDirection ? "SUSPEITA"
                    : isPlaceholder ? "INFERIDA" : "IDENTIFICADA");
            consolidatedConfrontations.put(direction, confrontNode);
        }
        lot.put("consolidatedConfrontations", consolidatedConfrontations);

        List<ValidationIssue> validationIssues = buildLotValidationEntries(summary, summaryContext);
        List<String> issues = validationIssues.stream().map(ValidationIssue::message).collect(Collectors.toList());
        List<String> blockingIssues = validationIssues.stream()
                .filter(issue -> "BLOQUEANTE".equals(issue.severity()))
                .map(ValidationIssue::message)
                .collect(Collectors.toList());
        List<String> warningIssues = validationIssues.stream()
                .filter(issue -> "AVISO".equals(issue.severity()))
                .map(ValidationIssue::message)
                .collect(Collectors.toList());
        Map<String, Object> validation = new LinkedHashMap<>();
        validation.put("aprovado", issues.isEmpty());
        validation.put("statusGeral", blockingIssues.isEmpty()
                ? warningIssues.isEmpty() ? "APROVADO" : "APROVADO_COM_RESSALVAS"
                : "PENDENTE");
        validation.put("pendencias", issues);
        validation.put("bloqueantes", blockingIssues);
        validation.put("avisos", warningIssues);
        lot.put("validacaoTecnica", validation);

        return lot;
    }

    private Map<String, Object> buildLotDocumentSummaryJsonNode(
            LotTechnicalSummary summary,
            MeasurementFormatting measurementFormatting,
            boolean manualReviewRequested,
            List<LotTechnicalSummary> summaryContext) {
        List<ValidationIssue> validationIssues = buildLotValidationEntries(summary, summaryContext);
        List<ValidationIssue> blockingValidationIssues = validationIssues.stream()
                .filter(issue -> "BLOQUEANTE".equals(issue.severity()))
                .collect(Collectors.toList());
        List<ValidationIssue> warningValidationIssues = validationIssues.stream()
                .filter(issue -> "AVISO".equals(issue.severity()))
                .collect(Collectors.toList());
        String validationStatus = blockingValidationIssues.isEmpty()
                ? warningValidationIssues.isEmpty() ? "APROVADO" : "APROVADO_COM_RESSALVAS"
                : "PENDENTE";

        Map<String, Object> lot = new LinkedHashMap<>();
        lot.put("lotNumber", summary.lotNumber());
        lot.put("title", "LOTE " + summary.lotNumber());
        lot.put("manualReviewRequested", manualReviewRequested);
        lot.put("status", validationStatus);
        lot.put("statusLabel", formatValidationStatusLabel(validationStatus));
        lot.put("statusDescription", formatValidationStatusDescription(validationStatus));
        lot.put("primaryReason", buildLotPrimaryReason(validationStatus, blockingValidationIssues, warningValidationIssues));
        lot.put("recommendedAction", buildLotRecommendedAction(validationStatus, validationIssues));

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("area", summary.area());
        metrics.put("areaFormatted", summary.area() != null ? formatArea(summary.area(), measurementFormatting) : "nao identificada");
        metrics.put("perimeter", summary.perimeter());
        metrics.put("perimeterFormatted", summary.perimeter() != null ? formatLength(summary.perimeter(), measurementFormatting) : "nao identificado");
        metrics.put("isCornerLot", summary.isCornerLot());
        metrics.put("hasDualFrontage", summary.hasDualFrontage());
        metrics.put("hasGeoreferencedVertices", summary.hasGeoreferencedVertices());
        metrics.put("streetFrontages", summary.streetFrontages());
        lot.put("metrics", metrics);

        List<String> pointSequence = summary.vertexSequence().stream()
                .map(VertexTechnicalPoint::label)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        lot.put("pointSequence", pointSequence);
        lot.put("pointSequenceText", pointSequence.isEmpty() ? "nao disponivel" : String.join(" -> ", pointSequence));

        List<Map<String, Object>> vertices = new ArrayList<>();
        for (VertexTechnicalPoint vertex : summary.vertexSequence()) {
            Map<String, Object> vertexNode = new LinkedHashMap<>();
            vertexNode.put("label", vertex.label());
            vertexNode.put("orderNumber", vertex.orderNumber());
            vertexNode.put("originalIndex", vertex.originalIndex());
            vertexNode.put(summary.hasGeoreferencedVertices() ? "easting" : "x", vertex.x());
            vertexNode.put(summary.hasGeoreferencedVertices() ? "northing" : "y", vertex.y());
            vertexNode.put("formatted", String.format(
                    Locale.US,
                    "%s: %s %.3f | %s %.3f",
                    vertex.label(),
                    summary.hasGeoreferencedVertices() ? "E" : "X",
                    vertex.x(),
                    summary.hasGeoreferencedVertices() ? "N" : "Y",
                    vertex.y()
            ));
            vertices.add(vertexNode);
        }
        lot.put("vertices", vertices);

        List<Map<String, Object>> sideSections = new ArrayList<>();
        for (TechnicalSideSummary side : summary.sideSummaries()) {
            String normalizedReference = normalizeReferenceForLotSummary(side.reference(), summary.lotNumber());
            boolean selfReferenced = isSelfReferencedLot(side.reference(), summary.lotNumber());
            boolean unidentified = isUnidentifiedReference(normalizedReference);

            Map<String, Object> sideNode = new LinkedHashMap<>();
            sideNode.put("sideIndex", side.sideIndex());
            sideNode.put("startLabel", side.startLabel());
            sideNode.put("endLabel", side.endLabel());
            sideNode.put("direction", side.direction());
            sideNode.put("technicalBearing", side.technicalBearing());
            sideNode.put("length", side.length());
            sideNode.put("lengthFormatted", formatLength(side.length(), measurementFormatting));
            sideNode.put("reference", unidentified ? null : normalizedReference);
            sideNode.put("referenceStatus", unidentified
                    ? "NAO_IDENTIFICADA"
                    : selfReferenced ? "AUTORREFERENCIA_SUBSTITUIDA" : "IDENTIFICADA");
            sideNode.put("referenceDisplay", selfReferenced
                    ? "divisa interna do loteamento [autorreferencia substituida]"
                    : unidentified ? "Nao identificada" : normalizedReference);
            sideNode.put("reportLine", String.format(
                    Locale.US,
                    "%02d: %s -> %s | comprimento: %s | direcao: %s | rumo: %s | confrontacao: %s",
                    side.sideIndex(),
                    side.startLabel(),
                    side.endLabel(),
                    formatLength(side.length(), measurementFormatting),
                    side.direction(),
                    side.technicalBearing(),
                    selfReferenced
                            ? "divisa interna do loteamento [autorreferencia substituida]"
                            : unidentified ? "Nao identificada" : normalizedReference
            ));
            sideSections.add(sideNode);
        }
        lot.put("sideSections", sideSections);

        List<Map<String, Object>> directionalConfrontations = new ArrayList<>();
        for (String direction : List.of("NORTE", "SUL", "LESTE", "OESTE")) {
            String reference = buildDeterministicDirectionReference(summary, direction);
            String displayRef = buildDeterministicDirectionReferenceDisplay(summary, direction);
            boolean unidentified = isUnidentifiedReference(reference);
            boolean selfReferenced = hasSelfReferencedDirection(summary, direction);
            boolean placeholder = isInternalSubdivisionReference(reference);

            Map<String, Object> directionNode = new LinkedHashMap<>();
            directionNode.put("direction", direction);
            directionNode.put("reference", unidentified ? null : displayRef);
            directionNode.put("status", unidentified
                    ? "NAO_IDENTIFICADA"
                    : selfReferenced ? "SUSPEITA"
                    : placeholder ? "INFERIDA" : "IDENTIFICADA");
            directionNode.put("reportLine", "AO " + direction + ": " + (unidentified ? "Nao identificada" : displayRef));
            directionalConfrontations.add(directionNode);
        }
        lot.put("directionalConfrontations", directionalConfrontations);

        Map<String, Object> validation = new LinkedHashMap<>();
        validation.put("blockingIssues", blockingValidationIssues.stream()
                .map(ValidationIssue::message)
                .collect(Collectors.toList()));
        validation.put("warningIssues", warningValidationIssues.stream()
                .map(ValidationIssue::message)
                .collect(Collectors.toList()));
        validation.put("allIssues", validationIssues.stream()
                .map(ValidationIssue::message)
                .collect(Collectors.toList()));
        lot.put("validation", validation);

        Map<String, Object> reportBlocks = new LinkedHashMap<>();
        reportBlocks.put("heading", "LOTE " + summary.lotNumber() + ":");
        reportBlocks.put("situationLine", "Situacao do lote: " + formatValidationStatusDescription(validationStatus));
        reportBlocks.put("primaryReasonLine", "Motivo principal: " + buildLotPrimaryReason(validationStatus, blockingValidationIssues, warningValidationIssues));
        reportBlocks.put("recommendedActionLine", "Acao recomendada: " + buildLotRecommendedAction(validationStatus, validationIssues));
        reportBlocks.put("areaLine", "Area apurada: " + (summary.area() != null ? formatArea(summary.area(), measurementFormatting) : "nao identificada"));
        reportBlocks.put("perimeterLine", "Perimetro apurado: " + (summary.perimeter() != null ? formatLength(summary.perimeter(), measurementFormatting) : "nao identificado"));
        reportBlocks.put("pointSequenceLine", "Sequencia perimetral dos pontos: " + (pointSequence.isEmpty() ? "nao disponivel" : String.join(" -> ", pointSequence)));
        reportBlocks.put("frontagesLine", summary.streetFrontages().isEmpty()
                ? null
                : "Frentes viarias reconhecidas: " + String.join(", ", summary.streetFrontages()));
        reportBlocks.put("vertexLines", vertices.stream()
                .map(vertex -> Objects.toString(vertex.get("formatted"), ""))
                .collect(Collectors.toList()));
        reportBlocks.put("sideLines", sideSections.stream()
                .map(side -> Objects.toString(side.get("reportLine"), ""))
                .collect(Collectors.toList()));
        reportBlocks.put("directionLines", directionalConfrontations.stream()
                .map(direction -> Objects.toString(direction.get("reportLine"), ""))
                .collect(Collectors.toList()));
        lot.put("reportBlocks", reportBlocks);

        return lot;
    }

    private String formatLotTechnicalDocument(
            LotTechnicalSummary summary,
            List<LotTechnicalSummary> summaryContext,
            MeasurementFormatting measurementFormatting) {
        StringBuilder builder = new StringBuilder();
        List<ValidationIssue> validationIssues = buildLotValidationEntries(summary, summaryContext);
        List<ValidationIssue> blockingValidationIssues = validationIssues.stream()
                .filter(issue -> "BLOQUEANTE".equals(issue.severity()))
                .collect(Collectors.toList());
        List<ValidationIssue> warningValidationIssues = validationIssues.stream()
                .filter(issue -> "AVISO".equals(issue.severity()))
                .collect(Collectors.toList());
        List<String> blockingIssues = blockingValidationIssues.stream().map(ValidationIssue::message).collect(Collectors.toList());
        List<String> warningIssues = warningValidationIssues.stream().map(ValidationIssue::message).collect(Collectors.toList());
        String validationStatus = blockingValidationIssues.isEmpty()
                ? warningValidationIssues.isEmpty() ? "APROVADO" : "APROVADO_COM_RESSALVAS"
                : "PENDENTE";

        builder.append("LOTE ").append(summary.lotNumber())
                .append(" [").append(formatValidationStatusLabel(validationStatus)).append("]")
                .append("\n");
        builder.append("- Situacao do lote: ").append(formatValidationStatusDescription(validationStatus)).append("\n");
        builder.append("- Motivo principal: ")
                .append(buildLotPrimaryReason(validationStatus, blockingValidationIssues, warningValidationIssues))
                .append("\n");
        builder.append("- Acao recomendada: ")
                .append(buildLotRecommendedAction(validationStatus, validationIssues))
                .append("\n");
        if (!blockingIssues.isEmpty()) {
            builder.append("  BLOQUEANTES:\n");
            for (String issue : blockingIssues) {
                builder.append("  ! ").append(formatValidationMessageForText(issue)).append("\n");
            }
        }
        if (!warningIssues.isEmpty()) {
            builder.append("  AVISOS:\n");
            for (String issue : warningIssues) {
                builder.append("  - ").append(formatValidationMessageForText(issue)).append("\n");
            }
        }

        builder.append("- Area apurada: ")
                .append(summary.area() != null ? formatArea(summary.area(), measurementFormatting) : "nao identificada")
                .append("\n");
        builder.append("- Perimetro apurado: ")
                .append(summary.perimeter() != null ? formatLength(summary.perimeter(), measurementFormatting) : "nao identificado")
                .append("\n");
        builder.append("- Lote de esquina: ").append(summary.isCornerLot() ? "sim" : "nao").append("\n");
        builder.append("- Lote com dupla frente: ").append(summary.hasDualFrontage() ? "sim" : "nao").append("\n");
        builder.append("- Georreferenciamento disponivel: ").append(summary.hasGeoreferencedVertices() ? "sim" : "nao").append("\n");
        builder.append("- Sequencia perimetral dos pontos: ")
                .append(summary.vertexSequence().isEmpty()
                        ? "nao disponivel"
                        : summary.vertexSequence().stream().map(VertexTechnicalPoint::label).collect(Collectors.joining(" -> ")))
                .append("\n");

        if (!summary.streetFrontages().isEmpty()) {
            builder.append("- Frentes viarias reconhecidas: ")
                    .append(String.join(", ", summary.streetFrontages()))
                    .append("\n");
        }

        builder.append("\nVERTICES DE REFERENCIA:\n");
        if (summary.vertexSequence().isEmpty()) {
            builder.append("- Nao disponivel para este lote.\n");
        }
        java.util.Set<String> seenCoords = new java.util.HashSet<>();
        for (VertexTechnicalPoint vertex : summary.vertexSequence()) {
            String coordKey = String.format(Locale.US, "%.3f|%.3f", vertex.x(), vertex.y());
            boolean isDuplicate = !seenCoords.add(coordKey);
            builder.append("- ")
                    .append(vertex.label())
                    .append(": ")
                    .append(summary.hasGeoreferencedVertices() ? "E " : "X ")
                    .append(String.format(Locale.US, "%.3f", vertex.x()))
                    .append(" | ")
                    .append(summary.hasGeoreferencedVertices() ? "N " : "Y ")
                    .append(String.format(Locale.US, "%.3f", vertex.y()));
            if (isDuplicate) {
                builder.append(" [VERTICE DUPLICADO]");
            }
            builder.append("\n");
        }

        builder.append("\nARESTAS E CONFRONTANTES POR SEGMENTO:\n");
        if (summary.sideSummaries().isEmpty()) {
            builder.append("- Nao disponivel para este lote.\n");
        }
        for (TechnicalSideSummary side : summary.sideSummaries()) {
            builder.append("- ")
                    .append(String.format(Locale.US, "%02d", side.sideIndex()))
                    .append(": ")
                    .append(side.startLabel())
                    .append(" -> ")
                    .append(side.endLabel())
                    .append(" | comprimento: ")
                    .append(formatLength(side.length(), measurementFormatting));
            if (side.length() < 0.01) {
                builder.append(" [ARESTA DEGENERADA]");
            }
            builder.append(" | direcao: ").append(side.direction())
                    .append(" | rumo: ").append(side.technicalBearing())
                    .append(" | confrontacao: ");
            String ref = side.reference();
            if (isSelfReferencedLot(ref, summary.lotNumber())) {
                builder.append("divisa interna do loteamento [autorreferencia substituida]\n");
                continue;
            }
            if (isUnidentifiedReference(ref)) {
                builder.append("Nao identificada");
            } else {
                builder.append(ref);
            }
            builder.append("\n");
        }

        builder.append("\nCONFRONTACOES CONSOLIDADAS POR DIRECAO:\n");
        for (String direction : List.of("NORTE", "SUL", "LESTE", "OESTE")) {
            String ref = buildDeterministicDirectionReference(summary, direction);
            String displayRef = buildDeterministicDirectionReferenceDisplay(summary, direction);
            builder.append("- AO ").append(direction).append(": ");
            if (isUnidentifiedReference(ref)) {
                builder.append("Nao identificada");
            } else {
                builder.append(displayRef);
            }
            builder.append("\n");
        }

        return builder.toString().trim();
    }

    private List<ValidationIssue> buildLotValidationEntries(LotTechnicalSummary summary) {
        return buildLotValidationEntries(summary, null);
    }

    private List<ValidationIssue> buildLotValidationEntries(
            LotTechnicalSummary summary,
            List<LotTechnicalSummary> summaryContext) {
        Map<String, ValidationIssue> issues = new LinkedHashMap<>();

        if (summary.supplementalValidationIssues() != null) {
            for (ValidationIssue issue : summary.supplementalValidationIssues()) {
                if (issue == null || issue.code() == null || issue.code().isBlank()
                        || issue.message() == null || issue.message().isBlank()) {
                    continue;
                }
                issues.putIfAbsent(issue.code() + "|" + issue.message(), issue);
            }
        }

        if (summary.vertexSequence() == null || summary.vertexSequence().isEmpty()
                || summary.sideSummaries() == null || summary.sideSummaries().isEmpty()) {
            return new ArrayList<>(issues.values());
        }

        Map<String, String> coordToFirstLabel = new LinkedHashMap<>();
        for (VertexTechnicalPoint v : summary.vertexSequence()) {
            String key = String.format(Locale.US, "%.3f|%.3f", v.x(), v.y());
            String first = coordToFirstLabel.put(key, v.label());
            if (first != null) {
                putValidationIssue(issues, "VERTICE_DUPLICADO", first + " e " + v.label() + " possuem a mesma coordenada");
            }
        }

        for (TechnicalSideSummary side : summary.sideSummaries()) {
            if (side.length() < 0.01) {
                MeasurementFormatting measurementFormatting = resolveMeasurementFormatting();
                putValidationIssue(
                        issues,
                        "ARESTA_DEGENERADA",
                        "aresta " + side.sideIndex() + " (" + side.startLabel() + " -> " + side.endLabel()
                                + ") com comprimento " + formatLength(side.length(), measurementFormatting)
                );
            }
        }

        boolean manualReviewRequested = hasManualReviewRequested(summary);

        long unidentifiedSides = summary.sideSummaries().stream()
                .filter(s -> isUnidentifiedReference(s.reference()))
                .count();
        if (unidentifiedSides > 0) {
            putValidationIssue(
                    issues,
                    "CONFRONTACAO_NAO_IDENTIFICADA",
                    manualReviewRequested ? "AVISO" : "BLOQUEANTE",
                    unidentifiedSides + " lado(s) sem confrontante definido no DXF"
            );
        }

        List<String> unidentifiedDirections = List.of("NORTE", "SUL", "LESTE", "OESTE").stream()
                .filter(direction -> isUnidentifiedReference(buildDeterministicDirectionReference(summary, direction)))
                .collect(Collectors.toList());
        if (!unidentifiedDirections.isEmpty()) {
            putValidationIssue(
                    issues,
                    "CONFRONTACAO_NAO_IDENTIFICADA",
                    manualReviewRequested ? "AVISO" : "BLOQUEANTE",
                    "direcao(oes) consolidada(s) sem confrontante definido: " + String.join(", ", unidentifiedDirections)
            );
        }

        long genericDirections = List.of("NORTE", "SUL", "LESTE", "OESTE").stream()
                .map(direction -> buildDeterministicDirectionReference(summary, direction))
                .filter(reference -> isUnidentifiedReference(reference) || isInternalSubdivisionReference(reference))
                .count();
        if (summary.streetFrontages().isEmpty() && genericDirections >= 3) {
            putValidationIssue(
                    issues,
                    "CONFRONTACAO_POUCO_ESPECIFICA",
                    genericDirections + " direcao(oes) consolidada(s) apenas como divisa interna do loteamento ou nao identificada(s)"
            );
        }

        if (summary.streetFrontages().isEmpty()) {
            putValidationIssue(issues, "SEM_FRENTE_VIARIA", "nenhuma rua/via identificada em nenhum lado do lote");
        }

        List<Integer> selfReferencedSides = summary.sideSummaries().stream()
                .filter(Objects::nonNull)
                .filter(side -> Objects.equals(extractReferencedLotNumber(side.reference()), summary.lotNumber()))
                .map(TechnicalSideSummary::sideIndex)
                .distinct()
                .collect(Collectors.toList());
        if (!selfReferencedSides.isEmpty()) {
            String sideList = selfReferencedSides.stream()
                    .map(index -> String.format(Locale.US, "%02d", index))
                    .collect(Collectors.joining(", "));
            putValidationIssue(
                    issues,
                    "CONFRONTACAO_IMPOSSIVEL",
                    "aresta(s) " + sideList + " confrontam com o proprio lote " + summary.lotNumber()
                            + "; revise o texto/segmento selecionado"
            );
        }

        for (String direction : List.of("NORTE", "SUL", "LESTE", "OESTE")) {
            if (hasSelfReferencedDirection(summary, direction)) {
                putValidationIssue(
                        issues,
                        "CONFRONTACAO_SUSPEITA",
                        "AO " + direction + " houve referencia ao proprio lote " + summary.lotNumber()
                                + "; revise a confrontacao consolidada"
                );
            }
        }

        Double areaMedian = calculateMedian(summaryContext == null ? List.of() : summaryContext.stream()
                .map(LotTechnicalSummary::area)
                .filter(Objects::nonNull)
                .collect(Collectors.toList()));
        Double perimeterMedian = calculateMedian(summaryContext == null ? List.of() : summaryContext.stream()
                .map(LotTechnicalSummary::perimeter)
                .filter(Objects::nonNull)
                .collect(Collectors.toList()));
        if (summary.area() != null
                && summary.perimeter() != null
                && areaMedian != null
                && perimeterMedian != null
                && areaMedian > 0
                && perimeterMedian > 0) {
            double areaRatio = summary.area() / areaMedian;
            double perimeterRatio = summary.perimeter() / perimeterMedian;
            if (areaRatio >= 6.0 && perimeterRatio >= 1.8) {
                putValidationIssue(
                        issues,
                        "CONTORNO_FORA_DO_PADRAO",
                        "BLOQUEANTE",
                        String.format(
                                Locale.US,
                                "area/perimetro muito acima do padrao do conjunto (area %.2fx da mediana e perimetro %.2fx da mediana)",
                                areaRatio,
                                perimeterRatio
                        )
                );
            }
        }

        return new ArrayList<>(issues.values());
    }

    private Double calculateMedian(List<Double> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }

        List<Double> orderedValues = values.stream()
                .filter(Objects::nonNull)
                .filter(value -> Double.isFinite(value) && value > 0)
                .sorted()
                .collect(Collectors.toList());
        if (orderedValues.isEmpty()) {
            return null;
        }

        int middleIndex = orderedValues.size() / 2;
        if ((orderedValues.size() % 2) == 1) {
            return orderedValues.get(middleIndex);
        }
        return (orderedValues.get(middleIndex - 1) + orderedValues.get(middleIndex)) / 2.0;
    }

    private void putValidationIssue(Map<String, ValidationIssue> issues, String code, String message) {
        putValidationIssue(issues, code, resolveValidationSeverity(code), message);
    }

    private void putValidationIssue(Map<String, ValidationIssue> issues, String code, String severity, String message) {
        if (code == null || code.isBlank() || message == null || message.isBlank()) {
            return;
        }

        issues.putIfAbsent(
                code + "|" + message,
                new ValidationIssue(code, severity, code + ": " + message)
        );
    }

    private boolean hasManualReviewRequested(LotTechnicalSummary summary) {
        if (summary == null || summary.supplementalValidationIssues() == null || summary.supplementalValidationIssues().isEmpty()) {
            return false;
        }

        return summary.supplementalValidationIssues().stream()
                .filter(Objects::nonNull)
                .map(ValidationIssue::code)
                .filter(Objects::nonNull)
                .anyMatch(code -> "REVISAO_MANUAL_SOLICITADA".equalsIgnoreCase(code.trim()));
    }

    private String formatValidationStatusLabel(String status) {
        if (status == null || status.isBlank()) {
            return "Nao classificado";
        }

        return switch (status.trim().toUpperCase(Locale.ROOT)) {
            case "APROVADO" -> "Aprovado";
            case "APROVADO_COM_RESSALVAS" -> "Aprovado com ressalvas";
            case "PENDENTE" -> "Pendente";
            default -> status.replace('_', ' ');
        };
    }

    private String formatValidationStatusDescription(String status) {
        if (status == null || status.isBlank()) {
            return "Classificacao pendente";
        }

        return switch (status.trim().toUpperCase(Locale.ROOT)) {
            case "APROVADO" -> "Lote apto para seguir com a geracao do memorial";
            case "APROVADO_COM_RESSALVAS" -> "Lote utilizavel, mas com ressalvas que merecem conferencia";
            case "PENDENTE" -> "Lote com impedimentos tecnicos que exigem ajuste antes do memorial";
            default -> "Classificacao informada pelo sistema: " + status.replace('_', ' ');
        };
    }

    private String formatValidationMessageForText(String rawMessage) {
        if (rawMessage == null || rawMessage.isBlank()) {
            return "Pendencia nao detalhada";
        }

        int separatorIndex = rawMessage.indexOf(':');
        if (separatorIndex <= 0 || separatorIndex >= rawMessage.length() - 1) {
            return rawMessage.trim();
        }

        String code = rawMessage.substring(0, separatorIndex).trim().toUpperCase(Locale.ROOT);
        String detail = rawMessage.substring(separatorIndex + 1).trim();
        String label = switch (code) {
            case "VERTICE_DUPLICADO" -> "Vertice duplicado";
            case "ARESTA_DEGENERADA" -> "Aresta degenerada";
            case "CONTORNO_ABERTO" -> "Contorno aberto";
            case "CONTORNO_FORA_DO_PADRAO" -> "Contorno fora do padrao";
            case "CONFRONTACAO_NAO_IDENTIFICADA" -> "Confrontacao nao identificada";
            case "CONFRONTACAO_POUCO_ESPECIFICA" -> "Confrontacao pouco especifica";
            case "SEM_FRENTE_VIARIA" -> "Sem frente viaria";
            case "CONFRONTACAO_IMPOSSIVEL" -> "Confrontacao impossivel";
            case "CONFRONTACAO_SUSPEITA" -> "Confrontacao suspeita";
            case "REVISAO_MANUAL_SOLICITADA" -> "Revisao manual solicitada";
            default -> code.replace('_', ' ');
        };

        return label + ": " + detail;
    }

    private String buildLotPrimaryReason(
            String validationStatus,
            List<ValidationIssue> blockingIssues,
            List<ValidationIssue> warningIssues) {
        if ("APROVADO".equalsIgnoreCase(validationStatus)) {
            return "Nenhuma pendencia tecnica relevante foi identificada.";
        }

        ValidationIssue mainIssue = !blockingIssues.isEmpty()
                ? blockingIssues.get(0)
                : warningIssues.isEmpty() ? null : warningIssues.get(0);
        if (mainIssue == null) {
            return "Pendencias em analise.";
        }

        return switch (mainIssue.code()) {
            case "VERTICE_DUPLICADO" -> "Ha vertices coincidentes que comprometem a leitura correta do perimetro.";
            case "ARESTA_DEGENERADA" -> "Existe segmento com comprimento nulo ou praticamente nulo na geometria.";
            case "CONTORNO_ABERTO" -> "O lote foi identificado por ancora textual, mas ainda nao possui contorno fechado materializado.";
            case "CONTORNO_FORA_DO_PADRAO" -> "O contorno identificado para o lote ficou muito acima do padrao do conjunto e precisa de conferencia.";
            case "CONFRONTACAO_NAO_IDENTIFICADA" -> "Nem todos os lados possuem confrontante definido no DXF.";
            case "CONFRONTACAO_POUCO_ESPECIFICA" -> "As confrontacoes consolidadas ainda estao genericas demais para dar seguranca ao memorial.";
            case "SEM_FRENTE_VIARIA" -> "A frente viaria do lote nao foi identificada.";
            case "CONFRONTACAO_IMPOSSIVEL" -> "Foi encontrada confrontacao do lote com ele mesmo, o que invalida a descricao.";
            case "CONFRONTACAO_SUSPEITA" -> "A confrontacao consolidada apresenta referencia inconsistente para revisao.";
            case "REVISAO_MANUAL_SOLICITADA" -> "O lote foi marcado manualmente no editor e exige conferencia dedicada antes do memorial final.";
            default -> formatValidationMessageForText(mainIssue.message());
        };
    }

    private String buildLotRecommendedAction(String validationStatus, List<ValidationIssue> validationIssues) {
        if ("APROVADO".equalsIgnoreCase(validationStatus)) {
            return "Prosseguir com a geracao do memorial e manter a conferencia final dos dados.";
        }

        LinkedHashSet<String> actions = new LinkedHashSet<>();
        for (ValidationIssue issue : validationIssues) {
            switch (issue.code()) {
                case "VERTICE_DUPLICADO" ->
                        actions.add("Revisar vertices sobrepostos e corrigir a sequencia do perimetro.");
                case "ARESTA_DEGENERADA" ->
                        actions.add("Corrigir o segmento com comprimento nulo antes de gerar o memorial.");
                case "CONTORNO_ABERTO" ->
                        actions.add("Fechar o contorno do lote ou ajustar a camada interferente para materializar a poligonal.");
                case "CONTORNO_FORA_DO_PADRAO" ->
                        actions.add("Revisar a associacao entre texto e contorno do lote, pois a geometria ficou muito acima do padrao do conjunto.");
                case "CONFRONTACAO_NAO_IDENTIFICADA" ->
                        actions.add("Selecionar ou revisar o texto e o segmento do confrontante no DXF.");
                case "CONFRONTACAO_POUCO_ESPECIFICA" ->
                        actions.add("Reforcar a selecao dos textos de confrontacao e confirmar a frente viaria ou confrontantes nominais do lote.");
                case "SEM_FRENTE_VIARIA" ->
                        actions.add("Identificar a frente viaria principal do lote.");
                case "CONFRONTACAO_IMPOSSIVEL" ->
                        actions.add("Revisar a associacao entre texto e segmento, pois o lote nao pode confrontar consigo mesmo.");
                case "CONFRONTACAO_SUSPEITA" ->
                        actions.add("Conferir a confrontacao consolidada por direcao e ajustar a referencia.");
                case "REVISAO_MANUAL_SOLICITADA" ->
                        actions.add("Conferir manualmente a geometria e as confrontacoes deste lote antes de aproveitar o resumo final.");
                default ->
                        actions.add("Revisar as pendencias tecnicas indicadas para este lote.");
            }
        }

        if (actions.isEmpty()) {
            return "Revisar as pendencias tecnicas indicadas para este lote.";
        }

        return String.join(" ", actions);
    }

    private String resolveValidationSeverity(String code) {
        if (code == null || code.isBlank()) {
            return "AVISO";
        }

        return switch (code.trim().toUpperCase(Locale.ROOT)) {
            case "VERTICE_DUPLICADO", "ARESTA_DEGENERADA", "CONTORNO_ABERTO", "CONFRONTACAO_IMPOSSIVEL", "CONTORNO_FORA_DO_PADRAO" -> "BLOQUEANTE";
            case "CONFRONTACAO_NAO_IDENTIFICADA", "CONFRONTACAO_POUCO_ESPECIFICA", "SEM_FRENTE_VIARIA", "CONFRONTACAO_SUSPEITA", "REVISAO_MANUAL_SOLICITADA" -> "AVISO";
            default -> "AVISO";
        };
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private String buildDeterministicDirectionReference(LotTechnicalSummary summary, String direction) {
        List<String> references = summary.sideSummaries().stream()
                .filter(side -> direction.equalsIgnoreCase(side.direction()))
                .map(side -> normalizeReferenceForLotSummary(side.reference(), summary.lotNumber()))
                .filter(reference -> !reference.isBlank())
                .distinct()
                .collect(Collectors.toList());
        if (references.isEmpty()) {
            return "nao identificado no DXF.";
        }
        if (references.size() == 1) {
            return ensureTrailingPeriod(references.get(0));
        }
        return ensureTrailingPeriod(String.join("; ", references));
    }

    private String buildDeterministicDirectionReferenceDisplay(LotTechnicalSummary summary, String direction) {
        String reference = buildDeterministicDirectionReference(summary, direction);
        if (!hasSelfReferencedDirection(summary, direction) || isUnidentifiedReference(reference)) {
            return reference;
        }
        String normalized = reference != null ? reference.trim() : "";
        if (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1).trim();
        }
        return ensureTrailingPeriod(normalized + " [autorreferencia substituida]");
    }

    private boolean hasSelfReferencedDirection(LotTechnicalSummary summary, String direction) {
        return summary.sideSummaries().stream()
                .filter(Objects::nonNull)
                .anyMatch(side -> direction.equalsIgnoreCase(side.direction())
                        && isSelfReferencedLot(side.reference(), summary.lotNumber()));
    }

    private String ensureTrailingPeriod(String value) {
        if (value == null || value.isBlank()) {
            return "nao identificado no DXF.";
        }
        String trimmed = value.trim();
        return trimmed.endsWith(".") ? trimmed : trimmed + ".";
    }

    private String normalizeReferenceForFallback(String reference) {
        if (reference == null || reference.isBlank()) {
            return "divisa interna do loteamento";
        }
        String sanitized = sanitizeConfrontationReference(reference);
        if (sanitized == null || sanitized.isBlank()) {
            return "divisa interna do loteamento";
        }
        return sanitized;
    }

    private String normalizeReferenceForLotSummary(String reference, int lotNumber) {
        String normalized = normalizeReferenceForFallback(reference);
        return isSelfReferencedLot(normalized, lotNumber) ? "divisa interna do loteamento" : normalized;
    }

    private boolean isUnidentifiedReference(String reference) {
        if (reference == null || reference.isBlank()) {
            return true;
        }
        String normalized = reference.trim();
        if (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1).trim();
        }
        return normalized.equalsIgnoreCase("nao identificado no DXF")
                || normalized.equalsIgnoreCase("nao identificado");
    }

    private boolean isInternalSubdivisionReference(String reference) {
        if (reference == null || reference.isBlank()) {
            return false;
        }
        String normalized = reference.trim();
        if (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1).trim();
        }
        return normalized.equalsIgnoreCase("divisa interna do loteamento");
    }

    private boolean isSelfReferencedLot(String reference, int lotNumber) {
        return Objects.equals(extractReferencedLotNumber(reference), lotNumber);
    }

    private Integer extractReferencedLotNumber(String reference) {
        String sanitized = sanitizeConfrontationReference(reference);
        if (sanitized == null || sanitized.isBlank()) {
            return null;
        }
        Matcher matcher = Pattern.compile("(?i)\\b(?:LOTE|LT)\\s*0*(\\d+)\\b").matcher(sanitized);
        if (!matcher.find()) {
            return null;
        }
        try {
            return Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String sanitizeConfrontationReference(String reference) {
        if (reference == null) {
            return null;
        }
        String normalized = reference.trim();
        
        // Remove espaços extras (duplos, tabulações)
        normalized = normalized.replaceAll("\\s+", " ");
        
        // Remove pontuações repetidas no final, como ".." ou "..."
        normalized = normalized.replaceAll("\\.+$", "");
        
        // Remove ponto final solto
        if (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }

        // Padroniza a capitalização: tudo em maiúsculas (ou título) dependendo do padrão. O DXF normalmente vem em maiúsculo.
        normalized = normalized.toUpperCase(Locale.ROOT);
        
        if (normalized.isBlank()) {
            return null;
        }
        if (POINT_LIKE_REFERENCE_PATTERN.matcher(normalized).matches()) {
            return null;
        }
        return normalized.trim();
    }

    private MeasurementFormatting resolveMeasurementFormatting() {
        String measurementUnit = "cm";
        if (cadSystemSettingsService != null) {
            try {
                measurementUnit = cadSystemSettingsService.getEffectiveMeasurementUnit();
            } catch (Exception ignored) {
                measurementUnit = "cm";
            }
        }

        return switch (measurementUnit) {
            case "mm" -> new MeasurementFormatting("mm", "mm", "mm2");
            case "m" -> new MeasurementFormatting("m", "m", "m2");
            default -> new MeasurementFormatting("cm", "cm", "cm2");
        };
    }

    private String formatLength(Double value, MeasurementFormatting measurementFormatting) {
        return String.format(Locale.US, "%.2f %s", value, measurementFormatting.lengthUnit());
    }

    private String formatArea(Double value, MeasurementFormatting measurementFormatting) {
        return String.format(Locale.US, "%.2f %s", value, measurementFormatting.areaUnit());
    }

    private record MeasurementFormatting(
            String measurementUnit,
            String lengthUnit,
            String areaUnit
    ) {
    }
}
