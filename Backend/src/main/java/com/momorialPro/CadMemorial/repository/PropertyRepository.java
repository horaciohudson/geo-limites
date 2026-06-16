package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PropertyRepository extends JpaRepository<Property, UUID> {
    
    // Find active properties by user
    List<Property> findByUserIdAndActiveTrueOrderByCreatedAtDesc(UUID userId);
    List<Property> findByTenantIdAndActiveTrueOrderByCreatedAtDesc(UUID tenantId);
    List<Property> findByTenantIdAndUserIdAndActiveTrueOrderByCreatedAtDesc(UUID tenantId, UUID userId);
    
    // Find specific property by ID and user
    Optional<Property> findByPropertyIdAndUserIdAndActiveTrue(UUID propertyId, UUID userId);
    Optional<Property> findByPropertyIdAndTenantIdAndActiveTrue(UUID propertyId, UUID tenantId);
    Optional<Property> findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(UUID propertyId, UUID tenantId, UUID userId);
    
    // Find by name (to avoid duplicates)
    List<Property> findByNameContainingIgnoreCaseAndUserIdAndActiveTrue(String name, UUID userId);
    List<Property> findByNameContainingIgnoreCaseAndTenantIdAndUserIdAndActiveTrue(String name, UUID tenantId, UUID userId);
    
    // Find by city/state
    List<Property> findByCityIgnoreCaseAndStateIgnoreCaseAndUserIdAndActiveTrueOrderByName(
            String city, String state, UUID userId);
    List<Property> findByCityIgnoreCaseAndStateIgnoreCaseAndTenantIdAndUserIdAndActiveTrueOrderByName(
            String city, String state, UUID tenantId, UUID userId);
    
    // Find by owner name
    List<Property> findByOwnerNameContainingIgnoreCaseAndUserIdAndActiveTrueOrderByName(
            String ownerName, UUID userId);
    List<Property> findByOwnerNameContainingIgnoreCaseAndTenantIdAndUserIdAndActiveTrueOrderByName(
            String ownerName, UUID tenantId, UUID userId);
    
    // Count properties by user
    long countByUserIdAndActiveTrue(UUID userId);
    long countByTenantIdAndUserIdAndActiveTrue(UUID tenantId, UUID userId);
    
    // Find with relationships loaded (fixed MultipleBagFetchException)
    @Query("SELECT p FROM Property p " +
           "LEFT JOIN FETCH p.landmarks " +
           "WHERE p.propertyId = :propertyId AND p.user.id = :userId AND p.tenant.id = :tenantId AND p.active = true")
    Optional<Property> findByIdWithRelationships(@Param("propertyId") UUID propertyId, @Param("userId") UUID userId, @Param("tenantId") UUID tenantId);
    
    // Find recent properties
    @Query("SELECT p FROM Property p " +
           "WHERE p.user.id = :userId AND p.tenant.id = :tenantId AND p.active = true " +
           "ORDER BY p.updatedAt DESC")
    List<Property> findRecentByUser(@Param("userId") UUID userId, @Param("tenantId") UUID tenantId);
}
