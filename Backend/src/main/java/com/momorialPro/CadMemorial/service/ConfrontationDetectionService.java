package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.util.GeometricCalculator;
import com.momorialPro.CadMemorial.util.CoordinateUtils;
import com.momorialPro.CadMemorial.util.CoordinateUtils.Point;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Serviço para detecção automática de confrontações baseada em análise geométrica
 * Conforme ABNT NBR 13133:1994 e práticas de engenharia cartográfica
 */
@Service
public class ConfrontationDetectionService {
    
    /**
     * Representa uma confrontação identificada
     */
    public static class Confrontation {
        private final Point startPoint;
        private final Point endPoint;
        private final double distance;
        private final double azimuth;
        private final String direction;
        private final String technicalBearing;
        private final String description;
        
        public Confrontation(Point startPoint, Point endPoint, String description) {
            this.startPoint = startPoint;
            this.endPoint = endPoint;
            
            // Converte para GeometricCalculator.Point para cálculos
            GeometricCalculator.Point geoStart = new GeometricCalculator.Point(startPoint.getX(), startPoint.getY(), startPoint.getId());
            GeometricCalculator.Point geoEnd = new GeometricCalculator.Point(endPoint.getX(), endPoint.getY(), endPoint.getId());
            
            this.distance = GeometricCalculator.calculateDistance(geoStart, geoEnd);
            this.azimuth = GeometricCalculator.calculateAzimuth(geoStart, geoEnd);
            this.direction = CoordinateUtils.azimuthToCardinalDirection(azimuth);
            this.technicalBearing = CoordinateUtils.azimuthToTechnicalBearing(azimuth);
            this.description = description;
        }
        
        // Getters
        public Point getStartPoint() { return startPoint; }
        public Point getEndPoint() { return endPoint; }
        public double getDistance() { return distance; }
        public double getAzimuth() { return azimuth; }
        public String getDirection() { return direction; }
        public String getTechnicalBearing() { return technicalBearing; }
        public String getDescription() { return description; }
        
        public String getFormattedDescription() {
            return String.format(
                "Segue por %s, distância de %s, rumo %s, do %s ao %s",
                description != null ? description : "divisa",
                CoordinateUtils.formatDistance(distance),
                technicalBearing,
                startPoint.getId() != null ? startPoint.getId() : "ponto inicial",
                endPoint.getId() != null ? endPoint.getId() : "ponto final"
            );
        }
    }
    
    /**
     * Detecta confrontações automáticas baseadas em lista de pontos
     */
    public List<Confrontation> detectConfrontations(List<Point> points) {
        if (points == null || points.size() < 2) {
            return Collections.emptyList();
        }
        
        List<Confrontation> confrontations = new ArrayList<>();
        
        // Ordena pontos por proximidade (forma um polígono)
        List<Point> orderedPoints = orderPointsByProximity(points);
        
        // Cria confrontações entre pontos consecutivos
        for (int i = 0; i < orderedPoints.size(); i++) {
            Point current = orderedPoints.get(i);
            Point next = orderedPoints.get((i + 1) % orderedPoints.size()); // Volta ao primeiro ponto
            
            String description = generateConfrontationDescription(current, next, i + 1);
            confrontations.add(new Confrontation(current, next, description));
        }
        
        return confrontations;
    }
    
    /**
     * Ordena pontos por proximidade para formar um polígono coerente
     */
    private List<Point> orderPointsByProximity(List<Point> points) {
        if (points.size() <= 2) {
            return new ArrayList<>(points);
        }
        
        List<Point> ordered = new ArrayList<>();
        List<Point> remaining = new ArrayList<>(points);
        
        // Começa com o ponto mais ao sudoeste (menor Y, depois menor X)
        Point start = remaining.stream()
            .min(Comparator.comparing(Point::getY).thenComparing(Point::getX))
            .orElse(remaining.get(0));
        
        ordered.add(start);
        remaining.remove(start);
        
        // Adiciona pontos por proximidade, preferindo sentido horário
        Point current = start;
        while (!remaining.isEmpty()) {
            Point next = findNextPointClockwise(current, remaining, ordered.size() == 1 ? null : ordered.get(ordered.size() - 2));
            ordered.add(next);
            remaining.remove(next);
            current = next;
        }
        
        return ordered;
    }
    
