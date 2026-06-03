package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.PropertyDocumentDTO;
import com.momorialPro.CadMemorial.mapper.PropertyDocumentMapper;
import com.momorialPro.CadMemorial.model.Property;
import com.momorialPro.CadMemorial.model.PropertyDocument;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.PropertyDocumentRepository;
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
public class PropertyDocumentService {
    
    private final PropertyDocumentRepository documentRepository;
    private final PropertyRepository propertyRepository;
    private final PropertyDocumentMapper documentMapper;

    @Transactional(readOnly = true)
    public List<PropertyDocumentDTO> findByPropertyId(UUID propertyId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        List<PropertyDocument> documents = documentRepository.findByPropertyPropertyIdOrderByCreatedAtDesc(propertyId);

        return documents.stream()
                .map(documentMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PropertyDocumentDTO> findByPropertyIdAndType(UUID propertyId, String documentType, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        List<PropertyDocument> documents = documentRepository.findByPropertyPropertyIdAndDocumentTypeOrderByCreatedAtDesc(propertyId, documentType);

        return documents.stream()
                .map(documentMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PropertyDocumentDTO findById(UUID documentId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        PropertyDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(
                document.getProperty().getPropertyId(), tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));

        return documentMapper.toDTO(document);
    }

    public PropertyDocumentDTO create(PropertyDocumentDTO documentDTO, UUID propertyId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        Property property = propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        PropertyDocument document = documentMapper.toEntity(documentDTO);
        document.setProperty(property);
        
        // Set uploader
        User uploader = new User();
        uploader.setId(userId);
        document.setUploadedBy(uploader);
        
        PropertyDocument savedDocument = documentRepository.save(document);

        return documentMapper.toDTO(savedDocument);
    }

    public PropertyDocumentDTO update(UUID documentId, PropertyDocumentDTO documentDTO, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        PropertyDocument existingDocument = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(
                existingDocument.getProperty().getPropertyId(), tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        documentMapper.updateEntityFromDTO(documentDTO, existingDocument);
        
        PropertyDocument updatedDocument = documentRepository.save(existingDocument);

        return documentMapper.toDTO(updatedDocument);
    }

    public void delete(UUID documentId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        PropertyDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(
                document.getProperty().getPropertyId(), tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        documentRepository.delete(document);
    }

    public void deleteByPropertyId(UUID propertyId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        documentRepository.deleteByPropertyPropertyId(propertyId);
    }

    @Transactional(readOnly = true)
    public long countByPropertyId(UUID propertyId) {
        return documentRepository.countByPropertyPropertyId(propertyId);
    }

    @Transactional(readOnly = true)
    public long getTotalFileSize(UUID propertyId, UUID userId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> new RuntimeException("Property not found"));
        
        List<PropertyDocument> documents = documentRepository.findByPropertyPropertyIdOrderByCreatedAtDesc(propertyId);
        
        long totalSize = documents.stream()
                .mapToLong(doc -> doc.getFileSize() != null ? doc.getFileSize() : 0L)
                .sum();

        return totalSize;
    }
}
