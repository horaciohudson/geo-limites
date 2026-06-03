package com.momorialPro.CadMemorial.util;

import java.util.List;
import java.util.ArrayList;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Utilitário para cálculos geométricos precisos em memoriais descritivos
 * Conforme normas ABNT NBR 13133:1994 e práticas de engenharia cartográfica
 */
public final class GeometricCalculator {

    private GeometricCalculator() {}

    /**
     * Representa um ponto com coordenadas UTM/SIRGAS 2000
     */
    public record Point(double x, double y, String id) {
        public Point(double x, double y) {
            this(x, y, null);
        }
    }

    /**
     * Representa uma linha com distância e azimute
     */
    public record Line(Point start, Point end, double distance, double azimuth) {}

    /**
     * Calcula a distância euclidiana entre dois pontos
     */
    public static double calculateDistance(Point p1, Point p2) {
        double dx = p2.x() - p1.x();
        double dy = p2.y() - p1.y();
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calcula o azimute entre dois pontos em graus (0-360°)
     * Azimute é medido no sentido horário a partir do Norte
     */
    public static double calculateAzimuth(Point p1, Point p2) {
        double dx = p2.x() - p1.x();
        double dy = p2.y() - p1.y();
        
        double angleRad = Math.atan2(dx, dy);
        double angleDeg = Math.toDegrees(angleRad);
        
        // Converte para azimute (0-360°, sentido horário do Norte)
        if (angleDeg < 0) {
            angleDeg += 360;
        }
        
        return angleDeg;
    }

    /**
     * Calcula o perímetro de um polígono fechado
     */
    public static double calculatePerimeter(List<Point> vertices) {
        if (vertices.size() < 3) {
            throw new IllegalArgumentException("Polígono deve ter pelo menos 3 vértices");
        }

        double perimeter = 0.0;
        for (int i = 0; i < vertices.size(); i++) {
            Point current = vertices.get(i);
            Point next = vertices.get((i + 1) % vertices.size());
            perimeter += calculateDistance(current, next);
        }
        
        return perimeter;
    }

    /**
     * Calcula a área de um polígono usando a fórmula de Shoelace (Gauss)
     * Adequada para polígonos simples (sem auto-interseções)
     */
    public static double calculateArea(List<Point> vertices) {
        if (vertices.size() < 3) {
            throw new IllegalArgumentException("Polígono deve ter pelo menos 3 vértices");
        }

        double area = 0.0;
        int n = vertices.size();
        
        for (int i = 0; i < n; i++) {
            Point current = vertices.get(i);
            Point next = vertices.get((i + 1) % n);
            area += (current.x() * next.y()) - (next.x() * current.y());
        }
        
        return Math.abs(area) / 2.0;
    }

    /**
     * Gera as linhas de um polígono com distâncias e azimutes
     */
    public static List<Line> generatePolygonLines(List<Point> vertices) {
        if (vertices.size() < 3) {
            throw new IllegalArgumentException("Polígono deve ter pelo menos 3 vértices");
        }

        List<Line> lines = new ArrayList<>();
        for (int i = 0; i < vertices.size(); i++) {
            Point start = vertices.get(i);
            Point end = vertices.get((i + 1) % vertices.size());
            double distance = calculateDistance(start, end);
            double azimuth = calculateAzimuth(start, end);
            lines.add(new Line(start, end, distance, azimuth));
        }
        
        return lines;
    }

    /**
     * Determina a direção cardeal baseada no azimute
     */
    public static String getCardinalDirection(double azimuth) {
        // Normaliza o azimute para 0-360°
        azimuth = azimuth % 360;
        if (azimuth < 0) azimuth += 360;

        if (azimuth >= 337.5 || azimuth < 22.5) return "NORTE";
        else if (azimuth >= 22.5 && azimuth < 67.5) return "NORDESTE";
        else if (azimuth >= 67.5 && azimuth < 112.5) return "LESTE";
        else if (azimuth >= 112.5 && azimuth < 157.5) return "SUDESTE";
        else if (azimuth >= 157.5 && azimuth < 202.5) return "SUL";
        else if (azimuth >= 202.5 && azimuth < 247.5) return "SUDOESTE";
        else if (azimuth >= 247.5 && azimuth < 292.5) return "OESTE";
        else return "NOROESTE";
    }

    /**
     * Formata coordenadas no padrão UTM/SIRGAS 2000
     */
    public static String formatCoordinate(double coordinate, String type) {
        BigDecimal bd = new BigDecimal(coordinate).setScale(2, RoundingMode.HALF_UP);
        return String.format("%s %s m", type, bd.toString());
    }

    /**
     * Formata distância com precisão adequada para memoriais
     */
    public static String formatDistance(double distance) {
        BigDecimal bd = new BigDecimal(distance).setScale(2, RoundingMode.HALF_UP);
        return bd.toString() + "m";
    }

    /**
     * Formata área com precisão adequada para memoriais
     */
    public static String formatArea(double area) {
        BigDecimal bd = new BigDecimal(area).setScale(2, RoundingMode.HALF_UP);
        return bd.toString() + "m²";
    }

    /**
     * Formata azimute em graus, minutos e segundos
     */
    public static String formatAzimuth(double azimuth) {
        int degrees = (int) azimuth;
        double minutesDecimal = (azimuth - degrees) * 60;
        int minutes = (int) minutesDecimal;
        double seconds = (minutesDecimal - minutes) * 60;
        
        return String.format("%d°%02d'%05.2f\"", degrees, minutes, seconds);
    }

    /**
     * Calcula o centroide de um polígono
     */
    public static Point calculateCentroid(List<Point> vertices) {
        if (vertices.isEmpty()) {
            throw new IllegalArgumentException("Lista de vértices não pode estar vazia");
        }

        double sumX = 0.0;
        double sumY = 0.0;
        
        for (Point vertex : vertices) {
            sumX += vertex.x();
            sumY += vertex.y();
        }
        
        return new Point(sumX / vertices.size(), sumY / vertices.size(), "CENTROIDE");
    }

    /**
     * Verifica se um polígono está em sentido horário
     */
    public static boolean isClockwise(List<Point> vertices) {
        if (vertices.size() < 3) {
            return false;
        }

        double sum = 0.0;
        for (int i = 0; i < vertices.size(); i++) {
            Point current = vertices.get(i);
            Point next = vertices.get((i + 1) % vertices.size());
            sum += (next.x() - current.x()) * (next.y() + current.y());
        }
        
        return sum > 0;
    }

    /**
     * Converte coordenadas para o formato de memorial descritivo
     */
    public static String formatPointForMemorial(Point point) {
        if (point.id() != null) {
            return String.format("%s coordenadas %s e %s", 
                point.id(),
                formatCoordinate(point.x(), "E"),
                formatCoordinate(point.y(), "N"));
        } else {
            return String.format("coordenadas %s e %s", 
                formatCoordinate(point.x(), "E"),
                formatCoordinate(point.y(), "N"));
        }
    }

    /**
     * Gera descrição de confrontação baseada no azimute
     */
    public static String generateConfrontationDescription(Line line, String neighborProperty) {
        String direction = getCardinalDirection(line.azimuth());
        String distance = formatDistance(line.distance());
        String azimuth = formatAzimuth(line.azimuth());
        
        if (neighborProperty != null && !neighborProperty.trim().isEmpty()) {
            return String.format("AO %s: confronta com %s, numa extensão de %s, azimute %s", 
                direction, neighborProperty, distance, azimuth);
        } else {
            return String.format("AO %s: numa extensão de %s, azimute %s", 
                direction, distance, azimuth);
        }
    }
}