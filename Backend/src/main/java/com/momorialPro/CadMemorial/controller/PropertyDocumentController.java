package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.PropertyDocumentDTO;
import com.momorialPro.CadMemorial.security.AuthUtils;
import com.momorialPro.CadMemorial.service.PropertyDocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/properties/{propertyId}/documents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PropertyDocumentController {
    
    private final PropertyDocumentService documentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<PropertyDocumentDTO>> listDocuments(@PathVariable UUID propertyId) {
        UUID userId = AuthUtils.getCurrentUserId();
        List<PropertyDocumentDTO> documents = documentService.findByPropertyId(propertyId, userId);

        return ResponseEntity.ok(documents);
    }

    @GetMapping("/type/{documentType}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<PropertyDocumentDTO>> listDocumentsByType(
            @PathVariable UUID propertyId,
            @PathVariable String documentType) {
        UUID userId = AuthUtils.getCurrentUserId();
        List<PropertyDocumentDTO> documents = documentService.findByPropertyIdAndType(propertyId, documentType, userId);

        return ResponseEntity.ok(documents);
    }

    @GetMapping("/{documentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<PropertyDocumentDTO> getDocument(
            @PathVariable UUID propertyId,
            @PathVariable UUID documentId) {
        UUID userId = AuthUtils.getCurrentUserId();
        PropertyDocumentDTO document = documentService.findById(documentId, userId);

        return ResponseEntity.ok(document);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<PropertyDocumentDTO> createDocument(
            @PathVariable UUID propertyId,
            @RequestBody PropertyDocumentDTO documentDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        PropertyDocumentDTO newDocument = documentService.create(documentDTO, propertyId, userId);

        return ResponseEntity.status(HttpStatus.CREATED).body(newDocument);
    }

    @PutMapping("/{documentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<PropertyDocumentDTO> updateDocument(
            @PathVariable UUID propertyId,
            @PathVariable UUID documentId,
            @RequestBody PropertyDocumentDTO documentDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        PropertyDocumentDTO updatedDocument = documentService.update(documentId, documentDTO, userId);

        return ResponseEntity.ok(updatedDocument);
    }

    @DeleteMapping("/{documentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable UUID propertyId,
            @PathVariable UUID documentId) {
        UUID userId = AuthUtils.getCurrentUserId();
        documentService.delete(documentId, userId);

        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteAllDocuments(@PathVariable UUID propertyId) {
        UUID userId = AuthUtils.getCurrentUserId();
        documentService.deleteByPropertyId(propertyId, userId);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/count")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Long> countDocuments(@PathVariable UUID propertyId) {
        long count = documentService.countByPropertyId(propertyId);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/size")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Long> getTotalFileSize(@PathVariable UUID propertyId) {
        UUID userId = AuthUtils.getCurrentUserId();
        long totalSize = documentService.getTotalFileSize(propertyId, userId);

        return ResponseEntity.ok(totalSize);
    }

    @GetMapping("/types")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<String>> getAvailableDocumentTypes() {
        List<String> documentTypes = List.of(
            "DEED",           // Escritura
            "REGISTRATION",   // Matrícula
            "PLAN",          // Planta
            "PHOTO",         // Foto
            "SURVEY",        // Levantamento
            "CERTIFICATE",   // Certidão
            "CONTRACT",      // Contrato
            "PERMIT",        // Alvará
            "LICENSE",       // Licença
            "REPORT",        // Laudo
            "OTHER"          // Outros
        );
        
        return ResponseEntity.ok(documentTypes);
    }
}
