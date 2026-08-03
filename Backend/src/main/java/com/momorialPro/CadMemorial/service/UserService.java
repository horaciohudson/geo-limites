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
import java.util.ArrayList;
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
        requireTenantManager();
        return repository.findByTenantId(AuthUtils.getRequiredCurrentTenantId()).stream().map(mapper::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<UserDTO> findAllGlobal() {
        requirePlatformAdmin();
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
        requireTenantManager();
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

        RoleName roleName = resolveTenantScopedRole(dto.getRoleName());
        List<Role> rolesToAssign = resolveRolesForAssignment(roleName);

        boolean verified = Boolean.TRUE.equals(dto.getVerified());
        User user = mapper.toEntity(dto);
        user.setUsername(normalizedUsername);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setEmail(normalizedEmail);
        user.setVerified(verified);
        user.setTenant(currentUser.getTenant());
        user.setOwner(currentUser);
        user = repository.save(user);

        user.getRoles().addAll(rolesToAssign);
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
        requireTenantManager();
        User currentUser = AuthUtils.getRequiredCurrentUser();
        User user = repository.findByIdAndTenantId(id, currentUser.getTenant().getId())
                .orElseThrow(() -> new IllegalArgumentException("Usuario nao encontrado."));

        if (hasTenantManagementRole(user)) {
            throw new IllegalArgumentException(
                    "Contas administrativas da empresa nao podem ser alteradas por esta area.");
        }

        ensureTenantScopedEditableState(user, dto);

        boolean targetWillRemainActive = !Boolean.FALSE.equals(dto.getActive());
        boolean currentUserTarget = currentUser.getId().equals(user.getId());
        boolean targetWasTenantAdmin = hasRole(user, RoleName.ROLE_TENANT_ADMIN);

        ensureAdminRoleRetention(
                user,
                currentUserTarget,
                targetWasTenantAdmin,
                false,
                targetWillRemainActive,
                hasTenantManagementRole(user)
        );

        user.setActive(targetWillRemainActive);
        if (targetWillRemainActive && user.getOwner() == null) {
            user.setOwner(currentUser);
        }

        return mapper.toDTO(repository.save(user));
    }

    @Transactional
    public UserDTO updateGlobal(UUID id, UserUpdateDTO dto) {
        requirePlatformAdmin();
        User currentUser = AuthUtils.getRequiredCurrentUser();
        User user = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario nao encontrado."));
        return updateUserInternal(user, dto, currentUser, false);
    }

    private UserDTO updateUserInternal(User user, UserUpdateDTO dto, User currentUser, boolean tenantScoped) {
        UUID targetTenantId = user.getTenant() != null ? user.getTenant().getId() : currentUser.getTenant().getId();

        String normalizedEmail = dto.getEmail().trim().toLowerCase();
        String normalizedUsername = dto.getUsername().trim().toLowerCase();

        repository.findByUsernameIgnoreCaseAndTenantId(normalizedUsername, targetTenantId)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Ja existe um usuario com esse login neste tenant.");
                });

        repository.findByEmailIgnoreCaseAndTenantId(normalizedEmail, targetTenantId)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Ja existe um usuario com esse e-mail neste tenant.");
                });

        RoleName roleName = tenantScoped ? resolveTenantScopedRole(dto.getRoleName()) : resolveRoleName(dto.getRoleName());
        ensureAssignableRole(roleName);
        List<Role> rolesToAssign = resolveRolesForAssignment(roleName);

        boolean currentUserTarget = currentUser.getId().equals(user.getId());
        boolean targetWasTenantAdmin = hasRole(user, RoleName.ROLE_TENANT_ADMIN);
        boolean targetWillRemainAdmin = isTenantManagementRole(roleName);
        boolean targetWillRemainTenantAdmin = RoleName.ROLE_TENANT_ADMIN.equals(roleName);
        boolean targetWillRemainActive = !Boolean.FALSE.equals(dto.getActive());

        ensureAdminRoleRetention(
                user,
                currentUserTarget,
                targetWasTenantAdmin,
                targetWillRemainTenantAdmin,
                targetWillRemainActive,
                targetWillRemainAdmin
        );

        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setFullName(dto.getFullName().trim());
        user.setActive(targetWillRemainActive);
        if (targetWillRemainActive && user.getOwner() == null) {
            user.setOwner(currentUser);
        }
        user.getRoles().clear();
        user.getRoles().addAll(rolesToAssign);

        return mapper.toDTO(repository.save(user));
    }

    @Transactional
    public void delete(UUID id) {
        requireTenantManager();
        User user = repository.findByIdAndTenantId(id, AuthUtils.getRequiredCurrentTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        if (hasTenantManagementRole(user)) {
            throw new IllegalArgumentException(
                    "Contas administrativas da empresa nao podem ser excluidas por esta area.");
        }

        repository.delete(user);
    }

    @Transactional
    public UserDTO promoteToTenantAdmin(UUID id) {
        requireTenantManager();
        User currentUser = AuthUtils.getRequiredCurrentUser();
        User user = repository.findByIdAndTenantId(id, currentUser.getTenant().getId())
                .orElseThrow(() -> new IllegalArgumentException("Usuario nao encontrado."));

        if (hasTenantManagementRole(user)) {
            throw new IllegalArgumentException("Este usuario ja possui perfil administrativo na empresa.");
        }

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new IllegalArgumentException("Ative o usuario antes de promover para administrador da empresa.");
        }

        if (!Boolean.TRUE.equals(user.getVerified())) {
            throw new IllegalArgumentException("Confirme o e-mail do usuario antes de promover para administrador da empresa.");
        }

        if (isApprovalPending(user)) {
            throw new IllegalArgumentException("Libere o acesso operacional do usuario antes de promover para administrador da empresa.");
        }

        user.getRoles().clear();
        user.getRoles().addAll(resolveRolesForAssignment(RoleName.ROLE_TENANT_ADMIN));

        return mapper.toDTO(repository.save(user));
    }

    @Transactional
    public MessageResponseDTO relinquishCurrentTenantAdmin() {
        requireTenantManager();
        User currentUser = AuthUtils.getRequiredCurrentUser();

        if (!AuthUtils.isCurrentUserTenantAdmin()) {
            throw new IllegalArgumentException("Apenas administradores da empresa podem transferir esta responsabilidade.");
        }

        ensureAnotherActiveTenantAdminExists(currentUser);

        userRemoveRole(currentUser, RoleName.ROLE_TENANT_ADMIN);
        if (currentUser.getRoles().isEmpty()) {
            currentUser.getRoles().add(findRole(RoleName.ROLE_USER));
        }

        repository.save(currentUser);
        return new MessageResponseDTO("Responsabilidade administrativa transferida com sucesso. Entre novamente para continuar com o novo perfil.");
    }

    @Transactional
    public MessageResponseDTO resetPassword(UUID id, AdminUserPasswordResetDTO dto) {
        requirePlatformAdmin();
        User user = repository.findByIdAndTenantId(id, AuthUtils.getRequiredCurrentTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Usuario nao encontrado."));
        return resetPasswordInternal(user, dto);
    }

    @Transactional
    public MessageResponseDTO resetPasswordGlobal(UUID id, AdminUserPasswordResetDTO dto) {
        requirePlatformAdmin();
        User user = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario nao encontrado."));
        return resetPasswordInternal(user, dto);
    }

    private MessageResponseDTO resetPasswordInternal(User user, AdminUserPasswordResetDTO dto) {

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
        requireTenantManager();
        User user = repository.findByIdAndTenantId(id, AuthUtils.getRequiredCurrentTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));
        return resendVerificationInternal(user);
    }

    @Transactional
    public MessageResponseDTO resendVerificationGlobal(UUID id) {
        requirePlatformAdmin();
        User user = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));
        return resendVerificationInternal(user);
    }

    private MessageResponseDTO resendVerificationInternal(User user) {

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

    private void requireTenantManager() {
        if (!AuthUtils.isCurrentUserAdmin()) {
            throw new IllegalArgumentException("Ação permitida apenas para administradores do tenant");
        }
    }

    private void requirePlatformAdmin() {
        if (!AuthUtils.isCurrentUserPlatformAdmin()) {
            throw new IllegalArgumentException("Ação permitida apenas para administradores da plataforma");
        }
    }

    private void ensureAdminRoleRetention(
            User targetUser,
            boolean currentUserTarget,
            boolean targetWasTenantAdmin,
            boolean targetWillRemainTenantAdmin,
            boolean targetWillRemainActive,
            boolean targetWillRemainManagementRole
    ) {
        boolean currentUserIsTenantAdmin = hasRole(targetUser, RoleName.ROLE_TENANT_ADMIN);
        if (currentUserTarget
                && (!targetWillRemainManagementRole
                || !targetWillRemainActive
                || (currentUserIsTenantAdmin && !targetWillRemainTenantAdmin))) {
            throw new IllegalArgumentException("Voce nao pode remover seu proprio acesso administrativo nem se inativar.");
        }

        if (!targetWasTenantAdmin || (targetWillRemainTenantAdmin && targetWillRemainActive)) {
            return;
        }

        ensureAnotherActiveTenantAdminExists(targetUser);
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

    private RoleName resolveTenantScopedRole(String roleName) {
        RoleName resolvedRoleName = resolveRoleName(roleName);
        if (!RoleName.ROLE_USER.equals(resolvedRoleName)) {
            throw new IllegalArgumentException("Nesta area da empresa, novos acessos devem ser criados apenas como ROLE_USER.");
        }
        return resolvedRoleName;
    }

    private void ensureAssignableRole(RoleName roleName) {
        if (RoleName.ROLE_ADMIN.equals(roleName) && !AuthUtils.isCurrentUserPlatformAdmin()) {
            throw new IllegalArgumentException("Apenas o administrador da plataforma pode atribuir ROLE_ADMIN.");
        }
    }

    private void ensureTenantScopedEditableState(User user, UserUpdateDTO dto) {
        String requestedUsername = dto.getUsername() != null ? dto.getUsername().trim().toLowerCase() : "";
        String requestedEmail = dto.getEmail() != null ? dto.getEmail().trim().toLowerCase() : "";
        String requestedFullName = dto.getFullName() != null ? dto.getFullName().trim() : "";
        String currentUsername = user.getUsername() != null ? user.getUsername().trim().toLowerCase() : "";
        String currentEmail = user.getEmail() != null ? user.getEmail().trim().toLowerCase() : "";
        String currentFullName = user.getFullName() != null ? user.getFullName().trim() : "";
        String requestedRole = dto.getRoleName() != null ? dto.getRoleName().trim().toUpperCase() : "ROLE_USER";
        String currentRole = user.getRoles().stream()
                .map(role -> role.getName().name())
                .filter(roleName -> RoleName.ROLE_USER.name().equals(roleName))
                .findFirst()
                .orElseGet(() -> user.getRoles().stream()
                        .findFirst()
                        .map(role -> role.getName().name())
                        .orElse(RoleName.ROLE_USER.name()));

        if (!requestedUsername.equals(currentUsername)
                || !requestedEmail.equals(currentEmail)
                || !requestedFullName.equals(currentFullName)
                || !requestedRole.equals(currentRole)) {
            throw new IllegalArgumentException(
                    "Nesta area, a empresa pode apenas ativar ou inativar usuarios. Dados cadastrais e perfil nao podem ser alterados.");
        }
    }

    private List<Role> resolveRolesForAssignment(RoleName roleName) {
        List<RoleName> roleNames = new ArrayList<>();
        roleNames.add(roleName);
        if (RoleName.ROLE_TENANT_ADMIN.equals(roleName)) {
            roleNames.add(RoleName.ROLE_USER);
        }

        return roleNames.stream()
                .distinct()
                .map(this::findRole)
                .toList();
    }

    private Role findRole(RoleName roleName) {
        return roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Perfil informado nao foi encontrado."));
    }

    private void userRemoveRole(User user, RoleName roleName) {
        user.getRoles().removeIf(role -> roleName.equals(role.getName()));
    }

    private void ensureAnotherActiveTenantAdminExists(User targetUser) {
        long otherActiveTenantAdmins = countOtherActiveTenantAdmins(targetUser);
        if (otherActiveTenantAdmins == 0) {
            throw new IllegalArgumentException("Mantenha ao menos um ROLE_TENANT_ADMIN ativo no tenant.");
        }
    }

    private long countOtherActiveTenantAdmins(User targetUser) {
        UUID tenantId = targetUser.getTenant() != null
                ? targetUser.getTenant().getId()
                : AuthUtils.getRequiredCurrentTenantId();

        return repository.findByTenantId(tenantId).stream()
                .filter(candidate -> !candidate.getId().equals(targetUser.getId()))
                .filter(candidate -> Boolean.TRUE.equals(candidate.getActive()))
                .filter(candidate -> hasRole(candidate, RoleName.ROLE_TENANT_ADMIN))
                .count();
    }

    private boolean isApprovalPending(User user) {
        return Boolean.TRUE.equals(user.getVerified())
                && !Boolean.TRUE.equals(user.getActive())
                && user.getOwner() == null;
    }

    private boolean isTenantManagementRole(RoleName roleName) {
        return RoleName.ROLE_ADMIN.equals(roleName) || RoleName.ROLE_TENANT_ADMIN.equals(roleName);
    }

    private boolean hasRole(User user, RoleName roleName) {
        return user.getRoles().stream().anyMatch(role -> roleName.equals(role.getName()));
    }

    private boolean hasTenantManagementRole(User user) {
        return user.getRoles().stream().anyMatch(role -> isTenantManagementRole(role.getName()));
    }
}
