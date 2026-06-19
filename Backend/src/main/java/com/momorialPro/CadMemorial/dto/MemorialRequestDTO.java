package com.momorialPro.CadMemorial.dto;

import com.momorialPro.CadMemorial.util.DxfParser;
import java.util.List;
import java.util.UUID;

public record MemorialRequestDTO(
        List<DxfParser.Entity> entities,
        String fileName,
        String projectName,
        String projectDescription,
        UUID standardId,
        UUID propertyId,  // Complementary property data for complete memorial
        String provider,  // AI provider: 'openai' or 'claude'
        Integer lotCount,  // Manual lot count override (optional)
        Integer billableLotCount, // Optional lot count used only for credit billing
        Boolean chargeCredits, // Allows grouped billing in multi-request interactive generation
        List<String> selectedLayers, // Optional subset of layers/polygons selected in frontend
        List<SelectedConfrontationTextDTO> selectedConfrontationTexts // Optional manual text selection for confrontations
) {}
