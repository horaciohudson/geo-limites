package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.AdminUserPasswordResetDTO;
import com.momorialPro.CadMemorial.dto.MessageResponseDTO;
import com.momorialPro.CadMemorial.dto.UserCreateDTO;
import com.momorialPro.CadMemorial.dto.UserDTO;
import com.momorialPro.CadMemorial.dto.UserUpdateDTO;
import com.momorialPro.CadMemorial.enums.RoleName;
import com.momorialPro.CadMemorial.mapper.UserMapper;
import com.momorialPro.CadMemorial.model.EmailVerificationToken;
import com.momorialPro.CadMemorial.model.Role;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.EmailVerificationTokenRepository;
import com.momorialPro.CadMemorial.repository.RoleRepository;
import com.momorialPro.CadMemorial.repository.UserRepository;
import com.momorialPro.CadMemorial.config.AuthFlowProperties;
import com.momorialPro.CadMemorial.security.AuthUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repository;
    private final UserMapper mapper;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final AccountEmailService accountEmailService;
    private final AuthFlowProperties authFlowProperties;
    private final RoleRepository roleRepository;

    @Transactional(readOnly = true)
    public List<UserDTO> findAll() {
        requireAdmin();
        return repository.findByTenantId(AuthUtils.getRequiredCurrentTenantId()).stream().map(mapper::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<UserDTO> findAllGlobal() {
        requireAdmin();
        // Permite ao System Admin ver todos os usuários de todos os tenants
        return repository.findAll().stream().map(mapper::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public UserDTO findById(UUID id) {
        User currentUser = AuthUtils.getRequiredCurrentUser();
        if (!AuthUtils.isCurrentUserAdmin() && !currentUser.getId().equals(id)) {
            throw new IllegalArgumentException("Você não tem permissão para visualizar este usuário");
        }
        return repository.findByIdAndTenantId(id, AuthUtils.getRequiredCurrentTenantId()).map(mapper::toDTO).orElse(null);
    }

    @Transactional
    public UserDTO create(UserCreateDTO dto) {
        requireAdmin();
        User currentUser = AuthUtils.getRequiredCurrentUser();
        String normalizedEmail = dto.getEmail().trim().toLowerCase();
        String normalizedUsername = dto.getUsername() != null && !dto.getUsername().isBlank()
                ? dto.getUsername().trim().toLowerCase()
                : normalizedEmail;

        if (repository.findByUsernameIgnoreCaseAndTenantId(normalizedUsername, currentUser.getTenant().getId()).isPresent()) {
            throw new IllegalArgumentException("Ja existe um usuario com esse login neste tenant.");
        }

        if (repository.findByEmailIgnoreCaseAndTenantId(normalizedEmail, currentUser.getTenant().getId()).isPresent()) {
            throw new IllegalArgumentException("Ja existe um usuario com esse e-mail neste tenant.");
        }

        RoleName roleName = resolveRoleName(dto.getRoleName());
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Perfil informado nao foi encontrado."));

        boolean verified = Boolean.TRUE.equals(dto.getVerified());
        User user = mapper.toEntity(dto);
        user.setUsername(normalizedUsername);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setEmail(normalizedEmail);
        user.setVerified(verified);
        user.setTenant(currentUser.getTenant());
        user.setOwner(currentUser);
        user = repository.save(user);

        user.getRoles().add(role);
        user = repository.save(user);

        boolean shouldSendVerificationEmail = !verified && !Boolean.FALSE.equals(dto.getSendVerificationEmail());
        if (shouldSendVerificationEmail) {
            EmailVerificationToken verificationToken = createVerificationToken(user);
            accountEmailService.sendVerificationEmail(user, verificationToken.getToken());
        }

        return mapper.toDTO(user);
    }

    @Transactional
    public UserDTO update(UUID id, UserUpdateDTO dto) {
        requireAdmin();
        User currentUser = AuthUtils.getRequiredCurrentUser();
        User user = repository.findByIdAndTenantId(id, currentUser.getTenant().getId())
                .orElseThrow(() -> new IllegalArgumentException("Usuario nao encontrado."));

        String normalizedEmail = dto.getEmail().trim().toLowerCase();
        String normalizedUsername = dto.getUsername().trim().toLowerCase();

        repository.findByUsernameIgnoreCaseAndTenantId(normalizedUsername, currentUser.getTenant().getId())
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Ja existe um usuario com esse login neste tenant.");
                });

        repository.findByEmailIgnoreCaseAndTenantId(normalizedEmail, currentUser.getTenant().getId())
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Ja existe um usuario com esse e-mail neste tenant.");
                });

        RoleName roleName = resolveRoleName(dto.getRoleName());
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Perfil informado nao foi encontrado."));

        boolean currentUserTarget = currentUser.getId().equals(user.getId());
        boolean targetWasAdmin = hasAdminRole(user);
        boolean targetWillRemainAdmin = RoleName.ROLE_ADMIN.equals(roleName);
        boolean targetWillRemainActive = !Boolean.FALSE.equals(dto.getActive());

        ensureAdminRoleRetention(user, currentUserTarget, targetWasAdmin, targetWillRemainAdmin, targetWillRemainActive);

        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setFullName(dto.getFullName().trim());
        user.setActive(targetWillRemainActive);
        user.getRoles().clear();
        user.getRoles().add(role);

        return mapper.toDTO(repository.save(user));
    }

    @Transactional
    public void delete(UUID id) {
        requireAdmin();
        User user = repository.findByIdAndTenantId(id, AuthUtils.getRequiredCurrentTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));
        repository.delete(user);
    }

    @Transactional
    public MessageResponseDTO resetPassword(UUID id, AdminUserPasswordResetDTO dto) {
        requireAdmin();
        User user = repository.findByIdAndTenantId(id, AuthUtils.getRequiredCurrentTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Usuario nao encontrado."));

        String normalizedPassword = dto.getNewPassword() != null ? dto.getNewPassword().trim() : "";
        if (normalizedPassword.length() < 6) {
            throw new IllegalArgumentException("A nova senha deve ter pelo menos 6 caracteres.");
        }

        user.setPassword(passwordEncoder.encode(normalizedPassword));
        repository.save(user);

        return new MessageResponseDTO("Senha redefinida com sucesso para " + (user.getEmail() != null ? user.getEmail() : user.getUsername()) + ".");
    }

    @Transactional
    public MessageResponseDTO resendVerification(UUID id) {
        requireAdmin();

        User user = repository.findByIdAndTenantId(id, AuthUtils.getRequiredCurrentTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        if (Boolean.TRUE.equals(user.getVerified())) {
            return new MessageResponseDTO("Este usuario ja possui e-mail confirmado.");
        }

        EmailVerificationToken verificationToken = createVerificationToken(user);
        AccountEmailService.DispatchResult dispatchResult =
                accountEmailService.sendVerificationEmail(user, verificationToken.getToken());
        String message = dispatchResult.isEmailSent()
                ? "Novo e-mail de confirmacao enviado com sucesso para " + user.getEmail() + "."
                : "Novo link de confirmacao gerado para " + user.getEmail()
                + ". O envio de e-mail esta desabilitado neste ambiente; use o link exibido abaixo.";
        return new MessageResponseDTO(message, dispatchResult.isEmailSent(), dispatchResult.getVerificationUrl());
    }

    private void requireAdmin() {
        if (!AuthUtils.isCurrentUserAdmin()) {
            throw new IllegalArgumentException("Ação permitida apenas para administradores do tenant");
        }
    }

    private void ensureAdminRoleRetention(
            User targetUser,
            boolean currentUserTarget,
            boolean targetWasAdmin,
            boolean targetWillRemainAdmin,
            boolean targetWillRemainActive
    ) {
        if (currentUserTarget && (!targetWillRemainAdmin || !targetWillRemainActive)) {
            throw new IllegalArgumentException("Voce nao pode remover seu proprio acesso administrativo nem se inativar.");
        }

        if (!targetWasAdmin || (targetWillRemainAdmin && targetWillRemainActive)) {
            return;
        }

        long otherActiveAdmins = repository.findByTenantId(AuthUtils.getRequiredCurrentTenantId()).stream()
                .filter(candidate -> !candidate.getId().equals(targetUser.getId()))
                .filter(candidate -> Boolean.TRUE.equals(candidate.getActive()))
                .filter(this::hasAdminRole)
                .count();

        if (otherActiveAdmins == 0) {
            throw new IllegalArgumentException("Mantenha ao menos um administrador ativo no tenant.");
        }
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

    private RoleName resolveRoleName(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return RoleName.ROLE_USER;
        }

        try {
            return RoleName.valueOf(roleName.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Perfil de usuario invalido.");
        }
    }

    private boolean hasAdminRole(User user) {
        return user.getRoles().stream().anyMatch(role -> RoleName.ROLE_ADMIN.equals(role.getName()));
    }
}
