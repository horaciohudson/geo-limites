package com.momorialPro.CadMemorial.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCreditPackageRequest {
    @NotBlank(message = "O identificador do pacote e obrigatorio")
    private String id;

    @NotBlank(message = "O nome do pacote e obrigatorio")
    private String name;

    @NotNull(message = "A quantidade base de creditos e obrigatoria")
    @Min(value = 1, message = "O pacote precisa ter ao menos 1 credito")
    private Integer baseCredits;

    @NotNull(message = "O bonus de creditos e obrigatorio")
    @Min(value = 0, message = "O bonus nao pode ser negativo")
    private Integer bonusCredits;

    @NotNull(message = "O preco do pacote e obrigatorio")
    @DecimalMin(value = "0.01", message = "O preco do pacote deve ser maior que zero")
    private BigDecimal price;

    @NotNull(message = "Informe se o pacote e destaque")
    private Boolean popular;
}
