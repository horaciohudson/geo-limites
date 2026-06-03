package com.momorialPro.CadMemorial.mapper;

import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.model.Property;
import com.momorialPro.CadMemorial.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class PropertyMapper {

    @Autowired
    private PropertyLandmarkMapper landmarkMapper;
    
    @Autowired
    private PropertyBoundaryMapper boundaryMapper;
    
    @Autowired
    private PropertyDocumentMapper documentMapper;

    public PropertyDTO toDTO(Property property) {
        if (property == null) {
            return null;
        }

        return PropertyDTO.builder()
                .propertyId(property.getPropertyId())
                .name(property.getName())
                .internalCode(property.getInternalCode())
                
                // OWNER
                .ownerName(property.getOwnerName())
                .ownerDocument(property.getOwnerDocument())
                .ownerIdNumber(property.getOwnerIdNumber())
                .ownerPhone(property.getOwnerPhone())
                .ownerEmail(property.getOwnerEmail())
                
                // LOCATION
                .street(property.getStreet())
                .number(property.getNumber())
                .complement(property.getComplement())
                .neighborhood(property.getNeighborhood())
                .city(property.getCity())
                .state(property.getState())
                .zipCode(property.getZipCode())
                
                // CARTOGRAPHIC DATA
                .coordinateSystem(property.getCoordinateSystem())
                .datum(property.getDatum())
                .utmZone(property.getUtmZone())
                .centralMeridian(property.getCentralMeridian())
                
                // TECHNICAL DATA
                .totalArea(property.getTotalArea())
                .totalPerimeter(property.getTotalPerimeter())
                .mainFrontage(property.getMainFrontage())
                .averageDepth(property.getAverageDepth())
                
                // LEGAL DATA
                .registrationNumber(property.getRegistrationNumber())
                .registryOffice(property.getRegistryOffice())
                .registrationBook(property.getRegistrationBook())
                .registrationPage(property.getRegistrationPage())
                .registrationDate(property.getRegistrationDate())
                
                // CLASSIFICATION
                .propertyType(property.getPropertyType())
                .zoning(property.getZoning())
                .floorAreaRatio(property.getFloorAreaRatio())
                .lotCoverage(property.getLotCoverage())
                
                // BOUNDARIES
                .northBoundary(property.getNorthBoundary())
                .southBoundary(property.getSouthBoundary())
                .eastBoundary(property.getEastBoundary())
                .westBoundary(property.getWestBoundary())
                
                // NOTES
                .observations(property.getObservations())
                .restrictions(property.getRestrictions())
                
                // RELATIONSHIPS
                .landmarks(property.getLandmarks() != null ? 
                    property.getLandmarks().stream()
                        .map(landmarkMapper::toDTO)
                        .collect(Collectors.toList()) : null)
                .boundaries(property.getBoundaries() != null ? 
                    property.getBoundaries().stream()
                        .map(boundaryMapper::toDTO)
                        .collect(Collectors.toList()) : null)
                .documents(property.getDocuments() != null ? 
                    property.getDocuments().stream()
                        .map(documentMapper::toDTO)
                        .collect(Collectors.toList()) : null)
                
                // AUDIT
                .userId(property.getUser() != null ? property.getUser().getId() : null)
                .userName(property.getUser() != null ? property.getUser().getUsername() : null)
                .createdAt(property.getCreatedAt())
                .updatedAt(property.getUpdatedAt())
                .active(property.getActive())
                .build();
    }

    public Property toEntity(PropertyDTO dto) {
        if (dto == null) {
            return null;
        }

        return Property.builder()
                .propertyId(dto.getPropertyId())
                .name(dto.getName())
                .internalCode(dto.getInternalCode())
                
                // OWNER
                .ownerName(dto.getOwnerName())
                .ownerDocument(dto.getOwnerDocument())
                .ownerIdNumber(dto.getOwnerIdNumber())
                .ownerPhone(dto.getOwnerPhone())
                .ownerEmail(dto.getOwnerEmail())
                
                // LOCATION
                .street(dto.getStreet())
                .number(dto.getNumber())
                .complement(dto.getComplement())
                .neighborhood(dto.getNeighborhood())
                .city(dto.getCity())
                .state(dto.getState())
                .zipCode(dto.getZipCode())
                
                // CARTOGRAPHIC DATA
                .coordinateSystem(dto.getCoordinateSystem())
                .datum(dto.getDatum())
                .utmZone(dto.getUtmZone())
                .centralMeridian(dto.getCentralMeridian())
                
                // TECHNICAL DATA
                .totalArea(dto.getTotalArea())
                .totalPerimeter(dto.getTotalPerimeter())
                .mainFrontage(dto.getMainFrontage())
                .averageDepth(dto.getAverageDepth())
                
                // LEGAL DATA
                .registrationNumber(dto.getRegistrationNumber())
                .registryOffice(dto.getRegistryOffice())
                .registrationBook(dto.getRegistrationBook())
                .registrationPage(dto.getRegistrationPage())
                .registrationDate(dto.getRegistrationDate())
                
                // CLASSIFICATION
                .propertyType(dto.getPropertyType())
                .zoning(dto.getZoning())
                .floorAreaRatio(dto.getFloorAreaRatio())
                .lotCoverage(dto.getLotCoverage())
                
                // BOUNDARIES
                .northBoundary(dto.getNorthBoundary())
                .southBoundary(dto.getSouthBoundary())
                .eastBoundary(dto.getEastBoundary())
                .westBoundary(dto.getWestBoundary())
                
                // NOTES
                .observations(dto.getObservations())
                .restrictions(dto.getRestrictions())
                
                // AUDIT
                .active(dto.getActive() != null ? dto.getActive() : true)
                .build();
    }

    public void updateEntityFromDTO(PropertyDTO dto, Property entity) {
        if (dto == null || entity == null) {
            return;
        }

        entity.setName(dto.getName());
        entity.setInternalCode(dto.getInternalCode());
        
        // OWNER
        entity.setOwnerName(dto.getOwnerName());
        entity.setOwnerDocument(dto.getOwnerDocument());
        entity.setOwnerIdNumber(dto.getOwnerIdNumber());
        entity.setOwnerPhone(dto.getOwnerPhone());
        entity.setOwnerEmail(dto.getOwnerEmail());
        
        // LOCATION
        entity.setStreet(dto.getStreet());
        entity.setNumber(dto.getNumber());
        entity.setComplement(dto.getComplement());
        entity.setNeighborhood(dto.getNeighborhood());
        entity.setCity(dto.getCity());
        entity.setState(dto.getState());
        entity.setZipCode(dto.getZipCode());
        
        // CARTOGRAPHIC DATA
        entity.setCoordinateSystem(dto.getCoordinateSystem());
        entity.setDatum(dto.getDatum());
        entity.setUtmZone(dto.getUtmZone());
        entity.setCentralMeridian(dto.getCentralMeridian());
        
        // TECHNICAL DATA
        entity.setTotalArea(dto.getTotalArea());
        entity.setTotalPerimeter(dto.getTotalPerimeter());
        entity.setMainFrontage(dto.getMainFrontage());
        entity.setAverageDepth(dto.getAverageDepth());
        
        // LEGAL DATA
        entity.setRegistrationNumber(dto.getRegistrationNumber());
        entity.setRegistryOffice(dto.getRegistryOffice());
        entity.setRegistrationBook(dto.getRegistrationBook());
        entity.setRegistrationPage(dto.getRegistrationPage());
        entity.setRegistrationDate(dto.getRegistrationDate());
        
        // CLASSIFICATION
        entity.setPropertyType(dto.getPropertyType());
        entity.setZoning(dto.getZoning());
        entity.setFloorAreaRatio(dto.getFloorAreaRatio());
        entity.setLotCoverage(dto.getLotCoverage());
        
        // BOUNDARIES
        entity.setNorthBoundary(dto.getNorthBoundary());
        entity.setSouthBoundary(dto.getSouthBoundary());
        entity.setEastBoundary(dto.getEastBoundary());
        entity.setWestBoundary(dto.getWestBoundary());
        
        // NOTES
        entity.setObservations(dto.getObservations());
        entity.setRestrictions(dto.getRestrictions());
    }
}