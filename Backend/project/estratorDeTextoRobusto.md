@Service
@Slf4j
public class DxfTextExtractorRobustoService {

    /**
     * Extrai TODOS os textos do DXF, independente de tipo ou rotação
     */
    public List<TextoDxf> extrairTodosTextos(List<Map<String, Object>> entidades) {
        log.info("📝 Iniciando extração robusta de textos de {} entidades", entidades.size());
        
        List<TextoDxf> textos = new ArrayList<>();
        
        // 1. Extrai TEXTs simples
        textos.addAll(extrairText(entidades));
        
        // 2. Extrai MTEXTs (multilinha)
        textos.addAll(extrairMText(entidades));
        
        // 3. Extrai ATTRIBs (atributos de blocos)
        textos.addAll(extrairAttrib(entidades));
        
        // 4. Extrai textos de INSERTs (blocos)
        textos.addAll(extrairTextosDeInserts(entidades));
        
        log.info("✅ Total de textos extraídos: {}", textos.size());
        
        // 5. Classifica os textos
        classificarTextos(textos);
        
        return textos;
    }
    
    private List<TextoDxf> extrairText(List<Map<String, Object>> entidades) {
        List<TextoDxf> textos = new ArrayList<>();
        
        for (Map<String, Object> entity : entidades) {
            if (!"TEXT".equals(entity.get("type"))) continue;
            
            try {
                String texto = (String) entity.get("text");
                if (texto == null || texto.trim().isEmpty()) continue;
                
                TextoDxf txt = TextoDxf.builder()
                    .texto(texto.trim())
                    .tipo("TEXT")
                    .x(getDouble(entity, "x", 0.0))
                    .y(getDouble(entity, "y", 0.0))
                    .rotacao(normalizarRotacao(getDouble(entity, "rotation", 0.0)))
                    .altura(getDouble(entity, "height", 0.0))
                    .layer((String) entity.getOrDefault("layer", "DEFAULT"))
                    .build();
                
                textos.add(txt);
                
                log.debug("📝 TEXT: '{}' @ ({:.2f}, {:.2f}) rot={:.1f}°", 
                    txt.getTexto(), txt.getX(), txt.getY(), txt.getRotacao());
                
            } catch (Exception e) {
                log.error("❌ Erro ao extrair TEXT: {}", e.getMessage());
            }
        }
        
        log.info("📝 TEXTs extraídos: {}", textos.size());
        return textos;
    }
    
    private List<TextoDxf> extrairMText(List<Map<String, Object>> entidades) {
        List<TextoDxf> textos = new ArrayList<>();
        
        for (Map<String, Object> entity : entidades) {
            if (!"MTEXT".equals(entity.get("type"))) continue;
            
            try {
                String texto = (String) entity.get("text");
                if (texto == null || texto.trim().isEmpty()) continue;
                
                // MTEXT pode ter formatação, remove
                texto = limparMText(texto);
                
                TextoDxf txt = TextoDxf.builder()
                    .texto(texto)
                    .tipo("MTEXT")
                    .x(getDouble(entity, "x", 0.0))
                    .y(getDouble(entity, "y", 0.0))
                    .rotacao(normalizarRotacao(getDouble(entity, "rotation", 0.0)))
                    .altura(getDouble(entity, "height", 0.0))
                    .layer((String) entity.getOrDefault("layer", "DEFAULT"))
                    .build();
                
                textos.add(txt);
                
                log.debug("📝 MTEXT: '{}' @ ({:.2f}, {:.2f}) rot={:.1f}°", 
                    txt.getTexto(), txt.getX(), txt.getY(), txt.getRotacao());
                
            } catch (Exception e) {
                log.error("❌ Erro ao extrair MTEXT: {}", e.getMessage());
            }
        }
        
        log.info("📝 MTEXTs extraídos: {}", textos.size());
        return textos;
    }
    
