package com.momorialPro.CadMemorial.model;

import com.momorialPro.CadMemorial.enums.CreditPurchaseStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entidade que representa uma compra de créditos
 * Tabela: tab_credit_purchases
 */
@Entity
@Table(name = "tab_credit_purchases")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditPurchase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "amount_reais", nullable = false, precision = 10, scale = 2)
    private BigDecimal amountReais;

    @Column(name = "credits_purchased", nullable = false)
    private Integer creditsPurchased;

    @Column(name = "payment_provider")
    private String paymentProvider;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CreditPurchaseStatus status = CreditPurchaseStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Construtor para criar nova compra
     */
    public CreditPurchase(UUID userId, BigDecimal amountReais, Integer creditsPurchased, String paymentProvider) {
        this.userId = userId;
        this.amountReais = amountReais;
        this.creditsPurchased = creditsPurchased;
        this.paymentProvider = paymentProvider;
        this.status = CreditPurchaseStatus.PENDING;
    }

    /**
     * Marca a compra como paga
     */
    public void markAsPaid() {
        this.status = CreditPurchaseStatus.PAID;
    }

    /**
     * Marca a compra como falha
     */
    public void markAsFailed() {
        this.status = CreditPurchaseStatus.FAILED;
    }

    /**
     * Verifica se a compra está pendente
     */
    public boolean isPending() {
        return CreditPurchaseStatus.PENDING.equals(this.status);
    }

    /**
     * Verifica se a compra foi paga
     */
    public boolean isPaid() {
        return CreditPurchaseStatus.PAID.equals(this.status);
    }

    /**
     * Verifica se a compra falhou
     */
    public boolean isFailed() {
        return CreditPurchaseStatus.FAILED.equals(this.status);
    }
}