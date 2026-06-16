package com.momorialPro.CadMemorial.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ResendVerificationRequestDTO(
        @NotBlank(message = "tenantCode e obrigatorio")
        String tenantCode,

        @NotBlank(message = "email e obrigatorio")
        @Email(message = "email deve ser valido")
        String email
) {
}
