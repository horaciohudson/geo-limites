package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.MemorialStandardDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Serviço para gerenciar Prompt Caching do Claude.
 * Reduz custos em 60-70% ao cachear partes estáticas do prompt.
 */
@Service
@RequiredArgsConstructor
public class ClaudePromptCacheService {
    
    @Value("${memorialpro.claude.cache.enabled:true}")
    private boolean cacheEnabled;
    
    @Value("${memorialpro.claude.cache.ttl:300}")
    private int cacheTtl; // Tempo de vida do cache em segundos
    
    private long totalCacheHits = 0;
    private long totalRequests = 0;
    private double totalSavings = 0.0;
    
    /**
     * Constrói o system prompt cacheável (parte estática).
     * Esta parte raramente muda e pode ser cacheada pelo Claude.
     * 
     * @param standard Norma ABNT a ser seguida
     * @return Lista de mensagens do system com cache control
     */
    public List<Map<String, Object>> buildCachedSystemPrompt(MemorialStandardDTO standard) {
        List<Map<String, Object>> systemMessages = new ArrayList<>();
        String generalInstructions = buildGeneralInstructions();
        
        if (!cacheEnabled) {
            // Se cache desabilitado, retorna apenas texto simples
            systemMessages.add(Map.of(
                "type", "text",
                "text", buildCompleteSystemPrompt(standard)
            ));
            return systemMessages;
        }
        
        // Parte 1: Normas ABNT (sempre igual - CACHE)
        systemMessages.add(Map.of(
            "type", "text",
            "text", buildABNTNorms(),
            "cache_control", Map.of("type", "ephemeral")
        ));
        
        // Parte 2: Instruções gerais (sempre igual - CACHE)
        systemMessages.add(Map.of(
            "type", "text",
            "text", generalInstructions,
            "cache_control", Map.of("type", "ephemeral")
        ));
        
        // Parte 3: Template específico da norma (pode variar - SEM CACHE inicial)
        if (standard != null && standard.getPromptTemplate() != null && !standard.getPromptTemplate().trim().isEmpty()) {
            systemMessages.add(Map.of(
                "type", "text",
                "text", "TEMPLATE DA NORMA SELECIONADA:\n\n" + standard.getPromptTemplate()
            ));
        }
        
        return systemMessages;
    }
    
    /**
     * Normas ABNT (parte estática - sempre cacheada).
     */
    private String buildABNTNorms() {
        return """
            NORMAS TÉCNICAS BRASILEIRAS - NBR 17047:2024 e NBR 13133:1994
            
            Você é um sistema especialista em processamento de memoriais descritivos conforme:
            - NBR 17047:2024 (Georreferenciamento de imóveis rurais e urbanos)
            - NBR 13133:1994 (Execução de levantamento topográfico)
            
            REGRAS CRÍTICAS (documento legal para registro em cartório):
            
            1. COORDENADAS UTM/SIRGAS 2000:
               - Use APENAS as coordenadas fornecidas no Resumo Técnico JSON.
               - Formato obrigatório exigido pelo cartório: "P01 (coordenadas E 556478.64m e N 9544347.43m)"
               - NUNCA invente, repita ou use coordenadas fictícias.
            
            2. CONFRONTAÇÕES:
               - Use APENAS os dados fornecidos no JSON (incluindo extensos e posições cartoriais pré-calculadas).
               - NUNCA invente medidas ou direções.
            
            3. ÁREAS E PERÍMETROS:
               - Use APENAS os dados fornecidos no JSON (incluindo valores por extenso).
               - Formato numérico: "250,00 m²" (duas casas decimais).
            """;
    }
    