    private List<TextoDxf> extrairAttrib(List<Map<String, Object>> entidades) {
        List<TextoDxf> textos = new ArrayList<>();
        
        for (Map<String, Object> entity : entidades) {
            if (!"ATTRIB".equals(entity.get("type"))) continue;
            
            try {
                String texto = (String) entity.get("text");
                if (texto == null || texto.trim().isEmpty()) continue;
                
                TextoDxf txt = TextoDxf.builder()
                    .texto(texto.trim())
                    .tipo("ATTRIB")
                    .x(getDouble(entity, "x", 0.0))
                    .y(getDouble(entity, "y", 0.0))
                    .rotacao(normalizarRotacao(getDouble(entity, "rotation", 0.0)))
                    .altura(getDouble(entity, "height", 0.0))
                    .layer((String) entity.getOrDefault("layer", "DEFAULT"))
                    .tag((String) entity.get("tag"))
                    .build();
                
                textos.add(txt);
                
                log.debug("📝 ATTRIB: '{}' @ ({:.2f}, {:.2f}) rot={:.1f}°", 
                    txt.getTexto(), txt.getX(), txt.getY(), txt.getRotacao());
                
            } catch (Exception e) {
                log.error("❌ Erro ao extrair ATTRIB: {}", e.getMessage());
            }
        }
        
        log.info("📝 ATTRIBs extraídos: {}", textos.size());
        return textos;
    }
    
    private List<TextoDxf> extrairTextosDeInserts(List<Map<String, Object>> entidades) {
        List<TextoDxf> textos = new ArrayList<>();
        
        for (Map<String, Object> entity : entidades) {
            if (!"INSERT".equals(entity.get("type"))) continue;
            
            try {
                // INSERTs podem ter atributos com textos
                Object attribsObj = entity.get("attributes");
                
                if (attribsObj instanceof List) {
                    List<?> attribs = (List<?>) attribsObj;
                    
                    for (Object attribObj : attribs) {
                        if (attribObj instanceof Map) {
                            Map<?, ?> attrib = (Map<?, ?>) attribObj;
                            
                            String texto = (String) attrib.get("text");
                            if (texto != null && !texto.trim().isEmpty()) {
                                
                                // Posição do INSERT + offset do atributo
                                double insertX = getDouble(entity, "x", 0.0);
                                double insertY = getDouble(entity, "y", 0.0);
                                double attribX = getDouble(attrib, "x", 0.0);
                                double attribY = getDouble(attrib, "y", 0.0);
                                
                                TextoDxf txt = TextoDxf.builder()
                                    .texto(texto.trim())
                                    .tipo("INSERT_ATTRIB")
                                    .x(insertX + attribX)
                                    .y(insertY + attribY)
                                    .rotacao(normalizarRotacao(getDouble(attrib, "rotation", 0.0)))
                                    .altura(getDouble(attrib, "height", 0.0))
                                    .layer((String) entity.getOrDefault("layer", "DEFAULT"))
                                    .tag((String) attrib.get("tag"))
                                    .build();
                                
                                textos.add(txt);
                            }
                        }
                    }
                }
                
            } catch (Exception e) {
                log.error("❌ Erro ao extrair textos de INSERT: {}", e.getMessage());
            }
        }
        
        log.info("📝 Textos de INSERTs extraídos: {}", textos.size());
        return textos;
    }
    
    /**
     * Normaliza rotação para 0-360 graus
     */
    private double normalizarRotacao(double rotacao) {
        // Se parece radianos (< 7), converte para graus
        if (Math.abs(rotacao) < 7) {
            rotacao = Math.toDegrees(rotacao);
        }
        
        // Normaliza para 0-360
        while (rotacao < 0) rotacao += 360;
        while (rotacao >= 360) rotacao -= 360;
        
        return rotacao;
    }
    
    /**
     * Remove formatação de MTEXT (\P = quebra linha, etc)
     */
    private String limparMText(String texto) {
        return texto
            .replaceAll("\\\\P", " ")      // Quebra de linha
            .replaceAll("\\\\[A-Za-z][0-9;]*", "")  // Códigos de formatação
            .replaceAll("\\{|\\}", "")     // Chaves
            .trim();
    }
    
