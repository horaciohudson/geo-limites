package com.momorialPro.CadMemorial.dto;

public record MessageResponseDTO(
        String message,
        Boolean emailSent,
        String verificationUrl
) {
    public MessageResponseDTO(String message) {
        this(message, null, null);
    }
}
