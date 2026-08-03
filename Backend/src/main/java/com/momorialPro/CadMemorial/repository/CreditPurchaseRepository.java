package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.CreditPurchase;
import com.momorialPro.CadMemorial.enums.CreditPurchaseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository para gerenciar compras de créditos
 */
@Repository
public interface CreditPurchaseRepository extends JpaRepository<CreditPurchase, UUID> {

    /**
     * Busca todas as compras de um tenant ordenadas por data (mais recentes primeiro)
     */
    List<CreditPurchase> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    /**
     * Busca compras de um tenant com paginação
     */
    Page<CreditPurchase> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    /**
     * Busca compras de um tenant por status
     */
    List<CreditPurchase> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, CreditPurchaseStatus status);

    /**
     * Busca compras pendentes de um tenant
     */
    List<CreditPurchase> findByTenantIdAndStatus(UUID tenantId, CreditPurchaseStatus status);

    /**
     * Busca uma compra específica de um tenant (para segurança)
     */
    Optional<CreditPurchase> findByIdAndTenantId(UUID id, UUID tenantId);

    /**
     * Busca compras em um período específico
     */
    List<CreditPurchase> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Conta compras por status
     */
    long countByStatus(CreditPurchaseStatus status);

    /**
     * Conta compras de um tenant por status
     */
    long countByTenantIdAndStatus(UUID tenantId, CreditPurchaseStatus status);

    /**
     * Soma o total gasto por um tenant em compras pagas
     */
    @Query("SELECT COALESCE(SUM(cp.amountReais), 0) FROM CreditPurchase cp " +
           "WHERE cp.tenantId = :tenantId AND cp.status = 'PAID'")
    Double sumAmountReaisByTenantIdAndPaidStatus(@Param("tenantId") UUID tenantId);

    /**
     * Soma o total de créditos comprados por um tenant (apenas compras pagas)
     */
    @Query("SELECT COALESCE(SUM(cp.creditsPurchased), 0) FROM CreditPurchase cp " +
           "WHERE cp.tenantId = :tenantId AND cp.status = 'PAID'")
    Integer sumCreditsPurchasedByTenantIdAndPaidStatus(@Param("tenantId") UUID tenantId);

    /**
     * Busca compras pendentes há mais de X horas (para limpeza automática)
     */
    @Query("SELECT cp FROM CreditPurchase cp WHERE cp.status = 'PENDING' " +
           "AND cp.createdAt < :cutoffTime")
    List<CreditPurchase> findPendingPurchasesOlderThan(@Param("cutoffTime") LocalDateTime cutoffTime);
}
