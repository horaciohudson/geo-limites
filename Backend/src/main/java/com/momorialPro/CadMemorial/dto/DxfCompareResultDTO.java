package com.momorialPro.CadMemorial.dto;


import lombok.*;
import java.util.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DxfCompareResultDTO {
    private String oldFileName;
    private String newFileName;
    private int totalOldEntities;
    private int totalNewEntities;

    private List<DxfEntityChangeDTO> added;
    private List<DxfEntityChangeDTO> removed;
    private List<DxfEntityChangeDTO> modified;
    private Map<String, Integer> summaryByType;

    // 🔹 Novos campos para compatibilidade com MemorialGptController
    private String summary; // resumo textual da comparação
    private List<DxfEntityChangeDTO> differences; // lista unificada de mudanças
}