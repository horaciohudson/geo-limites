package com.momorialPro.CadMemorial.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class MemorialAlignmentService {
    private static final String LOT_HEADER_REGEX =
            "^\\s*LOTE\\s*(?:N[ºO]\\s*)?0*(\\d+)\\b(?:\\s*[:\\-–—]\\s*|\\s*$)";
    private static final Pattern LOT_BLOCK_PATTERN = Pattern.compile(
            "(?ims)" + LOT_HEADER_REGEX + ".*?(?=" + LOT_HEADER_REGEX + "|\\z)"
    );
    private static final Pattern DIRECTION_LINE_PATTERN = Pattern.compile("(?im)^\\s*AO\\s+(NORTE|SUL|LESTE|OESTE):\\s*(.+)$");

    public void logMemorialAlignment(
            String scope,
            String content,
            List<LotTechnicalSummary> expectedSummaries,
            MemorialAlignmentCheck alignmentCheck) {
        if (expectedSummaries == null || expectedSummaries.isEmpty()) {
            log.debug("Sem resumos tecnicos para validar o retorno da IA no escopo {}", scope);
            return;
        }

        if (content == null || content.isBlank()) {
            log.warn("Resposta vazia da IA no escopo {} para {} lotes esperados", scope, expectedSummaries.size());
            return;
        }

        for (String issue : alignmentCheck.blockingIssues()) {
            log.warn("Escopo {} - bloqueio de alinhamento: {}", scope, issue);
        }
        for (String warning : alignmentCheck.warnings()) {
            log.info("Escopo {} - observacao de alinhamento: {}", scope, warning);
        }
    }

    public MemorialAlignmentCheck validateMemorialAlignment(
            String scope,
            String content,
            List<LotTechnicalSummary> expectedSummaries,
            BiFunction<LotTechnicalSummary, String, String> expectedReferenceResolver) {
        if (expectedSummaries == null || expectedSummaries.isEmpty()) {
            return new MemorialAlignmentCheck(true, List.of(), List.of());
        }

        List<String> blockingIssues = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        if (content == null || content.isBlank()) {
            blockingIssues.add("resposta vazia da IA para o escopo " + scope);
            return new MemorialAlignmentCheck(false, blockingIssues, warnings);
        }

        Map<Integer, String> actualBlocks = extractLotBlocks(content).stream()
                .collect(Collectors.toMap(
                        LotBlock::lotNumber,
                        LotBlock::content,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        Set<Integer> expectedLotNumbers = expectedSummaries.stream()
                .map(LotTechnicalSummary::lotNumber)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        for (Integer returnedLot : actualBlocks.keySet()) {
            if (!expectedLotNumbers.contains(returnedLot)) {
                blockingIssues.add("retornou lote fora da faixa esperada: lote " + returnedLot);
            }
        }

        for (LotTechnicalSummary summary : expectedSummaries) {
            String block = actualBlocks.get(summary.lotNumber());
            if (block == null || block.isBlank()) {
                blockingIssues.add("nao retornou o lote " + summary.lotNumber() + " esperado pelo backend");
                continue;
            }

            String blockUpper = block.toUpperCase(Locale.ROOT);
            long confrontationLineCount = countMatches(block, "(?im)^AO\\s+(?:NORTE|SUL|LESTE|OESTE):");
            if (confrontationLineCount == 0) {
                blockingIssues.add("lote " + summary.lotNumber() + " sem linhas AO NORTE/SUL/LESTE/OESTE");
            } else {
                warnings.add("lote " + summary.lotNumber()
                        + " validado com "
                        + confrontationLineCount
                        + " linhas de confrontacao para "
                        + summary.sideSummaries().size()
                        + " arestas esperadas");
            }

            Map<String, String> actualConfrontations = extractConfrontationLinesByDirection(block);
            for (String direction : List.of("NORTE", "SUL", "LESTE", "OESTE")) {
                String expectedReference = expectedReferenceResolver.apply(summary, direction);
                String actualReference = actualConfrontations.get(direction);
                if (actualReference == null) {
                    blockingIssues.add("lote " + summary.lotNumber() + " sem confrontacao consolidada para " + direction);
                    continue;
                }

                if (!normalizeValidationText(actualReference).contains(normalizeValidationText(expectedReference))) {
                    blockingIssues.add("lote " + summary.lotNumber()
                            + " com confrontacao divergente em "
                            + direction
                            + " esperado='"
                            + expectedReference
                            + "' atual='"
                            + actualReference
                            + "'");
                }
            }

            List<String> expectedStreetRefs = summary.streetFrontages().stream()
                    .filter(java.util.Objects::nonNull)
                    .map(String::trim)
                    .filter(reference -> !reference.isBlank())
                    .distinct()
                    .collect(Collectors.toList());
            if (!expectedStreetRefs.isEmpty()) {
                long matchedStreetRefs = expectedStreetRefs.stream()
                        .filter(reference -> blockUpper.contains(reference.toUpperCase(Locale.ROOT)))
                        .count();
                if (matchedStreetRefs == 0) {
                    blockingIssues.add("lote " + summary.lotNumber()
                            + " nao mencionou nenhuma frente viaria esperada " + expectedStreetRefs);
                } else {
                    warnings.add("lote " + summary.lotNumber()
                            + " confirmou "
                            + matchedStreetRefs
                            + " de "
                            + expectedStreetRefs.size()
                            + " frentes viarias esperadas");
                }
            }

            List<String> orderedLabels = summary.vertexSequence().stream()
                    .map(VertexTechnicalPoint::label)
                    .filter(java.util.Objects::nonNull)
                    .filter(label -> !label.isBlank())
                    .filter(label -> !label.startsWith("V"))
                    .distinct()
                    .collect(Collectors.toList());
            if (!orderedLabels.isEmpty()) {
                long matchedLabels = orderedLabels.stream()
                        .filter(label -> blockUpper.contains(label.toUpperCase(Locale.ROOT)))
                        .count();
                if (matchedLabels == 0) {
                    warnings.add("lote " + summary.lotNumber()
                            + " nao citou pontos/estacas esperados " + orderedLabels);
                }
            }
        }

        return new MemorialAlignmentCheck(blockingIssues.isEmpty(), blockingIssues, warnings);
    }

    public boolean validateCompleteness(String memorial, List<LotTechnicalSummary> expectedSummaries) {
        if (memorial == null || memorial.trim().isEmpty()) {
            log.warn("❌ Memorial vazio ou nulo");
            return false;
        }

        Set<Integer> expectedLots = expectedSummaries == null
                ? Set.of()
                : expectedSummaries.stream()
                .map(LotTechnicalSummary::lotNumber)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Set<Integer> foundLots = extractLotBlocks(memorial).stream()
                .map(LotBlock::lotNumber)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        boolean hasPlaceholders = memorial.contains("[REPETIR")
                || memorial.contains("[CONTINUAR")
                || memorial.contains("[Repita o padrão")
                || memorial.contains("...")
                || memorial.contains("demais lotes")
                || memorial.contains("seguir o mesmo padrão")
                || memorial.contains("e assim por diante")
                || memorial.contains("etc.");

        if (expectedLots.isEmpty()) {
            return !hasPlaceholders;
        }

        Set<Integer> missingLots = new LinkedHashSet<>(expectedLots);
        missingLots.removeAll(foundLots);

        Set<Integer> extraLots = new LinkedHashSet<>(foundLots);
        extraLots.removeAll(expectedLots);

        boolean isComplete = missingLots.isEmpty() && extraLots.isEmpty() && !hasPlaceholders;

        if (!isComplete) {
            log.warn("❌ Memorial INCOMPLETO:");
            if (!missingLots.isEmpty()) {
                log.warn("   - Lotes faltantes no escopo ativo: {}", missingLots);
            }
            if (!extraLots.isEmpty()) {
                log.warn("   - Lotes extras fora do escopo ativo: {}", extraLots);
            }
            log.warn("   - Sem placeholders: {}", !hasPlaceholders);
        }

        return isComplete;
    }

    public boolean containsLotNumber(String memorial, int lotNumber) {
        String pattern = "(?i)\\bLOTE\\s*(?:N[ºO]\\s*)?0*" + lotNumber + "\\b";
        return Pattern.compile(pattern).matcher(memorial).find();
    }

    public List<LotBlock> extractLotBlocks(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }

        Matcher matcher = LOT_BLOCK_PATTERN.matcher(content);
        List<LotBlock> blocks = new ArrayList<>();
        while (matcher.find()) {
            blocks.add(new LotBlock(
                    Integer.parseInt(matcher.group(1)),
                    normalizeLotBlockHeader(matcher.group()),
                    matcher.start(),
                    matcher.end()
            ));
        }
        return blocks;
    }

    private long countMatches(String content, String regex) {
        if (content == null || content.isBlank()) {
            return 0L;
        }

        long count = 0L;
        Matcher matcher = Pattern.compile(regex).matcher(content);
        while (matcher.find()) {
            count++;
        }
        return count;
    }

    private Map<String, String> extractConfrontationLinesByDirection(String block) {
        Map<String, String> references = new LinkedHashMap<>();
        if (block == null || block.isBlank()) {
            return references;
        }

        Matcher matcher = DIRECTION_LINE_PATTERN.matcher(block);
        while (matcher.find()) {
            references.put(matcher.group(1).toUpperCase(Locale.ROOT), matcher.group(2).trim());
        }
        return references;
    }

    private String normalizeValidationText(String value) {
        if (value == null) {
            return "";
        }
        return value
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9 ]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String normalizeLotBlockHeader(String blockContent) {
        if (blockContent == null || blockContent.isBlank()) {
            return "";
        }

        Matcher matcher = Pattern.compile("(?im)" + LOT_HEADER_REGEX).matcher(blockContent);
        if (!matcher.find()) {
            return blockContent.trim();
        }

        int lotNumber = Integer.parseInt(matcher.group(1));
        return matcher.replaceFirst("LOTE " + lotNumber + ":").trim();
    }
}
