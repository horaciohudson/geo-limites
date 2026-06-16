package com.momorialPro.CadMemorial.util;

import com.momorialPro.CadMemorial.util.GeometricCalculator.Point;
import com.momorialPro.CadMemorial.util.GeometricCalculator.Line;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Formatador especializado para memoriais descritivos conforme ABNT NBR 13133:1994
 * Gera documentos técnicos e juridicamente válidos para cartórios e órgãos públicos
 */
public final class MemorialFormatter {

    private MemorialFormatter() {}

    /**
     * Representa um lote com suas características técnicas
     */
    public record Lot(String id, List<Point> vertices, String description, Map<String, String> confrontations) {}

    /**
     * Representa informações do projeto
     */
    public record ProjectInfo(String name, String owner, String location, String objective, String technicalResponsible) {}

    /**
     * Gera cabeçalho padrão do memorial
     */
    public static String generateHeader(ProjectInfo projectInfo) {
        StringBuilder header = new StringBuilder();
        
        header.append("MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE ÁREA\n");
        header.append("=" .repeat(60)).append("\n\n");
        
        header.append("IDENTIFICAÇÃO DO IMÓVEL:\n");
        header.append("- Terreno: ").append(projectInfo.name() != null ? projectInfo.name() : "Urbano").append("\n");
        header.append("- Proprietário: ").append(projectInfo.owner() != null ? projectInfo.owner() : "A definir conforme documentação").append("\n");
        header.append("- Localização: ").append(projectInfo.location() != null ? projectInfo.location() : "Conforme coordenadas georreferenciadas").append("\n");
        header.append("- Objetivo: ").append(projectInfo.objective() != null ? projectInfo.objective() : 
            "Levantamento Topográfico Planimétrico georreferenciado no Datum SIRGAS 2000 para fins de Desmembramento de Área").append("\n");
        
        if (projectInfo.technicalResponsible() != null) {
            header.append("- Responsável Técnico: ").append(projectInfo.technicalResponsible()).append("\n");
        }
        
        header.append("- Data: ").append(LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("\n\n");
        
        return header.toString();
    }

    /**
     * Gera descrição da situação antes do desmembramento
     */
    public static String generateOriginalSituation(List<Point> originalVertices, String terrainDescription) {
        StringBuilder situation = new StringBuilder();
        
        situation.append("SITUAÇÃO ANTES DESTE DESMEMBRAMENTO DE ÁREA:\n");
        situation.append("-" .repeat(50)).append("\n\n");
        
        situation.append("TERRENO ORIGINAL:\n");
        
        if (terrainDescription != null && !terrainDescription.trim().isEmpty()) {
            situation.append("Descrição: ").append(terrainDescription).append("\n\n");
        }
        
        // Calcula dados geométricos
        double perimeter = GeometricCalculator.calculatePerimeter(originalVertices);
        double area = GeometricCalculator.calculateArea(originalVertices);
        List<Line> lines = GeometricCalculator.generatePolygonLines(originalVertices);
        
        situation.append("COORDENADAS DOS VÉRTICES:\n");
        for (int i = 0; i < originalVertices.size(); i++) {
            Point vertex = originalVertices.get(i);
            String pointId = vertex.id() != null ? vertex.id() : "P" + String.format("%02d", i + 1);
            situation.append("- ").append(GeometricCalculator.formatPointForMemorial(
                new Point(vertex.x(), vertex.y(), pointId))).append("\n");
        }
        
        situation.append("\nMEDIDAS E CONFRONTAÇÕES:\n");
        situation.append("- Perímetro total: ").append(GeometricCalculator.formatDistance(perimeter)).append("\n");
        situation.append("- Área territorial: ").append(GeometricCalculator.formatArea(area)).append("\n\n");
        
        situation.append("DESCRIÇÃO DOS LIMITES:\n");
        for (int i = 0; i < lines.size(); i++) {
            Line line = lines.get(i);
            String startId = line.start().id() != null ? line.start().id() : "P" + String.format("%02d", i + 1);
            String endId = line.end().id() != null ? line.end().id() : "P" + String.format("%02d", ((i + 1) % lines.size()) + 1);
            
            situation.append("- De ").append(startId).append(" a ").append(endId).append(": ");
            situation.append(GeometricCalculator.formatDistance(line.distance())).append(", ");
            situation.append("azimute ").append(GeometricCalculator.formatAzimuth(line.azimuth())).append("\n");
        }
        
        situation.append("\n");
        return situation.toString();
    }

    /**
     * Gera descrição da situação após o desmembramento
     */
    public static String generateNewSituation(List<Lot> lots) {
        StringBuilder situation = new StringBuilder();
        
        situation.append("SITUAÇÃO DEPOIS DESTE DESMEMBRAMENTO DE ÁREA:\n");
        situation.append("-" .repeat(50)).append("\n\n");
        
        for (Lot lot : lots) {
            situation.append(generateLotDescription(lot));
            situation.append("\n");
        }
        
        return situation.toString();
    }

    /**
     * Gera descrição detalhada de um lote
     */
    public static String generateLotDescription(Lot lot) {
        StringBuilder description = new StringBuilder();
        
        description.append("LOTE ").append(lot.id()).append(":\n");
        
        if (lot.description() != null && !lot.description().trim().isEmpty()) {
            description.append("Descrição: ").append(lot.description()).append("\n");
        }
        
        // Calcula dados geométricos do lote
        double perimeter = GeometricCalculator.calculatePerimeter(lot.vertices());
        double area = GeometricCalculator.calculateArea(lot.vertices());
        List<Line> lines = GeometricCalculator.generatePolygonLines(lot.vertices());
        Point centroid = GeometricCalculator.calculateCentroid(lot.vertices());
        
        description.append("Localização: ").append(GeometricCalculator.formatPointForMemorial(centroid)).append("\n\n");
        
        description.append("COORDENADAS DOS VÉRTICES:\n");
        for (int i = 0; i < lot.vertices().size(); i++) {
            Point vertex = lot.vertices().get(i);
            String pointId = vertex.id() != null ? vertex.id() : lot.id() + "-P" + String.format("%02d", i + 1);
            description.append("- ").append(GeometricCalculator.formatPointForMemorial(
                new Point(vertex.x(), vertex.y(), pointId))).append("\n");
        }
        
        description.append("\nMEDIDAS:\n");
        description.append("- Perímetro: ").append(GeometricCalculator.formatDistance(perimeter)).append("\n");
        description.append("- Área territorial: ").append(GeometricCalculator.formatArea(area)).append("\n\n");
        
        description.append("CONFRONTAÇÕES DETALHADAS:\n");
        
        // Agrupa linhas por direção cardeal
        Map<String, List<Line>> linesByDirection = lines.stream()
            .collect(Collectors.groupingBy(line -> GeometricCalculator.getCardinalDirection(line.azimuth())));
        
        // Ordena as direções cardeais
        String[] directions = {"NORTE", "SUL", "LESTE", "OESTE", "NORDESTE", "NOROESTE", "SUDESTE", "SUDOESTE"};
        
        for (String direction : directions) {
            List<Line> directionLines = linesByDirection.get(direction);
            if (directionLines != null && !directionLines.isEmpty()) {
                description.append("AO ").append(direction).append(":\n");
                
                for (Line line : directionLines) {
                    String confrontation = lot.confrontations() != null ? 
                        lot.confrontations().get(direction) : "propriedade confrontante";
                    
                    description.append("  - Confronta com ").append(confrontation != null ? confrontation : "propriedade confrontante");
                    description.append(", numa extensão de ").append(GeometricCalculator.formatDistance(line.distance()));
                    description.append(", azimute ").append(GeometricCalculator.formatAzimuth(line.azimuth())).append("\n");
                }
            }
        }
        
        return description.toString();
    }

    /**
     * Gera rodapé com referências normativas
     */
    public static String generateFooter() {
        StringBuilder footer = new StringBuilder();
        
        footer.append("REFERÊNCIAS NORMATIVAS:\n");
        footer.append("-" .repeat(30)).append("\n");
        footer.append("- ABNT NBR 13133:1994 - Execução de levantamento topográfico\n");
        footer.append("- ABNT NBR 14166:2013 - Rede de referência cadastral municipal\n");
        footer.append("- Decreto nº 89.817/1984 - Sistema Geodésico Brasileiro\n");
        footer.append("- Lei nº 10.267/2001 - Georreferenciamento de imóveis rurais\n\n");
        
        footer.append("SISTEMA DE REFERÊNCIA:\n");
        footer.append("- Datum: SIRGAS 2000 (Sistema de Referência Geocêntrico para as Américas)\n");
        footer.append("- Projeção: UTM (Universal Transversa de Mercator)\n");
        footer.append("- Precisão: Centimétrica conforme normas técnicas vigentes\n\n");
        
        footer.append("OBSERVAÇÕES TÉCNICAS:\n");
        footer.append("- Todas as coordenadas estão referenciadas ao Sistema SIRGAS 2000\n");
        footer.append("- As medidas lineares estão expressas em metros\n");
        footer.append("- As áreas estão expressas em metros quadrados\n");
        footer.append("- Os azimutes são medidos no sentido horário a partir do Norte\n");
        footer.append("- Este memorial atende às exigências da ABNT NBR 13133:1994\n\n");
        
        footer.append("=" .repeat(60)).append("\n");
        footer.append("MEMORIAL DESCRITIVO ELABORADO CONFORME NORMAS TÉCNICAS VIGENTES\n");
        footer.append("DOCUMENTO VÁLIDO PARA FINS CARTORIAIS E REGISTRAIS\n");
        footer.append("=" .repeat(60)).append("\n");
        
        return footer.toString();
    }

    /**
     * Gera memorial completo
     */
    public static String generateCompleteMemorial(ProjectInfo projectInfo, List<Point> originalVertices, 
                                                 List<Lot> lots, String terrainDescription) {
        StringBuilder memorial = new StringBuilder();
        
        memorial.append(generateHeader(projectInfo));
        memorial.append(generateOriginalSituation(originalVertices, terrainDescription));
        memorial.append(generateNewSituation(lots));
        memorial.append(generateFooter());
        
        return memorial.toString();
    }

    /**
     * Gera seção de diagnóstico para problemas identificados
     */
    public static String generateDiagnosticSection(List<String> issues, List<String> suggestions) {
        if (issues.isEmpty()) {
            return "";
        }
        
        StringBuilder diagnostic = new StringBuilder();
        
        diagnostic.append("DIAGNÓSTICO TÉCNICO:\n");
        diagnostic.append("-" .repeat(25)).append("\n\n");
        
        diagnostic.append("PROBLEMAS IDENTIFICADOS:\n");
        for (int i = 0; i < issues.size(); i++) {
            diagnostic.append(String.format("%d. %s\n", i + 1, issues.get(i)));
        }
        
        if (!suggestions.isEmpty()) {
            diagnostic.append("\nSUGESTÕES PARA CORREÇÃO:\n");
            for (int i = 0; i < suggestions.size(); i++) {
                diagnostic.append(String.format("%d. %s\n", i + 1, suggestions.get(i)));
            }
        }
        
        diagnostic.append("\nIMPORTANTE: Este memorial pode estar incompleto devido aos problemas identificados.\n");
        diagnostic.append("Recomenda-se a correção dos arquivos DXF antes da utilização em processos oficiais.\n\n");
        
        return diagnostic.toString();
    }
}