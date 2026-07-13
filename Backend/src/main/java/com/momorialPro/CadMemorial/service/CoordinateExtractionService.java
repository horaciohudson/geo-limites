package com.momorialPro.CadMemorial.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import java.util.stream.Collectors;

/**
 * Serviço especializado em extração de coordenadas reais do DXF
 * PRIORIDADE 1 - PLANO DE MELHORIAS
 */
@Service
@Slf4j
public class CoordinateExtractionService {

    // Padrões para coordenadas SIRGAS 2000 / UTM
    private static final Pattern SIRGAS_PATTERN = Pattern.compile(
        "E\\s*(\\d{6,}[.,]?\\d*).*?N\\s*(\\d{7,}[.,]?\\d*)|" +
        "N\\s*(\\d{7,}[.,]?\\d*).*?E\\s*(\\d{6,}[.,]?\\d*)"
    );
    
    private static final Pattern POINT_PATTERN = Pattern.compile(
        "(?i)\\b(?:P|PT|PONTO|V|VERTICE|VERTEX)\\s*[-_:/# ]*0*(\\d{1,4})\\b"
    );
    private static final Pattern LARGE_NUMBER_PATTERN = Pattern.compile("\\d{6,}[.,]?\\d*");
    private static final Pattern HEADER_TEXT_PATTERN = Pattern.compile(
        "(?i)(PONTOS?\\s+GEORREFERENCIADOS|VERTICE|VÉRTICE|COORDENADAS?|COORDENADA)"
    );

    /**
     * Extrai coordenadas reais SIRGAS 2000 do DXF
     * Prioriza: TEXTOS > POLYLINES > VÉRTICES > ENTIDADES SIMPLES
     */
    public Map<String, RealCoordinate> extractRealCoordinates(List<Map<String, Object>> entities) {
        Map<String, RealCoordinate> coordinates = new LinkedHashMap<>();
        
        // FASE 1: Extrair de textos (mais confiável)
        extractFromTexts(entities, coordinates);
        
        // FASE 2: Extrair de polylines (geometria)
        extractFromPolylines(entities, coordinates);
        
        // FASE 3: Extrair de vértices (backup)
        extractFromVertices(entities, coordinates);
        
        // FASE 4: Validar e filtrar coordenadas
        Map<String, RealCoordinate> validCoordinates = validateCoordinates(coordinates);

        return validCoordinates;
    }

    /**
     * FASE 1: Extração de textos DXF (mais precisa)
     */
    private void extractFromTexts(List<Map<String, Object>> entities, Map<String, RealCoordinate> coordinates) {
        List<TextCell> textCells = extractTextCells(entities);
        extractFromTableRows(textCells, coordinates);

        for (TextCell cell : textCells) {
            String text = cell.text();
            if (!isSirgasCoordinateText(text)) {
                continue;
            }

            String pointName = extractPointName(text);
            RealCoordinate coord = parseSirgasCoordinates(text);

            if (pointName != null && coord != null) {
                coordinates.putIfAbsent(pointName, coord);
            } else if (coord != null) {
                String genericName = buildGenericPointName(coordinates);
                coordinates.putIfAbsent(genericName, coord);
            }
        }
    }

