package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.FileMetadataDTO;
import com.momorialPro.CadMemorial.mapper.FileMetadataMapper;
import com.momorialPro.CadMemorial.model.FileMetadata;
import com.momorialPro.CadMemorial.service.FileMetadataService;
import com.momorialPro.CadMemorial.service.TenantOperationalAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/dxf")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FileMetadataController {

    private final FileMetadataService fileService;
    private final FileMetadataMapper mapper;
    private final TenantOperationalAccessService tenantOperationalAccessService;

    /** Upload de arquivo DXF, associando automaticamente ao usuário autenticado */
    @PostMapping("/upload")
    public ResponseEntity<List<FileMetadataDTO>> upload(@RequestParam("file") MultipartFile file) {
        tenantOperationalAccessService.assertPreparationAccessAllowed();
        try {
            FileMetadata saved = fileService.store(file);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(List.of(mapper.toDTO(saved)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(List.of(new FileMetadataDTO(null, e.getMessage())));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /** Lista apenas os arquivos do usuário autenticado */
    @GetMapping("/my-files")
    public ResponseEntity<List<FileMetadataDTO>> listMyFiles() {
        tenantOperationalAccessService.assertPreparationAccessAllowed();
        List<FileMetadata> files = fileService.list();
        return ResponseEntity.ok(files.stream().map(mapper::toDTO).toList());
    }

    /** Download do arquivo físico */
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        tenantOperationalAccessService.assertPreparationAccessAllowed();
        FileMetadata meta = fileService.get(id);
        if (meta == null)
            return ResponseEntity.notFound().build();

        Resource res = fileService.loadAsResource(id);
        if (res == null || !res.exists())
            return ResponseEntity.notFound().build();

        String encoded = URLEncoder.encode(meta.getOriginalName(), StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded)
                .contentLength(meta.getSizeBytes())
                .body(res);
    }

    /** Exclui arquivo (somente dono ou ADMIN) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        tenantOperationalAccessService.assertPreparationAccessAllowed();
        try {
            fileService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /** Obtém os metadados de um arquivo específico */
    @GetMapping("/{id}")
    public ResponseEntity<FileMetadataDTO> get(@PathVariable UUID id) {
        tenantOperationalAccessService.assertPreparationAccessAllowed();
        FileMetadata meta = fileService.get(id);
        return meta == null
                ? ResponseEntity.notFound().build()
                : ResponseEntity.ok(mapper.toDTO(meta));
    }

    /** Compara dois arquivos DXF */
    @PostMapping("/compare")
    public ResponseEntity<?> compare(@RequestBody CompareRequestDTO request) {
        tenantOperationalAccessService.assertPreparationAccessAllowed();
        try {
            // Por enquanto, retorna uma resposta simples indicando que a funcionalidade está em desenvolvimento
            return ResponseEntity.ok(Map.of(
                "message", "Funcionalidade de comparação em desenvolvimento",
                "fileIdA", request.getFileIdA(),
                "fileIdB", request.getFileIdB(),
                "status", "pending_implementation"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    // DTO interno para comparação
    public static class CompareRequestDTO {
        private UUID fileIdA;
        private UUID fileIdB;
        
        public UUID getFileIdA() { return fileIdA; }
        public void setFileIdA(UUID fileIdA) { this.fileIdA = fileIdA; }
        public UUID getFileIdB() { return fileIdB; }
        public void setFileIdB(UUID fileIdB) { this.fileIdB = fileIdB; }
    }
}
