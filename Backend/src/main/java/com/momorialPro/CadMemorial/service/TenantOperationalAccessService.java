package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.enums.TenantOnboardingStatus;
import com.momorialPro.CadMemorial.model.TenantOperationalControl;
import com.momorialPro.CadMemorial.repository.TenantOperationalControlRepository;
import com.momorialPro.CadMemorial.security.AuthUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantOperationalAccessService {

    private final TenantOperationalControlRepository controlRepository;

    @Transactional(readOnly = true)
    public void assertPreparationAccessAllowed() {
        assertFeatureAccessAllowed("A preparacao do sistema");
    }

    @Transactional(readOnly = true)
    public void assertPropertyRegistrationAccessAllowed() {
        assertFeatureAccessAllowed("O cadastro de imoveis");
    }

    @Transactional(readOnly = true)
    public boolean isOperationalAccessReleased(UUID tenantId) {
        TenantOperationalControl control = getControlOrDefault(tenantId);
        return isOperationalAccessReleased(control);
    }

    private void assertFeatureAccessAllowed(String featureLabel) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        TenantOperationalControl control = getControlOrDefault(tenantId);

        if (isOperationalAccessReleased(control)) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, buildBlockedMessage(featureLabel, control));
    }

    private TenantOperationalControl getControlOrDefault(UUID tenantId) {
        return controlRepository.findByTenantId(tenantId)
                .orElseGet(() -> TenantOperationalControl.builder()
                        .tenantId(tenantId)
                        .build());
    }

    private boolean isOperationalAccessReleased(TenantOperationalControl control) {
        return Boolean.TRUE.equals(control.getOperationalAccessReleased())
                && control.getOnboardingStatus() == TenantOnboardingStatus.ACTIVE;
    }

    private String buildBlockedMessage(String featureLabel, TenantOperationalControl control) {
        return featureLabel
                + " ainda esta bloqueada para sua empresa. "
                + "Libere o tenant em Administracao > Empresas (Tenants). "
                + "Status atual: "
                + control.getOnboardingStatus().name()
                + " / "
                + control.getBillingStatus().name()
                + ".";
    }
}
