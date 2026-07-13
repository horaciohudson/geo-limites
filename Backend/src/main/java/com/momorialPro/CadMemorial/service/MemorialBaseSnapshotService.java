package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.model.FileMetadata;
import com.momorialPro.CadMemorial.model.MemorialBaseSnapshot;
import com.momorialPro.CadMemorial.model.Property;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.FileMetadataRepository;
import com.momorialPro.CadMemorial.repository.MemorialBaseSnapshotRepository;
import com.momorialPro.CadMemorial.repository.PropertyRepository;
import com.momorialPro.CadMemorial.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemorialBaseSnapshotService {

    public static final String GENERATION_STATUS_CORRECTIVE_SNAPSHOT = "CORRECTIVE_SNAPSHOT";

    private final MemorialBaseSnapshotRepository repository;
    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final FileMetadataRepository fileMetadataRepository;

    @Transactional
    public Optional<UUID> saveSnapshot(SaveRequest request) {
        if (request == null || request.getTenantId() == null || request.getUserId() == null) {
            log.warn("Snapshot tecnico ignorado: tenant ou usuario ausente");
            return Optional.empty();
        }

        if (request.getMemorialBaseJson() == null || request.getMemorialBaseJson().isBlank()) {
            log.warn("Snapshot tecnico ignorado: memorial_base_json vazio");
            return Optional.empty();
        }

        User user = userRepository.findByIdAndTenantId(request.getUserId(), request.getTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Usuario da geracao nao encontrado no tenant informado"));

        Property property = null;
        if (request.getPropertyId() != null) {
            property = propertyRepository
                    .findByPropertyIdAndTenantIdAndActiveTrue(request.getPropertyId(), request.getTenantId())
                    .orElse(null);
        }

        FileMetadata file = null;
        if (request.getFileId() != null) {
            file = fileMetadataRepository.findByIdAndTenantId(request.getFileId(), request.getTenantId()).orElse(null);
        }

        MemorialBaseSnapshot snapshot = MemorialBaseSnapshot.builder()
                .tenant(user.getTenant())
                .user(user)
                .property(property)
                .file(file)
                .memorialStandardId(request.getMemorialStandardId())
                .projectName(request.getProjectName())
                .fileName(request.getFileName())
                .pipelineVersion(request.getPipelineVersion() != null ? request.getPipelineVersion() : "memorial-base-v1")
                .estimatedLotCount(request.getEstimatedLotCount())
                .georeferenced(Boolean.TRUE.equals(request.getGeoreferenced()))
                .coordinateSource(request.getCoordinateSource())
                .generationStatus(request.getGenerationStatus() != null ? request.getGenerationStatus() : "GENERATED")
                .generatedAt(request.getGeneratedAt() != null ? request.getGeneratedAt() : LocalDateTime.now())
                .memorialBaseJson(request.getMemorialBaseJson())
                .build();

        MemorialBaseSnapshot saved = repository.save(snapshot);
        return Optional.ofNullable(saved.getId());
    }

    @Transactional(readOnly = true)
    public Optional<MemorialBaseSnapshot> findLatestByProperty(UUID tenantId, UUID propertyId) {
        if (tenantId == null || propertyId == null) {
            return Optional.empty();
        }
        return repository.findByTenantIdAndPropertyPropertyIdOrderByGeneratedAtDesc(tenantId, propertyId).stream()
                .filter(snapshot -> !GENERATION_STATUS_CORRECTIVE_SNAPSHOT.equalsIgnoreCase(snapshot.getGenerationStatus()))
                .findFirst();
    }

    @Transactional(readOnly = true)
    public Optional<MemorialBaseSnapshot> findLatestCorrectiveByProperty(UUID tenantId, UUID propertyId) {
        if (tenantId == null || propertyId == null) {
            return Optional.empty();
        }
        return repository.findByTenantIdAndPropertyPropertyIdOrderByGeneratedAtDesc(tenantId, propertyId).stream()
                .filter(snapshot -> GENERATION_STATUS_CORRECTIVE_SNAPSHOT.equalsIgnoreCase(snapshot.getGenerationStatus()))
                .findFirst();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SaveRequest {
        private UUID tenantId;
        private UUID userId;
        private UUID propertyId;
        private UUID fileId;
        private UUID memorialStandardId;

        private String projectName;
        private String fileName;
        private String pipelineVersion;
        private Integer estimatedLotCount;
        private Boolean georeferenced;
        private String coordinateSource;
        private String generationStatus;
        private LocalDateTime generatedAt;
        private String memorialBaseJson;
    }
}
