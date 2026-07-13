package com.momorialPro.CadMemorial.dto.memorialbase;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemorialBaseDTO {

    private UUID projectId;
    private UUID propertyId;
    private UUID fileId;

    private String projectName;
    private String fileName;
    private String propertyName;

    private OffsetDateTime generatedAt;
    private String pipelineVersion;

    private Integer estimatedLotCount;
    private boolean georeferenced;
    private String coordinateSource;

    private Double referenceAreaM2;
    private Double totalAreaM2;
    private Double totalPerimeterM;

    private Map<String, String> boundaryReferences;
    private List<String> streetNames;
    private List<MemorialBaseLotDTO> lots;

    private MemorialBaseQualityDTO quality;
}
