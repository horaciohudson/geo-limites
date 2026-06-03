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
     * Busca todas as compras de um usuário ordenadas por data (mais recentes primeiro)
     */
    List<CreditPurchase> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Busca compras de um usuário com paginação
     */
    Page<CreditPurchase> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    /**
     * Busca compras de um usuário por status
     */
    List<CreditPurchase> findByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, CreditPurchaseStatus status);

    /**
     * Busca compras pendentes de um usuário
     */
    List<CreditPurchase> findByUserIdAndStatus(UUID userId, CreditPurchaseStatus status);

    /**
     * Busca uma compra específica de um usuário (para segurança)
     */
    Optional<CreditPurchase> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Busca compras em um período específico
     */
    List<CreditPurchase> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Conta compras por status
     */
    long countByStatus(CreditPurchaseStatus status);

    /**
     * Conta compras de um usuário por status
     */
    long countByUserIdAndStatus(UUID userId, CreditPurchaseStatus status);

    /**
     * Soma o total gasto por um usuário em compras pagas
     */
    @Query("SELECT COALESCE(SUM(cp.amountReais), 0) FROM CreditPurchase cp " +
           "WHERE cp.userId = :userId AND cp.status = 'PAID'")
    Double sumAmountReaisByUserIdAndPaidStatus(@Param("userId") UUID userId);

    /**
     * Soma o total de créditos comprados por um usuário (apenas compras pagas)
     */
    @Query("SELECT COALESCE(SUM(cp.creditsPurchased), 0) FROM CreditPurchase cp " +
           "WHERE cp.userId = :userId AND cp.status = 'PAID'")
    Integer sumCreditsPurchasedByUserIdAndPaidStatus(@Param("userId") UUID userId);

    /**
     * Busca compras pendentes há mais de X horas (para limpeza automática)
     */
    @Query("SELECT cp FROM CreditPurchase cp WHERE cp.status = 'PENDING' " +
           "AND cp.createdAt < :cutoffTime")
    List<CreditPurchase> findPendingPurchasesOlderThan(@Param("cutoffTime") LocalDateTime cutoffTime);
}