package com.momorialPro.CadMemorial.dto.memorialbase;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemorialBaseQualityDTO {

    private boolean hasGeoreferencing;
    private boolean hasRealCoordinates;
    private boolean hasCalculatedAreas;
    private boolean hasConfrontationTexts;
    private boolean hasDeterministicSegments;

    private List<String> warnings;
    private List<String> blockers;
}
