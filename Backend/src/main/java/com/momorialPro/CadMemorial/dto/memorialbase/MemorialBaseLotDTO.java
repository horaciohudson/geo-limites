package com.momorialPro.CadMemorial.dto.memorialbase;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemorialBaseLotDTO {

    private String lotId;
    private String lotLabel;
    private Integer lotNumber;

    private Double areaM2;
    private Double perimeterM;

    private String frontageReference;
    private String confidenceLevel;

    private List<MemorialBaseVertexDTO> vertices;
    private List<MemorialBaseSegmentDTO> segments;
    private Map<String, List<String>> boundaryReferences;
    private List<String> technicalNotes;
}
