/**
 * CORREÇÃO CRÍTICA: Parar geração de dados fictícios
 * 
 * Este arquivo contém as correções necessárias para que o sistema
 * PARE e INDIQUE ERRO ao invés de gerar coordenadas fictícias.
 */

// ===================================================================
// 1. CORREÇÃO NO MemorialGptService.java - Método generate()
// ===================================================================

// ADICIONAR VALIDAÇÃO ANTES DE GERAR MEMORIAL:
public String generate(DxfCompareResultDTO r, UUID standardId, UUID userId, UUID propertyId) {
    // ... código existente ...
    
    // VALIDAÇÃO CRÍTICA ANTES DE PROCESSAR
    List<Point> extractedPoints = extractPointsFromEntities(r);
    
    // Verifica se conseguiu extrair coordenadas reais
    if (extractedPoints.isEmpty()) {
        log.error("❌ ERRO CRÍTICO: Nenhuma coordenada extraída do DXF!");
        return generateExtractionErrorMessage("NENHUMA_COORDENADA", r);
    }
    
    // Verifica se as coordenadas são reais (UTM válido)
    boolean hasRealCoordinates = extractedPoints.stream()
        .anyMatch(p -> p.getX() > 100000 && p.getY() > 1000000);
    
    if (!hasRealCoordinates) {
        log.error("❌ ERRO CRÍTICO: Coordenadas fictícias detectadas!");
        log.error("🚫 Coordenadas encontradas (INVÁLIDAS):");
        extractedPoints.stream().limit(5).forEach(p -> 
            log.error("   E {:.2f}, N {:.2f} (muito pequena para UTM)", p.getX(), p.getY())
        );
        return generateExtractionErrorMessage("COORDENADAS_FICTICIAS", r, extractedPoints);
    }
    
    // Verifica se conseguiu calcular área real
    Double calculatedArea = dxfTextExtractorService.calculateTotalArea(convertToEntityMaps(r));
    if (calculatedArea == null || calculatedArea <= 0) {
        log.error("❌ ERRO CRÍTICO: Não foi possível calcular área real do terreno!");
        return generateExtractionErrorMessage("AREA_INVALIDA", r);
    }
    
    log.info("✅ VALIDAÇÃO PASSOU: Coordenadas e área reais extraídas com sucesso");
    
    // ... continua com geração normal do memorial ...
}

// ===================================================================
// 2. NOVO MÉTODO: generateExtractionErrorMessage()
// ===================================================================

private String generateExtractionErrorMessage(String errorType, DxfCompareResultDTO r, List<Point> invalidPoints) {
    StringBuilder error = new StringBuilder();
    
    error.append("❌ ERRO CRÍTICO NA EXTRAÇÃO DE DADOS DXF\n");
    error.append("═══════════════════════════════════════════\n\n");
    
    switch (errorType) {
        case "NENHUMA_COORDENADA":
            error.append("🚫 PROBLEMA: Nenhuma coordenada foi extraída do arquivo DXF\n\n");
            error.append("🔍 POSSÍVEIS CAUSAS:\n");
            error.append("• Arquivo DXF não contém coordenadas em formato reconhecível\n");
            error.append("• Coordenadas estão em layers não processados\n");
            error.append("• Entidades DXF não foram parseadas corretamente\n");
            error.append("• Arquivo DXF corrompido ou incompleto\n\n");
            break;
            
        case "COORDENADAS_FICTICIAS":
            error.append("🚫 PROBLEMA: Coordenadas extraídas são FICTÍCIAS (não são UTM reais)\n\n");
            error.append("📍 COORDENADAS INVÁLIDAS DETECTADAS:\n");
            if (invalidPoints != null) {
                invalidPoints.stream().limit(5).forEach(p -> 
                    error.append(String.format("   • E %.2fm, N %.2fm (INVÁLIDA)\n", p.getX(), p.getY()))
                );
            }
            error.append("\n✅ COORDENADAS UTM REAIS DEVEM TER:\n");
            error.append("   • Coordenada E (Este): 100.000 - 900.000\n");
            error.append("   • Coordenada N (Norte): 1.000.000 - 10.000.000\n");
            error.append("   • Exemplo válido: E 556478.64m, N 9544347.43m\n\n");
            break;
            
        case "AREA_INVALIDA":
            error.append("🚫 PROBLEMA: Não foi possível calcular área real do terreno\n\n");
            error.append("🔍 POSSÍVEIS CAUSAS:\n");
            error.append("• Arquivo DXF não contém polígonos fechados\n");
            error.append("• Entidades POLYLINE/LWPOLYLINE sem vértices válidos\n");
            error.append("• Coordenadas dos vértices são inválidas\n");
            error.append("• Polígonos não formam áreas calculáveis\n\n");
            break;
    }
    
    error.append("🔧 SOLUÇÕES NECESSÁRIAS:\n");
    error.append("1. Verificar arquivo DXF original no AutoCAD/software CAD\n");
    error.append("2. Confirmar se contém coordenadas UTM reais\n");
    error.append("3. Verificar se polígonos estão fechados e válidos\n");
    error.append("4. Testar com arquivo DXF de exemplo conhecido\n");
    error.append("5. Verificar logs do backend para detalhes técnicos\n\n");
    
    error.append("📊 DADOS PROCESSADOS:\n");
    error.append(String.format("• Entidades adicionadas: %d\n", r.getAdded() != null ? r.getAdded().size() : 0));
    error.append(String.format("• Entidades removidas: %d\n", r.getRemoved() != null ? r.getRemoved().size() : 0));
    error.append(String.format("• Entidades modificadas: %d\n", r.getModified() != null ? r.getModified().size() : 0));
    error.append(String.format("• Total de entidades: %d\n", r.getTotalNewEntities()));
    
    error.append("\n⚠️ IMPORTANTE:\n");
    error.append("Este memorial foi INTERROMPIDO para evitar dados fictícios.\n");
    error.append("Coordenadas falsas em documentos legais podem causar problemas graves.\n");
    error.append("Resolva os problemas de extração antes de gerar o memorial final.\n\n");
    
    error.append("💡 PARA DESENVOLVEDORES:\n");
    error.append("• Verificar DxfParser.java - extração de coordenadas\n");
    error.append("• Verificar DxfTextExtractorService.java - cálculo de áreas\n");
    error.append("• Testar com arquivo DXF que sabidamente funciona\n");
    error.append("• Adicionar logs detalhados no processo de extração\n");
    
    return error.toString();
}

