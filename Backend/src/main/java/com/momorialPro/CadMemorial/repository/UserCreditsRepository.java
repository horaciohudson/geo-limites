package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.UserCredits;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository para gerenciar saldos de créditos dos usuários
 */
@Repository
public interface UserCreditsRepository extends JpaRepository<UserCredits, UUID> {

    /**
     * Busca o saldo de créditos de um usuário específico
     */
    Optional<UserCredits> findByUserId(UUID userId);

    /**
     * Verifica se um usuário já possui registro de créditos
     */
    boolean existsByUserId(UUID userId);

    /**
     * Busca apenas o total de créditos de um usuário (otimizado)
     */
    @Query("SELECT uc.totalCredits FROM UserCredits uc WHERE uc.userId = :userId")
    Optional<Integer> findTotalCreditsByUserId(@Param("userId") UUID userId);

    /**
     * Atualiza o saldo de créditos de um usuário
     */
    @Query("UPDATE UserCredits uc SET uc.totalCredits = :totalCredits WHERE uc.userId = :userId")
    int updateTotalCreditsByUserId(@Param("userId") UUID userId, @Param("totalCredits") Integer totalCredits);
}