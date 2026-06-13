package com.momorialPro.CadMemorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiSettingsDTO {
    private String templateApiProvider;
    private String memorialApiProvider;
}
