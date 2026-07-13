package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.SelectedConfrontationTextDTO;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class ManualFrontageAnalysisService {

    public List<String> mergeManualStreetNames(
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
                    .filter(selectedText -> !isDirectNoConfrontationSelection(selectedText))
                    .map(SelectedConfrontationTextDTO::text)
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .filter(this::looksLikeStreetReference)
                    .forEach(merged::add);
        }

        return new ArrayList<>(merged);
    }

    public Map<String, List<String>> mergeManualConfrontations(
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
            if (selectedText == null || isDirectNoConfrontationSelection(selectedText)
                    || selectedText.text() == null || selectedText.text().isBlank()) {
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

    public boolean hasManualSegmentSelections(List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        if (selectedConfrontationTexts == null || selectedConfrontationTexts.isEmpty()) {
            return false;
        }

        return selectedConfrontationTexts.stream()
                .filter(Objects::nonNull)
                .filter(selectedText -> !isDirectNoConfrontationSelection(selectedText))
                .anyMatch(selectedText -> "segment".equalsIgnoreCase(selectedText.selectionMode())
                        && selectedText.segmentStartX() != null
                        && selectedText.segmentStartY() != null
                        && selectedText.segmentEndX() != null
                        && selectedText.segmentEndY() != null);
    }

    public boolean isDirectNoConfrontationSelection(SelectedConfrontationTextDTO selectedText) {
        return selectedText != null
                && "segment-direct".equalsIgnoreCase(selectedText.selectionMode());
    }

    public boolean looksLikeStreetReference(String text) {
        if (text == null) {
            return false;
        }

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

    public String normalizeDirection(String direction) {
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

    public String buildManualFrontageAnalysis(
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
        StringBuilder analysis = new StringBuilder();
        for (SelectedConfrontationTextDTO selectedText : selectedConfrontationTexts) {
            if (selectedText == null) {
                continue;
            }

            if (isDirectNoConfrontationSelection(selectedText)) {
                ManualFrontageEvidence evidence = analyzeManualSegmentGeometry(lotEdges, selectedText);
                if (evidence == null) {
                    continue;
                }

                analysis.append("- Trecho manual sem confrontante definido associado preferencialmente ao lado ")
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
                continue;
            }

            if (selectedText.text() == null || selectedText.text().isBlank()) {
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

    public Map<String, FrontageReference> buildManualFrontageByDirection(
            List<PolygonEdge> lotEdges,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        Map<String, FrontageReference> references = new LinkedHashMap<>();
        if (selectedConfrontationTexts == null || selectedConfrontationTexts.isEmpty()) {
            return references;
        }

        for (SelectedConfrontationTextDTO selectedText : selectedConfrontationTexts) {
            if (selectedText == null) {
                continue;
            }

            ManualFrontageEvidence geometryEvidence = analyzeManualSegmentGeometry(lotEdges, selectedText);
            if (isDirectNoConfrontationSelection(selectedText)) {
                if (geometryEvidence == null) {
                    continue;
                }

                String direction = geometryEvidence.inferredSide() != null
                        ? geometryEvidence.inferredSide()
                        : geometryEvidence.sourceDirection();
                if (direction == null) {
                    continue;
                }

                int confidenceScore = geometryEvidence.directTouch() ? 3 : geometryEvidence.cornerContinuation() ? 2 : 1;
                FrontageReference current = references.get(direction);
                if (current != null && current.confidenceScore() >= confidenceScore) {
                    continue;
                }

                String reason = geometryEvidence.directTouch()
                        ? "trecho manual marcado explicitamente sem confrontante definido"
                        : geometryEvidence.cornerContinuation()
                        ? "trecho manual sem confrontante por continuidade geometrica"
                        : "trecho manual sem confrontante associado por direcao";

                references.put(direction, new FrontageReference(
                        "divisa interna do loteamento",
                        "segmento_sem_confrontante",
                        confidenceScore,
                        reason
                ));
                continue;
            }

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

    private ManualFrontageEvidence analyzeManualFrontage(
            List<PolygonEdge> lotEdges,
            SelectedConfrontationTextDTO selectedText) {
        if (selectedText == null || selectedText.text() == null || selectedText.text().isBlank()) {
            return null;
        }

        String streetName = selectedText.text().trim();
        ManualFrontageEvidence geometryEvidence = analyzeManualSegmentGeometry(lotEdges, selectedText);
        if (geometryEvidence == null) {
            return null;
        }

        return new ManualFrontageEvidence(
                streetName,
                geometryEvidence.sourceDirection(),
                geometryEvidence.inferredSide(),
                geometryEvidence.directTouch(),
                geometryEvidence.cornerContinuation()
        );
    }

    private ManualFrontageEvidence analyzeManualSegmentGeometry(
            List<PolygonEdge> lotEdges,
            SelectedConfrontationTextDTO selectedText) {
        if (selectedText == null) {
            return null;
        }

        String sourceDirection = normalizeDirection(selectedText.inferredDirection());

        if (!"segment".equalsIgnoreCase(selectedText.selectionMode())
                && !"segment-direct".equalsIgnoreCase(selectedText.selectionMode())) {
            return new ManualFrontageEvidence(
                    null,
                    sourceDirection,
                    sourceDirection,
                    false,
                    false
            );
        }

        if (selectedText.segmentStartX() == null
                || selectedText.segmentStartY() == null
                || selectedText.segmentEndX() == null
                || selectedText.segmentEndY() == null) {
            return new ManualFrontageEvidence(
                    null,
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
                null,
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
}
