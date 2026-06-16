package com.momorialPro.CadMemorial.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyLandmarkDTO {
    
    private UUID landmarkId;
    private UUID propertyId;
    
    // LANDMARK IDENTIFICATION
    private String landmarkName;
    private String landmarkType;
    
    // COORDINATES
    private BigDecimal coordinateX;
    private BigDecimal coordinateY;
    private BigDecimal coordinateZ;
    
    // TECHNICAL DATA
    private BigDecimal entranceAzimuth;
    private BigDecimal exitAzimuth;
    private BigDecimal previousDistance;
    
    // DESCRIPTION
    private String description;
    private String landmarkMaterial;
    
    // ORDER
    private Integer sequenceOrder;
    
    // AUDIT
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}