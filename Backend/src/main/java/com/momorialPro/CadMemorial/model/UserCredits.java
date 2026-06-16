package com.momorialPro.CadMemorial.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entidade que representa o saldo de créditos de um usuário
 * Tabela: tab_user_credits
 */
@Entity
@Table(name = "tab_user_credits")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserCredits {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "total_credits", nullable = false)
    private Integer totalCredits = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Construtor para criar novo saldo de usuário
     */
    public UserCredits(UUID userId, Integer totalCredits) {
        this.userId = userId;
        this.totalCredits = totalCredits;
    }

    /**
     * Adiciona créditos ao saldo atual
     */
    public void addCredits(Integer credits) {
        this.totalCredits += credits;
    }

    /**
     * Remove créditos do saldo atual
     * @throws IllegalArgumentException se não houver créditos suficientes
     */
    public void subtractCredits(Integer credits) {
        if (this.totalCredits < credits) {
            throw new IllegalArgumentException("Créditos insuficientes. Saldo atual: " + this.totalCredits);
        }
        this.totalCredits -= credits;
    }

    /**
     * Verifica se há créditos suficientes
     */
    public boolean hasEnoughCredits(Integer requiredCredits) {
        return this.totalCredits >= requiredCredits;
    }
}