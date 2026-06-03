package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.AuthRequestDTO;
import com.momorialPro.CadMemorial.dto.AuthResponseDTO;
import com.momorialPro.CadMemorial.dto.RefreshTokenRequestDTO;
import com.momorialPro.CadMemorial.dto.RegisterRequestDTO;
import com.momorialPro.CadMemorial.dto.RegisterResponseDTO;
import com.momorialPro.CadMemorial.dto.ResendVerificationRequestDTO;
import com.momorialPro.CadMemorial.dto.UserDTO;
import com.momorialPro.CadMemorial.dto.UserProfileUpdateDTO;
import com.momorialPro.CadMemorial.dto.VerificationResponseDTO;
import com.momorialPro.CadMemorial.dto.MessageResponseDTO;
import com.momorialPro.CadMemorial.config.AuthFlowProperties;
import com.momorialPro.CadMemorial.model.EmailVerificationToken;
import com.momorialPro.CadMemorial.enums.TenantStatus;
import com.momorialPro.CadMemorial.enums.RoleName;
import com.momorialPro.CadMemorial.exception.BusinessException;
import com.momorialPro.CadMemorial.mapper.UserMapper;
import com.momorialPro.CadMemorial.model.RefreshToken;
import com.momorialPro.CadMemorial.model.Role;
import com.momorialPro.CadMemorial.model.Tenant;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.EmailVerificationTokenRepository;
import com.momorialPro.CadMemorial.repository.RoleRepository;
import com.momorialPro.CadMemorial.repository.TenantRepository;
import com.momorialPro.CadMemorial.repository.UserRepository;
import com.momorialPro.CadMemorial.security.AuthUtils;
import com.momorialPro.CadMemorial.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;




