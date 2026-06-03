package com.momorialPro.CadMemorial.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SmtpTestEmailRequest {

    @NotBlank
    @Email
    private String to;
}
