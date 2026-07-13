package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.MemorialStandardDTO;
import com.momorialPro.CadMemorial.dto.PropertyDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemorialDocumentAssemblyService {
    private final LegalTemplateService legalTemplateService;

    public String generatePreamble(MemorialStandardDTO standard, PropertyDTO property) {
        return generatePreamble(standard, property, null);
    }

    public String generatePreamble(
            MemorialStandardDTO standard,
            PropertyDTO property,
            MemorialProcessingContext processingContext) {
        String legalPreamble = legalTemplateService.generateLegalPreamble(property, standard, processingContext);

        if (legalPreamble != null && !legalPreamble.trim().isEmpty()) {
            return legalPreamble;
        }

        log.warn("⚠️ LegalTemplateService falhou, usando preâmbulo simplificado");
        StringBuilder preamble = new StringBuilder();

        preamble.append("MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE ÁREA\n\n");

        if (property != null) {
            if (property.getName() != null) {
                preamble.append("IMÓVEL: ").append(property.getName()).append("\n");
            }
            if (property.getOwnerName() != null) {
                preamble.append("PROPRIETÁRIO: ").append(property.getOwnerName()).append("\n");
            }
            if (property.getCity() != null && property.getState() != null) {
                preamble.append("LOCALIZAÇÃO: ").append(property.getCity()).append("/").append(property.getState()).append("\n");
            }
        }

        preamble.append("\nDESCRIÇÃO DOS LOTES:\n");

        return preamble.toString();
    }

    public String generateConclusion(PropertyDTO property) {
        String legalDeclaration = legalTemplateService.generateLegalDeclaration(property);

        if (legalDeclaration != null && !legalDeclaration.trim().isEmpty()) {
            return "\n__________________________________________\n\n" + legalDeclaration;
        }

        log.warn("⚠️ LegalTemplateService falhou, usando declaração simplificada");
        StringBuilder conclusion = new StringBuilder();

        conclusion.append("\n__________________________________________\n\n");
        conclusion.append("DECLARAÇÃO FINAL:\n");
        conclusion.append("Este memorial descritivo foi elaborado com base nos dados técnicos disponíveis ");
        conclusion.append("e nas coordenadas extraídas do levantamento topográfico.\n\n");

        conclusion.append("Data: ").append(java.time.LocalDate.now().format(
                java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("\n");

        return conclusion.toString();
    }

    public String addMetadata(String memorial, PropertyDTO property, DxfCompareResultDTO compareResult) {
        if (memorial == null) {
            return "";
        }

        String projectName = "Projeto sem nome";
        if (property != null) {
            if (property.getRegistrationNumber() != null && !property.getRegistrationNumber().isBlank()) {
                projectName = property.getRegistrationNumber().trim();
            } else if (property.getName() != null && !property.getName().isBlank()) {
                projectName = property.getName().trim();
            }
        }

        String fileName = resolveDisplayFileName(compareResult);

        String metadataBlock = String.format(
                "Memorial Descritivo\nProjeto: %s\nArquivo: %s\nData: %s\n",
                projectName,
                fileName,
                java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))
        );

        String normalized = memorial.replace("\r\n", "\n").trim();
        Pattern leadingHeaderPattern = Pattern.compile(
                "(?ims)^(?:\\s*Memorial\\s+Descritivo\\s*\\n(?:\\s*Projeto:.*\\n)?(?:\\s*Arquivo:.*\\n)?(?:\\s*Data:.*\\n)?(?:\\s*Metodo:.*\\n)?\\s*)+"
        );
        String contentWithoutHeader = leadingHeaderPattern.matcher(normalized)
                .replaceFirst("")
                .replaceFirst("^\\s+", "");

        return (metadataBlock + "\n" + contentWithoutHeader)
                .replaceAll("\n{3,}", "\n\n")
                .trim();
    }

    public String assembleMemorialDocument(
            String memorialBody,
            String preamble,
            String conclusion) {
        String normalizedBody = stripLeadingMetadata(memorialBody);
        String normalizedPreamble = normalizeBlock(preamble);
        String normalizedConclusion = normalizeBlock(conclusion);

        StringBuilder assembledDocument = new StringBuilder();

        if (!containsPreambleSection(normalizedBody) && !normalizedPreamble.isBlank()) {
          assembledDocument.append(normalizedPreamble);
        }

        if (!normalizedBody.isBlank()) {
            if (!assembledDocument.isEmpty()) {
                assembledDocument.append("\n\n");
            }
            assembledDocument.append(normalizedBody);
        }

        if (!containsConclusionSection(normalizedBody) && !normalizedConclusion.isBlank()) {
            if (!assembledDocument.isEmpty()) {
                assembledDocument.append("\n\n");
            }
            assembledDocument.append(normalizedConclusion);
        }

        return assembledDocument.toString()
                .replaceAll("\n{3,}", "\n\n")
                .trim();
    }

    private String resolveDisplayFileName(DxfCompareResultDTO compareResult) {
        if (compareResult == null) {
            return "Arquivo DXF";
        }

        String oldFileName = compareResult.getOldFileName() != null ? compareResult.getOldFileName().trim() : "";
        String newFileName = compareResult.getNewFileName() != null ? compareResult.getNewFileName().trim() : "";

        if (looksLikeAnalyzedDrawingFile(newFileName)) {
            return newFileName;
        }
        if (looksLikeAnalyzedDrawingFile(oldFileName)) {
            return oldFileName;
        }
        if (!newFileName.isBlank()) {
            return newFileName;
        }
        if (!oldFileName.isBlank()) {
            return oldFileName;
        }
        return "Arquivo DXF";
    }

    private boolean looksLikeAnalyzedDrawingFile(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return false;
        }

        String normalized = fileName.trim().toLowerCase();
        return normalized.endsWith(".dxf")
                || normalized.endsWith(".dwg")
                || normalized.endsWith(".cad");
    }

    public String normalizeMemorialLotOrdering(String content) {
        return content;
    }

    private String stripLeadingMetadata(String memorial) {
        if (memorial == null) {
            return "";
        }

        String normalized = memorial.replace("\r\n", "\n").trim();
        Pattern leadingHeaderPattern = Pattern.compile(
                "(?ims)^(?:\\s*Memorial\\s+Descritivo\\s*\\n(?:\\s*Projeto:.*\\n)?(?:\\s*Arquivo:.*\\n)?(?:\\s*Data:.*\\n)?(?:\\s*Metodo:.*\\n)?\\s*)+"
        );
        return leadingHeaderPattern.matcher(normalized)
                .replaceFirst("")
                .replaceFirst("^\\s+", "")
                .trim();
    }

    private String normalizeBlock(String content) {
        return content == null ? "" : content.replace("\r\n", "\n").trim();
    }

    private boolean containsPreambleSection(String content) {
        if (content == null || content.isBlank()) {
            return false;
        }

        return Pattern.compile("(?is)\\b(?:TERRENO\\s*1|SITUA[ÇC][AÃ]O\\s+ANTES\\s+DESTE\\s+DESMEMBRAMENTO)\\b")
                .matcher(content)
                .find();
    }

    private boolean containsConclusionSection(String content) {
        if (content == null || content.isBlank()) {
            return false;
        }

        return Pattern.compile("(?is)\\bDECLARA[ÇC][AÃ]O(?:\\s+FINAL)?\\b")
                .matcher(content)
                .find();
    }
}
