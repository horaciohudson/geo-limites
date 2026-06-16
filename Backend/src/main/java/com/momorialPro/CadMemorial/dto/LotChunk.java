package com.momorialPro.CadMemorial.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Representa um chunk (pedaço) de lotes para geração particionada de memorial.
 * Usado quando o memorial tem muitos lotes e precisa ser gerado em partes.
 */
@Data
@Builder
public class LotChunk {
    
    /**
     * Número do chunk (1, 2, 3...)
     */
    private int chunkNumber;
    
    /**
     * Total de chunks que serão gerados
     */
    private int totalChunks;
    
    /**
     * Lista dos números de lotes incluídos neste chunk
     * Ex: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
     */
    private List<Integer> lotNumbers;
    
    /**
     * Indica se este é o primeiro chunk (deve incluir preâmbulo)
     */
    private boolean firstChunk;
    
    /**
     * Indica se este é o último chunk (deve incluir conclusão)
     */
    private boolean lastChunk;
    
    /**
     * Contexto compartilhado entre todos os chunks
     * (informações da propriedade, normas, etc.)
     */
    private String sharedContext;
    
    /**
     * Número do primeiro lote neste chunk
     */
    public int getFirstLotNumber() {
        return lotNumbers.isEmpty() ? 0 : lotNumbers.get(0);
    }
    
    /**
     * Número do último lote neste chunk
     */
    public int getLastLotNumber() {
        return lotNumbers.isEmpty() ? 0 : lotNumbers.get(lotNumbers.size() - 1);
    }
    
    /**
     * Quantidade de lotes neste chunk
     */
    public int getLotCount() {
        return lotNumbers.size();
    }
}
