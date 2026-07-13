package com.momorialPro.CadMemorial.dto;

import com.momorialPro.CadMemorial.util.DxfParser;
import java.util.List;
import java.util.UUID;

public record MemorialRequestDTO(
        List<DxfParser.Entity> entities,
        String technicalSummaryJson,
        String documentSummaryJson,
        String fileName,
        String projectName,
        String projectDescription,
        UUID standardId,
        String templateName,
        String templateBackendId,
        UUID propertyId,  // Complementary property data for complete memorial
        String provider,  // AI provider: 'openai' or 'claude'
        Integer lotCount,  // Manual lot count override (optional)
        Integer billableLotCount, // Optional lot count used only for credit billing
        Boolean chargeCredits, // Allows grouped billing in multi-request interactive generation
        List<String> selectedLayers, // Optional subset of layers/polygons selected in frontend
        List<Integer> detectedLotNumbers, // Optional lot numbers detected by text anchors in the frontend
        List<Integer> selectedLotNumbers, // Optional explicit lot subset confirmed in the frontend
        List<Integer> partialReplacementLotNumbers, // Optional lots substituted by saved partials in mixed summary mode
        List<Integer> manualReviewLotNumbers, // Optional lots explicitly marked for manual review in the frontend
        List<SelectedConfrontationTextDTO> selectedConfrontationTexts, // Optional manual text selection for confrontations
        List<SelectedReferencePointDTO> selectedReferencePoints // Optional georeferencing anchors confirmed in the viewer
) {}
