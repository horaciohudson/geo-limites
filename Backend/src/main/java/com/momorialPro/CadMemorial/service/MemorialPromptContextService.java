package com.momorialPro.CadMemorial.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.MemorialStandardDTO;
import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.dto.SelectedConfrontationTextDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemorialPromptContextService {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private final ManualFrontageAnalysisService manualFrontageAnalysisService;
    private final DeterministicMemorialService deterministicMemorialService;

    public String buildPrompt(
            DxfCompareResultDTO compareResult,
            MemorialStandardDTO standard,
            PropertyDTO property,
            List<SimplePoint> extractedPoints,
            Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
            List<String> streetNames,
            Map<String, List<String>> confrontations,
            Map<String, Double> individualAreas,
            List<String> selectedLayers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            List<LotTechnicalSummary> expectedSummaries,
            int estimatedLots,
            String memorialBaseJson) {

        StringBuilder promptBuilder = new StringBuilder();
        Double areaReferencia = resolveReferenceArea(property, individualAreas, estimatedLots);
        Double perimetroReferencia = resolveReferencePerimeter(property, estimatedLots);
        String lotStreetReference = resolveLotStreetReference(streetNames);
        String northBoundaryReference = resolveDrawingBoundaryReference(confrontations, "NORTE");
        String southBoundaryReference = resolveDrawingBoundaryReference(confrontations, "SUL");
        String eastBoundaryReference = resolveDrawingBoundaryReference(confrontations, "LESTE");
        String westBoundaryReference = resolveDrawingBoundaryReference(confrontations, "OESTE");
        boolean strictManualSegmentMode = manualFrontageAnalysisService.hasManualSegmentSelections(selectedConfrontationTexts);

        if (estimatedLots == 1) {
            promptBuilder.append("GERE APENAS 1 LOTE COMPLETO com base exclusiva nas entidades filtradas/selecionadas. ");
        } else {
            promptBuilder.append("GERE ").append(estimatedLots).append(" LOTES COMPLETOS (1 a ").append(estimatedLots).append("). ");
        }
        promptBuilder.append("Descreva cada lote individualmente com base nos dados reais da propriedade e do DXF. ");
        promptBuilder.append("O endereco cadastral da propriedade/empresa pertence ao cabecalho e NAO deve ser repetido no corpo de cada lote. ");
        promptBuilder.append("Quando citar ruas, use apenas vias efetivamente identificadas no desenho/DXF. ");
        promptBuilder.append("NAO use '...' ou 'demais lotes'. ");
        promptBuilder.append("NAO invente area, perimetro, testada, profundidade, confrontantes ou coordenadas quando esses dados nao puderem ser inferidos com seguranca. ");
        promptBuilder.append("Respeite a ordem crescente dos lotes e a sequencia grafica dos pontos/estacas associada a cada poligono. ");
        promptBuilder.append("Atue apenas como redatora com base no resumo tecnico validado pelo backend.\n\n");
        if (strictManualSegmentMode) {
            promptBuilder.append("MODO ESTRITO DE CONFRONTACAO MANUAL: quando houver trecho manual selecionado no frontend, somente os lados com evidencia geometrica manual confirmada podem receber nome de via publica.\n");
            promptBuilder.append("Nao replique rua de outro terreno para fundos ou laterais sem toque manual confiavel; mantenha os demais lados como 'divisa interna do loteamento' ou 'nao identificado no DXF' conforme o resumo tecnico.\n\n");
        }

        if (standard != null && standard.getStandardText() != null) {
            promptBuilder.append("NORMA A SEGUIR:\n");
            promptBuilder.append(standard.getStandardText());
            promptBuilder.append("\n\n");
        }

        if (property != null) {
            promptBuilder.append("DADOS REAIS DA PROPRIEDADE:\n");
            if (property.getName() != null) {
                promptBuilder.append("Nome: ").append(property.getName()).append("\n");
            }
            if (property.getOwnerName() != null) {
                promptBuilder.append("Proprietário: ").append(property.getOwnerName()).append("\n");
            }
            if (property.getOwnerDocument() != null) {
                promptBuilder.append("CPF/CNPJ: ").append(property.getOwnerDocument()).append("\n");
            }
            if (property.getStreet() != null) {
                promptBuilder.append("Endereço: ").append(property.getStreet());
                if (property.getNumber() != null) {
                    promptBuilder.append(", ").append(property.getNumber());
                }
                promptBuilder.append("\n");
            }
            if (property.getCity() != null && property.getState() != null) {
                promptBuilder.append("Cidade/Estado: ").append(property.getCity()).append("/").append(property.getState()).append("\n");
            }
            if (property.getTotalArea() != null) {
                promptBuilder.append("Área Total: ").append(property.getTotalArea()).append(" m²\n");
            }
            if (property.getTotalPerimeter() != null) {
                promptBuilder.append("Perímetro Total: ").append(property.getTotalPerimeter()).append(" m\n");
            }
            promptBuilder.append("\n");
        }

        if (selectedLayers != null && !selectedLayers.isEmpty()) {
            promptBuilder.append("LAYERS/POLIGONOS SELECIONADOS NO FRONTEND:\n");
            promptBuilder.append("- ").append(String.join(", ", selectedLayers)).append("\n\n");
        }
        List<LotTechnicalSummary> effectiveExpectedSummaries = expectedSummaries != null
                ? expectedSummaries
                : List.of();
        appendSelectedConfrontationTextsPrompt(promptBuilder, selectedConfrontationTexts);
        appendManualConfrontationPromptContext(
                promptBuilder,
                selectedConfrontationTexts,
                !effectiveExpectedSummaries.isEmpty()
        );
        String technicalSummaryContext = buildLotTechnicalSummaryContext(effectiveExpectedSummaries);
        if (!technicalSummaryContext.isBlank()) {
            promptBuilder.append("RESUMO TECNICO VALIDADO DOS LOTES:\n");
            promptBuilder.append(technicalSummaryContext).append("\n");
            promptBuilder.append("Use exclusivamente esse resumo para redigir o memorial. Nao recalcule medidas, nao redistribua lados e nao crie confrontacoes fora do resumo.\n\n");
        }
        if (memorialBaseJson != null && !memorialBaseJson.isBlank()) {
            promptBuilder.append("MEMORIAL_BASE_JSON VALIDADO PELO BACKEND:\n");
            promptBuilder.append(memorialBaseJson).append("\n");
            promptBuilder.append("Esse JSON e a fonte da verdade do backend. Se houver conflito entre texto livre e JSON, siga o JSON.\n");
            promptBuilder.append("Atue apenas como redatora, convertendo o JSON tecnico em memorial coerente sem alterar os fatos.\n\n");
        }

        promptBuilder.append("ORIENTACAO DE ENDERECO E VIAS:\n");
        if (property != null && property.getStreet() != null) {
            promptBuilder.append("- Endereco cadastral (somente cabecalho): ").append(property.getStreet());
            if (property.getNumber() != null) {
                promptBuilder.append(", ").append(property.getNumber());
            }
            promptBuilder.append("\n");
        }
        promptBuilder.append("- Vias identificadas no desenho para uso nos lotes/confrontacoes: ")
                .append(lotStreetReference).append("\n\n");
        promptBuilder.append("REFERENCIAS PREFERENCIAIS DE CONFRONTACAO EXTRAIDAS DO DESENHO:\n");
        promptBuilder.append("- Norte: ").append(northBoundaryReference).append("\n");
        promptBuilder.append("- Sul: ").append(southBoundaryReference).append("\n");
        promptBuilder.append("- Leste: ").append(eastBoundaryReference).append("\n");
        promptBuilder.append("- Oeste: ").append(westBoundaryReference).append("\n");
        promptBuilder.append("MODELO PREFERENCIAL DE CONFRONTACOES PARA ESTE CONJUNTO:\n");
        promptBuilder.append("AO NORTE: usar preferencialmente ").append(northBoundaryReference).append(".\n");
        promptBuilder.append("AO SUL: usar preferencialmente ").append(southBoundaryReference).append(".\n");
        promptBuilder.append("AO LESTE: usar preferencialmente ").append(eastBoundaryReference).append(".\n");
        promptBuilder.append("AO OESTE: usar preferencialmente ").append(westBoundaryReference).append(".\n\n");
        if (strictManualSegmentMode) {
            promptBuilder.append("As referencias preferenciais acima NAO podem ser usadas para transferir rua a um lado que nao tenha toque manual/geometrico confiavel no resumo tecnico.\n\n");
        }

        promptBuilder.append("DADOS EXTRAIDOS DO DXF:\n");
        promptBuilder.append("Total de entidades: ").append(
                (compareResult.getAdded() != null ? compareResult.getAdded().size() : 0) +
                (compareResult.getModified() != null ? compareResult.getModified().size() : 0) +
                (compareResult.getRemoved() != null ? compareResult.getRemoved().size() : 0)
        ).append("\n");
        promptBuilder.append("Coordenadas extraidas: ").append(extractedPoints.size()).append(" pontos\n");

        if (!streetNames.isEmpty()) {
            promptBuilder.append("Ruas identificadas: ").append(String.join(", ", streetNames)).append("\n");
        }
        if (!individualAreas.isEmpty()) {
            promptBuilder.append("Áreas individuais calculadas: ").append(individualAreas.size()).append(" lotes\n");
        }
        if (areaReferencia != null) {
            promptBuilder.append("Área média de referência: ").append(String.format(Locale.US, "%.2f", areaReferencia)).append(" m²\n");
        }
        if (perimetroReferencia != null) {
            promptBuilder.append("Perímetro médio de referência: ").append(String.format(Locale.US, "%.2f", perimetroReferencia)).append(" m\n");
        }
        promptBuilder.append("Confrontantes de referência:\n");
        promptBuilder.append("- Norte: ").append(resolveBoundary(property, confrontations, "NORTE")).append("\n");
        promptBuilder.append("- Sul: ").append(resolveBoundary(property, confrontations, "SUL")).append("\n");
        promptBuilder.append("- Leste: ").append(resolveBoundary(property, confrontations, "LESTE")).append("\n");
        promptBuilder.append("- Oeste: ").append(resolveBoundary(property, confrontations, "OESTE")).append("\n");

        String selectedLotContext = buildSelectedLotContextFromSummaries(effectiveExpectedSummaries);
        if (!selectedLotContext.isBlank()) {
            promptBuilder.append("\nPOLIGONOS EFETIVAMENTE ENVIADOS:\n");
            promptBuilder.append(selectedLotContext);
            promptBuilder.append("Use esses poligonos como fonte principal para diferenciar os lotes.\n");
            promptBuilder.append("A ordem apresentada ja esta crescente e deve ser mantida no memorial.\n");
        }

        promptBuilder.append("\n=== FORMATO OBRIGATORIO PARA CADA LOTE ===\n");
        promptBuilder.append("LOTE X:\n");
        promptBuilder.append("Um imovel urbano integrante da area/loteamento em [CIDADE]/[ESTADO],\n");
        promptBuilder.append("possuindo formato poligonal conforme o resumo tecnico validado do backend,\n");
        promptBuilder.append("com perimetro, area e confrontacoes reproduzidos exatamente a partir dos dados tecnicos fornecidos.\n");
        promptBuilder.append("Descreva o perimetro em ordem sequencial dos pontos/estacas do lote, sem inverter a sequencia.\n");
        promptBuilder.append("----------------------------------------------------------------------\n");
        promptBuilder.append("USE EXATAMENTE ESTE FORMATO. Nao replique um lote padrao sem base tecnica.\n");
        promptBuilder.append("NAO escreva 'localizado na Rua " + (property != null && property.getStreet() != null ? property.getStreet() : "nao informado no cadastro") + "' no corpo do lote.\n");
        promptBuilder.append("Se precisar mencionar vias, use apenas: ").append(lotStreetReference).append(".\n");
        promptBuilder.append("Se essas vias estiverem identificadas no desenho, prefira usa-las nas confrontacoes antes de recorrer a fallback generico.\n");
        promptBuilder.append("Se houver referencia preferencial para Oeste no desenho, use essa referencia no AO OESTE em vez de fallback generico.\n");
        promptBuilder.append("Se a geometria do lote tocar duas ou mais vias em arestas distintas, aceite dupla frente ou esquina real; nao force um unico lado externo.\n");
        promptBuilder.append("Se um segmento manual terminar antes do lote, mas permanecer alinhado com aresta externa ou vertice de esquina do poligono, aceite continuidade geometrica da via.\n");
        promptBuilder.append("Se um lado do lote for interno e nao houver confrontante externo nominal confiavel, use 'divisa interna do loteamento'.\n");
        if (strictManualSegmentMode) {
            promptBuilder.append("Quando houver selecao manual por segmento, NUNCA use rua apenas porque ela aparece em outro terreno; use rua somente no lado tocado pelo segmento manual ou por continuidade de esquina validada.\n");
        }
        promptBuilder.append("NUNCA use nome de proprietario, empresa, pessoa fisica ou expressao 'propriedade de Fulano' como confrontante do lote.\n");

        if (!realCoordinates.isEmpty() && realCoordinates.containsKey("BASE_SIRGAS")) {
            CoordinateExtractionService.RealCoordinate baseSirgas = realCoordinates.get("BASE_SIRGAS");
            promptBuilder.append("\nREFERENCIA GEOESPACIAL PRINCIPAL:\n");
            promptBuilder.append(String.format(Locale.US, "- BASE_SIRGAS: E %.2fm N %.2fm (%s)\n",
                    baseSirgas.getE(), baseSirgas.getN(), baseSirgas.getSource()));
            promptBuilder.append("Use essa referencia apenas como apoio e nao para criar vertices artificiais.\n");
        } else if (!realCoordinates.isEmpty()) {
            promptBuilder.append("\nCOORDENADAS REAIS EXTRAIDAS:\n");
            realCoordinates.entrySet().stream().limit(8).forEach(entry -> {
                CoordinateExtractionService.RealCoordinate coord = entry.getValue();
                promptBuilder.append("- ").append(entry.getKey())
                        .append(": E ").append(String.format(Locale.US, "%.2f", coord.getE()))
                        .append("m N ").append(String.format(Locale.US, "%.2f", coord.getN())).append("m\n");
            });
            promptBuilder.append("Use somente coordenadas efetivamente extraidas do DXF.\n");
        } else if (!extractedPoints.isEmpty()) {
            promptBuilder.append("\nAMOSTRA DE PONTOS EXTRAIDOS:\n");
            extractedPoints.stream().limit(5).forEach(p ->
                    promptBuilder.append("- X ")
                            .append(String.format(Locale.US, "%.0f", p.x()))
                            .append(" Y ")
                            .append(String.format(Locale.US, "%.0f", p.y()))
                            .append("\n")
            );
            promptBuilder.append("Nao converta automaticamente esses pontos em coordenadas SIRGAS ficticias.\n");
        } else {
            log.warn("O arquivo analisado nao trouxe referencia georreferenciada confiavel para apoiar o memorial");
            promptBuilder.append("\nCOORDENADAS: nao foi possivel identificar referencia georreferenciada confiavel no arquivo DXF.\n");
            promptBuilder.append("Quando necessario, registre a necessidade de conferencia topografica complementar.\n");
        }

        promptBuilder.append("\nGere memorial completo com ").append(estimatedLots).append(" lotes usando dados da propriedade.\n");

        return promptBuilder.toString();
    }

    public String buildPromptFromTechnicalSummary(
            MemorialStandardDTO standard,
            PropertyDTO property,
            List<LotTechnicalSummary> summaries,
            List<String> selectedLayers,
            String technicalSummaryJson,
            String templateName,
            String templateJson) {
        StringBuilder promptBuilder = new StringBuilder();
        int estimatedLots = summaries != null ? summaries.size() : 0;

        promptBuilder.append("GERE O MEMORIAL DESCRITIVO USANDO EXCLUSIVAMENTE O RESUMO TECNICO VALIDADO PELO BACKEND. ");
        promptBuilder.append("Aja apenas como redatora. ");
        promptBuilder.append("Nao recalcule a geometria, nao invente confrontacoes, nao troque a ordem dos pontos e nao busque dados fora do JSON recebido.\n\n");

        if (estimatedLots == 1) {
            promptBuilder.append("GERE APENAS 1 LOTE COMPLETO.\n\n");
        } else {
            promptBuilder.append("GERE ").append(estimatedLots).append(" LOTES COMPLETOS EM ORDEM CRESCENTE.\n\n");
        }

        if (standard != null && standard.getStandardText() != null && !standard.getStandardText().isBlank()) {
            promptBuilder.append("NORMA A SEGUIR:\n");
            promptBuilder.append(standard.getStandardText()).append("\n\n");
        }

        if (templateName != null && !templateName.isBlank()) {
            promptBuilder.append("TEMPLATE APLICADO AO MEMORIAL:\n");
            promptBuilder.append(templateName.trim()).append("\n\n");
        }

        appendAppliedTemplateContext(promptBuilder, templateJson);

        if (property != null) {
            promptBuilder.append("DADOS CADASTRAIS DA PROPRIEDADE:\n");
            if (property.getName() != null) {
                promptBuilder.append("Nome: ").append(property.getName()).append("\n");
            }
            if (property.getRegistrationNumber() != null) {
                promptBuilder.append("Matricula/registro: ").append(property.getRegistrationNumber()).append("\n");
            }
            if (property.getOwnerName() != null) {
                promptBuilder.append("Proprietario: ").append(property.getOwnerName()).append("\n");
            }
            if (property.getStreet() != null) {
                promptBuilder.append("Endereco: ").append(property.getStreet());
                if (property.getNumber() != null) {
                    promptBuilder.append(", ").append(property.getNumber());
                }
                promptBuilder.append("\n");
            }
            if (property.getCity() != null && property.getState() != null) {
                promptBuilder.append("Cidade/Estado: ").append(property.getCity()).append("/").append(property.getState()).append("\n");
            }
            promptBuilder.append("\n");
        }

        if (selectedLayers != null && !selectedLayers.isEmpty()) {
            promptBuilder.append("ESCOPO APLICADO NESTA GERACAO:\n");
            promptBuilder.append("- ").append(String.join(", ", selectedLayers)).append("\n\n");
        }

        appendProcessingContext(promptBuilder, technicalSummaryJson);

        if (summaries != null && !summaries.isEmpty()) {
            promptBuilder.append("RESUMO TECNICO VALIDADO DOS LOTES:\n");
            promptBuilder.append(summaries.stream()
                    .map(this::formatLotTechnicalSummary)
                    .collect(Collectors.joining("\n\n")));
            promptBuilder.append("\n");
            promptBuilder.append("Use exclusivamente esse resumo para redigir o memorial.\n\n");
        }

        if (technicalSummaryJson != null && !technicalSummaryJson.isBlank()) {
            promptBuilder.append("JSON SOBERANO DO RESUMO TECNICO:\n");
            promptBuilder.append(technicalSummaryJson).append("\n");
            promptBuilder.append("Se houver conflito entre texto livre e JSON, siga o JSON.\n\n");
        }

        promptBuilder.append("FORMATO OBRIGATORIO:\n");
        promptBuilder.append("- respeitar a ordem crescente dos lotes;\n");
        promptBuilder.append("- respeitar a sequencia de vertices e arestas como recebida;\n");
        promptBuilder.append("- nao usar reticencias nem resumir lotes faltantes;\n");
        promptBuilder.append("- nao mencionar DXF, parser ou processo interno do sistema no corpo do memorial.\n");

        return promptBuilder.toString();
    }

    public String buildTechnicalSummaryChunkPrompt(
            int startLot,
            int endLot,
            int totalLots,
            MemorialStandardDTO standard,
            PropertyDTO property,
            List<LotTechnicalSummary> chunkSummaries,
            String technicalSummaryJson,
            String templateName,
            String templateJson) {
        StringBuilder promptBuilder = new StringBuilder();

        promptBuilder.append("GERE APENAS OS LOTES ").append(startLot).append(" A ").append(endLot)
                .append(" DE UM MEMORIAL DESCRITIVO MAIOR COM ").append(totalLots).append(" LOTES.\n");
        promptBuilder.append("Aja apenas como redatora tecnica. ");
        promptBuilder.append("Nao gere cabecalho completo, nao gere identificacao do terreno original, nao gere situacao antes, nao gere declaracao final e nao gere assinatura.\n");
        promptBuilder.append("Responda somente com os blocos dos lotes solicitados, em ordem crescente, iniciando cada bloco com 'LOTE N:'.\n");
        promptBuilder.append("Nao recalcule a geometria, nao invente confrontacoes, nao troque a ordem dos vertices e nao omita nenhum lote do intervalo solicitado.\n\n");

        if (standard != null && standard.getStandardText() != null && !standard.getStandardText().isBlank()) {
            promptBuilder.append("NORMA A SEGUIR:\n");
            promptBuilder.append(standard.getStandardText()).append("\n\n");
        }

        if (templateName != null && !templateName.isBlank()) {
            promptBuilder.append("TEMPLATE APLICADO AO MEMORIAL:\n");
            promptBuilder.append(templateName.trim()).append("\n\n");
        }

        appendAppliedTemplateContext(promptBuilder, templateJson);
        promptBuilder.append("Ao redigir estes lotes, respeite a linguagem e os placeholders do bloco 'situacao_depois' do template aplicado.\n\n");

        if (property != null) {
            promptBuilder.append("DADOS CADASTRAIS DA PROPRIEDADE PARA CONTEXTO:\n");
            if (property.getName() != null) {
                promptBuilder.append("Nome: ").append(property.getName()).append("\n");
            }
            if (property.getRegistrationNumber() != null) {
                promptBuilder.append("Matricula/registro: ").append(property.getRegistrationNumber()).append("\n");
            }
            if (property.getOwnerName() != null) {
                promptBuilder.append("Proprietario: ").append(property.getOwnerName()).append("\n");
            }
            if (property.getStreet() != null) {
                promptBuilder.append("Endereco: ").append(property.getStreet());
                if (property.getNumber() != null) {
                    promptBuilder.append(", ").append(property.getNumber());
                }
                promptBuilder.append("\n");
            }
            if (property.getNeighborhood() != null) {
                promptBuilder.append("Bairro: ").append(property.getNeighborhood()).append("\n");
            }
            if (property.getCity() != null && property.getState() != null) {
                promptBuilder.append("Cidade/Estado: ").append(property.getCity()).append("/").append(property.getState()).append("\n");
            }
            promptBuilder.append("\n");
        }

        appendProcessingContext(promptBuilder, technicalSummaryJson);

        if (chunkSummaries != null && !chunkSummaries.isEmpty()) {
            promptBuilder.append("RESUMO TECNICO VALIDADO DOS LOTES DESTE CHUNK:\n");
            promptBuilder.append(chunkSummaries.stream()
                    .map(this::formatLotTechnicalSummary)
                    .collect(Collectors.joining("\n\n")));
            promptBuilder.append("\n");
            promptBuilder.append("Use exclusivamente esse resumo para redigir os lotes ").append(startLot).append(" a ").append(endLot).append(".\n\n");
        }

        promptBuilder.append("FORMATO OBRIGATORIO:\n");
        promptBuilder.append("- responder apenas com os lotes ").append(startLot).append(" a ").append(endLot).append(";\n");
        promptBuilder.append("- iniciar cada lote com 'LOTE N:';\n");
        promptBuilder.append("- manter a sequencia de vertices e arestas exatamente como recebida;\n");
        promptBuilder.append("- nao usar reticencias nem resumir lotes faltantes;\n");
        promptBuilder.append("- nao mencionar DXF, parser, JSON, backend, template em JSON ou processo interno do sistema no corpo do memorial;\n");
        promptBuilder.append("- nao incluir preambulo, terreno original, declaracao final ou assinatura neste chunk.\n");

        return promptBuilder.toString();
    }

    private void appendProcessingContext(StringBuilder promptBuilder, String technicalSummaryJson) {
        MemorialProcessingContext processingContext = extractProcessingContext(technicalSummaryJson);
        if (processingContext == null || !processingContext.hasBaseArea()) {
            return;
        }

        promptBuilder.append("CONTEXTO OPERACIONAL DA AREA TOTAL:\n");
        promptBuilder.append("- Rotulo: ").append(processingContext.baseArea().label()).append("\n");
        promptBuilder.append("- Pontos do contorno base: ")
                .append(processingContext.baseArea().vertices().size())
                .append("\n");
        promptBuilder.append("- Sequencia do contorno base: ")
                .append(processingContext.baseArea().vertices().stream()
                        .map(MemorialProcessingContext.BaseAreaPoint::label)
                        .filter(Objects::nonNull)
                        .collect(Collectors.joining(" -> ")))
                .append("\n");
        promptBuilder.append("- Coordenadas do contorno base: ")
                .append(processingContext.baseArea().vertices().stream()
                        .map(this::formatBaseAreaPoint)
                        .collect(Collectors.joining(", ")))
                .append("\n");
        MemorialProcessingContext.OriginalPropertyContext originalProperty = processingContext.effectiveOriginalProperty();
        if (originalProperty != null && originalProperty.hasVertices()) {
            promptBuilder.append("- Terreno original narrativo: ")
                    .append(originalProperty.resolvedLabel())
                    .append(" | fonte: ")
                    .append(originalProperty.resolvedSource())
                    .append(" | papel: ")
                    .append(originalProperty.resolvedNarrativeRole())
                    .append(" | pontos: ")
                    .append(originalProperty.pointCount())
                    .append("\n");
        }
        MemorialProcessingContext.RemainingAreaContext remainingArea = processingContext.effectiveRemainingArea();
        if (remainingArea != null && remainingArea.hasVertices()) {
            promptBuilder.append("- Area remanescente narrativa: ")
                    .append(remainingArea.resolvedLabel())
                    .append(" | fonte: ")
                    .append(remainingArea.resolvedSource())
                    .append(" | papel: ")
                    .append(remainingArea.resolvedNarrativeRole())
                    .append(" | pontos: ")
                    .append(remainingArea.pointCount())
                    .append("\n");
            promptBuilder.append("- Sequencia da area remanescente: ")
                    .append(remainingArea.vertices().stream()
                            .map(MemorialProcessingContext.BaseAreaPoint::label)
                            .filter(Objects::nonNull)
                            .collect(Collectors.joining(" -> ")))
                    .append("\n");
        }
        promptBuilder.append("Use esse contorno apenas como contexto do terreno base/original. ");
        promptBuilder.append("Nao substitua os vertices soberanos de cada lote por esses pontos.\n\n");
    }

    private MemorialProcessingContext extractProcessingContext(String technicalSummaryJson) {
        if (technicalSummaryJson == null || technicalSummaryJson.isBlank()) {
            return new MemorialProcessingContext(null);
        }

        try {
            JsonNode rootNode = OBJECT_MAPPER.readTree(technicalSummaryJson);
            JsonNode processingContextNode = rootNode.path("processingContext");
            JsonNode baseAreaNode = processingContextNode.path("baseArea");
            MemorialProcessingContext.BaseAreaContext baseArea = parseBoundaryContext(
                    baseAreaNode,
                    "AREA_TOTAL",
                    "AREA_TOTAL_P%02d"
            );
            MemorialProcessingContext.OriginalPropertyContext originalProperty = parseOriginalPropertyContext(
                    processingContextNode.path("originalProperty")
            );
            MemorialProcessingContext.RemainingAreaContext remainingArea = parseRemainingAreaContext(
                    processingContextNode.path("remainingArea")
            );

            if (baseArea == null && originalProperty == null && remainingArea == null) {
                return new MemorialProcessingContext(null);
            }

            return new MemorialProcessingContext(baseArea, originalProperty, remainingArea);
        } catch (Exception e) {
            log.debug("Nao foi possivel extrair processingContext do technicalSummaryJson: {}", e.getMessage());
            return new MemorialProcessingContext(null);
        }
    }

    private MemorialProcessingContext.BaseAreaContext parseBoundaryContext(
            JsonNode boundaryNode,
            String defaultLabel,
            String labelPattern) {
        if (boundaryNode == null || boundaryNode.isMissingNode() || boundaryNode.isNull()) {
            return null;
        }

        List<MemorialProcessingContext.BaseAreaPoint> vertices = parseBoundaryVertices(boundaryNode.path("vertices"), labelPattern);
        if (vertices.isEmpty()) {
            return null;
        }

        return new MemorialProcessingContext.BaseAreaContext(
                defaultText(textValue(boundaryNode, "label"), defaultLabel),
                vertices
        );
    }

    private MemorialProcessingContext.OriginalPropertyContext parseOriginalPropertyContext(JsonNode originalPropertyNode) {
        if (originalPropertyNode == null || originalPropertyNode.isMissingNode() || originalPropertyNode.isNull()) {
            return null;
        }

        List<MemorialProcessingContext.BaseAreaPoint> vertices = parseBoundaryVertices(
                originalPropertyNode.path("vertices"),
                "TERRENO_ORIGINAL_P%02d"
        );
        if (vertices.isEmpty()) {
            return null;
        }

        return new MemorialProcessingContext.OriginalPropertyContext(
                defaultText(textValue(originalPropertyNode, "label"), "TERRENO_ORIGINAL"),
                defaultText(textValue(originalPropertyNode, "source"), "BASE_AREA"),
                defaultText(textValue(originalPropertyNode, "narrativeRole"), "TERRENO_ORIGINAL"),
                vertices
        );
    }

    private MemorialProcessingContext.RemainingAreaContext parseRemainingAreaContext(JsonNode remainingAreaNode) {
        if (remainingAreaNode == null || remainingAreaNode.isMissingNode() || remainingAreaNode.isNull()) {
            return null;
        }

        List<MemorialProcessingContext.BaseAreaPoint> vertices = parseBoundaryVertices(
                remainingAreaNode.path("vertices"),
                "AREA_REMANESCENTE_P%02d"
        );
        if (vertices.isEmpty()) {
            return null;
        }

        return new MemorialProcessingContext.RemainingAreaContext(
                defaultText(textValue(remainingAreaNode, "label"), "AREA_REMANESCENTE"),
                defaultText(textValue(remainingAreaNode, "source"), "PROCESSING_CONTEXT"),
                defaultText(textValue(remainingAreaNode, "narrativeRole"), "AREA_REMANESCENTE"),
                vertices
        );
    }

    private List<MemorialProcessingContext.BaseAreaPoint> parseBoundaryVertices(JsonNode verticesNode, String labelPattern) {
        List<MemorialProcessingContext.BaseAreaPoint> vertices = new java.util.ArrayList<>();
        if (!verticesNode.isArray()) {
            return vertices;
        }

        int fallbackOrder = 1;
        for (JsonNode vertexNode : verticesNode) {
            Double x = doubleValue(vertexNode, "x");
            Double y = doubleValue(vertexNode, "y");
            if (x == null || y == null) {
                continue;
            }

            vertices.add(new MemorialProcessingContext.BaseAreaPoint(
                    intValue(vertexNode, "orderNumber", fallbackOrder),
                    defaultText(textValue(vertexNode, "label"), String.format(Locale.US, labelPattern, fallbackOrder)),
                    x,
                    y
            ));
            fallbackOrder++;
        }
        return vertices;
    }

    private String formatBaseAreaPoint(MemorialProcessingContext.BaseAreaPoint point) {
        return String.format(
                Locale.US,
                "%s (X %.2f, Y %.2f)",
                defaultText(point.label(), String.format(Locale.US, "AREA_TOTAL_P%02d", point.orderNumber())),
                point.x(),
                point.y()
        );
    }

    private void appendAppliedTemplateContext(StringBuilder promptBuilder, String templateJson) {
        if (templateJson == null || templateJson.isBlank()) {
            promptBuilder.append("TEMPLATE: nao foi possivel carregar o JSON do template aplicado; siga a norma e o resumo tecnico.\n\n");
            return;
        }

        try {
            JsonNode rootNode = OBJECT_MAPPER.readTree(templateJson);
            String descricao = textValue(rootNode, "descricao");
            String normaReferencia = textValue(rootNode, "norma_referencia");
            String modoTexto = textValue(rootNode, "modo_texto");

            promptBuilder.append("ESTRUTURA OBRIGATORIA DO TEMPLATE APLICADO:\n");
            if (descricao != null) {
                promptBuilder.append("Descricao: ").append(descricao).append("\n");
            }
            if (normaReferencia != null) {
                promptBuilder.append("Norma do template: ").append(normaReferencia).append("\n");
            }
            if (modoTexto != null) {
                promptBuilder.append("Modo de texto: ").append(modoTexto).append("\n");
            }

            JsonNode estruturaNode = rootNode.path("estrutura");
            appendTemplateBlock(promptBuilder, estruturaNode, "cabecalho", "Cabecalho");
            appendTemplateBlock(promptBuilder, estruturaNode, "situacao_antes", "Situacao antes");
            appendTemplateBlock(promptBuilder, estruturaNode, "situacao_depois", "Situacao depois");
            appendTemplateBlock(promptBuilder, estruturaNode, "declaracao_final", "Declaracao final");

            JsonNode placeholdersNode = rootNode.path("placeholders");
            if (placeholdersNode.isObject() && placeholdersNode.size() > 0) {
                promptBuilder.append("PLACEHOLDERS RELEVANTES DO TEMPLATE:\n");
                int counter = 0;
                var fields = placeholdersNode.fields();
                while (fields.hasNext() && counter < 20) {
                    var field = fields.next();
                    String description = field.getValue().asText("").trim();
                    promptBuilder.append("- {{").append(field.getKey()).append("}}");
                    if (!description.isEmpty()) {
                        promptBuilder.append(": ").append(description);
                    }
                    promptBuilder.append("\n");
                    counter++;
                }
            }

            JsonNode observacoesNode = rootNode.path("observacoes");
            if (observacoesNode.isArray() && !observacoesNode.isEmpty()) {
                promptBuilder.append("OBSERVACOES DO TEMPLATE:\n");
                int counter = 0;
                for (JsonNode observationNode : observacoesNode) {
                    String observation = observationNode.asText("").trim();
                    if (observation.isEmpty()) {
                        continue;
                    }
                    promptBuilder.append("- ").append(observation).append("\n");
                    counter++;
                    if (counter >= 10) {
                        break;
                    }
                }
            }

            promptBuilder.append("Ao redigir, mantenha a organizacao e os blocos textuais definidos pelo template aplicado.\n\n");
        } catch (Exception e) {
            log.warn("Nao foi possivel interpretar o JSON do template aplicado para enriquecer o prompt: {}", e.getMessage());
            promptBuilder.append("TEMPLATE: o JSON do template aplicado estava invalido para leitura complementar; siga a norma e o resumo tecnico.\n\n");
        }
    }

    private void appendTemplateBlock(StringBuilder promptBuilder, JsonNode estruturaNode, String fieldName, String label) {
        if (estruturaNode == null || !estruturaNode.isObject()) {
            return;
        }

        String blockText = textValue(estruturaNode, fieldName);
        if (blockText == null) {
            return;
        }

        promptBuilder.append(label).append(": ").append(blockText).append("\n");
    }

    private String textValue(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        JsonNode fieldNode = node.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull()) {
            return null;
        }

        String value = fieldNode.asText("").trim();
        return value.isEmpty() ? null : value;
    }

    private String defaultText(String value, String fallbackValue) {
        return value == null || value.isBlank() ? fallbackValue : value.trim();
    }

    private Integer intValue(JsonNode node, String fieldName, int fallbackValue) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return fallbackValue;
        }

        JsonNode fieldNode = node.path(fieldName);
        if (fieldNode.isInt() || fieldNode.isLong()) {
            return fieldNode.asInt();
        }
        if (fieldNode.isTextual()) {
            try {
                return Integer.parseInt(fieldNode.asText().trim());
            } catch (NumberFormatException ignored) {
                return fallbackValue;
            }
        }
        return fallbackValue;
    }

    private Double doubleValue(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        JsonNode fieldNode = node.path(fieldName);
        if (fieldNode.isNumber()) {
            return fieldNode.asDouble();
        }
        if (fieldNode.isTextual()) {
            try {
                return Double.parseDouble(fieldNode.asText().trim().replace(",", "."));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    public ChunkPromptPayload buildChunkPrompt(
            int startLot,
            int endLot,
            PropertyDTO property,
            List<SimplePoint> extractedPoints,
            Map<String, CoordinateExtractionService.RealCoordinate> realCoordinates,
            List<String> streetNames,
            Map<String, List<String>> confrontations,
            Map<String, Double> individualAreas,
            DxfGeoReferenciaExtractorService.CoordenadaGeo coordenadaBase,
            List<String> selectedLayers,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            List<LotTechnicalSummary> expectedChunkSummaries,
            int requestedLotCount,
            String memorialBaseJson) {

        StringBuilder chunkPrompt = new StringBuilder();
        int estimatedLots = requestedLotCount;
        Double areaReferencia = resolveReferenceArea(property, individualAreas, estimatedLots);
        Double perimetroReferencia = resolveReferencePerimeter(property, estimatedLots);
        String location = resolveLotStreetReference(streetNames);
        String bairro = property != null && property.getNeighborhood() != null ? property.getNeighborhood() : "nao informado no cadastro";
        String cidade = property != null && property.getCity() != null ? property.getCity() : "nao informada";
        String estado = property != null && property.getState() != null ? property.getState() : "UF nao informada";
        String northBoundaryReference = resolveDrawingBoundaryReference(confrontations, "NORTE");
        String southBoundaryReference = resolveDrawingBoundaryReference(confrontations, "SUL");
        String eastBoundaryReference = resolveDrawingBoundaryReference(confrontations, "LESTE");
        String westBoundaryReference = resolveDrawingBoundaryReference(confrontations, "OESTE");
        boolean strictManualSegmentMode = manualFrontageAnalysisService.hasManualSegmentSelections(selectedConfrontationTexts);

        chunkPrompt.append("=== FORMATO OBRIGATORIO PARA CADA LOTE ===\n");
        chunkPrompt.append("Para cada lote, responda APENAS no formato abaixo, sem qualquer secao adicional:\n");
        chunkPrompt.append("LOTE X:\n");
        chunkPrompt.append("Um imóvel urbano integrante da área/loteamento em ").append(cidade).append("/").append(estado)
                .append(", possuindo formato poligonal ");
        chunkPrompt.append("conforme seus pontos e coordenadas efetivamente identificados no levantamento, perfazendo assim, ");
        chunkPrompt.append("um perímetro de [valor real]m e uma área territorial de [valor real]m², com as seguintes medidas e confrontações:\n");
        chunkPrompt.append("AO NORTE: ...\n");
        chunkPrompt.append("AO SUL: ...\n");
        chunkPrompt.append("AO LESTE: ...\n");
        chunkPrompt.append("AO OESTE: ...\n");
        chunkPrompt.append("NAO use o endereco cadastral da propriedade/empresa dentro da descricao do lote; esse dado pertence ao cabecalho do memorial.\n");
        chunkPrompt.append("Se precisar citar vias no lote, use apenas as vias efetivamente identificadas no desenho/DXF.\n");
        chunkPrompt.append("NUNCA use nome de proprietario, empresa, pessoa fisica ou expressao 'propriedade de Fulano' como confrontante do lote.\n");
        chunkPrompt.append("NUNCA gere PREAMBULO, IDENTIFICACAO DO TERRENO, SITUACAO ANTES, SITUACAO DEPOIS, DECLARACAO FINAL ou MEMORIAL DESCRITIVO completo dentro do chunk.\n");
        chunkPrompt.append("NUNCA use placeholders com colchetes, como [BAIRRO], [MATRICULA], [ZONA] ou similares.\n");
        chunkPrompt.append("NUNCA escreva 0,0000 m2, 0,0000 m ou 'nao aplicavel' para terreno original, porque este chunk descreve apenas lotes.\n");
        chunkPrompt.append("NUNCA repita LOTE 01 para todos os casos. Use a numeracao real de ").append(startLot).append(" a ").append(endLot).append(".\n");
        chunkPrompt.append("Se algum dado nao existir no cadastro ou no DXF, escreva de forma direta 'nao informado no cadastro' ou 'nao identificado no DXF', sem usar colchetes.\n");
        chunkPrompt.append("NUNCA USE '*', '**', '#' OU '- ' NO INICIO DAS FRASES. ESCREVA EXATAMENTE NESTE FORMATO LIMPO.\n");
        chunkPrompt.append("----------------------------------------------------------------------\n\n");

        chunkPrompt.append("Gere descricao completa dos LOTES ").append(startLot).append(" a ").append(endLot).append(".\n");
        chunkPrompt.append("Mantenha os lotes em ordem crescente e respeite a sequencia grafica dos pontos/estacas informada para cada poligono.\n");
        chunkPrompt.append("Nao intercale vertices, medidas ou confrontacoes de lotes diferentes.\n");
        chunkPrompt.append("NAO replique lote padrao de 130m2, 5,20m x 25,00m ou perimetro 60,40m sem base tecnica.\n");
        if (areaReferencia != null) {
            chunkPrompt.append("Area media de referencia apurada: ")
                    .append(String.format(Locale.US, "%.2f", areaReferencia))
                    .append(" m2.\n");
        }
        if (perimetroReferencia != null) {
            chunkPrompt.append("Perimetro medio de referencia apurado: ")
                    .append(String.format(Locale.US, "%.2f", perimetroReferencia))
                    .append(" m.\n");
        }
        chunkPrompt.append("Quando um valor nao puder ser determinado com seguranca, registre 'nao identificado no DXF' em vez de inventar numeros.\n");
        chunkPrompt.append("Se um lado do lote nao estiver voltado para via publica e nao houver confrontante externo nominal confiavel no desenho, use a expressao 'divisa interna do loteamento'.\n");
        chunkPrompt.append("Nao use a expressao 'a confirmar em conferencia tecnica' como substituto generico para todas as confrontacoes.\n\n");
        if (!streetNames.isEmpty()) {
            chunkPrompt.append("Quando houver vias identificadas no desenho, priorize essas vias nas confrontacoes do lote antes de usar 'confrontante nao identificado no DXF'.\n");
            chunkPrompt.append("So use fallback generico quando nenhuma via ou confrontante puder ser inferido com seguranca.\n\n");
        }
        if (strictManualSegmentMode) {
            chunkPrompt.append("MODO ESTRITO DE CONFRONTACAO MANUAL ATIVO:\n");
            chunkPrompt.append("- Considere via publica apenas nos lados com evidencia geometrica manual confirmada no frontend (trecho roxo/segmento ou continuidade de esquina registrada no resumo tecnico).\n");
            chunkPrompt.append("- Nao propague o nome de uma rua para fundos ou laterais apenas porque essa rua aparece em outro terreno ou no desenho global.\n");
            chunkPrompt.append("- Quando um lado nao tiver toque manual confiavel com via, preserve exatamente o resumo tecnico, inclusive se o lado estiver como 'divisa interna do loteamento' ou 'nao identificado no DXF'.\n\n");
        }
        chunkPrompt.append("A IA atua apenas como redatora neste fluxo.\n");
        chunkPrompt.append("Use exclusivamente o resumo tecnico validado abaixo, sem recalcular, sem redistribuir medidas e sem inferir confrontacoes adicionais.\n\n");
        chunkPrompt.append("REFERENCIAS PREFERENCIAIS DE CONFRONTACAO EXTRAIDAS DO DESENHO:\n");
        chunkPrompt.append("- Norte: ").append(northBoundaryReference).append("\n");
        chunkPrompt.append("- Sul: ").append(southBoundaryReference).append("\n");
        chunkPrompt.append("- Leste: ").append(eastBoundaryReference).append("\n");
        chunkPrompt.append("- Oeste: ").append(westBoundaryReference).append("\n");
        chunkPrompt.append("Se uma dessas referencias estiver identificada no desenho, prefira usa-la no respectivo lado do lote.\n");
        chunkPrompt.append("MODELO PREFERENCIAL DE CONFRONTACOES PARA ESTE CONJUNTO:\n");
        chunkPrompt.append("AO NORTE: usar preferencialmente ").append(northBoundaryReference).append(".\n");
        chunkPrompt.append("AO SUL: usar preferencialmente ").append(southBoundaryReference).append(".\n");
        chunkPrompt.append("AO LESTE: usar preferencialmente ").append(eastBoundaryReference).append(".\n");
        chunkPrompt.append("AO OESTE: usar preferencialmente ").append(westBoundaryReference).append(".\n");
        chunkPrompt.append("Se Norte/Sul/Leste ja estiverem identificados com vias do desenho, NAO troque o lado Oeste por proprietario nominal ou fallback generico se houver referencia para Oeste acima.\n");
        chunkPrompt.append("Quando nao houver referencia externa segura para um lado interno, escreva 'divisa interna do loteamento' em vez de 'confrontante nao identificado no DXF'.\n\n");
        if (strictManualSegmentMode) {
            chunkPrompt.append("As referencias globais do desenho acima servem apenas como contexto geral e NAO autorizam redistribuir ruas para lados sem trecho manual confirmado.\n\n");
        }

        if (selectedLayers != null && !selectedLayers.isEmpty()) {
            chunkPrompt.append("LAYERS/POLIGONOS SELECIONADOS:\n");
            chunkPrompt.append("- ").append(String.join(", ", selectedLayers)).append("\n\n");
        }
        List<LotTechnicalSummary> effectiveExpectedChunkSummaries = expectedChunkSummaries != null
                ? expectedChunkSummaries
                : List.of();
        appendSelectedConfrontationTextsPrompt(chunkPrompt, selectedConfrontationTexts);
        appendManualConfrontationPromptContext(
                chunkPrompt,
                selectedConfrontationTexts,
                !effectiveExpectedChunkSummaries.isEmpty()
        );
        String technicalSummaryContext = buildLotTechnicalSummaryContext(effectiveExpectedChunkSummaries);
        if (!technicalSummaryContext.isBlank()) {
            chunkPrompt.append("RESUMO TECNICO VALIDADO DOS LOTES:\n");
            chunkPrompt.append(technicalSummaryContext).append("\n");
            chunkPrompt.append("Redija o memorial preservando exatamente essa sequencia de vertices, arestas, medidas e confrontacoes.\n\n");
        }
        if (memorialBaseJson != null && !memorialBaseJson.isBlank()) {
            chunkPrompt.append("MEMORIAL_BASE_JSON VALIDADO PELO BACKEND:\n");
            chunkPrompt.append(memorialBaseJson).append("\n");
            chunkPrompt.append("Esse JSON e a fonte da verdade do backend. Se houver conflito entre narrativa livre e JSON, siga o JSON.\n");
            chunkPrompt.append("Use esse JSON para preservar area, perimetro, vertices, segmentos, lados e confrontacoes.\n\n");
        }

        String selectedLotContext = buildSelectedLotContextFromSummaries(effectiveExpectedChunkSummaries);
        if (!selectedLotContext.isBlank()) {
            chunkPrompt.append("POLIGONOS EFETIVAMENTE ENVIADOS PARA ESTE MEMORIAL:\n");
            chunkPrompt.append(selectedLotContext).append("\n");
            chunkPrompt.append("Use os poligonos acima para distinguir os lotes. Nao repita LOTE 01 sem base geometrica.\n");
            chunkPrompt.append("A ordem apresentada nos poligonos ja esta em sequencia crescente e deve ser preservada na resposta final.\n\n");
        }

        chunkPrompt.append("DADOS DO LOCAL:\n");
        chunkPrompt.append("Endereco cadastral da propriedade (usar apenas no cabecalho, nao no lote): ");
        if (property != null && property.getStreet() != null) {
            chunkPrompt.append(property.getStreet());
            if (property.getNumber() != null) {
                chunkPrompt.append(", ").append(property.getNumber());
            }
        } else {
            chunkPrompt.append("nao informado no cadastro");
        }
        chunkPrompt.append("\n");
        chunkPrompt.append("Vias identificadas no desenho para uso nos lotes/confrontacoes: ").append(location).append("\n");
        chunkPrompt.append("Bairro: ").append(bairro).append("\n");
        chunkPrompt.append("Cidade/Estado: ").append(cidade).append("/").append(estado).append("\n\n");

        if (!streetNames.isEmpty()) {
            chunkPrompt.append("Ruas do entorno: ")
                    .append(String.join(", ", streetNames.subList(0, Math.min(3, streetNames.size()))))
                    .append("\n\n");
        }

        if (coordenadaBase != null) {
            chunkPrompt.append("REFERENCIA GEOESPACIAL IDENTIFICADA:\n");
            chunkPrompt.append(String.format(Locale.US, "- Ponto base SIRGAS 2000: E %.2fm N %.2fm (%s)\n",
                    coordenadaBase.getE(), coordenadaBase.getN(), coordenadaBase.getFonte()));
            chunkPrompt.append("Use esta referencia apenas como apoio tecnico. Nao crie vertices artificiais para cada lote.\n\n");
        } else if (!realCoordinates.isEmpty()) {
            chunkPrompt.append("COORDENADAS EXTRAIDAS DO DXF:\n");
            realCoordinates.entrySet().stream().limit(8).forEach(entry ->
                    chunkPrompt.append(String.format(Locale.US, "- %s: E %.2fm N %.2fm (%s)\n",
                            entry.getKey(), entry.getValue().getE(), entry.getValue().getN(), entry.getValue().getSource()))
            );
            chunkPrompt.append("\nUse apenas coordenadas efetivamente extraidas do levantamento.\n\n");
        } else if (!extractedPoints.isEmpty()) {
            chunkPrompt.append("AMOSTRA DE PONTOS EXTRAIDOS DO LEVANTAMENTO:\n");
            extractedPoints.stream().limit(8).forEach(point ->
                    chunkPrompt.append(String.format(Locale.US, "- %s: X %.2f Y %.2f\n", point.id(), point.x(), point.y()))
            );
            chunkPrompt.append("Se nao houver coordenadas georreferenciadas suficientes por lote, informe a limitacao de forma tecnica.\n\n");
        } else {
            log.error("Coordenadas SIRGAS nao encontradas para chunk {}-{}", startLot, endLot);
            chunkPrompt.append("COORDENADAS: nao foi possivel identificar referencia georreferenciada confiavel no DXF enviado.\n");
            chunkPrompt.append("Nao invente coordenadas. Registre a necessidade de conferencia topografica complementar quando necessario.\n\n");
        }

        chunkPrompt.append("CONFRONTANTES DE REFERENCIA:\n");
        chunkPrompt.append("- Norte: ").append(resolveBoundary(property, confrontations, "NORTE")).append("\n");
        chunkPrompt.append("- Sul: ").append(resolveBoundary(property, confrontations, "SUL")).append("\n");
        chunkPrompt.append("- Leste: ").append(resolveBoundary(property, confrontations, "LESTE")).append("\n");
        chunkPrompt.append("- Oeste: ").append(resolveBoundary(property, confrontations, "OESTE")).append("\n\n");

        return new ChunkPromptPayload(chunkPrompt.toString(), effectiveExpectedChunkSummaries);
    }

    private String buildLotTechnicalSummaryContext(List<LotTechnicalSummary> summaries) {
        if (summaries == null || summaries.isEmpty()) {
            return "";
        }

        return summaries.stream()
                .filter(Objects::nonNull)
                .map(this::formatLotTechnicalSummary)
                .collect(Collectors.joining("\n\n"));
    }

    private String buildSelectedLotContextFromSummaries(List<LotTechnicalSummary> summaries) {
        if (summaries == null || summaries.isEmpty()) {
            return "";
        }

        return summaries.stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingInt(LotTechnicalSummary::lotNumber))
                .map(summary -> {
                    String vertexSequence = summary.vertexSequence() == null || summary.vertexSequence().isEmpty()
                            ? "sequencia de vertices nao informada"
                            : summary.vertexSequence().stream()
                                    .map(VertexTechnicalPoint::label)
                                    .collect(Collectors.joining(" -> "));
                    return "LOTE " + String.format(Locale.US, "%02d", summary.lotNumber())
                            + ": vertices em ordem " + vertexSequence;
                })
                .collect(Collectors.joining("\n"));
    }

    private String formatLotTechnicalSummary(LotTechnicalSummary summary) {
        StringBuilder builder = new StringBuilder();
        builder.append("LOTE ")
                .append(String.format(Locale.US, "%02d", summary.lotNumber()))
                .append(" | area validada: ")
                .append(summary.area() != null ? String.format(Locale.US, "%.2f m2", summary.area()) : "nao identificada")
                .append(" | perimetro validado: ")
                .append(summary.perimeter() != null ? String.format(Locale.US, "%.2f m", summary.perimeter()) : "nao identificado")
                .append(" | esquina: ")
                .append(summary.isCornerLot() ? "sim" : "nao")
                .append(" | dupla frente: ")
                .append(summary.hasDualFrontage() ? "sim" : "nao")
                .append(" | vertices georreferenciados: ")
                .append(summary.hasGeoreferencedVertices() ? "sim" : "nao")
                .append("\n");

        builder.append("PONTOS/ESTACAS EM ORDEM: ")
                .append(summary.vertexSequence().stream()
                        .map(VertexTechnicalPoint::label)
                        .collect(Collectors.joining(" -> ")))
                .append("\n");

        builder.append(summary.hasGeoreferencedVertices()
                        ? "VERTICES VALIDADOS EM COORDENADAS REAIS:\n"
                        : "VERTICES VALIDADOS NO SISTEMA LOCAL DO DXF:\n");
        for (VertexTechnicalPoint vertex : summary.vertexSequence()) {
            builder.append("- ")
                    .append(vertex.label())
                    .append(" | ")
                    .append(summary.hasGeoreferencedVertices() ? "E" : "X")
                    .append(": ")
                    .append(String.format(Locale.US, "%.3f", vertex.x()))
                    .append(" | ")
                    .append(summary.hasGeoreferencedVertices() ? "N" : "Y")
                    .append(": ")
                    .append(String.format(Locale.US, "%.3f", vertex.y()))
                    .append("\n");
        }

        if (!summary.streetFrontages().isEmpty()) {
            builder.append("FRENTES VIARIAS VALIDADAS: ")
                    .append(String.join(", ", summary.streetFrontages()))
                    .append("\n");
        }

        builder.append("ARESTAS VALIDADAS:\n");
        for (TechnicalSideSummary side : summary.sideSummaries()) {
            builder.append("- Aresta ")
                    .append(String.format(Locale.US, "%02d", side.sideIndex()))
                    .append(": ")
                    .append(side.startLabel())
                    .append(" -> ")
                    .append(side.endLabel())
                    .append(" | comprimento: ")
                    .append(String.format(Locale.US, "%.2f m", side.length()))
                    .append(" | direcao predominante: ")
                    .append(side.direction())
                    .append(" | rumo: ")
                    .append(side.technicalBearing())
                    .append(" | confrontacao validada: ")
                    .append(deterministicMemorialService.formatSummarySideReference(side.reference(), summary.lotNumber()))
                    .append(" | origem: ")
                    .append(side.referenceSource());
            if (side.reason() != null && !side.reason().isBlank()) {
                builder.append(" | motivo: ").append(side.reason());
            }
            builder.append("\n");
        }

        return builder.toString().trim();
    }

    private void appendSelectedConfrontationTextsPrompt(
            StringBuilder promptBuilder,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts) {
        if (selectedConfrontationTexts == null || selectedConfrontationTexts.isEmpty()) {
            return;
        }

        promptBuilder.append("TEXTOS DE CONFRONTACAO SELECIONADOS MANUALMENTE NO FRONTEND:\n");
        for (SelectedConfrontationTextDTO selectedText : selectedConfrontationTexts) {
            if (selectedText == null) {
                continue;
            }

            String direction = manualFrontageAnalysisService.normalizeDirection(selectedText.inferredDirection());
            promptBuilder.append("- ");
            if (direction != null) {
                promptBuilder.append(direction).append(": ");
            }
            if (manualFrontageAnalysisService.isDirectNoConfrontationSelection(selectedText)) {
                promptBuilder.append("segmento manual sem confrontante definido");
            } else {
                if (selectedText.text() == null || selectedText.text().isBlank()) {
                    continue;
                }
                promptBuilder.append(selectedText.text().trim());
            }
            if (selectedText.layer() != null && !selectedText.layer().isBlank()) {
                promptBuilder.append(" [layer=").append(selectedText.layer().trim()).append("]");
            }
            if (("segment".equalsIgnoreCase(selectedText.selectionMode())
                    || "segment-direct".equalsIgnoreCase(selectedText.selectionMode()))
                    && selectedText.segmentStartX() != null && selectedText.segmentStartY() != null
                    && selectedText.segmentEndX() != null && selectedText.segmentEndY() != null) {
                promptBuilder.append(String.format(Locale.US,
                        " [trecho=(%.2f, %.2f)->(%.2f, %.2f)]",
                        selectedText.segmentStartX(),
                        selectedText.segmentStartY(),
                        selectedText.segmentEndX(),
                        selectedText.segmentEndY()));
            }
            promptBuilder.append("\n");
        }
        promptBuilder.append("Quando esses textos manuais estiverem presentes, eles devem ter prioridade sobre heuristicas genericas do desenho.\n");
        promptBuilder.append("Se o item manual vier com trecho geometrico selecionado, trate essa via como confrontacao preferencial dos lotes que tocam esse segmento.\n\n");
    }

    private void appendManualConfrontationPromptContext(
            StringBuilder promptBuilder,
            List<SelectedConfrontationTextDTO> selectedConfrontationTexts,
            boolean resolvedByTechnicalSummary) {
        if (selectedConfrontationTexts == null || selectedConfrontationTexts.isEmpty()) {
            return;
        }

        if (resolvedByTechnicalSummary) {
            promptBuilder.append("As selecoes manuais de confrontacao acima ja foram consolidadas no resumo tecnico validado do backend.\n");
            promptBuilder.append("Use o resumo tecnico como fonte soberana e nao reinterpretar os trechos manuais brutos fora dele.\n\n");
            return;
        }
    }

    private String resolveLotStreetReference(List<String> streetNames) {
        if (streetNames == null || streetNames.isEmpty()) {
            return "nao identificado no DXF";
        }

        LinkedHashSet<String> uniqueStreetNames = new LinkedHashSet<>();
        for (String streetName : streetNames) {
            if (streetName == null) {
                continue;
            }
            String normalized = streetName.trim();
            if (!normalized.isBlank()) {
                uniqueStreetNames.add(normalized);
            }
            if (uniqueStreetNames.size() >= 3) {
                break;
            }
        }

        if (uniqueStreetNames.isEmpty()) {
            return "nao identificado no DXF";
        }

        return String.join(", ", uniqueStreetNames);
    }

    private String resolveDrawingBoundaryReference(Map<String, List<String>> confrontations, String direction) {
        if (confrontations == null || direction == null) {
            return "nao identificado no DXF";
        }

        List<String> extracted = confrontations.get(direction);
        if (extracted == null || extracted.isEmpty()) {
            return "nao identificado no DXF";
        }

        for (String candidate : extracted) {
            String sanitized = deterministicMemorialService.sanitizeConfrontationReference(candidate);
            if (sanitized != null && !sanitized.isBlank()) {
                return sanitized;
            }
        }

        return "nao identificado no DXF";
    }

    private Double resolveReferenceArea(PropertyDTO property, Map<String, Double> individualAreas, int estimatedLots) {
        if (individualAreas != null && !individualAreas.isEmpty()) {
            return individualAreas.values().stream()
                    .filter(Objects::nonNull)
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .orElse(0.0);
        }
        if (property != null && property.getTotalArea() != null && estimatedLots > 0) {
            return property.getTotalArea().doubleValue() / estimatedLots;
        }
        return null;
    }

    private Double resolveReferencePerimeter(PropertyDTO property, int estimatedLots) {
        if (property == null) {
            return null;
        }
        if (property.getMainFrontage() != null && property.getAverageDepth() != null) {
            return (property.getMainFrontage().doubleValue() * 2) + (property.getAverageDepth().doubleValue() * 2);
        }
        if (property.getTotalPerimeter() != null && estimatedLots == 1) {
            return property.getTotalPerimeter().doubleValue();
        }
        return null;
    }

    private String resolveBoundary(PropertyDTO property, Map<String, List<String>> confrontations, String direction) {
        String propertyBoundary = null;
        if (property != null) {
            switch (direction) {
                case "NORTE":
                    propertyBoundary = property.getNorthBoundary();
                    break;
                case "SUL":
                    propertyBoundary = property.getSouthBoundary();
                    break;
                case "LESTE":
                    propertyBoundary = property.getEastBoundary();
                    break;
                case "OESTE":
                    propertyBoundary = property.getWestBoundary();
                    break;
                default:
                    break;
            }
        }
        if (propertyBoundary != null && !propertyBoundary.isBlank()) {
            return propertyBoundary;
        }
        if (confrontations != null) {
            List<String> extracted = confrontations.get(direction);
            if (extracted != null && !extracted.isEmpty()) {
                return extracted.get(0);
            }
        }
        return "confrontante a confirmar em conferencia tecnica";
    }

    public record ChunkPromptPayload(
            String prompt,
            List<LotTechnicalSummary> expectedSummaries
    ) {}
}
