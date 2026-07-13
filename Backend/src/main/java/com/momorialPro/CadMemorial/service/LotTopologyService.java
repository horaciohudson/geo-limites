package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.SelectedConfrontationTextDTO;
import com.momorialPro.CadMemorial.util.CoordinateUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.OptionalInt;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LotTopologyService {
    private static final Pattern ORDER_LABEL_PATTERN = Pattern.compile(
            "(?i)^\\s*(?:P|PT|PONTO|V|ESTACA|E)\\s*[-_:/#]*\\s*0*(\\d{1,4})\\s*$"
    );
    private static final Pattern POINT_LIKE_REFERENCE_PATTERN = Pattern.compile(
            "(?i)^\\s*(?:P|PT|PONTO|V|VERTICE|VERTEX|ESTACA|E|POINT|POINT:|ESTACA:)\\s*[-_:/# ]*\\s*0*(\\d{1,4})\\s*\\.?\\s*$"
    );
    private static final int POLYGON_SIGNATURE_DECIMALS = 4;

    private final DxfTextExtractorService dxfTextExtractorService;
    private final ManualFrontageAnalysisService manualFrontageAnalysisService;
    private final DxfGeoReferenciaExtractorService geoExtractorService;

    // #region debug-point A:report-debug-event
    private void reportDebugEvent(String hypothesisId, String location, String msg, Map<String, Object> data) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sessionId", "mixed-partial-lot-shift");
            payload.put("runId", "pre-fix");
            payload.put("hypothesisId", hypothesisId);
            payload.put("location", location);
            payload.put("msg", msg);
            payload.put("data", data);
            payload.put("ts", System.currentTimeMillis());
            HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:7777/event"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(new ObjectMapper().writeValueAsString(payload)))
                    .build();
            HttpClient.newHttpClient().sendAsync(request, HttpResponse.BodyHandlers.discarding());
        } catch (Exception ignored) {
        }
    }
    // #endregion

    public int countScopedLots(List<Map<String, Object>> entities) {
        return buildOrderedLotContexts(entities).size();
    }

    public String buildSelectedLotContext(List<Map<String, Object>> entities, int maxLots) {
        return buildSelectedLotContext(entities, 1, maxLots);
    }

    public String buildSelectedLotContext(List<Map<String, Object>> entities, int startLotNumber, int maxLots) {
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

    public List<Map<String, Object>> selectLotEntitiesForRange(
            List<Map<String, Object>> entities,
            int startLotNumber,
            int maxLots) {
        return selectOrderedLotContexts(entities, startLotNumber, maxLots).stream()
                .map(OrderedLotContext::entity)
                .collect(Collectors.toList());
    }

    public List<LotTechnicalSummary> selectLotTechnicalSummaries(
            List<Map<String, Object>> entities,
            Map<String, List<String>> confrontations,
            List<Integer> detectedLotNumbers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform,
            int startLotNumber,
            int maxLots) {
        if (entities == null || entities.isEmpty() || maxLots <= 0) {
            return List.of();
        }

        List<LotTechnicalSummary> summaries = buildLotTechnicalSummaries(
                entities,
                confrontations,
                detectedLotNumbers,
                selectedConfrontationTexts,
                georeferencingTransform
        );

        List<LotTechnicalSummary> alignedSummaries = alignWithDetectedLotNumbers(summaries, detectedLotNumbers);
        if (!alignedSummaries.isEmpty()) {
            int endLotNumber = startLotNumber + maxLots - 1;
            List<LotTechnicalSummary> rangedSummaries = alignedSummaries.stream()
                    .filter(summary -> summary.lotNumber() >= startLotNumber && summary.lotNumber() <= endLotNumber)
                    .sorted(Comparator.comparingInt(LotTechnicalSummary::lotNumber))
                    .collect(Collectors.toList());
            if (!rangedSummaries.isEmpty()) {
                return rangedSummaries;
            }
        }

        int zeroBasedStartIndex = Math.max(0, startLotNumber - 1);
        if (zeroBasedStartIndex < summaries.size()) {
            return summaries.stream()
                    .skip(zeroBasedStartIndex)
                    .limit(maxLots)
                    .collect(Collectors.toList());
        }

        return renumberLotTechnicalSummaries(
                summaries.stream().limit(maxLots).collect(Collectors.toList()),
                startLotNumber
        );
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

    private List<OrderedLotContext> buildOrderedLotContexts(List<Map<String, Object>> entities) {
        List<OrderLabelReference> orderLabels = extractOrderLabelReferences(entities);
        List<OrderedLotContext> orderedLots = new ArrayList<>();
        Set<String> polygonSignatures = new LinkedHashSet<>();
        int fallbackIndex = 0;

        for (Map<String, Object> entity : entities) {
            String type = String.valueOf(entity.get("type"));
            if (!"POLYLINE".equals(type) && !"LWPOLYLINE".equals(type)) {
                continue;
            }

            if (shouldSkipTechnicalSummaryEntity(entity)) {
                log.debug("Ignorando poligono marcado apenas como contexto do resumo tecnico: layer={}", entity.get("layer"));
                continue;
            }

            List<Map<String, Object>> vertices = extractVertices(entity);
            if (vertices.size() < 3) {
                continue;
            }

            String polygonSignature = buildPolygonSignature(vertices);
            if (polygonSignature != null && !polygonSignatures.add(polygonSignature)) {
                log.debug("Ignorando poligono duplicado no resumo tecnico: layer={}", entity.get("layer"));
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
                    extractLotNumberHint(entity),
                    orderedLabelNames,
                    firstOrderNumber,
                    centroidX,
                    centroidY,
                    fallbackIndex++
            ));

            @SuppressWarnings("unchecked")
            Map<String, Object> properties = (Map<String, Object>) entity.get("properties");
            Map<String, Object> debugData = new LinkedHashMap<>();
            debugData.put("lotNumberHint", extractLotNumberHint(entity));
            debugData.put("syntheticTechnicalSummaryLot", properties != null && Boolean.TRUE.equals(properties.get("syntheticTechnicalSummaryLot")));
            debugData.put("selectedTechnicalSummaryLot", properties != null && Boolean.TRUE.equals(properties.get("selectedTechnicalSummaryLot")));
            debugData.put("technicalSummaryLotSource", properties != null ? properties.get("technicalSummaryLotSource") : null);
            debugData.put("area", area);
            debugData.put("perimeter", perimeter);
            debugData.put("firstOrderNumber", firstOrderNumber);
            debugData.put("orderedLabelNames", orderedLabelNames);
            reportDebugEvent(
                    "E",
                    "LotTopologyService.java:buildOrderedLotContexts",
                    "[DEBUG] Built ordered lot context",
                    debugData
            );
        }

        orderedLots.sort(Comparator
                .comparing((OrderedLotContext context) -> context.lotNumberHint() == null ? Integer.MAX_VALUE : context.lotNumberHint())
                .thenComparingInt(OrderedLotContext::firstOrderNumber)
                .thenComparingDouble(OrderedLotContext::centroidY)
                .thenComparingDouble(OrderedLotContext::centroidX)
                .thenComparingInt(OrderedLotContext::fallbackIndex));

        reportDebugEvent(
                "E",
                "LotTopologyService.java:buildOrderedLotContexts:sorted",
                "[DEBUG] Sorted ordered lot contexts",
                Map.of(
                        "orderedLots", orderedLots.stream()
                                .map(context -> {
                                    Map<String, Object> sortedContextData = new LinkedHashMap<>();
                                    sortedContextData.put("lotNumberHint", context.lotNumberHint());
                                    sortedContextData.put("firstOrderNumber", context.firstOrderNumber());
                                    sortedContextData.put("area", context.area());
                                    sortedContextData.put("perimeter", context.perimeter());
                                    sortedContextData.put("fallbackIndex", context.fallbackIndex());
                                    return sortedContextData;
                                })
                                .collect(Collectors.toList())
                )
        );

        return orderedLots;
    }

    private String buildPolygonSignature(List<Map<String, Object>> vertices) {
        if (vertices == null || vertices.size() < 3) {
            return null;
        }

        List<String> forwardKeys = new ArrayList<>();
        for (Map<String, Object> vertex : vertices) {
            double x = parseDouble(vertex.get("x"));
            double y = parseDouble(vertex.get("y"));
            if (Double.isNaN(x) || Double.isNaN(y)) {
                return null;
            }
            forwardKeys.add(roundCoordinate(x) + "," + roundCoordinate(y));
        }

        String forwardSignature = buildCanonicalRotation(forwardKeys);
        List<String> reverseKeys = new ArrayList<>(forwardKeys);
        java.util.Collections.reverse(reverseKeys);
        String reverseSignature = buildCanonicalRotation(reverseKeys);
        return forwardSignature.compareTo(reverseSignature) <= 0 ? forwardSignature : reverseSignature;
    }

    private String buildCanonicalRotation(List<String> keys) {
        if (keys == null || keys.isEmpty()) {
            return "";
        }

        String best = rotateKeys(keys, 0);
        for (int index = 1; index < keys.size(); index++) {
            String candidate = rotateKeys(keys, index);
            if (candidate.compareTo(best) < 0) {
                best = candidate;
            }
        }
        return best;
    }

    private String rotateKeys(List<String> keys, int startIndex) {
        List<String> rotated = new ArrayList<>(keys.size());
        rotated.addAll(keys.subList(startIndex, keys.size()));
        rotated.addAll(keys.subList(0, startIndex));
        return String.join("|", rotated);
    }

    private String roundCoordinate(double value) {
        return String.format(Locale.US, "%." + POLYGON_SIGNATURE_DECIMALS + "f", value);
    }

    private Integer extractLotNumberHint(Map<String, Object> entity) {
        if (entity == null) {
            return null;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) entity.get("properties");
        if (properties == null) {
            return null;
        }

        Object rawLotNumberHint = properties.get("technicalSummaryLotNumberHint");
        if (rawLotNumberHint instanceof Number number) {
            int value = number.intValue();
            return value > 0 ? value : null;
        }
        if (rawLotNumberHint instanceof String text) {
            try {
                int value = Integer.parseInt(text.trim());
                return value > 0 ? value : null;
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private boolean shouldSkipTechnicalSummaryEntity(Map<String, Object> entity) {
        if (entity == null) {
            return false;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) entity.get("properties");
        if (properties == null) {
            return false;
        }

        Object rawSkipFlag = properties.get("technicalSummarySkipLotSummary");
        if (rawSkipFlag instanceof Boolean skipFlag) {
            return skipFlag;
        }
        if (rawSkipFlag instanceof String text) {
            return Boolean.parseBoolean(text.trim());
        }
        return false;
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

        if (vertices.size() >= 2) {
            Map<String, Object> firstVertex = vertices.get(0);
            Map<String, Object> lastVertex = vertices.get(vertices.size() - 1);
            double firstX = parseDouble(firstVertex.get("x"));
            double firstY = parseDouble(firstVertex.get("y"));
            double lastX = parseDouble(lastVertex.get("x"));
            double lastY = parseDouble(lastVertex.get("y"));
            if (!Double.isNaN(firstX) && !Double.isNaN(firstY)
                    && !Double.isNaN(lastX) && !Double.isNaN(lastY)
                    && distance(firstX, firstY, lastX, lastY) <= 0.000001) {
                vertices.remove(vertices.size() - 1);
            }
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

    private List<LotTechnicalSummary> buildLotTechnicalSummaries(
            List<Map<String, Object>> entities,
            Map<String, List<String>> confrontations,
            List<Integer> detectedLotNumbers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {
        List<OrderedLotContext> orderedLots = buildOrderedLotContexts(entities);
        List<OrderLabelReference> orderLabels = extractOrderLabelReferences(entities);
        List<LotTechnicalSummary> summaries = new ArrayList<>();
        Set<Integer> detectedLotNumberSet = detectedLotNumbers == null
                ? Set.of()
                : detectedLotNumbers.stream()
                .filter(Objects::nonNull)
                .filter(value -> value > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        boolean strictDetectedLotMode = !detectedLotNumberSet.isEmpty()
                && orderedLots.stream()
                .map(OrderedLotContext::lotNumberHint)
                .filter(Objects::nonNull)
                .anyMatch(detectedLotNumberSet::contains);
        int nextSyntheticLotNumber = detectedLotNumberSet.stream()
                .mapToInt(Integer::intValue)
                .max()
                .orElse(0) + 1;

        for (int index = 0; index < orderedLots.size(); index++) {
            OrderedLotContext orderedLot = orderedLots.get(index);
            Integer hintedLotNumber = orderedLot.lotNumberHint();

            if (strictDetectedLotMode) {
                if (hintedLotNumber == null || hintedLotNumber <= 0 || !detectedLotNumberSet.contains(hintedLotNumber)) {
                    hintedLotNumber = null;
                }
            }

            List<OrderLabelReference> labelsForPolygon = findOrderLabelsForPolygon(orderedLot.vertices(), orderLabels);
            List<VertexTechnicalPoint> vertexSequence = buildVertexSequence(
                    orderedLot.vertices(),
                    labelsForPolygon,
                    georeferencingTransform
            );
            if (vertexSequence.size() < 3) {
                continue;
            }
            if (orderedLot.area() == null || orderedLot.area() < 1.0) {
                log.debug("Ignorando POLYLINE sem area valida: vertices={} area={}",
                        vertexSequence.size(), orderedLot.area());
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
                    .filter(manualFrontageAnalysisService::looksLikeStreetReference)
                    .distinct()
                    .collect(Collectors.toList());

            boolean hasDualFrontage = streetFrontages.size() >= 2;
            boolean isCornerLot = sideSummaries.stream()
                    .map(TechnicalSideSummary::direction)
                    .distinct()
                    .count() >= 2 && hasDualFrontage;

            int resolvedLotNumber = hintedLotNumber != null && hintedLotNumber > 0
                    ? hintedLotNumber
                    : strictDetectedLotMode
                    ? nextSyntheticLotNumber++
                    : index + 1;
            LotTechnicalSummary summary = new LotTechnicalSummary(
                    resolvedLotNumber,
                    orderedLot.area(),
                    orderedLot.perimeter(),
                    vertexSequence,
                    sideSummaries,
                    Map.of(),
                    streetFrontages,
                    isCornerLot,
                    hasDualFrontage,
                    georeferencingTransform != null,
                    List.of()
            );
            logLotTechnicalSummary(summary);
            summaries.add(summary);
        }

        return summaries.stream()
                .sorted(Comparator.comparingInt(LotTechnicalSummary::lotNumber))
                .collect(Collectors.toList());
    }

    private List<LotTechnicalSummary> renumberLotTechnicalSummaries(
            List<LotTechnicalSummary> summaries,
            int startLotNumber) {
        if (summaries == null || summaries.isEmpty()) {
            return List.of();
        }

        List<LotTechnicalSummary> renumbered = new ArrayList<>();
        for (int index = 0; index < summaries.size(); index++) {
            LotTechnicalSummary summary = summaries.get(index);
            renumbered.add(new LotTechnicalSummary(
                    startLotNumber + index,
                    summary.area(),
                    summary.perimeter(),
                    summary.vertexSequence(),
                    summary.sideSummaries(),
                    summary.consolidatedConfrontations(),
                    summary.streetFrontages(),
                    summary.isCornerLot(),
                    summary.hasDualFrontage(),
                    summary.hasGeoreferencedVertices(),
                    summary.supplementalValidationIssues()
            ));
        }
        return renumbered;
    }

    private List<LotTechnicalSummary> alignWithDetectedLotNumbers(
            List<LotTechnicalSummary> summaries,
            List<Integer> detectedLotNumbers) {
        if (summaries == null || summaries.isEmpty()) {
            return buildPendingDetectedLotSummaries(detectedLotNumbers);
        }

        Set<Integer> detectedLotNumberSet = detectedLotNumbers == null
                ? Set.of()
                : detectedLotNumbers.stream()
                .filter(Objects::nonNull)
                .filter(value -> value > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        boolean strictDetectedLotMode = !detectedLotNumberSet.isEmpty()
                && summaries.stream()
                .filter(Objects::nonNull)
                .map(LotTechnicalSummary::lotNumber)
                .anyMatch(detectedLotNumberSet::contains);

        if (!strictDetectedLotMode) {
            reportDebugEvent(
                    "D",
                    "LotTopologyService.java:alignWithDetectedLotNumbers",
                    "[DEBUG] Aligning summaries without strict detected lot mode",
                    Map.of(
                            "detectedLotNumbers", detectedLotNumbers == null ? List.of() : detectedLotNumbers,
                            "summaryLotNumbers", summaries.stream()
                                    .filter(Objects::nonNull)
                                    .map(LotTechnicalSummary::lotNumber)
                                    .collect(Collectors.toList())
                    )
            );
            return summaries.stream()
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparingInt(LotTechnicalSummary::lotNumber))
                    .collect(Collectors.toList());
        }

        Map<Integer, LotTechnicalSummary> summariesByLotNumber = new LinkedHashMap<>();
        for (LotTechnicalSummary summary : summaries) {
            if (summary == null || summary.lotNumber() <= 0) {
                continue;
            }
            if (strictDetectedLotMode && !detectedLotNumberSet.contains(summary.lotNumber())) {
                continue;
            }
            summariesByLotNumber.putIfAbsent(summary.lotNumber(), summary);
        }

        for (LotTechnicalSummary pendingSummary : buildPendingDetectedLotSummaries(detectedLotNumbers)) {
            summariesByLotNumber.putIfAbsent(pendingSummary.lotNumber(), pendingSummary);
        }

        reportDebugEvent(
                "D",
                "LotTopologyService.java:alignWithDetectedLotNumbers:strict",
                "[DEBUG] Aligning summaries with strict detected lot mode",
                Map.of(
                        "detectedLotNumbers", detectedLotNumbers == null ? List.of() : detectedLotNumbers,
                        "summaryLotNumbers", summaries.stream()
                                .filter(Objects::nonNull)
                                .map(LotTechnicalSummary::lotNumber)
                                .collect(Collectors.toList()),
                        "alignedLotNumbers", summariesByLotNumber.values().stream()
                                .map(LotTechnicalSummary::lotNumber)
                                .sorted()
                                .collect(Collectors.toList())
                )
        );

        return summariesByLotNumber.values().stream()
                .sorted(Comparator.comparingInt(LotTechnicalSummary::lotNumber))
                .collect(Collectors.toList());
    }

    private List<LotTechnicalSummary> buildPendingDetectedLotSummaries(List<Integer> detectedLotNumbers) {
        if (detectedLotNumbers == null || detectedLotNumbers.isEmpty()) {
            return List.of();
        }

        return detectedLotNumbers.stream()
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .filter(value -> value > 0)
                .distinct()
                .sorted()
                .mapToObj(this::buildPendingDetectedLotSummary)
                .collect(Collectors.toList());
    }

    private LotTechnicalSummary buildPendingDetectedLotSummary(int lotNumber) {
        return new LotTechnicalSummary(
                lotNumber,
                null,
                null,
                List.of(),
                List.of(),
                Map.of(),
                List.of(),
                false,
                false,
                false,
                List.of(new ValidationIssue(
                        "CONTORNO_ABERTO",
                        "BLOQUEANTE",
                        "CONTORNO_ABERTO: lote detectado por ancora textual, mas sem contorno fechado materializado no resumo"
                ))
        );
    }

    private List<VertexTechnicalPoint> buildVertexSequence(
            List<Map<String, Object>> vertices,
            List<OrderLabelReference> labelsForPolygon,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {
        if (vertices == null || vertices.isEmpty()) {
            return List.of();
        }

        log.info(
                "TRACE MEMORIAL SEQUENCE: iniciando sequencia de vertices; quantidadeVertices={} quantidadeLabels={} georreferenciado={}",
                vertices.size(),
                labelsForPolygon != null ? labelsForPolygon.size() : 0,
                georeferencingTransform != null
        );

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
        Map<Integer, OrderLabelReference> labelByVertexIndex = assignLabelsToNearestVertices(vertices, labelsForPolygon, labelThreshold);
        List<VertexTechnicalPoint> sequence = new ArrayList<>();

        for (int i = 0; i < vertices.size(); i++) {
            Map<String, Object> vertex = vertices.get(i);
            double x = parseDouble(vertex.get("x"));
            double y = parseDouble(vertex.get("y"));
            if (Double.isNaN(x) || Double.isNaN(y)) {
                continue;
            }

            OrderLabelReference nearestLabel = labelByVertexIndex.get(i);

            String resolvedLabel = nearestLabel != null ? nearestLabel.label() : String.format(Locale.US, "V%02d", i + 1);
            int resolvedOrder = nearestLabel != null ? nearestLabel.orderNumber() : Integer.MAX_VALUE;
            double projectedX = projectVertexX(x, y, georeferencingTransform);
            double projectedY = projectVertexY(x, y, georeferencingTransform);
            log.info(
                    "TRACE MEMORIAL SEQUENCE: verticeOriginal={} label={} ordem={} localX={} localY={} saidaX={} saidaY={} modo={}",
                    i,
                    resolvedLabel,
                    resolvedOrder,
                    String.format(Locale.US, "%.3f", x),
                    String.format(Locale.US, "%.3f", y),
                    String.format(Locale.US, "%.3f", projectedX),
                    String.format(Locale.US, "%.3f", projectedY),
                    georeferencingTransform != null ? "GEO" : "LOCAL"
            );

            sequence.add(new VertexTechnicalPoint(
                    i,
                    resolvedLabel,
                    resolvedOrder,
                    projectedX,
                    projectedY
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

        normalizedSequence.forEach(vertex -> log.info(
                "TRACE MEMORIAL SEQUENCE: verticeNormalizado label={} ordem={} x={} y={} modo={}",
                vertex.label(),
                vertex.orderNumber(),
                String.format(Locale.US, "%.3f", vertex.x()),
                String.format(Locale.US, "%.3f", vertex.y()),
                georeferencingTransform != null ? "GEO" : "LOCAL"
        ));

        return normalizedSequence;
    }

    private Map<Integer, OrderLabelReference> assignLabelsToNearestVertices(
            List<Map<String, Object>> vertices,
            List<OrderLabelReference> labelsForPolygon,
            double labelThreshold) {
        if (vertices == null || vertices.isEmpty() || labelsForPolygon == null || labelsForPolygon.isEmpty()) {
            return Map.of();
        }

        record VertexLabelCandidate(int vertexIndex, OrderLabelReference label, double distance) {}

        List<VertexLabelCandidate> candidates = new ArrayList<>();
        for (int vertexIndex = 0; vertexIndex < vertices.size(); vertexIndex++) {
            Map<String, Object> vertex = vertices.get(vertexIndex);
            double x = parseDouble(vertex.get("x"));
            double y = parseDouble(vertex.get("y"));
            if (Double.isNaN(x) || Double.isNaN(y)) {
                continue;
            }

            for (OrderLabelReference label : labelsForPolygon) {
                double currentDistance = distance(x, y, label.x(), label.y());
                if (currentDistance <= labelThreshold) {
                    candidates.add(new VertexLabelCandidate(vertexIndex, label, currentDistance));
                }
            }
        }

        candidates.sort(Comparator
                .comparingDouble(VertexLabelCandidate::distance)
                .thenComparingInt(candidate -> candidate.label().orderNumber())
                .thenComparingInt(VertexLabelCandidate::vertexIndex));

        Map<Integer, OrderLabelReference> labelByVertexIndex = new LinkedHashMap<>();
        Set<Integer> usedOrders = new LinkedHashSet<>();
        Set<Integer> usedVertices = new LinkedHashSet<>();

        for (VertexLabelCandidate candidate : candidates) {
            if (usedVertices.contains(candidate.vertexIndex()) || usedOrders.contains(candidate.label().orderNumber())) {
                continue;
            }
            labelByVertexIndex.put(candidate.vertexIndex(), candidate.label());
            usedVertices.add(candidate.vertexIndex());
            usedOrders.add(candidate.label().orderNumber());
            log.info(
                    "TRACE MEMORIAL SEQUENCE: label {} associada ao vertice {} por menor distancia {}",
                    candidate.label().label(),
                    candidate.vertexIndex(),
                    String.format(Locale.US, "%.3f", candidate.distance())
            );
        }

        return labelByVertexIndex;
    }

    private List<TechnicalSideSummary> buildTechnicalSideSummaries(
            List<VertexTechnicalPoint> vertexSequence,
            Map<String, List<String>> confrontations,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        List<PolygonEdge> edges = buildPolygonEdges(vertexSequence);
        Map<String, FrontageReference> manualFrontages = manualFrontageAnalysisService.buildManualFrontageByDirection(edges, selectedConfrontationTexts);
        boolean strictManualSegmentMode = manualFrontageAnalysisService.hasManualSegmentSelections(selectedConfrontationTexts);
        List<TechnicalSideSummary> sideSummaries = new ArrayList<>();

        for (int i = 0; i < vertexSequence.size(); i++) {
            VertexTechnicalPoint start = vertexSequence.get(i);
            VertexTechnicalPoint end = vertexSequence.get((i + 1) % vertexSequence.size());
            PolygonEdge edge = edges.get(i);
            FrontageReference frontage = resolveFrontageReference(
                    edge.side(),
                    manualFrontages,
                    confrontations,
                    strictManualSegmentMode
            );
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

    private FrontageReference resolveFrontageReference(
            String direction,
            Map<String, FrontageReference> manualFrontages,
            Map<String, List<String>> confrontations,
            boolean strictManualSegmentMode) {
        if (direction != null && manualFrontages != null && manualFrontages.containsKey(direction)) {
            FrontageReference manualReference = manualFrontages.get(direction);
            String sanitizedManualReference = sanitizeConfrontationReference(
                    manualReference != null ? manualReference.reference() : null
            );
            if (sanitizedManualReference != null) {
                return new FrontageReference(
                        sanitizedManualReference,
                        manualReference.source(),
                        manualReference.confidenceScore(),
                        manualReference.reason()
                );
            }
        }

        if (strictManualSegmentMode) {
            return new FrontageReference(
                    "divisa interna do loteamento",
                    "manual_sem_toque",
                    0,
                    "ha trecho manual selecionado no frontend, mas sem evidencia geometrica confiavel para este lado"
            );
        }

        String drawingReference = resolveDrawingBoundaryReference(confrontations, direction);
        if (!"nao identificado no DXF".equalsIgnoreCase(drawingReference)) {
            return new FrontageReference(
                    drawingReference,
                    "dxf_texto",
                    1,
                    "confrontacao extraida do texto do desenho"
            );
        }

        return new FrontageReference(
                "divisa interna do loteamento",
                "inferida",
                0,
                "sem evidencia textual de via publica neste lado"
        );
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
            String sanitized = sanitizeConfrontationReference(candidate);
            if (sanitized != null && !sanitized.isBlank()) {
                return sanitized;
            }
        }

        return "nao identificado no DXF";
    }

    private String sanitizeConfrontationReference(String reference) {
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

        normalized = normalized
                .replaceAll("(?i)^confronta(?:ndo)?\\s+com\\s+", "")
                .replaceAll("(?i)^limita(?:ndo)?\\s+com\\s+", "")
                .replaceAll("(?i)^divisa\\s+com\\s+", "")
                .replaceAll("(?i)^com\\s+", "")
                .replaceAll("\\s+", " ")
                .trim();

        if (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1).trim();
        }

        return normalized.isBlank() ? null : normalized;
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

    private String formatNumericPreview(Object value) {
        if (value instanceof Number number) {
            return String.format(Locale.US, "%.2f", number.doubleValue());
        }
        return String.valueOf(value);
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

    private double distance(double x1, double y1, double x2, double y2) {
        return Math.hypot(x2 - x1, y2 - y1);
    }
}
