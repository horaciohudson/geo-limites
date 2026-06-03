package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    Optional<Tenant> findByCodeIgnoreCase(String code);
    Optional<Tenant> findBySlugIgnoreCase(String slug);
    Optional<Tenant> findBySlug(String slug);
    Optional<Tenant> findByIsDefaultTrue();
}
