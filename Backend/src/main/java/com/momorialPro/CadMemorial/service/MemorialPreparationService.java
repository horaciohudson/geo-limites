package com.momorialPro.CadMemorial.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.DxfEntityChangeDTO;
import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.dto.PropertyLandmarkDTO;
import com.momorialPro.CadMemorial.dto.SelectedReferencePointDTO;
import com.momorialPro.CadMemorial.dto.memorialbase.MemorialBaseDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemorialPreparationService {
    private static final Pattern ORDER_LABEL_PATTERN = Pattern.compile(
            "(?i)^\\s*(?:P|PT|PONTO|V|ESTACA|E)\\s*[-_:/#]*\\s*0*(\\d{1,4})\\s*$"
    );
    private static final Pattern BASE_AREA_REFERENCE_LABEL_PATTERN = Pattern.compile(
            "(?i)^\\s*AREA\\s*[_\\- ]*TOTAL\\s*[_\\- ]*P\\s*0*(\\d{1,4})\\s*$"
    );
    private static final Pattern REMAINING_AREA_REFERENCE_LABEL_PATTERN = Pattern.compile(
            "(?i)^\\s*AREA\\s*[_\\- ]*REMANESCENTE\\s*[_\\- ]*P\\s*0*(\\d{1,4})\\s*$"
    );

    private final DxfGeoReferenciaExtractorService geoExtractorService;
    private final MemorialBaseBuilderService memorialBaseBuilderService;
    private final MemorialBaseSnapshotService memorialBaseSnapshotService;
    private final ObjectMapper objectMapper;

    public PropertyDTO mergeSelectedReferencePointsIntoProperty(
            PropertyDTO property,
            List<SelectedReferencePointDTO> selectedReferencePoints) {
        if (selectedReferencePoints == null || selectedReferencePoints.isEmpty()) {
            return property;
        }

        List<SelectedReferencePointDTO> validSelectedPoints = selectedReferencePoints.stream()
                .filter(Objects::nonNull)
                .filter(point -> !isReservedBoundaryReferencePoint(point.label()))
                .filter(point -> point.label() != null && !point.label().isBlank())
                .filter(point -> point.georeferencedX() != null && point.georeferencedY() != null)
                .collect(Collectors.toList());

        if (validSelectedPoints.isEmpty()) {
            return property;
        }

        PropertyDTO targetProperty = property != null ? property : new PropertyDTO();
        Map<String, PropertyLandmarkDTO> landmarksByLabel = new LinkedHashMap<>();

        if (targetProperty.getLandmarks() != null) {
            for (PropertyLandmarkDTO landmark : targetProperty.getLandmarks()) {
                if (landmark == null || landmark.getLandmarkName() == null || landmark.getLandmarkName().isBlank()) {
                    continue;
                }
                landmarksByLabel.put(canonicalizeSelectedReferenceLabel(landmark.getLandmarkName()), landmark);
            }
        }

        int nextSequenceOrder = landmarksByLabel.values().stream()
                .map(PropertyLandmarkDTO::getSequenceOrder)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(0);

        for (SelectedReferencePointDTO selectedPoint : validSelectedPoints) {
            String canonicalLabel = canonicalizeSelectedReferenceLabel(selectedPoint.label());
            PropertyLandmarkDTO existing = landmarksByLabel.get(canonicalLabel);
            if (existing != null) {
                existing.setCoordinateX(BigDecimal.valueOf(selectedPoint.georeferencedX()));
                existing.setCoordinateY(BigDecimal.valueOf(selectedPoint.georeferencedY()));
                if (existing.getSequenceOrder() == null) {
                    existing.setSequenceOrder(++nextSequenceOrder);
                }
                continue;
            }

            PropertyLandmarkDTO manualLandmark = PropertyLandmarkDTO.builder()
                    .propertyId(targetProperty.getPropertyId())
                    .landmarkName(selectedPoint.label().trim())
                    .landmarkType("PONTO_REFERENCIA")
                    .coordinateX(BigDecimal.valueOf(selectedPoint.georeferencedX()))
                    .coordinateY(BigDecimal.valueOf(selectedPoint.georeferencedY()))
                    .description("Confirmado manualmente no visualizador do memorial")
                    .sequenceOrder(++nextSequenceOrder)
                    .build();
            landmarksByLabel.put(canonicalLabel, manualLandmark);
        }

        targetProperty.setLandmarks(new ArrayList<>(landmarksByLabel.values()));
        return targetProperty;
    }

    public MemorialProcessingContext extractProcessingContext(List<SelectedReferencePointDTO> selectedReferencePoints) {
        if (selectedReferencePoints == null || selectedReferencePoints.isEmpty()) {
            return new MemorialProcessingContext(null);
        }

        List<MemorialProcessingContext.BaseAreaPoint> baseAreaPoints = selectedReferencePoints.stream()
                .filter(Objects::nonNull)
                .map(point -> toBoundaryPoint(point, BASE_AREA_REFERENCE_LABEL_PATTERN))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingInt(MemorialProcessingContext.BaseAreaPoint::orderNumber))
                .toList();
        List<MemorialProcessingContext.BaseAreaPoint> remainingAreaPoints = selectedReferencePoints.stream()
                .filter(Objects::nonNull)
                .map(point -> toBoundaryPoint(point, REMAINING_AREA_REFERENCE_LABEL_PATTERN))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingInt(MemorialProcessingContext.BaseAreaPoint::orderNumber))
                .toList();

        if (baseAreaPoints.isEmpty() && remainingAreaPoints.isEmpty()) {
            return new MemorialProcessingContext(null);
        }

        return new MemorialProcessingContext(
                baseAreaPoints.isEmpty()
                        ? null
                        : new MemorialProcessingContext.BaseAreaContext("AREA_TOTAL", baseAreaPoints),
                null,
                remainingAreaPoints.isEmpty()
                        ? null
                        : new MemorialProcessingContext.RemainingAreaContext(
                                "AREA_REMANESCENTE",
                                "PROCESSING_CONTEXT",
                                "AREA_REMANESCENTE",
                                remainingAreaPoints
                        )
        );
    }

    public List<SimplePoint> extractPointsFromEntities(DxfCompareResultDTO compareResult) {
        List<SimplePoint> points = new ArrayList<>();
        int pointId = 1;

        if (compareResult.getAdded() != null) {
            for (DxfEntityChangeDTO entity : compareResult.getAdded()) {
                if (entity.getX() != null && entity.getY() != null && isValidCoordinate(entity.getX(), entity.getY())) {
                    points.add(new SimplePoint(entity.getX(), entity.getY(), "P" + pointId++));
                }

                if (entity.getX2() != null && entity.getY2() != null && isValidCoordinate(entity.getX2(), entity.getY2())) {
                    points.add(new SimplePoint(entity.getX2(), entity.getY2(), "P" + pointId++));
                }

                if (entity.getVertices() != null) {
                    for (Object vertexObj : entity.getVertices()) {
                        if (!(vertexObj instanceof Map<?, ?> vertex)) {
                            continue;
                        }
                        Object xObj = vertex.get("x");
                        Object yObj = vertex.get("y");
                        if (xObj instanceof Number xNumber && yObj instanceof Number yNumber) {
                            double x = xNumber.doubleValue();
                            double y = yNumber.doubleValue();
                            if (isValidCoordinate(x, y)) {
                                points.add(new SimplePoint(x, y, "V" + pointId++));
                            }
                        }
                    }
                }
            }
        }

        if (compareResult.getModified() != null) {
            for (DxfEntityChangeDTO entity : compareResult.getModified()) {
                if (entity.getX() != null && entity.getY() != null && isValidCoordinate(entity.getX(), entity.getY())) {
                    points.add(new SimplePoint(entity.getX(), entity.getY(), "M" + pointId++));
                }
            }
        }

        if (compareResult.getRemoved() != null) {
            for (DxfEntityChangeDTO entity : compareResult.getRemoved()) {
                if (entity.getX() != null && entity.getY() != null && isValidCoordinate(entity.getX(), entity.getY())) {
                    points.add(new SimplePoint(entity.getX(), entity.getY(), "R" + pointId++));
                }
            }
        }

        return points;
    }

    public List<SimplePoint> applyGeoreferencingTransform(
            List<SimplePoint> points,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform transform) {
        if (points == null || points.isEmpty() || transform == null) {
            return points;
        }

        List<SimplePoint> transformed = new ArrayList<>(points.size());
        for (SimplePoint point : points) {
            double[] projected = geoExtractorService.transform(point.x(), point.y(), transform);
            transformed.add(new SimplePoint(projected[0], projected[1], point.id()));
        }
        return transformed;
    }

    public Map<String, CoordinateExtractionService.RealCoordinate> buildRealCoordinatesFromTransform(
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

    public List<SimplePoint> filterAndReducePoints(List<SimplePoint> allPoints) {
        if (allPoints == null || allPoints.isEmpty()) {
            return new ArrayList<>();
        }

        List<SimplePoint> filteredPoints = new ArrayList<>();
        Set<String> processedCoordinates = new HashSet<>();
        double tolerance = 5.0;

        for (SimplePoint point : allPoints) {
            int roundedX = (int) Math.round(point.x() / tolerance);
            int roundedY = (int) Math.round(point.y() / tolerance);
            String coordKey = roundedX + "," + roundedY;

            if (!processedCoordinates.contains(coordKey)) {
                processedCoordinates.add(coordKey);
                filteredPoints.add(point);
            }
        }

        List<SimplePoint> sirgasPoints = filteredPoints.stream()
                .filter(p -> isSirgasCoordinate(p.x(), p.y()))
                .collect(Collectors.toList());

        List<SimplePoint> finalPoints = new ArrayList<>();
        if (!sirgasPoints.isEmpty()) {
            finalPoints.addAll(sirgasPoints.stream().limit(20).collect(Collectors.toList()));
        }

        if (finalPoints.size() < 25) {
            int needed = Math.min(10, 25 - finalPoints.size());
            final List<SimplePoint> currentFinalPoints = finalPoints;
            List<SimplePoint> additionalPoints = filteredPoints.stream()
                    .filter(p -> !currentFinalPoints.contains(p))
                    .limit(needed)
                    .collect(Collectors.toList());
            finalPoints.addAll(additionalPoints);
        }

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

    public DxfGeoReferenciaExtractorService.CoordenadaGeo tentarCoordenadaManual(PropertyDTO property) {
        if (property == null) {
            return null;
        }

        if (property.getSirgas_e() != null && property.getSirgas_n() != null) {
            double coordE = property.getSirgas_e().doubleValue();
            double coordN = property.getSirgas_n().doubleValue();

            if (coordE >= 160000 && coordE <= 850000 && coordN >= 750000 && coordN <= 10500000) {
                String fonte = property.getSirgas_source() != null
                        ? property.getSirgas_source()
                        : "PROPERTY_MANUAL";
                return new DxfGeoReferenciaExtractorService.CoordenadaGeo(coordE, coordN, fonte);
            }
        }

        if (property.getObservations() != null) {
            DxfGeoReferenciaExtractorService.CoordenadaGeo coordFromObs =
                    parseCoordenadaFromObservations(property.getObservations());
            if (coordFromObs != null) {
                return coordFromObs;
            }
        }
        return null;
    }

    public String buildMemorialBaseJson(
            DxfCompareResultDTO compareResult,
            PropertyDTO property,
            UUID tenantId,
            UUID userId,
            UUID propertyId,
            UUID standardId,
            Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
            List<String> streetNames,
            Map<String, List<String>> confrontations,
            Map<String, Double> individualAreas,
            int estimatedLotCount,
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform,
            DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase) {
        try {
            MemorialBaseDTO memorialBase = memorialBaseBuilderService.build(
                    MemorialBaseBuilderService.BuildInput.builder()
                            .propertyId(propertyId)
                            .projectName(property != null ? property.getName() : null)
                            .fileName(compareResult != null ? compareResult.getNewFileName() : null)
                            .pipelineVersion("memorial-base-v1")
                            .estimatedLotCount(estimatedLotCount)
                            .georeferenced(georeferencingTransform != null || coordenadaBase != null)
                            .coordinateSource(resolveMemorialBaseCoordinateSource(georeferencingTransform, coordenadaBase, realCoordinates))
                            .compareResult(compareResult)
                            .property(property)
                            .realCoordinates(realCoordinates)
                            .streetNames(streetNames)
                            .confrontations(confrontations)
                            .individualAreas(individualAreas)
                            .georeferencingTransform(georeferencingTransform)
                            .build()
            );
            String memorialBaseJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(memorialBase);
            persistMemorialBaseSnapshot(tenantId, userId, propertyId, standardId, memorialBase, memorialBaseJson);
            return memorialBaseJson;
        } catch (JsonProcessingException e) {
            log.warn("Nao foi possivel serializar o memorial_base_json: {}", e.getMessage());
            return "";
        } catch (Exception e) {
            log.warn("Nao foi possivel montar o memorial_base_json: {}", e.getMessage());
            return "";
        }
    }

    private String canonicalizeSelectedReferenceLabel(String rawLabel) {
        if (rawLabel == null) {
            return "";
        }

        String normalized = rawLabel.trim().toUpperCase(Locale.ROOT)
                .replaceAll("[-_:/#]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        Matcher matcher = ORDER_LABEL_PATTERN.matcher(normalized);
        if (!matcher.matches()) {
            return normalized;
        }

        int number = Integer.parseInt(matcher.group(1));
        String prefix = normalized.replaceAll("\\d+", "").trim();
        if (prefix.isBlank() || "P".equals(prefix) || "PT".equals(prefix) || "PONTO".equals(prefix) || "V".equals(prefix)) {
            return "POINT:" + String.format(Locale.US, "%02d", number);
        }
        if ("ESTACA".equals(prefix) || "E".equals(prefix)) {
            return "ESTACA:" + String.format(Locale.US, "%02d", number);
        }
        return prefix + ":" + String.format(Locale.US, "%02d", number);
    }

    private boolean isReservedBoundaryReferencePoint(String label) {
        return extractBoundaryPointOrder(label, BASE_AREA_REFERENCE_LABEL_PATTERN) != null
                || extractBoundaryPointOrder(label, REMAINING_AREA_REFERENCE_LABEL_PATTERN) != null;
    }

    private MemorialProcessingContext.BaseAreaPoint toBoundaryPoint(
            SelectedReferencePointDTO selectedPoint,
            Pattern pattern) {
        Integer order = extractBoundaryPointOrder(selectedPoint.label(), pattern);
        if (order == null) {
            return null;
        }

        Double x = selectedPoint.x();
        Double y = selectedPoint.y();
        if (x == null || y == null) {
            return null;
        }

        return new MemorialProcessingContext.BaseAreaPoint(
                order,
                selectedPoint.label().trim(),
                x,
                y
        );
    }

    private Integer extractBoundaryPointOrder(String label, Pattern pattern) {
        if (label == null || label.isBlank()) {
            return null;
        }

        Matcher matcher = pattern.matcher(label.trim());
        if (!matcher.matches()) {
            return null;
        }

        return Integer.parseInt(matcher.group(1));
    }

    private boolean isValidCoordinate(double x, double y) {
        return (x >= 10.0 && y >= 10.0) || (x > 100000 && y > 1000000);
    }

    private boolean isSirgasCoordinate(double x, double y) {
        return x >= 200000 && x <= 800000 && y >= 9000000 && y <= 10000000;
    }

    private DxfGeoReferenciaExtractorService.CoordenadaGeo parseCoordenadaFromObservations(String observations) {
        if (observations == null || observations.trim().isEmpty()) {
            return null;
        }

        try {
            Pattern patternE = Pattern.compile(
                    "(?:SIRGAS|UTM|E)[:\\s=]*([0-9]{6,7})[,.]?([0-9]{0,2})",
                    Pattern.CASE_INSENSITIVE
            );
            Pattern patternN = Pattern.compile(
                    "(?:SIRGAS|UTM|N)[:\\s=]*([0-9]{7,8})[,.]?([0-9]{0,2})",
                    Pattern.CASE_INSENSITIVE
            );

            Matcher matcherE = patternE.matcher(observations);
            Matcher matcherN = patternN.matcher(observations);

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

            if (coordE != null && coordN != null
                    && coordE >= 160000 && coordE <= 850000
                    && coordN >= 750000 && coordN <= 10500000) {
                return new DxfGeoReferenciaExtractorService.CoordenadaGeo(coordE, coordN, "OBSERVATIONS_PARSED");
            }
        } catch (Exception ignored) {
            return null;
        }

        return null;
    }

    private void persistMemorialBaseSnapshot(
            UUID tenantId,
            UUID userId,
            UUID propertyId,
            UUID standardId,
            MemorialBaseDTO memorialBase,
            String memorialBaseJson) {
        try {
            memorialBaseSnapshotService.saveSnapshot(
                    MemorialBaseSnapshotService.SaveRequest.builder()
                            .tenantId(tenantId)
                            .userId(userId)
                            .propertyId(propertyId)
                            .memorialStandardId(standardId)
                            .projectName(memorialBase != null ? memorialBase.getProjectName() : null)
                            .fileName(memorialBase != null ? memorialBase.getFileName() : null)
                            .pipelineVersion(memorialBase != null ? memorialBase.getPipelineVersion() : "memorial-base-v1")
                            .estimatedLotCount(memorialBase != null ? memorialBase.getEstimatedLotCount() : null)
                            .georeferenced(memorialBase != null && memorialBase.isGeoreferenced())
                            .coordinateSource(memorialBase != null ? memorialBase.getCoordinateSource() : null)
                            .generationStatus("GENERATED")
                            .generatedAt(java.time.LocalDateTime.now())
                            .memorialBaseJson(memorialBaseJson)
                            .build()
            );
        } catch (Exception e) {
            log.warn("Falha ao persistir snapshot tecnico do memorial_base_json: {}", e.getMessage());
        }
    }

    private String resolveMemorialBaseCoordinateSource(
            DxfGeoReferenciaExtractorService.GeoreferencingTransform georeferencingTransform,
            DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase,
            Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates) {
        if (georeferencingTransform != null && georeferencingTransform.source() != null && !georeferencingTransform.source().isBlank()) {
            return georeferencingTransform.source();
        }
        if (coordenadaBase != null && coordenadaBase.getFonte() != null && !coordenadaBase.getFonte().isBlank()) {
            return coordenadaBase.getFonte();
        }
        if (realCoordinates != null && !realCoordinates.isEmpty()) {
            return realCoordinates.values().stream()
                    .filter(Objects::nonNull)
                    .map(CoordinateExtractionService.RealCoordinate::getSource)
                    .filter(Objects::nonNull)
                    .filter(source -> !source.isBlank())
                    .findFirst()
                    .orElse("DXF");
        }
        return "NAO_INFORMADO";
    }
}
