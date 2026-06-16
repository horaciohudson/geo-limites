package com.momorialPro.CadMemorial.model;

import com.momorialPro.CadMemorial.enums.CreditTransactionType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entidade que representa uma transação de crédito (compra ou uso)
 * Tabela: tab_credit_transactions
 */
@Entity
@Table(name = "tab_credit_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private CreditTransactionType type;

    @Column(name = "amount", nullable = false)
    private Integer amount;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Construtor para criar nova transação
     */
    public CreditTransaction(UUID userId, CreditTransactionType type, Integer amount, String description) {
        this.userId = userId;
        this.type = type;
        this.amount = amount;
        this.description = description;
    }

    /**
     * Verifica se é uma transação de compra
     */
    public boolean isPurchase() {
        return CreditTransactionType.PURCHASE.equals(this.type);
    }

    /**
     * Verifica se é uma transação de uso
     */
    public boolean isUse() {
        return CreditTransactionType.USE.equals(this.type);
    }
}