@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository repo;
    private final RoleRepository roleRepository;
    private final PasswordEncoder encoder;
    private final JwtTokenProvider jwt;
    private final UserMapper mapper;
    private final RefreshTokenService refreshTokenService;
    private final TenantProvisioningService tenantProvisioningService;
    private final TenantRepository tenantRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final AccountEmailService accountEmailService;
    private final AuthFlowProperties authFlowProperties;

    @Transactional
    public RegisterResponseDTO register(RegisterRequestDTO dto) {
        String normalizedEmail = normalizeEmail(dto.email());
        String normalizedUsername = normalizedEmail;
        String normalizedFullName = normalizeFullName(dto.fullName());
        Tenant tenant = tenantProvisioningService.createTenantForSignup(normalizedFullName, normalizedEmail);

        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                .orElseThrow(() -> new IllegalArgumentException("Role ADMIN nao encontrado"));

        boolean autoVerify = authFlowProperties.isAutoVerifyUsers();

        User user = User.builder()
                .username(normalizedUsername)
                .email(normalizedEmail)
                .password(encoder.encode(dto.password()))
                .fullName(normalizedFullName)
                .active(true)
                .verified(autoVerify)
                .tenant(tenant)
                .build();

        user = repo.save(user);
        user.getRoles().add(adminRole);
        user = repo.save(user);

        if (!autoVerify) {
            EmailVerificationToken verificationToken = createVerificationToken(user);
            accountEmailService.sendVerificationEmail(user, verificationToken.getToken());
        }

        String message = autoVerify
                ? "Conta criada e verificada com sucesso. Faça login para continuar."
                : "Conta criada com sucesso. Verifique seu e-mail para ativar o acesso.";

        return new RegisterResponseDTO(message, tenant.getCode(), normalizedEmail, !autoVerify);
    }

    @Transactional
    public AuthResponseDTO login(AuthRequestDTO dto) {
        Tenant tenant = resolveTenant(dto.tenantCode());
        String normalizedCredential = normalizeCredential(dto.username());

        User user = repo.findByUsernameIgnoreCaseAndTenantId(normalizedCredential, tenant.getId())
                .or(() -> repo.findByEmailIgnoreCaseAndTenantId(normalizedCredential, tenant.getId()))
                .orElseThrow(() -> new IllegalArgumentException("Credenciais inválidas"));

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new IllegalArgumentException("Usuário inativo");
        }

        if (!Boolean.TRUE.equals(user.getVerified())) {
            throw new IllegalArgumentException("Conta ainda não verificada. Confirme seu e-mail antes de entrar.");
        }

        if (!encoder.matches(dto.password(), user.getPassword())) {
            throw new IllegalArgumentException("Credenciais inválidas");
        }

        user = reconcileLegacyTenantAdminAccess(user);

        // 🔹 Gera token e refresh token
        String token = jwt.generateToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        return new AuthResponseDTO(token, refreshToken.getToken(), jwt.getExpirationMs());
    }

    @Transactional
    public AuthResponseDTO refreshToken(RefreshTokenRequestDTO dto) {
        return refreshTokenService.findByToken(dto.getRefreshToken())
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String token = jwt.generateToken(user);
                    return new AuthResponseDTO(token, dto.getRefreshToken(), jwt.getExpirationMs());
                })
                .orElseThrow(() -> new BusinessException("Refresh token inválido"));
    }
    
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isEmpty()) {
            refreshTokenService.revokeByToken(refreshToken);
        }
    }

    @Transactional
    public VerificationResponseDTO verifyEmail(String token) {
        EmailVerificationToken verificationToken = emailVerificationTokenRepository.findByTokenAndUsedAtIsNull(token)
                .orElseThrow(() -> new IllegalArgumentException("Token de verificação inválido"));

        if (verificationToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Token de verificação expirado");
        }

        User user = verificationToken.getUser();
        user.setVerified(true);
        verificationToken.setUsedAt(LocalDateTime.now());

        repo.save(user);
        emailVerificationTokenRepository.save(verificationToken);

        return new VerificationResponseDTO(
                "Conta verificada com sucesso. Agora você já pode fazer login.",
                user.getTenant() != null ? user.getTenant().getCode() : null,
                user.getEmail()
        );
    }

    @Transactional
    public MessageResponseDTO resendVerificationEmail(ResendVerificationRequestDTO dto) {
        Tenant tenant = resolveTenant(dto.tenantCode());
        String normalizedEmail = normalizeEmail(dto.email());

        User user = repo.findByEmailIgnoreCaseAndTenantId(normalizedEmail, tenant.getId())
                .orElseThrow(() -> new IllegalArgumentException("Se a conta existir e ainda nao estiver confirmada, um novo e-mail sera enviado."));

        if (Boolean.TRUE.equals(user.getVerified())) {
            return new MessageResponseDTO("Sua conta ja esta confirmada. Faça login para continuar.");
        }

        EmailVerificationToken verificationToken = createVerificationToken(user);
        accountEmailService.sendVerificationEmail(user, verificationToken.getToken());

        return new MessageResponseDTO("Novo e-mail de confirmacao enviado com sucesso. Verifique sua caixa de entrada.");
    }

    @Transactional(readOnly = true)
    public Object getCurrentUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof com.momorialPro.CadMemorial.security.CustomUserDetails customUserDetails) {
            return mapper.toDTO(customUserDetails.getUser());
        }

        String username = authentication.getName();
        User user = repo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        return mapper.toDTO(user);
    }

    @Transactional
    public UserDTO updateCurrentUserProfile(UserProfileUpdateDTO dto) {
        User currentUser = repo.findById(AuthUtils.getRequiredCurrentUser().getId())
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        String normalizedEmail = normalizeEmail(dto.getEmail());
        repo.findByEmailIgnoreCaseAndTenantId(normalizedEmail, AuthUtils.getRequiredCurrentTenantId())
                .filter(existing -> !existing.getId().equals(currentUser.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Este e-mail já está sendo usado por outro usuário.");
                });

        currentUser.setFullName(normalizeFullName(dto.getFullName()));
        currentUser.setEmail(normalizedEmail);
        currentUser.setCorporateName(normalizeOptionalText(dto.getCorporateName(), 100));
        currentUser.setTradeName(normalizeOptionalText(dto.getTradeName(), 100));
        currentUser.setCnpj(normalizeOptionalText(dto.getCnpj(), 18));
        currentUser.setStateRegistration(normalizeOptionalText(dto.getStateRegistration(), 15));
        currentUser.setMunicipalRegistration(normalizeOptionalText(dto.getMunicipalRegistration(), 15));
        currentUser.setPhone(normalizeOptionalText(dto.getPhone(), 20));
        currentUser.setMobile(normalizeOptionalText(dto.getMobile(), 20));
        currentUser.setWhatsapp(normalizeOptionalText(dto.getWhatsapp(), 20));
        currentUser.setManager(normalizeOptionalText(dto.getManager(), 20));
        currentUser.setAddress(normalizeOptionalText(dto.getAddress(), 100));
        currentUser.setDistrict(normalizeOptionalText(dto.getDistrict(), 50));
        currentUser.setCity(normalizeOptionalText(dto.getCity(), 50));
        currentUser.setState(normalizeOptionalState(dto.getState()));
        currentUser.setZipCode(normalizeOptionalText(dto.getZipCode(), 9));

        return mapper.toDTO(repo.save(currentUser));
    }

    private User reconcileLegacyTenantAdminAccess(User user) {
        if (user.getTenant() == null) {
            return user;
        }

        boolean alreadyAdmin = user.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleName.ROLE_ADMIN);
        if (alreadyAdmin) {
            return user;
        }

        long tenantUserCount = repo.countByTenantId(user.getTenant().getId());
        if (tenantUserCount != 1) {
            return user;
        }

        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                .orElseThrow(() -> new IllegalArgumentException("Role ADMIN nao encontrado"));

        user.getRoles().add(adminRole);
        return repo.save(user);
    }

    private Tenant resolveTenant(String tenantCode) {
        String normalizedTenantCode = tenantCode != null ? tenantCode.trim().toUpperCase(Locale.ROOT) : "";
        if (normalizedTenantCode.isBlank()) {
            return tenantProvisioningService.getOrCreateDefaultTenant();
        }

        return tenantRepository.findByCodeIgnoreCase(normalizedTenantCode)
                .or(() -> tenantRepository.findBySlugIgnoreCase(normalizedTenantCode))
                .filter(tenant -> tenant.getStatus() == TenantStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("Tenant inválido"));
    }

    private EmailVerificationToken createVerificationToken(User user) {
        emailVerificationTokenRepository.deleteByUser(user);
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .token(UUID.randomUUID().toString())
                .user(user)
                .expiresAt(LocalDateTime.now().plusHours(authFlowProperties.getVerificationTokenHours()))
                .build();
        return emailVerificationTokenRepository.save(verificationToken);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("E-mail é obrigatório");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeCredential(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Credenciais inválidas");
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeFullName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            throw new IllegalArgumentException("Nome completo é obrigatório");
        }
        return fullName.trim().replaceAll("\\s+", " ");
    }

    private String normalizeOptionalText(String value, int maxLength) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim().replaceAll("\\s+", " ");
        if (normalized.isBlank()) {
            return null;
        }

        if (normalized.length() > maxLength) {
            return normalized.substring(0, maxLength);
        }

        return normalized;
    }

    private String normalizeOptionalState(String state) {
        String normalized = normalizeOptionalText(state, 2);
        return normalized != null ? normalized.toUpperCase(Locale.ROOT) : null;
    }
}
