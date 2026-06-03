package com.momorialPro.CadMemorial.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO para retornar o saldo de créditos do usuário
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditBalanceDTO {
    
    private UUID userId;
    private Integer totalCredits;
    private LocalDateTime lastUpdated;
    
    /**
     * Construtor simplificado
     */
    public CreditBalanceDTO(Integer totalCredits) {
        this.totalCredits = totalCredits;
    }
}