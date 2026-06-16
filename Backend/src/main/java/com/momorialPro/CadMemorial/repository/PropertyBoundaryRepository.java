package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.PropertyBoundary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PropertyBoundaryRepository extends JpaRepository<PropertyBoundary, UUID> {
    
    // Find boundaries by property ordered by sequence
    List<PropertyBoundary> findByPropertyPropertyIdOrderBySequenceOrder(UUID propertyId);
    
    // Delete boundaries by property
    void deleteByPropertyPropertyId(UUID propertyId);
    
    // Count boundaries by property
    long countByPropertyPropertyId(UUID propertyId);
}