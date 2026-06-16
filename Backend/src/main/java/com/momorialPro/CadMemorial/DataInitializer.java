package com.momorialPro.CadMemorial;


import com.momorialPro.CadMemorial.config.BootstrapAdminProperties;
import com.momorialPro.CadMemorial.enums.RoleName;
import com.momorialPro.CadMemorial.model.Role;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.RoleRepository;
import com.momorialPro.CadMemorial.repository.UserRepository;
import com.momorialPro.CadMemorial.service.TenantProvisioningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;



@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantProvisioningService tenantProvisioningService;
    private final BootstrapAdminProperties bootstrapAdminProperties;

    @Override
    @Transactional
    public void run(String... args) {
        var defaultTenant = tenantProvisioningService.getOrCreateDefaultTenant();

        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                .orElseThrow(() -> new IllegalStateException("ROLE_ADMIN nao encontrada. Verifique as migrations."));

        if (!bootstrapAdminProperties.isEnabled()) {
            return;
        }

        if (isBlank(bootstrapAdminProperties.getUsername()) || isBlank(bootstrapAdminProperties.getPassword())) {
            log.warn("Bootstrap do admin habilitado, mas username/password nao foram informados. Configure BOOTSTRAP_ADMIN_USERNAME e BOOTSTRAP_ADMIN_PASSWORD.");
            return;
        }

        userRepository.findByUsernameIgnoreCaseAndTenantId(bootstrapAdminProperties.getUsername(), defaultTenant.getId())
                .ifPresentOrElse(
                        user -> ensureAdminAccess(user, adminRole, defaultTenant),
                        () -> createAdmin(adminRole, defaultTenant)
                );
    }

    private void createAdmin(Role adminRole, com.momorialPro.CadMemorial.model.Tenant defaultTenant) {
        User admin = User.builder()
                .username(bootstrapAdminProperties.getUsername())
                .email(bootstrapAdminProperties.getUsername())
                .fullName(bootstrapAdminProperties.getFullName())
                .active(true)
                .verified(true)
                .tenant(defaultTenant)
                .password(passwordEncoder.encode(bootstrapAdminProperties.getPassword()))
                .build();

        admin = userRepository.save(admin);
        admin.getRoles().add(adminRole);
        userRepository.save(admin);
    }

    private void ensureAdminAccess(User user, Role adminRole, com.momorialPro.CadMemorial.model.Tenant defaultTenant) {
        boolean changed = false;

        if (user.getTenant() == null) {
            user.setTenant(defaultTenant);
            changed = true;
        }

        if (!Boolean.TRUE.equals(user.getActive())) {
            user.setActive(true);
            changed = true;
        }

        if (!Boolean.TRUE.equals(user.getVerified())) {
            user.setVerified(true);
            changed = true;
        }

        if (user.getEmail() == null || user.getEmail().isBlank()) {
            user.setEmail(user.getUsername());
            changed = true;
        }

        if (user.getRoles().stream().noneMatch(role -> Objects.equals(role.getName(), adminRole.getName()))) {
            user.getRoles().add(adminRole);
            changed = true;
        }

        if (changed) {
            userRepository.save(user);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
