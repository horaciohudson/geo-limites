package com.momorialPro.CadMemorial.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateApiSettingsRequest {
    
    @NotBlank(message = "O provedor da API de templates não pode estar vazio")
    private String templateApiProvider;
    
    @NotBlank(message = "O provedor da API de memoriais não pode estar vazio")
    private String memorialApiProvider;
}
