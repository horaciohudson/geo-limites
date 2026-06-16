package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.service.AsyncMemorialService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@RestController
@RequestMapping("/api/memorial/async")
@RequiredArgsConstructor
public class AsyncMemorialController {

    private final AsyncMemorialService asyncMemorialService;
    
    // Cache para rastrear sessões ativas
    private final Map<String, String> activeSessions = new ConcurrentHashMap<>();

    @PostMapping("/generate")
    @PreAuthorize("hasRole('USER')")
    public Mono<ResponseEntity<Map<String, Object>>> generateMemorialAsync(
            @RequestBody Map<String, Object> request) {
        
        return Mono.fromCallable(() -> {
            // Gerar ID único para a sessão
            String sessionId = UUID.randomUUID().toString();
            String userId = getCurrentUserId(); // Implementar conforme seu sistema de auth
            
            log.info("🎯 Nova requisição de memorial assíncrono - Session: {}", sessionId);
            
            // Extrair parâmetros da requisição
            Object compareResult = request.get("compareResult");
            String standardId = (String) request.get("standardId");
            String fileName = (String) request.get("fileName");
            
            // Registrar sessão ativa
            activeSessions.put(sessionId, userId);
            
            // Iniciar processamento assíncrono (não bloqueia)
            asyncMemorialService.generateMemorialAsync(sessionId, userId, compareResult, standardId, fileName)
                .whenComplete((result, throwable) -> {
                    // Limpar sessão quando completar
                    activeSessions.remove(sessionId);
                    
                    if (throwable != null) {
                        log.error("❌ Falha na geração assíncrona - Session: {}", sessionId, throwable);
                    } else {
                        log.info("✅ Geração assíncrona concluída - Session: {}", sessionId);
                    }
                });
            
            // Retornar imediatamente com ID da sessão
            Map<String, Object> response = Map.of(
                "sessionId", sessionId,
                "status", "STARTED",
                "message", "Geração iniciada. Acompanhe o progresso via WebSocket.",
                "websocketTopic", "/topic/memorial/" + sessionId
            );
            
            return ResponseEntity.ok(response);
        });
    }

    @GetMapping("/status/{sessionId}")
    public Mono<ResponseEntity<Map<String, Object>>> getSessionStatus(@PathVariable String sessionId) {
        return Mono.fromCallable(() -> {
            boolean isActive = activeSessions.containsKey(sessionId);
            
            Map<String, Object> response = Map.of(
                "sessionId", sessionId,
                "isActive", isActive,
                "status", isActive ? "PROCESSING" : "COMPLETED_OR_NOT_FOUND"
            );
            
            return ResponseEntity.ok(response);
        });
    }

    @DeleteMapping("/cancel/{sessionId}")
    public Mono<ResponseEntity<Map<String, Object>>> cancelGeneration(@PathVariable String sessionId) {
        return Mono.fromCallable(() -> {
            boolean wasCancelled = activeSessions.remove(sessionId) != null;
            
            Map<String, Object> response = Map.of(
                "sessionId", sessionId,
                "cancelled", wasCancelled,
                "message", wasCancelled ? "Geração cancelada" : "Sessão não encontrada ou já finalizada"
            );
            
            return ResponseEntity.ok(response);
        });
    }
    
    private String getCurrentUserId() {
        // TODO: Implementar conforme seu sistema de autenticação
        // Exemplo: SecurityContextHolder.getContext().getAuthentication().getName()
        return "user-123"; // Placeholder
    }
}