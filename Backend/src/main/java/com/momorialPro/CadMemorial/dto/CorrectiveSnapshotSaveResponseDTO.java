package com.momorialPro.CadMemorial.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record CorrectiveSnapshotSaveResponseDTO(
        UUID snapshotId,
        UUID propertyId,
        UUID fileId,
        String generationStatus,
        String pipelineVersion,
        LocalDateTime generatedAt
) {}
