package com.momorialPro.CadMemorial.dto;



import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemorialExportDTO {

    private String projectName;
    private String projectDescription;
    private String memorialText;
    private String comparisonSummary;
    private List<DxfEntityChangeDTO> differences;

    // 🔹 Construtor antigo para compatibilidade
    public MemorialExportDTO(String projectName, String projectDescription, String memorialText) {
        this.projectName = projectName;
        this.projectDescription = projectDescription;
        this.memorialText = memorialText;
    }
}

