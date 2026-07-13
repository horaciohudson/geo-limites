package com.momorialPro.CadMemorial.dto.memorialbase;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemorialBaseVertexDTO {

    private String vertexId;
    private Integer sequence;

    private Double x;
    private Double y;

    private Double easting;
    private Double northing;

    private String coordinateSource;
}
