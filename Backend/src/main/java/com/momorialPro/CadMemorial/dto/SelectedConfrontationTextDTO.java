package com.momorialPro.CadMemorial.dto;

public record SelectedConfrontationTextDTO(
        String text,
        Double x,
        Double y,
        String layer,
        String entityType,
        String inferredDirection,
        String selectionMode,
        Double segmentStartX,
        Double segmentStartY,
        Double segmentEndX,
        Double segmentEndY
) {}
