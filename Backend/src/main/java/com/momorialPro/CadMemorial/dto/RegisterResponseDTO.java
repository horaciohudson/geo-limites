package com.momorialPro.CadMemorial.dto;

public record RegisterResponseDTO(
        String message,
        String tenantCode,
        String email,
        boolean verificationRequired
) {
}
