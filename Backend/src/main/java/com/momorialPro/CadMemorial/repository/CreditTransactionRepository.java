package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.CreditTransaction;
import com.momorialPro.CadMemorial.enums.CreditTransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repository para gerenciar transações de créditos
 */
@Repository
public interface CreditTransactionRepository extends JpaRepository<CreditTransaction, UUID> {

    /**
     * Busca todas as transações de um tenant ordenadas por data (mais recentes primeiro)
     */
    List<CreditTransaction> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    /**
     * Busca transações de um tenant com paginação
     */
    Page<CreditTransaction> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    /**
     * Busca transações de um tenant por tipo
     */
    List<CreditTransaction> findByTenantIdAndTypeOrderByCreatedAtDesc(UUID tenantId, CreditTransactionType type);

    /**
     * Busca transações de um tenant em um período específico
     */
    List<CreditTransaction> findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            UUID tenantId, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Conta o total de transações de um tenant
     */
    long countByTenantId(UUID tenantId);

    /**
     * Soma o total de créditos comprados por um tenant
     */
    @Query("SELECT COALESCE(SUM(ct.amount), 0) FROM CreditTransaction ct " +
           "WHERE ct.tenantId = :tenantId AND ct.type = 'PURCHASE'")
    Integer sumPurchasedCreditsByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Soma o total de créditos usados por um tenant
     */
    @Query("SELECT COALESCE(SUM(ct.amount), 0) FROM CreditTransaction ct " +
           "WHERE ct.tenantId = :tenantId AND ct.type = 'USE'")
    Integer sumUsedCreditsByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Conta quantas geracoes de memorial ja foram cobradas para o tenant.
     */
    @Query("SELECT COUNT(ct) FROM CreditTransaction ct " +
           "WHERE ct.tenantId = :tenantId AND ct.type = 'USE' " +
           "AND (ct.description LIKE 'Geração de memorial%' OR ct.description LIKE 'Geracao de memorial%')")
    long countMemorialGenerationsByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Soma os creditos consumidos em geracoes de memorial para o tenant.
     */
    @Query("SELECT COALESCE(SUM(ct.amount), 0) FROM CreditTransaction ct " +
           "WHERE ct.tenantId = :tenantId AND ct.type = 'USE' " +
           "AND (ct.description LIKE 'Geração de memorial%' OR ct.description LIKE 'Geracao de memorial%')")
    Integer sumMemorialCreditsUsedByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Data da ultima geracao de memorial cobrada para o tenant.
     */
    @Query("SELECT MAX(ct.createdAt) FROM CreditTransaction ct " +
           "WHERE ct.tenantId = :tenantId AND ct.type = 'USE' " +
           "AND (ct.description LIKE 'Geração de memorial%' OR ct.description LIKE 'Geracao de memorial%')")
    LocalDateTime findLastMemorialGenerationAtByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Busca as últimas N transações de um tenant
     */
    List<CreditTransaction> findTop10ByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
