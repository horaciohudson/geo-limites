package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.SmtpOperationResultDTO;
import com.momorialPro.CadMemorial.dto.SmtpSettingsDTO;
import com.momorialPro.CadMemorial.dto.SmtpTestEmailRequest;
import com.momorialPro.CadMemorial.dto.TenantSettingsDTO;
import com.momorialPro.CadMemorial.dto.TestCreditTopupRequest;
import com.momorialPro.CadMemorial.dto.TestCreditTopupResponseDTO;
import com.momorialPro.CadMemorial.dto.UpdateSmtpSettingsRequest;
import com.momorialPro.CadMemorial.dto.UpdateTenantSettingsRequest;
import com.momorialPro.CadMemorial.dto.ApiSettingsDTO;
import com.momorialPro.CadMemorial.security.AuthUtils;
import com.momorialPro.CadMemorial.dto.CreditPricingSettingsDTO;
import com.momorialPro.CadMemorial.dto.OnboardingNotificationSettingsDTO;
import com.momorialPro.CadMemorial.dto.UpdateApiSettingsRequest;
import com.momorialPro.CadMemorial.dto.UpdateCreditPricingSettingsRequest;
import com.momorialPro.CadMemorial.dto.UpdateOnboardingNotificationSettingsRequest;
import com.momorialPro.CadMemorial.service.ApiSettingsService;
import com.momorialPro.CadMemorial.service.CreditService;
import com.momorialPro.CadMemorial.service.CreditPricingSettingsService;
import com.momorialPro.CadMemorial.service.OnboardingNotificationSettingsService;
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
    private final ApiSettingsService apiSettingsService;
    private final CreditService creditService;
    private final CreditPricingSettingsService creditPricingSettingsService;
    private final OnboardingNotificationSettingsService onboardingNotificationSettingsService;

    @GetMapping("/api")
    public ResponseEntity<ApiSettingsDTO> getApiSettings() {
        return ResponseEntity.ok(apiSettingsService.getSettings());
    }

    @PatchMapping("/api")
    public ResponseEntity<ApiSettingsDTO> updateApiSettings(@Valid @RequestBody UpdateApiSettingsRequest request) {
        return ResponseEntity.ok(apiSettingsService.updateSettings(request));
    }

    @GetMapping("/credits")
    public ResponseEntity<CreditPricingSettingsDTO> getCreditPricingSettings() {
        return ResponseEntity.ok(creditPricingSettingsService.getSettings());
    }

    @PatchMapping("/credits")
    public ResponseEntity<CreditPricingSettingsDTO> updateCreditPricingSettings(@Valid @RequestBody UpdateCreditPricingSettingsRequest request) {
        return ResponseEntity.ok(creditPricingSettingsService.updateSettings(request));
    }

    @PostMapping("/credits/test-topup")
    public ResponseEntity<TestCreditTopupResponseDTO> addTestCredits(@Valid @RequestBody TestCreditTopupRequest request) {
        var tenantId = AuthUtils.getRequiredCurrentTenantId();
        creditService.addCredits(tenantId, request.getCredits(), "Recarga manual de teste para a empresa");

        int currentBalance = creditService.getCurrentBalance(tenantId);
        return ResponseEntity.ok(TestCreditTopupResponseDTO.builder()
                .message("Creditos de teste adicionados com sucesso.")
                .creditsAdded(request.getCredits())
                .currentBalance(currentBalance)
                .build());
    }

    @GetMapping("/onboarding")
    public ResponseEntity<OnboardingNotificationSettingsDTO> getOnboardingNotificationSettings() {
        return ResponseEntity.ok(onboardingNotificationSettingsService.getSettings());
    }

    @PatchMapping("/onboarding")
    public ResponseEntity<OnboardingNotificationSettingsDTO> updateOnboardingNotificationSettings(@Valid @RequestBody UpdateOnboardingNotificationSettingsRequest request) {
        return ResponseEntity.ok(onboardingNotificationSettingsService.updateSettings(request));
    }

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
