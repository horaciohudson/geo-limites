package com.momorialPro.CadMemorial.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemorialLlmSupportService {
    private static final String LOT_HEADER_REGEX =
            "^\\s*LOTE\\s*(?:N[ºO]\\s*)?0*(\\d+)\\b(?:\\s*[:\\-–—]\\s*|\\s*$)";
    private static final Pattern LOT_BLOCK_PATTERN = Pattern.compile(
            "(?ims)" + LOT_HEADER_REGEX + ".*?(?=" + LOT_HEADER_REGEX + "|\\z)"
    );

    private final ClaudePromptCacheService promptCacheService;
    private final ApiSettingsService apiSettingsService;

    @Value("${OPENAI_API_KEY:}")
    private String openaiApiKey;

    @Value("${memorialpro.claude.model}")
    private String claudeModel;

    @Value("${memorialpro.claude.api-key}")
    private String claudeApiKey;

    @Value("${memorialpro.claude.endpoint}")
    private String claudeEndpoint;

    public boolean isOpenAiProvider(String provider) {
        return "OPENAI".equalsIgnoreCase(provider) || "GPT".equalsIgnoreCase(provider);
    }

    public boolean hasValidConfiguredProviderKey(String provider) {
        if (isOpenAiProvider(provider)) {
            return openaiApiKey != null && !openaiApiKey.trim().isEmpty();
        }

        return claudeApiKey != null
                && !claudeApiKey.equals("PLACEHOLDER_KEY")
                && !claudeApiKey.trim().isEmpty();
    }

    public int calculateDynamicMaxTokens(int lotCount) {
        final int claudeHaikuMax = 4096;
        int baseTokens = 1000;
        int tokensPerLot = 120;
        int calculated = baseTokens + (lotCount * tokensPerLot);
        int result = Math.min(calculated, claudeHaikuMax);

        if (calculated > claudeHaikuMax) {
            log.warn("Projeto grande ({} lotes) limitado a {} tokens do Claude Haiku", lotCount, claudeHaikuMax);
            log.warn("Para projetos grandes, considere usar Claude Sonnet que suporta mais tokens");
        }

        return result;
    }

    public String requestClaudeSingleCall(
            String prompt,
            List<Map<String, Object>> systemPrompt,
            int maxTokens) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", claudeModel);
        body.put("max_tokens", maxTokens);
        body.put("temperature", 0.2);
        body.put("system", systemPrompt);
        body.put("messages", new Object[]{Map.of("role", "user", "content", prompt)});

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", claudeApiKey);
        headers.set("anthropic-version", "2023-06-01");
        promptCacheService.addCacheHeaders(headers);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.exchange(
                claudeEndpoint,
                HttpMethod.POST,
                entity,
                Map.class
        );

        return extractContentFromClaudeResponse(response.getBody());
    }

    @SuppressWarnings("unchecked")
    public String requestOpenAiSingleCall(
            String prompt,
            List<Map<String, Object>> systemPrompt) {
        ensureOpenAiConfigured();
        String openAiModel = apiSettingsService.resolveMemorialOpenAiModel();

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openaiApiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", openAiModel);
        if (apiSettingsService.supportsCustomTemperatureForMemorialModel()) {
            body.put("temperature", 0.2);
        }

        log.info("Gerando memorial com OpenAI usando modelo configurado: {}", openAiModel);

        List<Map<String, Object>> messages = new ArrayList<>();
        for (Map<String, Object> sp : systemPrompt) {
            messages.add(Map.of("role", "system", "content", sp.get("text") != null ? sp.get("text") : ""));
        }
        messages.add(Map.of("role", "user", "content", prompt));
        body.put("messages", messages);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.exchange(
                "https://api.openai.com/v1/chat/completions",
                HttpMethod.POST,
                entity,
                Map.class
        );

        Map<String, Object> responseBody = response.getBody();
        List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }

    public String requestClaudeChunk(String chunkPrompt, int startLot, int endLot) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", claudeModel);
        body.put("max_tokens", 3500);
        body.put("temperature", 0.2);
        body.put("messages", new Object[]{Map.of("role", "user", "content", chunkPrompt)});
        body.put("system", buildLotOnlySystemPrompt(startLot, endLot));

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", claudeApiKey);
        headers.set("anthropic-version", "2023-06-01");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.exchange(
                claudeEndpoint,
                HttpMethod.POST,
                entity,
                Map.class
        );

        return extractContentFromClaudeResponse(response.getBody());
    }

    @SuppressWarnings("unchecked")
    public String requestOpenAiChunk(String chunkPrompt, int startLot, int endLot) {
        ensureOpenAiConfigured();
        String openAiModel = apiSettingsService.resolveMemorialOpenAiModel();
        final int tokenLimit = 3500;

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openaiApiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", openAiModel);
        if (apiSettingsService.usesMaxCompletionTokensForMemorialModel()) {
            body.put("max_completion_tokens", tokenLimit);
        } else {
            body.put("max_tokens", tokenLimit);
        }
        if (apiSettingsService.supportsCustomTemperatureForMemorialModel()) {
            body.put("temperature", 0.2);
        }

        log.info("Gerando chunk de memorial com OpenAI usando modelo configurado: {}", openAiModel);

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", buildLotOnlySystemPrompt(startLot, endLot)));
        messages.add(Map.of("role", "user", "content", chunkPrompt));
        body.put("messages", messages);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.exchange(
                "https://api.openai.com/v1/chat/completions",
                HttpMethod.POST,
                entity,
                Map.class
        );

        Map<String, Object> responseBody = response.getBody();
        List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }

    public String sanitizeMemorialText(String content) {
        if (content == null) {
            return null;
        }

        String sanitized = content
                .replace("\r\n", "\n")
                .replace("\\r\\n", "\n")
                .replace("\\n", "\n")
                .replace("```markdown", "")
                .replace("```text", "")
                .replace("```", "")
                .replace("“", "")
                .replace("”", "")
                .replace("\"", "")
                .replaceAll("(?is)<!--.*?-->", "")
                .replaceAll("(?m)^\\s*AVISO: Este memorial esta incompleto\\..*$", "")
                .replaceAll("(?m)^\\s*Foram gerados apenas alguns lotes\\..*$", "")
                .replaceAll("(?m)^\\s*Para memorial completo com .*tente gerar novamente\\..*$", "")
                .replaceAll("\n{3,}", "\n\n")
                .trim();

        if (sanitized.startsWith("'") && sanitized.endsWith("'") && sanitized.length() > 1) {
            sanitized = sanitized.substring(1, sanitized.length() - 1).trim();
        }

        return sanitized;
    }

    public String normalizeChunkOutput(
            String content,
            int startLot,
            int endLot,
            Function<String, String> lotOrderingNormalizer) {
        String sanitized = lotOrderingNormalizer.apply(sanitizeMemorialText(content));
        if (sanitized == null || sanitized.isBlank()) {
            return sanitized;
        }

        sanitized = sanitized
                .replaceAll("(?i)\\[BAIRRO\\]", "nao informado no cadastro")
                .replaceAll("(?i)\\[MATR[IÍ]CULA\\]", "nao informada")
                .replaceAll("(?i)\\[ZONA\\]", "nao informada")
                .replaceAll("(?i)\\[[^\\]]+\\]", "nao informado");

        String extractedLots = extractLotBlocksOnly(sanitized, startLot, endLot);
        if (!extractedLots.isBlank()) {
            sanitized = extractedLots;
        }

        List<String> cleanedLines = new ArrayList<>();
        for (String line : sanitized.split("\\n")) {
            String trimmed = line.trim();
            if (trimmed.isBlank()) {
                if (cleanedLines.isEmpty() || cleanedLines.get(cleanedLines.size() - 1).isBlank()) {
                    continue;
                }
                cleanedLines.add("");
                continue;
            }

            String upper = trimmed.toUpperCase(Locale.ROOT);
            if (upper.startsWith("MEMORIAL DESCRITIVO")
                    || upper.startsWith("1. PREAMBULO")
                    || upper.startsWith("2. IDENTIFICACAO DO TERRENO")
                    || upper.startsWith("3. SITUACAO ANTES")
                    || upper.startsWith("4. SITUACAO DEPOIS")
                    || upper.startsWith("5. DECLARACAO FINAL")
                    || upper.startsWith("PREÂMBULO")
                    || upper.startsWith("IDENTIFICAÇÃO DO TERRENO")
                    || upper.startsWith("DECLARAÇÃO FINAL")
                    || upper.startsWith("ASSINATURA")) {
                continue;
            }

            cleanedLines.add(trimmed);
        }

        return cleanedLines.stream().collect(Collectors.joining("\n")).trim();
    }

    public String buildRetryChunkPrompt(
            String baseChunkPrompt,
            MemorialAlignmentCheck alignmentCheck,
            int startLot,
            int endLot) {
        StringBuilder retryPrompt = new StringBuilder(baseChunkPrompt);
        retryPrompt.append("\nATENCAO: A RESPOSTA ANTERIOR FOI REJEITADA PELO BACKEND.\n");
        retryPrompt.append("Corrija integralmente o memorial dos LOTES ")
                .append(startLot)
                .append(" a ")
                .append(endLot)
                .append(" obedecendo estritamente o resumo tecnico.\n");
        retryPrompt.append("ERROS BLOQUEANTES IDENTIFICADOS:\n");
        alignmentCheck.blockingIssues().stream()
                .limit(6)
                .forEach(issue -> retryPrompt.append("- ").append(issue).append("\n"));
        retryPrompt.append("Nao inclua lotes fora da faixa, nao omita lotes esperados e mantenha as linhas AO NORTE/SUL/LESTE/OESTE para cada lote.\n");
        retryPrompt.append("Se houver frente viaria validada no resumo tecnico, ela deve aparecer no lote correspondente.\n");
        retryPrompt.append("Responda novamente apenas com o memorial corrigido.\n");
        return retryPrompt.toString();
    }

    public boolean isOpenAiQuotaExceeded(HttpStatusCodeException exception, String responseBody) {
        String combined = ((exception.getMessage() != null ? exception.getMessage() : "") + " "
                + (responseBody != null ? responseBody : "")).toLowerCase(Locale.ROOT);

        return combined.contains("insufficient_quota")
                || combined.contains("you exceeded your current quota")
                || combined.contains("billing")
                || combined.contains("credit balance is too low");
    }

    public boolean isOpenAiRateLimit(HttpStatusCodeException exception, String responseBody) {
        String combined = ((exception.getMessage() != null ? exception.getMessage() : "") + " "
                + (responseBody != null ? responseBody : "")).toLowerCase(Locale.ROOT);

        return exception.getStatusCode().value() == 429
                && (combined.contains("rate_limit_exceeded")
                || combined.contains("tokens per min")
                || combined.contains("requests per min")
                || combined.contains("too many requests")
                || combined.contains("please try again in"));
    }

    public boolean isOpenAiTransientUnavailable(HttpStatusCodeException exception, String responseBody) {
        String combined = ((exception.getMessage() != null ? exception.getMessage() : "") + " "
                + (responseBody != null ? responseBody : "")).toLowerCase(Locale.ROOT);

        return exception.getStatusCode().value() == 503
                || combined.contains("service unavailable")
                || combined.contains("upstream connect error")
                || combined.contains("connection termination")
                || combined.contains("temporarily unavailable");
    }

    private void ensureOpenAiConfigured() {
        if (openaiApiKey == null || openaiApiKey.trim().isEmpty()) {
            throw new IllegalStateException("API Key da OpenAI nao configurada (OPENAI_API_KEY).");
        }
    }

    private String extractContentFromClaudeResponse(Map<String, Object> responseBody) {
        try {
            if (responseBody == null) {
                throw new RuntimeException("Empty response from Claude");
            }

            Object contentObj = responseBody.get("content");
            if (contentObj instanceof List) {
                List<?> contentList = (List<?>) contentObj;
                if (!contentList.isEmpty() && contentList.get(0) instanceof Map) {
                    Map<?, ?> firstContent = (Map<?, ?>) contentList.get(0);
                    Object text = firstContent.get("text");
                    if (text != null) {
                        return text.toString();
                    }
                }
            }

            throw new RuntimeException("Invalid Claude response structure");
        } catch (Exception e) {
            throw new RuntimeException("Error extracting content from Claude response: " + e.getMessage());
        }
    }

    private String buildLotOnlySystemPrompt(int startLot, int endLot) {
        return "Voce esta gerando apenas blocos de lotes para um memorial particionado. "
                + "Responda somente com os lotes no intervalo solicitado. "
                + "Nao gere preambulo, memorial descritivo completo, identificacao do terreno, situacao antes, situacao depois, declaracao final, assinatura ou secoes numeradas. "
                + "Cada bloco deve comecar com 'LOTE N:' e seguir diretamente com a descricao tecnica do lote. "
                + "Nao use placeholders com colchetes. "
                + "Nao use valores zerados como 0,0000 m2 ou 0,0000 m para terreno original. "
                + "Nao invente dados; quando faltar informacao, escreva 'nao informado no cadastro' ou 'nao identificado no DXF'. "
                + "Use apenas a numeracao de lotes entre " + startLot + " e " + endLot + ".";
    }

    private String extractLotBlocksOnly(String content, int startLot, int endLot) {
        Matcher matcher = LOT_BLOCK_PATTERN.matcher(content);
        Map<Integer, String> blocksByLot = new TreeMap<>();

        while (matcher.find()) {
            int lotNumber = Integer.parseInt(matcher.group(1));
            if (lotNumber >= startLot && lotNumber <= endLot) {
                String cleanedBlock = cleanLotBlockContent(matcher.group());
                if (!cleanedBlock.isBlank()) {
                    blocksByLot.merge(lotNumber, cleanedBlock, this::selectPreferredLotBlock);
                }
            }
        }

        return blocksByLot.values().stream().collect(Collectors.joining("\n\n"));
    }

    private String cleanLotBlockContent(String blockContent) {
        if (blockContent == null || blockContent.isBlank()) {
            return "";
        }

        String cleaned = sanitizeMemorialText(blockContent).trim();
        cleaned = cleaned
                .replaceAll("(?is)\\n\\s*Coordenadas dos v[ée]rtices.*?(?=\\n\\s*AO\\s+NORTE:|\\n\\s*AO\\s+SUL:|\\n\\s*AO\\s+LESTE:|\\n\\s*AO\\s+OESTE:|\\z)", "\n")
                .replaceAll("(?is)\\n\\s*Descri[cç][aã]o do per[ií]metro.*?(?=\\n\\s*AO\\s+NORTE:|\\n\\s*AO\\s+SUL:|\\n\\s*AO\\s+LESTE:|\\n\\s*AO\\s+OESTE:|\\z)", "\n")
                .replaceAll("(?im)^\\s*Confronta[cç][oõ]es espec[ií]ficas\\s*:?\\s*$", "")
                .replaceAll("(?i)resumo t[eé]cnico validado do backend", "levantamento tecnico validado")
                .replaceAll("(?i),\\s*com per[ií]metro,\\s*[áa]rea e confronta[cç][õo]es reproduzidos exatamente a partir dos dados t[eé]cnicos fornecidos\\.?", "")
                .replaceAll("(?is)\\n\\s*_{5,}.*$", "")
                .replaceAll("(?im)^\\s*DECLARA[ÇC][AÃ]O(?:\\s+FINAL)?\\s*$", "")
                .replaceAll("(?im)^\\s*Fortaleza,\\s*\\d{1,2}\\s+de\\s+.*$", "")
                .replaceAll("(?im)^\\s*Eng\\.\\s*Respons[aá]vel.*$", "")
                .replaceAll("(?im)^\\s*CREA/.*$", "")
                .replaceAll("(?im)^\\s*RNP:.*$", "")
                .replaceAll("(?im)^\\s*[_-]{5,}\\s*$", "")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();

        return normalizeLotBlockHeader(cleaned);
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
        String canonicalHeader = "LOTE " + lotNumber + ":";
        return matcher.replaceFirst(canonicalHeader).trim();
    }

    private String selectPreferredLotBlock(String currentBlock, String candidateBlock) {
        if (currentBlock == null || currentBlock.isBlank()) {
            return candidateBlock;
        }
        if (candidateBlock == null || candidateBlock.isBlank()) {
            return currentBlock;
        }
        return scoreLotBlock(candidateBlock) > scoreLotBlock(currentBlock) ? candidateBlock : currentBlock;
    }

    private int scoreLotBlock(String block) {
        if (block == null || block.isBlank()) {
            return Integer.MIN_VALUE;
        }

        String upper = block.toUpperCase(Locale.ROOT);
        int score = Math.min(block.length(), 200);

        if (upper.contains("AO NORTE:")) {
            score += 25;
        }
        if (upper.contains("AO SUL:")) {
            score += 25;
        }
        if (upper.contains("AO LESTE:")) {
            score += 25;
        }
        if (upper.contains("AO OESTE:")) {
            score += 25;
        }
        if (upper.contains("COORDENADAS DOS V")) {
            score -= 40;
        }
        if (upper.contains("RESUMO TECNICO VALIDADO DO BACKEND")) {
            score -= 40;
        }
        if (upper.contains("CONFRONTACOES ESPECIFICAS")) {
            score -= 20;
        }
        if (upper.contains("DECLARA") || upper.contains("RESPONSAVEL TECNICO")) {
            score -= 60;
        }

        return score;
    }
}
