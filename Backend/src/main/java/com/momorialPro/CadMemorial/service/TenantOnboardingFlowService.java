package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.enums.TenantOnboardingStatus;
import com.momorialPro.CadMemorial.model.TenantOperationalControl;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.TenantOperationalControlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantOnboardingFlowService {

    private final TenantOperationalControlRepository controlRepository;

    @Transactional
    public TenantOperationalControl handleEmailVerified(User user) {
        UUID tenantId = user.getTenant() != null ? user.getTenant().getId() : null;
        if (tenantId == null) {
            throw new IllegalArgumentException("Usuario nao possui tenant vinculado.");
        }

        TenantOperationalControl control = getOrCreateControl(tenantId);
        OffsetDateTime now = OffsetDateTime.now();

        control.setEmailVerifiedAt(now);
        if (control.getPendingApprovalAt() == null) {
            control.setPendingApprovalAt(now);
        }

        if (control.getOnboardingStatus() != TenantOnboardingStatus.ACTIVE
                && control.getOnboardingStatus() != TenantOnboardingStatus.READY_FOR_RELEASE
                && control.getOnboardingStatus() != TenantOnboardingStatus.PENDING_FIRST_PAYMENT) {
            control.setOnboardingStatus(TenantOnboardingStatus.PENDING_APPROVAL);
        }

        return controlRepository.save(control);
    }

    private TenantOperationalControl getOrCreateControl(UUID tenantId) {
        return controlRepository.findByTenantId(tenantId)
                .orElseGet(() -> {
                    TenantOperationalControl newControl = new TenantOperationalControl();
                    newControl.setTenantId(tenantId);
                    return controlRepository.save(newControl);
                });
    }
}
