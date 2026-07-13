package com.momorialPro.CadMemorial.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.UUID;

public record CorrectiveSnapshotSaveRequestDTO(
        UUID propertyId,
        UUID fileId,
        UUID standardId,
        String fileName,
        String projectName,
        Integer estimatedLotCount,
        Boolean georeferenced,
        String coordinateSource,
        String technicalSummaryJson,
        JsonNode processingContextStatus,
        JsonNode correctiveSnapshot,
        JsonNode metadata
) {}
