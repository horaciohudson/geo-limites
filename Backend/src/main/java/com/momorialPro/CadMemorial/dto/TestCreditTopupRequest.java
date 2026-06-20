package com.momorialPro.CadMemorial.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestCreditTopupRequest {
    @NotNull(message = "A quantidade de creditos e obrigatoria")
    @Min(value = 1, message = "Informe ao menos 1 credito para recarga de teste")
    private Integer credits;
}
