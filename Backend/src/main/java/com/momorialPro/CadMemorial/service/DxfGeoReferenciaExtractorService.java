package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.dto.PropertyLandmarkDTO;
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
    private static final Pattern REFERENCE_LABEL_PATTERN = Pattern.compile(
            "(?i)^\\s*(?:P|PT|PONTO|V|VERTICE|VERTEX|ESTACA|E)\\s*[-_:/# ]*0*(\\d{1,4})\\s*$"
    );

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

    public GeoreferencingTransform buildTransformFromLandmarks(List<Map<String, Object>> entidades, PropertyDTO property) {
        if (property == null || property.getLandmarks() == null || property.getLandmarks().isEmpty()) {
            log.info("TRACE GEOREF: propriedade sem landmarks; transformacao nao sera criada");
            return null;
        }

        long validPropertyLandmarks = property.getLandmarks().stream()
                .filter(Objects::nonNull)
                .filter(landmark -> landmark.getLandmarkName() != null && !landmark.getLandmarkName().isBlank())
                .filter(landmark -> landmark.getCoordinateX() != null && landmark.getCoordinateY() != null)
                .count();
        log.info("TRACE GEOREF: landmarks validos no cadastro={}", validPropertyLandmarks);
        property.getLandmarks().stream()
                .filter(Objects::nonNull)
                .forEach(landmark -> log.info(
                        "TRACE GEOREF: cadastro label={} canonical={} E={} N={} ordem={}",
                        landmark.getLandmarkName(),
                        canonicalizeReferenceLabel(landmark.getLandmarkName()),
                        landmark.getCoordinateX(),
                        landmark.getCoordinateY(),
                        landmark.getSequenceOrder()
                ));
        if (validPropertyLandmarks < 2) {
            log.warn("Georreferenciamento por pontos requer no minimo 2 pontos cadastrados validos; encontrados {}", validPropertyLandmarks);
            return null;
        }

        Map<String, ReferenceAnchor> anchorsByLabel = extractReferenceAnchors(entidades).stream()
                .collect(Collectors.toMap(
                        ReferenceAnchor::canonicalLabel,
                        anchor -> anchor,
                        (first, second) -> first,
                        LinkedHashMap::new
                ));
        log.info("TRACE GEOREF: ancoras reconhecidas no DXF={}", anchorsByLabel.size());
        anchorsByLabel.values().forEach(anchor -> log.info(
                "TRACE GEOREF: ancora dxf rawLabel={} canonical={} x={} y={}",
                anchor.rawLabel(),
                anchor.canonicalLabel(),
                String.format(Locale.US, "%.3f", anchor.x()),
                String.format(Locale.US, "%.3f", anchor.y())
        ));

        if (anchorsByLabel.isEmpty()) {
            log.warn("TRACE GEOREF: nenhuma ancora textual foi reconhecida no DXF para casar com os landmarks");
            return null;
        }

        List<MatchedReferencePoint> matches = property.getLandmarks().stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingInt(landmark -> landmark.getSequenceOrder() != null ? landmark.getSequenceOrder() : Integer.MAX_VALUE))
                .map(landmark -> matchLandmark(landmark, anchorsByLabel))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        log.info("TRACE GEOREF: correspondencias validas cadastro<->DXF={}", matches.size());
        matches.forEach(match -> log.info(
                "TRACE GEOREF: match propertyLabel={} dxfLabel={} canonical={} localX={} localY={} realE={} realN={} ordem={}",
                match.propertyLabel(),
                match.dxfLabel(),
                match.canonicalLabel(),
                String.format(Locale.US, "%.3f", match.localX()),
                String.format(Locale.US, "%.3f", match.localY()),
                String.format(Locale.US, "%.3f", match.realE()),
                String.format(Locale.US, "%.3f", match.realN()),
                match.sequenceOrder()
        ));

        if (matches.size() < 2) {
            log.warn("Georreferenciamento por pontos requer no minimo 2 correspondencias validas entre cadastro e DXF; encontradas {}", matches.size());
            return null;
        }

        GeoreferencingTransform bestTransform = null;
        double bestRotationRadians = 0.0d;

        for (int i = 0; i < matches.size() - 1; i++) {
            for (int j = i + 1; j < matches.size(); j++) {
                TransformCandidate candidate = buildTransformCandidate(matches.get(i), matches.get(j), matches);
                if (candidate == null) {
                    continue;
                }
                if (bestTransform == null || candidate.transform().averageResidualMeters() < bestTransform.averageResidualMeters()) {
                    bestTransform = candidate.transform();
                    bestRotationRadians = candidate.rotationRadians();
                }
            }
        }

        if (bestTransform == null) {
            log.warn("TRACE GEOREF: nenhuma combinacao valida de pares produziu transformacao confiavel");
            return null;
        }

        log.info(
                "TRACE GEOREF: transform criado source={} rotacaoGraus={} escala={} translateX={} translateY={} residuoMedio={} matches={}",
                bestTransform.source(),
                String.format(Locale.US, "%.6f", Math.toDegrees(bestRotationRadians)),
                String.format(Locale.US, "%.9f", bestTransform.scale()),
                String.format(Locale.US, "%.3f", bestTransform.translateX()),
                String.format(Locale.US, "%.3f", bestTransform.translateY()),
                String.format(Locale.US, "%.6f", bestTransform.averageResidualMeters()),
                matches.size()
        );

        return bestTransform;
    }

    public double[] transform(double x, double y, GeoreferencingTransform transform) {
        if (transform == null) {
            return new double[]{x, y};
        }
        return transform(x, y, transform.scale(), Math.toRadians(transform.rotationDegrees()), transform.translateX(), transform.translateY());
    }

    private double[] transform(double x, double y, double scale, double rotationRadians, double translateX, double translateY) {
        double cos = Math.cos(rotationRadians);
        double sin = Math.sin(rotationRadians);
        double transformedX = scale * (x * cos - y * sin) + translateX;
        double transformedY = scale * (x * sin + y * cos) + translateY;
        return new double[]{transformedX, transformedY};
    }

    private TransformCandidate buildTransformCandidate(
            MatchedReferencePoint first,
            MatchedReferencePoint second,
            List<MatchedReferencePoint> matches
    ) {
        double localDx = second.localX() - first.localX();
        double localDy = second.localY() - first.localY();
        double realDx = second.realE() - first.realE();
        double realDy = second.realN() - first.realN();

        double localDistance = Math.hypot(localDx, localDy);
        double realDistance = Math.hypot(realDx, realDy);
        if (localDistance < 0.000001d || realDistance < 0.000001d) {
            return null;
        }

        double scale = realDistance / localDistance;
        double rotationRadians = Math.atan2(realDy, realDx) - Math.atan2(localDy, localDx);
        double cos = Math.cos(rotationRadians);
        double sin = Math.sin(rotationRadians);

        double translateX = first.realE() - scale * (first.localX() * cos - first.localY() * sin);
        double translateY = first.realN() - scale * (first.localX() * sin + first.localY() * cos);

        double residualSum = 0.0d;
        for (MatchedReferencePoint match : matches) {
            double[] projected = transform(match.localX(), match.localY(), scale, rotationRadians, translateX, translateY);
            residualSum += Math.hypot(projected[0] - match.realE(), projected[1] - match.realN());
        }

        double averageResidual = residualSum / matches.size();
        GeoreferencingTransform transform = new GeoreferencingTransform(
                Math.toDegrees(rotationRadians),
                scale,
                translateX,
                translateY,
                averageResidual,
                "PROPERTY_LANDMARK_BEST_PAIR",
                matches
        );
        return new TransformCandidate(transform, rotationRadians);
    }

    private MatchedReferencePoint matchLandmark(PropertyLandmarkDTO landmark, Map<String, ReferenceAnchor> anchorsByLabel) {
        if (landmark.getLandmarkName() == null || landmark.getLandmarkName().isBlank()
                || landmark.getCoordinateX() == null || landmark.getCoordinateY() == null) {
            return null;
        }

        String canonical = canonicalizeReferenceLabel(landmark.getLandmarkName());
        if (canonical.isBlank()) {
            return null;
        }

        ReferenceAnchor anchor = anchorsByLabel.get(canonical);
        if (anchor == null) {
            return null;
        }

        return new MatchedReferencePoint(
                landmark.getLandmarkName(),
                anchor.rawLabel(),
                canonical,
                anchor.x(),
                anchor.y(),
                landmark.getCoordinateX().doubleValue(),
                landmark.getCoordinateY().doubleValue(),
                landmark.getSequenceOrder() != null ? landmark.getSequenceOrder() : Integer.MAX_VALUE
        );
    }

    private List<ReferenceAnchor> extractReferenceAnchors(List<Map<String, Object>> entidades) {
        List<ReferenceAnchor> anchors = new ArrayList<>();
        if (entidades == null) {
            return anchors;
        }

        for (Map<String, Object> entity : entidades) {
            String type = Objects.toString(entity.get("type"), "");
            if (!"TEXT".equals(type) && !"MTEXT".equals(type)) {
                continue;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> properties = (Map<String, Object>) entity.get("properties");
            String rawText = properties != null ? Objects.toString(properties.get("text"), "").trim() : "";
            if (rawText.isBlank()) {
                rawText = Objects.toString(entity.get("text"), "").trim();
            }

            String canonical = canonicalizeReferenceLabel(rawText);
            if (canonical.isBlank()) {
                continue;
            }

            Double x = firstNonNullDouble(
                    getDouble(properties, "x", null),
                    getDouble(properties, "alignmentX", null),
                    getDouble(properties, "x1", null),
                    getDouble(entity, "x", null),
                    getDouble(entity, "alignmentX", null),
                    getDouble(entity, "x1", null)
            );
            Double y = firstNonNullDouble(
                    getDouble(properties, "y", null),
                    getDouble(properties, "alignmentY", null),
                    getDouble(properties, "y1", null),
                    getDouble(entity, "y", null),
                    getDouble(entity, "alignmentY", null),
                    getDouble(entity, "y1", null)
            );
            if (x == null || y == null) {
                continue;
            }

            anchors.add(new ReferenceAnchor(rawText, canonical, x, y));
        }

        return filterSuspiciousTableAnchors(anchors);
    }

    private List<ReferenceAnchor> filterSuspiciousTableAnchors(List<ReferenceAnchor> anchors) {
        if (anchors.size() < 5) {
            return anchors;
        }

        Map<String, Long> xFrequency = anchors.stream()
                .collect(Collectors.groupingBy(anchor -> roundedAxisKey(anchor.x()), Collectors.counting()));
        Map<String, Long> yFrequency = anchors.stream()
                .collect(Collectors.groupingBy(anchor -> roundedAxisKey(anchor.y()), Collectors.counting()));

        List<ReferenceAnchor> filtered = anchors.stream()
                .filter(anchor -> !isLikelyTableAnchor(anchor, xFrequency, yFrequency))
                .toList();

        if (filtered.size() < 2) {
            return anchors;
        }

        long removedCount = anchors.size() - filtered.size();
        if (removedCount > 0) {
            log.info("TRACE GEOREF: ancoras textuais suspeitas de tabela removidas={}", removedCount);
        }

        return filtered;
    }

    private boolean isLikelyTableAnchor(
            ReferenceAnchor anchor,
            Map<String, Long> xFrequency,
            Map<String, Long> yFrequency
    ) {
        long sameX = xFrequency.getOrDefault(roundedAxisKey(anchor.x()), 0L);
        long sameY = yFrequency.getOrDefault(roundedAxisKey(anchor.y()), 0L);
        return sameX >= 5 || sameY >= 5;
    }

    private String roundedAxisKey(double value) {
        return String.format(Locale.US, "%.3f", value);
    }

    private String canonicalizeReferenceLabel(String rawLabel) {
        if (rawLabel == null || rawLabel.isBlank()) {
            return "";
        }

        String normalized = rawLabel.trim().toUpperCase(Locale.ROOT)
                .replaceAll("\\s+", " ")
                .replaceAll("[-_:/#]", " ")
                .trim();

        Matcher matcher = REFERENCE_LABEL_PATTERN.matcher(normalized);
        if (matcher.matches()) {
            int number = Integer.parseInt(matcher.group(1));
            String prefix = normalized.replaceAll("\\d+", "").trim();
            if (prefix.isBlank() || "P".equals(prefix) || "PT".equals(prefix) || "PONTO".equals(prefix)
                    || "V".equals(prefix) || "VERTICE".equals(prefix) || "VERTEX".equals(prefix)) {
                return String.format(Locale.US, "POINT:%02d", number);
            }
            if ("ESTACA".equals(prefix) || "E".equals(prefix)) {
                return String.format(Locale.US, "ESTACA:%02d", number);
            }
            return prefix + ":" + String.format(Locale.US, "%02d", number);
        }

        return "";
    }

    private Double getDouble(Map<?, ?> map, String key, Double defaultValue) {
        if (map == null) {
            return defaultValue;
        }
        Object value = map.get(key);
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        if (value instanceof String stringValue) {
            try {
                return Double.parseDouble(stringValue.replace(",", "."));
            } catch (NumberFormatException ignored) {
                return defaultValue;
            }
        }
        return defaultValue;
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

    public record MatchedReferencePoint(
            String propertyLabel,
            String dxfLabel,
            String canonicalLabel,
            double localX,
            double localY,
            double realE,
            double realN,
            int sequenceOrder
    ) {}

    public record GeoreferencingTransform(
            double rotationDegrees,
            double scale,
            double translateX,
            double translateY,
            double averageResidualMeters,
            String source,
            List<MatchedReferencePoint> matchedPoints
    ) {}

    private record TransformCandidate(
            GeoreferencingTransform transform,
            double rotationRadians
    ) {}

    private record ReferenceAnchor(
            String rawLabel,
            String canonicalLabel,
            double x,
            double y
    ) {}
}
