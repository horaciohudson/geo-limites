package com.momorialPro.CadMemorial.dto;

public record RegisterResponseDTO(
        String message,
        String tenantCode,
        String email,
        boolean verificationRequired,
        Boolean emailSent,
        String verificationUrl
) {
    public RegisterResponseDTO(String message, String tenantCode, String email, boolean verificationRequired) {
        this(message, tenantCode, email, verificationRequired, null, null);
    }
}
