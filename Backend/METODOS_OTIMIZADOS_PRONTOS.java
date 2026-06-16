// ==================================================================================
// MÉTODOS OTIMIZADOS - COPIE E COLE NO MemorialApiService.java
// ==================================================================================
//
// INSTRUÇÕES:
// 1. Abra: Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java
// 2. CTRL+F e busque: "private String buildSystemPrompt"
// 3. DELETE o método completo (incluindo o return """...""";)
// 4. COLE o primeiro método abaixo
// 5. CTRL+F e busque: "private String buildPrompt"
// 6. DELETE o método completo
// 7. COLE o segundo método abaixo
// 8. Salve o arquivo
// 9. Recompile: mvnw clean compile
// 10. Reinicie: start-with-env.bat
//
// ==================================================================================

// ============= MÉTODO 1: buildSystemPrompt() =============
// Substitui o método na linha ~570
// Reduz de 75 linhas para 35 linhas

private String buildSystemPrompt(MemorialStandardDTO standard) {
    if (standard != null && standard.getPromptTemplate() != null && !standard.getPromptTemplate().trim().isEmpty()) {
        return standard.getPromptTemplate();
    }

    return """
            Você é um engenheiro cartógrafo especializado em memorial descritivo conforme NBR-17047:2024 e NBR 13133:1994.
            
            REGRAS OBRIGATÓRIAS:
            
            1. COORDENADAS REAIS:
               - Use APENAS coordenadas fornecidas (SIRGAS 2000, 6+ dígitos)
               - Formato: "P01 (coordenadas E 556478.64m e N 9544347.43m)"
               - NUNCA invente coordenadas sequenciais
            
            2. CONFRONTAÇÕES ESPECÍFICAS:
               - Use APENAS confrontações fornecidas
               - Inclua matrículas, CNPJs e nomes reais
               - NUNCA invente nomes como "João da Silva"
            
            3. MÚLTIPLAS RUAS:
               - Use TODAS as ruas identificadas
               - Lotes diferentes podem ter ruas diferentes
               - NUNCA use apenas uma rua genérica
            
            4. ÁREAS VARIADAS:
               - Use as áreas calculadas fornecidas
               - Cada lote tem área específica
               - NUNCA padronize todos em 130m²
            
            5. COMPLETUDE:
               - Gere TODOS os lotes detectados (ex: se 15 lotes, gere de LOTE 01 a LOTE 15)
               - NUNCA use [REPETIR], [CONTINUAR] ou [...]
               - NUNCA pare no meio ou use "os demais seguem o padrão"
               - Memorial incompleto = FALHA
            
            6. ÁREAS CALCULADAS:
               - NUNCA use "Área Total: 0.0000 m²"
               - NUNCA use "A calcular"
               - Use áreas fornecidas em m² com 2 casas decimais
            
            FORMATO OBRIGATÓRIO:
            1. CABEÇALHO: Memorial Descritivo de Desmembramento de Área
            2. IDENTIFICAÇÃO: Terreno, Proprietário, Localização, Objetivo
            3. SITUAÇÃO ANTES: TERRENO 1 com coordenadas, perímetro, área, confrontações
            4. SITUAÇÃO DEPOIS: Cada LOTE com coordenadas, perímetro, área, confrontações
            5. DECLARAÇÃO FINAL: Conformidade com NBR-17047
            
            IMPORTANTE: Este é um documento LEGAL para cartórios. Precisão técnica é OBRIGATÓRIA.
            """;
}

// ============= MÉTODO 2: buildPrompt() =============
// Substitui o método na linha ~650
// Reduz de ~800 linhas para ~200 linhas

