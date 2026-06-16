package com.momorialPro.CadMemorial.mapper;

import com.momorialPro.CadMemorial.dto.PropertyLandmarkDTO;
import com.momorialPro.CadMemorial.model.PropertyLandmark;
import org.springframework.stereotype.Component;

@Component
public class PropertyLandmarkMapper {

    public PropertyLandmarkDTO toDTO(PropertyLandmark landmark) {
        if (landmark == null) {
            return null;
        }

        return PropertyLandmarkDTO.builder()
                .landmarkId(landmark.getLandmarkId())
                .propertyId(landmark.getProperty() != null ? landmark.getProperty().getPropertyId() : null)
                .landmarkName(landmark.getLandmarkName())
                .landmarkType(landmark.getLandmarkType())
                .coordinateX(landmark.getCoordinateX())
                .coordinateY(landmark.getCoordinateY())
                .coordinateZ(landmark.getCoordinateZ())
                .entranceAzimuth(landmark.getEntranceAzimuth())
                .exitAzimuth(landmark.getExitAzimuth())
                .previousDistance(landmark.getPreviousDistance())
                .description(landmark.getDescription())
                .landmarkMaterial(landmark.getLandmarkMaterial())
                .sequenceOrder(landmark.getSequenceOrder())
                .createdAt(landmark.getCreatedAt())
                .updatedAt(landmark.getUpdatedAt())
                .build();
    }

    public PropertyLandmark toEntity(PropertyLandmarkDTO dto) {
        if (dto == null) {
            return null;
        }

        return PropertyLandmark.builder()
                .landmarkId(dto.getLandmarkId())
                .landmarkName(dto.getLandmarkName())
                .landmarkType(dto.getLandmarkType())
                .coordinateX(dto.getCoordinateX())
                .coordinateY(dto.getCoordinateY())
                .coordinateZ(dto.getCoordinateZ())
                .entranceAzimuth(dto.getEntranceAzimuth())
                .exitAzimuth(dto.getExitAzimuth())
                .previousDistance(dto.getPreviousDistance())
                .description(dto.getDescription())
                .landmarkMaterial(dto.getLandmarkMaterial())
                .sequenceOrder(dto.getSequenceOrder())
                .build();
    }

    public void updateEntityFromDTO(PropertyLandmarkDTO dto, PropertyLandmark entity) {
        if (dto == null || entity == null) {
            return;
        }

        entity.setLandmarkName(dto.getLandmarkName());
        entity.setLandmarkType(dto.getLandmarkType());
        entity.setCoordinateX(dto.getCoordinateX());
        entity.setCoordinateY(dto.getCoordinateY());
        entity.setCoordinateZ(dto.getCoordinateZ());
        entity.setEntranceAzimuth(dto.getEntranceAzimuth());
        entity.setExitAzimuth(dto.getExitAzimuth());
        entity.setPreviousDistance(dto.getPreviousDistance());
        entity.setDescription(dto.getDescription());
        entity.setLandmarkMaterial(dto.getLandmarkMaterial());
        entity.setSequenceOrder(dto.getSequenceOrder());
    }
}