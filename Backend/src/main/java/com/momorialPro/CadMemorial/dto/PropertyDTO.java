package com.momorialPro.CadMemorial.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyDTO {
    
    private UUID propertyId;
    private String name;
    private String internalCode;
    
    // OWNER
    private String ownerName;
    private String ownerDocument;
    private String ownerIdNumber;
    private String ownerPhone;
    private String ownerEmail;
    
    // LOCATION
    private String street;
    private String number;
    private String complement;
    private String neighborhood;
    private String city;
    private String state;
    private String zipCode;
    
    // CARTOGRAPHIC DATA
    private String coordinateSystem;
    private String datum;
    private String utmZone;
    private String centralMeridian;
    
    // SIRGAS 2000 BASE COORDINATES (for manual input)
    private BigDecimal sirgas_e; // Coordenada Leste (East)
    private BigDecimal sirgas_n; // Coordenada Norte (North)
    private String sirgas_source; // Fonte da coordenada (GPS, Marco, etc.)
    
    // TECHNICAL DATA
    private BigDecimal totalArea;
    private BigDecimal totalPerimeter;
    private BigDecimal mainFrontage;
    private BigDecimal averageDepth;
    
    // LEGAL DATA
    private String registrationNumber;
    private String registryOffice;
    private String registrationBook;
    private String registrationPage;
    private LocalDate registrationDate;
    
    // CLASSIFICATION
    private String propertyType;
    private String zoning;
    private BigDecimal floorAreaRatio;
    private BigDecimal lotCoverage;
    
    // BOUNDARIES
    private String northBoundary;
    private String southBoundary;
    private String eastBoundary;
    private String westBoundary;
    
    // NOTES
    private String observations;
    private String restrictions;
    
    // RELATIONSHIPS
    private List<PropertyLandmarkDTO> landmarks;
    private List<PropertyBoundaryDTO> boundaries;
    private List<PropertyDocumentDTO> documents;
    
    // AUDIT
    private UUID userId;
    private String userName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean active;
}