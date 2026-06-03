package com.momorialPro.CadMemorial.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequestDTO(
        @NotBlank(message = "email é obrigatório")
        @Email(message = "email deve ser válido")
        String email,

        @NotBlank(message = "password é obrigatório")
        @Size(min = 6, message = "password deve ter pelo menos 6 caracteres")
        String password,

        @NotBlank(message = "fullName é obrigatório")
        @Size(min = 2, max = 100, message = "fullName deve ter entre 2 e 100 caracteres")
        String fullName
) {
}
