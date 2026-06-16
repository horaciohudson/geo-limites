package com.momorialPro.CadMemorial.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tab_property_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyDocument {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "document_id")
    private UUID documentId;
    
    // IDENTIFICATION
    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType; // DEED, REGISTRATION, PLAN, PHOTO, etc.
    
    @Column(name = "file_name", nullable = false)
    private String fileName;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    // FILE
    @Column(name = "file_path", length = 500)
    private String filePath;
    
    @Column(name = "file_size")
    private Long fileSize;
    
    @Column(name = "mime_type")
    private String mimeType;
    
    // RELATIONSHIPS
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;
    
    // AUDIT
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}