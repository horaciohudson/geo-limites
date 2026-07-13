package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.FileMetadataDTO;
import com.momorialPro.CadMemorial.dto.PropertyLandmarkDTO;
import com.momorialPro.CadMemorial.mapper.FileMetadataMapper;
import com.momorialPro.CadMemorial.model.FileMetadata;
import com.momorialPro.CadMemorial.service.CoordinateExtractionService;
import com.momorialPro.CadMemorial.service.FileMetadataService;
import com.momorialPro.CadMemorial.service.TenantOperationalAccessService;
import com.momorialPro.CadMemorial.util.DxfParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dxf")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class FileMetadataController {

    private final FileMetadataService fileService;
    private final FileMetadataMapper mapper;
    private final TenantOperationalAccessService tenantOperationalAccessService;
    private final CoordinateExtractionService coordinateExtractionService;

    /** Upload de arquivo DXF, associando automaticamente ao usuário autenticado */
    @PostMapping("/upload")
    public ResponseEntity<List<FileMetadataDTO>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(name = "propertyId", required = false) UUID propertyId,
            @RequestParam(name = "primaryForProperty", required = false) Boolean primaryForProperty
    ) {
        tenantOperationalAccessService.assertPreparationAccessAllowed();
        try {
            // #region debug-point A:upload-entry
            reportDxfUpload500Debug("A", "[DEBUG] upload endpoint called", Map.of(
                    "originalName", file != null ? String.valueOf(file.getOriginalFilename()) : "null",
                    "isEmpty", file == null || file.isEmpty(),
                    "propertyId", propertyId == null ? "null" : propertyId.toString(),
                    "primaryForProperty", primaryForProperty == null ? "null" : primaryForProperty.toString()
            ));
            // #endregion
            FileMetadata saved = fileService.store(file, propertyId, primaryForProperty);
            // #region debug-point A:upload-success
            reportDxfUpload500Debug("A", "[DEBUG] upload endpoint completed", Map.of(
                    "savedFileId", saved != null && saved.getId() != null ? saved.getId().toString() : "null",
                    "savedPropertyId", saved != null && saved.getProperty() != null && saved.getProperty().getPropertyId() != null
                            ? saved.getProperty().getPropertyId().toString()
                            : "null",
                    "savedPrimaryForProperty", saved != null && saved.getPrimaryForProperty() != null
                            ? saved.getPrimaryForProperty().toString()
                            : "null"
            ));
            // #endregion
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(List.of(mapper.toDTO(saved)));
        } catch (IllegalArgumentException e) {
            // #region debug-point A:upload-bad-request
            reportDxfUpload500Debug("A", "[DEBUG] upload endpoint rejected request", Map.of(
                    "propertyId", propertyId == null ? "null" : propertyId.toString(),
                    "message", e.getMessage() == null ? "null" : e.getMessage()
            ));
            // #endregion
            return ResponseEntity.badRequest().body(List.of(new FileMetadataDTO(null, e.getMessage())));
        } catch (Exception e) {
            // #region debug-point A:upload-error
            reportDxfUpload500Debug("A", "[DEBUG] upload endpoint failed", Map.of(
                    "propertyId", propertyId == null ? "null" : propertyId.toString(),
                    "errorType", e.getClass().getSimpleName(),
                    "message", e.getMessage() == null ? "null" : e.getMessage()
            ));
            // #endregion
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /** Lista apenas os arquivos do usuário autenticado */
    @GetMapping("/my-files")
    public ResponseEntity<List<FileMetadataDTO>> listMyFiles(
            @RequestParam(name = "propertyId", required = false) UUID propertyId
    ) {
        tenantOperationalAccessService.assertPreparationAccessAllowed();
        List<FileMetadata> files = fileService.list(propertyId);
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

    /** Extrai pontos nomeados do DXF para preencher a grade de landmarks */
    @GetMapping("/{id}/landmarks")
    public ResponseEntity<List<PropertyLandmarkDTO>> extractLandmarks(@PathVariable UUID id) {
        tenantOperationalAccessService.assertPreparationAccessAllowed();
        // #region debug-point C:backend-entry
        reportDxfImportDebug("C", "extractLandmarks called", Map.of("fileId", id.toString()));
        // #endregion

        FileMetadata meta = fileService.get(id);
        if (meta == null) {
            // #region debug-point C:backend-not-found
            reportDxfImportDebug("C", "file metadata not found", Map.of("fileId", id.toString()));
            // #endregion
            return ResponseEntity.notFound().build();
        }

        try {
            List<Map<String, Object>> entities = parseDxfToEntities(Path.of(meta.getDiskPath()));
            Map<String, CoordinateExtractionService.RealCoordinate> extractedCoordinates =
                    coordinateExtractionService.extractRealCoordinates(entities);
            // #region debug-point C:backend-extraction
            reportDxfImportDebug("C", "backend extraction finished", Map.of(
                    "fileId", id.toString(),
                    "entityCount", entities.size(),
                    "extractedCount", extractedCoordinates.size(),
                    "names", extractedCoordinates.keySet()
            ));
            // #endregion

            List<PropertyLandmarkDTO> landmarks = new ArrayList<>();
            int sequence = 1;

            for (Map.Entry<String, CoordinateExtractionService.RealCoordinate> entry : extractedCoordinates.entrySet()) {
                CoordinateExtractionService.RealCoordinate coordinate = entry.getValue();
                landmarks.add(PropertyLandmarkDTO.builder()
                        .landmarkName(entry.getKey())
                        .landmarkType(resolveLandmarkType(entry.getKey()))
                        .coordinateX(BigDecimal.valueOf(coordinate.getE()))
                        .coordinateY(BigDecimal.valueOf(coordinate.getN()))
                        .description("Importado automaticamente do DXF (" + coordinate.getSource() + ")")
                        .sequenceOrder(sequence++)
                        .build());
            }

            return ResponseEntity.ok(landmarks);
        } catch (Exception e) {
            // #region debug-point C:backend-error
            reportDxfImportDebug("C", "backend extraction failed", Map.of(
                    "fileId", id.toString(),
                    "errorMessage", e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()
            ));
            // #endregion
            log.error("Erro ao extrair landmarks do DXF {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
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

    private List<Map<String, Object>> parseDxfToEntities(Path dxfPath) {
        return DxfParser.parse(dxfPath).stream()
                .map(this::convertEntityToMap)
                .collect(Collectors.toList());
    }

    private Map<String, Object> convertEntityToMap(DxfParser.Entity entity) {
        Map<String, Object> map = new HashMap<>();
        map.put("type", entity.type());
        map.put("layer", entity.layer());
        map.put("fingerprint", entity.fingerprint());

        if (entity.x() != null) map.put("x", entity.x());
        if (entity.y() != null) map.put("y", entity.y());
        if (entity.z() != null) map.put("z", entity.z());
        if (entity.x2() != null) map.put("x2", entity.x2());
        if (entity.y2() != null) map.put("y2", entity.y2());
        if (entity.z2() != null) map.put("z2", entity.z2());
        if (entity.text() != null) map.put("text", entity.text());

        Map<String, Object> properties = new HashMap<>();
        if (entity.text() != null) properties.put("text", entity.text());
        if (entity.x() != null) properties.put("x", entity.x());
        if (entity.y() != null) properties.put("y", entity.y());
        if (entity.textHeight() != null) {
            properties.put("height", entity.textHeight());
            properties.put("textHeight", entity.textHeight());
        }

        if (entity.vertices() != null && !entity.vertices().isEmpty()) {
            List<Map<String, Object>> vertices = entity.vertices().stream()
                    .map(vertex -> {
                        Map<String, Object> vertexMap = new HashMap<>();
                        vertexMap.put("x", vertex.x());
                        vertexMap.put("y", vertex.y());
                        vertexMap.put("id", vertex.id());
                        return vertexMap;
                    })
                    .collect(Collectors.toList());
            properties.put("vertices", vertices);
        }

        if (!properties.isEmpty()) {
            map.put("properties", properties);
        }

        return map;
    }

    private void reportDxfUpload500Debug(String hypothesisId, String msg, Map<String, ?> data) {
        try {
            String payload = "{\"sessionId\":\"dxf-upload-500\",\"runId\":\"pre-fix\",\"hypothesisId\":\"" + hypothesisId +
                    "\",\"location\":\"FileMetadataController.java\",\"msg\":\"" + escapeJson(msg) +
                    "\",\"data\":" + mapToJson(data) + ",\"ts\":" + System.currentTimeMillis() + "}";
            HttpClient.newHttpClient().sendAsync(
                    HttpRequest.newBuilder(URI.create("http://127.0.0.1:7778/event"))
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(payload))
                            .build(),
                    HttpResponse.BodyHandlers.discarding()
            );
        } catch (Exception ignored) {
        }
    }

    private String mapToJson(Map<String, ?> data) {
        return data.entrySet().stream()
                .map(entry -> "\"" + escapeJson(entry.getKey()) + "\":\"" + escapeJson(String.valueOf(entry.getValue())) + "\"")
                .collect(Collectors.joining(",", "{", "}"));
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n");
    }


    private String resolveLandmarkType(String pointName) {
        if (pointName == null) {
            return "REFERENCE_POINT";
        }

        String normalized = pointName.trim().toUpperCase();
        if (normalized.startsWith("V")) {
            return "VERTEX";
        }
        if (normalized.contains("ESTACA")) {
            return "ESTACA";
        }
        return "REFERENCE_POINT";
    }

    // #region debug-point C:backend-report
    private void reportDxfImportDebug(String hypothesisId, String msg, Map<String, Object> data) {
        try {
            String payload = toJsonPayload(hypothesisId, msg, data);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://127.0.0.1:7779/event"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            HttpClient.newHttpClient().sendAsync(request, HttpResponse.BodyHandlers.discarding());
        } catch (Exception ignored) {
        }
    }

    private String toJsonPayload(String hypothesisId, String msg, Map<String, Object> data) {
        String safeMsg = msg.replace("\\", "\\\\").replace("\"", "\\\"");
        return "{"
                + "\"sessionId\":\"dxf-landmarks-import\","
                + "\"runId\":\"pre-fix\","
                + "\"hypothesisId\":\"" + hypothesisId + "\","
                + "\"location\":\"FileMetadataController.java\","
                + "\"msg\":\"[DEBUG] " + safeMsg + "\","
                + "\"data\":\"" + String.valueOf(data).replace("\\", "\\\\").replace("\"", "\\\"") + "\","
                + "\"ts\":" + System.currentTimeMillis()
                + "}";
    }
    // #endregion
}
