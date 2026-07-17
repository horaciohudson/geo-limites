package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.util.DxfParser;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LotTopologyServiceTest {

    private final DxfTextExtractorService dxfTextExtractorService = mock(DxfTextExtractorService.class);
    private final LotTopologyService service = new LotTopologyService(dxfTextExtractorService, null, null);

    LotTopologyServiceTest() {
        when(dxfTextExtractorService.calculateIndividualAreas(anyList()))
                .thenReturn(Map.of("area", 100.0));
        when(dxfTextExtractorService.calculateDistances(anyList()))
                .thenReturn(Map.of("perimeter", 40.0));
    }

    @Test
    void shouldIgnoreDuplicatePolygonsWithReversedVertexOrder() {
        List<Map<String, Object>> entities = List.of(
                polygonEntity("LOTES", List.of(
                        vertex(0.0, 0.0),
                        vertex(10.0, 0.0),
                        vertex(10.0, 5.0),
                        vertex(0.0, 5.0),
                        vertex(0.0, 0.0)
                )),
                polygonEntity("__RESUMO_TECNICO_LOTES_DETECTADOS__", List.of(
                        vertex(0.0, 0.0),
                        vertex(0.0, 5.0),
                        vertex(10.0, 5.0),
                        vertex(10.0, 0.0),
                        vertex(0.0, 0.0)
                ))
        );

        assertEquals(1, service.countScopedLots(entities));
    }

    @Test
    void shouldKeepDifferentPolygonsInLotCount() {
        List<Map<String, Object>> entities = List.of(
                polygonEntity("LOTES", List.of(
                        vertex(0.0, 0.0),
                        vertex(10.0, 0.0),
                        vertex(10.0, 5.0),
                        vertex(0.0, 5.0),
                        vertex(0.0, 0.0)
                )),
                polygonEntity("__RESUMO_TECNICO_LOTES_DETECTADOS__", List.of(
                        vertex(20.0, 0.0),
                        vertex(30.0, 0.0),
                        vertex(30.0, 5.0),
                        vertex(20.0, 5.0),
                        vertex(20.0, 0.0)
                ))
        );

        assertEquals(2, service.countScopedLots(entities));
    }

    @Test
    void shouldKeepFixtureLotCountWhenSyntheticDuplicatesAreAdded() {
        Path dxfPath = Path.of("src", "main", "resources", "DXF", "TESTE AGENTE_DBL TERRA NOBRE_2.dxf");
        List<Map<String, Object>> parsedEntities = DxfParser.parse(dxfPath).stream()
                .map(LotTopologyServiceTest::convertEntityToMap)
                .collect(Collectors.toCollection(ArrayList::new));

        int baseCount = service.countScopedLots(parsedEntities);
        assertEquals(4, baseCount, "Sem enriquecimento por faces, o parser bruto do backend materializa apenas as polylines diretas desta fixture.");

        List<Map<String, Object>> duplicatedEntities = new ArrayList<>(parsedEntities);
        parsedEntities.stream()
                .filter(entity -> "LWPOLYLINE".equals(entity.get("type")) || "POLYLINE".equals(entity.get("type")))
                .map(LotTopologyServiceTest::buildSyntheticDuplicate)
                .forEach(duplicatedEntities::add);

        assertEquals(baseCount, service.countScopedLots(duplicatedEntities));
    }

    @Test
    void shouldInsertPendingSummaryForDetectedLotWithoutClosedContour() {
        ManualFrontageAnalysisService manualFrontageAnalysisService = mock(ManualFrontageAnalysisService.class);
        when(manualFrontageAnalysisService.buildManualFrontageByDirection(anyList(), anyList()))
                .thenReturn(Map.of());
        when(manualFrontageAnalysisService.hasManualSegmentSelections(anyList()))
                .thenReturn(false);
        when(manualFrontageAnalysisService.looksLikeStreetReference(anyString()))
                .thenReturn(false);

        LotTopologyService summaryService = new LotTopologyService(
                dxfTextExtractorService,
                manualFrontageAnalysisService,
                null
        );

        List<Map<String, Object>> entities = List.of(
                polygonEntity("LOTES", List.of(
                        vertex(0.0, 0.0),
                        vertex(10.0, 0.0),
                        vertex(10.0, 5.0),
                        vertex(0.0, 5.0),
                        vertex(0.0, 0.0)
                ), 1),
                polygonEntity("LOTES", List.of(
                        vertex(20.0, 0.0),
                        vertex(30.0, 0.0),
                        vertex(30.0, 5.0),
                        vertex(20.0, 5.0),
                        vertex(20.0, 0.0)
                ), 3)
        );

        List<LotTechnicalSummary> summaries = summaryService.selectLotTechnicalSummaries(
                entities,
                Map.of(),
                List.of(1, 2, 3),
                List.of(),
                null,
                1,
                3
        );

        assertEquals(List.of(1, 2, 3), summaries.stream().map(LotTechnicalSummary::lotNumber).collect(Collectors.toList()));
        LotTechnicalSummary pendingSummary = summaries.get(1);
        assertTrue(pendingSummary.vertexSequence().isEmpty());
        assertEquals(1, pendingSummary.supplementalValidationIssues().size());
        assertEquals("CONTORNO_ABERTO", pendingSummary.supplementalValidationIssues().get(0).code());
    }

    private static Map<String, Object> polygonEntity(String layer, List<Map<String, Object>> vertices) {
        return polygonEntity(layer, vertices, null);
    }

    private static Map<String, Object> polygonEntity(String layer, List<Map<String, Object>> vertices, Integer lotNumberHint) {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("vertices", vertices);
        if (lotNumberHint != null) {
            properties.put("technicalSummaryLotNumberHint", lotNumberHint);
        }
        return Map.of(
                "type", "LWPOLYLINE",
                "layer", layer,
                "properties", properties
        );
    }

    private static Map<String, Object> vertex(double x, double y) {
        return Map.of(
                "x", x,
                "y", y
        );
    }

    private static Map<String, Object> convertEntityToMap(DxfParser.Entity entity) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("type", entity.type());
        map.put("layer", entity.layer());
        map.put("fingerprint", entity.fingerprint());

        if (entity.x() != null) {
            map.put("x", entity.x());
        }
        if (entity.y() != null) {
            map.put("y", entity.y());
        }
        if (entity.text() != null) {
            map.put("text", entity.text());
        }

        Map<String, Object> properties = new LinkedHashMap<>();
        if (entity.text() != null) {
            properties.put("text", entity.text());
        }
        if (entity.x() != null) {
            properties.put("x", entity.x());
        }
        if (entity.y() != null) {
            properties.put("y", entity.y());
        }
        if (entity.vertices() != null && !entity.vertices().isEmpty()) {
            List<Map<String, Object>> vertices = entity.vertices().stream()
                    .map(vertex -> {
                        Map<String, Object> vertexMap = new LinkedHashMap<>();
                        vertexMap.put("x", vertex.x());
                        vertexMap.put("y", vertex.y());
                        vertexMap.put("id", vertex.id());
                        return vertexMap;
                    })
                    .collect(Collectors.toList());
            properties.put("vertices", vertices);
        }
        map.put("properties", properties);
        return map;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> buildSyntheticDuplicate(Map<String, Object> entity) {
        Map<String, Object> duplicate = new LinkedHashMap<>(entity);
        duplicate.put("layer", "__RESUMO_TECNICO_LOTES_DETECTADOS__");

        Map<String, Object> originalProperties = (Map<String, Object>) entity.get("properties");
        Map<String, Object> duplicateProperties = new LinkedHashMap<>(originalProperties);
        List<Map<String, Object>> originalVertices = (List<Map<String, Object>>) originalProperties.get("vertices");
        List<Map<String, Object>> reversedVertices = new ArrayList<>(originalVertices);
        java.util.Collections.reverse(reversedVertices);
        duplicateProperties.put("vertices", reversedVertices);
        duplicateProperties.put("syntheticTechnicalSummaryLot", true);
        duplicate.put("properties", duplicateProperties);
        return duplicate;
    }
}