    /**
     * Instruções gerais (parte estática - sempre cacheada).
     */
    private String buildGeneralInstructions() {
        return """
            FUNÇÃO PRINCIPAL: STRICT TEMPLATE ENGINE
            
            Você não é um redator livre. Sua única função é atuar como um motor de renderização de templates (Strict Template Engine).
            Você receberá um Template (com placeholders no formato {{variavel}}) e um Resumo Técnico JSON (com os dados processados).
            
            REGRAS ABSOLUTAS E INQUEBRÁVEIS:
            1. NÃO ALTERE A ESTRUTURA DO TEMPLATE: Mantenha todos os parágrafos, quebras de linha e estrutura idêntica ao template fornecido.
            2. PREENCHIMENTO LITERAL: Substitua os placeholders {{variavel}} EXATAMENTE pelos valores fornecidos no Resumo Técnico JSON.
            3. SEM REDAÇÃO LIVRE: É ESTRITAMENTE PROIBIDO inventar textos, inferir sentidos de caminhamento ou adicionar descrições que não estejam no JSON.
            4. CAMPOS PRÉ-PROCESSADOS: Utilize os campos semânticos já calculados no JSON (como 'areaExtenso', 'perimeterExtenso', 'lengthExtenso', 'posicaoCartorial' e 'sentidoCaminhamento'). Não tente convertê-los por conta própria.
            5. NÃO USE MARKDOWN ADICIONAL: Respeite a formatação do template. Não adicione asteriscos, negritos ou listas que não estejam no template original.
            
            FORMATAÇÃO DE COORDENADAS E PONTOS:
            - Quando substituir placeholders referentes a pontos (ex: {{pontos_lote}} ou {{pontos_terreno_original}}), siga ESTRITAMENTE o formato:
              "PXX (coordenadas E X.XXm e N Y.YYm)"
            - Exemplo correto: "P01 (coordenadas E 556478.64m e N 9544347.43m)"
            - Utilize 2 casas decimais e o sufixo "m".
            
            FORMATAÇÃO DE CONFRONTAÇÕES E MEDIDAS:
            - O campo 'confrontacoesFormatadas' do JSON já contém o texto completo, exato e formatado das confrontações (incluindo Norte/Sul, posições, sentido e números por extenso).
            - Ao preencher placeholders genéricos de confrontação (como {{confrontacoes_lote}}), você DEVE COPIAR E COLAR o valor de 'confrontacoesFormatadas' INTEGRALMENTE, sem alterar, omitir, reescrever ou resumir o texto.
            - Para áreas e perímetros, utilize os campos 'areaExtenso' e 'perimeterExtenso' diretamente.
            """;
    }
    
    /**
     * Constrói system prompt completo (sem cache - fallback).
     */
    public String buildCompleteSystemPrompt(MemorialStandardDTO standard) {
        StringBuilder prompt = new StringBuilder();
        prompt.append(buildABNTNorms()).append("\n\n");
        prompt.append(buildGeneralInstructions()).append("\n\n");
        
        if (standard != null && standard.getPromptTemplate() != null && !standard.getPromptTemplate().trim().isEmpty()) {
            prompt.append("TEMPLATE DA NORMA SELECIONADA:\n\n");
            prompt.append(standard.getPromptTemplate());
        }
        
        return prompt.toString();
    }
    
    /**
     * Adiciona headers necessários para prompt caching.
     */
    public void addCacheHeaders(org.springframework.http.HttpHeaders headers) {
        if (cacheEnabled) {
            headers.set("anthropic-version", "2023-06-01");
            headers.set("anthropic-beta", "prompt-caching-2024-07-31");
        }
    }
    
    /**
     * Registra uso de cache para métricas.
     */
    public void recordCacheUsage(boolean cacheHit, double costSaved) {
        totalRequests++;
        if (cacheHit) {
            totalCacheHits++;
            totalSavings += costSaved;
        }
        
    }
    
    /**
     * Retorna estatísticas de cache.
     */
    public Map<String, Object> getCacheStats() {
        double hitRate = totalRequests > 0 ? (double) totalCacheHits / totalRequests * 100 : 0;
        
        return Map.of(
            "enabled", cacheEnabled,
            "totalRequests", totalRequests,
            "cacheHits", totalCacheHits,
            "hitRate", hitRate,
            "totalSavings", totalSavings,
            "cacheTtl", cacheTtl
        );
    }
    
    /**
     * Reseta estatísticas de cache.
     */
    public void resetStats() {
        totalCacheHits = 0;
        totalRequests = 0;
        totalSavings = 0.0;
    }
}
