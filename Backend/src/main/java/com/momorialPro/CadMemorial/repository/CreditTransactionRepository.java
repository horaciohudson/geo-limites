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
     * Busca todas as transações de um usuário ordenadas por data (mais recentes primeiro)
     */
    List<CreditTransaction> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Busca transações de um usuário com paginação
     */
    Page<CreditTransaction> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    /**
     * Busca transações de um usuário por tipo
     */
    List<CreditTransaction> findByUserIdAndTypeOrderByCreatedAtDesc(UUID userId, CreditTransactionType type);

    /**
     * Busca transações de um usuário em um período específico
     */
    List<CreditTransaction> findByUserIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            UUID userId, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Conta o total de transações de um usuário
     */
    long countByUserId(UUID userId);

    /**
     * Soma o total de créditos comprados por um usuário
     */
    @Query("SELECT COALESCE(SUM(ct.amount), 0) FROM CreditTransaction ct " +
           "WHERE ct.userId = :userId AND ct.type = 'PURCHASE'")
    Integer sumPurchasedCreditsByUserId(@Param("userId") UUID userId);

    /**
     * Soma o total de créditos usados por um usuário
     */
    @Query("SELECT COALESCE(SUM(ct.amount), 0) FROM CreditTransaction ct " +
           "WHERE ct.userId = :userId AND ct.type = 'USE'")
    Integer sumUsedCreditsByUserId(@Param("userId") UUID userId);

    /**
     * Busca as últimas N transações de um usuário
     */
    List<CreditTransaction> findTop10ByUserIdOrderByCreatedAtDesc(UUID userId);
}