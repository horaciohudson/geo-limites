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
            "text", buildGeneralInstructions(),
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
            
            Você é um engenheiro cartógrafo especialista em memorial descritivo conforme:
            - NBR 17047:2024 (Georreferenciamento de imóveis rurais e urbanos)
            - NBR 13133:1994 (Execução de levantamento topográfico)
            
            REGRAS CRÍTICAS (documento legal para registro em cartório):
            
            1. COORDENADAS UTM/SIRGAS 2000:
               - Use APENAS as coordenadas fornecidas na seção "COORDENADAS REAIS"
               - Formato obrigatório: "P01 (E 556478.64m, N 9544347.43m)"
               - Sistema: SIRGAS 2000 / UTM Zona [especificada]
               - NUNCA invente, repita ou use coordenadas fictícias
               - Coordenadas devem ter 6+ dígitos (E) e 7+ dígitos (N)
            
            2. CONFRONTAÇÕES:
               - Use APENAS as fornecidas na seção "CONFRONTAÇÕES ESPECÍFICAS"
               - Inclua matrículas, CNPJs, CPFs e nomes reais quando disponíveis
               - NUNCA use termos genéricos como "propriedades vizinhas"
               - Especifique medidas lineares e azimutes quando disponíveis
            
            3. RUAS E LOGRADOUROS:
               - Use APENAS os nomes fornecidos na seção "RUAS E LOGRADOUROS"
               - Respeite a localização geográfica de cada lote
               - Mantenha nomenclatura oficial (Rua, Avenida, Travessa, etc.)
            
            4. ÁREAS E PERÍMETROS:
               - Use APENAS as fornecidas na seção "ÁREAS INDIVIDUAIS"
               - Cada lote tem área específica calculada do DXF
               - Formato: "Área: 250,00 m²" (duas casas decimais)
               - Perímetro calculado automaticamente quando disponível
            
            5. PRECISÃO TÉCNICA:
               - Coordenadas: 2 casas decimais (ex: 556478.64m)
               - Áreas: 2 casas decimais (ex: 250,00 m²)
               - Ângulos: graus, minutos e segundos quando aplicável
               - Distâncias: 2 casas decimais (ex: 12,50m)
            """;
    }
    
    /**
     * Instruções gerais (parte estática - sempre cacheada).
     */
    private String buildGeneralInstructions() {
        return """
            ESTRUTURA OBRIGATÓRIA DO MEMORIAL DESCRITIVO:
            
            1. PREÂMBULO
               - Comarca e Cartório de Registro de Imóveis
               - Finalidade do memorial (desmembramento, remembramento, etc.)
               - Identificação do responsável técnico (quando fornecido)
            
            2. IDENTIFICAÇÃO DO TERRENO
               - Denominação e localização completa
               - Proprietário(s) com CPF/CNPJ
               - Matrícula no Cartório de Registro de Imóveis
               - Endereço completo (rua, número, bairro, cidade, estado, CEP)
            
            3. SITUAÇÃO ANTES (TERRENO ORIGINAL)
               - Descrição do terreno antes do desmembramento
               - Coordenadas dos vértices (P01, P02, P03, ...)
               - Perímetro total
               - Área total
               - Confrontações (Norte, Sul, Leste, Oeste)
            
            4. SITUAÇÃO DEPOIS (LOTES RESULTANTES)
               Para cada lote:
               - Número do lote (LOTE 01, LOTE 02, ...)
               - Coordenadas dos vértices
               - Descrição do perímetro (sentido horário)
               - Área do lote
               - Confrontações específicas
               - Destinação (quando fornecida)
            
            5. DECLARAÇÃO FINAL
               - Conformidade com NBR 17047:2024
               - Sistema de referência (SIRGAS 2000)
               - Datum e fuso UTM
               - Data e assinatura do responsável técnico
            
            FORMATAÇÃO:
            - Use markdown para estruturação
            - Títulos em negrito (##)
            - Listas numeradas para vértices
            - Tabelas para resumo de áreas (quando apropriado)
            - Linguagem técnica e formal
            
            VALIDAÇÃO FINAL:
            - Todas as coordenadas são reais (6+ dígitos E, 7+ dígitos N)
            - Todas as confrontações são específicas (não genéricas)
            - Todas as ruas têm nomes reais
            - Todas as áreas foram calculadas
            - Memorial está 100% completo (todos os lotes descritos)
            """;
    }
    
    /**
     * Constrói system prompt completo (sem cache - fallback).
     */
    private String buildCompleteSystemPrompt(MemorialStandardDTO standard) {
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
