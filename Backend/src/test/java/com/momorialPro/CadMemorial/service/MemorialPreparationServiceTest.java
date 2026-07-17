package com.momorialPro.CadMemorial.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.dto.PropertyLandmarkDTO;
import com.momorialPro.CadMemorial.dto.SelectedReferencePointDTO;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class MemorialPreparationServiceTest {

    private final MemorialPreparationService memorialPreparationService = new MemorialPreparationService(
            mock(DxfGeoReferenciaExtractorService.class),
            mock(MemorialBaseBuilderService.class),
            mock(MemorialBaseSnapshotService.class),
            new ObjectMapper()
    );

    @Test
    void shouldExtractBoundaryContextsWithoutMixingThemIntoCommonLandmarks() {
        PropertyDTO property = PropertyDTO.builder()
                .landmarks(List.of(
                        PropertyLandmarkDTO.builder()
                                .landmarkName("P01")
                                .coordinateX(BigDecimal.ONE)
                                .coordinateY(BigDecimal.TEN)
                                .sequenceOrder(1)
                                .build()
                ))
                .build();

        List<SelectedReferencePointDTO> selectedReferencePoints = List.of(
                new SelectedReferencePointDTO("AREA_TOTAL_P02", 20.0, 0.0, 20.0, 0.0),
                new SelectedReferencePointDTO("AREA_TOTAL_P01", 0.0, 0.0, 0.0, 0.0),
                new SelectedReferencePointDTO("AREA_REMANESCENTE_P02", 18.0, 8.0, 18.0, 8.0),
                new SelectedReferencePointDTO("AREA_REMANESCENTE_P01", 2.0, 8.0, 2.0, 8.0),
                new SelectedReferencePointDTO("P03", 30.0, 5.0, 300000.0, 9500000.0)
        );

        PropertyDTO mergedProperty = memorialPreparationService.mergeSelectedReferencePointsIntoProperty(
                property,
                selectedReferencePoints
        );
        MemorialProcessingContext processingContext =
                memorialPreparationService.extractProcessingContext(selectedReferencePoints);

        assertEquals(2, mergedProperty.getLandmarks().size());
        assertTrue(mergedProperty.getLandmarks().stream().anyMatch(landmark -> "P01".equals(landmark.getLandmarkName())));
        assertTrue(mergedProperty.getLandmarks().stream().anyMatch(landmark -> "P03".equals(landmark.getLandmarkName())));
        assertTrue(mergedProperty.getLandmarks().stream().noneMatch(landmark -> landmark.getLandmarkName().startsWith("AREA_TOTAL")));
        assertTrue(mergedProperty.getLandmarks().stream().noneMatch(landmark -> landmark.getLandmarkName().startsWith("AREA_REMANESCENTE")));

        assertTrue(processingContext.hasBaseArea());
        assertEquals("AREA_TOTAL", processingContext.baseArea().label());
        assertEquals(2, processingContext.baseArea().vertices().size());
        assertEquals("AREA_TOTAL_P01", processingContext.baseArea().vertices().get(0).label());
        assertEquals(0.0, processingContext.baseArea().vertices().get(0).x());
        assertEquals("AREA_TOTAL_P02", processingContext.baseArea().vertices().get(1).label());
        assertTrue(processingContext.hasRemainingArea());
        assertEquals("AREA_REMANESCENTE", processingContext.effectiveRemainingArea().resolvedLabel());
        assertEquals(2, processingContext.effectiveRemainingArea().vertices().size());
        assertEquals("AREA_REMANESCENTE_P01", processingContext.effectiveRemainingArea().vertices().get(0).label());
    }
}
