package com.momorialPro.CadMemorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestCreditTopupResponseDTO {
    private String message;
    private Integer creditsAdded;
    private Integer currentBalance;
}
