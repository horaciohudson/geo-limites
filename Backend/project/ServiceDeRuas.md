@Service
@Slf4j
public class RuaExtractorService {

    @Autowired
    private DxfTextExtractorRobustoService textExtractor;
    
    public List<String> extrairRuas(List<Map<String, Object>> entidades) {
        log.info("🛣️ Iniciando extração de nomes de ruas...");
        
        // 1. Extrai todos os textos
        List<TextoDxf> todosTextos = textExtractor.extrairTodosTextos(entidades);
        
        // 2. Filtra apenas textos de ruas
        List<TextoDxf> textosRuas = textExtractor.filtrarPorCategoria(todosTextos, "RUA");
        
        log.info("🛣️ Textos identificados como ruas: {}", textosRuas.size());
        
        // 3. Processa e limpa nomes
        List<String> ruas = textosRuas.stream()
            .map(this::processarNomeRua)
            .filter(r -> r != null && !r.isEmpty())
            .distinct()
            .sorted()
            .collect(Collectors.toList());
        
        log.info("✅ Ruas extraídas: {}", ruas);
        
        // 4. Log detalhado para debug
        for (TextoDxf texto : textosRuas) {
            log.debug("🛣️ Rua: '{}' @ ({:.2f}, {:.2f}) rot={:.1f}° layer={}",
                texto.getTexto(),
                texto.getX(),
                texto.getY(),
                texto.getRotacao(),
                texto.getLayer()
            );
        }
        
        return ruas;
    }
    
    private String processarNomeRua(TextoDxf texto) {
        String nome = texto.getTexto();
        
        // Normaliza
        nome = nome.toUpperCase()
            .replaceAll("\\s+", " ")
            .trim();
        
        // Remove prefixos redundantes se já está no nome
        if (nome.startsWith("RUA ") || nome.startsWith("R. ")) {
            // Mantém como está
        } else if (nome.contains("RUA") || nome.contains("AVENIDA")) {
            // Já tem o tipo no meio, ok
        } else {
            // Adiciona "RUA" se não tem
            nome = "RUA " + nome;
        }
        
        return nome;
    }
    
    /**
     * Identifica qual rua está em cada lado do terreno
     */
    public Map<String, String> identificarRuasPorLado(
        List<Map<String, Object>> entidades,
        BoundingBox terreno
    ) {
        
        List<TextoDxf> todosTextos = textExtractor.extrairTodosTextos(entidades);
        List<TextoDxf> textosRuas = textExtractor.filtrarPorCategoria(todosTextos, "RUA");
        
        Map<String, String> ruasPorLado = new HashMap<>();
        
        // Norte (acima do terreno)
        textosRuas.stream()
            .filter(t -> t.getY() > terreno.getMaxY())
            .min((a, b) -> Double.compare(
                Math.abs(a.getY() - terreno.getMaxY()),
                Math.abs(b.getY() - terreno.getMaxY())
            ))
            .ifPresent(t -> ruasPorLado.put("NORTE", processarNomeRua(t)));
        
        // Sul (abaixo do terreno)
        textosRuas.stream()
            .filter(t -> t.getY() < terreno.getMinY())
            .min((a, b) -> Double.compare(
                Math.abs(t.getY() - terreno.getMinY()),
                Math.abs(b.getY() - terreno.getMinY())
            ))
            .ifPresent(t -> ruasPorLado.put("SUL", processarNomeRua(t)));
        
        // Leste (à direita)
        textosRuas.stream()
            .filter(t -> t.getX() > terreno.getMaxX())
            .min((a, b) -> Double.compare(
                Math.abs(a.getX() - terreno.getMaxX()),
                Math.abs(b.getX() - terreno.getMaxX())
            ))
            .ifPresent(t -> ruasPorLado.put("LESTE", processarNomeRua(t)));
        
        // Oeste (à esquerda)
        textosRuas.stream()
            .filter(t -> t.getX() < terreno.getMinX())
            .min((a, b) -> Double.compare(
                Math.abs(t.getX() - terreno.getMinX()),
                Math.abs(b.getX() - terreno.getMinX())
            ))
            .ifPresent(t -> ruasPorLado.put("OESTE", processarNomeRua(t)));
        
        log.info("🧭 Ruas identificadas por lado: {}", ruasPorLado);
        
        return ruasPorLado;
    }
}

@Data
@AllArgsConstructor
class BoundingBox {
private double minX;
private double minY;
private double maxX;
private double maxY;
}