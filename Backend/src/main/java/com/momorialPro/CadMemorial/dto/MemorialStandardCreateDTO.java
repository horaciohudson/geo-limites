package com.momorialPro.CadMemorial.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemorialStandardCreateDTO {

    private String name;
    private String description;
    private String standardText;
    private String promptTemplate;
    private Boolean isDefault;
}