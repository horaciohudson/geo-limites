// ========================================
// MÉTODOS OTIMIZADOS PARA MemorialApiService.java
// ========================================
// 
// PROBLEMA: Prompt atual tem 84k caracteres, causando recusa da IA
// SOLUÇÃO: Reduzir para ~35-40k caracteres removendo repetições
//
// INSTRUÇÕES:
// 1. Abra: Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java
// 2. Substitua os métodos buildSystemPrompt() e buildPrompt() pelos abaixo
// 3. Recompile: mvnw clean compile
// 4. Reinicie: start-with-env.bat
//
// ========================================

// SUBSTITUA ESTE MÉTODO (linha ~570):
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

// OTIMIZE O MÉTODO buildPrompt() (linha ~650)
// PRINCIPAIS MUDANÇAS:
// - Remover boxes ASCII decorativos
// - Consolidar avisos repetidos
// - Simplificar formatação
// - Limitar coordenadas se houver muitas (>100)

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
        promptBuilder.append("\n");
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
        int maxCoords = 100; // Limitar a 100 para não explodir o prompt
        
        for (Map.Entry<String, Map<String, Double>> entry : realCoordinates.entrySet()) {
            if (coordCount++ < maxCoords) {
                promptBuilder.append(String.format("- %s: E %.2fm, N %.2fm\n",
                        entry.getKey(), entry.getValue().get("E"), entry.getValue().get("N")));
            }
        }
        
        if (realCoordinates.size() > maxCoords) {
            promptBuilder.append("... e mais ").append(realCoordinates.size() - maxCoords)
                    .append(" coordenadas (use-as conforme necessário)\n");
        }
        promptBuilder.append("\n");
    }

    // Ruas
    if (!streetNames.isEmpty()) {
        promptBuilder.append("RUAS IDENTIFICADAS:\n");
        streetNames.forEach(street -> promptBuilder.append("- ").append(street).append("\n"));
        promptBuilder.append("\n");
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
    }

    // Áreas individuais (IMPORTANTE - destacar)
    if (!individualAreas.isEmpty()) {
        promptBuilder.append("📐 ÁREAS CALCULADAS - USE ESTAS:\n");
        individualAreas.forEach((loteName, area) -> {
            promptBuilder.append(String.format("%s: %.2f m²\n", loteName, area));
        });
        promptBuilder.append("\n");
    }

    // Instruções finais (consolidadas)
    promptBuilder.append("INSTRUÇÕES FINAIS:\n");
    promptBuilder.append("1. Use APENAS coordenadas reais listadas acima\n");
    promptBuilder.append("2. Use TODAS as ruas identificadas\n");
    promptBuilder.append("3. Use as áreas calculadas fornecidas\n");
    promptBuilder.append("4. Gere TODOS os ").append(estimatedLots).append(" lotes completos\n");
    promptBuilder.append("5. Formato: Memorial Descritivo > Identificação > Antes > Depois > Declaração\n");
    promptBuilder.append("6. NUNCA use 'Área: 0.0000 m²' ou 'A calcular'\n\n");

    // Template básico
    promptBuilder.append(String.format("""
            MEMORIAL DESCRITIVO DE DESMEMBRAMENTO
            Entidades DXF: %d adicionadas, %d removidas, %d modificadas
            Arquivo: %s
            
            Gere o memorial completo conforme formato obrigatório.
            Lembre-se: %d lotes devem ser descritos (LOTE 01 até LOTE %02d).
            """,
            (r.getAdded() != null ? r.getAdded().size() : 0),
            (r.getRemoved() != null ? r.getRemoved().size() : 0),
            (r.getModified() != null ? r.getModified().size() : 0),
            (r.getNewFileName() != null ? r.getNewFileName() : "Arquivo DXF"),
            estimatedLots,
            estimatedLots
    ));

    return promptBuilder.toString();
}

// ========================================
// FIM DOS MÉTODOS OTIMIZADOS
// ========================================
//
// RESULTADO ESPERADO:
// - Prompt: ~35-40k caracteres (vs 84k anterior)
// - Tokens: ~9-10k (vs 21k anterior)
// - IA: Deve gerar memorial sem recusar
//
// TESTE:
// 1. Aplicar mudanças
// 2. Recompilar
// 3. Reiniciar backend com start-with-env.bat
// 4. Gerar memorial
// 5. Verificar nos logs: "Memorial gerado com X caracteres"
//
// ========================================




