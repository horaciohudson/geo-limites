package com.momorialPro.CadMemorial.dto;

public record VerificationResponseDTO(
        String message,
        String tenantCode,
        String email
) {
}
