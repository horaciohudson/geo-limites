package com.momorialPro.CadMemorial.dto;

import com.momorialPro.CadMemorial.model.Template;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemplateDTO {
    private UUID id;
    private String name;
    private String description;
    private String fileUrl;
    private String filePath;
    private UUID memorialStandardId;
    private String municipality;
    private String abntNorm;
    private Template.TemplateStatus status;
    private UUID ownerId;
    private String ownerName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}