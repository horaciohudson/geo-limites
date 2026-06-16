package com.momorialPro.CadMemorial.dto;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequestDTO(
        @NotBlank(message = "A senha atual e obrigatoria")
        String currentPassword,

        @NotBlank(message = "A nova senha e obrigatoria")
        String newPassword
) {
}
