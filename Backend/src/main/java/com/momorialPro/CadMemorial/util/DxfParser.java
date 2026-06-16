package com.momorialPro.CadMemorial.util;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;

public final class DxfParser {

    public record Entity(String type, String layer, String fingerprint, 
                        Double x, Double y, Double z, 
                        Double x2, Double y2, Double z2, 
                        Double radius, Double startAngle, Double endAngle, 
                        String text, String textStyle, Double textHeight, Double textRotation,
                        List<Point> vertices) {
        
        // Construtor para compatibilidade com código existente
        public Entity(String type, String layer, String fingerprint, 
                     Double x, Double y, Double z, 
                     Double x2, Double y2, Double z2, 
                     Double radius, Double startAngle, Double endAngle, 
                     String text, String textStyle, Double textHeight, Double textRotation) {
            this(type, layer, fingerprint, x, y, z, x2, y2, z2, radius, startAngle, endAngle, 
                 text, textStyle, textHeight, textRotation, new ArrayList<>());
        }
    }
    
    public record Point(double x, double y, String id) {}

    private DxfParser() {}

    public static List<Entity> parse(Path dxfPath) {
        try {
            List<String> lines = Files.readAllLines(dxfPath);
            List<Entity> entities = new ArrayList<>();
            for (int i = 0; i < lines.size() - 1; i++) {
                // DXF: "0" na linha N indica início de entidade. Tipo na linha N+1
                if ("0".equals(lines.get(i))) {
                    String type = lines.get(i + 1).trim();
                    // coleta bloco até próximo "0"
                    int j = i + 2;
                    String layer = "0";
                    List<String> block = new ArrayList<>();
                    
                    // Variáveis para coordenadas
                    Double x = null, y = null, z = null;
                    Double x2 = null, y2 = null, z2 = null;
                    Double radius = null, startAngle = null, endAngle = null;
                    String text = null;
                    String textStyle = null;
                    Double textHeight = null;
                    Double textRotation = null;
                    StringBuilder mtextContent = new StringBuilder();
                    List<Point> vertices = new ArrayList<>();
                    
                    while (j < lines.size() && !"0".equals(lines.get(j))) {
                        String code = lines.get(j).trim();
                        String val  = (j + 1 < lines.size()) ? lines.get(j + 1) : "";
                        block.add(code);
                        block.add(val);

                        // Extrai informações específicas baseadas nos códigos de grupo DXF
                        switch (code) {
                            case "8" -> layer = val.trim(); // group code 8 = layer
                            case "10" -> {
                                x = parseDouble(val); // X coordinate
                                // Para POLYLINE/LWPOLYLINE, adiciona vértice
                                if (("POLYLINE".equals(type) || "LWPOLYLINE".equals(type)) && x != null) {
                                    // Aguarda coordenada Y para criar o ponto
                                }
                            }
                            case "20" -> {
                                y = parseDouble(val); // Y coordinate
                                // Para POLYLINE/LWPOLYLINE, completa o vértice
                                if (("POLYLINE".equals(type) || "LWPOLYLINE".equals(type)) && x != null && y != null) {
                                    vertices.add(new Point(x, y, "V" + String.format("%02d", vertices.size() + 1)));
                                }
                            }
                            case "30" -> z = parseDouble(val); // Z coordinate
                            case "11" -> x2 = parseDouble(val); // Second X coordinate (for lines, etc.)
                            case "21" -> y2 = parseDouble(val); // Second Y coordinate
                            case "31" -> z2 = parseDouble(val); // Second Z coordinate
                            case "40" -> { // Radius (for circles, arcs) or Text height (for TEXT/MTEXT)
                                if (radius == null) {
                                    radius = parseDouble(val);
                                } else {
                                    textHeight = parseDouble(val);
                                }
                            }
                            case "50" -> { // Start angle (for arcs) or Text rotation angle (for TEXT/MTEXT)
                                if (startAngle == null) {
                                    startAngle = parseDouble(val);
                                } else {
                                    textRotation = parseDouble(val);
                                }
                            }
                            case "51" -> endAngle = parseDouble(val); // End angle (for arcs)
                            case "1" -> text = val; // Text content (TEXT entity)
                            case "3" -> mtextContent.append(val); // MTEXT content (can be multiple lines)
                            case "7" -> textStyle = val; // Text style name
                        }
                        j += 2;
                    }
                    
                    // Combina texto de TEXT e MTEXT
                    String finalText = text;
                    if (mtextContent.length() > 0) {
                        finalText = mtextContent.toString();
                    }
                    
                    // Para entidades POINT, cria um vértice se não existe
                    if ("POINT".equals(type) && x != null && y != null && vertices.isEmpty()) {
                        String pointId = extractPointIdFromText(finalText);
                        if (pointId == null) {
                            pointId = "P01";
                        }
                        vertices.add(new Point(x, y, pointId));
                    }
                    
                    String fp = sha256(block);

                    entities.add(new Entity(type, layer, fp, x, y, z, x2, y2, z2, radius, startAngle, endAngle, finalText, textStyle, textHeight, textRotation, vertices));
                    i = j - 1;
                }
            }
            return entities;
        } catch (Exception e) {
            throw new RuntimeException("Falha ao ler DXF: " + e.getMessage(), e);
        }
    }

    /**
     * Extrai ID de ponto do texto (P01, P02, etc.)
     */
    private static String extractPointIdFromText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        
        // Padrões para identificar pontos
        String[] patterns = {"P\\d+", "PT\\d+", "PONTO\\s*\\d+", "V\\d+"};
        
        for (String pattern : patterns) {
            if (text.toUpperCase().matches(".*" + pattern + ".*")) {
                // Extrai o número
                String number = text.toUpperCase().replaceAll(".*[P|PT|PONTO|V]\\s*(\\d+).*", "$1");
                try {
                    return String.format("P%02d", Integer.parseInt(number));
                } catch (NumberFormatException e) {
                    // Continua tentando outros padrões
                }
            }
        }
        
        return null;
    }

    private static String sha256(List<String> data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            for (String s : data) md.update(s.getBytes());
            return bytesToHex(md.digest());
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    private static String bytesToHex(byte[] b) {
        char[] hexArray = "0123456789abcdef".toCharArray();
        char[] hexChars = new char[b.length * 2];
        for (int j = 0; j < b.length; j++) {
            int v = b[j] & 0xFF;
            hexChars[j * 2] = hexArray[v >>> 4];
            hexChars[j * 2 + 1] = hexArray[v & 0x0F];
        }
        return new String(hexChars);
    }
    
    private static Double parseDouble(String value) {
        try {
            return value != null && !value.trim().isEmpty() ? Double.parseDouble(value.trim()) : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
