package com.momorialPro.CadMemorial.security;

import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class AuthUtils {

    private static UserRepository userRepository;

    @Autowired
    public void setUserRepository(UserRepository userRepository) {
        AuthUtils.userRepository = userRepository;
    }

    public static String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }
        return null;
    }

    public static UUID getCurrentUserId() {
        return getCurrentUser()
                .map(User::getId)
                .orElse(null);
    }

    public static UUID getCurrentTenantId() {
        return getCurrentUser()
                .map(User::getTenant)
                .map(tenant -> tenant != null ? tenant.getId() : null)
                .orElse(null);
    }

    public static User getRequiredCurrentUser() {
        return getCurrentUser()
                .orElseThrow(() -> new IllegalStateException("Usuário não autenticado"));
    }

    public static UUID getRequiredCurrentTenantId() {
        UUID tenantId = getCurrentTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant do usuário autenticado não encontrado");
        }
        return tenantId;
    }

    public static boolean isCurrentUserAdmin() {
        return getCurrentUser()
                .map(user -> user.getRoles().stream().anyMatch(role -> "ROLE_ADMIN".equals(role.getName().name())))
                .orElse(false);
    }

    private static java.util.Optional<User> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return java.util.Optional.empty();
        }

        Object principal = auth.getPrincipal();
        if (principal instanceof CustomUserDetails customUserDetails) {
            return java.util.Optional.of(customUserDetails.getUser());
        }

        String username = getCurrentUsername();
        if (username == null) {
            return java.util.Optional.empty();
        }

        return userRepository.findByUsername(username);
    }
}
