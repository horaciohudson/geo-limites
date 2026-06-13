package com.momorialPro.CadMemorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreditPackageDTO {
    private String id;
    private String name;
    private Integer baseCredits;
    private Integer bonusCredits;
    private Integer totalCredits;
    private BigDecimal price;
    private BigDecimal pricePerCredit;
    private Boolean popular;
}
