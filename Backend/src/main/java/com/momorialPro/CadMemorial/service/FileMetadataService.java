package com.momorialPro.CadMemorial.service;



import com.momorialPro.CadMemorial.model.FileMetadata;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.FileMetadataRepository;
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
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;



@Service
@RequiredArgsConstructor
public class FileMetadataService {

    private final FileMetadataRepository repository;
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
                .build();

        return repository.save(meta);
    }

    @Transactional(readOnly = true)
    public List<FileMetadata> list() {
        String username = AuthUtils.getCurrentUsername();
        if (username == null)
            throw new IllegalStateException("Usuário não autenticado");

        UUID tenantId = AuthUtils.getRequiredCurrentTenantId();
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
}