    /**
     * FASE 2: Extração de polylines (geometria)
     */
    private void extractFromPolylines(List<Map<String, Object>> entities, Map<String, RealCoordinate> coordinates) {
        int polylineCount = 0;
        
        for (Map<String, Object> entity : entities) {
            String type = (String) entity.get("type");
            
            if ("POLYLINE".equals(type) || "LWPOLYLINE".equals(type)) {
                polylineCount++;
                
                @SuppressWarnings("unchecked")
                Map<String, Object> properties = (Map<String, Object>) entity.get("properties");
                
                if (properties != null) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> vertices = (List<Map<String, Object>>) properties.get("vertices");
                    
                    if (vertices != null && !vertices.isEmpty()) {
                        extractVerticesFromPolyline(vertices, coordinates, polylineCount);
                    }
                }
            }
        }
    }

    /**
     * Extrai vértices de uma polyline específica
     */
    private void extractVerticesFromPolyline(List<Map<String, Object>> vertices, 
                                           Map<String, RealCoordinate> coordinates, 
                                           int polylineIndex) {
        
        int sirgasCount = 0;
        for (int i = 0; i < vertices.size(); i++) {
            Map<String, Object> vertex = vertices.get(i);
            Double x = getDoubleValue(vertex.get("x"));
            Double y = getDoubleValue(vertex.get("y"));
            
            if (x != null && y != null && isSirgasCoordinate(x, y)) {
                // Gerar nome único: P01_L1, P02_L1, etc.
                String pointName = String.format("P%02d_L%d", i + 1, polylineIndex);
                
                RealCoordinate coord = new RealCoordinate(x, y, "POLYLINE_VERTEX");
                coordinates.put(pointName, coord);
                sirgasCount++;
            }
        }
        
    }

    /**
     * FASE 3: Extração de vértices gerais (backup)
     */
    private void extractFromVertices(List<Map<String, Object>> entities, Map<String, RealCoordinate> coordinates) {
        // Só extrai se não temos coordenadas suficientes das fases anteriores
        if (coordinates.size() < 4) {
            for (Map<String, Object> entity : entities) {
                Double x = getDoubleValue(entity.get("x"));
                Double y = getDoubleValue(entity.get("y"));
                
                if (x != null && y != null && isSirgasCoordinate(x, y)) {
                    String pointName = "V" + String.format("%02d", coordinates.size() + 1);
                    RealCoordinate coord = new RealCoordinate(x, y, "VERTEX");
                    coordinates.put(pointName, coord);
                }
            }
        }
    }

    /**
     * FASE 4: Validação e filtragem de coordenadas
     */
    private Map<String, RealCoordinate> validateCoordinates(Map<String, RealCoordinate> coordinates) {
        Map<String, RealCoordinate> validCoordinates = new LinkedHashMap<>();
        
        for (Map.Entry<String, RealCoordinate> entry : coordinates.entrySet()) {
            RealCoordinate coord = entry.getValue();
            
            if (isValidSirgasCoordinate(coord.getE(), coord.getN())) {
                validCoordinates.put(entry.getKey(), coord);
            }
        }
        
        return validCoordinates;
    }

    /**
     * Verifica se o texto contém coordenadas SIRGAS 2000
     */
    private boolean isSirgasCoordinateText(String text) {
        if (text == null) return false;
        
        String cleanText = text.trim().toUpperCase();
        
        // Padrões mais flexíveis para detectar coordenadas
        boolean hasEasting = cleanText.matches(".*E\\s*\\d{6,}.*") || 
                           cleanText.matches(".*EASTING\\s*\\d{6,}.*") ||
                           cleanText.matches(".*X\\s*\\d{6,}.*");
        
        boolean hasNorthing = cleanText.matches(".*N\\s*\\d{7,}.*") || 
                            cleanText.matches(".*NORTHING\\s*\\d{7,}.*") ||
                            cleanText.matches(".*Y\\s*\\d{7,}.*");
        
        // Deve conter E e N com números grandes (SIRGAS)
        boolean standardFormat = cleanText.matches(".*E\\s*\\d{6,}.*N\\s*\\d{7,}.*") ||
                               cleanText.matches(".*N\\s*\\d{7,}.*E\\s*\\d{6,}.*");
        
        // Formato alternativo com coordenadas grandes
        boolean hasLargeNumbers = cleanText.matches(".*\\d{6,}.*\\d{7,}.*");
        
        // Palavras-chave que indicam coordenadas
        boolean hasCoordinateKeywords = cleanText.contains("COORD") || 
                                      cleanText.contains("UTM") || 
                                      cleanText.contains("SIRGAS") ||
                                      cleanText.contains("PONTO");
        
        boolean result = standardFormat || (hasEasting && hasNorthing) || 
                        (hasLargeNumbers && hasCoordinateKeywords);
        
        return result;
    }

    /**
     * Extrai nome do ponto (P01, P02, etc.)
     */
    private String extractPointName(String text) {
        if (text == null) return null;
        
        Matcher matcher = POINT_PATTERN.matcher(text);
        if (matcher.find()) {
            return "P" + String.format("%02d", Integer.parseInt(matcher.group(1)));
        }
        
        return null;
    }

    /**
     * Faz parsing de coordenadas SIRGAS 2000 do texto
     */
    private RealCoordinate parseSirgasCoordinates(String text) {
        if (text == null) return null;
        
        String cleanText = text.trim().toUpperCase();
        
        try {
            // Tentar padrão principal primeiro
            Matcher matcher = SIRGAS_PATTERN.matcher(cleanText);
            
            if (matcher.find()) {
                String eStr = null, nStr = null;
                
                // Padrão: E seguido de N
                if (matcher.group(1) != null && matcher.group(2) != null) {
                    eStr = matcher.group(1).replace(",", ".");
                    nStr = matcher.group(2).replace(",", ".");
                }
                // Padrão: N seguido de E
                else if (matcher.group(3) != null && matcher.group(4) != null) {
                    nStr = matcher.group(3).replace(",", ".");
                    eStr = matcher.group(4).replace(",", ".");
                }
                
                if (eStr != null && nStr != null) {
                    double eCoord = Double.parseDouble(eStr);
                    double nCoord = Double.parseDouble(nStr);
                    
                    if (isValidSirgasCoordinate(eCoord, nCoord)) {
                        return new RealCoordinate(eCoord, nCoord, "TEXT_PARSED");
                    }
                }
            }
            
            // Padrão alternativo: buscar números grandes no texto
            Pattern numberPattern = Pattern.compile("\\d{6,}[.,]?\\d*");
            Matcher numberMatcher = numberPattern.matcher(cleanText);
            
            List<Double> numbers = new ArrayList<>();
            while (numberMatcher.find() && numbers.size() < 4) {
                try {
                    String numStr = numberMatcher.group().replace(",", ".");
                    double num = Double.parseDouble(numStr);
                    numbers.add(num);
                } catch (NumberFormatException e) {
                    // Ignorar números inválidos
                }
            }
            
            // Tentar identificar E e N pelos valores
            for (int i = 0; i < numbers.size() - 1; i++) {
                double first = numbers.get(i);
                double second = numbers.get(i + 1);
                
                // Testar first=E, second=N
                if (isValidSirgasCoordinate(first, second)) {
                    return new RealCoordinate(first, second, "TEXT_NUMBERS");
                }
                
                // Testar first=N, second=E
                if (isValidSirgasCoordinate(second, first)) {
                    return new RealCoordinate(second, first, "TEXT_NUMBERS");
                }
            }
            
        } catch (Exception e) {
            return null;
        }
        
        return null;
    }

    /**
     * Verifica se as coordenadas são válidas para SIRGAS 2000 no Brasil
     */
    private boolean isSirgasCoordinate(double x, double y) {
        // Faixa válida para SIRGAS 2000 no Brasil
        // E (Easting): 100.000 a 999.999
        // N (Northing): 1.000.000 a 99.999.999
        return x >= 100000 && x <= 999999 && y >= 1000000 && y <= 99999999;
    }

    /**
     * Validação mais rigorosa para coordenadas SIRGAS
     */
    private boolean isValidSirgasCoordinate(double e, double n) {
        // Ceará está aproximadamente em:
        // E: 200.000 a 800.000
        // N: 9.000.000 a 10.000.000
        return e >= 200000 && e <= 800000 && n >= 9000000 && n <= 10000000;
    }

    /**
     * Converte Object para Double de forma segura
     */
    private Double getDoubleValue(Object value) {
        if (value == null) return null;
        
        try {
            if (value instanceof Number) {
                return ((Number) value).doubleValue();
            }
            if (value instanceof String) {
                return Double.parseDouble(((String) value).replace(",", "."));
            }
        } catch (NumberFormatException e) {
            // Ignora valores inválidos
        }
        
        return null;
    }

    private List<TextCell> extractTextCells(List<Map<String, Object>> entities) {
        List<TextCell> cells = new ArrayList<>();

        for (Map<String, Object> entity : entities) {
            String type = (String) entity.get("type");
            if (!"TEXT".equals(type) && !"MTEXT".equals(type)) {
                continue;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> properties = (Map<String, Object>) entity.get("properties");
            String text = properties != null ? (String) properties.get("text") : (String) entity.get("text");
            if (text == null || text.trim().isEmpty()) {
                continue;
            }

            Double x = null;
            Double y = null;
            Double height = null;
            if (properties != null) {
                x = firstNonNullDouble(
                        getDoubleValue(properties.get("x")),
                        getDoubleValue(properties.get("alignmentX")),
                        getDoubleValue(properties.get("x1"))
                );
                y = firstNonNullDouble(
                        getDoubleValue(properties.get("y")),
                        getDoubleValue(properties.get("alignmentY")),
                        getDoubleValue(properties.get("y1"))
                );
                height = firstNonNullDouble(
                        getDoubleValue(properties.get("height")),
                        getDoubleValue(properties.get("textHeight"))
                );
            }

            if (x == null) {
                x = firstNonNullDouble(
                        getDoubleValue(entity.get("x")),
                        getDoubleValue(entity.get("alignmentX")),
                        getDoubleValue(entity.get("x1"))
                );
            }
            if (y == null) {
                y = firstNonNullDouble(
                        getDoubleValue(entity.get("y")),
                        getDoubleValue(entity.get("alignmentY")),
                        getDoubleValue(entity.get("y1"))
                );
            }

            if (x != null && y != null) {
                cells.add(new TextCell(text.trim(), x, y, height != null ? height : 1.0));
            }
        }

        return cells;
    }

    private void extractFromTableRows(List<TextCell> textCells, Map<String, RealCoordinate> coordinates) {
        List<TextCell> relevantCells = textCells.stream()
                .filter(cell -> containsPotentialPointData(cell.text()))
                .sorted(Comparator
                        .comparingDouble(TextCell::y).reversed()
                        .thenComparingDouble(TextCell::x))
                .collect(Collectors.toList());

        if (relevantCells.isEmpty()) {
            return;
        }

        double rowTolerance = determineRowTolerance(relevantCells);
        List<List<TextCell>> rows = clusterRows(relevantCells, rowTolerance);

        for (List<TextCell> row : rows) {
            if (row.isEmpty() || isHeaderRow(row)) {
                continue;
            }

            String pointName = row.stream()
                    .map(cell -> extractPointName(cell.text()))
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse(null);

            if (pointName == null || coordinates.containsKey(pointName)) {
                continue;
            }

            RealCoordinate rowCoordinate = parseCoordinateRow(row);
            if (rowCoordinate != null) {
                coordinates.put(pointName, rowCoordinate);
            }
        }
    }

    private boolean containsPotentialPointData(String text) {
        return extractPointName(text) != null
                || isSirgasCoordinateText(text)
                || LARGE_NUMBER_PATTERN.matcher(text.replace(",", ".")).find();
    }

    private boolean isHeaderRow(List<TextCell> row) {
        return row.stream().anyMatch(cell -> HEADER_TEXT_PATTERN.matcher(cell.text()).find());
    }

    private double determineRowTolerance(List<TextCell> cells) {
        List<Double> heights = cells.stream()
                .map(TextCell::height)
                .filter(Objects::nonNull)
                .filter(height -> height > 0)
                .sorted()
                .collect(Collectors.toList());

        if (heights.isEmpty()) {
            return 1.5;
        }

        double medianHeight = heights.get(heights.size() / 2);
        return Math.max(1.2, medianHeight * 0.9);
    }

    private List<List<TextCell>> clusterRows(List<TextCell> cells, double tolerance) {
        List<List<TextCell>> rows = new ArrayList<>();
        List<TextCell> currentRow = new ArrayList<>();
        double currentBaseline = Double.NaN;

        for (TextCell cell : cells) {
            if (currentRow.isEmpty()) {
                currentRow.add(cell);
                currentBaseline = cell.y();
                continue;
            }

            if (Math.abs(cell.y() - currentBaseline) <= tolerance) {
                currentRow.add(cell);
                currentBaseline = currentRow.stream().mapToDouble(TextCell::y).average().orElse(currentBaseline);
            } else {
                rows.add(currentRow.stream()
                        .sorted(Comparator.comparingDouble(TextCell::x))
                        .collect(Collectors.toList()));
                currentRow = new ArrayList<>();
                currentRow.add(cell);
                currentBaseline = cell.y();
            }
        }

        if (!currentRow.isEmpty()) {
            rows.add(currentRow.stream()
                    .sorted(Comparator.comparingDouble(TextCell::x))
                    .collect(Collectors.toList()));
        }

        return rows;
    }

    private RealCoordinate parseCoordinateRow(List<TextCell> row) {
        for (TextCell cell : row) {
            RealCoordinate combined = parseSirgasCoordinates(cell.text());
            if (combined != null) {
                return new RealCoordinate(combined.getE(), combined.getN(), "TABLE_ROW");
            }
        }

        Double easting = null;
        Double northing = null;

        for (TextCell cell : row) {
            CoordinateParts parts = extractCoordinateParts(cell.text());
            if (easting == null && parts.easting() != null) {
                easting = parts.easting();
            }
            if (northing == null && parts.northing() != null) {
                northing = parts.northing();
            }
        }

        if (easting != null && northing != null && isValidSirgasCoordinate(easting, northing)) {
            return new RealCoordinate(easting, northing, "TABLE_ROW");
        }

        return null;
    }

    private CoordinateParts extractCoordinateParts(String text) {
        String cleanText = text == null ? "" : text.trim().toUpperCase().replace(",", ".");
        Double easting = extractPrefixedCoordinate(cleanText, "E");
        if (easting == null) {
            easting = extractPrefixedCoordinate(cleanText, "X");
        }

        Double northing = extractPrefixedCoordinate(cleanText, "N");
        if (northing == null) {
            northing = extractPrefixedCoordinate(cleanText, "Y");
        }

        List<Double> numbers = extractLargeNumbers(cleanText);
        for (Double value : numbers) {
            if (easting == null && isPotentialEasting(value)) {
                easting = value;
                continue;
            }
            if (northing == null && isPotentialNorthing(value)) {
                northing = value;
            }
        }

        return new CoordinateParts(easting, northing);
    }

    private Double extractPrefixedCoordinate(String text, String prefix) {
        Pattern prefixedPattern = Pattern.compile("\\b" + prefix + "\\s*(\\d{6,}[.,]?\\d*)");
        Matcher matcher = prefixedPattern.matcher(text);
        if (!matcher.find()) {
            return null;
        }

        try {
            return Double.parseDouble(matcher.group(1).replace(",", "."));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private List<Double> extractLargeNumbers(String text) {
        List<Double> numbers = new ArrayList<>();
        Matcher matcher = LARGE_NUMBER_PATTERN.matcher(text);
        while (matcher.find()) {
            try {
                numbers.add(Double.parseDouble(matcher.group().replace(",", ".")));
            } catch (NumberFormatException ex) {
                // Ignora valores invalidos
            }
        }
        return numbers;
    }

    private boolean isPotentialEasting(double value) {
        return value >= 200000 && value <= 800000;
    }

    private boolean isPotentialNorthing(double value) {
        return value >= 9000000 && value <= 10000000;
    }

    private String buildGenericPointName(Map<String, RealCoordinate> coordinates) {
        int index = coordinates.size() + 1;
        String candidate = "T" + String.format("%02d", index);
        while (coordinates.containsKey(candidate)) {
            index++;
            candidate = "T" + String.format("%02d", index);
        }
        return candidate;
    }

    @SafeVarargs
    private final <T> T firstNonNullDouble(T... values) {
        for (T value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private record TextCell(String text, double x, double y, Double height) {}

    private record CoordinateParts(Double easting, Double northing) {}

    /**
     * Classe para representar coordenadas reais
     */
    public static class RealCoordinate {
        private final double e; // Easting
        private final double n; // Northing
        private final String source; // Fonte da coordenada
        
        public RealCoordinate(double e, double n, String source) {
            this.e = e;
            this.n = n;
            this.source = source;
        }
        
        public double getE() { return e; }
        public double getN() { return n; }
        public String getSource() { return source; }
        
        @Override
        public String toString() {
            return String.format("E %.2f N %.2f (%s)", e, n, source);
        }
    }
}
