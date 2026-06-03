package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.PropertyBoundaryDTO;
import com.momorialPro.CadMemorial.mapper.PropertyBoundaryMapper;
import com.momorialPro.CadMemorial.model.Property;
import com.momorialPro.CadMemorial.model.PropertyBoundary;
import com.momorialPro.CadMemorial.repository.PropertyBoundaryRepository;
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
public class PropertyBoundaryService {
    
    private final PropertyBoundaryRepository boundaryRepository;
    private final PropertyRepository propertyRepository;
    private final PropertyBoundaryMapper boundaryMapper;

    @Transactional(readOnly = true)
    public List<PropertyBoundaryDTO> findByPropertyId(UUID propertyId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        List<PropertyBoundary> boundaries = boundaryRepository.findByPropertyPropertyIdOrderBySequenceOrder(propertyId);

        return boundaries.stream()
                .map(boundaryMapper::toDTO)
                .collect(Collectors.toList());
    }

    public PropertyBoundaryDTO create(PropertyBoundaryDTO boundaryDTO, UUID propertyId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        Property property = propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        PropertyBoundary boundary = boundaryMapper.toEntity(boundaryDTO);
        boundary.setProperty(property);
        
        // Auto-set sequence order if not provided
        if (boundary.getSequenceOrder() == null) {
            long count = boundaryRepository.countByPropertyPropertyId(propertyId);
            boundary.setSequenceOrder((int) count + 1);
        }
        
        PropertyBoundary savedBoundary = boundaryRepository.save(boundary);

        return boundaryMapper.toDTO(savedBoundary);
    }

    public PropertyBoundaryDTO update(UUID boundaryId, PropertyBoundaryDTO boundaryDTO, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        PropertyBoundary existingBoundary = boundaryRepository.findById(boundaryId)
                .orElseThrow(() -> new RuntimeException("Boundary not found"));

        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(
                existingBoundary.getProperty().getPropertyId(), tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        boundaryMapper.updateEntityFromDTO(boundaryDTO, existingBoundary);
        
        PropertyBoundary updatedBoundary = boundaryRepository.save(existingBoundary);

        return boundaryMapper.toDTO(updatedBoundary);
    }

    public void delete(UUID boundaryId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        PropertyBoundary boundary = boundaryRepository.findById(boundaryId)
                .orElseThrow(() -> new RuntimeException("Boundary not found"));

        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(
                boundary.getProperty().getPropertyId(), tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        boundaryRepository.delete(boundary);
    }

    public void deleteByPropertyId(UUID propertyId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        boundaryRepository.deleteByPropertyPropertyId(propertyId);
    }

    @Transactional(readOnly = true)
    public long countByPropertyId(UUID propertyId) {
        return boundaryRepository.countByPropertyPropertyId(propertyId);
    }
}
