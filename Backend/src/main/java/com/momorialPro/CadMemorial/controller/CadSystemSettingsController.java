package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.CadSystemSettingsDTO;
import com.momorialPro.CadMemorial.dto.UpdateCadSystemSettingsRequest;
import com.momorialPro.CadMemorial.service.CadSystemSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cad/settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CadSystemSettingsController {

    private final CadSystemSettingsService cadSystemSettingsService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TENANT_ADMIN', 'USER')")
    public ResponseEntity<CadSystemSettingsDTO> getCadSystemSettings() {
        return ResponseEntity.ok(cadSystemSettingsService.getSettings());
    }

    @PatchMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CadSystemSettingsDTO> updateCadSystemSettings(
            @Valid @RequestBody UpdateCadSystemSettingsRequest request) {
        return ResponseEntity.ok(cadSystemSettingsService.updateSettings(request));
    }
}
