package com.momorialPro.CadMemorial.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MemorialGenerationEvent {
    
    public enum Status {
        STARTED,
        PROCESSING,
        PROGRESS_UPDATE,
        COMPLETED,
        FAILED
    }
    
    private String sessionId;           // ID único da sessão
    private String userId;              // ID do usuário
    private Status status;              // Status atual
    private String message;             // Mensagem descritiva
    private Integer progressPercentage; // Progresso (0-100)
    private String result;              // Resultado final (se completo)
    private String errorMessage;        // Mensagem de erro (se falhou)
    private Long timestamp;             // Timestamp do evento
    
    // Construtores de conveniência
    public static MemorialGenerationEvent started(String sessionId, String userId) {
        return new MemorialGenerationEvent(
            sessionId, userId, Status.STARTED, 
            "Iniciando geração do memorial...", 0, 
            null, null, System.currentTimeMillis()
        );
    }
    
    public static MemorialGenerationEvent progress(String sessionId, String userId, int percentage, String message) {
        return new MemorialGenerationEvent(
            sessionId, userId, Status.PROGRESS_UPDATE, 
            message, percentage, 
            null, null, System.currentTimeMillis()
        );
    }
    
    public static MemorialGenerationEvent completed(String sessionId, String userId, String result) {
        return new MemorialGenerationEvent(
            sessionId, userId, Status.COMPLETED, 
            "Memorial gerado com sucesso!", 100, 
            result, null, System.currentTimeMillis()
        );
    }
    
    public static MemorialGenerationEvent failed(String sessionId, String userId, String error) {
        return new MemorialGenerationEvent(
            sessionId, userId, Status.FAILED, 
            "Erro na geração do memorial", null, 
            null, error, System.currentTimeMillis()
        );
    }
}