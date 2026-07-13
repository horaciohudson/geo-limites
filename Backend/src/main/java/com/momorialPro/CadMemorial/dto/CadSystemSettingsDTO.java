package com.momorialPro.CadMemorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CadSystemSettingsDTO {
    private String measurementUnit;
    private Double newDocumentWorkspaceSize;
    private LocalDateTime updatedAt;
}
