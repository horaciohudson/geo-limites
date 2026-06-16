package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.PropertyDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PropertyDocumentRepository extends JpaRepository<PropertyDocument, UUID> {
    
    // Find documents by property ordered by date
    List<PropertyDocument> findByPropertyPropertyIdOrderByCreatedAtDesc(UUID propertyId);
    
    // Find by document type
    List<PropertyDocument> findByPropertyPropertyIdAndDocumentTypeOrderByCreatedAtDesc(UUID propertyId, String documentType);
    
    // Delete documents by property
    void deleteByPropertyPropertyId(UUID propertyId);
    
    // Count documents by property
    long countByPropertyPropertyId(UUID propertyId);
}