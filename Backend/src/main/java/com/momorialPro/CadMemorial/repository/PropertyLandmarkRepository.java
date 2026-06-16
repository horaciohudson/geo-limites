package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.PropertyLandmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PropertyLandmarkRepository extends JpaRepository<PropertyLandmark, UUID> {
    
    // Find landmarks by property ordered by sequence
    List<PropertyLandmark> findByPropertyPropertyIdOrderBySequenceOrder(UUID propertyId);
    
    // Delete landmarks by property
    void deleteByPropertyPropertyId(UUID propertyId);
    
    // Count landmarks by property
    long countByPropertyPropertyId(UUID propertyId);
}