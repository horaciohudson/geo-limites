package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.MemorialBaseSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MemorialBaseSnapshotRepository extends JpaRepository<MemorialBaseSnapshot, UUID> {

    List<MemorialBaseSnapshot> findByTenantIdOrderByGeneratedAtDesc(UUID tenantId);

    List<MemorialBaseSnapshot> findByTenantIdAndUserIdOrderByGeneratedAtDesc(UUID tenantId, UUID userId);

    List<MemorialBaseSnapshot> findByTenantIdAndPropertyPropertyIdOrderByGeneratedAtDesc(UUID tenantId, UUID propertyId);

    Optional<MemorialBaseSnapshot> findFirstByTenantIdAndPropertyPropertyIdOrderByGeneratedAtDesc(UUID tenantId, UUID propertyId);
}
