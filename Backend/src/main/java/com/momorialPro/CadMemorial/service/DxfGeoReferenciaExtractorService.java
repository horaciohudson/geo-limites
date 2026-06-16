package com.momorialPro.CadMemorial.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Extrator de Coordenadas Georeferenciadas SIRGAS 2000
 * Baseado na ideia do Claude para resolver o problema critico das coordenadas
 */
@Service
@Slf4j
public class DxfGeoReferenciaExtractorService {

    /**
     * Extrai coordenadas georeferenciadas SIRGAS 2000 do DXF
     */
    public CoordenadaGeo extrairCoordenadaBase(List<Map<String, Object>> entidades) {
        CoordenadaGeo coordenadaBase = null;

        // ESTRATEGIA 1: Procura em HEADER VARIABLES
        coordenadaBase = buscarEmHeaderVariables(entidades);
        if (coordenadaBase != null) {
            return coordenadaBase;
        }

        // ESTRATEGIA 2: Procura em textos TEXT/MTEXT
        coordenadaBase = buscarEmTextos(entidades);
        if (coordenadaBase != null) {
            return coordenadaBase;
        }

        // ESTRATEGIA 3: Procura em XDATA (dados estendidos)
        coordenadaBase = buscarEmXData(entidades);
        if (coordenadaBase != null) {
            return coordenadaBase;
        }

        // ESTRATEGIA 4: Busca em INSERT com atributos
        coordenadaBase = buscarEmInserts(entidades);
        if (coordenadaBase != null) {
            return coordenadaBase;
        }

        // ESTRATEGIA 5: Inferir do padrao de coordenadas
        coordenadaBase = inferirDeCoordenadas(entidades);
        if (coordenadaBase != null) {
            return coordenadaBase;
        }

        log.warn("Coordenadas georeferenciadas nao encontradas; o sistema usara coordenadas locais do DXF");
        return null;
    }

    /**
     * ESTRATEGIA 1: Busca em variaveis do HEADER
     */
    private CoordenadaGeo buscarEmHeaderVariables(List<Map<String, Object>> entidades) {
        for (Map<String, Object> entity : entidades) {
            String type = (String) entity.get("type");

            if ("HEADER".equals(type) || "VARIABLE".equals(type)) {
                
                // Procura $INSBASE (ponto de insercao base)
                Object insbase = entity.get("$INSBASE");
                if (insbase instanceof Map) {
                    Map<?, ?> coord = (Map<?, ?>) insbase;
                    Double x = getDouble(coord, "x", null);
                    Double y = getDouble(coord, "y", null);
                    
                    if (x != null && y != null && isCoordenadaSIRGAS(x, y)) {
                        return new CoordenadaGeo(x, y, "HEADER_INSBASE");
                    }
                }
                
                // Procura $EXTMIN (minimo da extensao)
                Object extmin = entity.get("$EXTMIN");
                if (extmin instanceof Map) {
                    Map<?, ?> coord = (Map<?, ?>) extmin;
                    Double x = getDouble(coord, "x", null);
                    Double y = getDouble(coord, "y", null);
                    
                    if (x != null && y != null && isCoordenadaSIRGAS(x, y)) {
                        return new CoordenadaGeo(x, y, "HEADER_EXTMIN");
                    }
                }
                
                // Procura $LIMMIN (limite minimo)
                Object limmin = entity.get("$LIMMIN");
                if (limmin instanceof Map) {
                    Map<?, ?> coord = (Map<?, ?>) limmin;
                    Double x = getDouble(coord, "x", null);
                    Double y = getDouble(coord, "y", null);
                    
                    if (x != null && y != null && isCoordenadaSIRGAS(x, y)) {
                        return new CoordenadaGeo(x, y, "HEADER_LIMMIN");
                    }
                }
            }
        }

        return null;
    }

    /**
     * ESTRATEGIA 2: Busca em textos TEXT/MTEXT
     */
    private CoordenadaGeo buscarEmTextos(List<Map<String, Object>> entidades) {
        // Padroes para coordenadas SIRGAS
        Pattern patternE = Pattern.compile("E[:\\s=]*([0-9]{6,7})[,.]?([0-9]{0,2})", Pattern.CASE_INSENSITIVE);
        Pattern patternN = Pattern.compile("N[:\\s=]*([0-9]{7,8})[,.]?([0-9]{0,2})", Pattern.CASE_INSENSITIVE);

        Double coordE = null;
        Double coordN = null;

        for (Map<String, Object> entity : entidades) {
            String type = (String) entity.get("type");

            if ("TEXT".equals(type) || "MTEXT".equals(type)) {
                String texto = (String) entity.get("text");
                
                if (texto == null || texto.trim().isEmpty()) continue;
                
                // Busca coordenada E (Leste)
                Matcher matcherE = patternE.matcher(texto);
                if (matcherE.find()) {
                    String parteInteira = matcherE.group(1);
                    String parteDecimal = matcherE.groupCount() > 1 ? matcherE.group(2) : "00";
                    
                    coordE = Double.parseDouble(parteInteira + "." + parteDecimal);
                }
                
                // Busca coordenada N (Norte)
                Matcher matcherN = patternN.matcher(texto);
                if (matcherN.find()) {
                    String parteInteira = matcherN.group(1);
                    String parteDecimal = matcherN.groupCount() > 1 ? matcherN.group(2) : "00";
                    
                    coordN = Double.parseDouble(parteInteira + "." + parteDecimal);
                }
                
                // Se encontrou ambas, valida e retorna
                if (coordE != null && coordN != null && isCoordenadaSIRGAS(coordE, coordN)) {
                    return new CoordenadaGeo(coordE, coordN, "TEXT");
                }
            }
        }

        return null;
    }

