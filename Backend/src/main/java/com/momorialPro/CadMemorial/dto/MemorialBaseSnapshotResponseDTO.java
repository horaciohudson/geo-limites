package com.momorialPro.CadMemorial.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.UUID;

public record MemorialBaseSnapshotResponseDTO(
        UUID snapshotId,
        UUID propertyId,
        UUID fileId,
        UUID memorialStandardId,
        String projectName,
        String fileName,
        String pipelineVersion,
        Integer estimatedLotCount,
        Boolean georeferenced,
        String coordinateSource,
        String generationStatus,
        LocalDateTime generatedAt,
        JsonNode memorialBase
) {}
