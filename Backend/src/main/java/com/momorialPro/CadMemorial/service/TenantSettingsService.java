package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.TenantSettingsDTO;
import com.momorialPro.CadMemorial.dto.UpdateTenantSettingsRequest;
import com.momorialPro.CadMemorial.enums.TenantStatus;
import com.momorialPro.CadMemorial.model.Tenant;
import com.momorialPro.CadMemorial.repository.TenantRepository;
import com.momorialPro.CadMemorial.security.AuthUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TenantSettingsService {

    private final TenantRepository tenantRepository;

    @Transactional(readOnly = true)
    public TenantSettingsDTO getCurrentTenantSettings() {
        Tenant tenant = getRequiredCurrentTenant();
        return toDTO(tenant);
    }

    @Transactional
    public TenantSettingsDTO updateCurrentTenantSettings(UpdateTenantSettingsRequest request) {
        Tenant tenant = getRequiredCurrentTenant();
        String normalizedName = normalizeName(request.getName());
        String normalizedPlanCode = normalizePlanCode(request.getPlanCode());
        TenantStatus normalizedStatus = normalizeStatus(request.getStatus());

        tenant.setName(normalizedName);
        tenant.setPlanCode(normalizedPlanCode);
        tenant.setStatus(normalizedStatus);
        tenant.setUpdatedBy(AuthUtils.getCurrentUsername());

        return toDTO(tenantRepository.save(tenant));
    }

    private Tenant getRequiredCurrentTenant() {
        return tenantRepository.findById(AuthUtils.getRequiredCurrentTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Tenant atual nao encontrado."));
    }

    private TenantSettingsDTO toDTO(Tenant tenant) {
        return TenantSettingsDTO.builder()
                .id(tenant.getId())
                .name(tenant.getName())
                .code(tenant.getCode())
                .slug(tenant.getSlug())
                .planCode(tenant.getPlanCode())
                .status(tenant.getStatus() != null ? tenant.getStatus().name() : null)
                .isDefault(tenant.getIsDefault())
                .build();
    }

    private String normalizeName(String name) {
        String normalized = name != null ? name.trim().replaceAll("\\s+", " ") : "";
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("O nome da empresa e obrigatorio.");
        }
        return normalized;
    }

    private String normalizePlanCode(String planCode) {
        String normalized = planCode != null ? planCode.trim() : "";
        return normalized.isBlank() ? null : normalized;
    }

    private TenantStatus normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return TenantStatus.ACTIVE;
        }

        try {
            return TenantStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Status do tenant invalido.");
        }
    }
}
