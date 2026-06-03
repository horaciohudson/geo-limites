package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.*;
import com.momorialPro.CadMemorial.model.Template;
import com.momorialPro.CadMemorial.security.AuthUtils;
import com.momorialPro.CadMemorial.service.TemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Templates", description = "Gerenciamento de templates gerados por IA")
public class TemplateController {

    private final TemplateService templateService;

    @Value("${memorialpro.storage.templates-dir:templates}")
    private String templatesDir;

    @GetMapping
    @Operation(summary = "Listar templates disponíveis para o usuário")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<TemplateDTO>> getAvailableTemplates(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String municipality,
            @RequestParam(required = false) String abntNorm,
            @RequestParam(required = false) UUID memorialStandardId) {
        
        UUID userId = AuthUtils.getCurrentUserId();
        
        if (municipality != null) {
            return ResponseEntity.ok(templateService.findByMunicipality(municipality));
        }
        
        if (abntNorm != null) {
            return ResponseEntity.ok(templateService.findByAbntNorm(abntNorm));
        }
        
        if (memorialStandardId != null) {
            return ResponseEntity.ok(templateService.findByMemorialStandard(memorialStandardId));
        }
        
        if ("ACTIVE".equals(status)) {
            return ResponseEntity.ok(templateService.findActive());
        }
        
        List<TemplateDTO> templates = templateService.findAvailableForUser(userId);
        return ResponseEntity.ok(templates);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obter template por ID")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<TemplateDTO> getTemplateById(@PathVariable UUID id) {
        return templateService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Criar novo template")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<TemplateDTO> createTemplate(@RequestBody TemplateCreateDTO createDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        TemplateDTO created = templateService.create(createDTO, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar template existente")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<TemplateDTO> updateTemplate(
            @PathVariable UUID id,
            @RequestBody TemplateCreateDTO updateDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        TemplateDTO updated = templateService.update(id, updateDTO, userId);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Deletar template")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        UUID userId = AuthUtils.getCurrentUserId();
        templateService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Atualizar status do template")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<TemplateDTO> updateTemplateStatus(
            @PathVariable UUID id,
            @RequestBody StatusUpdateRequest request) {
        UUID userId = AuthUtils.getCurrentUserId();
        TemplateDTO updated = templateService.updateStatus(id, request.getStatus(), userId);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/generate")
    @Operation(summary = "Gerar template usando IA a partir de arquivo de exemplo")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<TemplateGenerationResponseDTO> generateTemplate(
            @RequestParam("exampleFile") MultipartFile file,
            @RequestParam("name") String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "municipality", required = false) String municipality,
            @RequestParam(value = "abntNorm", required = false) String abntNorm,
            @RequestParam(value = "memorialStandardId", required = false) UUID memorialStandardId) {
        
        try {
            UUID userId = AuthUtils.getCurrentUserId();
            
            // Validações básicas
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            
            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            
            // Verificar se já existe template com mesmo nome
            if (templateService.existsByName(name.trim(), userId)) {
                log.warn("Template com nome '{}' já existe para o usuário {}", name, userId);
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            
            TemplateGenerationRequestDTO request = TemplateGenerationRequestDTO.builder()
                    .name(name.trim())
                    .description(description)
                    .municipality(municipality)
                    .abntNorm(abntNorm)
                    .memorialStandardId(memorialStandardId)
                    .targetFolderPath(templatesDir)
                    .build();
            
            TemplateGenerationResponseDTO response = templateService.generateTemplate(file, request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IllegalArgumentException e) {
            log.error("Erro de validação ao gerar template: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Erro interno ao gerar template", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "Download do arquivo do template")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Resource> downloadTemplate(@PathVariable UUID id) {
        try {
            TemplateDTO template = templateService.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Template não encontrado"));
            
            Path filePath = Paths.get(template.getFilePath());
            Resource resource = new UrlResource(filePath.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, 
                                "attachment; filename=\"" + resource.getFilename() + "\"")
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            log.error("Erro ao criar URL do arquivo", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/exists")
    @Operation(summary = "Verificar se template existe")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Boolean> templateExists(
            @RequestParam String name,
            @RequestParam(required = false) String municipality,
            @RequestParam(required = false) String abntNorm) {
        
        UUID userId = AuthUtils.getCurrentUserId();
        boolean exists = templateService.existsByName(name, userId);
        return ResponseEntity.ok(exists);
    }

    // Classe interna para request de atualização de status
    public static class StatusUpdateRequest {
        private Template.TemplateStatus status;
        
        public Template.TemplateStatus getStatus() {
            return status;
        }
        
        public void setStatus(Template.TemplateStatus status) {
            this.status = status;
        }
    }
}
