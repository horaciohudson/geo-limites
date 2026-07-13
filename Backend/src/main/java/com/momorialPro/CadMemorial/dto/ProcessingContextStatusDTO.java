package com.momorialPro.CadMemorial.dto;

import java.util.List;

public record ProcessingContextStatusDTO(
        String status,
        boolean hasBaseArea,
        boolean hasOriginalProperty,
        boolean hasRemainingArea,
        int baseAreaPointCount,
        int originalPropertyPointCount,
        int remainingAreaPointCount,
        String headline,
        String detail,
        List<ProcessingContextNoticeDTO> notices
) {
    public record ProcessingContextNoticeDTO(
            String id,
            String title,
            String message
    ) {}
}
