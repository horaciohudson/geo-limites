package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.MemorialStandardCreateDTO;
import com.momorialPro.CadMemorial.dto.MemorialStandardDTO;
import com.momorialPro.CadMemorial.exception.BusinessException;
import com.momorialPro.CadMemorial.model.MemorialStandard;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.MemorialStandardRepository;
import com.momorialPro.CadMemorial.repository.UserRepository;
import com.momorialPro.CadMemorial.security.AuthUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemorialStandardService {

    private final MemorialStandardRepository memorialStandardRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<MemorialStandardDTO> findAllActive() {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return memorialStandardRepository.findByTenantIdAndActiveTrue(tenantId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MemorialStandardDTO> findAvailableForUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));

        UUID tenantId = requireTenantId(user);
        return memorialStandardRepository.findAvailableStandards(user, tenantId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<MemorialStandardDTO> findDefault() {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return memorialStandardRepository.findDefaultForTenant(tenantId)
                .map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public Optional<MemorialStandardDTO> findById(UUID id) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return memorialStandardRepository.findByIdAndTenantId(id, tenantId)
                .map(this::toDTO);
    }

    @Transactional
    public MemorialStandardDTO create(MemorialStandardCreateDTO createDTO, UUID ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        UUID tenantId = requireTenantId(owner);

        if (memorialStandardRepository.existsByNameAndOwner(createDTO.getName(), owner)) {
            throw new BusinessException("Já existe uma norma com este nome para este usuário");
        }

        // Se está marcando como padrão, desmarcar outras
        if (Boolean.TRUE.equals(createDTO.getIsDefault())) {
            memorialStandardRepository.findDefaultForTenant(tenantId)
                    .ifPresent(standard -> {
                        standard.setIsDefault(false);
                        memorialStandardRepository.save(standard);
                    });
        }

        MemorialStandard standard = MemorialStandard.builder()
                .name(createDTO.getName())
                .description(createDTO.getDescription())
                .standardText(createDTO.getStandardText())
                .promptTemplate(createDTO.getPromptTemplate())
                .isDefault(Boolean.TRUE.equals(createDTO.getIsDefault()))
                .active(true)
                .owner(owner)
                .build();

        MemorialStandard saved = memorialStandardRepository.save(standard);
        return toDTO(saved);
    }

    @Transactional
    public MemorialStandardDTO update(UUID id, MemorialStandardCreateDTO updateDTO, UUID ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        UUID tenantId = requireTenantId(owner);

        MemorialStandard standard = memorialStandardRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Norma não encontrada"));

        // Verificar se o usuário pode editar esta norma
        if (standard.getOwner() == null || !standard.getOwner().getId().equals(ownerId)) {
            throw new BusinessException("Você não tem permissão para editar esta norma");
        }

        // Se está marcando como padrão, desmarcar outras
        if (Boolean.TRUE.equals(updateDTO.getIsDefault()) && !standard.getIsDefault()) {
            memorialStandardRepository.findDefaultForTenant(tenantId)
                    .ifPresent(defaultStandard -> {
                        defaultStandard.setIsDefault(false);
                        memorialStandardRepository.save(defaultStandard);
                    });
        }

        standard.setName(updateDTO.getName());
        standard.setDescription(updateDTO.getDescription());
        standard.setStandardText(updateDTO.getStandardText());
        standard.setPromptTemplate(updateDTO.getPromptTemplate());
        standard.setIsDefault(Boolean.TRUE.equals(updateDTO.getIsDefault()));

        MemorialStandard saved = memorialStandardRepository.save(standard);
        return toDTO(saved);
    }

    @Transactional
    public void delete(UUID id, UUID ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        UUID tenantId = requireTenantId(owner);

        MemorialStandard standard = memorialStandardRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Norma não encontrada"));

        // Verificar se o usuário pode deletar esta norma
        if (standard.getOwner() == null || !standard.getOwner().getId().equals(ownerId)) {
            throw new BusinessException("Você não tem permissão para deletar esta norma");
        }

        standard.setActive(false);
        memorialStandardRepository.save(standard);
    }

    private MemorialStandardDTO toDTO(MemorialStandard standard) {
        return MemorialStandardDTO.builder()
                .id(standard.getId())
                .name(standard.getName())
                .description(standard.getDescription())
                .standardText(standard.getStandardText())
                .promptTemplate(standard.getPromptTemplate())
                .active(standard.getActive())
                .isDefault(standard.getIsDefault())
                .ownerId(standard.getOwner() != null ? standard.getOwner().getId() : null)
                .ownerName(standard.getOwner() != null ? standard.getOwner().getFullName() : null)
                .createdAt(standard.getCreatedAt())
                .updatedAt(standard.getUpdatedAt())
                .build();
    }

    private UUID requireTenantId(User user) {
        if (user.getTenant() == null || user.getTenant().getId() == null) {
            throw new BusinessException("Tenant do usuário não configurado");
        }
        return user.getTenant().getId();
    }
}
