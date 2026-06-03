O Problema:
DXF tem DOIS sistemas de coordenadas:

1. Coordenadas de DESENHO (locais):
    - X: 200, Y: 300
    - X: 500, Y: 800
      ❌ Isso é só para desenhar!

2. Coordenadas GEOREFERENCIADAS (SIRGAS 2000):
    - Guardadas em VARIÁVEIS do DXF
    - $INSBASE, $EXTMIN, $EXTMAX
    - Ou em metadados específicos
      ✅ Isso é o que você precisa!
      Solução: Extrator de Coordenadas Georeferenciadas
      java@Service
      @Slf4j
      public class DxfGeoReferenciaExtractorService {

   /**
    * Extrai coordenadas georeferenciadas SIRGAS 2000 do DXF
      */
      public CoordenadaGeo extrairCoordenadaBase(List<Map<String, Object>> entidades) {
      log.info("🌍 ========================================");
      log.info("🌍 EXTRAINDO COORDENADAS GEOREFERENCIADAS");
      log.info("🌍 ========================================");

      CoordenadaGeo coordenadaBase = null;

      // ESTRATÉGIA 1: Procura em HEADER VARIABLES
      coordenadaBase = buscarEmHeaderVariables(entidades);

      if (coordenadaBase != null) {
      log.info("✅ Coordenadas encontradas em HEADER");
      return coordenadaBase;
      }

      // ESTRATÉGIA 2: Procura em textos TEXT/MTEXT
      coordenadaBase = buscarEmTextos(entidades);

      if (coordenadaBase != null) {
      log.info("✅ Coordenadas encontradas em TEXTOS");
      return coordenadaBase;
      }

      // ESTRATÉGIA 3: Procura em XDATA (dados estendidos)
      coordenadaBase = buscarEmXData(entidades);

      if (coordenadaBase != null) {
      log.info("✅ Coordenadas encontradas em XDATA");
      return coordenadaBase;
      }

      // ESTRATÉGIA 4: Busca em INSERT com atributos
      coordenadaBase = buscarEmInserts(entidades);

      if (coordenadaBase != null) {
      log.info("✅ Coordenadas encontradas em INSERT");
      return coordenadaBase;
      }

      // ESTRATÉGIA 5: Inferir do padrão de coordenadas
      coordenadaBase = inferirDeCoordenadas(entidades);

      if (coordenadaBase != null) {
      log.info("✅ Coordenadas inferidas do padrão");
      return coordenadaBase;
      }

      log.warn("⚠️ Coordenadas georeferenciadas NÃO encontradas!");
      log.warn("💡 Sistema usará coordenadas locais do DXF");

      return null;
      }

   /**
    * ESTRATÉGIA 1: Busca em variáveis do HEADER
      */
      private CoordenadaGeo buscarEmHeaderVariables(List<Map<String, Object>> entidades) {
      log.info("🔍 Estratégia 1: Buscando em HEADER variables...");

      for (Map<String, Object> entity : entidades) {
      String type = (String) entity.get("type");

           if ("HEADER".equals(type) || "VARIABLE".equals(type)) {
               
               // Procura $INSBASE (ponto de inserção base)
               Object insbase = entity.get("$INSBASE");
               if (insbase instanceof Map) {
                   Map<?, ?> coord = (Map<?, ?>) insbase;
                   Double x = getDouble(coord, "x", null);
                   Double y = getDouble(coord, "y", null);
                   
                   if (x != null && y != null && isCoordenadaSIRGAS(x, y)) {
                       log.info("📍 Encontrado em $INSBASE: E={}, N={}", x, y);
                       return new CoordenadaGeo(x, y, "HEADER_INSBASE");
                   }
               }
               
               // Procura $EXTMIN (mínimo da extensão)
               Object extmin = entity.get("$EXTMIN");
               if (extmin instanceof Map) {
                   Map<?, ?> coord = (Map<?, ?>) extmin;
                   Double x = getDouble(coord, "x", null);
                   Double y = getDouble(coord, "y", null);
                   
                   if (x != null && y != null && isCoordenadaSIRGAS(x, y)) {
                       log.info("📍 Encontrado em $EXTMIN: E={}, N={}", x, y);
                       return new CoordenadaGeo(x, y, "HEADER_EXTMIN");
                   }
               }
               
               // Procura $LIMMIN (limite mínimo)
               Object limmin = entity.get("$LIMMIN");
               if (limmin instanceof Map) {
                   Map<?, ?> coord = (Map<?, ?>) limmin;
                   Double x = getDouble(coord, "x", null);
                   Double y = getDouble(coord, "y", null);
                   
                   if (x != null && y != null && isCoordenadaSIRGAS(x, y)) {
                       log.info("📍 Encontrado em $LIMMIN: E={}, N={}", x, y);
                       return new CoordenadaGeo(x, y, "HEADER_LIMMIN");
                   }
               }
           }
      }

      log.debug("❌ Não encontrado em HEADER variables");
      return null;
      }

   /**
    * ESTRATÉGIA 2: Busca em textos TEXT/MTEXT
      */
      private CoordenadaGeo buscarEmTextos(List<Map<String, Object>> entidades) {
      log.info("🔍 Estratégia 2: Buscando em TEXTOS...");

      // Padrões para coordenadas SIRGAS
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
                   log.debug("📍 Coordenada E encontrada no texto: {} -> {}", texto, coordE);
               }
               
               // Busca coordenada N (Norte)
               Matcher matcherN = patternN.matcher(texto);
               if (matcherN.find()) {
                   String parteInteira = matcherN.group(1);
                   String parteDecimal = matcherN.groupCount() > 1 ? matcherN.group(2) : "00";
                   
                   coordN = Double.parseDouble(parteInteira + "." + parteDecimal);
                   log.debug("📍 Coordenada N encontrada no texto: {} -> {}", texto, coordN);
               }
               
               // Se encontrou ambas, valida e retorna
               if (coordE != null && coordN != null && isCoordenadaSIRGAS(coordE, coordN)) {
                   log.info("✅ Coordenadas completas encontradas em textos!");
                   log.info("📍 E={}, N={}", coordE, coordN);
                   return new CoordenadaGeo(coordE, coordN, "TEXT");
               }
           }
      }

      log.debug("❌ Não encontrado em TEXTOS");
      return null;
      }

   /**
    * ESTRATÉGIA 3: Busca em XDATA (dados estendidos)
      */
      private CoordenadaGeo buscarEmXData(List<Map<String, Object>> entidades) {
      log.info("🔍 Estratégia 3: Buscando em XDATA...");

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
                               log.info("📍 Encontrado em XDATA[{}]: E={}, N={}", key, x, y);
                               return new CoordenadaGeo(x, y, "XDATA_" + key);
                           }
                       }
                   }
               }
           }
      }

      log.debug("❌ Não encontrado em XDATA");
      return null;
      }

   /**
    * ESTRATÉGIA 4: Busca em blocos INSERT com atributos
      */
      private CoordenadaGeo buscarEmInserts(List<Map<String, Object>> entidades) {
      log.info("🔍 Estratégia 4: Buscando em INSERTs...");

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
                           log.info("📍 Encontrado em INSERT: E={}, N={}", coordE, coordN);
                           return new CoordenadaGeo(coordE, coordN, "INSERT_ATTRIB");
                       }
                   }
               }
           }
      }

      log.debug("❌ Não encontrado em INSERTs");
      return null;
      }

   /**
    * ESTRATÉGIA 5: Inferir do padrão de coordenadas
    * (Quando as coordenadas locais já são SIRGAS)
      */
      private CoordenadaGeo inferirDeCoordenadas(List<Map<String, Object>> entidades) {
      log.info("🔍 Estratégia 5: Inferindo de coordenadas existentes...");

      // Coleta todas as coordenadas X e Y
      List<Double> coordinatesX = new ArrayList<>();
      List<Double> coordinatesY = new ArrayList<>();

      for (Map<String, Object> entity : entidades) {
      String type = (String) entity.get("type");

           if ("LINE".equals(type)) {
               Map<?, ?> start = (Map<?, ?>) entity.get("start");
               if (start != null) {
                   coordinatesX.add(getDouble(start, "x", 0.0));
                   coordinatesY.add(getDouble(start, "y", 0.0));
               }
           } else if ("POINT".equals(type)) {
               coordinatesX.add(getDouble(entity, "x", 0.0));
               coordinatesY.add(getDouble(entity, "y", 0.0));
           }
      }

      if (coordinatesX.isEmpty()) {
      return null;
      }

      // Pega o menor valor (canto inferior esquerdo)
      Double minX = coordinatesX.stream().min(Double::compare).orElse(0.0);
      Double minY = coordinatesY.stream().min(Double::compare).orElse(0.0);

      // Verifica se já são coordenadas SIRGAS
      if (isCoordenadaSIRGAS(minX, minY)) {
      log.info("✅ Coordenadas locais JÁ SÃO SIRGAS!");
      log.info("📍 E={}, N={}", minX, minY);
      return new CoordenadaGeo(minX, minY, "INFERIDO_LOCAL");
      }

      log.debug("❌ Coordenadas locais não são SIRGAS");
      return null;
      }

   /**
    * Valida se é coordenada SIRGAS 2000 (UTM)
      */
      private boolean isCoordenadaSIRGAS(Double x, Double y) {
      if (x == null || y == null) return false;

      // Coordenadas SIRGAS 2000 / UTM Brasil:
      // E (Leste): ~160.000 a ~850.000 (6 a 7 dígitos)
      // N (Norte): ~750.000 a ~10.500.000 (7 a 8 dígitos)

      boolean xValido = x >= 160000 && x <= 850000;
      boolean yValido = y >= 750000 && y <= 10500000;

      if (xValido && yValido) {
      log.debug("✅ Coordenada válida SIRGAS: E={}, N={}", x, y);
      return true;
      }

      log.debug("❌ Coordenada NÃO é SIRGAS: E={}, N={}", x, y);
      return false;
      }

   /**
    * Extrai número de texto (remove formatação)
      */
      private Double extrairNumeroDeTexto(String texto) {
      try {
      // Remove tudo que não é número ou ponto/vírgula
      String numero = texto.replaceAll("[^0-9.,]", "")
      .replace(",", ".");

           if (!numero.isEmpty()) {
               return Double.parseDouble(numero);
           }
      } catch (Exception e) {
      log.debug("Não foi possível extrair número de: {}", texto);
      }

      return null;
      }

   /**
    * Converte coordenadas locais para SIRGAS usando offset
      */
      public Ponto converterParaSIRGAS(Ponto pontoLocal, CoordenadaGeo coordenadaBase) {
      if (coordenadaBase == null) {
      log.warn("⚠️ Sem coordenada base, retornando coordenadas locais");
      return pontoLocal;
      }

      // Soma o offset da coordenada base
      double xSIRGAS = coordenadaBase.getE() + pontoLocal.getX();
      double ySIRGAS = coordenadaBase.getN() + pontoLocal.getY();

      return new Ponto(
      xSIRGAS,
      ySIRGAS,
      pontoLocal.getLayer(),
      pontoLocal.getTipo() + "_SIRGAS"
      );
      }

   /**
    * Converte lista de pontos para SIRGAS
      */
      public List<Ponto> converterListaParaSIRGAS(List<Ponto> pontosLocais, CoordenadaGeo coordenadaBase) {
      if (coordenadaBase == null) {
      log.warn("⚠️ Sem coordenada base, retornando coordenadas locais");
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
   }

// DTO
@Data
@AllArgsConstructor
@NoArgsConstructor
class CoordenadaGeo {
private Double e; // Leste (East)
private Double n; // Norte (North)
private String fonte; // De onde veio

    @Override
    public String toString() {
        return String.format("E %.2fm, N %.2fm (fonte: %s)", e, n, fonte);
    }
}
Integração no Extrator Vetorial
java@Service
public class DxfVetorialExtractorService {

    @Autowired
    private DxfGeoReferenciaExtractorService geoExtractor;
    
    public DadosVetoriais extrairGeometrias(List<Map<String, Object>> entidades) {
        log.info("🔧 EXTRAÇÃO VETORIAL ROBUSTA");
        
        DadosVetoriais dados = new DadosVetoriais();
        
        // 1. PRIMEIRO: Extrai coordenada base SIRGAS
        CoordenadaGeo coordenadaBase = geoExtractor.extrairCoordenadaBase(entidades);
        dados.setCoordenadaBase(coordenadaBase);
        
        if (coordenadaBase != null) {
            log.info("🌍 Coordenada Base SIRGAS: {}", coordenadaBase);
        } else {
            log.warn("⚠️ Coordenada SIRGAS não encontrada, usando coordenadas locais");
        }
        
        // 2. Extrai pontos normalmente
        List<Ponto> pontosLocais = extrairTodosPontos(entidades);
        
        // 3. Converte para SIRGAS se possível
        List<Ponto> pontosSIRGAS = geoExtractor.converterListaParaSIRGAS(
            pontosLocais, 
            coordenadaBase
        );
        
        dados.setPontos(pontosSIRGAS);
        
        //... resto do código
        
        return dados;
    }
}
Endpoint de Debug
java@GetMapping("/testar-georeferencia")
public ResponseEntity<Map<String, Object>> testarGeo(
@RequestParam("file") MultipartFile file
) throws Exception {

    List<Map<String, Object>> entidades = dxfParser.parse(file);
    
    CoordenadaGeo coordBase = geoExtractor.extrairCoordenadaBase(entidades);
    
    Map<String, Object> resultado = new HashMap<>();
    
    if (coordBase != null) {
        resultado.put("status", "✅ ENCONTRADO");
        resultado.put("coordenada_e", coordBase.getE());
        resultado.put("coordenada_n", coordBase.getN());
        resultado.put("fonte", coordBase.getFonte());
        resultado.put("formato", String.format("E %.2fm, N %.2fm", 
            coordBase.getE(), coordBase.getN()));
    } else {
        resultado.put("status", "❌ NÃO ENCONTRADO");
        resultado.put("mensagem", "Coordenadas SIRGAS não foram encontradas no DXF");
    }
    
    return ResponseEntity.ok(resultado);
}

Como Testar:
bashcurl -X GET "http://localhost:9010/api/debug/testar-georeferencia" \
-F "file=@seu_arquivo.dxf"
Vai retornar:
json{
"status": "✅ ENCONTRADO",
"coordenada_e": 556478.64,
"coordenada_n": 9544347.43,
"fonte": "TEXT",
"formato": "E 556478.64m, N 9544347.43m"
}

Implementa isso e as coordenadas REAIS vão aparecer no memorial! 🎯🌍