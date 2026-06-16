package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.PropertyLandmarkDTO;
import com.momorialPro.CadMemorial.security.AuthUtils;
import com.momorialPro.CadMemorial.service.PropertyLandmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/properties/{propertyId}/landmarks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PropertyLandmarkController {
    
    private final PropertyLandmarkService landmarkService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<PropertyLandmarkDTO>> listLandmarks(@PathVariable UUID propertyId) {
        UUID userId = AuthUtils.getCurrentUserId();
        List<PropertyLandmarkDTO> landmarks = landmarkService.findByPropertyId(propertyId, userId);

        return ResponseEntity.ok(landmarks);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<PropertyLandmarkDTO> createLandmark(
            @PathVariable UUID propertyId,
            @RequestBody PropertyLandmarkDTO landmarkDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        PropertyLandmarkDTO newLandmark = landmarkService.create(landmarkDTO, propertyId, userId);

        return ResponseEntity.status(HttpStatus.CREATED).body(newLandmark);
    }

    @PutMapping("/{landmarkId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<PropertyLandmarkDTO> updateLandmark(
            @PathVariable UUID propertyId,
            @PathVariable UUID landmarkId,
            @RequestBody PropertyLandmarkDTO landmarkDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        PropertyLandmarkDTO updatedLandmark = landmarkService.update(landmarkId, landmarkDTO, userId);

        return ResponseEntity.ok(updatedLandmark);
    }

    @DeleteMapping("/{landmarkId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteLandmark(
            @PathVariable UUID propertyId,
            @PathVariable UUID landmarkId) {
        UUID userId = AuthUtils.getCurrentUserId();
        landmarkService.delete(landmarkId, userId);

        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteAllLandmarks(@PathVariable UUID propertyId) {
        UUID userId = AuthUtils.getCurrentUserId();
        landmarkService.deleteByPropertyId(propertyId, userId);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/count")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Long> countLandmarks(@PathVariable UUID propertyId) {
        long count = landmarkService.countByPropertyId(propertyId);
        return ResponseEntity.ok(count);
    }
}
