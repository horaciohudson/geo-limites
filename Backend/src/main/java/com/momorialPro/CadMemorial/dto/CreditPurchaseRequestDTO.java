package com.momorialPro.CadMemorial.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO para requisição de compra de créditos
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditPurchaseRequestDTO {
    
    @NotNull(message = "Quantidade de créditos é obrigatória")
    @Min(value = 1, message = "Quantidade mínima é 1 crédito")
    private Integer credits;
    
    @NotNull(message = "Valor em reais é obrigatório")
    @DecimalMin(value = "0.01", message = "Valor mínimo é R$ 0,01")
    private BigDecimal amountReais;
    
    private String paymentProvider = "default";
}