package com.momorialPro.CadMemorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemplateGenerationRequestDTO {
    private String name;
    private String description;
    private String municipality;
    private String abntNorm;
    private UUID memorialStandardId;
    private String targetFolderPath;
}