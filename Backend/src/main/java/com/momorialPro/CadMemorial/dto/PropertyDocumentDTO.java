package com.momorialPro.CadMemorial.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyDocumentDTO {
    
    private UUID documentId;
    private UUID propertyId;
    
    // IDENTIFICATION
    private String documentType;
    private String fileName;
    private String description;
    
    // FILE
    private String filePath;
    private Long fileSize;
    private String mimeType;
    
    // AUDIT
    private UUID uploadedBy;
    private String uploadedByName;
    private LocalDateTime createdAt;
}