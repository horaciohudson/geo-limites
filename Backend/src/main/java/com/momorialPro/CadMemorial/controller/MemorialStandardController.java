package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.MemorialStandardCreateDTO;
import com.momorialPro.CadMemorial.dto.MemorialStandardDTO;
import com.momorialPro.CadMemorial.security.AuthUtils;
import com.momorialPro.CadMemorial.service.MemorialStandardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/memorial-standards")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Memorial Standards", description = "Gerenciamento de normas e templates para memoriais")
public class MemorialStandardController {

    private final MemorialStandardService memorialStandardService;

    @GetMapping
    @Operation(summary = "Listar normas disponíveis para o usuário")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<MemorialStandardDTO>> getAvailableStandards() {
        UUID userId = AuthUtils.getCurrentUserId();
        List<MemorialStandardDTO> standards = memorialStandardService.findAvailableForUser(userId);
        return ResponseEntity.ok(standards);
    }

    @GetMapping("/default")
    @Operation(summary = "Obter norma padrão")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<MemorialStandardDTO> getDefaultStandard() {
        return memorialStandardService.findDefault()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obter norma por ID")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<MemorialStandardDTO> getStandardById(@PathVariable UUID id) {
        return memorialStandardService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Criar nova norma")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<MemorialStandardDTO> createStandard(@RequestBody MemorialStandardCreateDTO createDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        MemorialStandardDTO created = memorialStandardService.create(createDTO, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar norma existente")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<MemorialStandardDTO> updateStandard(
            @PathVariable UUID id,
            @RequestBody MemorialStandardCreateDTO updateDTO) {
        UUID userId = AuthUtils.getCurrentUserId();
        MemorialStandardDTO updated = memorialStandardService.update(id, updateDTO, userId);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Deletar norma")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Void> deleteStandard(@PathVariable UUID id) {
        UUID userId = AuthUtils.getCurrentUserId();
        memorialStandardService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}