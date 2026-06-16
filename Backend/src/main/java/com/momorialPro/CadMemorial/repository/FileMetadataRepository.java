package com.momorialPro.CadMemorial.repository;






import com.momorialPro.CadMemorial.model.FileMetadata;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FileMetadataRepository extends JpaRepository<FileMetadata, UUID> {
    List<FileMetadata> findByOwnerUsername(String username);
    List<FileMetadata> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<FileMetadata> findByTenantIdAndOwnerUsernameOrderByCreatedAtDesc(UUID tenantId, String username);
    Optional<FileMetadata> findByIdAndTenantId(UUID id, UUID tenantId);
}
