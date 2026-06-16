package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.MemorialExportDTO;
import com.momorialPro.CadMemorial.dto.MemorialRequestDTO;
import com.momorialPro.CadMemorial.util.DxfParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemorialService {

    @Transactional(readOnly = true)
    public MemorialExportDTO generate(MemorialRequestDTO dto) {
        if (dto.entities() == null || dto.entities().isEmpty()) {
            log.error("Lista de entidades DXF é obrigatória e não pode estar vazia");
            throw new IllegalArgumentException("Dados DXF são obrigatórios para gerar o memorial");
        }
        if (dto.fileName() == null || dto.fileName().isBlank()) {
            log.error("Nome do arquivo é obrigatório");
            throw new IllegalArgumentException("Nome do arquivo é obrigatório");
        }
        if (dto.projectName() == null || dto.projectName().isBlank()) {
            log.error("Nome do projeto é obrigatório");
            throw new IllegalArgumentException("Nome do projeto é obrigatório");
        }

        try {
            List<DxfParser.Entity> entities = dto.entities();

            // 📊 Agrupa entidades por tipo
            Map<String, Long> entitiesByType = entities.stream()
                    .collect(Collectors.groupingBy(DxfParser.Entity::type, Collectors.counting()));
            
            // 📊 Agrupa entidades por layer
            Map<String, Long> entitiesByLayer = entities.stream()
                    .collect(Collectors.groupingBy(DxfParser.Entity::layer, Collectors.counting()));

            // 🧠 Cria o conteúdo textual do memorial com detalhes técnicos
            StringBuilder content = new StringBuilder();
            content.append("MEMORIAL DESCRITIVO\n");
            content.append("===================\n\n");
            
            content.append("1. IDENTIFICACAO DO PROJETO\n");
            content.append("Projeto: ").append(dto.projectName()).append("\n");
            content.append("Descricao: ").append(dto.projectDescription() != null ? dto.projectDescription() : "Sem descricao adicional").append("\n\n");
            
            content.append("2. INFORMACOES DO ARQUIVO\n");
            content.append("Arquivo: ").append(dto.fileName()).append("\n");
            content.append("Status: Arquivo processado em memoria\n");
            content.append("Total de entidades carregadas: ").append(entities.size()).append("\n\n");
            
            content.append("3. ANALISE TECNICA DO DXF\n");
            content.append("Total de entidades: ").append(entities.size()).append("\n\n");
            
            content.append("3.1. DISTRIBUICAO POR TIPO DE ENTIDADE\n");
            entitiesByType.entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .forEach(entry -> content.append("- ").append(entry.getKey()).append(": ").append(entry.getValue()).append(" entidades\n"));
            
            content.append("\n3.2. DISTRIBUICAO POR LAYER\n");
            entitiesByLayer.entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .forEach(entry -> content.append("- Layer ").append(entry.getKey()).append(": ").append(entry.getValue()).append(" entidades\n"));
            
            content.append("\n4. DETALHES TECNICOS\n");
            content.append("4. DETALHES TECNICOS\n");
            content.append("4.1. RESUMO POR TIPO DE ENTIDADE\n");
            entitiesByType.forEach((type, count) -> {
                content.append("- ").append(type).append(": ").append(count).append(" ocorrencias\n");
                // Adiciona detalhes específicos por tipo se necessário
                if (type.equals("LINE")) {
                    content.append("  * Linhas representam elementos lineares do desenho\n");
                } else if (type.equals("CIRCLE")) {
                    content.append("  * Circulos representam elementos circulares\n");
                } else if (type.equals("ARC")) {
                    content.append("  * Arcos representam segmentos curvos\n");
                } else if (type.equals("TEXT") || type.equals("MTEXT")) {
                    content.append("  * Textos contem informacoes descritivas\n");
                    
                    // Conta textos com conteúdo
                    long textsWithContent = entities.stream()
                        .filter(e -> (e.type().equals("TEXT") || e.type().equals("MTEXT")) && 
                                   e.text() != null && !e.text().trim().isEmpty())
                        .count();
                    content.append("  * Textos com conteúdo: ").append(textsWithContent).append(" de ").append(count).append("\n");
                }
            });
            
            // Adiciona seção de coordenadas e medidas
            content.append("\n4.2. COORDENADAS E MEDIDAS DAS ENTIDADES\n");
            entities.stream()
                    .filter(entity -> entity.x() != null || entity.y() != null || entity.radius() != null)
                    .forEach(entity -> {
                        content.append("- ").append(entity.type()).append(" (Layer: ").append(entity.layer()).append(")\n");
                        
                        if (entity.x() != null && entity.y() != null) {
                            content.append("  * Coordenada inicial: X=").append(String.format("%.3f", entity.x()))
                                   .append(", Y=").append(String.format("%.3f", entity.y()));
                            if (entity.z() != null) {
                                content.append(", Z=").append(String.format("%.3f", entity.z()));
                            }
                            content.append("\n");
                        }
                        
                        if (entity.x2() != null && entity.y2() != null) {
                            content.append("  * Coordenada final: X=").append(String.format("%.3f", entity.x2()))
                                   .append(", Y=").append(String.format("%.3f", entity.y2()));
                            if (entity.z2() != null) {
                                content.append(", Z=").append(String.format("%.3f", entity.z2()));
                            }
                            content.append("\n");
                            
                            // Calcula distância para linhas
                            if (entity.type().equals("LINE")) {
                                double distance = Math.sqrt(Math.pow(entity.x2() - entity.x(), 2) + 
                                                          Math.pow(entity.y2() - entity.y(), 2));
                                content.append("  * Comprimento: ").append(String.format("%.3f", distance)).append(" unidades\n");
                            }
                        }
                        
                        if (entity.radius() != null) {
                            content.append("  * Raio: ").append(String.format("%.3f", entity.radius())).append(" unidades\n");
                            if (entity.type().equals("CIRCLE")) {
                                double area = Math.PI * Math.pow(entity.radius(), 2);
                                double perimeter = 2 * Math.PI * entity.radius();
                                content.append("  * Area: ").append(String.format("%.3f", area)).append(" unidades²\n");
                                content.append("  * Perimetro: ").append(String.format("%.3f", perimeter)).append(" unidades\n");
                            }
                        }
                        
                        if (entity.startAngle() != null && entity.endAngle() != null) {
                            content.append("  * Angulo inicial: ").append(String.format("%.2f", entity.startAngle())).append("°\n");
                            content.append("  * Angulo final: ").append(String.format("%.2f", entity.endAngle())).append("°\n");
                        }
                        
                        if (entity.text() != null && !entity.text().trim().isEmpty()) {
                            content.append("  * Texto: \"").append(entity.text()).append("\"\n");
                            
                            // Adiciona informações de estilo e formatação se disponíveis
                            if (entity.textStyle() != null) {
                                content.append("    - Estilo: ").append(entity.textStyle()).append("\n");
                            }
                            if (entity.textHeight() != null) {
                                content.append("    - Altura: ").append(String.format("%.2f", entity.textHeight())).append(" unidades\n");
                            }
                            if (entity.textRotation() != null) {
                                content.append("    - Rotação: ").append(String.format("%.2f", entity.textRotation())).append("°\n");
                            }
                        }
                        
                        content.append("\n");
                    });
            
            content.append("\n4.3. ANALISE POR LAYER\n");
            entitiesByLayer.forEach((layer, count) -> {
                content.append("- Layer '").append(layer).append("': ").append(count).append(" entidades\n");
            });
            
            content.append("\n5. CONCLUSAO\n");
            content.append("O arquivo DXF foi processado com sucesso diretamente da memoria, contendo ").append(entities.size()).append(" entidades ");
            content.append("distribuidas em ").append(entitiesByType.size()).append(" tipos diferentes ");
            content.append("e ").append(entitiesByLayer.size()).append(" layers.\n\n");
            content.append("Este memorial foi gerado a partir dos dados ja carregados no sistema, ");
            content.append("proporcionando uma analise em tempo real do conteudo do arquivo.\n\n");
            
            content.append("6. REFERENCIAS NORMATIVAS\n");
            content.append("Este memorial descritivo foi elaborado em conformidade com as seguintes normas tecnicas:\n\n");
            content.append("- ABNT NBR 6492:2021 - Representacao de projetos de arquitetura\n");
            content.append("- ABNT NBR 10068:1987 - Folha de desenho - Leiaute e dimensoes\n");
            content.append("- ABNT NBR 10126:1987 - Cotagem em desenho tecnico\n");
            content.append("- ABNT NBR 8196:1999 - Desenho tecnico - Emprego de escalas\n");
            content.append("- ABNT NBR 8403:1984 - Aplicacao de linhas em desenhos - Tipos de linhas - Larguras das linhas\n");
            content.append("- ABNT NBR 13142:1999 - Desenho tecnico - Dobramento de copia\n");
            content.append("- ABNT NBR 15873:2010 - Coordenacao modular para edificacoes\n\n");
            
            content.append("Memorial gerado automaticamente pelo sistema GeoLimites.\n");
            return new MemorialExportDTO(dto.projectName(), dto.fileName(), content.toString());

        } catch (Exception e) {
            log.error("Erro durante a geração do memorial: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao processar dados DXF: " + e.getMessage(), e);
        }
    }
}
