package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.enums.TenantStatus;
import com.momorialPro.CadMemorial.model.Tenant;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class TenantProvisioningService {

    public static final String DEFAULT_TENANT_CODE = "SIGEVE";
    public static final String DEFAULT_TENANT_SLUG = "sigeve";

    private final TenantRepository tenantRepository;

    @Transactional
    public Tenant getOrCreateDefaultTenant() {
        return tenantRepository.findByCodeIgnoreCase(DEFAULT_TENANT_CODE)
                .orElseGet(() -> tenantRepository.save(
                        Tenant.builder()
                                .name("SIGEVE Default Tenant")
                                .code(DEFAULT_TENANT_CODE)
                                .slug(DEFAULT_TENANT_SLUG)
                                .status(TenantStatus.ACTIVE)
                                .planCode("foundation")
                                .isDefault(true)
                                .createdBy("system")
                                .build()
                ));
    }

    @Transactional
    public Tenant createTenantForSignup(String fullName, String email) {
        String normalizedFullName = normalizeDisplayName(fullName);
        String emailLocalPart = extractEmailLocalPart(email);
        String codeBase = buildCodeBase(normalizedFullName, emailLocalPart);
        String slugBase = buildSlugBase(normalizedFullName, emailLocalPart);
        String tenantName = buildTenantName(normalizedFullName);

        int suffix = 0;
        while (true) {
            String candidateCode = appendCodeSuffix(codeBase, suffix);
            String candidateSlug = appendSlugSuffix(slugBase, suffix);

            boolean codeExists = tenantRepository.findByCodeIgnoreCase(candidateCode).isPresent();
            boolean slugExists = tenantRepository.findBySlugIgnoreCase(candidateSlug).isPresent();
            if (!codeExists && !slugExists) {
                return tenantRepository.save(
                        Tenant.builder()
                                .name(tenantName)
                                .code(candidateCode)
                                .slug(candidateSlug)
                                .status(TenantStatus.ACTIVE)
                                .planCode("foundation")
                                .isDefault(false)
                                .createdBy("self-signup")
                                .updatedBy("self-signup")
                                .build()
                );
            }
            suffix++;
        }
    }

    @Transactional
    public void assignDefaultTenantIfMissing(User user) {
        if (user != null && user.getTenant() == null) {
            user.setTenant(getOrCreateDefaultTenant());
        }
    }

    private String normalizeDisplayName(String fullName) {
        String value = fullName == null ? "" : fullName.trim().replaceAll("\\s+", " ");
        if (value.isBlank()) {
            return "Novo Cliente";
        }
        return truncate(value, 100);
    }

    private String extractEmailLocalPart(String email) {
        if (email == null || email.isBlank()) {
            return "cliente";
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        int separatorIndex = normalizedEmail.indexOf('@');
        if (separatorIndex <= 0) {
            return normalizedEmail;
        }
        return normalizedEmail.substring(0, separatorIndex);
    }

    private String buildCodeBase(String fullName, String emailLocalPart) {
        String fromName = normalizeAlphaNumeric(fullName).toUpperCase(Locale.ROOT);
        if (fromName.length() >= 4) {
            return truncate(fromName, 16);
        }

        String fromEmail = normalizeAlphaNumeric(emailLocalPart).toUpperCase(Locale.ROOT);
        if (fromEmail.length() >= 4) {
            return truncate(fromEmail, 16);
        }

        return "TENANT";
    }

    private String buildSlugBase(String fullName, String emailLocalPart) {
        String fromName = slugify(fullName);
        if (fromName.length() >= 3) {
            return truncate(fromName, 40);
        }

        String fromEmail = slugify(emailLocalPart);
        if (fromEmail.length() >= 3) {
            return truncate(fromEmail, 40);
        }

        return "cliente";
    }

    private String buildTenantName(String fullName) {
        return truncate("Conta de " + fullName, 150);
    }

    private String appendCodeSuffix(String base, int suffix) {
        if (suffix <= 0) {
            return base;
        }
        String suffixText = Integer.toString(suffix + 1);
        return truncate(base, 50 - suffixText.length()) + suffixText;
    }

    private String appendSlugSuffix(String base, int suffix) {
        if (suffix <= 0) {
            return base;
        }
        String suffixText = "-" + (suffix + 1);
        return truncate(base, 100 - suffixText.length()) + suffixText;
    }

    private String normalizeAlphaNumeric(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.replaceAll("[^A-Za-z0-9]", "");
    }

    private String slugify(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+", "")
                .replaceAll("-+$", "");
        return normalized;
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
