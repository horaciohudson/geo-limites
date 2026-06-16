package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.admin.TenantOperationalAdminDTO;
import com.momorialPro.CadMemorial.enums.TenantBillingStatus;
import com.momorialPro.CadMemorial.enums.TenantOnboardingStatus;
import com.momorialPro.CadMemorial.model.Tenant;
import com.momorialPro.CadMemorial.model.TenantOperationalControl;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.TenantOperationalControlRepository;
import com.momorialPro.CadMemorial.repository.TenantRepository;
import com.momorialPro.CadMemorial.repository.UserRepository;
import com.momorialPro.CadMemorial.security.AuthUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantAdministrationService {

    private final TenantRepository tenantRepository;
    private final TenantOperationalControlRepository controlRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<TenantOperationalAdminDTO> listOperationalTenants() {
        return tenantRepository.findAll().stream()
                .map(this::toAdminDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TenantOperationalAdminDTO> listOnboardingQueue() {
        return tenantRepository.findAll().stream()
                .map(this::toAdminDto)
                .filter(item -> !"ACTIVE".equals(item.getOnboardingStatus()) || !item.isOperationalAccessReleased())
                .sorted(Comparator
                        .comparing(TenantOperationalAdminDTO::getPendingApprovalAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(TenantOperationalAdminDTO::getEmailVerifiedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional(readOnly = true)
    public TenantOperationalAdminDTO getTenantOperational(UUID tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant não encontrado."));
        return toAdminDto(tenant);
    }

    @Transactional(readOnly = true)
    public TenantOperationalAdminDTO getCurrentTenantOperational() {
        return getTenantOperational(AuthUtils.getRequiredCurrentTenantId());
    }

    @Transactional
    public TenantOperationalAdminDTO setAdminApproved(UUID tenantId, boolean value, String notes, String actor) {
        TenantOperationalControl control = getOrCreateControl(tenantId);
        control.setAdminApproved(value);
        control.setAdminApprovedBy(actor);
        control.setAdminApprovedAt(OffsetDateTime.now());
        if (notes != null) control.setReleaseNotes(notes);
        if (value) {
            control.setRejectionReason(null);
        }
        if (value) {
            control.setOnboardingStatus(Boolean.TRUE.equals(control.getFirstPaymentConfirmed())
                    ? TenantOnboardingStatus.READY_FOR_RELEASE
                    : TenantOnboardingStatus.PENDING_FIRST_PAYMENT);
        } else if (!Boolean.TRUE.equals(control.getOperationalAccessReleased())) {
            control.setOnboardingStatus(TenantOnboardingStatus.PENDING_APPROVAL);
        }
        controlRepository.save(control);
        return getTenantOperational(tenantId);
    }

    @Transactional
    public TenantOperationalAdminDTO setFirstPaymentConfirmed(UUID tenantId, boolean value, String notes, String actor) {
        TenantOperationalControl control = getOrCreateControl(tenantId);
        control.setFirstPaymentConfirmed(value);
        control.setFirstPaymentConfirmedBy(actor);
        control.setFirstPaymentConfirmedAt(OffsetDateTime.now());
        if (notes != null) control.setReleaseNotes(notes);
        
        if (value) {
            control.setBillingStatus(TenantBillingStatus.PAID);
            control.setRejectionReason(null);
            if (Boolean.TRUE.equals(control.getAdminApproved())) {
                control.setOnboardingStatus(TenantOnboardingStatus.READY_FOR_RELEASE);
            }
        } else {
            control.setBillingStatus(TenantBillingStatus.PENDING_FIRST_PAYMENT);
            control.setOnboardingStatus(Boolean.TRUE.equals(control.getAdminApproved())
                    ? TenantOnboardingStatus.PENDING_FIRST_PAYMENT
                    : TenantOnboardingStatus.PENDING_APPROVAL);
        }
        
        controlRepository.save(control);
        return getTenantOperational(tenantId);
    }

    @Transactional
    public TenantOperationalAdminDTO setOperationalAccessReleased(UUID tenantId, boolean value, String notes, String actor) {
        TenantOperationalControl control = getOrCreateControl(tenantId);
        control.setOperationalAccessReleased(value);
        control.setOperationalAccessReleasedBy(actor);
        control.setOperationalAccessReleasedAt(OffsetDateTime.now());
        if (notes != null) control.setReleaseNotes(notes);
        
        if (value) {
            control.setRejectionReason(null);
            control.setOnboardingStatus(TenantOnboardingStatus.ACTIVE);
        } else if (Boolean.TRUE.equals(control.getAdminApproved()) && Boolean.TRUE.equals(control.getFirstPaymentConfirmed())) {
            control.setOnboardingStatus(TenantOnboardingStatus.READY_FOR_RELEASE);
        } else if (Boolean.TRUE.equals(control.getAdminApproved())) {
            control.setOnboardingStatus(TenantOnboardingStatus.PENDING_FIRST_PAYMENT);
        } else {
            control.setOnboardingStatus(TenantOnboardingStatus.PENDING_APPROVAL);
        }
        
        controlRepository.save(control);
        return getTenantOperational(tenantId);
    }

    @Transactional
    public TenantOperationalAdminDTO rejectTenant(UUID tenantId, String notes, String actor) {
        TenantOperationalControl control = getOrCreateControl(tenantId);
        String normalizedNotes = normalizeNotes(notes);
        String rejectionReason = normalizedNotes != null ? normalizedNotes : "Cadastro rejeitado pela equipe administrativa.";

        control.setAdminApproved(false);
        control.setAdminApprovedBy(actor);
        control.setAdminApprovedAt(OffsetDateTime.now());
        control.setFirstPaymentConfirmed(false);
        control.setFirstPaymentConfirmedBy(null);
        control.setFirstPaymentConfirmedAt(null);
        control.setBillingStatus(TenantBillingStatus.PENDING_FIRST_PAYMENT);
        control.setOperationalAccessReleased(false);
        control.setOperationalAccessReleasedBy(null);
        control.setOperationalAccessReleasedAt(null);
        control.setOnboardingStatus(TenantOnboardingStatus.REJECTED);
        control.setReleaseNotes(rejectionReason);
        control.setRejectionReason(rejectionReason);
        control.setCustomerResearchNotes(normalizedNotes != null ? normalizedNotes : control.getCustomerResearchNotes());

        controlRepository.save(control);
        return getTenantOperational(tenantId);
    }

    @Transactional
    public TenantOperationalAdminDTO reactivateRejectedTenant(UUID tenantId, String notes, String actor) {
        TenantOperationalControl control = getOrCreateControl(tenantId);
        String normalizedNotes = normalizeNotes(notes);

        control.setAdminApproved(false);
        control.setFirstPaymentConfirmed(false);
        control.setFirstPaymentConfirmedBy(null);
        control.setFirstPaymentConfirmedAt(null);
        control.setBillingStatus(TenantBillingStatus.PENDING_FIRST_PAYMENT);
        control.setOperationalAccessReleased(false);
        control.setOperationalAccessReleasedBy(null);
        control.setOperationalAccessReleasedAt(null);
        control.setOnboardingStatus(TenantOnboardingStatus.PENDING_APPROVAL);
        control.setPendingApprovalAt(OffsetDateTime.now());
        control.setRejectionReason(null);
        control.setReleaseNotes(normalizedNotes != null
                ? "Cadastro reaberto para analise por " + actor + ": " + normalizedNotes
                : "Cadastro reaberto para analise por " + actor + ".");
        if (normalizedNotes != null) {
            control.setCustomerResearchNotes(normalizedNotes);
        }

        controlRepository.save(control);
        return getTenantOperational(tenantId);
    }

    @Transactional
    public TenantOperationalAdminDTO setCustomerResearchNotes(UUID tenantId, String notes, String actor) {
        TenantOperationalControl control = getOrCreateControl(tenantId);
        control.setCustomerResearchNotes(normalizeNotes(notes));
        if (notes != null) {
            control.setReleaseNotes("Notas de analise atualizadas por " + actor + ".");
        }
        controlRepository.save(control);
        return getTenantOperational(tenantId);
    }

    private TenantOperationalControl getOrCreateControl(UUID tenantId) {
        return controlRepository.findByTenantId(tenantId)
                .orElseGet(() -> {
                    TenantOperationalControl newControl = new TenantOperationalControl();
                    newControl.setTenantId(tenantId);
                    return controlRepository.save(newControl);
                });
    }

    private TenantOperationalAdminDTO toAdminDto(Tenant tenant) {
        TenantOperationalControl control = getOrCreateControl(tenant.getId());
        User primaryUser = getPrimaryUser(tenant.getId());
        
        return TenantOperationalAdminDTO.builder()
                .tenantId(tenant.getId())
                .tenantCode(tenant.getCode())
                .tenantName(tenant.getName())
                .tenantStatus(tenant.getStatus().name())
                .contactName(primaryUser != null ? primaryUser.getFullName() : null)
                .contactEmail(primaryUser != null ? primaryUser.getEmail() : null)
                .contactPhone(primaryUser != null ? resolvePrimaryPhone(primaryUser) : null)
                .onboardingStatus(control.getOnboardingStatus().name())
                .billingStatus(control.getBillingStatus().name())
                .companyDataCompleted(Boolean.TRUE.equals(control.getCompanyDataCompleted()))
                .adminApproved(Boolean.TRUE.equals(control.getAdminApproved()))
                .firstPaymentConfirmed(Boolean.TRUE.equals(control.getFirstPaymentConfirmed()))
                .operationalAccessReleased(Boolean.TRUE.equals(control.getOperationalAccessReleased()))
                .emailVerifiedAt(control.getEmailVerifiedAt())
                .pendingApprovalAt(control.getPendingApprovalAt())
                .adminApprovedBy(control.getAdminApprovedBy())
                .adminApprovedAt(control.getAdminApprovedAt())
                .firstPaymentConfirmedBy(control.getFirstPaymentConfirmedBy())
                .firstPaymentConfirmedAt(control.getFirstPaymentConfirmedAt())
                .operationalAccessReleasedBy(control.getOperationalAccessReleasedBy())
                .operationalAccessReleasedAt(control.getOperationalAccessReleasedAt())
                .releaseNotes(control.getReleaseNotes())
                .customerResearchNotes(control.getCustomerResearchNotes())
                .rejectionReason(control.getRejectionReason())
                .build();
    }

    private User getPrimaryUser(UUID tenantId) {
        return userRepository.findByTenantId(tenantId).stream()
                .sorted(Comparator
                        .comparing((User user) -> Boolean.TRUE.equals(user.getVerified()) ? 0 : 1)
                        .thenComparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .findFirst()
                .orElse(null);
    }

    private String resolvePrimaryPhone(User user) {
        if (user.getWhatsapp() != null && !user.getWhatsapp().isBlank()) {
            return user.getWhatsapp();
        }
        if (user.getMobile() != null && !user.getMobile().isBlank()) {
            return user.getMobile();
        }
        if (user.getPhone() != null && !user.getPhone().isBlank()) {
            return user.getPhone();
        }
        return null;
    }

    private String normalizeNotes(String notes) {
        if (notes == null) {
            return null;
        }

        String normalized = notes
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .trim();
        return normalized.isBlank() ? null : normalized;
    }
}
