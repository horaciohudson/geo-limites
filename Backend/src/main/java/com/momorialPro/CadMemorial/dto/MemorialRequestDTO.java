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
        Integer lotCount  // Manual lot count override (optional)
) {}