// Adicione estes métodos ao MemorialGptService existente

/**
 * Versão estendida do generate() com timeout maior e callback de progresso
 */
public String generateWithExtendedTimeout(
        Object compareResult, 
        String standardId, 
        String fileName,
        String sessionId,
        String userId,
        ProgressCallback progressCallback) {
    
    log.info("🤖 Iniciando geração com timeout estendido - Session: {}", sessionId);
    
    try {
        // Configurar WebClient com timeout maior para processamento assíncrono
        WebClient extendedClient = WebClient.builder()
            .baseUrl("https://api.openai.com")
            .defaultHeader("Authorization", "Bearer " + openAiApiKey)
            .defaultHeader("Content-Type", "application/json")
            .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
            .build();
        
        // Callback de progresso
        progressCallback.onProgress(sessionId, userId, 70, "Enviando requisição para IA...");
        
        // Fazer requisição com timeout de 15 minutos (para processamento assíncrono)
        String response = extendedClient.post()
            .uri("/v1/chat/completions")
            .bodyValue(buildRequestBody(compareResult, standardId, fileName))
            .retrieve()
            .bodyToMono(String.class)
            .timeout(Duration.ofMinutes(15)) // Timeout maior para processamento assíncrono
            .subscribeOn(Schedulers.boundedElastic()) // Pool para tarefas bloqueantes
            .doOnNext(result -> progressCallback.onProgress(sessionId, userId, 85, "Processando resposta da IA..."))
            .block();
        
        progressCallback.onProgress(sessionId, userId, 95, "Finalizando memorial...");
        
        return processResponse(response);
        
    } catch (Exception e) {
        log.error("❌ Erro na geração com timeout estendido - Session: {}", sessionId, e);
        throw new RuntimeException("Erro na geração do memorial: " + e.getMessage(), e);
    }
}

/**
 * Interface para callback de progresso
 */
@FunctionalInterface
public interface ProgressCallback {
    void onProgress(String sessionId, String userId, int percentage, String message);
}

/**
 * Método auxiliar para construir o corpo da requisição
 */
private Map<String, Object> buildRequestBody(Object compareResult, String standardId, String fileName) {
    // Implementar conforme sua lógica existente
    // Retornar o Map com os dados da requisição para OpenAI
    return Map.of(
        "model", "gpt-4o-mini",
        "messages", buildMessages(compareResult, standardId, fileName),
        "max_tokens", 4000,
        "temperature", 0.1
    );
}

/**
 * Método auxiliar para processar a resposta
 */
private String processResponse(String response) {
    // Implementar conforme sua lógica existente de parsing da resposta OpenAI
    // Extrair o conteúdo do memorial da resposta JSON
    return response; // Placeholder
}