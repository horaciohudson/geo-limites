package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.UserCredits;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository para gerenciar saldos de créditos dos tenants
 */
@Repository
public interface UserCreditsRepository extends JpaRepository<UserCredits, UUID> {

    /**
     * Busca o saldo de créditos de um tenant específico
     */
    Optional<UserCredits> findByTenantId(UUID tenantId);

    /**
     * Verifica se um tenant já possui registro de créditos
     */
    boolean existsByTenantId(UUID tenantId);

    /**
     * Busca apenas o total de créditos de um tenant (otimizado)
     */
    @Query("SELECT uc.totalCredits FROM UserCredits uc WHERE uc.tenantId = :tenantId")
    Optional<Integer> findTotalCreditsByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Atualiza o saldo de créditos de um tenant
     */
    @Query("UPDATE UserCredits uc SET uc.totalCredits = :totalCredits WHERE uc.tenantId = :tenantId")
    int updateTotalCreditsByTenantId(@Param("tenantId") UUID tenantId, @Param("totalCredits") Integer totalCredits);
}
