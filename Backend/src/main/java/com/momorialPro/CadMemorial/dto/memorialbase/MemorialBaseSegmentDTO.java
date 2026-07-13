package com.momorialPro.CadMemorial.dto.memorialbase;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemorialBaseSegmentDTO {

    private Integer sequence;

    private String startVertexId;
    private String endVertexId;

    private Double distanceM;
    private Double azimuthDegrees;
    private String technicalBearing;
    private String cardinalDirection;

    private String confrontationType;
    private String confrontationName;
    private String side;
}
