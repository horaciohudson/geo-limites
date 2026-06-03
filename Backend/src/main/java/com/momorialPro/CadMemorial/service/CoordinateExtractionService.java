package com.momorialPro.CadMemorial.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

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
    
    private static final Pattern POINT_PATTERN = Pattern.compile("P(\\d{1,3})");

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
        for (Map<String, Object> entity : entities) {
            String type = (String) entity.get("type");
            
            if ("TEXT".equals(type) || "MTEXT".equals(type)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> properties = (Map<String, Object>) entity.get("properties");
                
                String text = null;
                if (properties != null) {
                    text = (String) properties.get("text");
                } else {
                    // Fallback: tentar pegar texto diretamente da entidade
                    text = (String) entity.get("text");
                }
                
                if (text != null) {
                    if (isSirgasCoordinateText(text)) {
                        String pointName = extractPointName(text);
                        RealCoordinate coord = parseSirgasCoordinates(text);
                        
                        if (pointName != null && coord != null) {
                            coordinates.put(pointName, coord);
                        } else if (coord != null) {
                            // Se não conseguiu extrair nome do ponto, usar um genérico
                            String genericName = "T" + String.format("%02d", coordinates.size() + 1);
                            coordinates.put(genericName, coord);
                        }
                    }
                }
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
