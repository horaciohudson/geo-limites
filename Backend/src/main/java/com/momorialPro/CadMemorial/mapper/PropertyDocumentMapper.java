package com.momorialPro.CadMemorial.mapper;

import com.momorialPro.CadMemorial.dto.PropertyDocumentDTO;
import com.momorialPro.CadMemorial.model.PropertyDocument;
import org.springframework.stereotype.Component;

@Component
public class PropertyDocumentMapper {

    public PropertyDocumentDTO toDTO(PropertyDocument document) {
        if (document == null) {
            return null;
        }

        return PropertyDocumentDTO.builder()
                .documentId(document.getDocumentId())
                .propertyId(document.getProperty() != null ? document.getProperty().getPropertyId() : null)
                .documentType(document.getDocumentType())
                .fileName(document.getFileName())
                .description(document.getDescription())
                .filePath(document.getFilePath())
                .fileSize(document.getFileSize())
                .mimeType(document.getMimeType())
                .uploadedBy(document.getUploadedBy() != null ? document.getUploadedBy().getId() : null)
                .uploadedByName(document.getUploadedBy() != null ? document.getUploadedBy().getUsername() : null)
                .createdAt(document.getCreatedAt())
                .build();
    }

    public PropertyDocument toEntity(PropertyDocumentDTO dto) {
        if (dto == null) {
            return null;
        }

        return PropertyDocument.builder()
                .documentId(dto.getDocumentId())
                .documentType(dto.getDocumentType())
                .fileName(dto.getFileName())
                .description(dto.getDescription())
                .filePath(dto.getFilePath())
                .fileSize(dto.getFileSize())
                .mimeType(dto.getMimeType())
                .build();
    }

    public void updateEntityFromDTO(PropertyDocumentDTO dto, PropertyDocument entity) {
        if (dto == null || entity == null) {
            return;
        }

        entity.setDocumentType(dto.getDocumentType());
        entity.setFileName(dto.getFileName());
        entity.setDescription(dto.getDescription());
        entity.setFilePath(dto.getFilePath());
        entity.setFileSize(dto.getFileSize());
        entity.setMimeType(dto.getMimeType());
    }
}