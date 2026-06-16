package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.event.MemorialGenerationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncMemorialService {

    private final MemorialGptService memorialGptService;
    private final ApplicationEventPublisher eventPublisher;

    @Async("memorialTaskExecutor")
    public CompletableFuture<String> generateMemorialAsync(
            String sessionId, 
            String userId,
            Object compareResult, 
            String standardId, 
            String fileName) {
        
        log.info("🚀 Iniciando geração assíncrona de memorial - Session: {}", sessionId);
        
        try {
            // Publicar evento de início
            eventPublisher.publishEvent(MemorialGenerationEvent.started(sessionId, userId));
            
            // Simular progresso durante o processamento
            publishProgress(sessionId, userId, 10, "Analisando arquivo DXF...");
            Thread.sleep(500); // Simular processamento
            
            publishProgress(sessionId, userId, 25, "Extraindo coordenadas...");
            Thread.sleep(500);
            
            publishProgress(sessionId, userId, 40, "Detectando lotes...");
            Thread.sleep(500);
            
            publishProgress(sessionId, userId, 60, "Processando com IA...");
            
            // Chamar o serviço original com timeout estendido
            String memorial = memorialGptService.generateWithExtendedTimeout(
                compareResult, standardId, fileName, sessionId, userId, this::publishProgress
            );
            
            publishProgress(sessionId, userId, 90, "Formatando memorial...");
            Thread.sleep(500);
            
            // Publicar evento de conclusão
            eventPublisher.publishEvent(MemorialGenerationEvent.completed(sessionId, userId, memorial));
            
            log.info("✅ Memorial gerado com sucesso - Session: {}", sessionId);
            return CompletableFuture.completedFuture(memorial);
            
        } catch (Exception e) {
            log.error("❌ Erro na geração assíncrona - Session: {}", sessionId, e);
            
            // Publicar evento de erro
            eventPublisher.publishEvent(MemorialGenerationEvent.failed(sessionId, userId, e.getMessage()));
            
            return CompletableFuture.failedFuture(e);
        }
    }
    
    private void publishProgress(String sessionId, String userId, int percentage, String message) {
        eventPublisher.publishEvent(MemorialGenerationEvent.progress(sessionId, userId, percentage, message));
        log.info("📊 Progresso - Session: {} - {}% - {}", sessionId, percentage, message);
    }
}