private String buildPrompt(DxfCompareResultDTO r, MemorialStandardDTO standard, PropertyDTO property, List<Point> extractedPoints,
                           Map<String, Map<String, Double>> realCoordinates, List<String> streetNames,
                           Map<String, List<String>> confrontations, Map<String, Double> individualAreas) {
    StringBuilder promptBuilder = new StringBuilder();

    // Converter entidades
    List<Map<String, Object>> allEntities = convertToEntityMaps(r);
    Map<String, Double> distances = dxfTextExtractorService.calculateDistances(allEntities);
    List<String> measurements = dxfTextExtractorService.extractMeasurementTexts(allEntities);
    Double calculatedArea = dxfTextExtractorService.calculateTotalArea(allEntities);

    // Norma padrão (se configurada)
    if (standard != null && standard.getStandardText() != null && !standard.getStandardText().trim().isEmpty()) {
        promptBuilder.append("NORMA A SEGUIR:\n");
        promptBuilder.append(standard.getStandardText());
        promptBuilder.append("\n\n");
    }

    // Dados da propriedade (simplificado)
    if (property != null) {
        promptBuilder.append("DADOS DA PROPRIEDADE:\n");
        if (property.getName() != null) {
            promptBuilder.append("Nome: ").append(property.getName()).append("\n");
        }
        if (property.getOwnerName() != null) {
            promptBuilder.append("Proprietário: ").append(property.getOwnerName()).append("\n");
        }
        if (property.getAddress() != null) {
            promptBuilder.append("Endereço: ").append(property.getAddress()).append("\n");
        }
        if (property.getCity() != null && property.getState() != null) {
            promptBuilder.append("Município: ").append(property.getCity()).append(" - ").append(property.getState()).append("\n");
        }
        if (property.getRegistrationNumber() != null) {
            promptBuilder.append("Matrícula: ").append(property.getRegistrationNumber()).append("\n");
        }
        if (property.getRegistryOffice() != null) {
            promptBuilder.append("Cartório: ").append(property.getRegistryOffice()).append("\n");
        }
        promptBuilder.append("\n⚠️ USE estes dados reais. NÃO invente informações!\n\n");
    }

    // Número de lotes detectados
    int estimatedLots = safeEstimateLotCount(r);
    promptBuilder.append("🚨 IMPORTANTE: Detectados ").append(estimatedLots).append(" lotes no DXF.\n");
    promptBuilder.append("Você DEVE gerar TODOS os lotes de LOTE 01 até LOTE ").append(String.format("%02d", estimatedLots)).append(".\n");
    promptBuilder.append("NÃO use [REPETIR], [CONTINUAR] ou pare no meio.\n\n");

    // Dados extraídos do DXF
    promptBuilder.append("DADOS EXTRAÍDOS DO DXF:\n\n");

    // Coordenadas (limitar se houver muitas)
    if (!realCoordinates.isEmpty()) {
        promptBuilder.append("COORDENADAS REAIS DOS PONTOS:\n");
        int coordCount = 0;
        int maxCoords = 150; // Limitar a 150 para não explodir o prompt
        
        for (Map.Entry<String, Map<String, Double>> entry : realCoordinates.entrySet()) {
            if (coordCount++ < maxCoords) {
                promptBuilder.append(String.format("- %s: E %.2fm, N %.2fm\n",
                        entry.getKey(), entry.getValue().get("E"), entry.getValue().get("N")));
            }
        }
        
        if (realCoordinates.size() > maxCoords) {
            promptBuilder.append("... e mais ").append(realCoordinates.size() - maxCoords)
                    .append(" coordenadas disponíveis\n");
        }
        promptBuilder.append("\n");
        log.info("📝 Adicionadas {} coordenadas ao prompt", Math.min(realCoordinates.size(), maxCoords));
    }

    // Ruas
    if (!streetNames.isEmpty()) {
        promptBuilder.append("RUAS IDENTIFICADAS:\n");
        streetNames.forEach(street -> promptBuilder.append("- ").append(street).append("\n"));
        promptBuilder.append("\n");
        log.info("📝 Adicionadas {} ruas ao prompt", streetNames.size());
    }

    // Confrontações
    if (confrontations.values().stream().anyMatch(list -> !list.isEmpty())) {
        promptBuilder.append("CONFRONTAÇÕES:\n");
        confrontations.forEach((direction, items) -> {
            if (!items.isEmpty()) {
                promptBuilder.append(direction).append(": ").append(String.join(", ", items)).append("\n");
            }
        });
        promptBuilder.append("\n");
        log.info("📝 Adicionadas confrontações ao prompt");
    }

    // Áreas individuais (IMPORTANTE - destacar)
    if (!individualAreas.isEmpty()) {
        promptBuilder.append("📐 ÁREAS CALCULADAS - USE ESTAS:\n");
        individualAreas.forEach((loteName, area) -> {
            promptBuilder.append(String.format("%s: %.2f m²\n", loteName, area));
        });
        promptBuilder.append("⚠️ NÃO use 'A calcular' - use as áreas acima!\n\n");
        log.info("📝 Adicionadas {} áreas individuais ao prompt", individualAreas.size());
    } else {
        log.warn("⚠️ Nenhuma área individual calculada");
        promptBuilder.append("⚠️ Calcule áreas com base nas coordenadas fornecidas.\n\n");
    }

    // Instruções finais (consolidadas)
    promptBuilder.append("INSTRUÇÕES FINAIS:\n");
    promptBuilder.append("1. Use APENAS coordenadas reais listadas acima\n");
    promptBuilder.append("2. Use TODAS as ruas identificadas\n");
    promptBuilder.append("3. Use as áreas calculadas fornecidas\n");
    promptBuilder.append("4. Gere TODOS os ").append(estimatedLots).append(" lotes completos\n");
    promptBuilder.append("5. Formato: Memorial > Identificação > Antes > Depois > Declaração\n");
    promptBuilder.append("6. NUNCA use 'Área: 0.0000 m²' ou 'A calcular'\n");
    promptBuilder.append("7. NUNCA pare no meio ou use [REPETIR]\n\n");

    // Template básico
    promptBuilder.append(String.format("""
            MEMORIAL DESCRITIVO DE DESMEMBRAMENTO
            Entidades DXF: %d adicionadas, %d removidas, %d modificadas
            Arquivo: %s
            
            Gere o memorial completo conforme formato obrigatório.
            Lembre-se: %d lotes devem ser descritos (LOTE 01 até LOTE %02d).
            Cada lote deve ter: coordenadas completas, perímetro, área territorial, confrontações.
            """,
            (r.getAdded() != null ? r.getAdded().size() : 0),
            (r.getRemoved() != null ? r.getRemoved().size() : 0),
            (r.getModified() != null ? r.getModified().size() : 0),
            (r.getNewFileName() != null ? r.getNewFileName() : "Arquivo DXF"),
            estimatedLots,
            estimatedLots
    ));

    log.info("📝 Prompt construído com {} caracteres", promptBuilder.length());
    return promptBuilder.toString();
}

// ==================================================================================
// FIM DOS MÉTODOS - SALVE E RECOMPILE
// ==================================================================================




