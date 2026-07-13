package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.DxfEntityChangeDTO;
import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.dto.memorialbase.MemorialBaseDTO;
import com.momorialPro.CadMemorial.dto.memorialbase.MemorialBaseLotDTO;
import com.momorialPro.CadMemorial.dto.memorialbase.MemorialBaseQualityDTO;
import com.momorialPro.CadMemorial.dto.memorialbase.MemorialBaseSegmentDTO;
import com.momorialPro.CadMemorial.dto.memorialbase.MemorialBaseVertexDTO;
import com.momorialPro.CadMemorial.util.CoordinateUtils;
import com.momorialPro.CadMemorial.util.GeometricCalculator;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class MemorialBaseBuilderService {

    private static final List<String> SIDES = Arrays.asList("NORTE", "SUL", "LESTE", "OESTE");
    private static final double COORDINATE_TOLERANCE = 0.0001d;

    public MemorialBaseDTO build(BuildInput input) {
        if (input == null) {
            throw new IllegalArgumentException("BuildInput e obrigatorio");
        }

        List<DxfEntityChangeDTO> polygonEntities = collectPolygonEntities(input.getCompareResult());
        List<MemorialBaseLotDTO> lots = buildLots(
                polygonEntities,
                safeMap(input.getIndividualAreas()),
                safeMap(input.getConfrontations()),
                safeList(input.getStreetNames()),
                safeMap(input.getRealCoordinates()),
                input.getCoordinateSource(),
                input.getGeoreferencingTransform()
        );

        MemorialBaseQualityDTO quality = buildQuality(input, polygonEntities, lots);
        Map<String, String> boundaryReferences = buildBoundaryReferences(input.getProperty(), input.getConfrontations());

        double totalArea = lots.stream()
                .map(MemorialBaseLotDTO::getAreaM2)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        double totalPerimeter = lots.stream()
                .map(MemorialBaseLotDTO::getPerimeterM)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        return MemorialBaseDTO.builder()
                .projectId(input.getProjectId())
                .propertyId(input.getPropertyId())
                .fileId(input.getFileId())
                .projectName(input.getProjectName())
                .fileName(resolveFileName(input))
                .propertyName(input.getProperty() != null ? input.getProperty().getName() : null)
                .generatedAt(OffsetDateTime.now())
                .pipelineVersion(input.getPipelineVersion() != null ? input.getPipelineVersion() : "memorial-base-v1")
                .estimatedLotCount(input.getEstimatedLotCount())
                .georeferenced(input.isGeoreferenced())
                .coordinateSource(input.getCoordinateSource())
                .referenceAreaM2(resolveReferenceArea(input.getProperty(), input.getIndividualAreas()))
                .totalAreaM2(totalArea > 0 ? totalArea : null)
                .totalPerimeterM(totalPerimeter > 0 ? totalPerimeter : null)
                .boundaryReferences(boundaryReferences)
                .streetNames(safeList(input.getStreetNames()))
                .lots(lots)
                .quality(quality)
                .build();
    }

    private List<MemorialBaseLotDTO> buildLots(
            List<DxfEntityChangeDTO> polygonEntities,
            Map<String, Double> individualAreas,
            Map<String, List<String>> confrontations,
            List<String> streetNames,
            Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
            String coordinateSource,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {

        List<MemorialBaseLotDTO> lots = new ArrayList<>();
        int lotNumber = 1;

        for (DxfEntityChangeDTO entity : polygonEntities) {
            List<GeometricCalculator.Point> polygon = extractPolygon(entity);
            if (polygon.size() < 3) {
                continue;
            }

            String lotLabel = String.format(Locale.ROOT, "LOTE %02d", lotNumber);
            String lotAreaKey = String.format(Locale.ROOT, "LOTE_%02d", lotNumber);
            Double calculatedArea = GeometricCalculator.calculateArea(polygon);
            Double area = individualAreas.getOrDefault(lotAreaKey, calculatedArea);

            List<MemorialBaseVertexDTO> vertices = buildVertices(
                    polygon,
                    realCoordinates,
                    coordinateSource,
                    georeferencingTransform
            );
            List<MemorialBaseSegmentDTO> segments = buildSegments(polygon, confrontations);
            double perimeter = segments.stream()
                    .map(MemorialBaseSegmentDTO::getDistanceM)
                    .filter(Objects::nonNull)
                    .mapToDouble(Double::doubleValue)
                    .sum();

            List<String> technicalNotes = new ArrayList<>();
            if (entity.getLayer() != null && !entity.getLayer().isBlank()) {
                technicalNotes.add("Layer de origem: " + entity.getLayer());
            }
            if (entity.getId() != null && !entity.getId().isBlank()) {
                technicalNotes.add("Entidade de origem: " + entity.getId());
            }
            if (segments.isEmpty()) {
                technicalNotes.add("Nenhum segmento deterministico foi gerado para este lote.");
            }

            lots.add(MemorialBaseLotDTO.builder()
                    .lotId(lotAreaKey)
                    .lotLabel(lotLabel)
                    .lotNumber(lotNumber)
                    .areaM2(area)
                    .perimeterM(perimeter > 0 ? perimeter : null)
                    .frontageReference(resolveFrontageReference(streetNames, confrontations))
                    .confidenceLevel(resolveConfidenceLevel(area, segments, confrontations))
                    .vertices(vertices)
                    .segments(segments)
                    .boundaryReferences(copyBoundaryMap(confrontations))
                    .technicalNotes(technicalNotes)
                    .build());

            lotNumber++;
        }

        return lots;
    }

    private List<MemorialBaseVertexDTO> buildVertices(
            List<GeometricCalculator.Point> polygon,
            Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
            String coordinateSource,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {

        List<MemorialBaseVertexDTO> vertices = new ArrayList<>();
        log.info(
                "TRACE MEMORIAL BASE: montando vertices do lote; quantidadeVertices={} realCoordinatesDisponiveis={} coordinateSource={}",
                polygon != null ? polygon.size() : 0,
                realCoordinates != null ? realCoordinates.size() : 0,
                coordinateSource
        );

        for (int i = 0; i < polygon.size(); i++) {
            GeometricCalculator.Point point = polygon.get(i);
            String vertexId = point.id() != null ? point.id() : String.format(Locale.ROOT, "V%02d", i + 1);
            CoordinateExtractionService.RealCoordinate realCoordinate = resolveRealCoordinate(
                    realCoordinates,
                    vertexId,
                    point.x(),
                    point.y(),
                    coordinateSource,
                    georeferencingTransform
            );
            log.info(
                    "TRACE MEMORIAL BASE: vertexId={} localX={} localY={} easting={} northing={} source={} encontrouRealCoordinate={}",
                    vertexId,
                    String.format(Locale.US, "%.3f", point.x()),
                    String.format(Locale.US, "%.3f", point.y()),
                    realCoordinate != null ? String.format(Locale.US, "%.3f", realCoordinate.getE()) : "null",
                    realCoordinate != null ? String.format(Locale.US, "%.3f", realCoordinate.getN()) : "null",
                    realCoordinate != null ? realCoordinate.getSource() : coordinateSource,
                    realCoordinate != null
            );

            vertices.add(MemorialBaseVertexDTO.builder()
                    .vertexId(vertexId)
                    .sequence(i + 1)
                    .x(point.x())
                    .y(point.y())
                    .easting(realCoordinate != null ? realCoordinate.getE() : null)
                    .northing(realCoordinate != null ? realCoordinate.getN() : null)
                    .coordinateSource(realCoordinate != null ? realCoordinate.getSource() : coordinateSource)
                    .build());
        }

        return vertices;
    }

    private List<MemorialBaseSegmentDTO> buildSegments(
            List<GeometricCalculator.Point> polygon,
            Map<String, List<String>> confrontations) {

        List<MemorialBaseSegmentDTO> segments = new ArrayList<>();
        List<GeometricCalculator.Line> lines = GeometricCalculator.generatePolygonLines(polygon);

        for (int i = 0; i < lines.size(); i++) {
            GeometricCalculator.Line line = lines.get(i);
            String side = normalizeSide(CoordinateUtils.azimuthToCardinalDirection(line.azimuth()));
            String confrontationName = firstOrNull(confrontations.get(side));

            segments.add(MemorialBaseSegmentDTO.builder()
                    .sequence(i + 1)
                    .startVertexId(line.start().id())
                    .endVertexId(line.end().id())
                    .distanceM(line.distance())
                    .azimuthDegrees(line.azimuth())
                    .technicalBearing(CoordinateUtils.azimuthToTechnicalBearing(line.azimuth()))
                    .cardinalDirection(CoordinateUtils.azimuthToCardinalDirection(line.azimuth()))
                    .confrontationType(confrontationName != null ? "DXF_OR_MANUAL_TEXT" : "NAO_IDENTIFICADO")
                    .confrontationName(confrontationName)
                    .side(side)
                    .build());
        }

        return segments;
    }

    private MemorialBaseQualityDTO buildQuality(
            BuildInput input,
            List<DxfEntityChangeDTO> polygonEntities,
            List<MemorialBaseLotDTO> lots) {

        List<String> warnings = new ArrayList<>();
        List<String> blockers = new ArrayList<>();

        if (polygonEntities.isEmpty()) {
            blockers.add("Nenhuma polyline valida com vertices suficientes foi encontrada para montar lotes.");
        }

        if (input.getEstimatedLotCount() != null && input.getEstimatedLotCount() > 0
                && input.getEstimatedLotCount() != lots.size()) {
            warnings.add(String.format(
                    Locale.ROOT,
                    "Quantidade estimada de lotes (%d) difere da quantidade montada na base (%d).",
                    input.getEstimatedLotCount(),
                    lots.size()
            ));
        }

        if (safeMap(input.getConfrontations()).isEmpty()) {
            warnings.add("Nenhuma confrontacao textual foi informada para enriquecer os segmentos.");
        }

        if (safeMap(input.getRealCoordinates()).isEmpty()) {
            warnings.add("Nenhuma coordenada real foi associada aos vertices nesta primeira versao do builder.");
        }

        boolean hasAreas = lots.stream().anyMatch(lot -> lot.getAreaM2() != null && lot.getAreaM2() > 0);
        boolean hasSegments = lots.stream().allMatch(lot -> lot.getSegments() != null && !lot.getSegments().isEmpty());
        boolean hasConfrontationTexts = safeMap(input.getConfrontations()).values().stream().anyMatch(values -> values != null && !values.isEmpty());
        boolean hasRealCoordinates = lots.stream()
                .flatMap(lot -> safeList(lot.getVertices()).stream())
                .anyMatch(vertex -> vertex.getEasting() != null && vertex.getNorthing() != null);

        return MemorialBaseQualityDTO.builder()
                .hasGeoreferencing(input.isGeoreferenced())
                .hasRealCoordinates(hasRealCoordinates)
                .hasCalculatedAreas(hasAreas)
                .hasConfrontationTexts(hasConfrontationTexts)
                .hasDeterministicSegments(hasSegments)
                .warnings(warnings)
                .blockers(blockers)
                .build();
    }

    private List<DxfEntityChangeDTO> collectPolygonEntities(DxfCompareResultDTO compareResult) {
        if (compareResult == null) {
            return Collections.emptyList();
        }

        Map<String, DxfEntityChangeDTO> unique = new LinkedHashMap<>();
        addPolygonEntities(unique, compareResult.getAdded());
        addPolygonEntities(unique, compareResult.getModified());
        addPolygonEntities(unique, compareResult.getDifferences());

        return new ArrayList<>(unique.values());
    }

    private void addPolygonEntities(Map<String, DxfEntityChangeDTO> unique, List<DxfEntityChangeDTO> entities) {
        if (entities == null) {
            return;
        }

        for (DxfEntityChangeDTO entity : entities) {
            if (entity == null || !isPolygonEntity(entity) || entity.getVertices() == null || entity.getVertices().size() < 3) {
                continue;
            }
            String key = buildEntityKey(entity);
            unique.putIfAbsent(key, entity);
        }
    }

    private boolean isPolygonEntity(DxfEntityChangeDTO entity) {
        return entity != null
                && entity.getType() != null
                && ("POLYLINE".equalsIgnoreCase(entity.getType()) || "LWPOLYLINE".equalsIgnoreCase(entity.getType()));
    }

    private String buildEntityKey(DxfEntityChangeDTO entity) {
        if (entity.getId() != null && !entity.getId().isBlank()) {
            return entity.getId();
        }
        return String.format(
                Locale.ROOT,
                "%s|%s|%d",
                entity.getType(),
                entity.getLayer(),
                entity.getVertices() != null ? entity.getVertices().size() : 0
        );
    }

    private List<GeometricCalculator.Point> extractPolygon(DxfEntityChangeDTO entity) {
        List<GeometricCalculator.Point> polygon = new ArrayList<>();
        if (entity == null || entity.getVertices() == null) {
            return polygon;
        }

        int sequence = 1;
        for (Map<String, Double> vertex : entity.getVertices()) {
            if (vertex == null) {
                continue;
            }
            Double x = vertex.get("x");
            Double y = vertex.get("y");
            if (x == null || y == null) {
                continue;
            }
            polygon.add(new GeometricCalculator.Point(x, y, String.format(Locale.ROOT, "V%02d", sequence++)));
        }

        if (polygon.size() > 1 && sameCoordinate(polygon.get(0), polygon.get(polygon.size() - 1))) {
            polygon.remove(polygon.size() - 1);
        }

        return polygon;
    }

    private boolean sameCoordinate(GeometricCalculator.Point a, GeometricCalculator.Point b) {
        return Math.abs(a.x() - b.x()) < COORDINATE_TOLERANCE
                && Math.abs(a.y() - b.y()) < COORDINATE_TOLERANCE;
    }

    private CoordinateExtractionService.RealCoordinate resolveRealCoordinate(
            Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
            String vertexId,
            double x,
            double y,
            String coordinateSource,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {

        if (realCoordinates != null && vertexId != null && realCoordinates.containsKey(vertexId)) {
            log.info("TRACE MEMORIAL BASE: correspondencia direta encontrada em realCoordinates para vertexId={}", vertexId);
            return realCoordinates.get(vertexId);
        }

        if (georeferencingTransform != null) {
            double[] projected = projectCoordinate(x, y, georeferencingTransform);
            log.info(
                    "TRACE MEMORIAL BASE: vertexId={} projetado pela transformacao local->real x={} y={} easting={} northing={} source={}",
                    vertexId,
                    String.format(Locale.US, "%.3f", x),
                    String.format(Locale.US, "%.3f", y),
                    String.format(Locale.US, "%.3f", projected[0]),
                    String.format(Locale.US, "%.3f", projected[1]),
                    georeferencingTransform.source()
            );
            return new CoordinateExtractionService.RealCoordinate(
                    projected[0],
                    projected[1],
                    georeferencingTransform.source() != null ? georeferencingTransform.source() : coordinateSource
            );
        }

        if (looksLikeRealCoordinate(x, y)) {
            log.info(
                    "TRACE MEMORIAL BASE: vertexId={} tratado como coordenada real pelo proprio valor local x={} y={} source={}",
                    vertexId,
                    String.format(Locale.US, "%.3f", x),
                    String.format(Locale.US, "%.3f", y),
                    coordinateSource
            );
            return new CoordinateExtractionService.RealCoordinate(x, y, coordinateSource != null ? coordinateSource : "DXF");
        }

        log.info(
                "TRACE MEMORIAL BASE: nenhuma coordenada real encontrada para vertexId={} x={} y={} chavesDisponiveis={}",
                vertexId,
                String.format(Locale.US, "%.3f", x),
                String.format(Locale.US, "%.3f", y),
                realCoordinates != null ? realCoordinates.keySet() : List.of()
        );

        return null;
    }

    private double[] projectCoordinate(
            double x,
            double y,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform) {
        double rotationRadians = Math.toRadians(georeferencingTransform.rotationDegrees());
        double cos = Math.cos(rotationRadians);
        double sin = Math.sin(rotationRadians);
        double projectedX = georeferencingTransform.scale() * (x * cos - y * sin) + georeferencingTransform.translateX();
        double projectedY = georeferencingTransform.scale() * (x * sin + y * cos) + georeferencingTransform.translateY();
        return new double[]{projectedX, projectedY};
    }

    private boolean looksLikeRealCoordinate(double x, double y) {
        return x >= 100000d && x <= 999999d && y >= 1000000d && y <= 99999999d;
    }

    private String normalizeSide(String direction) {
        if (direction == null || direction.isBlank()) {
            return "NAO_CLASSIFICADO";
        }

        String normalized = direction.trim().toUpperCase(Locale.ROOT);
        if (normalized.contains("NORTE")) return "NORTE";
        if (normalized.contains("SUL")) return "SUL";
        if (normalized.contains("LESTE")) return "LESTE";
        if (normalized.contains("OESTE")) return "OESTE";
        return normalized;
    }

    private String resolveFrontageReference(List<String> streetNames, Map<String, List<String>> confrontations) {
        String byStreet = firstOrNull(streetNames);
        if (byStreet != null) {
            return byStreet;
        }

        String byNorth = firstOrNull(confrontations.get("NORTE"));
        if (byNorth != null) {
            return byNorth;
        }

        return firstOrNull(confrontations.get("SUL"));
    }

    private String resolveConfidenceLevel(
            Double area,
            List<MemorialBaseSegmentDTO> segments,
            Map<String, List<String>> confrontations) {

        boolean hasArea = area != null && area > 0;
        boolean hasSegments = segments != null && !segments.isEmpty();
        boolean hasConfrontation = confrontations.values().stream().anyMatch(values -> values != null && !values.isEmpty());

        if (hasArea && hasSegments && hasConfrontation) {
            return "HIGH";
        }
        if (hasArea && hasSegments) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private Map<String, String> buildBoundaryReferences(PropertyDTO property, Map<String, List<String>> confrontations) {
        Map<String, String> boundaryReferences = new LinkedHashMap<>();

        boundaryReferences.put("NORTE", resolveBoundary(property != null ? property.getNorthBoundary() : null, confrontations, "NORTE"));
        boundaryReferences.put("SUL", resolveBoundary(property != null ? property.getSouthBoundary() : null, confrontations, "SUL"));
        boundaryReferences.put("LESTE", resolveBoundary(property != null ? property.getEastBoundary() : null, confrontations, "LESTE"));
        boundaryReferences.put("OESTE", resolveBoundary(property != null ? property.getWestBoundary() : null, confrontations, "OESTE"));

        return boundaryReferences;
    }

    private String resolveBoundary(String propertyBoundary, Map<String, List<String>> confrontations, String side) {
        if (propertyBoundary != null && !propertyBoundary.isBlank()) {
            return propertyBoundary;
        }
        return firstOrNull(confrontations != null ? confrontations.get(side) : null);
    }

    private Double resolveReferenceArea(PropertyDTO property, Map<String, Double> individualAreas) {
        if (property != null && property.getTotalArea() != null) {
            return property.getTotalArea().doubleValue();
        }
        if (individualAreas != null && !individualAreas.isEmpty()) {
            return individualAreas.values().stream().filter(Objects::nonNull).mapToDouble(Double::doubleValue).sum();
        }
        return null;
    }

    private String resolveFileName(BuildInput input) {
        if (input.getFileName() != null && !input.getFileName().isBlank()) {
            return input.getFileName();
        }
        if (input.getCompareResult() != null) {
            return input.getCompareResult().getNewFileName();
        }
        return null;
    }

    private Map<String, List<String>> copyBoundaryMap(Map<String, List<String>> confrontations) {
        Map<String, List<String>> copy = new LinkedHashMap<>();
        for (String side : SIDES) {
            copy.put(side, safeList(confrontations.get(side)));
        }
        return copy;
    }

    private <T> List<T> safeList(List<T> list) {
        return list == null ? new ArrayList<>() : new ArrayList<>(list);
    }

    private <K, V> Map<K, V> safeMap(Map<K, V> map) {
        return map == null ? new LinkedHashMap<>() : new LinkedHashMap<>(map);
    }

    private String firstOrNull(List<String> values) {
        if (values == null) {
            return null;
        }
        return values.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .findFirst()
                .orElse(null);
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BuildInput {
        private UUID projectId;
        private UUID propertyId;
        private UUID fileId;

        private String projectName;
        private String fileName;
        private String pipelineVersion;
        private Integer estimatedLotCount;

        private boolean georeferenced;
        private String coordinateSource;

        private DxfCompareResultDTO compareResult;
        private PropertyDTO property;

        private Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates;
        private List<String> streetNames;
        private Map<String, List<String>> confrontations;
        private Map<String, Double> individualAreas;
        private DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform;
    }
}
