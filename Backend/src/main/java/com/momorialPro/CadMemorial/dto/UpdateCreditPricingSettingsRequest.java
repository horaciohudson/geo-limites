package com.momorialPro.CadMemorial.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCreditPricingSettingsRequest {
    @NotNull(message = "Os creditos de boas-vindas sao obrigatorios")
    @Min(value = 0, message = "Os creditos de boas-vindas nao podem ser negativos")
    private Integer welcomeCredits;

    @NotNull(message = "O custo do lote simples e obrigatorio")
    @Min(value = 1, message = "O custo minimo por operacao e 1 credito")
    private Integer singleLotCreditCost;

    @NotNull(message = "O limite de lotes do projeto pequeno e obrigatorio")
    @Min(value = 2, message = "O projeto pequeno deve aceitar ao menos 2 lotes")
    private Integer smallProjectMaxLots;

    @NotNull(message = "O custo do projeto pequeno e obrigatorio")
    @Min(value = 1, message = "O custo minimo por operacao e 1 credito")
    private Integer smallProjectCreditCost;

    @NotNull(message = "O custo do projeto grande e obrigatorio")
    @Min(value = 1, message = "O custo minimo por operacao e 1 credito")
    private Integer largeProjectCreditCost;

    @NotNull(message = "O preco unitario customizado e obrigatorio")
    @DecimalMin(value = "0.01", message = "O preco unitario deve ser maior que zero")
    private BigDecimal customPricePerCredit;

    @Valid
    @NotEmpty(message = "Informe os pacotes de recarga")
    private List<UpdateCreditPackageRequest> packages;
}
