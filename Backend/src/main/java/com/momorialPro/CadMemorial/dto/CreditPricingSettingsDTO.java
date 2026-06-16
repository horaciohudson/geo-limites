package com.momorialPro.CadMemorial.dto;

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
public class CreditPricingSettingsDTO {
    private Integer welcomeCredits;
    private Integer singleLotCreditCost;
    private Integer smallProjectMaxLots;
    private Integer smallProjectCreditCost;
    private Integer largeProjectCreditCost;
    private BigDecimal customPricePerCredit;
    private List<CreditPackageDTO> packages;
}
