package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.PropertyLandmarkDTO;
import com.momorialPro.CadMemorial.mapper.PropertyLandmarkMapper;
import com.momorialPro.CadMemorial.model.Property;
import com.momorialPro.CadMemorial.model.PropertyLandmark;
import com.momorialPro.CadMemorial.repository.PropertyLandmarkRepository;
import com.momorialPro.CadMemorial.repository.PropertyRepository;
import com.momorialPro.CadMemorial.security.AuthUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PropertyLandmarkService {
    
    private final PropertyLandmarkRepository landmarkRepository;
    private final PropertyRepository propertyRepository;
    private final PropertyLandmarkMapper landmarkMapper;

    @Transactional(readOnly = true)
    public List<PropertyLandmarkDTO> findByPropertyId(UUID propertyId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        List<PropertyLandmark> landmarks = landmarkRepository.findByPropertyPropertyIdOrderBySequenceOrder(propertyId);

        return landmarks.stream()
                .map(landmarkMapper::toDTO)
                .collect(Collectors.toList());
    }

    public PropertyLandmarkDTO create(PropertyLandmarkDTO landmarkDTO, UUID propertyId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        Property property = propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        PropertyLandmark landmark = landmarkMapper.toEntity(landmarkDTO);
        landmark.setProperty(property);
        
        // Auto-set sequence order if not provided
        if (landmark.getSequenceOrder() == null) {
            long count = landmarkRepository.countByPropertyPropertyId(propertyId);
            landmark.setSequenceOrder((int) count + 1);
        }
        
        PropertyLandmark savedLandmark = landmarkRepository.save(landmark);

        return landmarkMapper.toDTO(savedLandmark);
    }

    public PropertyLandmarkDTO update(UUID landmarkId, PropertyLandmarkDTO landmarkDTO, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        PropertyLandmark existingLandmark = landmarkRepository.findById(landmarkId)
                .orElseThrow(() -> new RuntimeException("Landmark not found"));

        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(
                existingLandmark.getProperty().getPropertyId(), tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        landmarkMapper.updateEntityFromDTO(landmarkDTO, existingLandmark);
        
        PropertyLandmark updatedLandmark = landmarkRepository.save(existingLandmark);

        return landmarkMapper.toDTO(updatedLandmark);
    }

    public void delete(UUID landmarkId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        PropertyLandmark landmark = landmarkRepository.findById(landmarkId)
                .orElseThrow(() -> new RuntimeException("Landmark not found"));

        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(
                landmark.getProperty().getPropertyId(), tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        landmarkRepository.delete(landmark);
    }

    public void deleteByPropertyId(UUID propertyId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        landmarkRepository.deleteByPropertyPropertyId(propertyId);
    }

    @Transactional(readOnly = true)
    public long countByPropertyId(UUID propertyId) {
        return landmarkRepository.countByPropertyPropertyId(propertyId);
    }
}
