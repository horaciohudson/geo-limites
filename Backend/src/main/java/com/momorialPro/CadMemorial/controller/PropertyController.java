package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.dto.PropertySummaryDTO;
import com.momorialPro.CadMemorial.security.AuthUtils;
import com.momorialPro.CadMemorial.service.PropertyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class PropertyController {
    
    private final PropertyService propertyService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<PropertyDTO>> listProperties() {
        UUID userId = AuthUtils.getCurrentUserId();
        List<PropertyDTO> properties = propertyService.findByUserId(userId);

        return ResponseEntity.ok(properties);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<PropertyDTO> getProperty(@PathVariable UUID id) {
        UUID userId = AuthUtils.getCurrentUserId();
        PropertyDTO property = propertyService.findByIdAndUserId(id, userId);

        return ResponseEntity.ok(property);
    }

    @GetMapping("/{id}/details")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<PropertyDTO> getPropertyWithDetails(@PathVariable UUID id) {
        UUID userId = AuthUtils.getCurrentUserId();
        PropertyDTO property = propertyService.findByIdWithRelationships(id, userId);

        return ResponseEntity.ok(property);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<PropertyDTO> createProperty(@RequestBody PropertyDTO propertyDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        PropertyDTO newProperty = propertyService.create(propertyDTO, userId);

        return ResponseEntity.status(HttpStatus.CREATED).body(newProperty);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<PropertyDTO> updateProperty(
            @PathVariable UUID id, 
            @RequestBody PropertyDTO propertyDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        PropertyDTO updatedProperty = propertyService.update(id, propertyDTO, userId);

        return ResponseEntity.ok(updatedProperty);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteProperty(@PathVariable UUID id) {
        UUID userId = AuthUtils.getCurrentUserId();
        propertyService.delete(id, userId);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<PropertyDTO>> searchProperties(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String ownerName,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state) {
        
        UUID userId = AuthUtils.getCurrentUserId();
        List<PropertyDTO> properties;
        
        if (name != null && !name.trim().isEmpty()) {
            properties = propertyService.searchByName(name, userId);
        } else if (ownerName != null && !ownerName.trim().isEmpty()) {
            properties = propertyService.searchByOwnerName(ownerName, userId);
        } else if (city != null && state != null && !city.trim().isEmpty() && !state.trim().isEmpty()) {
            properties = propertyService.searchByLocation(city, state, userId);
        } else {
            properties = propertyService.findByUserId(userId);
        }
        
        return ResponseEntity.ok(properties);
    }

    @GetMapping("/recent")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<PropertyDTO>> getRecentProperties() {
        UUID userId = AuthUtils.getCurrentUserId();
        List<PropertyDTO> properties = propertyService.findRecentByUser(userId);

        return ResponseEntity.ok(properties);
    }

    @GetMapping("/count")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Long> countProperties() {
        UUID userId = AuthUtils.getCurrentUserId();
        long count = propertyService.countByUserId(userId);
        
        return ResponseEntity.ok(count);
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<PropertySummaryDTO>> getPropertiesSummary() {
        UUID userId = AuthUtils.getCurrentUserId();
        List<PropertySummaryDTO> summaries = propertyService.getPropertiesSummary(userId);

        return ResponseEntity.ok(summaries);
    }
}
