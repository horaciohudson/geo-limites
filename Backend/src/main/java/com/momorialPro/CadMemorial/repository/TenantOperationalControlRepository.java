package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.TenantOperationalControl;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantOperationalControlRepository extends JpaRepository<TenantOperationalControl, UUID> {
    Optional<TenantOperationalControl> findByTenantId(UUID tenantId);
}
