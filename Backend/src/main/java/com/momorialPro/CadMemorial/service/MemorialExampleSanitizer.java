package com.momorialPro.CadMemorial.service;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Component
public class MemorialExampleSanitizer {

    private static final List<Pattern> NOISE_PATTERNS = List.of(
            Pattern.compile("(?im)^\\s*Documento assinado no Assinador Registro de Im[oó]veis.*$"),
            Pattern.compile("(?im)^\\s*Para validar o documento.*$"),
            Pattern.compile("(?im)^\\s*Para verificar as assinaturas.*$"),
            Pattern.compile("(?im)^\\s*https?://assinador\\.registrodeimoveis\\.org\\.br/validate(?:/\\S+)?\\s*$"),
            Pattern.compile("(?im)^\\s*C[oó]digo de valida[cç][aã]o:.*$"),
            Pattern.compile("(?im)^\\s*\\*\\*\\*\\s*O documento pode conter assinaturas.*$"),
            Pattern.compile("(?im)^\\s*MANIFESTO DE\\s*$"),
            Pattern.compile("(?im)^\\s*ASSINATURAS\\s*$"),
            Pattern.compile("(?im)^\\s*Documento assinado no Assinador Registro de Im[oó]veis, pelos seguintes signat[aá]rios:.*$"),
            Pattern.compile("(?im)^\\s*.+\\(CPF\\s*\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\)\\s*$"),
            Pattern.compile("(?im)^\\s*Ou acesse a consulta de documentos assinados.*$"),
            Pattern.compile("(?im)^\\s*o c[oó]digo de valida[cç][aã]o:.*$"),
            Pattern.compile("(?im)^\\s*\\.+\\s*$")
    );
    private static final Pattern PARAGRAPH_START_PATTERN = Pattern.compile(
            "(?i)^(AO\\s+(NORTE|SUL|LESTE|OESTE):.*|LOTE\\s+\\d+:?\\s*|TERRENO\\s+\\d+:?\\s*|SITUAÇÃO\\s+.*|DECLARAÇÃO\\s*.*|MEMORIAL\\s+DESCRITIVO.*)$"
    );
    private static final Pattern STANDALONE_LINE_PATTERN = Pattern.compile(
            "(?i)^(LOTE\\s+\\d+:?\\s*|TERRENO\\s+\\d+:?\\s*|SITUAÇÃO\\s+.*|DECLARAÇÃO\\s*.*|MEMORIAL\\s+DESCRITIVO.*|_+|-{10,}.*)$"
    );

    public String sanitize(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return rawText;
        }

        String sanitized = normalizeLineBreaks(rawText);
        sanitized = sanitized.replaceAll("(?iu)(\\p{L})-\\n(?=\\p{L})", "$1");
        sanitized = sanitized.replaceAll("(?i)\\b(Norte|Sul|Leste|Oeste)\\n(?=(Norte|Sul|Leste|Oeste)\\b)", "$1-");
        List<String> cleanedLines = new ArrayList<>();

        for (String line : sanitized.split("\n")) {
            String cleanedLine = line.stripTrailing();
            if (shouldRemove(cleanedLine)) {
                continue;
            }
            cleanedLines.add(cleanedLine);
        }

        sanitized = String.join("\n", cleanedLines);
        sanitized = normalizeParagraphFlow(sanitized);
        sanitized = sanitized.replaceAll("(?i)\\b(sentido\\s+)(Norte|Sul|Leste|Oeste)\\s+(Norte|Sul|Leste|Oeste)\\b", "$1$2-$3");
        sanitized = sanitized.replaceAll("(?m)[ \\t]+$", "");
        sanitized = sanitized.replaceAll("(?m)^\\s+\n", "\n");
        sanitized = sanitized.replaceAll("\n{3,}", "\n\n");

        return sanitized.trim();
    }

    private boolean shouldRemove(String line) {
        if (line == null || line.isBlank()) {
            return false;
        }

        for (Pattern pattern : NOISE_PATTERNS) {
            if (pattern.matcher(line).matches()) {
                return true;
            }
        }

        return false;
    }

    private String normalizeLineBreaks(String text) {
        return text.replace("\r\n", "\n")
                .replace('\r', '\n')
                .replace('\u00A0', ' ');
    }

    private String normalizeParagraphFlow(String text) {
        List<String> normalizedLines = new ArrayList<>();
        String currentParagraph = null;

        for (String rawLine : text.split("\n")) {
            String line = rawLine.strip();

            if (line.isBlank()) {
                currentParagraph = flushParagraph(normalizedLines, currentParagraph);
                if (!normalizedLines.isEmpty() && !normalizedLines.get(normalizedLines.size() - 1).isBlank()) {
                    normalizedLines.add("");
                }
                continue;
            }

            if (currentParagraph == null) {
                currentParagraph = line;
                continue;
            }

            if (isParagraphStart(line) || isStandaloneLine(currentParagraph)) {
                currentParagraph = flushParagraph(normalizedLines, currentParagraph);
                currentParagraph = line;
                continue;
            }

            currentParagraph = mergeLines(currentParagraph, line);
        }

        flushParagraph(normalizedLines, currentParagraph);
        return String.join("\n", normalizedLines);
    }

    private String flushParagraph(List<String> normalizedLines, String paragraph) {
        if (paragraph != null && !paragraph.isBlank()) {
            normalizedLines.add(paragraph);
        }
        return null;
    }

    private boolean isParagraphStart(String line) {
        return PARAGRAPH_START_PATTERN.matcher(line).matches() || isStandaloneLine(line);
    }

    private boolean isStandaloneLine(String line) {
        return STANDALONE_LINE_PATTERN.matcher(line).matches();
    }

    private String mergeLines(String current, String next) {
        if (current.endsWith("-")) {
            return current + next;
        }

        if (shouldHyphenateClitic(current, next)) {
            return current + "-" + next;
        }

        if (next.matches("^[,.;:)] .*") || next.matches("^[,.;:)]$")) {
            return current + next;
        }

        return current + " " + next;
    }

    private boolean shouldHyphenateClitic(String current, String next) {
        String currentLower = current.toLowerCase(Locale.ROOT);
        String nextLower = next.toLowerCase(Locale.ROOT);

        return nextLower.startsWith("se ")
                && (currentLower.endsWith("ando")
                || currentLower.endsWith("endo")
                || currentLower.endsWith("indo")
                || currentLower.endsWith("ar")
                || currentLower.endsWith("er")
                || currentLower.endsWith("ir"));
    }
}
