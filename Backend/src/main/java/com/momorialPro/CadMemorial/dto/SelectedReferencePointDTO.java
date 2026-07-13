package com.momorialPro.CadMemorial.dto;

public record SelectedReferencePointDTO(
        String label,
        Double x,
        Double y,
        Double georeferencedX,
        Double georeferencedY
) {}
