package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.MemorialStandard;
import com.momorialPro.CadMemorial.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MemorialStandardRepository extends JpaRepository<MemorialStandard, UUID> {

    List<MemorialStandard> findByActiveTrue();

    List<MemorialStandard> findByOwnerAndActiveTrue(User owner);

    @Query("SELECT ms FROM MemorialStandard ms WHERE ms.active = true AND (ms.owner IS NULL OR ms.owner.tenant.id = :tenantId)")
    List<MemorialStandard> findByTenantIdAndActiveTrue(@Param("tenantId") UUID tenantId);

    Optional<MemorialStandard> findByIsDefaultTrueAndActiveTrue();

    @Query("SELECT ms FROM MemorialStandard ms WHERE ms.id = :id AND ms.active = true AND (ms.owner IS NULL OR ms.owner.tenant.id = :tenantId)")
    Optional<MemorialStandard> findByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    @Query("SELECT ms FROM MemorialStandard ms WHERE ms.active = true AND (ms.owner = :owner OR ms.owner IS NULL OR ms.owner.tenant.id = :tenantId) ORDER BY ms.isDefault DESC, ms.name ASC")
    List<MemorialStandard> findAvailableStandards(@Param("owner") User owner, @Param("tenantId") UUID tenantId);

    @Query("SELECT ms FROM MemorialStandard ms WHERE ms.isDefault = true AND ms.active = true AND (ms.owner IS NULL OR ms.owner.tenant.id = :tenantId)")
    Optional<MemorialStandard> findDefaultForTenant(@Param("tenantId") UUID tenantId);

    boolean existsByNameAndOwner(String name, User owner);
}
