package com.momorialPro.CadMemorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantSettingsDTO {

    private UUID id;
    private String name;
    private String code;
    private String slug;
    private String planCode;
    private String status;
    private Boolean isDefault;
}
