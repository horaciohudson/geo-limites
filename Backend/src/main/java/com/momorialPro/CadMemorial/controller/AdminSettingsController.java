package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.SmtpOperationResultDTO;
import com.momorialPro.CadMemorial.dto.SmtpSettingsDTO;
import com.momorialPro.CadMemorial.dto.SmtpTestEmailRequest;
import com.momorialPro.CadMemorial.dto.TenantSettingsDTO;
import com.momorialPro.CadMemorial.dto.UpdateSmtpSettingsRequest;
import com.momorialPro.CadMemorial.dto.UpdateTenantSettingsRequest;
import com.momorialPro.CadMemorial.service.SmtpMailService;
import com.momorialPro.CadMemorial.service.SmtpSettingsService;
import com.momorialPro.CadMemorial.service.TenantSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSettingsController {

    private final SmtpSettingsService smtpSettingsService;
    private final SmtpMailService smtpMailService;
    private final TenantSettingsService tenantSettingsService;

    @GetMapping("/tenant")
    public ResponseEntity<TenantSettingsDTO> getTenantSettings() {
        return ResponseEntity.ok(tenantSettingsService.getCurrentTenantSettings());
    }

    @PatchMapping("/tenant")
    public ResponseEntity<TenantSettingsDTO> updateTenantSettings(@Valid @RequestBody UpdateTenantSettingsRequest request) {
        return ResponseEntity.ok(tenantSettingsService.updateCurrentTenantSettings(request));
    }

    @GetMapping("/smtp")
    public ResponseEntity<SmtpSettingsDTO> getSmtpSettings() {
        return ResponseEntity.ok(smtpSettingsService.getSettings());
    }

    @PatchMapping("/smtp")
    public ResponseEntity<SmtpSettingsDTO> updateSmtpSettings(@Valid @RequestBody UpdateSmtpSettingsRequest request) {
        return ResponseEntity.ok(smtpSettingsService.updateSettings(request));
    }

    @DeleteMapping("/smtp/password")
    public ResponseEntity<SmtpSettingsDTO> clearSmtpPassword() {
        return ResponseEntity.ok(smtpSettingsService.clearPassword());
    }

    @PostMapping("/smtp/test-connection")
    public ResponseEntity<SmtpOperationResultDTO> testSmtpConnection() {
        return ResponseEntity.ok(smtpMailService.testConnection());
    }

    @PostMapping("/smtp/test-email")
    public ResponseEntity<SmtpOperationResultDTO> sendTestSmtpEmail(@Valid @RequestBody SmtpTestEmailRequest request) {
        return ResponseEntity.ok(smtpMailService.sendTestEmail(request.getTo()));
    }
}
