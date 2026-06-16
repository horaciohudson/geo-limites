package com.momorialPro.CadMemorial.mapper;

import com.momorialPro.CadMemorial.dto.PropertyBoundaryDTO;
import com.momorialPro.CadMemorial.model.PropertyBoundary;
import org.springframework.stereotype.Component;

@Component
public class PropertyBoundaryMapper {

    public PropertyBoundaryDTO toDTO(PropertyBoundary boundary) {
        if (boundary == null) {
            return null;
        }

        return PropertyBoundaryDTO.builder()
                .boundaryId(boundary.getBoundaryId())
                .propertyId(boundary.getProperty() != null ? boundary.getProperty().getPropertyId() : null)
                .direction(boundary.getDirection())
                .extension(boundary.getExtension())
                .azimuth(boundary.getAzimuth())
                .adjacentType(boundary.getAdjacentType())
                .adjacentName(boundary.getAdjacentName())
                .adjacentDocument(boundary.getAdjacentDocument())
                .fullDescription(boundary.getFullDescription())
                .sequenceOrder(boundary.getSequenceOrder())
                .createdAt(boundary.getCreatedAt())
                .updatedAt(boundary.getUpdatedAt())
                .build();
    }

    public PropertyBoundary toEntity(PropertyBoundaryDTO dto) {
        if (dto == null) {
            return null;
        }

        return PropertyBoundary.builder()
                .boundaryId(dto.getBoundaryId())
                .direction(dto.getDirection())
                .extension(dto.getExtension())
                .azimuth(dto.getAzimuth())
                .adjacentType(dto.getAdjacentType())
                .adjacentName(dto.getAdjacentName())
                .adjacentDocument(dto.getAdjacentDocument())
                .fullDescription(dto.getFullDescription())
                .sequenceOrder(dto.getSequenceOrder())
                .build();
    }

    public void updateEntityFromDTO(PropertyBoundaryDTO dto, PropertyBoundary entity) {
        if (dto == null || entity == null) {
            return;
        }

        entity.setDirection(dto.getDirection());
        entity.setExtension(dto.getExtension());
        entity.setAzimuth(dto.getAzimuth());
        entity.setAdjacentType(dto.getAdjacentType());
        entity.setAdjacentName(dto.getAdjacentName());
        entity.setAdjacentDocument(dto.getAdjacentDocument());
        entity.setFullDescription(dto.getFullDescription());
        entity.setSequenceOrder(dto.getSequenceOrder());
    }
}