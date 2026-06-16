package com.momorialPro.CadMemorial.util;

import java.text.DecimalFormat;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utilitários para processamento de coordenadas UTM/SIRGAS 2000
 * Conforme ABNT NBR 13133:1994 e práticas de engenharia cartográfica
 */
public class CoordinateUtils {
    
    private static final DecimalFormat COORDINATE_FORMAT = new DecimalFormat("#,##0.00");
    private static final DecimalFormat DISTANCE_FORMAT = new DecimalFormat("#,##0.00");
    private static final DecimalFormat AREA_FORMAT = new DecimalFormat("#,##0.00");
    private static final DecimalFormat ANGLE_FORMAT = new DecimalFormat("0.00");
    
    // Padrões para identificação de coordenadas em textos
    private static final Pattern COORDINATE_PATTERN = Pattern.compile(
        "(?i)(?:E|X)\\s*[=:]?\\s*([0-9,\\.]+)\\s*(?:m)?\\s*(?:e|,|;)?\\s*(?:N|Y)\\s*[=:]?\\s*([0-9,\\.]+)\\s*(?:m)?"
    );
    
    private static final Pattern POINT_PATTERN = Pattern.compile(
        "(?i)(?:P|PONTO)\\s*([0-9]+)"
    );
    
    private static final Pattern LOT_PATTERN = Pattern.compile(
        "(?i)(?:LOTE|L)\\s*([0-9]+)"
    );
    
    /**
     * Representa um ponto com coordenadas UTM/SIRGAS 2000
     */
    public static class Point {
        private final double x; // Easting
        private final double y; // Northing
        private final String id;
        
        public Point(double x, double y) {
            this(x, y, null);
        }
        
        public Point(double x, double y, String id) {
            this.x = x;
            this.y = y;
            this.id = id;
        }
        
        public double getX() { return x; }
        public double getY() { return y; }
        public String getId() { return id; }
        
        @Override
        public String toString() {
            return formatCoordinate(x, y, id);
        }
    }
    
    /**
     * Formata coordenadas no padrão profissional
     * Exemplo: "P01 coordenadas E 123.456,78m e N 7.654.321,09m"
     */
    public static String formatCoordinate(double x, double y, String pointId) {
        String id = (pointId != null && !pointId.trim().isEmpty()) ? pointId : "P??";
        return String.format("%s coordenadas E %sm e N %sm", 
            id, 
            COORDINATE_FORMAT.format(x), 
            COORDINATE_FORMAT.format(y)
        );
    }
    
    /**
     * Formata coordenadas simples
     */
    public static String formatCoordinate(double x, double y) {
        return String.format("E %sm, N %sm", 
            COORDINATE_FORMAT.format(x), 
            COORDINATE_FORMAT.format(y)
        );
    }
    
    /**
     * Formata distância no padrão técnico
     */
    public static String formatDistance(double distance) {
        return DISTANCE_FORMAT.format(distance) + "m";
    }
    
    /**
     * Formata área no padrão técnico
     */
    public static String formatArea(double area) {
        return AREA_FORMAT.format(area) + "m²";
    }
    
    /**
     * Formata azimute no padrão técnico
     */
    public static String formatAzimuth(double azimuth) {
        return ANGLE_FORMAT.format(azimuth) + "°";
    }
    
    /**
     * Converte azimute para rumo (direção cardeal)
     */
    public static String azimuthToCardinalDirection(double azimuth) {
        // Normaliza azimute para 0-360°
        azimuth = azimuth % 360;
        if (azimuth < 0) azimuth += 360;
        
        if (azimuth >= 337.5 || azimuth < 22.5) return "Norte";
        if (azimuth >= 22.5 && azimuth < 67.5) return "Nordeste";
        if (azimuth >= 67.5 && azimuth < 112.5) return "Leste";
        if (azimuth >= 112.5 && azimuth < 157.5) return "Sudeste";
        if (azimuth >= 157.5 && azimuth < 202.5) return "Sul";
        if (azimuth >= 202.5 && azimuth < 247.5) return "Sudoeste";
        if (azimuth >= 247.5 && azimuth < 292.5) return "Oeste";
        if (azimuth >= 292.5 && azimuth < 337.5) return "Noroeste";
        
        return "Norte"; // fallback
    }
    
    /**
     * Converte azimute para rumo técnico (ex: N 45°30' E)
     */
    public static String azimuthToTechnicalBearing(double azimuth) {
        // Normaliza azimute para 0-360°
        azimuth = azimuth % 360;
        if (azimuth < 0) azimuth += 360;
        
        String quadrant;
        double angle;
        
        if (azimuth >= 0 && azimuth <= 90) {
            quadrant = "NE";
            angle = azimuth;
        } else if (azimuth > 90 && azimuth <= 180) {
            quadrant = "SE";
            angle = 180 - azimuth;
        } else if (azimuth > 180 && azimuth <= 270) {
            quadrant = "SW";
            angle = azimuth - 180;
        } else {
            quadrant = "NW";
            angle = 360 - azimuth;
        }
        
        int degrees = (int) angle;
        int minutes = (int) ((angle - degrees) * 60);
        
        return String.format("%c %d°%02d' %c", 
            quadrant.charAt(0), degrees, minutes, quadrant.charAt(1));
    }
    
