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
public class PropertyBoundaryDTO {
    
    private UUID boundaryId;
    private UUID propertyId;
    
    // DIRECTION
    private String direction;
    
    // MEASUREMENTS
    private BigDecimal extension;
    private BigDecimal azimuth;
    
    // ADJACENT
    private String adjacentType;
    private String adjacentName;
    private String adjacentDocument;
    
    // DESCRIPTION
    private String fullDescription;
    
    // ORDER
    private Integer sequenceOrder;
    
    // AUDIT
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}