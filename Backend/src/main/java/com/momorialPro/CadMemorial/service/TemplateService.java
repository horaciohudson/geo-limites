package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.*;
import com.momorialPro.CadMemorial.model.Template;
import com.momorialPro.CadMemorial.repository.TemplateRepository;
import com.momorialPro.CadMemorial.repository.UserRepository;
import com.momorialPro.CadMemorial.security.AuthUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.momorialPro.CadMemorial.model.User;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TemplateService {

    private final TemplateRepository templateRepository;
    private final UserRepository userRepository;

    public List<TemplateDTO> findAll() {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return templateRepository.findByTenantIdAndStatus(tenantId, Template.TemplateStatus.ACTIVE).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<TemplateDTO> findActive() {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return templateRepository.findByTenantIdAndStatus(tenantId, Template.TemplateStatus.ACTIVE).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<TemplateDTO> findAvailableForUser(UUID userId) {
        UUID tenantId = requireTenantId(userId);
        return templateRepository.findAvailableForUser(userId, tenantId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public Optional<TemplateDTO> findById(UUID id) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return templateRepository.findByIdAndTenantId(id, tenantId)
                .map(this::convertToDTO);
    }

    public List<TemplateDTO> findByMunicipality(String municipality) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return templateRepository.findByTenantIdAndMunicipalityAndStatus(tenantId, municipality, Template.TemplateStatus.ACTIVE).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<TemplateDTO> findByAbntNorm(String abntNorm) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return templateRepository.findByTenantIdAndAbntNormAndStatus(tenantId, abntNorm, Template.TemplateStatus.ACTIVE).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<TemplateDTO> findByMemorialStandard(UUID memorialStandardId) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return templateRepository.findByTenantIdAndMemorialStandardIdAndStatus(tenantId, memorialStandardId, Template.TemplateStatus.ACTIVE).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public TemplateDTO create(TemplateCreateDTO createDTO, UUID ownerId) {
        if (templateRepository.existsByNameAndOwnerId(createDTO.getName(), ownerId)) {
            throw new IllegalArgumentException("Já existe um template com este nome para este usuário");
        }

        Template template = Template.builder()
                .name(createDTO.getName())
                .description(createDTO.getDescription())
                .fileUrl(createDTO.getFileUrl())
                .filePath(createDTO.getFilePath())
                .memorialStandardId(createDTO.getMemorialStandardId())
                .municipality(createDTO.getMunicipality())
                .abntNorm(createDTO.getAbntNorm())
                .status(createDTO.getStatus() != null ? createDTO.getStatus() : Template.TemplateStatus.ACTIVE)
                .ownerId(ownerId)
                .build();

        Template saved = templateRepository.save(template);
        return convertToDTO(saved);
    }

    public TemplateDTO update(UUID id, TemplateCreateDTO updateDTO, UUID ownerId) {
        UUID tenantId = requireTenantId(ownerId);
        Template template = templateRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Template não encontrado"));

        if (!template.getOwnerId().equals(ownerId)) {
            throw new IllegalArgumentException("Você não tem permissão para editar este template");
        }

        template.setName(updateDTO.getName());
        template.setDescription(updateDTO.getDescription());
        template.setFileUrl(updateDTO.getFileUrl());
        template.setFilePath(updateDTO.getFilePath());
        template.setMemorialStandardId(updateDTO.getMemorialStandardId());
        template.setMunicipality(updateDTO.getMunicipality());
        template.setAbntNorm(updateDTO.getAbntNorm());
        if (updateDTO.getStatus() != null) {
            template.setStatus(updateDTO.getStatus());
        }

        Template saved = templateRepository.save(template);
        return convertToDTO(saved);
    }

    public void delete(UUID id, UUID ownerId) {
        UUID tenantId = requireTenantId(ownerId);
        Template template = templateRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Template não encontrado"));

        if (!template.getOwnerId().equals(ownerId)) {
            throw new IllegalArgumentException("Você não tem permissão para deletar este template");
        }

        templateRepository.delete(template);
    }

    public TemplateDTO updateStatus(UUID id, Template.TemplateStatus status, UUID ownerId) {
        UUID tenantId = requireTenantId(ownerId);
        Template template = templateRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Template não encontrado"));

        if (!template.getOwnerId().equals(ownerId)) {
            throw new IllegalArgumentException("Você não tem permissão para alterar o status deste template");
        }

        template.setStatus(status);
        Template saved = templateRepository.save(template);
        return convertToDTO(saved);
    }

    public TemplateGenerationResponseDTO generateTemplate(MultipartFile file, TemplateGenerationRequestDTO request, UUID ownerId) {
        try {
            // Salvar arquivo temporariamente
            String fileName = file.getOriginalFilename();
            String fileExtension = fileName.substring(fileName.lastIndexOf("."));
            String uniqueFileName = UUID.randomUUID().toString() + fileExtension;
            
            // Definir diretório de templates (pode ser configurável)
            String templatesDir = request.getTargetFolderPath() != null ? 
                request.getTargetFolderPath() : "templates";
            Path templatePath = Paths.get(templatesDir, uniqueFileName);
            
            // Criar diretório se não existir
            Files.createDirectories(templatePath.getParent());
            
            // Salvar arquivo
            Files.copy(file.getInputStream(), templatePath);
            
            // Criar template no banco
            TemplateCreateDTO createDTO = TemplateCreateDTO.builder()
                    .name(request.getName())
                    .description(request.getDescription())
                    .fileUrl("/templates/" + uniqueFileName)
                    .filePath(templatePath.toString())
                    .memorialStandardId(request.getMemorialStandardId())
                    .municipality(request.getMunicipality())
                    .abntNorm(request.getAbntNorm())
                    .status(Template.TemplateStatus.ACTIVE)
                    .build();
            
            TemplateDTO created = create(createDTO, ownerId);

            return TemplateGenerationResponseDTO.builder()
                    .id(created.getId())
                    .name(created.getName())
                    .fileUrl(created.getFileUrl())
                    .filePath(created.getFilePath())
                    .message("Template gerado com sucesso!")
                    .build();
                    
        } catch (IOException e) {
            log.error("Erro ao salvar arquivo do template", e);
            throw new RuntimeException("Erro ao processar arquivo do template", e);
        }
    }

    public boolean existsByName(String name, UUID ownerId) {
        return templateRepository.existsByNameAndOwnerId(name, ownerId);
    }

    private TemplateDTO convertToDTO(Template template) {
        UUID tenantId = AuthUtils.getCurrentTenantId();
        String ownerName = (tenantId == null
                ? userRepository.findById(template.getOwnerId())
                : userRepository.findByIdAndTenantId(template.getOwnerId(), tenantId))
                .map(User::getUsername)
                .orElse("Usuário não encontrado");

        return TemplateDTO.builder()
                .id(template.getId())
                .name(template.getName())
                .description(template.getDescription())
                .fileUrl(template.getFileUrl())
                .filePath(template.getFilePath())
                .memorialStandardId(template.getMemorialStandardId())
                .municipality(template.getMunicipality())
                .abntNorm(template.getAbntNorm())
                .status(template.getStatus())
                .ownerId(template.getOwnerId())
                .ownerName(ownerName)
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }

    private UUID requireTenantId(UUID userId) {
        return userRepository.findById(userId)
                .map(User::getTenant)
                .map(tenant -> tenant != null ? tenant.getId() : null)
                .orElseThrow(() -> new IllegalArgumentException("Usuário sem tenant válido"));
    }
}
