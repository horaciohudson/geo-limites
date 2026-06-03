package com.momorialPro.CadMemorial.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Resultado da geração de um chunk de memorial.
 * Contém o conteúdo gerado e metadados sobre o sucesso da operação.
 */
@Data
@Builder
public class ChunkResult {
    
    /**
     * Número do chunk que foi gerado
     */
    private int chunkNumber;
    
    /**
     * Conteúdo do memorial gerado para este chunk
     */
    private String content;
    
    /**
     * Lista dos números de lotes que foram efetivamente gerados
     */
    private List<Integer> generatedLots;
    
    /**
     * Indica se a geração foi bem-sucedida
     */
    private boolean success;
    
    /**
     * Mensagem de erro (se houver)
     */
    private String errorMessage;
    
    /**
     * Tempo de geração em milissegundos
     */
    private long generationTimeMs;
    
    /**
     * Número de tokens usados (se disponível)
     */
    private Integer tokensUsed;
    
    /**
     * Custo estimado da geração (em USD)
     */
    private Double estimatedCost;
    
    /**
     * Indica se o erro é recuperável (ex: rate limit)
     */
    private boolean retryable;
}
