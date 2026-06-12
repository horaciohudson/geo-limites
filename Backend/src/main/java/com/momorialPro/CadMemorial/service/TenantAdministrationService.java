package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.admin.TenantOperationalAdminDTO;
import com.momorialPro.CadMemorial.model.Tenant;
import com.momorialPro.CadMemorial.model.TenantOperationalControl;
import com.momorialPro.CadMemorial.repository.TenantOperationalControlRepository;
import com.momorialPro.CadMemorial.repository.TenantRepository;
import com.momorialPro.CadMemorial.security.AuthUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantAdministrationService {

    private final TenantRepository tenantRepository;
    private final TenantOperationalControlRepository controlRepository;

    @Transactional(readOnly = true)
    public List<TenantOperationalAdminDTO> listOperationalTenants() {
        return tenantRepository.findAll().stream()
                .map(this::toAdminDto)
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
            control.setBillingStatus(com.momorialPro.CadMemorial.enums.TenantBillingStatus.PAID);
        } else {
            control.setBillingStatus(com.momorialPro.CadMemorial.enums.TenantBillingStatus.PENDING_FIRST_PAYMENT);
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
            control.setOnboardingStatus(com.momorialPro.CadMemorial.enums.TenantOnboardingStatus.ACTIVE);
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
        
        return TenantOperationalAdminDTO.builder()
                .tenantId(tenant.getId())
                .tenantCode(tenant.getCode())
                .tenantName(tenant.getName())
                .tenantStatus(tenant.getStatus().name())
                .onboardingStatus(control.getOnboardingStatus().name())
                .billingStatus(control.getBillingStatus().name())
                .companyDataCompleted(Boolean.TRUE.equals(control.getCompanyDataCompleted()))
                .adminApproved(Boolean.TRUE.equals(control.getAdminApproved()))
                .firstPaymentConfirmed(Boolean.TRUE.equals(control.getFirstPaymentConfirmed()))
                .operationalAccessReleased(Boolean.TRUE.equals(control.getOperationalAccessReleased()))
                .adminApprovedBy(control.getAdminApprovedBy())
                .adminApprovedAt(control.getAdminApprovedAt())
                .firstPaymentConfirmedBy(control.getFirstPaymentConfirmedBy())
                .firstPaymentConfirmedAt(control.getFirstPaymentConfirmedAt())
                .operationalAccessReleasedBy(control.getOperationalAccessReleasedBy())
                .operationalAccessReleasedAt(control.getOperationalAccessReleasedAt())
                .releaseNotes(control.getReleaseNotes())
                .build();
    }
}
