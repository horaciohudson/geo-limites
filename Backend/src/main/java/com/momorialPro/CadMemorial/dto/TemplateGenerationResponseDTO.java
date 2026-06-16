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
public class TemplateGenerationResponseDTO {
    private UUID id;
    private String name;
    private String fileUrl;
    private String filePath;
    private String message;
}