    /**
     * Classifica textos em categorias
     */
    private void classificarTextos(List<TextoDxf> textos) {
        for (TextoDxf texto : textos) {
            String t = texto.getTexto().toUpperCase();
            
            // Detecta ruas
            if (t.contains("RUA") || t.contains("AV.") || t.contains("AVENIDA") || 
                t.contains("TRAVESSA") || t.contains("R.")) {
                texto.setCategoria("RUA");
            }
            
            // Detecta números de lote
            else if (t.matches("LOTE\\s*\\d+") || t.matches("L\\s*\\d+")) {
                texto.setCategoria("LOTE");
            }
            
            // Detecta matrículas
            else if (t.matches("\\d{5,}") || t.contains("MATRÍCULA")) {
                texto.setCategoria("MATRICULA");
            }
            
            // Detecta medidas (metros)
            else if (t.matches("\\d+[,.]\\d+\\s*M?") || t.matches("\\d+\\.\\d+")) {
                texto.setCategoria("MEDIDA");
            }
            
            // Detecta ângulos
            else if (t.contains("°") || t.matches("\\d+°\\d+'\\d+\"")) {
                texto.setCategoria("ANGULO");
            }
            
            // Detecta proprietários (texto longo sem números)
            else if (t.length() > 10 && !t.matches(".*\\d{3,}.*")) {
                texto.setCategoria("PROPRIETARIO");
            }
            
            else {
                texto.setCategoria("OUTRO");
            }
        }
        
        // Log resumo
        Map<String, Long> contagem = textos.stream()
            .collect(Collectors.groupingBy(
                TextoDxf::getCategoria,
                Collectors.counting()
            ));
        
        log.info("📊 Textos classificados:");
        contagem.forEach((cat, count) -> 
            log.info("   {} {}: {}", getEmoji(cat), cat, count)
        );
    }
    
    private String getEmoji(String categoria) {
        return switch(categoria) {
            case "RUA" -> "🛣️";
            case "LOTE" -> "📦";
            case "MATRICULA" -> "📜";
            case "MEDIDA" -> "📏";
            case "ANGULO" -> "📐";
            case "PROPRIETARIO" -> "👤";
            default -> "📝";
        };
    }
    
    private Double getDouble(Map<?, ?> map, String key, double defaultValue) {
        Object value = map.get(key);
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return defaultValue;
    }
    
    /**
     * Filtra textos por categoria
     */
    public List<TextoDxf> filtrarPorCategoria(List<TextoDxf> textos, String categoria) {
        return textos.stream()
            .filter(t -> categoria.equals(t.getCategoria()))
            .collect(Collectors.toList());
    }
    
    /**
     * Busca textos próximos a uma coordenada
     */
    public List<TextoDxf> buscarTextosProximos(
        List<TextoDxf> textos, 
        double x, 
        double y, 
        double raio
    ) {
        return textos.stream()
            .filter(t -> {
                double dx = t.getX() - x;
                double dy = t.getY() - y;
                double distancia = Math.sqrt(dx * dx + dy * dy);
                return distancia <= raio;
            })
            .sorted((a, b) -> {
                double distA = Math.sqrt(
                    Math.pow(a.getX() - x, 2) + Math.pow(a.getY() - y, 2)
                );
                double distB = Math.sqrt(
                    Math.pow(b.getX() - x, 2) + Math.pow(b.getY() - y, 2)
                );
                return Double.compare(distA, distB);
            })
            .collect(Collectors.toList());
    }
}

// DTO
@Data
@Builder
class TextoDxf {
private String texto;
private String tipo;        // TEXT, MTEXT, ATTRIB, etc
private String categoria;   // RUA, LOTE, MEDIDA, etc
private double x;
private double y;
private double rotacao;     // 0-360 graus
private double altura;
private String layer;
private String tag;         // Para ATTRIBs

    public boolean isRotacionado() {
        return Math.abs(rotacao) > 5 && Math.abs(rotacao - 180) > 5;
    }
    
    public boolean isVertical() {
        return Math.abs(rotacao - 90) < 5 || Math.abs(rotacao - 270) < 5;
    }
    
    public boolean isHorizontal() {
        return rotacao < 5 || Math.abs(rotacao - 180) < 5 || rotacao > 355;
    }
}