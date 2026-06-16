package com.momorialPro.CadMemorial.dto;

import com.momorialPro.CadMemorial.enums.CreditPurchaseStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO para resposta de compra de créditos
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditPurchaseResponseDTO {
    
    private UUID id;
    private Integer creditsPurchased;
    private BigDecimal amountReais;
    private String paymentProvider;
    private CreditPurchaseStatus status;
    private LocalDateTime createdAt;
    private String message;
    
    /**
     * Construtor para resposta de sucesso
     */
    public CreditPurchaseResponseDTO(UUID id, Integer creditsPurchased, BigDecimal amountReais, 
                                   CreditPurchaseStatus status, String message) {
        this.id = id;
        this.creditsPurchased = creditsPurchased;
        this.amountReais = amountReais;
        this.status = status;
        this.message = message;
    }
}