// Sobrecarga para casos sem pontos inválidos
private String generateExtractionErrorMessage(String errorType, DxfCompareResultDTO r) {
    return generateExtractionErrorMessage(errorType, r, null);
}

// ===================================================================
// 3. CORREÇÃO NO DxfTextExtractorService.java
// ===================================================================

// MODIFICAR calculateTotalArea() para retornar null quando não encontrar dados reais:
public Double calculateTotalArea(List<Map<String, Object>> entities) {
    log.info("📐 Calculando área total dos polígonos DXF...");
    
    double totalArea = 0.0;
    int areasCalculated = 0;
    
    for (Map<String, Object> entity : entities) {
        String type = (String) entity.get("type");
        
        if ("POLYLINE".equals(type) || "LWPOLYLINE".equals(type)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> properties = (Map<String, Object>) entity.get("properties");
            
            if (properties != null) {
                Double area = calculatePolygonArea(properties);
                if (area != null && area > 0) {
                    totalArea += area;
                    areasCalculated++;
                    log.info("📐 Área do polígono {}: {:.2f}m²", areasCalculated, area);
                }
            }
        }
    }
    
    if (areasCalculated == 0) {
        log.error("❌ ERRO: Nenhum polígono válido encontrado para cálculo de área!");
        log.error("🔍 Verificar se o DXF contém entidades POLYLINE/LWPOLYLINE com vértices válidos");
        return null; // Retorna null ao invés de 0 para indicar erro
    }
    
    log.info("✅ Área total calculada: {:.2f}m² (baseada em {} polígonos)", totalArea, areasCalculated);
    return totalArea;
}

// ===================================================================
// 4. CORREÇÃO NO DxfParser.java
// ===================================================================

// ADICIONAR validação de coordenadas UTM:
private static boolean isValidUTMCoordinate(Double x, Double y) {
    if (x == null || y == null) return false;
    
    // Coordenadas UTM válidas para Brasil:
    // E (Este): 100.000 - 900.000
    // N (Norte): 1.000.000 - 10.000.000
    boolean validX = x >= 100000 && x <= 900000;
    boolean validY = y >= 1000000 && y <= 10000000;
    
    return validX && validY;
}

// MODIFICAR parse() para validar coordenadas:
public static List<Entity> parse(Path dxfPath) {
    try {
        List<String> lines = Files.readAllLines(dxfPath);
        List<Entity> entities = new ArrayList<>();
        int validCoordinatesFound = 0;
        int invalidCoordinatesFound = 0;
        
        // ... código de parsing existente ...
        
        // VALIDAÇÃO FINAL
        for (Entity entity : entities) {
            if (entity.x() != null && entity.y() != null) {
                if (isValidUTMCoordinate(entity.x(), entity.y())) {
                    validCoordinatesFound++;
                } else {
                    invalidCoordinatesFound++;
                    log.warn("⚠️ Coordenada inválida: E {:.2f}, N {:.2f} (muito pequena para UTM)", 
                            entity.x(), entity.y());
                }
            }
        }
        
        log.info("📊 Resultado do parsing:");
        log.info("   • Coordenadas válidas (UTM): {}", validCoordinatesFound);
        log.info("   • Coordenadas inválidas: {}", invalidCoordinatesFound);
        log.info("   • Total de entidades: {}", entities.size());
        
        if (validCoordinatesFound == 0 && invalidCoordinatesFound > 0) {
            log.error("❌ ERRO CRÍTICO: Todas as coordenadas são inválidas!");
            log.error("💡 Arquivo DXF pode não conter coordenadas UTM reais");
        }
        
        return entities;
    } catch (Exception e) {
        throw new RuntimeException("Falha ao ler DXF: " + e.getMessage(), e);
    }
}

// ===================================================================
// 5. INSTRUÇÕES DE IMPLEMENTAÇÃO
// ===================================================================

/*
PASSOS PARA IMPLEMENTAR AS CORREÇÕES:

1. Adicionar o método generateExtractionErrorMessage() no MemorialGptService.java

2. Modificar o método generate() para incluir as validações antes de processar

3. Atualizar calculateTotalArea() no DxfTextExtractorService.java para retornar null em caso de erro

4. Adicionar isValidUTMCoordinate() no DxfParser.java

5. Modificar o método parse() para validar coordenadas UTM

6. Testar com arquivo DXF original para verificar se as correções funcionam

7. Verificar logs para identificar onde exatamente está falhando a extração

RESULTADO ESPERADO:
- Sistema para de gerar dados fictícios
- Mostra erro claro quando não consegue extrair dados reais
- Indica exatamente qual é o problema (coordenadas, área, etc.)
- Fornece soluções específicas para cada tipo de erro
- Logs detalhados para debug técnico
*/