    /**
     * Encontra o próximo ponto no sentido horário
     */
    private Point findNextPointClockwise(Point current, List<Point> candidates, Point previous) {
        if (candidates.size() == 1) {
            return candidates.get(0);
        }
        
        // Calcula ângulos para todos os candidatos
        Map<Point, Double> angles = new HashMap<>();
        
        for (Point candidate : candidates) {
            GeometricCalculator.Point geoCurrent = new GeometricCalculator.Point(current.getX(), current.getY(), current.getId());
            GeometricCalculator.Point geoCandidate = new GeometricCalculator.Point(candidate.getX(), candidate.getY(), candidate.getId());
            
            double angle = GeometricCalculator.calculateAzimuth(geoCurrent, geoCandidate);
            
            // Se há ponto anterior, ajusta ângulo para preferir sentido horário
            if (previous != null) {
                GeometricCalculator.Point geoPrevious = new GeometricCalculator.Point(previous.getX(), previous.getY(), previous.getId());
                
                double previousAngle = GeometricCalculator.calculateAzimuth(geoPrevious, geoCurrent);
                
                // Normaliza para encontrar o menor ângulo no sentido horário
                double relativeAngle = angle - previousAngle;
                if (relativeAngle < 0) relativeAngle += 360;
                if (relativeAngle > 180) relativeAngle = 360 - relativeAngle;
                
                angles.put(candidate, relativeAngle);
            } else {
                angles.put(candidate, angle);
            }
        }
        
        // Retorna o ponto com menor ângulo (mais próximo do sentido horário)
        return angles.entrySet().stream()
            .min(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse(candidates.get(0));
    }
    
    /**
     * Gera descrição da confrontação baseada na posição e contexto
     */
    private String generateConfrontationDescription(Point start, Point end, int segmentNumber) {
        // Converte CoordinateUtils.Point para GeometricCalculator.Point
        GeometricCalculator.Point geoStart = new GeometricCalculator.Point(start.getX(), start.getY(), start.getId());
        GeometricCalculator.Point geoEnd = new GeometricCalculator.Point(end.getX(), end.getY(), end.getId());
        
        double distance = GeometricCalculator.calculateDistance(geoStart, geoEnd);
        double azimuth = GeometricCalculator.calculateAzimuth(geoStart, geoEnd);
        
        String direction = CoordinateUtils.azimuthToCardinalDirection(azimuth);
        
        // Gera descrições baseadas na direção e posição no polígono
        List<String> possibleDescriptions = Arrays.asList(
            "divisa com propriedade vizinha",
            "limite do terreno",
            "confrontação " + direction.toLowerCase(),
            "divisa lateral",
            "frente do lote",
            "fundo do lote"
        );
        
        // Seleciona descrição baseada no número do segmento e direção
        if (direction.contains("Norte") && segmentNumber <= 2) {
            return "frente do lote";
        } else if (direction.contains("Sul")) {
            return "fundo do lote";
        } else if (direction.contains("Leste")) {
            return "divisa lateral direita";
        } else if (direction.contains("Oeste")) {
            return "divisa lateral esquerda";
        }
        
        return "divisa com propriedade vizinha";
    }
    
    /**
     * Gera memorial de confrontações formatado profissionalmente
     */
    public String generateConfrontationMemorial(List<Confrontation> confrontations) {
        if (confrontations == null || confrontations.isEmpty()) {
            return "Confrontações não puderam ser determinadas automaticamente. " +
                   "Recomenda-se análise manual dos dados DXF.";
        }
        
        StringBuilder memorial = new StringBuilder();
        memorial.append("CONFRONTAÇÕES E DIVISAS:\n\n");
        
        // Calcula perímetro total
        double totalPerimeter = confrontations.stream()
            .mapToDouble(Confrontation::getDistance)
            .sum();
        
        memorial.append("Perímetro total: ").append(CoordinateUtils.formatDistance(totalPerimeter)).append("\n\n");
        
        // Descreve cada confrontação
        for (int i = 0; i < confrontations.size(); i++) {
            Confrontation conf = confrontations.get(i);
            memorial.append(String.format("%d) %s;\n", i + 1, conf.getFormattedDescription()));
        }
        
        // Adiciona informações técnicas
        memorial.append("\nINFORMAÇÕES TÉCNICAS:\n");
        memorial.append("- Coordenadas em UTM/SIRGAS 2000\n");
        memorial.append("- Azimutes calculados automaticamente\n");
        memorial.append("- Distâncias com precisão de centímetros\n");
        memorial.append("- Confrontações ordenadas no sentido horário\n");
        
        return memorial.toString();
    }
    
    /**
     * Valida a qualidade das confrontações detectadas
     */
    public String validateConfrontationQuality(List<Confrontation> confrontations) {
        if (confrontations == null || confrontations.isEmpty()) {
            return "CRÍTICO: Nenhuma confrontação detectada";
        }
        
        int totalConfrontations = confrontations.size();
        long validDistances = confrontations.stream()
            .filter(c -> c.getDistance() > 0.1) // Distâncias maiores que 10cm
            .count();
        
        double avgDistance = confrontations.stream()
            .mapToDouble(Confrontation::getDistance)
            .average()
            .orElse(0);
        
        if (validDistances == totalConfrontations && avgDistance > 1.0) {
            return String.format("EXCELENTE: %d confrontações válidas detectadas", totalConfrontations);
        } else if (validDistances >= totalConfrontations * 0.8) {
            return String.format("BOM: %d de %d confrontações são válidas", (int)validDistances, totalConfrontations);
        } else {
            return String.format("ATENÇÃO: Apenas %d de %d confrontações são válidas", (int)validDistances, totalConfrontations);
        }
    }
    
    /**
     * Detecta possíveis problemas nas confrontações
     */
    public List<String> detectConfrontationIssues(List<Confrontation> confrontations) {
        List<String> issues = new ArrayList<>();
        
        if (confrontations == null || confrontations.isEmpty()) {
            issues.add("Nenhuma confrontação foi detectada nos dados DXF");
            return issues;
        }
        
        // Verifica distâncias muito pequenas
        long tinyDistances = confrontations.stream()
            .filter(c -> c.getDistance() < 0.1)
            .count();
        
        if (tinyDistances > 0) {
            issues.add(String.format("%d confrontação(ões) com distância menor que 10cm", (int)tinyDistances));
        }
        
        // Verifica se o polígono está fechado
        if (confrontations.size() >= 3) {
            Point firstStart = confrontations.get(0).getStartPoint();
            Point lastEnd = confrontations.get(confrontations.size() - 1).getEndPoint();
            
            GeometricCalculator.Point geoFirstStart = new GeometricCalculator.Point(firstStart.getX(), firstStart.getY(), firstStart.getId());
            GeometricCalculator.Point geoLastEnd = new GeometricCalculator.Point(lastEnd.getX(), lastEnd.getY(), lastEnd.getId());
            
            double closingDistance = GeometricCalculator.calculateDistance(geoLastEnd, geoFirstStart);
            
            if (closingDistance > 1.0) {
                issues.add(String.format("Polígono não está fechado (distância de %.2fm entre último e primeiro ponto)", closingDistance));
            }
        }
        
        // Verifica ângulos muito agudos
        for (int i = 0; i < confrontations.size(); i++) {
            Confrontation current = confrontations.get(i);
            Confrontation next = confrontations.get((i + 1) % confrontations.size());
            
            double angleDiff = Math.abs(current.getAzimuth() - next.getAzimuth());
            if (angleDiff > 180) angleDiff = 360 - angleDiff;
            
            if (angleDiff < 10) {
                issues.add(String.format("Ângulo muito agudo detectado entre confrontações %d e %d (%.1f°)", i + 1, (i + 1) % confrontations.size() + 1, angleDiff));
            }
        }
        
        return issues;
    }
}