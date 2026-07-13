package com.momorialPro.CadMemorial.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCadSystemSettingsRequest {
    @NotBlank(message = "A unidade de medida e obrigatoria")
    @Pattern(regexp = "mm|cm|m", message = "A unidade de medida deve ser mm, cm ou m")
    private String measurementUnit;

    @NotNull(message = "A area-base de novos desenhos e obrigatoria")
    @DecimalMin(value = "0.0001", message = "A area-base deve ser maior que zero")
    private Double newDocumentWorkspaceSize;
}
