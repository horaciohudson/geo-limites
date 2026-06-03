package com.momorialPro.CadMemorial.service;



import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.DxfEntityChangeDTO;
import com.momorialPro.CadMemorial.model.FileMetadata;
import com.momorialPro.CadMemorial.repository.FileMetadataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Serviço responsável por comparar dois arquivos DXF (original e modificado)
 * e gerar um resultado com as diferenças detectadas.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CompareService {

    private final FileMetadataRepository fileRepository;

    /**
     * Compara dois arquivos DXF a partir de seus IDs.
     */
    public DxfCompareResultDTO compareByIds(UUID oldFileId, UUID newFileId) {
        FileMetadata oldFile = fileRepository.findById(oldFileId).orElse(null);
        FileMetadata newFile = fileRepository.findById(newFileId).orElse(null);

        if (oldFile == null || newFile == null) {
            log.error("❌ Um ou ambos os arquivos DXF não foram encontrados no banco de dados.");
            throw new IllegalArgumentException("Arquivos DXF inválidos ou inexistentes.");
        }

        // =====================================================
        // ⚙️ Aqui entraria a lógica real de comparação DXF.
        // Por enquanto, retornamos um resultado simulado.
        // =====================================================

        List<DxfEntityChangeDTO> changes = new ArrayList<>();
        changes.add(DxfEntityChangeDTO.builder()
                .type("LINE")
                .layer("0")
                .id("line_001")
                .change("ADDED")
                .build());
        changes.add(DxfEntityChangeDTO.builder()
                .type("POLYLINE")
                .layer("0")
                .id("poly_001")
                .change("MODIFIED")
                .build());
        changes.add(DxfEntityChangeDTO.builder()
                .type("TEXT")
                .layer("0")
                .id("text_001")
                .change("REMOVED")
                .build());

        String summary = String.format(
                "Comparação entre arquivos:\n- Original: %s\n- Modificado: %s\nDiferenças detectadas: %d entidades.",
                oldFile.getOriginalName(), newFile.getOriginalName(), changes.size()
        );

        DxfCompareResultDTO result = new DxfCompareResultDTO();
        result.setOldFileName(oldFile.getOriginalName());
        result.setNewFileName(newFile.getOriginalName());
        result.setSummary(summary);
        result.setDifferences(changes);
        return result;
    }
}
