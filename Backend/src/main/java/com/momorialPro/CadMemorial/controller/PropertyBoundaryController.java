package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.PropertyBoundaryDTO;
import com.momorialPro.CadMemorial.security.AuthUtils;
import com.momorialPro.CadMemorial.service.PropertyBoundaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/properties/{propertyId}/boundaries")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PropertyBoundaryController {
    
    private final PropertyBoundaryService boundaryService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<PropertyBoundaryDTO>> listBoundaries(@PathVariable UUID propertyId) {
        UUID userId = AuthUtils.getCurrentUserId();
        List<PropertyBoundaryDTO> boundaries = boundaryService.findByPropertyId(propertyId, userId);

        return ResponseEntity.ok(boundaries);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<PropertyBoundaryDTO> createBoundary(
            @PathVariable UUID propertyId,
            @RequestBody PropertyBoundaryDTO boundaryDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        PropertyBoundaryDTO newBoundary = boundaryService.create(boundaryDTO, propertyId, userId);

        return ResponseEntity.status(HttpStatus.CREATED).body(newBoundary);
    }

    @PutMapping("/{boundaryId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<PropertyBoundaryDTO> updateBoundary(
            @PathVariable UUID propertyId,
            @PathVariable UUID boundaryId,
            @RequestBody PropertyBoundaryDTO boundaryDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        PropertyBoundaryDTO updatedBoundary = boundaryService.update(boundaryId, boundaryDTO, userId);

        return ResponseEntity.ok(updatedBoundary);
    }

    @DeleteMapping("/{boundaryId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteBoundary(
            @PathVariable UUID propertyId,
            @PathVariable UUID boundaryId) {
        UUID userId = AuthUtils.getCurrentUserId();
        boundaryService.delete(boundaryId, userId);

        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteAllBoundaries(@PathVariable UUID propertyId) {
        UUID userId = AuthUtils.getCurrentUserId();
        boundaryService.deleteByPropertyId(propertyId, userId);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/count")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Long> countBoundaries(@PathVariable UUID propertyId) {
        long count = boundaryService.countByPropertyId(propertyId);
        return ResponseEntity.ok(count);
    }
}
