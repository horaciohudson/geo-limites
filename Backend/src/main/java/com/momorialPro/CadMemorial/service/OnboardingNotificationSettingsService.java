package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.OnboardingNotificationSettingsDTO;
import com.momorialPro.CadMemorial.dto.UpdateOnboardingNotificationSettingsRequest;
import com.momorialPro.CadMemorial.model.OnboardingNotificationSettings;
import com.momorialPro.CadMemorial.repository.OnboardingNotificationSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OnboardingNotificationSettingsService {

    private static final Short SINGLETON_ID = 1;

    private final OnboardingNotificationSettingsRepository repository;

    @Transactional(readOnly = true)
    public OnboardingNotificationSettingsDTO getSettings() {
        return toDTO(getOrCreateEntity());
    }

    @Transactional
    public OnboardingNotificationSettingsDTO updateSettings(UpdateOnboardingNotificationSettingsRequest request) {
        OnboardingNotificationSettings entity = getOrCreateEntity();

        if (request.getResponsibleName() != null) {
            entity.setResponsibleName(normalizeText(request.getResponsibleName()));
        }
        if (request.getResponsibleEmail() != null) {
            entity.setResponsibleEmail(normalizeEmail(request.getResponsibleEmail()));
        }
        if (request.getAlternateEmail() != null) {
            entity.setAlternateEmail(normalizeEmail(request.getAlternateEmail()));
        }
        if (request.getPhone() != null) {
            entity.setPhone(normalizeText(request.getPhone()));
        }
        if (request.getWhatsapp() != null) {
            entity.setWhatsapp(normalizeText(request.getWhatsapp()));
        }
        if (request.getManualApprovalEnabled() != null) {
            entity.setManualApprovalEnabled(request.getManualApprovalEnabled());
        }
        if (request.getNotifyOnSignupCreated() != null) {
            entity.setNotifyOnSignupCreated(request.getNotifyOnSignupCreated());
        }
        if (request.getNotifyOnEmailVerified() != null) {
            entity.setNotifyOnEmailVerified(request.getNotifyOnEmailVerified());
        }
        if (request.getNotifyOnPendingApproval() != null) {
            entity.setNotifyOnPendingApproval(request.getNotifyOnPendingApproval());
        }
        if (request.getActive() != null) {
            entity.setActive(request.getActive());
        }

        repository.save(entity);
        return toDTO(entity);
    }

    @Transactional(readOnly = true)
    public OnboardingNotificationSettings getOrCreateEntity() {
        return repository.findById(SINGLETON_ID)
                .orElseGet(() -> repository.save(OnboardingNotificationSettings.builder().id(SINGLETON_ID).build()));
    }

    private OnboardingNotificationSettingsDTO toDTO(OnboardingNotificationSettings entity) {
        return OnboardingNotificationSettingsDTO.builder()
                .responsibleName(entity.getResponsibleName())
                .responsibleEmail(entity.getResponsibleEmail())
                .alternateEmail(entity.getAlternateEmail())
                .phone(entity.getPhone())
                .whatsapp(entity.getWhatsapp())
                .manualApprovalEnabled(Boolean.TRUE.equals(entity.getManualApprovalEnabled()))
                .notifyOnSignupCreated(Boolean.TRUE.equals(entity.getNotifyOnSignupCreated()))
                .notifyOnEmailVerified(Boolean.TRUE.equals(entity.getNotifyOnEmailVerified()))
                .notifyOnPendingApproval(Boolean.TRUE.equals(entity.getNotifyOnPendingApproval()))
                .active(Boolean.TRUE.equals(entity.getActive()))
                .build();
    }

    private String normalizeText(String value) {
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeEmail(String value) {
        String normalized = normalizeText(value);
        return normalized == null ? null : normalized.toLowerCase();
    }
}
