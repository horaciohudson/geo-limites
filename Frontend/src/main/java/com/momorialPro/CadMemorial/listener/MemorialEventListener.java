package com.momorialPro.CadMemorial.listener;

import com.momorialPro.CadMemorial.event.MemorialGenerationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MemorialEventListener {

    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    @Async("notificationTaskExecutor")
    public void handleMemorialGenerationEvent(MemorialGenerationEvent event) {
        log.info("📡 Enviando evento WebSocket - Session: {} - Status: {}", 
                event.getSessionId(), event.getStatus());
        
        try {
            // Enviar para tópico específico da sessão
            String destination = "/topic/memorial/" + event.getSessionId();
            messagingTemplate.convertAndSend(destination, event);
            
            // Enviar também para o usuário específico (se logado)
            if (event.getUserId() != null) {
                String userDestination = "/user/" + event.getUserId() + "/memorial";
                messagingTemplate.convertAndSend(userDestination, event);
            }
            
            log.debug("✅ Evento WebSocket enviado com sucesso - Session: {}", event.getSessionId());
            
        } catch (Exception e) {
            log.error("❌ Erro ao enviar evento WebSocket - Session: {}", event.getSessionId(), e);
        }
    }
}