    /**
     * ESTRATEGIA 3: Busca em XDATA (dados estendidos)
     */
    private CoordenadaGeo buscarEmXData(List<Map<String, Object>> entidades) {
        for (Map<String, Object> entity : entidades) {
            Object xdata = entity.get("xdata");

            if (xdata instanceof Map) {
                Map<?, ?> xdataMap = (Map<?, ?>) xdata;
                
                // Procura por chaves comuns de georeferenciamento
                for (Object key : xdataMap.keySet()) {
                    String keyStr = key.toString().toUpperCase();
                    
                    if (keyStr.contains("GEO") || keyStr.contains("UTM") || 
                        keyStr.contains("COORD") || keyStr.contains("SIRGAS")) {
                        
                        Object value = xdataMap.get(key);
                        
                        if (value instanceof Map) {
                            Map<?, ?> coord = (Map<?, ?>) value;
                            Double x = getDouble(coord, "x", null);
                            Double y = getDouble(coord, "y", null);
                            
                            if (x != null && y != null && isCoordenadaSIRGAS(x, y)) {
                                return new CoordenadaGeo(x, y, "XDATA_" + key);
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * ESTRATEGIA 4: Busca em blocos INSERT com atributos
     */
    private CoordenadaGeo buscarEmInserts(List<Map<String, Object>> entidades) {
        for (Map<String, Object> entity : entidades) {
            if (!"INSERT".equals(entity.get("type"))) continue;

            Object attribsObj = entity.get("attributes");
            
            if (attribsObj instanceof List) {
                List<?> attribs = (List<?>) attribsObj;
                
                Double coordE = null;
                Double coordN = null;
                
                for (Object attribObj : attribs) {
                    if (attribObj instanceof Map) {
                        Map<?, ?> attrib = (Map<?, ?>) attribObj;
                        
                        String tag = ((String) attrib.get("tag")).toUpperCase();
                        String texto = (String) attrib.get("text");
                        
                        if (texto == null) continue;
                        
                        // Procura tags comuns
                        if (tag.contains("COORD_E") || tag.contains("UTM_E") || 
                            tag.contains("ESTE") || tag.contains("EAST")) {
                            
                            coordE = extrairNumeroDeTexto(texto);
                        }
                        
                        if (tag.contains("COORD_N") || tag.contains("UTM_N") || 
                            tag.contains("NORTE") || tag.contains("NORTH")) {
                            
                            coordN = extrairNumeroDeTexto(texto);
                        }
                        
                        if (coordE != null && coordN != null && isCoordenadaSIRGAS(coordE, coordN)) {
                            return new CoordenadaGeo(coordE, coordN, "INSERT_ATTRIB");
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * ESTRATEGIA 5: Inferir do padrao de coordenadas
     * (Quando as coordenadas locais ja sao SIRGAS)
     * VERSAO MELHORADA: Busca em mais tipos de entidades
     */
    private CoordenadaGeo inferirDeCoordenadas(List<Map<String, Object>> entidades) {
        // Coleta todas as coordenadas X e Y
        List<Double> coordinatesX = new ArrayList<>();
        List<Double> coordinatesY = new ArrayList<>();

        for (Map<String, Object> entity : entidades) {
            String type = (String) entity.get("type");
            if (type == null) continue;

            // 1. Coordenadas diretas (x, y) na entidade
            Double directX = getDouble(entity, "x", null);
            Double directY = getDouble(entity, "y", null);
            if (directX != null && directY != null && directX > 1000 && directY > 1000) {
                coordinatesX.add(directX);
                coordinatesY.add(directY);
            }
            
            // 2. LINE - ponto de inicio
            if ("LINE".equals(type)) {
                Map<?, ?> start = (Map<?, ?>) entity.get("start");
                if (start != null) {
                    Double x = getDouble(start, "x", null);
                    Double y = getDouble(start, "y", null);
                    if (x != null && y != null && x > 1000 && y > 1000) {
                        coordinatesX.add(x);
                        coordinatesY.add(y);
                    }
                }
            } else if ("POINT".equals(type)) {
                Double x = getDouble(entity, "x", null);
                Double y = getDouble(entity, "y", null);
                if (x != null && y != null && x > 1000 && y > 1000) {
                    coordinatesX.add(x);
                    coordinatesY.add(y);
                }
            } else if ("POLYLINE".equals(type) || "LWPOLYLINE".equals(type)) {
                // 3. POLYLINE/LWPOLYLINE - buscar vertices
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> vertices = (List<Map<String, Object>>) entity.get("vertices");
                if (vertices != null) {
                    for (Map<String, Object> vertex : vertices) {
                        Double vx = getDouble(vertex, "x", null);
                        Double vy = getDouble(vertex, "y", null);
                        if (vx != null && vy != null && vx > 1000 && vy > 1000) {
                            coordinatesX.add(vx);
                            coordinatesY.add(vy);
                        }
                    }
                }
            }
        }

        if (coordinatesX.isEmpty()) {
            log.warn("Nenhuma coordenada encontrada nas entidades DXF para inferencia georreferenciada");
            return null;
        }

        // Pega o menor valor (canto inferior esquerdo)
        Double minX = coordinatesX.stream().min(Double::compare).orElse(0.0);
        Double minY = coordinatesY.stream().min(Double::compare).orElse(0.0);
        Double maxX = coordinatesX.stream().max(Double::compare).orElse(0.0);
        Double maxY = coordinatesY.stream().max(Double::compare).orElse(0.0);

        // Verifica se ja sao coordenadas SIRGAS
        if (isCoordenadaSIRGAS(minX, minY)) {
            return new CoordenadaGeo(minX, minY, "INFERIDO_POLYLINE");
        }
        
        // Tentar com maxX e minY (caso o sistema de coordenadas seja diferente)
        if (isCoordenadaSIRGAS(maxX, minY)) {
            return new CoordenadaGeo(maxX, minY, "INFERIDO_MAX_MIN");
        }

        return null;
    }

    /**
     * Valida se e coordenada SIRGAS 2000 (UTM)
     */
    private boolean isCoordenadaSIRGAS(Double x, Double y) {
        if (x == null || y == null) return false;

        // Coordenadas SIRGAS 2000 / UTM Brasil:
        // E (Leste): ~160.000 a ~850.000 (6 a 7 digitos)
        // N (Norte): ~750.000 a ~10.500.000 (7 a 8 digitos)

        boolean xValido = x >= 160000 && x <= 850000;
        boolean yValido = y >= 750000 && y <= 10500000;

        return xValido && yValido;
    }

    /**
     * Extrai numero de texto (remove formatacao)
     */
    private Double extrairNumeroDeTexto(String texto) {
        try {
            // Remove tudo que nao e numero ou ponto/virgula
            String numero = texto.replaceAll("[^0-9.,]", "")
                    .replace(",", ".");

            if (!numero.isEmpty()) {
                return Double.parseDouble(numero);
            }
        } catch (Exception e) {
            return null;
        }

        return null;
    }

    /**
     * Converte coordenadas locais para SIRGAS usando offset
     */
    public SimplePoint converterParaSIRGAS(SimplePoint pontoLocal, CoordenadaGeo coordenadaBase) {
        if (coordenadaBase == null) {
            log.warn("Sem coordenada base, retornando coordenadas locais");
            return pontoLocal;
        }

        // Soma o offset da coordenada base
        double xSIRGAS = coordenadaBase.getE() + pontoLocal.getX();
        double ySIRGAS = coordenadaBase.getN() + pontoLocal.getY();

        return new SimplePoint(xSIRGAS, ySIRGAS, pontoLocal.getId() + "_SIRGAS");
    }

    /**
     * Converte lista de pontos para SIRGAS
     */
    public List<SimplePoint> converterListaParaSIRGAS(List<SimplePoint> pontosLocais, CoordenadaGeo coordenadaBase) {
        if (coordenadaBase == null) {
            log.warn("Sem coordenada base, retornando coordenadas locais");
            return pontosLocais;
        }

        return pontosLocais.stream()
                .map(p -> converterParaSIRGAS(p, coordenadaBase))
                .collect(Collectors.toList());
    }

    private Double getDouble(Map<?, ?> map, String key, Double defaultValue) {
        Object value = map.get(key);
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return defaultValue;
    }

    /**
     * Classe interna para representar pontos simples
     */
    public static class SimplePoint {
        private final double x;
        private final double y;
        private final String id;

        public SimplePoint(double x, double y, String id) {
            this.x = x;
            this.y = y;
            this.id = id;
        }

        public double getX() { return x; }
        public double getY() { return y; }
        public String getId() { return id; }
    }

    /**
     * DTO para Coordenada Georeferenciada
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CoordenadaGeo {
        private Double e; // Leste (East)
        private Double n; // Norte (North)
        private String fonte; // De onde veio

        @Override
        public String toString() {
            return String.format("E %.2fm, N %.2fm (fonte: %s)", e, n, fonte);
        }
    }
}