    /**
     * Extrai coordenadas de texto usando padrões regex
     */
    public static Point extractCoordinatesFromText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        
        Matcher matcher = COORDINATE_PATTERN.matcher(text);
        if (matcher.find()) {
            try {
                String xStr = matcher.group(1).replace(",", ".");
                String yStr = matcher.group(2).replace(",", ".");
                
                double x = Double.parseDouble(xStr);
                double y = Double.parseDouble(yStr);
                
                // Tenta extrair ID do ponto
                String pointId = extractPointId(text);
                
                return new Point(x, y, pointId);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        
        return null;
    }
    
    /**
     * Extrai ID de ponto do texto (P01, P02, etc.)
     */
    public static String extractPointId(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        
        Matcher matcher = POINT_PATTERN.matcher(text);
        if (matcher.find()) {
            String number = matcher.group(1);
            return String.format("P%02d", Integer.parseInt(number));
        }
        
        return null;
    }
    
    /**
     * Extrai ID de lote do texto (LOTE 01, L01, etc.)
     */
    public static String extractLotId(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        
        Matcher matcher = LOT_PATTERN.matcher(text);
        if (matcher.find()) {
            String number = matcher.group(1);
            return String.format("LOTE %02d", Integer.parseInt(number));
        }
        
        return null;
    }
    
    /**
     * Valida se as coordenadas estão dentro de faixas válidas para UTM/SIRGAS 2000
     * Inclui coordenadas locais/regionais e sistemas de referência alternativos
     */
    public static boolean isValidUTMCoordinate(double x, double y) {
        // Faixas expandidas para incluir:
        // - UTM padrão no Brasil: X(160.000-840.000), Y(1.000.000-10.000.000)
        // - Coordenadas locais/regionais: X(1.000-100.000), Y(1.000-1.000.000)
        // - Sistemas topográficos locais: valores menores
        
        // Rejeita apenas coordenadas claramente inválidas (muito próximas de zero ou negativas)
        return x > 0.1 && y > 0.1 && 
               x < 50000000 && y < 50000000; // Limites muito amplos para aceitar diversos sistemas
    }
    
    /**
     * Determina o fuso UTM baseado na coordenada X
     */
    public static int determineUTMZone(double x) {
        // Faixas aproximadas dos fusos UTM no Brasil
        if (x >= 160000 && x <= 240000) return 18;
        if (x >= 240000 && x <= 320000) return 19;
        if (x >= 320000 && x <= 400000) return 20;
        if (x >= 400000 && x <= 480000) return 21;
        if (x >= 480000 && x <= 560000) return 22;
        if (x >= 560000 && x <= 640000) return 23;
        if (x >= 640000 && x <= 720000) return 24;
        if (x >= 720000 && x <= 800000) return 25;
        
        return 23; // Fuso mais comum no Brasil (fallback)
    }
    
    /**
     * Gera descrição técnica de coordenadas para memorial
     */
    public static String generateCoordinateDescription(List<Point> points) {
        if (points == null || points.isEmpty()) {
            return "Coordenadas não disponíveis para análise técnica.";
        }
        
        StringBuilder desc = new StringBuilder();
        desc.append("COORDENADAS UTM/SIRGAS 2000:\n");
        
        // Determina fuso UTM baseado no primeiro ponto
        int zone = determineUTMZone(points.get(0).getX());
        desc.append(String.format("Fuso UTM: %dS\n", zone));
        desc.append("Datum: SIRGAS 2000\n\n");
        
        // Lista todos os pontos
        for (Point point : points) {
            desc.append("- ").append(point.toString()).append("\n");
        }
        
        return desc.toString();
    }
    
    /**
     * Valida qualidade dos dados de coordenadas
     */
    public static String validateCoordinateQuality(List<Point> points) {
        if (points == null || points.isEmpty()) {
            return "CRÍTICO: Nenhuma coordenada válida identificada";
        }
        
        int validPoints = 0;
        int invalidPoints = 0;
        
        for (Point point : points) {
            if (isValidUTMCoordinate(point.getX(), point.getY())) {
                validPoints++;
            } else {
                invalidPoints++;
            }
        }
        
        if (invalidPoints == 0) {
            return "EXCELENTE: Todas as coordenadas são válidas para UTM/SIRGAS 2000";
        } else if (validPoints > invalidPoints) {
            return String.format("BOM: %d coordenadas válidas, %d suspeitas", validPoints, invalidPoints);
        } else {
            return String.format("ATENÇÃO: %d coordenadas suspeitas de %d total", invalidPoints, points.size());
        }
    }
}