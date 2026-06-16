package com.momorialPro.CadMemorial.dto;

public record AuthResponseDTO(
    String token,
    String refreshToken,
    String tokenType,
    long expiresIn
) {
    public AuthResponseDTO(String token, String refreshToken, long expiresIn) {
        this(token, refreshToken, "Bearer", expiresIn);
    }
}
