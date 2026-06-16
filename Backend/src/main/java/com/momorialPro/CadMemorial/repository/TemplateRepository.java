package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.Template;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TemplateRepository extends JpaRepository<Template, UUID> {

    List<Template> findByOwnerIdAndStatus(UUID ownerId, Template.TemplateStatus status);

    List<Template> findByOwnerId(UUID ownerId);

    List<Template> findByStatus(Template.TemplateStatus status);

    List<Template> findByMunicipalityAndStatus(String municipality, Template.TemplateStatus status);

    List<Template> findByAbntNormAndStatus(String abntNorm, Template.TemplateStatus status);

    List<Template> findByMemorialStandardIdAndStatus(UUID memorialStandardId, Template.TemplateStatus status);

    @Query("SELECT t FROM Template t WHERE t.ownerId = :ownerId OR (t.status = 'ACTIVE' AND t.ownerId IN (" +
           "SELECT u.id FROM User u WHERE u.tenant.id = :tenantId))")
    List<Template> findAvailableForUser(@Param("ownerId") UUID ownerId, @Param("tenantId") UUID tenantId);

    @Query("SELECT t FROM Template t WHERE t.id = :id AND t.ownerId IN (" +
           "SELECT u.id FROM User u WHERE u.tenant.id = :tenantId)")
    Optional<Template> findByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    @Query("SELECT t FROM Template t WHERE t.status = :status AND t.ownerId IN (" +
           "SELECT u.id FROM User u WHERE u.tenant.id = :tenantId)")
    List<Template> findByTenantIdAndStatus(@Param("tenantId") UUID tenantId, @Param("status") Template.TemplateStatus status);

    @Query("SELECT t FROM Template t WHERE t.municipality = :municipality AND t.status = :status AND t.ownerId IN (" +
           "SELECT u.id FROM User u WHERE u.tenant.id = :tenantId)")
    List<Template> findByTenantIdAndMunicipalityAndStatus(@Param("tenantId") UUID tenantId, @Param("municipality") String municipality, @Param("status") Template.TemplateStatus status);

    @Query("SELECT t FROM Template t WHERE t.abntNorm = :abntNorm AND t.status = :status AND t.ownerId IN (" +
           "SELECT u.id FROM User u WHERE u.tenant.id = :tenantId)")
    List<Template> findByTenantIdAndAbntNormAndStatus(@Param("tenantId") UUID tenantId, @Param("abntNorm") String abntNorm, @Param("status") Template.TemplateStatus status);

    @Query("SELECT t FROM Template t WHERE t.memorialStandardId = :memorialStandardId AND t.status = :status AND t.ownerId IN (" +
           "SELECT u.id FROM User u WHERE u.tenant.id = :tenantId)")
    List<Template> findByTenantIdAndMemorialStandardIdAndStatus(@Param("tenantId") UUID tenantId, @Param("memorialStandardId") UUID memorialStandardId, @Param("status") Template.TemplateStatus status);

    boolean existsByNameAndOwnerId(String name, UUID ownerId);
}
