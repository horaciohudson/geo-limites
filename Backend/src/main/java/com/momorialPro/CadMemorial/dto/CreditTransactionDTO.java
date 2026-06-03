package com.momorialPro.CadMemorial.dto;

import com.momorialPro.CadMemorial.enums.CreditTransactionType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO para retornar transações de crédito
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditTransactionDTO {
    
    private UUID id;
    private CreditTransactionType type;
    private Integer amount;
    private String description;
    private LocalDateTime createdAt;
    
    /**
     * Construtor simplificado
     */
    public CreditTransactionDTO(CreditTransactionType type, Integer amount, String description, LocalDateTime createdAt) {
        this.type = type;
        this.amount = amount;
        this.description = description;
        this.createdAt = createdAt;
    }
}