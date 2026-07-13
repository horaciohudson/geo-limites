package com.momorialPro.CadMemorial.service;



import com.momorialPro.CadMemorial.model.FileMetadata;
import com.momorialPro.CadMemorial.model.Property;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.FileMetadataRepository;
import com.momorialPro.CadMemorial.repository.PropertyRepository;
import com.momorialPro.CadMemorial.repository.UserRepository;
import com.momorialPro.CadMemorial.security.AuthUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.*;
import java.util.Comparator;
import java.security.MessageDigest;
import java.util.*;



@Service
@RequiredArgsConstructor
public class FileMetadataService {

    private final FileMetadataRepository repository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;

    @Value("${memorialpro.storage.dxf-dir:uploads/dxf}")
    private String dxfDir;

    private Path ensureDir() throws IOException {
        Path dir = Paths.get(dxfDir).toAbsolutePath().normalize();
        Files.createDirectories(dir);
        return dir;
    }

    @Transactional
    public FileMetadata store(MultipartFile file) throws IOException {
        return store(file, null, null);
    }

    @Transactional
    public FileMetadata store(MultipartFile file, UUID propertyId, Boolean primaryForProperty) throws IOException {
        // #region debug-point B:store-entry
        reportDxfUpload500Debug("B", "[DEBUG] store called", Map.of(
                "originalName", file != null ? String.valueOf(file.getOriginalFilename()) : "null",
                "propertyId", propertyId == null ? "null" : propertyId.toString(),
                "primaryForProperty", primaryForProperty == null ? "null" : primaryForProperty.toString()
        ));
        // #endregion
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("Arquivo vazio");

        String original = StringUtils.cleanPath(Objects.requireNonNullElse(file.getOriginalFilename(), "file.dxf"));
        String ext = getExtension(original).toLowerCase();
        if (!ext.equals("dxf"))
            throw new IllegalArgumentException("Somente arquivos .dxf são aceitos");

        Path dir = ensureDir();
        String storedName = UUID.randomUUID() + "." + ext;
        Path target = dir.resolve(storedName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        String sha256 = sha256Hex(Files.readAllBytes(target));

        // --- obtém o usuário logado pelo token JWT ---
        User owner = AuthUtils.getRequiredCurrentUser();
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        Property property = null;
        boolean shouldSetPrimary = false;

        if (propertyId != null) {
            // #region debug-point C:property-lookup
            reportDxfUpload500Debug("C", "[DEBUG] resolving property for uploaded file", Map.of(
                    "propertyId", propertyId.toString(),
                    "tenantId", tenantId.toString(),
                    "ownerId", owner.getId() == null ? "null" : owner.getId().toString()
            ));
            // #endregion
            property = propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, owner.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Imovel nao encontrado para vincular o arquivo tecnico."));

            List<FileMetadata> currentPropertyFiles = repository.findByTenantIdAndPropertyPropertyIdOrderByCreatedAtDesc(tenantId, propertyId);
            shouldSetPrimary = Boolean.TRUE.equals(primaryForProperty) || currentPropertyFiles.isEmpty();
            // #region debug-point C:property-files-loaded
            reportDxfUpload500Debug("C", "[DEBUG] current property files loaded", Map.of(
                    "propertyId", propertyId.toString(),
                    "currentFileCount", String.valueOf(currentPropertyFiles.size()),
                    "shouldSetPrimary", String.valueOf(shouldSetPrimary)
            ));
            // #endregion

            if (shouldSetPrimary) {
                currentPropertyFiles.forEach(existingFile -> existingFile.setPrimaryForProperty(false));
                if (!currentPropertyFiles.isEmpty()) {
                    // #region debug-point D:clear-primary
                    reportDxfUpload500Debug("D", "[DEBUG] clearing previous primary flags", Map.of(
                            "propertyId", propertyId.toString(),
                            "affectedFileCount", String.valueOf(currentPropertyFiles.size())
                    ));
                    // #endregion
                    repository.saveAll(currentPropertyFiles);
                }
            }
        }

        FileMetadata meta = FileMetadata.builder()
                .originalName(original)
                .storedName(storedName)
                .extension(ext)
                .contentType(file.getContentType())
                .sizeBytes(file.getSize())
                .checksumSha256(sha256)
                .diskPath(target.toString())
                .tenant(owner.getTenant())
                .owner(owner)
                .property(property)
                .primaryForProperty(shouldSetPrimary)
                .build();

        // #region debug-point E:store-save
        reportDxfUpload500Debug("E", "[DEBUG] saving file metadata", Map.of(
                "storedName", storedName,
                "propertyResolved", String.valueOf(property != null),
                "primaryForProperty", String.valueOf(shouldSetPrimary)
        ));
        // #endregion
        return repository.save(meta);
    }

    @Transactional(readOnly = true)
    public List<FileMetadata> list() {
        return list(null);
    }

    @Transactional(readOnly = true)
    public List<FileMetadata> list(UUID propertyId) {
        String username = AuthUtils.getCurrentUsername();
        if (username == null)
            throw new IllegalStateException("Usuário não autenticado");

        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        if (propertyId != null) {
            return repository.findByTenantIdAndOwnerUsernameAndPropertyPropertyIdOrderByCreatedAtDesc(
                    tenantId,
                    username,
                    propertyId
            ).stream()
                    .sorted(Comparator
                            .comparing((FileMetadata file) -> !Boolean.TRUE.equals(file.getPrimaryForProperty()))
                            .thenComparing(FileMetadata::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .toList();
        }
        return repository.findByTenantIdAndOwnerUsernameOrderByCreatedAtDesc(tenantId, username);
    }

    @Transactional(readOnly = true)
    public FileMetadata get(UUID id) {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        return repository.findByIdAndTenantId(id, tenantId).orElse(null);
    }

    @Transactional(readOnly = true)
    public Resource loadAsResource(UUID id) {
        FileMetadata meta = get(id);
        if (meta == null)
            return null;
        return new FileSystemResource(meta.getDiskPath());
    }

    @Transactional
    public void delete(UUID id) throws IOException {
        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
        FileMetadata meta = repository.findByIdAndTenantId(id, tenantId).orElse(null);
        if (meta == null)
            return;

        // garante que só o dono ou ADMIN possa excluir
        String username = AuthUtils.getCurrentUsername();
        if (!meta.getOwner().getUsername().equals(username) && !AuthUtils.isCurrentUserAdmin()) {
            throw new SecurityException("Você não tem permissão para excluir este arquivo");
        }

        Path p = Paths.get(meta.getDiskPath());
        repository.deleteById(id);
        Files.deleteIfExists(p);
    }

    private static String getExtension(String filename) {
        int i = filename.lastIndexOf('.');
        return i > 0 ? filename.substring(i + 1) : "";
    }

    private static String sha256Hex(byte[] data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(data));
        } catch (Exception e) {
            throw new RuntimeException("Falha ao calcular SHA-256", e);
        }
    }

    private void reportDxfUpload500Debug(String hypothesisId, String msg, Map<String, ?> data) {
        try {
            String payload = "{\"sessionId\":\"dxf-upload-500\",\"runId\":\"pre-fix\",\"hypothesisId\":\"" + hypothesisId +
                    "\",\"location\":\"FileMetadataService.java\",\"msg\":\"" + escapeJson(msg) +
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
                .collect(java.util.stream.Collectors.joining(",", "{", "}"));
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n");
    }
}
