package com.momorialPro.CadMemorial.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.momorialPro.CadMemorial.dto.PropertyDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.DoubleFunction;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class DeterministicMemorialService {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final DateTimeFormatter BR_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Pattern TEMPLATE_PLACEHOLDER_PATTERN = Pattern.compile("\\{\\{\\s*([A-Za-z0-9_]+)\\s*\\}\\}");
    private static final Pattern LOT_SECTION_HEADING_PATTERN = Pattern.compile(
            "(?im)^\\s*LOTE\\s+(?:\\{\\{\\s*(?:numero_lote|lote_numero)\\s*\\}\\}|0*\\d+)\\s*:?"
    );
    private static final Pattern DECLARED_LOT_TEMPLATE_PATTERN = Pattern.compile(
            "(?is)LOTE\\s+(?:\\{\\{\\s*(?:numero_lote|lote_numero)\\s*\\}\\}|0*\\d+)\\s*:.*"
    );
    private static final String REPEATED_LOTS_PLACEHOLDER = "lotes_resultantes";
    private static final String CARDINAL_DIRECTIONS_REGEX = buildCardinalDirectionsRegex();
    private static final Pattern POINT_LIKE_REFERENCE_PATTERN = Pattern.compile(
            "(?i)^\\s*(?:P|PT|PONTO|V|VERTICE|VERTEX|ESTACA|E|POINT|POINT:|ESTACA:)\\s*[-_:/# ]*\\s*0*(\\d{1,4})\\s*\\.?\\s*$"
    );
    private static final Pattern REFERENCED_LOT_PATTERN = Pattern.compile("(?i)\\b(?:LOTE|LT)\\s*0*(\\d+)\\b");
    private static final Pattern EXPLICIT_CONFRONTATION_SECTION_PATTERN = Pattern.compile(
            "(?is)\\n\\s*Confronta\\S*(?:\\s+espec\\S+)?\\s*:\\s*(?:\\n\\s*AO\\s+(?:" + CARDINAL_DIRECTIONS_REGEX + "):.*)+"
    );
    private static final Pattern DIRECTION_LINE_PATTERN = Pattern.compile("(?im)^\\s*AO\\s+(?:" + CARDINAL_DIRECTIONS_REGEX + "):");
    private static final Pattern DIRECTION_LINE_REMOVAL_PATTERN = Pattern.compile("(?im)^\\s*AO\\s+(?:" + CARDINAL_DIRECTIONS_REGEX + "):.*(?:\\n|$)");
    private static final String CONFRONTATION_SECTION_HEADER = "\nConfrontacoes:\n";
    private static final String UNIDENTIFIED_REFERENCE = "nao identificado no DXF";
    private static final String UNIDENTIFIED_REFERENCE_SHORT = "nao identificado";
    private static final String INTERNAL_SUBDIVISION_REFERENCE = "divisa interna do loteamento";
    private static final String UNIDENTIFIED_START_POINT = "ponto inicial nao identificado";
    private static final String UNKNOWN_CITY = "nao informada";
    private static final String UNKNOWN_STATE = "UF nao informada";
    private static final String DEFAULT_PROPERTY_TYPE = "Imovel urbano";
    private static final String LOT_PREFIX = "LOTE ";
    private static final String DIRECTION_PREFIX = "AO ";
    private static final String LOT_DESCRIPTION_INTRO = "Um imovel urbano integrante da area/loteamento em ";
    private static final String PERIMETER_SEQUENCE_PREFIX = ", seguindo a sequencia perimetral ";
    private static final String LOT_START_POINT_PREFIX = ", com inicio no ponto ";
    private static final String LOT_METRICS_PREFIX = ", possuindo formato poligonal conforme o levantamento tecnico validado, perfazendo assim, um perimetro de ";
    private static final String LOT_AREA_PREFIX = " e uma area territorial de ";
    private static final String LOT_DESCRIPTION_OUTRO = ", com a seguinte descricao perimetral e respectivas confrontacoes:\n";
    private static final String MULTI_SEGMENT_PREFIX = "por segmentos sucessivos, ";
    private static final String FIRST_SEGMENT_CONNECTOR = "iniciando-se";
    private static final String NEXT_SEGMENT_CONNECTOR = "seguindo";
    private static final String INTERMEDIATE_SEGMENT_PREFIX = "; deste segue, ";
    private static final String FINAL_SEGMENT_PREFIX = "; e por fim, ";
    private static final String DISTANCE_PREFIX = ", com distancia de ";
    private static final String SEGMENT_CONFRONTATION_PREFIX = ", confrontando neste segmento com ";
    private static final String DEFAULT_TECHNICAL_BOUNDARY = "conforme levantamento tecnico";
    private static final String DEFAULT_PURPOSE = "Levantamento topografico planimetrico para instrucao tecnica e registral";
    private static final String DEFAULT_TECHNICAL_RESPONSIBLE = "Responsavel tecnico a confirmar";
    private static final String SELF_REFERENCE_REPLACEMENT_MARKER = "[autorreferencia substituida]";
    private static final String DEFAULT_MEMORIAL_PURPOSE_LABEL = "Instrucao tecnica e registral";
    private static final String DEFAULT_NORM_REFERENCE = "NBR-17047:2024";
    private static final String DEFAULT_REFERENCE_SYSTEM = "SIRGAS 2000";
    private static final String DEFAULT_FINAL_TECHNICAL_NOTE = "Memorial sujeito a conferencia tecnica complementar.";
    private static final String DEFAULT_TERRAIN_ID = "1";
    private static final String DEFAULT_LEGAL_BASIS = "§ 14 do art. 213 da Lei nº 6.015/1973";
    private static final String DEFAULT_PROFESSIONAL_REGISTRY = "Registro profissional a confirmar";
    private static final CanonicalPlaceholderField[] TOKEN_MATCH_CANONICAL_FIELDS = {
            CanonicalPlaceholderField.OWNER_NAME,
            CanonicalPlaceholderField.OWNER_DOCUMENT,
            CanonicalPlaceholderField.REGISTRATION_NUMBER,
            CanonicalPlaceholderField.STREET,
            CanonicalPlaceholderField.NEIGHBORHOOD,
            CanonicalPlaceholderField.MUNICIPIO_UF,
            CanonicalPlaceholderField.PROPERTY_NAME,
            CanonicalPlaceholderField.PURPOSE,
            CanonicalPlaceholderField.RESPONSAVEL_TECNICO,
            CanonicalPlaceholderField.CREA_NUMBER,
            CanonicalPlaceholderField.CREA_UF,
            CanonicalPlaceholderField.RNP,
            CanonicalPlaceholderField.CURRENT_DATE,
            CanonicalPlaceholderField.VERTEX_LIST,
            CanonicalPlaceholderField.PERIMETER,
            CanonicalPlaceholderField.AREA
    };

    private enum CanonicalPlaceholderField {
        OWNER_NAME("owner_name", "propriet", "owner"),
        OWNER_DOCUMENT("owner_document", "cpf", "cnpj", "document"),
        REGISTRATION_NUMBER("registration_number", "matric", "registro"),
        STREET("street", "logradouro", "rua", "avenida", "via publica"),
        NEIGHBORHOOD("neighborhood", "bairro"),
        MUNICIPIO_UF("municipio_uf", "municipio/uf", "municipio uf"),
        CITY("city", "municip", "cidade"),
        SIGNATURE_CITY("signature_city"),
        STATE("state"),
        CREA_UF("crea_uf", "crea"),
        PROPERTY_TYPE("property_type"),
        PROPERTY_NAME("property_name", "imovel", "terreno"),
        PURPOSE("purpose", "objetivo", "finalidade"),
        RESPONSAVEL_TECNICO("responsavel_tecnico", "responsavel tecnico"),
        CREA_NUMBER("crea_number", "numero crea", "n crea", "crea numero"),
        RNP("rnp", "rnp"),
        LOCAL_DATA("local_data"),
        CURRENT_DATE("current_date", "data"),
        LOT_NUMBER("lot_number"),
        VERTEX_LIST("vertex_list", "vertices", "vertice", "pontos", "coordenadas"),
        PERIMETER("perimeter", "perimetro"),
        AREA("area", "area"),
        NORTE_DETAILS("norte_details"),
        SUL_DETAILS("sul_details"),
        LESTE_DETAILS("leste_details"),
        OESTE_DETAILS("oeste_details"),
        NORTE_BOUNDARY("norte_boundary"),
        SUL_BOUNDARY("sul_boundary"),
        LESTE_BOUNDARY("leste_boundary"),
        OESTE_BOUNDARY("oeste_boundary"),
        LOTS_RESULT("lots_result", "lots result", "lotes resultantes");

        private final String key;
        private final List<String> detectionTokens;

        CanonicalPlaceholderField(String key, String... detectionTokens) {
            this.key = key;
            this.detectionTokens = List.of(detectionTokens).stream()
                    .map(DeterministicMemorialService::normalizeForMatching)
                    .toList();
        }

        public String key() {
            return key;
        }

        public boolean matches(String source) {
            String normalizedSource = normalizeForMatching(source);
            return detectionTokens.stream().anyMatch(normalizedSource::contains);
        }
    }

    private enum MetricPlaceholderHint {
        PERIMETER("perimetro"),
        AREA("area");

        private final String token;

        MetricPlaceholderHint(String token) {
            this.token = token;
        }

        public String token() {
            return token;
        }
    }

    private enum SupplementaryPlaceholderField {
        TEMPLATE_ID("template_id"),
        PROPERTY_TYPE_LOWER("tipo_imovel_minusculo"),
        STREET_UPPER("logradouro_principal_maiusculo"),
        LOCATION("localizacao"),
        MEMORIAL_PURPOSE("finalidade_memorial"),
        TOTAL_LOTS("numero_lotes"),
        NORM_REFERENCE("norma_referencia"),
        REFERENCE_SYSTEM("sistema_referencia"),
        FINAL_TECHNICAL_NOTE("observacao_tecnica_final"),
        TERRAIN_ID("id_terreno");

        private final String key;

        SupplementaryPlaceholderField(String key) {
            this.key = key;
        }

        public String key() {
            return key;
        }
    }

    private enum CardinalDirection {
        NORTE("NORTE", CanonicalPlaceholderField.NORTE_DETAILS, CanonicalPlaceholderField.NORTE_BOUNDARY),
        SUL("SUL", CanonicalPlaceholderField.SUL_DETAILS, CanonicalPlaceholderField.SUL_BOUNDARY),
        LESTE("LESTE", CanonicalPlaceholderField.LESTE_DETAILS, CanonicalPlaceholderField.LESTE_BOUNDARY),
        OESTE("OESTE", CanonicalPlaceholderField.OESTE_DETAILS, CanonicalPlaceholderField.OESTE_BOUNDARY);

        private final String label;
        private final String normalizedLabel;
        private final CanonicalPlaceholderField detailsField;
        private final CanonicalPlaceholderField boundaryField;

        CardinalDirection(
                String label,
                CanonicalPlaceholderField detailsField,
                CanonicalPlaceholderField boundaryField) {
            this.label = label;
            this.normalizedLabel = normalizeForMatching(label);
            this.detailsField = detailsField;
            this.boundaryField = boundaryField;
        }

        public String label() {
            return label;
        }

        public CanonicalPlaceholderField detailsField() {
            return detailsField;
        }

        public CanonicalPlaceholderField boundaryField() {
            return boundaryField;
        }

        public boolean matchesCombined(String combined) {
            return combined != null && combined.contains(normalizedLabel);
        }

        public CanonicalPlaceholderField resolveMatchedField(String combined) {
            if (!matchesCombined(combined)) {
                return null;
            }
            if (containsAny(combined, "detalh")) {
                return detailsField;
            }
            if (containsAny(combined, "confront")) {
                return boundaryField;
            }
            return null;
        }

        public boolean matchesSideDirection(String direction) {
            return label.equalsIgnoreCase(direction);
        }

        public String resolveLotDetails(LotPlaceholderContext context) {
            return switch (this) {
                case NORTE -> context.northDetails();
                case SUL -> context.southDetails();
                case LESTE -> context.eastDetails();
                case OESTE -> context.westDetails();
            };
        }

        public String resolveLotBoundary(LotPlaceholderContext context) {
            return switch (this) {
                case NORTE -> context.northBoundary();
                case SUL -> context.southBoundary();
                case LESTE -> context.eastBoundary();
                case OESTE -> context.westBoundary();
            };
        }

        public String resolveGlobalBoundary(GlobalPlaceholderContext context) {
            return context.resolveDirectionalBoundary(this);
        }

        public static CardinalDirection fromLabel(String direction) {
            for (CardinalDirection candidate : values()) {
                if (candidate.matchesSideDirection(direction)) {
                    return candidate;
                }
            }
            return null;
        }
    }

    private record GlobalPlaceholderContext(
            String templateName,
            String propertyType,
            String ownerName,
            String ownerDocument,
            String street,
            String neighborhood,
            String city,
            String state,
            String registrationNumber,
            String propertyName,
            String municipioUf,
            String location,
            String purpose,
            String responsavelTecnico,
            String currentDate,
            String localData,
            int totalLots,
            String areaNumericValue,
            String perimeterNumericValue,
            String areaExtensoValue,
            String perimeterExtensoValue,
            String areaValue,
            String perimeterValue,
            String originalVertexSequence,
            String originalVertexCoordinateSequence,
            String baseAreaVertexSequence,
            String baseAreaCoordinateSequence,
            int baseAreaPointCount,
            String northOriginalBoundary,
            String southOriginalBoundary,
            String eastOriginalBoundary,
            String westOriginalBoundary,
            MemorialProcessingContext processingContext) {
        public String resolveValue(CanonicalPlaceholderField canonicalField) {
            return switch (canonicalField) {
                case OWNER_NAME -> ownerName;
                case OWNER_DOCUMENT -> ownerDocument;
                case REGISTRATION_NUMBER -> registrationNumber;
                case STREET -> street;
                case NEIGHBORHOOD -> neighborhood;
                case MUNICIPIO_UF -> municipioUf;
                case CITY, SIGNATURE_CITY -> city;
                case STATE, CREA_UF -> state;
                case PROPERTY_TYPE -> propertyType;
                case PROPERTY_NAME -> propertyName;
                case PURPOSE -> purpose;
                case RESPONSAVEL_TECNICO -> responsavelTecnico;
                case CURRENT_DATE -> currentDate;
                case LOCAL_DATA -> localData;
                case VERTEX_LIST -> originalVertexSequence;
                case PERIMETER -> perimeterValue;
                case AREA -> areaValue;
                default -> "";
            };
        }

        public String resolveDirectionalBoundary(CardinalDirection direction) {
            return switch (direction) {
                case NORTE -> northOriginalBoundary;
                case SUL -> southOriginalBoundary;
                case LESTE -> eastOriginalBoundary;
                case OESTE -> westOriginalBoundary;
            };
        }
    }

    private record LotPlaceholderContext(
            String lotNumber,
            String vertexList,
            String perimeterNumericValue,
            String areaNumericValue,
            String perimeterExtensoValue,
            String areaExtensoValue,
            String perimeter,
            String area,
            String northDetails,
            String southDetails,
            String eastDetails,
            String westDetails,
            String northBoundary,
            String southBoundary,
            String eastBoundary,
            String westBoundary) {
        public String resolveValue(CanonicalPlaceholderField canonicalField) {
            return switch (canonicalField) {
                case LOT_NUMBER -> lotNumber;
                case VERTEX_LIST -> vertexList;
                case PERIMETER -> perimeter;
                case AREA -> area;
                default -> "";
            };
        }
    }

    private record PropertyPlaceholderFallbackContext(
            String ownerName,
            String ownerDocument,
            String registrationNumber,
            String street,
            String neighborhood,
            String city,
            String state,
            String propertyType,
            String propertyName,
            String municipioUf,
            String location,
            String currentDate,
            String localData,
            String northBoundary,
            String southBoundary,
            String eastBoundary,
            String westBoundary) {
        public String resolveValue(CanonicalPlaceholderField canonicalField) {
            return switch (canonicalField) {
                case OWNER_NAME -> ownerName;
                case OWNER_DOCUMENT -> ownerDocument;
                case REGISTRATION_NUMBER -> registrationNumber;
                case STREET -> street;
                case NEIGHBORHOOD -> neighborhood;
                case MUNICIPIO_UF -> municipioUf;
                case CITY, SIGNATURE_CITY -> city;
                case STATE, CREA_UF -> state;
                case PROPERTY_TYPE -> propertyType;
                case PROPERTY_NAME -> propertyName;
                case PURPOSE -> DEFAULT_PURPOSE;
                case RESPONSAVEL_TECNICO -> DEFAULT_TECHNICAL_RESPONSIBLE;
                case CURRENT_DATE -> currentDate;
                case LOCAL_DATA -> localData;
                default -> "";
            };
        }

        public String resolveDirectionalBoundary(CardinalDirection direction) {
            return switch (direction) {
                case NORTE -> northBoundary;
                case SUL -> southBoundary;
                case LESTE -> eastBoundary;
                case OESTE -> westBoundary;
            };
        }
    }

    private record TemplatePlaceholderResolutionContext(
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            GlobalPlaceholderContext globalContext,
            LotPlaceholderContext lotContext) {
    }

    private static String buildCardinalDirectionsRegex() {
        return java.util.Arrays.stream(CardinalDirection.values())
                .map(CardinalDirection::label)
                .collect(Collectors.joining("|"));
    }

    public String buildDeterministicChunkFallback(
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

    public String buildDeterministicFullMemorial(
            String scope,
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            String documentSummaryJson,
            String preamble,
            String conclusion,
            Function<String, String> metadataAppender,
            String templateName,
            String templateJson,
            Exception cause) {
        return buildStructuredMemorial(
                scope,
                property,
                expectedSummaries,
                documentSummaryJson,
                preamble,
                conclusion,
                metadataAppender,
                templateName,
                templateJson,
                cause,
                true
        );
    }

    public String buildSovereignMemorialFromTechnicalSummary(
            String scope,
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            String documentSummaryJson,
            String preamble,
            String conclusion,
            Function<String, String> metadataAppender,
            String templateName,
            String templateJson) {
        return buildStructuredMemorial(
                scope,
                property,
                expectedSummaries,
                documentSummaryJson,
                preamble,
                conclusion,
                metadataAppender,
                templateName,
                templateJson,
                null,
                false
        );
    }

    private String buildStructuredMemorial(
            String scope,
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            String documentSummaryJson,
            String preamble,
            String conclusion,
            Function<String, String> metadataAppender,
            String templateName,
            String templateJson,
            Exception cause,
            boolean logAsFallback) {
        if (expectedSummaries == null || expectedSummaries.isEmpty()) {
            throw new RuntimeException(
                    "Erro no memorial completo sem dados tecnicos suficientes para fallback deterministico",
                    cause
            );
        }

        if (logAsFallback) {
            log.warn(
                    "Usando fallback deterministico no memorial completo {} apos falha da IA: {}",
                    scope,
                    cause != null ? cause.getMessage() : "motivo nao informado"
            );
        } else {
            log.info(
                    "Gerando memorial soberano diretamente do resumo tecnico validado no escopo {}",
                    scope
            );
        }

        String templateBasedContent = tryBuildTemplateBasedMemorial(
                property,
                expectedSummaries,
                documentSummaryJson,
                templateName,
                templateJson
        );
        boolean hasAppliedTemplate = templateJson != null && !templateJson.isBlank();
        if (templateBasedContent != null && !templateBasedContent.isBlank()) {
            if (containsAllExpectedLotHeaders(templateBasedContent, expectedSummaries)) {
                log.info(
                        "Montagem soberana do memorial [{}]: usando ramo TEMPLATE com lotes={}, templateName='{}', templateChars={}",
                        scope,
                        expectedSummaries.size(),
                        templateName != null ? templateName : "",
                        templateJson != null ? templateJson.length() : 0
                );
                return metadataAppender != null ? metadataAppender.apply(templateBasedContent) : templateBasedContent;
            }

            log.warn(
                    "Montagem soberana do memorial [{}]: ramo TEMPLATE ignorado por nao cobrir todos os lotes esperados ({})",
                    scope,
                    expectedSummaries.size()
            );

            if (hasAppliedTemplate) {
                throw new IllegalStateException(
                        "Template aplicado nao cobriu todos os lotes esperados; montagem simplificada foi bloqueada."
                );
            }
        } else if (hasAppliedTemplate) {
            throw new IllegalStateException(
                    "Template aplicado nao pode ser renderizado; montagem simplificada foi bloqueada."
            );
        }

        String linearDocumentContent = tryBuildDocumentSummaryBasedMemorial(documentSummaryJson, expectedSummaries);
        if (linearDocumentContent != null && !linearDocumentContent.isBlank()) {
            log.info(
                    "Montagem soberana do memorial [{}]: usando ramo DOCUMENT_SUMMARY com lotes={}, documentSummaryChars={}",
                    scope,
                    expectedSummaries.size(),
                    documentSummaryJson != null ? documentSummaryJson.length() : 0
            );
            String content = assembleStructuredContent(preamble, linearDocumentContent, conclusion);
            return metadataAppender != null ? metadataAppender.apply(content) : content;
        }

        log.info(
                "Montagem soberana do memorial [{}]: usando ramo FALLBACK com lotes={}",
                scope,
                expectedSummaries.size()
        );
        String fallbackContent = expectedSummaries.stream()
                .map(summary -> buildDeterministicLotDescription(summary, property))
                .collect(Collectors.joining("\n\n"));
        String content = assembleStructuredContent(preamble, fallbackContent, conclusion);
        return metadataAppender != null ? metadataAppender.apply(content) : content;
    }

    private boolean containsAllExpectedLotHeaders(String content, List<LotTechnicalSummary> expectedSummaries) {
        if (content == null || content.isBlank() || expectedSummaries == null || expectedSummaries.isEmpty()) {
            return false;
        }

        String normalizedContent = content
                .replaceAll("(?im)^\\s*" + Pattern.quote(LOT_PREFIX) + "0*(\\d+)\\s*:?", LOT_PREFIX + "$1:")
                .toUpperCase(Locale.ROOT);

        List<Integer> missingLotNumbers = expectedSummaries.stream()
                .map(LotTechnicalSummary::lotNumber)
                .filter(Objects::nonNull)
                .filter(lotNumber -> !containsLotHeading(normalizedContent, lotNumber))
                .toList();

        if (!missingLotNumbers.isEmpty()) {
            log.warn(
                    "Validacao de cobertura do template falhou; lotes ausentes detectados: {} | trecho inicial renderizado: {}",
                    missingLotNumbers,
                    abbreviateForLog(normalizedContent, 600)
            );
            return false;
        }

        return true;
    }

    private boolean containsLotHeading(String normalizedContent, Integer lotNumber) {
        if (normalizedContent == null || normalizedContent.isBlank() || lotNumber == null) {
            return false;
        }

        Pattern headerPattern = Pattern.compile(
                "(?i)\\b" + Pattern.quote(LOT_PREFIX.trim()) + "\\s*0*" + lotNumber + "\\s*:?"
        );
        return headerPattern.matcher(normalizedContent).find();
    }

    private String abbreviateForLog(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String compact = value.replaceAll("\\s+", " ").trim();
        if (compact.length() <= maxLength) {
            return compact;
        }
        return compact.substring(0, maxLength) + "...";
    }

    private String assembleStructuredContent(String preamble, String coreContent, String conclusion) {
        StringBuilder builder = new StringBuilder();
        if (preamble != null && !preamble.isBlank()) {
            builder.append(preamble.trim()).append("\n\n");
        }
        if (coreContent != null && !coreContent.isBlank()) {
            builder.append(coreContent.trim());
        }
        if (conclusion != null && !conclusion.isBlank()) {
            if (builder.length() > 0) {
                builder.append("\n\n");
            }
            builder.append(conclusion.trim());
        }
        return builder.toString();
    }

    private String tryBuildDocumentSummaryBasedMemorial(
            String documentSummaryJson,
            List<LotTechnicalSummary> expectedSummaries) {
        if (documentSummaryJson == null || documentSummaryJson.isBlank()) {
            return null;
        }

        try {
            JsonNode rootNode = OBJECT_MAPPER.readTree(documentSummaryJson);
            JsonNode lotsNode = rootNode.path("lots");
            if (!lotsNode.isArray() || lotsNode.isEmpty()) {
                return null;
            }

            Map<Integer, String> renderedLots = new LinkedHashMap<>();
            for (JsonNode lotNode : lotsNode) {
                int lotNumber = lotNode.path("lotNumber").asInt(-1);
                String rendered = renderLinearLotFromDocumentSummary(lotNode);
                if (lotNumber > 0 && rendered != null && !rendered.isBlank()) {
                    renderedLots.put(lotNumber, rendered);
                }
            }

            if (renderedLots.isEmpty()) {
                return null;
            }

            List<String> orderedLots = expectedSummaries.stream()
                    .map(summary -> renderedLots.get(summary.lotNumber()))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            if (orderedLots.size() != expectedSummaries.size()) {
                log.warn(
                        "documentSummaryJson linear ignorado por conter {} lotes renderizados para {} lotes esperados",
                        orderedLots.size(),
                        expectedSummaries.size()
                );
                return null;
            }
            return String.join("\n\n", orderedLots);
        } catch (Exception e) {
            log.warn("Nao foi possivel usar o documentSummaryJson linear na montagem do memorial: {}", e.getMessage());
            return null;
        }
    }

    private String renderLinearLotFromDocumentSummary(JsonNode lotNode) {
        JsonNode reportBlocks = lotNode.path("reportBlocks");
        if (!reportBlocks.isObject() || reportBlocks.isEmpty()) {
            return null;
        }

        List<String> lines = new java.util.ArrayList<>();
        appendNonBlankLine(lines, reportBlocks.path("heading").asText(""));
        appendNonBlankLine(lines, reportBlocks.path("situationLine").asText(""));
        appendNonBlankLine(lines, reportBlocks.path("primaryReasonLine").asText(""));
        appendNonBlankLine(lines, reportBlocks.path("recommendedActionLine").asText(""));
        appendNonBlankLine(lines, reportBlocks.path("areaLine").asText(""));
        appendNonBlankLine(lines, reportBlocks.path("perimeterLine").asText(""));
        appendNonBlankLine(lines, reportBlocks.path("pointSequenceLine").asText(""));
        appendNonBlankLine(lines, reportBlocks.path("frontagesLine").asText(""));
        appendSectionWithLines(lines, "Vertices:", reportBlocks.path("vertexLines"));
        appendSectionWithLines(lines, "Descricao perimetral:", reportBlocks.path("sideLines"));
        appendSectionWithLines(lines, "Confrontacoes consolidadas:", reportBlocks.path("directionLines"));

        String rendered = String.join("\n", lines).trim();
        return rendered.isBlank() ? null : rendered;
    }

    private void appendSectionWithLines(List<String> target, String heading, JsonNode linesNode) {
        if (!linesNode.isArray() || linesNode.isEmpty()) {
            return;
        }
        List<String> sectionLines = new java.util.ArrayList<>();
        for (JsonNode lineNode : linesNode) {
            String value = lineNode.asText("");
            if (value != null && !value.isBlank()) {
                sectionLines.add("- " + value.trim());
            }
        }
        if (sectionLines.isEmpty()) {
            return;
        }
        target.add(heading);
        target.addAll(sectionLines);
    }

    private void appendNonBlankLine(List<String> target, String value) {
        if (value != null && !value.isBlank()) {
            target.add(value.trim());
        }
    }

    private String tryBuildTemplateBasedMemorial(
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            String documentSummaryJson,
            String templateName,
            String templateJson) {
        if (templateJson == null || templateJson.isBlank()) {
            return null;
        }

        try {
            JsonNode rootNode = OBJECT_MAPPER.readTree(templateJson);
            JsonNode estruturaNode = rootNode.path("estrutura");
            if (!estruturaNode.isObject() || estruturaNode.isEmpty()) {
                return null;
            }

            Map<String, String> declaredPlaceholders = collectDeclaredPlaceholders(rootNode, estruturaNode);
            MemorialProcessingContext processingContext = extractProcessingContextFromDocumentSummary(documentSummaryJson);
            GlobalPlaceholderContext globalContext = buildGlobalPlaceholderContext(
                    property,
                    expectedSummaries,
                    templateName,
                    processingContext
            );
            Map<String, String> globalPlaceholderValues = buildGlobalTemplatePlaceholderValues(
                    property,
                    expectedSummaries,
                    declaredPlaceholders,
                    globalContext
            );
            String joinedLotDescriptions = buildRenderedLotSections(
                    textValue(estruturaNode, "situacao_depois"),
                    property,
                    expectedSummaries,
                    globalPlaceholderValues,
                    declaredPlaceholders,
                    globalContext
            );

            String cabecalho = renderTemplateSection(textValue(estruturaNode, "cabecalho"), globalPlaceholderValues, joinedLotDescriptions);
            String situacaoAntes = renderTemplateSection(textValue(estruturaNode, "situacao_antes"), globalPlaceholderValues, joinedLotDescriptions);
            String situacaoDepoisTemplate = textValue(estruturaNode, "situacao_depois");
            String situacaoDepois = renderSituationAfterSection(
                    situacaoDepoisTemplate,
                    property,
                    expectedSummaries,
                    globalContext,
                    globalPlaceholderValues,
                    declaredPlaceholders,
                    joinedLotDescriptions
            );
            String declaracaoFinal = renderTemplateSection(textValue(estruturaNode, "declaracao_final"), globalPlaceholderValues, joinedLotDescriptions);

            StringBuilder builder = new StringBuilder();
            appendSection(builder, cabecalho);
            appendSection(builder, situacaoAntes);
            appendSection(builder, !situacaoDepois.isBlank() ? situacaoDepois : joinedLotDescriptions);
            appendSection(builder, declaracaoFinal);
            String content = builder.toString().trim();
            return content.isBlank() ? null : content;
        } catch (Exception e) {
            throw new IllegalStateException("Nao foi possivel aplicar o template no fallback deterministico", e);
        }
    }

    private Map<String, String> buildGlobalTemplatePlaceholderValues(
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            Map<String, String> declaredPlaceholders,
            GlobalPlaceholderContext globalContext) {
        Map<String, String> values = new LinkedHashMap<>();
        populateGlobalIdentificationPlaceholders(
                values,
                globalContext
        );
        populateGlobalTechnicalContextPlaceholders(
                values,
                globalContext
        );
        populateGlobalGeometryPlaceholders(
                values,
                globalContext
        );
        populateTemplateSpecificGlobalPlaceholders(
                values,
                property,
                expectedSummaries,
                globalContext
        );
        enrichDeclaredPlaceholders(
                values,
                declaredPlaceholders,
                new TemplatePlaceholderResolutionContext(property, expectedSummaries, globalContext, null)
        );
        return values;
    }

    private Map<String, String> buildLotTemplatePlaceholderValues(
            PropertyDTO property,
            LotTechnicalSummary summary,
            Map<String, String> globalPlaceholderValues,
            Map<String, String> declaredPlaceholders,
            GlobalPlaceholderContext globalContext,
            List<LotTechnicalSummary> expectedSummaries) {
        Map<String, String> values = new LinkedHashMap<>(globalPlaceholderValues);
        LotPlaceholderContext context = buildLotPlaceholderContext(summary);

        populateLotIdentificationPlaceholders(values, context);
        populateLotGeometryPlaceholders(
                values,
                context
        );
        populateTemplateSpecificLotPlaceholders(
                values,
                property,
                summary,
                globalContext,
                context
        );
        enrichDeclaredPlaceholders(
                values,
                declaredPlaceholders,
                new TemplatePlaceholderResolutionContext(property, expectedSummaries, globalContext, context)
        );
        return values;
    }

    private GlobalPlaceholderContext buildGlobalPlaceholderContext(
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            String templateName,
            MemorialProcessingContext processingContext) {
        int totalLots = expectedSummaries != null ? expectedSummaries.size() : 0;
        double totalArea = expectedSummaries != null
                ? expectedSummaries.stream().map(LotTechnicalSummary::area).filter(Objects::nonNull).mapToDouble(Double::doubleValue).sum()
                : 0d;
        double totalPerimeter = expectedSummaries != null
                ? expectedSummaries.stream().map(LotTechnicalSummary::perimeter).filter(Objects::nonNull).mapToDouble(Double::doubleValue).sum()
                : 0d;
        String currentDate = LocalDate.now().format(BR_DATE_FORMATTER);
        PropertyPlaceholderFallbackContext propertyFallbackContext =
                buildPropertyPlaceholderFallbackContext(property, currentDate);
        return new GlobalPlaceholderContext(
                safeString(templateName),
                propertyFallbackContext.resolveValue(CanonicalPlaceholderField.PROPERTY_TYPE),
                propertyFallbackContext.resolveValue(CanonicalPlaceholderField.OWNER_NAME),
                propertyFallbackContext.resolveValue(CanonicalPlaceholderField.OWNER_DOCUMENT),
                propertyFallbackContext.resolveValue(CanonicalPlaceholderField.STREET),
                propertyFallbackContext.resolveValue(CanonicalPlaceholderField.NEIGHBORHOOD),
                propertyFallbackContext.resolveValue(CanonicalPlaceholderField.CITY),
                propertyFallbackContext.resolveValue(CanonicalPlaceholderField.STATE),
                propertyFallbackContext.resolveValue(CanonicalPlaceholderField.REGISTRATION_NUMBER),
                propertyFallbackContext.resolveValue(CanonicalPlaceholderField.PROPERTY_NAME),
                propertyFallbackContext.resolveValue(CanonicalPlaceholderField.MUNICIPIO_UF),
                propertyFallbackContext.location(),
                DEFAULT_PURPOSE,
                DEFAULT_TECHNICAL_RESPONSIBLE,
                currentDate,
                propertyFallbackContext.resolveValue(CanonicalPlaceholderField.LOCAL_DATA),
                totalLots,
                resolveAreaNumericValue(property, totalArea),
                resolvePerimeterNumericValue(property, totalPerimeter),
                resolveAreaExtensoValue(property, totalArea),
                resolvePerimeterExtensoValue(property, totalPerimeter),
                resolveAreaValue(property, totalArea),
                resolvePerimeterValue(property, totalPerimeter),
                resolveOriginalVertexSequence(expectedSummaries, processingContext),
                resolveOriginalVertexCoordinateSequence(expectedSummaries, processingContext),
                buildBaseAreaVertexSequence(processingContext),
                buildBaseAreaCoordinateSequence(processingContext),
                resolveBaseAreaPointCount(processingContext),
                resolveOriginalBoundary(property, expectedSummaries, CardinalDirection.NORTE),
                resolveOriginalBoundary(property, expectedSummaries, CardinalDirection.SUL),
                resolveOriginalBoundary(property, expectedSummaries, CardinalDirection.LESTE),
                resolveOriginalBoundary(property, expectedSummaries, CardinalDirection.OESTE),
                processingContext
        );
    }

    private LotPlaceholderContext buildLotPlaceholderContext(LotTechnicalSummary summary) {
        return new LotPlaceholderContext(
                Integer.toString(summary.lotNumber()),
                buildOrderedPointSequence(summary),
                formatNumericMetric(summary.perimeter()),
                formatNumericMetric(summary.area()),
                formatPerimeterExtenso(summary.perimeter()),
                formatAreaExtenso(summary.area()),
                formatMetric(summary.perimeter(), "m"),
                formatMetric(summary.area(), "m2"),
                buildDeterministicDirectionDescription(summary, CardinalDirection.NORTE),
                buildDeterministicDirectionDescription(summary, CardinalDirection.SUL),
                buildDeterministicDirectionDescription(summary, CardinalDirection.LESTE),
                buildDeterministicDirectionDescription(summary, CardinalDirection.OESTE),
                buildDeterministicDirectionReferenceDisplay(summary, CardinalDirection.NORTE),
                buildDeterministicDirectionReferenceDisplay(summary, CardinalDirection.SUL),
                buildDeterministicDirectionReferenceDisplay(summary, CardinalDirection.LESTE),
                buildDeterministicDirectionReferenceDisplay(summary, CardinalDirection.OESTE)
        );
    }

    private void populateGlobalIdentificationPlaceholders(
            Map<String, String> values,
            GlobalPlaceholderContext context) {
        putSupplementaryValue(values, context.templateName(), SupplementaryPlaceholderField.TEMPLATE_ID);
        putCanonicalValue(values, CanonicalPlaceholderField.PROPERTY_TYPE, context.propertyType(), "tipo_terreno", "tipo_imovel");
        putSupplementaryValue(values, context.propertyType().toLowerCase(Locale.ROOT), SupplementaryPlaceholderField.PROPERTY_TYPE_LOWER);
        putCanonicalValue(values, CanonicalPlaceholderField.OWNER_NAME, context.ownerName(), "proprietario");
        putCanonicalValue(values, CanonicalPlaceholderField.OWNER_DOCUMENT, context.ownerDocument(), "cpf_cnpj");
        putCanonicalValue(values, CanonicalPlaceholderField.STREET, context.street(), "logradouro", "logradouro_principal");
        putSupplementaryValue(values, context.street().toUpperCase(Locale.ROOT), SupplementaryPlaceholderField.STREET_UPPER);
        putCanonicalValue(values, CanonicalPlaceholderField.NEIGHBORHOOD, context.neighborhood(), "bairro");
        putCanonicalValue(values, CanonicalPlaceholderField.CITY, context.city(), "municipio", "cidade");
        putCanonicalValue(values, CanonicalPlaceholderField.SIGNATURE_CITY, context.city(), "cidade_assinatura");
        putCanonicalValue(values, CanonicalPlaceholderField.STATE, context.state(), "uf", "estado");
        putCanonicalValue(values, CanonicalPlaceholderField.CREA_UF, context.state(), "uf_crea");
        putCanonicalValue(values, CanonicalPlaceholderField.MUNICIPIO_UF, context.municipioUf());
        putCanonicalValue(values, CanonicalPlaceholderField.REGISTRATION_NUMBER, context.registrationNumber(), "matricula", "registro");
        putCanonicalValue(values, CanonicalPlaceholderField.PROPERTY_NAME, context.propertyName(), "imovel", "identificacao_imovel", "nome_imovel");
        putSupplementaryValue(values, context.location(), SupplementaryPlaceholderField.LOCATION);
    }

    private void populateGlobalTechnicalContextPlaceholders(
            Map<String, String> values,
            GlobalPlaceholderContext context) {
        putCanonicalValue(values, CanonicalPlaceholderField.PURPOSE, context.purpose(), "objetivo", "objetivo_tecnico");
        putSupplementaryValue(values, DEFAULT_MEMORIAL_PURPOSE_LABEL, SupplementaryPlaceholderField.MEMORIAL_PURPOSE);
        putSupplementaryValue(values, context.totalLots() > 0 ? Integer.toString(context.totalLots()) : "", SupplementaryPlaceholderField.TOTAL_LOTS);
        putCanonicalValue(values, CanonicalPlaceholderField.CURRENT_DATE, context.currentDate(), "data", "data_atual", "data_assinatura");
        putCanonicalValue(values, CanonicalPlaceholderField.LOCAL_DATA, context.localData());
        putCanonicalValue(values, CanonicalPlaceholderField.RESPONSAVEL_TECNICO, context.responsavelTecnico());
        putCanonicalValue(values, CanonicalPlaceholderField.CREA_NUMBER, "", "numero_crea");
        putCanonicalValue(values, CanonicalPlaceholderField.RNP, "", "numero_rnp");
        putSupplementaryValue(values, DEFAULT_NORM_REFERENCE, SupplementaryPlaceholderField.NORM_REFERENCE);
        putSupplementaryValue(values, DEFAULT_REFERENCE_SYSTEM, SupplementaryPlaceholderField.REFERENCE_SYSTEM);
        putSupplementaryValue(values, DEFAULT_FINAL_TECHNICAL_NOTE, SupplementaryPlaceholderField.FINAL_TECHNICAL_NOTE);
    }

    private void populateGlobalGeometryPlaceholders(
            Map<String, String> values,
            GlobalPlaceholderContext context) {
        putCanonicalValue(values, CanonicalPlaceholderField.AREA, context.areaValue());
        putValue(values, context.areaNumericValue(), "area_total", "area_original");
        putValue(values, context.areaExtensoValue(), "area_total_extenso");
        putCanonicalValue(values, CanonicalPlaceholderField.PERIMETER, context.perimeterValue());
        putValue(values, context.perimeterNumericValue(), "perimetro_total", "perimetro_original");
        putValue(values, context.perimeterExtensoValue(), "perimetro_total_extenso");
        putCanonicalValue(values, CanonicalPlaceholderField.VERTEX_LIST, context.originalVertexSequence(), "vertices_terreno_original", "pontos_antes", "vertices_lista");
        putValue(values, context.originalVertexCoordinateSequence(), "pontos_terreno_original");
        putValue(values, context.baseAreaVertexSequence(), "vertices_area_total", "vertices_contorno_area_total");
        putValue(values, context.baseAreaCoordinateSequence(), "pontos_area_total", "coordenadas_area_total");
        putValue(values, context.baseAreaPointCount() > 0 ? Integer.toString(context.baseAreaPointCount()) : "", "quantidade_pontos_area_total");
        putValue(values, buildRemainingAreaVertexSequence(context.processingContext()), "vertices_area_remanescente", "vertices_contorno_remanescente");
        putValue(values, buildRemainingAreaCoordinateSequence(context.processingContext()), "pontos_area_remanescente", "coordenadas_area_remanescente");
        putValue(values, resolveRemainingAreaPointCount(context.processingContext()), "quantidade_pontos_area_remanescente");
        putCanonicalValue(values, CanonicalPlaceholderField.NORTE_DETAILS, context.northOriginalBoundary());
        putCanonicalValue(values, CanonicalPlaceholderField.SUL_DETAILS, context.southOriginalBoundary());
        putCanonicalValue(values, CanonicalPlaceholderField.LESTE_DETAILS, context.eastOriginalBoundary());
        putCanonicalValue(values, CanonicalPlaceholderField.OESTE_DETAILS, context.westOriginalBoundary());
        putCanonicalValue(values, CanonicalPlaceholderField.NORTE_BOUNDARY, context.northOriginalBoundary(), "confrontacao_norte_terreno_original", "confrontacao_norte_antes");
        putCanonicalValue(values, CanonicalPlaceholderField.SUL_BOUNDARY, context.southOriginalBoundary(), "confrontacao_sul_terreno_original", "confrontacao_sul_antes");
        putCanonicalValue(values, CanonicalPlaceholderField.LESTE_BOUNDARY, context.eastOriginalBoundary(), "confrontacao_leste_terreno_original", "confrontacao_leste_antes");
        putCanonicalValue(values, CanonicalPlaceholderField.OESTE_BOUNDARY, context.westOriginalBoundary(), "confrontacao_oeste_terreno_original", "confrontacao_oeste_antes");
    }

    private void populateTemplateSpecificGlobalPlaceholders(
            Map<String, String> values,
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            GlobalPlaceholderContext context) {
        putValue(values, DEFAULT_PURPOSE, "objetivo_levantamento");
        putValue(values, buildOriginalTerrainIdentification(property, context), "identificacao_terreno_original", "terreno_original_identificacao");
        putValue(values, normalizeNarrativePropertyType(context.propertyType()), "natureza_imovel");
        putValue(values, normalizeNarrativePropertyType(context.propertyType()), "natureza_imovel_original");
        putValue(values, resolveReferenceSystem(property), "datum_referencia");
        putValue(values, DEFAULT_MEMORIAL_PURPOSE_LABEL, "finalidade_memorial");
        putValue(values, resolveOriginalTerrainLabel(context), "rotulo_terreno_original");
        putValue(values, resolveOriginalTerrainSource(context), "fonte_contexto_terreno_original");
        putValue(values, resolveOriginalTerrainNarrativeRole(context), "papel_contexto_terreno_original");
        putValue(
                values,
                context.processingContext() != null && context.processingContext().hasOriginalProperty()
                        ? Integer.toString(context.processingContext().effectiveOriginalProperty().pointCount())
                        : "",
                "quantidade_pontos_terreno_original"
        );
        putValue(values, buildOriginalTerrainNarrative(context), "narrativa_terreno_original", "contexto_terreno_original");
        putValue(values, resolveRemainingAreaLabel(context), "rotulo_area_remanescente");
        putValue(values, resolveRemainingAreaSource(context), "fonte_contexto_area_remanescente");
        putValue(values, resolveRemainingAreaNarrativeRole(context), "papel_contexto_area_remanescente");
        putValue(values, buildRemainingAreaNarrative(context), "narrativa_area_remanescente", "contexto_area_remanescente");
        putValue(values, context.street(), "logradouro_original");
        putValue(values, buildOriginalTerrainShapeDescription(context, expectedSummaries), "formato_terreno_original");
        putValue(values, context.originalVertexCoordinateSequence(), "pontos_terreno_original", "pontos_coordenadas_terreno_original");
        putValue(values, context.perimeterValue(), "perimetro_terreno_original");
        putValue(values, context.perimeterExtensoValue(), "perimetro_terreno_original_extenso");
        putValue(values, context.areaValue(), "area_terreno_original");
        putValue(values, context.areaExtensoValue(), "area_terreno_original_extenso");
        putValue(
                values,
                buildOriginalConfrontationSection(context),
                "confrontacoes_terreno_original",
                "confrontacoes_terreno_original_formatadas"
        );
        putValue(values, DEFAULT_LEGAL_BASIS, "fundamento_legal");
        putValue(values, context.municipioUf(), "local_assinatura", "local_declaracao");
        putValue(values, context.currentDate(), "data_assinatura", "data_declaracao");
        putValue(values, DEFAULT_PROFESSIONAL_REGISTRY, "registro_profissional", "responsavel_tecnico_registro");
        putValue(values, DEFAULT_TECHNICAL_RESPONSIBLE, "responsavel_tecnico_nome");
        putValue(values, DEFAULT_PROFESSIONAL_COUNCIL, "responsavel_tecnico_conselho");
        putValue(values, DEFAULT_PROFESSIONAL_RNP, "responsavel_tecnico_rnp");
    }

    private void populateLotIdentificationPlaceholders(
            Map<String, String> values,
            LotPlaceholderContext context) {
        putCanonicalValue(values, CanonicalPlaceholderField.LOT_NUMBER, context.lotNumber(), "numero_lote", "lote_numero");
        putSupplementaryValue(values, DEFAULT_TERRAIN_ID, SupplementaryPlaceholderField.TERRAIN_ID);
    }

    private void populateLotGeometryPlaceholders(
            Map<String, String> values,
            LotPlaceholderContext context) {
        putCanonicalValue(values, CanonicalPlaceholderField.VERTEX_LIST, context.vertexList(), "vertices_lista", "vertices_lote");
        putCanonicalValue(values, CanonicalPlaceholderField.PERIMETER, context.perimeter());
        putValue(
                values,
                context.perimeterNumericValue(),
                "perimetro_lote",
                "perimetro_total"
        );
        putValue(values, context.perimeterExtensoValue(), "perimetro_lote_extenso", "perimetro_total_extenso");
        putCanonicalValue(values, CanonicalPlaceholderField.AREA, context.area());
        putValue(
                values,
                context.areaNumericValue(),
                "area_lote",
                "area_total"
        );
        putValue(values, context.areaExtensoValue(), "area_lote_extenso", "area_total_extenso");
        putCanonicalValue(values, CanonicalPlaceholderField.NORTE_DETAILS, context.northDetails());
        putCanonicalValue(values, CanonicalPlaceholderField.SUL_DETAILS, context.southDetails());
        putCanonicalValue(values, CanonicalPlaceholderField.LESTE_DETAILS, context.eastDetails());
        putCanonicalValue(values, CanonicalPlaceholderField.OESTE_DETAILS, context.westDetails());
        putCanonicalValue(values, CanonicalPlaceholderField.NORTE_BOUNDARY, context.northBoundary(), "confrontacao_norte_lote");
        putCanonicalValue(values, CanonicalPlaceholderField.SUL_BOUNDARY, context.southBoundary(), "confrontacao_sul_lote");
        putCanonicalValue(values, CanonicalPlaceholderField.LESTE_BOUNDARY, context.eastBoundary(), "confrontacao_leste_lote");
        putCanonicalValue(values, CanonicalPlaceholderField.OESTE_BOUNDARY, context.westBoundary(), "confrontacao_oeste_lote");
    }

    private void populateTemplateSpecificLotPlaceholders(
            Map<String, String> values,
            PropertyDTO property,
            LotTechnicalSummary summary,
            GlobalPlaceholderContext globalContext,
            LotPlaceholderContext lotContext) {
        putValue(values, normalizeNarrativePropertyType(globalContext.propertyType()), "natureza_imovel");
        putValue(values, lotContext.lotNumber(), "lote_identificacao");
        putValue(values, normalizeNarrativePropertyType(globalContext.propertyType()), "lote_natureza_imovel");
        putValue(values, globalContext.street(), "logradouro_lote");
        putValue(values, globalContext.street(), "lote_logradouro");
        putValue(values, globalContext.neighborhood(), "bairro_lote");
        putValue(values, globalContext.neighborhood(), "lote_bairro");
        putValue(values, globalContext.city(), "lote_municipio");
        putValue(values, globalContext.state(), "lote_uf");
        putValue(values, globalContext.municipioUf(), "municipio_uf_lote");
        putValue(values, buildPolygonShapeDescription(List.of(summary)), "formato_lote");
        putValue(values, buildPolygonShapeDescription(List.of(summary)), "lote_formato");
        putValue(values, buildVertexCoordinateSequence(summary), "pontos_lote");
        putValue(values, buildVertexCoordinateSequence(summary), "lote_pontos_coordenadas");
        putValue(values, lotContext.perimeter(), "perimetro_lote");
        putValue(values, lotContext.perimeter(), "lote_perimetro");
        putValue(values, lotContext.perimeterExtensoValue(), "perimetro_lote_extenso");
        putValue(values, lotContext.perimeterExtensoValue(), "lote_perimetro_extenso");
        putValue(values, lotContext.area(), "area_lote");
        putValue(values, lotContext.area(), "lote_area");
        putValue(values, lotContext.areaExtensoValue(), "area_lote_extenso");
        putValue(values, lotContext.areaExtensoValue(), "lote_area_extenso");
        putValue(values, buildDeterministicConfrontationSection(summary), "confrontacoes_lote");
        putValue(values, buildDeterministicConfrontationSection(summary), "confrontacoesFormatadas");
        putValue(values, resolveReferenceSystem(property), "datum_referencia");
    }

    private void putCanonicalValue(
            Map<String, String> values,
            CanonicalPlaceholderField canonicalField,
            String value,
            String... aliases) {
        putValue(values, value, aliases);
        values.put(canonicalField.key(), value);
    }

    private void putSupplementaryValue(
            Map<String, String> values,
            String value,
            SupplementaryPlaceholderField... fields) {
        for (SupplementaryPlaceholderField field : fields) {
            values.put(field.key(), value);
        }
    }

    private void putValue(Map<String, String> values, String value, String... keys) {
        for (String key : keys) {
            values.put(key, value);
        }
    }

    private Map<String, String> collectDeclaredPlaceholders(JsonNode rootNode, JsonNode estruturaNode) {
        Map<String, String> declared = new LinkedHashMap<>();
        JsonNode placeholdersNode = rootNode.path("placeholders");
        if (placeholdersNode.isObject()) {
            placeholdersNode.fields().forEachRemaining(entry ->
                    declared.put(entry.getKey(), entry.getValue().asText("")));
        }

        Set<String> placeholdersFoundInStructure = new LinkedHashSet<>();
        extractPlaceholdersFromText(placeholdersFoundInStructure, textValue(estruturaNode, "cabecalho"));
        extractPlaceholdersFromText(placeholdersFoundInStructure, textValue(estruturaNode, "situacao_antes"));
        extractPlaceholdersFromText(placeholdersFoundInStructure, textValue(estruturaNode, "situacao_depois"));
        extractPlaceholdersFromText(placeholdersFoundInStructure, textValue(estruturaNode, "declaracao_final"));
        for (String placeholder : placeholdersFoundInStructure) {
            declared.putIfAbsent(placeholder, "");
        }

        return declared;
    }

    private void extractPlaceholdersFromText(Set<String> target, String content) {
        if (content == null || content.isBlank()) {
            return;
        }

        Matcher matcher = TEMPLATE_PLACEHOLDER_PATTERN.matcher(content);
        while (matcher.find()) {
            String placeholder = matcher.group(1);
            if (placeholder != null && !placeholder.isBlank()) {
                target.add(placeholder.trim());
            }
        }
    }

    private void enrichDeclaredPlaceholders(
            Map<String, String> targetValues,
            Map<String, String> declaredPlaceholders,
            TemplatePlaceholderResolutionContext resolutionContext) {
        if (declaredPlaceholders == null || declaredPlaceholders.isEmpty()) {
            return;
        }

        for (Map.Entry<String, String> entry : declaredPlaceholders.entrySet()) {
            String placeholder = entry.getKey();
            if (placeholder == null || placeholder.isBlank()) {
                continue;
            }
            if (targetValues.containsKey(placeholder) && !targetValues.get(placeholder).isBlank()) {
                continue;
            }

            String resolvedValue = resolveDeclaredPlaceholderValue(
                    placeholder,
                    entry.getValue(),
                    resolutionContext
            );
            if (resolvedValue != null) {
                targetValues.put(placeholder, resolvedValue);
            }
        }
    }

    private String resolveDeclaredPlaceholderValue(
            String placeholder,
            String description,
            TemplatePlaceholderResolutionContext resolutionContext) {
        String normalizedKey = normalizeForMatching(placeholder);
        String normalizedDescription = normalizeForMatching(description);
        String combined = normalizedKey + " " + normalizedDescription;

        CanonicalPlaceholderField canonicalField = resolveCanonicalPlaceholderField(combined, normalizedKey);
        if (canonicalField == null) {
            return "";
        }

        return resolveCanonicalPlaceholderFieldValue(canonicalField, resolutionContext);
    }

    private CanonicalPlaceholderField resolveCanonicalPlaceholderField(String combined, String normalizedKey) {
        CanonicalPlaceholderField specialField = resolveSpecialCanonicalPlaceholderField(combined, normalizedKey);
        if (specialField != null) {
            return specialField;
        }

        CanonicalPlaceholderField directionalField = resolveDirectionalCanonicalPlaceholderField(combined);
        if (directionalField != null) {
            return directionalField;
        }

        return matchCanonicalFieldByTokens(combined, TOKEN_MATCH_CANONICAL_FIELDS);
    }

    private CanonicalPlaceholderField resolveSpecialCanonicalPlaceholderField(String combined, String normalizedKey) {
        CanonicalPlaceholderField metricField = resolveMetricCanonicalPlaceholderField(combined);
        if (metricField != null) {
            return metricField;
        }

        CanonicalPlaceholderField cityField = resolveCityCanonicalPlaceholderField(combined);
        if (cityField != null) {
            return cityField;
        }

        CanonicalPlaceholderField stateField = resolveStateCanonicalPlaceholderField(combined);
        if (stateField != null) {
            return stateField;
        }

        if (isPropertyTypePlaceholder(combined)) {
            return CanonicalPlaceholderField.PROPERTY_TYPE;
        }
        if (containsAll(combined, "data", "local")) {
            return CanonicalPlaceholderField.LOCAL_DATA;
        }
        if (containsAll(combined, "lote", "numero")) {
            return CanonicalPlaceholderField.LOT_NUMBER;
        }
        if (CanonicalPlaceholderField.LOTS_RESULT.matches(normalizedKey)) {
            return CanonicalPlaceholderField.LOTS_RESULT;
        }
        return null;
    }

    private CanonicalPlaceholderField resolveMetricCanonicalPlaceholderField(String combined) {
        if (containsStandaloneToken(combined, MetricPlaceholderHint.PERIMETER.token())) {
            return CanonicalPlaceholderField.PERIMETER;
        }
        if (containsStandaloneToken(combined, MetricPlaceholderHint.AREA.token())) {
            return CanonicalPlaceholderField.AREA;
        }
        return null;
    }

    private CanonicalPlaceholderField resolveCityCanonicalPlaceholderField(String combined) {
        if (!CanonicalPlaceholderField.CITY.matches(combined)) {
            return null;
        }
        return containsAny(combined, "assinatura")
                ? CanonicalPlaceholderField.SIGNATURE_CITY
                : CanonicalPlaceholderField.CITY;
    }

    private CanonicalPlaceholderField resolveStateCanonicalPlaceholderField(String combined) {
        if (!containsAny(combined, "estado") && !containsStandaloneToken(combined, "uf")) {
            return null;
        }
        return containsAny(combined, "crea")
                ? CanonicalPlaceholderField.CREA_UF
                : CanonicalPlaceholderField.STATE;
    }

    private boolean isPropertyTypePlaceholder(String combined) {
        return containsAny(combined, "tipo") && CanonicalPlaceholderField.PROPERTY_NAME.matches(combined);
    }

    private CanonicalPlaceholderField resolveDirectionalCanonicalPlaceholderField(String combined) {
        for (CardinalDirection direction : CardinalDirection.values()) {
            CanonicalPlaceholderField matchedField = direction.resolveMatchedField(combined);
            if (matchedField != null) {
                return matchedField;
            }
        }
        return null;
    }

    private CanonicalPlaceholderField matchCanonicalFieldByTokens(
            String combined,
            CanonicalPlaceholderField... candidates) {
        for (CanonicalPlaceholderField candidate : candidates) {
            if (candidate.matches(combined)) {
                return candidate;
            }
        }
        return null;
    }

    private String resolveCanonicalPlaceholderFieldValue(
            CanonicalPlaceholderField canonicalField,
            TemplatePlaceholderResolutionContext resolutionContext) {
        PropertyDTO property = resolutionContext.property();
        GlobalPlaceholderContext globalContext = resolutionContext.globalContext();
        LotPlaceholderContext lotContext = resolutionContext.lotContext();

        return switch (canonicalField) {
            case OWNER_NAME,
                    OWNER_DOCUMENT,
                    REGISTRATION_NUMBER,
                    STREET,
                    NEIGHBORHOOD,
                    MUNICIPIO_UF,
                    CITY,
                    SIGNATURE_CITY,
                    STATE,
                    CREA_UF,
                    PROPERTY_TYPE,
                    PROPERTY_NAME,
                    PURPOSE,
                    RESPONSAVEL_TECNICO -> resolveGlobalCanonicalPlaceholderValue(canonicalField, globalContext, property);
            case CREA_NUMBER, RNP, LOTS_RESULT -> "";
            case LOCAL_DATA, CURRENT_DATE -> resolveDateCanonicalPlaceholderValue(canonicalField, globalContext, property);
            case LOT_NUMBER, VERTEX_LIST -> resolveLotCanonicalPlaceholderValue(canonicalField, resolutionContext, globalContext, lotContext);
            case PERIMETER, AREA -> resolveMetricCanonicalPlaceholderValue(canonicalField, resolutionContext, globalContext, lotContext, property);
            case NORTE_DETAILS,
                    SUL_DETAILS,
                    LESTE_DETAILS,
                    OESTE_DETAILS,
                    NORTE_BOUNDARY,
                    SUL_BOUNDARY,
                    LESTE_BOUNDARY,
                    OESTE_BOUNDARY -> resolveDirectionalCanonicalPlaceholderValue(canonicalField, resolutionContext);
            default -> "";
        };
    }

    private String resolveGlobalCanonicalPlaceholderValue(
            CanonicalPlaceholderField canonicalField,
            GlobalPlaceholderContext globalContext,
            PropertyDTO property) {
        if (globalContext != null) {
            return globalContext.resolveValue(canonicalField);
        }
        return buildPropertyPlaceholderFallbackContext(property).resolveValue(canonicalField);
    }

    private String resolveDateCanonicalPlaceholderValue(
            CanonicalPlaceholderField canonicalField,
            GlobalPlaceholderContext globalContext,
            PropertyDTO property) {
        if (globalContext != null) {
            return globalContext.resolveValue(canonicalField);
        }
        return buildPropertyPlaceholderFallbackContext(property).resolveValue(canonicalField);
    }

    private String resolveLotCanonicalPlaceholderValue(
            CanonicalPlaceholderField canonicalField,
            TemplatePlaceholderResolutionContext resolutionContext,
            GlobalPlaceholderContext globalContext,
            LotPlaceholderContext lotContext) {
        if (lotContext != null) {
            return lotContext.resolveValue(canonicalField);
        }
        return switch (canonicalField) {
            case LOT_NUMBER -> "";
            case VERTEX_LIST -> globalContext != null
                    ? globalContext.resolveValue(canonicalField)
                    : buildOriginalVertexSequence(resolutionContext.expectedSummaries());
            default -> "";
        };
    }

    private String resolveMetricCanonicalPlaceholderValue(
            CanonicalPlaceholderField canonicalField,
            TemplatePlaceholderResolutionContext resolutionContext,
            GlobalPlaceholderContext globalContext,
            LotPlaceholderContext lotContext,
            PropertyDTO property) {
        return switch (canonicalField) {
            case PERIMETER -> resolveMetricPlaceholderValue(
                    lotContext != null ? lotContext.resolveValue(canonicalField) : null,
                    globalContext != null ? globalContext.resolveValue(canonicalField) : null,
                    property,
                    resolutionContext.expectedSummaries(),
                    LotTechnicalSummary::perimeter,
                    total -> resolvePerimeterValue(property, total)
            );
            case AREA -> resolveMetricPlaceholderValue(
                    lotContext != null ? lotContext.resolveValue(canonicalField) : null,
                    globalContext != null ? globalContext.resolveValue(canonicalField) : null,
                    property,
                    resolutionContext.expectedSummaries(),
                    LotTechnicalSummary::area,
                    total -> resolveAreaValue(property, total)
            );
            default -> "";
        };
    }

    private String resolveMetricPlaceholderValue(
            String lotValue,
            String globalValue,
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            Function<LotTechnicalSummary, Double> summaryExtractor,
            DoubleFunction<String> propertyResolver) {
        if (lotValue != null) {
            return lotValue;
        }
        if (globalValue != null) {
            return globalValue;
        }
        return propertyResolver.apply(sumSummaryMetric(expectedSummaries, summaryExtractor));
    }

    private String resolveDirectionalCanonicalPlaceholderValue(
            CanonicalPlaceholderField canonicalField,
            TemplatePlaceholderResolutionContext resolutionContext) {
        return switch (canonicalField) {
            case NORTE_DETAILS -> resolveDirectionalPlaceholderValue(resolutionContext, CardinalDirection.NORTE, true);
            case SUL_DETAILS -> resolveDirectionalPlaceholderValue(resolutionContext, CardinalDirection.SUL, true);
            case LESTE_DETAILS -> resolveDirectionalPlaceholderValue(resolutionContext, CardinalDirection.LESTE, true);
            case OESTE_DETAILS -> resolveDirectionalPlaceholderValue(resolutionContext, CardinalDirection.OESTE, true);
            case NORTE_BOUNDARY -> resolveDirectionalPlaceholderValue(resolutionContext, CardinalDirection.NORTE, false);
            case SUL_BOUNDARY -> resolveDirectionalPlaceholderValue(resolutionContext, CardinalDirection.SUL, false);
            case LESTE_BOUNDARY -> resolveDirectionalPlaceholderValue(resolutionContext, CardinalDirection.LESTE, false);
            case OESTE_BOUNDARY -> resolveDirectionalPlaceholderValue(resolutionContext, CardinalDirection.OESTE, false);
            default -> "";
        };
    }

    private String resolveDirectionalPlaceholderValue(
            TemplatePlaceholderResolutionContext resolutionContext,
            CardinalDirection direction,
            boolean detailed) {
        LotPlaceholderContext lotContext = resolutionContext.lotContext();
        if (lotContext != null) {
            return detailed
                    ? direction.resolveLotDetails(lotContext)
                    : direction.resolveLotBoundary(lotContext);
        }
        GlobalPlaceholderContext globalContext = resolutionContext.globalContext();
        if (globalContext != null) {
            return direction.resolveGlobalBoundary(globalContext);
        }
        return resolveOriginalBoundary(resolutionContext.property(), resolutionContext.expectedSummaries(), direction);
    }

    private PropertyPlaceholderFallbackContext buildPropertyPlaceholderFallbackContext(PropertyDTO property) {
        return buildPropertyPlaceholderFallbackContext(property, currentDateValue());
    }

    private PropertyPlaceholderFallbackContext buildPropertyPlaceholderFallbackContext(
            PropertyDTO property,
            String currentDate) {
        return new PropertyPlaceholderFallbackContext(
                property != null ? safeString(property.getOwnerName()) : "",
                property != null ? safeString(property.getOwnerDocument()) : "",
                property != null ? safeString(property.getRegistrationNumber()) : "",
                property != null ? safeString(property.getStreet()) : "",
                property != null ? safeString(property.getNeighborhood()) : "",
                property != null ? safeString(property.getCity()) : "",
                property != null ? safeString(property.getState()) : "",
                resolvePropertyType(property),
                property != null ? safeString(property.getName()) : "",
                buildMunicipioUf(property),
                buildLocationValue(property),
                currentDate,
                buildLocalData(property, currentDate),
                property != null ? safeString(property.getNorthBoundary()) : "",
                property != null ? safeString(property.getSouthBoundary()) : "",
                property != null ? safeString(property.getEastBoundary()) : "",
                property != null ? safeString(property.getWestBoundary()) : ""
        );
    }

    private static double sumSummaryMetric(
            List<LotTechnicalSummary> expectedSummaries,
            Function<LotTechnicalSummary, Double> summaryExtractor) {
        return expectedSummaries != null
                ? expectedSummaries.stream()
                .map(summaryExtractor)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum()
                : 0d;
    }

    private String currentDateValue() {
        return LocalDate.now().format(BR_DATE_FORMATTER);
    }

    private static boolean containsAny(String source, String... tokens) {
        String normalizedSource = normalizeForMatching(source);
        for (String token : tokens) {
            if (normalizedSource.contains(normalizeForMatching(token))) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsAll(String source, String... tokens) {
        String normalizedSource = normalizeForMatching(source);
        for (String token : tokens) {
            if (!normalizedSource.contains(normalizeForMatching(token))) {
                return false;
            }
        }
        return true;
    }

    private static boolean containsStandaloneToken(String source, String token) {
        String normalizedSource = normalizeForMatching(source);
        String normalizedToken = normalizeForMatching(token);
        if (normalizedSource.isBlank() || normalizedToken.isBlank()) {
            return false;
        }
        return (" " + normalizedSource + " ").contains(" " + normalizedToken + " ");
    }

    private static String normalizeForMatching(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
        return normalized.replaceAll("\\s+", " ");
    }

    private record LotSectionScaffold(String sectionHeading, String lotTemplate) {
    }

    private String renderSituationAfterSection(
            String sectionTemplate,
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            GlobalPlaceholderContext globalContext,
            Map<String, String> globalPlaceholderValues,
            Map<String, String> declaredPlaceholders,
            String joinedLotDescriptions) {
        if (sectionTemplate == null || sectionTemplate.isBlank()) {
            return joinedLotDescriptions;
        }

        if (sectionTemplate.contains("{{lotes_resultantes}}")) {
            String repeatedLotTemplate = resolveRepeatedLotTemplate(sectionTemplate, declaredPlaceholders);
            String renderedLots = repeatedLotTemplate.isBlank()
                    ? joinedLotDescriptions
                    : buildRenderedLotSections(
                    repeatedLotTemplate,
                    property,
                    expectedSummaries,
                    globalPlaceholderValues,
                    declaredPlaceholders,
                    globalContext
            );
            return renderTemplateSection(sectionTemplate, globalPlaceholderValues, renderedLots);
        }

        LotSectionScaffold scaffold = splitLotSectionTemplate(sectionTemplate);
        String renderedLots = buildRenderedLotSections(
                scaffold.lotTemplate(),
                property,
                expectedSummaries,
                globalPlaceholderValues,
                declaredPlaceholders,
                globalContext
        );
        if (renderedLots.isBlank()) {
            return scaffold.sectionHeading();
        }
        if (scaffold.sectionHeading().isBlank()) {
            return renderedLots;
        }
        return scaffold.sectionHeading() + "\n\n" + renderedLots;
    }

    private String buildRenderedLotSections(
            String lotSectionTemplate,
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            Map<String, String> globalPlaceholderValues,
            Map<String, String> declaredPlaceholders,
            GlobalPlaceholderContext globalContext) {
        if (expectedSummaries == null || expectedSummaries.isEmpty()) {
            return "";
        }

        if (lotSectionTemplate == null || lotSectionTemplate.isBlank()) {
            return expectedSummaries.stream()
                    .map(summary -> buildDeterministicLotDescription(summary, property))
                    .collect(Collectors.joining("\n\n"));
        }

        return expectedSummaries.stream()
                .map(summary -> normalizeRenderedLotSection(
                        renderTemplateSection(
                                normalizeLotSectionTemplate(lotSectionTemplate),
                                buildLotTemplatePlaceholderValues(
                                        property,
                                        summary,
                                        globalPlaceholderValues,
                                        declaredPlaceholders,
                                        globalContext,
                                        expectedSummaries
                                ),
                                buildDeterministicLotDescription(summary, property)
                        ),
                        summary.lotNumber()
                ))
                .collect(Collectors.joining("\n\n"));
    }

    private LotSectionScaffold splitLotSectionTemplate(String sectionTemplate) {
        if (sectionTemplate == null || sectionTemplate.isBlank()) {
            return new LotSectionScaffold("", "");
        }

        Matcher matcher = LOT_SECTION_HEADING_PATTERN.matcher(sectionTemplate);
        if (!matcher.find()) {
            return new LotSectionScaffold("", sectionTemplate.trim());
        }

        String sectionHeading = sectionTemplate.substring(0, matcher.start()).trim();
        String lotTemplate = sectionTemplate.substring(matcher.start()).trim();
        return new LotSectionScaffold(sectionHeading, normalizeLotSectionTemplate(lotTemplate));
    }

    private String normalizeLotSectionTemplate(String lotSectionTemplate) {
        if (lotSectionTemplate == null || lotSectionTemplate.isBlank()) {
            return "";
        }

        Matcher matcher = LOT_SECTION_HEADING_PATTERN.matcher(lotSectionTemplate.trim());
        if (!matcher.find()) {
            return lotSectionTemplate.trim();
        }

        return matcher.replaceFirst("LOTE {{numero_lote}}:");
    }

    private String resolveRepeatedLotTemplate(String sectionTemplate, Map<String, String> declaredPlaceholders) {
        String declaredTemplate = extractDeclaredLotTemplate(
                declaredPlaceholders != null ? declaredPlaceholders.get("lotes_resultantes") : null
        );
        if (!declaredTemplate.isBlank()) {
            return normalizeLotSectionTemplate(declaredTemplate);
        }

        LotSectionScaffold scaffold = splitLotSectionTemplate(sectionTemplate);
        return normalizeLotSectionTemplate(scaffold.lotTemplate());
    }

    private String extractDeclaredLotTemplate(String declaredPlaceholderDescription) {
        if (declaredPlaceholderDescription == null || declaredPlaceholderDescription.isBlank()) {
            return "";
        }

        Matcher matcher = DECLARED_LOT_TEMPLATE_PATTERN.matcher(declaredPlaceholderDescription);
        if (!matcher.find()) {
            return "";
        }

        return matcher.group().trim();
    }

    private String normalizeRenderedLotSection(String renderedSection, int lotNumber) {
        if (renderedSection == null || renderedSection.isBlank()) {
            return "";
        }

        String normalizedHeading = "LOTE " + lotNumber + ":";
        Matcher matcher = LOT_SECTION_HEADING_PATTERN.matcher(renderedSection.trim());
        if (!matcher.find()) {
            return normalizedHeading + "\n" + renderedSection.trim();
        }

        return matcher.replaceFirst(normalizedHeading);
    }

    private String renderTemplateSection(
            String templateSection,
            Map<String, String> placeholderValues,
            String joinedLotDescriptions) {
        if (templateSection == null || templateSection.isBlank()) {
            return "";
        }

        String rendered = templateSection;
        for (Map.Entry<String, String> entry : placeholderValues.entrySet()) {
            if (REPEATED_LOTS_PLACEHOLDER.equals(entry.getKey())) {
                continue;
            }
            rendered = rendered.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }

        rendered = rendered.replace("{{" + REPEATED_LOTS_PLACEHOLDER + "}}", joinedLotDescriptions);
        Matcher unresolvedMatcher = TEMPLATE_PLACEHOLDER_PATTERN.matcher(rendered);
        if (unresolvedMatcher.find()) {
            Set<String> unresolvedPlaceholders = new LinkedHashSet<>();
            do {
                unresolvedPlaceholders.add(unresolvedMatcher.group(1));
            } while (unresolvedMatcher.find());

            throw new IllegalStateException(
                    "Template contem placeholders sem valor resolvido: " + String.join(", ", unresolvedPlaceholders)
            );
        }

        return rendered
                .replaceAll("[ \\t]{2,}", " ")
                .replaceAll("\\n{3,}", "\n\n")
                .replaceAll("(?m)^[ \\t]+", "")
                .trim();
    }

    private void appendSection(StringBuilder builder, String sectionContent) {
        if (sectionContent == null || sectionContent.isBlank()) {
            return;
        }
        if (!builder.isEmpty()) {
            builder.append("\n\n");
        }
        builder.append(sectionContent.trim());
    }

    private String textValue(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        JsonNode fieldNode = node.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull()) {
            return null;
        }
        String value = fieldNode.asText("").trim();
        return value.isEmpty() ? null : value;
    }

    private String defaultText(String value, String fallbackValue) {
        return value == null || value.isBlank() ? fallbackValue : value.trim();
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

    private String resolveAreaValue(PropertyDTO property, double fallbackArea) {
        if (property != null && property.getTotalArea() != null) {
            return formatMetric(property.getTotalArea().doubleValue(), "m2");
        }
        return fallbackArea > 0d ? formatMetric(fallbackArea, "m2") : "";
    }

    private String resolvePerimeterValue(PropertyDTO property, double fallbackPerimeter) {
        if (property != null && property.getTotalPerimeter() != null) {
            return formatMetric(property.getTotalPerimeter().doubleValue(), "m");
        }
        return fallbackPerimeter > 0d ? formatMetric(fallbackPerimeter, "m") : "";
    }

    private String resolveAreaNumericValue(PropertyDTO property, double fallbackArea) {
        if (property != null && property.getTotalArea() != null) {
            return formatNumericMetric(property.getTotalArea().doubleValue());
        }
        return fallbackArea > 0d ? formatNumericMetric(fallbackArea) : "";
    }

    private String resolvePerimeterNumericValue(PropertyDTO property, double fallbackPerimeter) {
        if (property != null && property.getTotalPerimeter() != null) {
            return formatNumericMetric(property.getTotalPerimeter().doubleValue());
        }
        return fallbackPerimeter > 0d ? formatNumericMetric(fallbackPerimeter) : "";
    }

    private String resolveAreaExtensoValue(PropertyDTO property, double fallbackArea) {
        if (property != null && property.getTotalArea() != null) {
            return formatAreaExtenso(property.getTotalArea().doubleValue());
        }
        return fallbackArea > 0d ? formatAreaExtenso(fallbackArea) : "";
    }

    private String resolvePerimeterExtensoValue(PropertyDTO property, double fallbackPerimeter) {
        if (property != null && property.getTotalPerimeter() != null) {
            return formatPerimeterExtenso(property.getTotalPerimeter().doubleValue());
        }
        return fallbackPerimeter > 0d ? formatPerimeterExtenso(fallbackPerimeter) : "";
    }

    private String buildLocationValue(PropertyDTO property) {
        if (property == null) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        if (property.getStreet() != null && !property.getStreet().isBlank()) {
            builder.append(property.getStreet().trim());
        }
        if (property.getNumber() != null && !property.getNumber().isBlank()) {
            if (!builder.isEmpty()) {
                builder.append(", ");
            }
            builder.append(property.getNumber().trim());
        }
        if (property.getNeighborhood() != null && !property.getNeighborhood().isBlank()) {
            if (!builder.isEmpty()) {
                builder.append(" - ");
            }
            builder.append(property.getNeighborhood().trim());
        }
        if (property.getCity() != null && !property.getCity().isBlank()) {
            if (!builder.isEmpty()) {
                builder.append(", ");
            }
            builder.append(property.getCity().trim());
        }
        if (property.getState() != null && !property.getState().isBlank()) {
            if (!builder.isEmpty()) {
                builder.append("/");
            }
            builder.append(property.getState().trim());
        }

        return builder.toString();
    }

    private String buildMunicipioUf(PropertyDTO property) {
        if (property == null) {
            return "";
        }
        String city = safeString(property.getCity());
        String state = safeString(property.getState());
        if (city.isBlank()) {
            return state;
        }
        if (state.isBlank()) {
            return city;
        }
        return city + "/" + state;
    }

    private String resolvePropertyType(PropertyDTO property) {
        String propertyType = property != null ? safeString(property.getPropertyType()) : "";
        return propertyType.isBlank() ? DEFAULT_PROPERTY_TYPE : propertyType;
    }

    private String normalizeNarrativePropertyType(String propertyType) {
        String normalized = safeString(propertyType);
        if (normalized.isBlank()) {
            normalized = DEFAULT_PROPERTY_TYPE;
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    private String resolveReferenceSystem(PropertyDTO property) {
        String datum = property != null ? safeString(property.getDatum()) : "";
        return datum.isBlank() ? DEFAULT_REFERENCE_SYSTEM : datum;
    }

    private String buildOriginalTerrainIdentification(PropertyDTO property, GlobalPlaceholderContext context) {
        MemorialProcessingContext.OriginalPropertyContext originalProperty =
                context != null && context.processingContext() != null
                        ? context.processingContext().effectiveOriginalProperty()
                        : null;
        String registrationNumber = property != null ? safeString(property.getRegistrationNumber()) : "";
        String baseStatement;
        if (!registrationNumber.isBlank()) {
            baseStatement = "Imovel objeto da matricula " + registrationNumber + ".";
        } else {
            String propertyName = property != null ? safeString(property.getName()) : "";
            if (!propertyName.isBlank()) {
                baseStatement = "Imovel identificado como " + propertyName + ".";
            } else {
                baseStatement = "Imovel original objeto deste desmembramento.";
            }
        }

        if (originalProperty == null || !originalProperty.hasVertices()) {
            return baseStatement;
        }

        return baseStatement
                + " Para a narrativa da situacao antes, adota-se o contorno "
                + originalProperty.resolvedLabel()
                + ", derivado da fonte "
                + originalProperty.resolvedSource()
                + ", com "
                + originalProperty.pointCount()
                + " ponto(s) preservados como referencia do terreno original.";
    }

    private String buildPolygonShapeDescription(List<LotTechnicalSummary> summaries) {
        if (summaries == null || summaries.isEmpty()) {
            return "poligonal";
        }

        boolean hasManyVertices = summaries.stream()
                .filter(Objects::nonNull)
                .map(LotTechnicalSummary::vertexSequence)
                .filter(Objects::nonNull)
                .anyMatch(vertices -> vertices.size() > 4);

        return hasManyVertices ? "poligonal irregular" : "poligonal";
    }

    private String buildOriginalTerrainShapeDescription(
            GlobalPlaceholderContext context,
            List<LotTechnicalSummary> summaries) {
        MemorialProcessingContext.OriginalPropertyContext originalProperty =
                context != null && context.processingContext() != null
                        ? context.processingContext().effectiveOriginalProperty()
                        : null;
        if (originalProperty != null && originalProperty.hasVertices()) {
            String baseShape = originalProperty.pointCount() > 4 ? "poligonal irregular" : "poligonal";
            return baseShape + " definido pelo contorno " + originalProperty.resolvedLabel().toUpperCase(Locale.ROOT);
        }
        return buildPolygonShapeDescription(summaries);
    }

    private String buildOriginalVertexSequence(List<LotTechnicalSummary> expectedSummaries) {
        if (expectedSummaries == null || expectedSummaries.isEmpty()) {
            return "";
        }
        return expectedSummaries.stream()
                .flatMap(summary -> summary.vertexSequence().stream())
                .map(VertexTechnicalPoint::label)
                .filter(label -> label != null && !label.isBlank())
                .distinct()
                .collect(Collectors.joining(", "));
    }

    private String resolveOriginalVertexSequence(
            List<LotTechnicalSummary> expectedSummaries,
            MemorialProcessingContext processingContext) {
        String originalPropertyVertexSequence = buildOriginalPropertyVertexSequence(processingContext);
        return !originalPropertyVertexSequence.isBlank()
                ? originalPropertyVertexSequence
                : buildOriginalVertexSequence(expectedSummaries);
    }

    private String buildOriginalVertexCoordinateSequence(List<LotTechnicalSummary> expectedSummaries) {
        if (expectedSummaries == null || expectedSummaries.isEmpty()) {
            return "";
        }

        return expectedSummaries.stream()
                .filter(Objects::nonNull)
                .flatMap(summary -> summary.vertexSequence().stream())
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(
                        VertexTechnicalPoint::label,
                        this::formatVertexCoordinate,
                        (left, right) -> left,
                        LinkedHashMap::new
                ))
                .values()
                .stream()
                .collect(Collectors.joining(", "));
    }

    private String resolveOriginalVertexCoordinateSequence(
            List<LotTechnicalSummary> expectedSummaries,
            MemorialProcessingContext processingContext) {
        String originalPropertyCoordinateSequence = buildOriginalPropertyCoordinateSequence(processingContext);
        return !originalPropertyCoordinateSequence.isBlank()
                ? originalPropertyCoordinateSequence
                : buildOriginalVertexCoordinateSequence(expectedSummaries);
    }

    private String buildOriginalPropertyVertexSequence(MemorialProcessingContext processingContext) {
        MemorialProcessingContext.OriginalPropertyContext originalProperty =
                processingContext != null ? processingContext.effectiveOriginalProperty() : null;
        if (originalProperty == null || !originalProperty.hasVertices()) {
            return "";
        }

        return originalProperty.vertices().stream()
                .map(MemorialProcessingContext.BaseAreaPoint::label)
                .filter(Objects::nonNull)
                .filter(label -> !label.isBlank())
                .collect(Collectors.joining(", "));
    }

    private String buildOriginalPropertyCoordinateSequence(MemorialProcessingContext processingContext) {
        MemorialProcessingContext.OriginalPropertyContext originalProperty =
                processingContext != null ? processingContext.effectiveOriginalProperty() : null;
        if (originalProperty == null || !originalProperty.hasVertices()) {
            return "";
        }

        return originalProperty.vertices().stream()
                .map(this::formatBaseAreaCoordinate)
                .collect(Collectors.joining(", "));
    }

    private String buildBaseAreaVertexSequence(MemorialProcessingContext processingContext) {
        if (processingContext == null || !processingContext.hasBaseArea()) {
            return "";
        }

        return processingContext.baseArea().vertices().stream()
                .map(MemorialProcessingContext.BaseAreaPoint::label)
                .filter(Objects::nonNull)
                .filter(label -> !label.isBlank())
                .collect(Collectors.joining(", "));
    }

    private String buildBaseAreaCoordinateSequence(MemorialProcessingContext processingContext) {
        if (processingContext == null || !processingContext.hasBaseArea()) {
            return "";
        }

        return processingContext.baseArea().vertices().stream()
                .map(this::formatBaseAreaCoordinate)
                .collect(Collectors.joining(", "));
    }

    private int resolveBaseAreaPointCount(MemorialProcessingContext processingContext) {
        if (processingContext == null || !processingContext.hasBaseArea()) {
            return 0;
        }
        return processingContext.baseArea().vertices().size();
    }

    private String formatBaseAreaCoordinate(MemorialProcessingContext.BaseAreaPoint vertex) {
        if (vertex == null) {
            return "";
        }

        String label = safeString(vertex.label());
        if (label.isBlank()) {
            label = "AREA_TOTAL_P" + String.format(Locale.US, "%02d", vertex.orderNumber());
        }

        return String.format(
                Locale.US,
                "%s (X %.2fm e Y %.2fm)",
                label,
                vertex.x(),
                vertex.y()
        );
    }

    private MemorialProcessingContext extractProcessingContextFromDocumentSummary(String documentSummaryJson) {
        if (documentSummaryJson == null || documentSummaryJson.isBlank()) {
            return new MemorialProcessingContext(null);
        }

        try {
            JsonNode rootNode = OBJECT_MAPPER.readTree(documentSummaryJson);
            JsonNode processingContextNode = rootNode.path("processingContext");
            JsonNode baseAreaNode = processingContextNode.path("baseArea");
            MemorialProcessingContext.BaseAreaContext baseArea = parseBoundaryContext(
                    baseAreaNode,
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
                return new MemorialProcessingContext(null);
            }

            return new MemorialProcessingContext(baseArea, originalProperty, remainingArea);
        } catch (Exception e) {
            log.debug("Nao foi possivel extrair processingContext do documentSummaryJson: {}", e.getMessage());
            return new MemorialProcessingContext(null);
        }
    }

    private MemorialProcessingContext.BaseAreaContext parseBoundaryContext(
            JsonNode boundaryNode,
            String defaultLabel,
            String labelPattern) {
        if (boundaryNode == null || boundaryNode.isMissingNode() || boundaryNode.isNull()) {
            return null;
        }

        List<MemorialProcessingContext.BaseAreaPoint> vertices = parseBoundaryVertices(boundaryNode.path("vertices"), labelPattern);
        if (vertices.isEmpty()) {
            return null;
        }

        return new MemorialProcessingContext.BaseAreaContext(
                defaultText(textValue(boundaryNode, "label"), defaultLabel),
                vertices
        );
    }

    private MemorialProcessingContext.OriginalPropertyContext parseOriginalPropertyContext(JsonNode originalPropertyNode) {
        if (originalPropertyNode == null || originalPropertyNode.isMissingNode() || originalPropertyNode.isNull()) {
            return null;
        }

        List<MemorialProcessingContext.BaseAreaPoint> vertices = parseBoundaryVertices(
                originalPropertyNode.path("vertices"),
                "TERRENO_ORIGINAL_P%02d"
        );
        if (vertices.isEmpty()) {
            return null;
        }

        return new MemorialProcessingContext.OriginalPropertyContext(
                defaultText(textValue(originalPropertyNode, "label"), "TERRENO_ORIGINAL"),
                defaultText(textValue(originalPropertyNode, "source"), "BASE_AREA"),
                defaultText(textValue(originalPropertyNode, "narrativeRole"), "TERRENO_ORIGINAL"),
                vertices
        );
    }

    private MemorialProcessingContext.RemainingAreaContext parseRemainingAreaContext(JsonNode remainingAreaNode) {
        if (remainingAreaNode == null || remainingAreaNode.isMissingNode() || remainingAreaNode.isNull()) {
            return null;
        }

        List<MemorialProcessingContext.BaseAreaPoint> vertices = parseBoundaryVertices(
                remainingAreaNode.path("vertices"),
                "AREA_REMANESCENTE_P%02d"
        );
        if (vertices.isEmpty()) {
            return null;
        }

        return new MemorialProcessingContext.RemainingAreaContext(
                defaultText(textValue(remainingAreaNode, "label"), "AREA_REMANESCENTE"),
                defaultText(textValue(remainingAreaNode, "source"), "PROCESSING_CONTEXT"),
                defaultText(textValue(remainingAreaNode, "narrativeRole"), "AREA_REMANESCENTE"),
                vertices
        );
    }

    private List<MemorialProcessingContext.BaseAreaPoint> parseBoundaryVertices(JsonNode verticesNode, String labelPattern) {
        List<MemorialProcessingContext.BaseAreaPoint> vertices = new java.util.ArrayList<>();
        if (!verticesNode.isArray() || verticesNode.isEmpty()) {
            return vertices;
        }

        int fallbackOrder = 1;
        for (JsonNode vertexNode : verticesNode) {
            Double x = doubleValue(vertexNode, "x");
            Double y = doubleValue(vertexNode, "y");
            if (x == null || y == null) {
                continue;
            }

            vertices.add(new MemorialProcessingContext.BaseAreaPoint(
                    intValue(vertexNode, "orderNumber", fallbackOrder),
                    defaultText(textValue(vertexNode, "label"), String.format(Locale.US, labelPattern, fallbackOrder)),
                    x,
                    y
            ));
            fallbackOrder++;
        }
        return vertices;
    }

    private String resolveOriginalTerrainLabel(GlobalPlaceholderContext context) {
        MemorialProcessingContext.OriginalPropertyContext originalProperty =
                context != null && context.processingContext() != null
                        ? context.processingContext().effectiveOriginalProperty()
                        : null;
        return originalProperty != null ? originalProperty.resolvedLabel() : "";
    }

    private String resolveOriginalTerrainSource(GlobalPlaceholderContext context) {
        MemorialProcessingContext.OriginalPropertyContext originalProperty =
                context != null && context.processingContext() != null
                        ? context.processingContext().effectiveOriginalProperty()
                        : null;
        return originalProperty != null ? originalProperty.resolvedSource() : "";
    }

    private String resolveOriginalTerrainNarrativeRole(GlobalPlaceholderContext context) {
        MemorialProcessingContext.OriginalPropertyContext originalProperty =
                context != null && context.processingContext() != null
                        ? context.processingContext().effectiveOriginalProperty()
                        : null;
        return originalProperty != null ? originalProperty.resolvedNarrativeRole() : "";
    }

    private String resolveRemainingAreaLabel(GlobalPlaceholderContext context) {
        MemorialProcessingContext.RemainingAreaContext remainingArea =
                context != null && context.processingContext() != null
                        ? context.processingContext().effectiveRemainingArea()
                        : null;
        return remainingArea != null ? remainingArea.resolvedLabel() : "";
    }

    private String resolveRemainingAreaSource(GlobalPlaceholderContext context) {
        MemorialProcessingContext.RemainingAreaContext remainingArea =
                context != null && context.processingContext() != null
                        ? context.processingContext().effectiveRemainingArea()
                        : null;
        return remainingArea != null ? remainingArea.resolvedSource() : "";
    }

    private String resolveRemainingAreaNarrativeRole(GlobalPlaceholderContext context) {
        MemorialProcessingContext.RemainingAreaContext remainingArea =
                context != null && context.processingContext() != null
                        ? context.processingContext().effectiveRemainingArea()
                        : null;
        return remainingArea != null ? remainingArea.resolvedNarrativeRole() : "";
    }

    private String buildOriginalTerrainNarrative(GlobalPlaceholderContext context) {
        MemorialProcessingContext.OriginalPropertyContext originalProperty =
                context != null && context.processingContext() != null
                        ? context.processingContext().effectiveOriginalProperty()
                        : null;
        if (originalProperty == null || !originalProperty.hasVertices()) {
            return "";
        }

        return "O terreno original foi contextualizado pelo contorno "
                + originalProperty.resolvedLabel()
                + ", derivado da fonte "
                + originalProperty.resolvedSource()
                + ", com "
                + originalProperty.pointCount()
                + " ponto(s) preservados para a narrativa da situacao antes.";
    }

    private String buildRemainingAreaNarrative(GlobalPlaceholderContext context) {
        MemorialProcessingContext.RemainingAreaContext remainingArea =
                context != null && context.processingContext() != null
                        ? context.processingContext().effectiveRemainingArea()
                        : null;
        if (remainingArea == null || !remainingArea.hasVertices()) {
            return "";
        }

        return "A area remanescente foi contextualizada pelo contorno "
                + remainingArea.resolvedLabel()
                + ", derivado da fonte "
                + remainingArea.resolvedSource()
                + ", com "
                + remainingArea.pointCount()
                + " ponto(s) preservados para uso narrativo complementar.";
    }

    private String buildRemainingAreaVertexSequence(MemorialProcessingContext processingContext) {
        MemorialProcessingContext.RemainingAreaContext remainingArea =
                processingContext != null ? processingContext.effectiveRemainingArea() : null;
        if (remainingArea == null || !remainingArea.hasVertices()) {
            return "";
        }

        return remainingArea.vertices().stream()
                .map(MemorialProcessingContext.BaseAreaPoint::label)
                .filter(label -> label != null && !label.isBlank())
                .collect(Collectors.joining(", "));
    }

    private String buildRemainingAreaCoordinateSequence(MemorialProcessingContext processingContext) {
        MemorialProcessingContext.RemainingAreaContext remainingArea =
                processingContext != null ? processingContext.effectiveRemainingArea() : null;
        if (remainingArea == null || !remainingArea.hasVertices()) {
            return "";
        }

        return remainingArea.vertices().stream()
                .map(this::formatBaseAreaCoordinate)
                .collect(Collectors.joining(", "));
    }

    private String resolveRemainingAreaPointCount(MemorialProcessingContext processingContext) {
        MemorialProcessingContext.RemainingAreaContext remainingArea =
                processingContext != null ? processingContext.effectiveRemainingArea() : null;
        if (remainingArea == null || !remainingArea.hasVertices()) {
            return "";
        }
        return Integer.toString(remainingArea.pointCount());
    }

    private String buildOriginalConfrontationSection(GlobalPlaceholderContext context) {
        String directionalContent = java.util.Arrays.stream(CardinalDirection.values())
                .map(direction -> formatDirectionHeading(direction) + context.resolveDirectionalBoundary(direction))
                .collect(Collectors.joining("\n"));
        String narrative = buildOriginalTerrainNarrative(context);
        if (narrative == null || narrative.isBlank()) {
            return directionalContent;
        }
        return narrative + "\n" + directionalContent;
    }

    private String resolveOriginalBoundary(PropertyDTO property, List<LotTechnicalSummary> expectedSummaries, String direction) {
        CardinalDirection cardinalDirection = CardinalDirection.fromLabel(direction);
        if (cardinalDirection != null) {
            return resolveOriginalBoundary(property, expectedSummaries, cardinalDirection);
        }

        if (direction == null || direction.isBlank()) {
            return DEFAULT_TECHNICAL_BOUNDARY;
        }

        String aggregatedReferences = aggregateDirectionReferenceDisplays(
                expectedSummaries,
                summary -> buildDeterministicDirectionReferenceDisplay(summary, direction)
        );
        return aggregatedReferences.isBlank() ? DEFAULT_TECHNICAL_BOUNDARY : aggregatedReferences;
    }

    private String resolveOriginalBoundary(
            PropertyDTO property,
            List<LotTechnicalSummary> expectedSummaries,
            CardinalDirection direction) {
        if (direction == null) {
            return DEFAULT_TECHNICAL_BOUNDARY;
        }

        String propertyBoundary = resolvePropertyBoundary(property, direction);
        if (!propertyBoundary.isBlank()) {
            return propertyBoundary;
        }

        String aggregatedReferences = aggregateDirectionReferenceDisplays(
                expectedSummaries,
                summary -> buildDeterministicDirectionReferenceDisplay(summary, direction)
        );
        return aggregatedReferences.isBlank() ? DEFAULT_TECHNICAL_BOUNDARY : aggregatedReferences;
    }

    private String resolvePropertyBoundary(PropertyDTO property, CardinalDirection direction) {
        return buildPropertyPlaceholderFallbackContext(property).resolveDirectionalBoundary(direction);
    }

    private String aggregateDirectionReferenceDisplays(
            List<LotTechnicalSummary> expectedSummaries,
            Function<LotTechnicalSummary, String> referenceBuilder) {
        if (expectedSummaries == null || expectedSummaries.isEmpty()) {
            return "";
        }

        List<String> references = expectedSummaries.stream()
                .map(referenceBuilder)
                .filter(value -> value != null && !value.isBlank())
                .map(value -> value.endsWith(".") ? value.substring(0, value.length() - 1) : value)
                .filter(value -> !value.isBlank())
                .distinct()
                .collect(Collectors.toList());

        if (references.isEmpty()) {
            return "";
        }

        List<String> identifiedReferences = references.stream()
                .filter(reference -> !isUnidentifiedReference(reference))
                .toList();

        List<String> effectiveReferences = identifiedReferences.isEmpty() ? references : identifiedReferences;
        return String.join("; ", effectiveReferences);
    }

    private String buildLocalData(PropertyDTO property, String currentDate) {
        String city = property != null ? safeString(property.getCity()) : "";
        return city.isBlank() ? currentDate : city + ", " + currentDate;
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    public String enforceDeterministicConfrontationSections(
            String content,
            List<LotTechnicalSummary> expectedSummaries,
            List<LotBlock> blocks) {
        if (content == null || content.isBlank() || expectedSummaries == null || expectedSummaries.isEmpty()) {
            return content;
        }

        if (blocks == null || blocks.isEmpty()) {
            return content;
        }

        Map<Integer, LotTechnicalSummary> summariesByLot = expectedSummaries.stream()
                .collect(Collectors.toMap(
                        LotTechnicalSummary::lotNumber,
                        summary -> summary,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        StringBuilder rebuilt = new StringBuilder();
        int cursor = 0;
        for (LotBlock block : blocks) {
            rebuilt.append(content, cursor, block.start());
            LotTechnicalSummary summary = summariesByLot.get(block.lotNumber());
            if (summary == null) {
                rebuilt.append(block.content());
            } else {
                rebuilt.append(rewriteLotConfrontationSection(block.content(), summary));
            }
            cursor = block.end();
        }
        rebuilt.append(content.substring(cursor));
        return rebuilt.toString();
    }

    public String buildDeterministicDirectionReference(LotTechnicalSummary summary, String direction) {
        CardinalDirection cardinalDirection = CardinalDirection.fromLabel(direction);
        if (cardinalDirection != null) {
            return buildDeterministicDirectionReference(summary, cardinalDirection);
        }

        if (summary == null || direction == null || direction.isBlank()) {
            return ensureTrailingPeriod(UNIDENTIFIED_REFERENCE);
        }
        return buildDeterministicDirectionReferenceInternal(
                summary,
                side -> direction.equalsIgnoreCase(side.direction())
        );
    }

    private String buildDeterministicDirectionReference(LotTechnicalSummary summary, CardinalDirection direction) {
        if (summary == null || direction == null) {
            return ensureTrailingPeriod(UNIDENTIFIED_REFERENCE);
        }

        String consolidatedReference = resolveConsolidatedDirectionReference(summary, direction);
        if (consolidatedReference != null && !consolidatedReference.isBlank()) {
            return ensureTrailingPeriod(consolidatedReference);
        }

        return buildDeterministicDirectionReferenceInternal(
                summary,
                side -> direction.matchesSideDirection(side.direction())
        );
    }

    private String buildDeterministicDirectionReferenceInternal(
            LotTechnicalSummary summary,
            java.util.function.Predicate<TechnicalSideSummary> sideFilter) {
        List<String> references = summary.sideSummaries().stream()
                .filter(sideFilter)
                .map(side -> normalizeReferenceForLotSummary(side.reference(), summary.lotNumber()))
                .filter(reference -> !reference.isBlank())
                .distinct()
                .collect(Collectors.toList());

        if (references.isEmpty()) {
            return ensureTrailingPeriod(UNIDENTIFIED_REFERENCE);
        }
        if (references.size() == 1) {
            return ensureTrailingPeriod(references.get(0));
        }
        return ensureTrailingPeriod(String.join("; ", references));
    }

    public String buildDeterministicDirectionReferenceDisplay(LotTechnicalSummary summary, String direction) {
        String reference = buildDeterministicDirectionReference(summary, direction);
        if (!hasSelfReferencedDirection(summary, direction)) {
            return reference;
        }
        return appendSelfReferenceMarker(reference);
    }

    private String buildDeterministicDirectionReferenceDisplay(LotTechnicalSummary summary, CardinalDirection direction) {
        String reference = buildDeterministicDirectionReference(summary, direction);
        if (!hasSelfReferencedDirection(summary, direction)) {
            return reference;
        }
        return appendSelfReferenceMarker(reference);
    }

    private String appendSelfReferenceMarker(String reference) {
        if (isUnidentifiedReference(reference)) {
            return reference;
        }

        String normalized = reference != null ? reference.trim() : "";
        if (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1).trim();
        }
        return ensureTrailingPeriod(normalized + " " + SELF_REFERENCE_REPLACEMENT_MARKER);
    }

    public String formatSummarySideReference(String reference, int lotNumber) {
        String normalized = normalizeReferenceForLotSummary(reference, lotNumber);
        if (isSelfReferencedLot(reference, lotNumber)) {
            return normalized + " " + SELF_REFERENCE_REPLACEMENT_MARKER;
        }
        return normalized;
    }

    public String sanitizeConfrontationReference(String reference) {
        if (reference == null) {
            return null;
        }

        String normalized = reference.trim();
        if (normalized.isBlank()) {
            return null;
        }

        if (POINT_LIKE_REFERENCE_PATTERN.matcher(normalized).matches()) {
            return null;
        }

        return normalized;
    }

    public boolean isUnidentifiedReference(String reference) {
        if (reference == null || reference.isBlank()) {
            return true;
        }

        String normalized = reference.trim();
        if (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1).trim();
        }

        String normalizedReference = normalizeForMatching(stripTrailingPeriod(normalized));
        return normalizedReference.equals(normalizeForMatching(UNIDENTIFIED_REFERENCE))
                || normalizedReference.equals(UNIDENTIFIED_REFERENCE_SHORT);
    }

    public boolean isInternalSubdivisionReference(String reference) {
        if (reference == null || reference.isBlank()) {
            return false;
        }

        String normalized = reference.trim();
        if (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1).trim();
        }

        return normalizeForMatching(stripTrailingPeriod(normalized))
                .equals(normalizeForMatching(INTERNAL_SUBDIVISION_REFERENCE));
    }

    public boolean hasSelfReferencedDirection(LotTechnicalSummary summary, String direction) {
        CardinalDirection cardinalDirection = CardinalDirection.fromLabel(direction);
        if (cardinalDirection != null) {
            return hasSelfReferencedDirection(summary, cardinalDirection);
        }
        if (summary == null || direction == null || direction.isBlank()) {
            return false;
        }
        return hasSelfReferencedDirectionInternal(
                summary,
                side -> direction.equalsIgnoreCase(side.direction())
        );
    }

    private boolean hasSelfReferencedDirection(LotTechnicalSummary summary, CardinalDirection direction) {
        if (summary == null || direction == null) {
            return false;
        }
        return hasSelfReferencedDirectionInternal(
                summary,
                side -> direction.matchesSideDirection(side.direction())
        );
    }

    private boolean hasSelfReferencedDirectionInternal(
            LotTechnicalSummary summary,
            java.util.function.Predicate<TechnicalSideSummary> sideFilter) {
        return summary.sideSummaries().stream()
                .filter(Objects::nonNull)
                .filter(sideFilter)
                .anyMatch(side -> isSelfReferencedLot(side.reference(), summary.lotNumber()));
    }

    public Integer extractReferencedLotNumber(String reference) {
        String sanitized = sanitizeConfrontationReference(reference);
        if (sanitized == null || sanitized.isBlank()) {
            return null;
        }

        Matcher matcher = REFERENCED_LOT_PATTERN.matcher(sanitized);
        if (!matcher.find()) {
            return null;
        }

        try {
            return Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    public boolean isSelfReferencedLot(String reference, int lotNumber) {
        return Objects.equals(extractReferencedLotNumber(reference), lotNumber);
    }

    private String rewriteLotConfrontationSection(String blockContent, LotTechnicalSummary summary) {
        if (blockContent == null || blockContent.isBlank() || summary == null) {
            return blockContent;
        }

        String normalizedBlock = blockContent.replace("\r\n", "\n").trim();
        String confrontationSection = buildDeterministicConfrontationSection(summary);

        Matcher explicitSectionMatcher = EXPLICIT_CONFRONTATION_SECTION_PATTERN.matcher(normalizedBlock);
        if (explicitSectionMatcher.find()) {
            return explicitSectionMatcher.replaceFirst(CONFRONTATION_SECTION_HEADER + Matcher.quoteReplacement(confrontationSection));
        }

        if (DIRECTION_LINE_PATTERN.matcher(normalizedBlock).find()) {
            String withoutAoLines = DIRECTION_LINE_REMOVAL_PATTERN.matcher(normalizedBlock)
                    .replaceAll("")
                    .replaceAll("\\n{3,}", "\n\n")
                    .trim();
            return withoutAoLines + CONFRONTATION_SECTION_HEADER + confrontationSection;
        }

        return normalizedBlock + CONFRONTATION_SECTION_HEADER + confrontationSection;
    }

    private String buildDeterministicConfrontationSection(LotTechnicalSummary summary) {
        return java.util.Arrays.stream(CardinalDirection.values())
                .map(direction -> formatDirectionHeading(direction) + buildDeterministicDirectionReferenceDisplay(summary, direction))
                .collect(Collectors.joining("\n"));
    }

    private String buildVertexCoordinateSequence(LotTechnicalSummary summary) {
        if (summary == null || summary.vertexSequence() == null || summary.vertexSequence().isEmpty()) {
            return "";
        }

        return summary.vertexSequence().stream()
                .filter(Objects::nonNull)
                .map(this::formatVertexCoordinate)
                .collect(Collectors.joining(", "));
    }

    private String formatVertexCoordinate(VertexTechnicalPoint vertex) {
        if (vertex == null) {
            return "";
        }

        String label = safeString(vertex.label());
        if (label.isBlank()) {
            label = "P" + vertex.orderNumber();
        }

        return String.format(
                Locale.US,
                "%s (E %.2fm e N %.2fm)",
                label,
                vertex.x(),
                vertex.y()
        );
    }

    private String ensureTrailingPeriod(String value) {
        if (value == null || value.isBlank()) {
            return ensureTrailingPeriod(UNIDENTIFIED_REFERENCE);
        }
        String trimmed = value.trim();
        return trimmed.endsWith(".") ? trimmed : trimmed + ".";
    }

    private String buildDeterministicLotDescription(LotTechnicalSummary summary, PropertyDTO property) {
        String cidade = property != null && property.getCity() != null ? property.getCity() : UNKNOWN_CITY;
        String estado = property != null && property.getState() != null ? property.getState() : UNKNOWN_STATE;
        String orderedPoints = buildOrderedPointSequence(summary);
        String firstPoint = summary.vertexSequence().isEmpty()
                ? UNIDENTIFIED_START_POINT
                : summary.vertexSequence().get(0).label();

        StringBuilder builder = new StringBuilder();
        builder.append(LOT_PREFIX)
                .append(String.format(Locale.US, "%02d", summary.lotNumber()))
                .append(":\n");
        builder.append(LOT_DESCRIPTION_INTRO)
                .append(cidade)
                .append("/")
                .append(estado);

        if (!UNIDENTIFIED_START_POINT.equals(firstPoint)) {
            builder.append(LOT_START_POINT_PREFIX).append(firstPoint);
        }

        if (!orderedPoints.isBlank()) {
            builder.append(PERIMETER_SEQUENCE_PREFIX).append(orderedPoints);
        }

        builder.append(LOT_METRICS_PREFIX)
                .append(formatMetric(summary.perimeter(), "m"))
                .append(LOT_AREA_PREFIX)
                .append(formatMetric(summary.area(), "m2"))
                .append(LOT_DESCRIPTION_OUTRO);

        for (CardinalDirection direction : CardinalDirection.values()) {
            builder.append(formatDirectionHeading(direction))
                    .append(buildDeterministicDirectionDescription(summary, direction))
                    .append("\n");
        }

        return builder.toString().trim();
    }

    private String buildDeterministicDirectionDescription(LotTechnicalSummary summary, CardinalDirection direction) {
        List<TechnicalSideSummary> sides = summary.sideSummaries().stream()
                .filter(side -> direction.matchesSideDirection(side.direction()))
                .collect(Collectors.toList());
        if (sides.isEmpty()) {
            return ensureTrailingPeriod(UNIDENTIFIED_REFERENCE);
        }

        String referenceOverride = resolveConsolidatedDirectionReference(summary, direction);
        if (sides.size() == 1) {
            return buildDeterministicSideSentence(sides.get(0), summary.lotNumber(), referenceOverride);
        }

        StringBuilder builder = new StringBuilder();
        builder.append(MULTI_SEGMENT_PREFIX);
        for (int i = 0; i < sides.size(); i++) {
            TechnicalSideSummary side = sides.get(i);
            if (i == 0) {
                builder.append(buildDeterministicSideClause(side, summary.lotNumber(), FIRST_SEGMENT_CONNECTOR, referenceOverride));
            } else if (i == sides.size() - 1) {
                builder.append(FINAL_SEGMENT_PREFIX)
                        .append(buildDeterministicSideClause(side, summary.lotNumber(), NEXT_SEGMENT_CONNECTOR, referenceOverride));
            } else {
                builder.append(INTERMEDIATE_SEGMENT_PREFIX)
                        .append(buildDeterministicSideClause(side, summary.lotNumber(), NEXT_SEGMENT_CONNECTOR, referenceOverride));
            }
        }
        builder.append(".");
        return builder.toString();
    }

    private String buildDeterministicSideSentence(
            TechnicalSideSummary side,
            int lotNumber,
            String referenceOverride) {
        return buildDeterministicSideClause(side, lotNumber, null, referenceOverride) + ".";
    }

    private String buildDeterministicSideClause(
            TechnicalSideSummary side,
            int lotNumber,
            String connector,
            String referenceOverride) {
        StringBuilder builder = new StringBuilder();
        if (connector != null && !connector.isBlank()) {
            builder.append(connector).append(" ");
        }
        String preferredReference = referenceOverride != null && !referenceOverride.isBlank()
                ? referenceOverride
                : side.reference();
        builder.append("do ponto ")
                .append(side.startLabel())
                .append(" ao ponto ")
                .append(side.endLabel())
                .append(DISTANCE_PREFIX)
                .append(formatMetric(side.length(), "m"))
                .append(", rumo ")
                .append(safeTechnicalBearing(side.technicalBearing()))
                .append(SEGMENT_CONFRONTATION_PREFIX)
                .append(normalizeReferenceForLotSummary(preferredReference, lotNumber));
        return builder.toString();
    }

    private String resolveConsolidatedDirectionReference(
            LotTechnicalSummary summary,
            CardinalDirection direction) {
        if (summary == null || direction == null || summary.consolidatedConfrontations() == null) {
            return null;
        }

        String reference = summary.consolidatedConfrontations().get(direction.label());
        if (reference == null || reference.isBlank()) {
            return null;
        }

        String normalized = normalizeReferenceForLotSummary(reference, summary.lotNumber());
        return normalized == null || normalized.isBlank() ? null : normalized;
    }

    private String formatDirectionHeading(CardinalDirection direction) {
        return DIRECTION_PREFIX + direction.label() + ": ";
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
            return UNIDENTIFIED_REFERENCE;
        }
        return String.format(Locale.US, "%.2f %s", value, unit);
    }

    private String formatNumericMetric(Double value) {
        if (value == null) {
            return "";
        }
        return String.format(Locale.US, "%.2f", value);
    }

    private String formatPerimeterExtenso(Double value) {
        if (value == null) {
            return "";
        }

        int integerPart = value.intValue();
        int decimalPart = (int) Math.round((value - integerPart) * 100);
        if (decimalPart == 100) {
            integerPart += 1;
            decimalPart = 0;
        }

        StringBuilder builder = new StringBuilder();
        builder.append(numberToPortuguese(integerPart))
                .append(integerPart == 1 ? " metro" : " metros");

        if (decimalPart > 0) {
            builder.append(" e ")
                    .append(numberToPortuguese(decimalPart))
                    .append(decimalPart == 1 ? " centimetro" : " centimetros");
        }
        return builder.toString();
    }

    private String formatAreaExtenso(Double value) {
        if (value == null) {
            return "";
        }

        int integerPart = (int) Math.floor(value);
        return numberToPortuguese(integerPart)
                + (integerPart == 1 ? " metro quadrado" : " metros quadrados");
    }

    private String numberToPortuguese(int value) {
        if (value == 0) {
            return "zero";
        }
        if (value < 0) {
            return "menos " + numberToPortuguese(Math.abs(value));
        }
        if (value < 1000) {
            return formatHundredsToPortuguese(value);
        }
        if (value < 1_000_000) {
            int thousands = value / 1000;
            int remainder = value % 1000;
            String prefix = thousands == 1 ? "mil" : numberToPortuguese(thousands) + " mil";
            return remainder == 0 ? prefix : prefix + separatorForLargeNumbers(remainder) + numberToPortuguese(remainder);
        }
        if (value < 1_000_000_000) {
            int millions = value / 1_000_000;
            int remainder = value % 1_000_000;
            String prefix = millions == 1 ? "um milhão" : numberToPortuguese(millions) + " milhões";
            return remainder == 0 ? prefix : prefix + separatorForLargeNumbers(remainder) + numberToPortuguese(remainder);
        }
        return Integer.toString(value);
    }

    private String separatorForLargeNumbers(int remainder) {
        return remainder < 100 ? " e " : " ";
    }

    private String formatHundredsToPortuguese(int value) {
        String[] units = {"", "um", "dois", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove"};
        String[] teens = {"dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"};
        String[] tens = {"", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"};
        String[] hundreds = {"", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"};

        if (value == 100) {
            return "cem";
        }

        StringBuilder builder = new StringBuilder();
        int hundredPart = value / 100;
        int remainder = value % 100;
        if (hundredPart > 0) {
            builder.append(hundreds[hundredPart]);
            if (remainder > 0) {
                builder.append(" e ");
            }
        }

        if (remainder >= 20) {
            builder.append(tens[remainder / 10]);
            int unitPart = remainder % 10;
            if (unitPart > 0) {
                builder.append(" e ").append(units[unitPart]);
            }
            return builder.toString();
        }

        if (remainder >= 10) {
            builder.append(teens[remainder - 10]);
            return builder.toString();
        }

        if (remainder > 0) {
            builder.append(units[remainder]);
        }

        return builder.toString();
    }

    private String safeTechnicalBearing(String bearing) {
        if (bearing == null || bearing.isBlank()) {
            return UNIDENTIFIED_REFERENCE;
        }
        return bearing;
    }

    private String normalizeReferenceForFallback(String reference) {
        if (reference == null || reference.isBlank()) {
            return INTERNAL_SUBDIVISION_REFERENCE;
        }
        String sanitized = sanitizeConfrontationReference(reference);
        if (sanitized == null || sanitized.isBlank()) {
            return INTERNAL_SUBDIVISION_REFERENCE;
        }
        return sanitized;
    }

    private String normalizeReferenceForLotSummary(String reference, int lotNumber) {
        String normalized = normalizeReferenceForFallback(reference);
        return isSelfReferencedLot(normalized, lotNumber) ? INTERNAL_SUBDIVISION_REFERENCE : normalized;
    }

    private String stripTrailingPeriod(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.trim();
        if (normalized.endsWith(".")) {
            return normalized.substring(0, normalized.length() - 1).trim();
        }
        return normalized;
    }
}
