package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.service.MemorialCacheService;
import com.momorialPro.CadMemorial.service.MemorialMetricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller para estatísticas e métricas do sistema de memoriais
 */
@RestController
@RequestMapping("/api/memorial/stats")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class MemorialStatsController {

    private final MemorialMetricsService metricsService;
    private final MemorialCacheService cacheService;

    /**
     * Obtém estatísticas gerais do sistema
     */
    @GetMapping("/general")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Map<String, Object>> getGeneralStats() {
        try {
            MemorialMetricsService.MemorialStats stats = metricsService.getStats();
            MemorialCacheService.CacheStats cacheStats = cacheService.getStats();
            
            Map<String, Object> response = new HashMap<>();
            
            // Estatísticas de geração
            response.put("generation", Map.of(
                "totalGenerations", stats.getTotalGenerations(),
                "successfulGenerations", stats.getSuccessfulGenerations(),
                "failedGenerations", stats.getFailedGenerations(),
                "successRate", Math.round(stats.getSuccessRate() * 100.0) / 100.0,
                "avgProcessingTimeSeconds", Math.round(stats.getAvgProcessingTimeSeconds() * 100.0) / 100.0,
                "avgLotsPerMemorial", Math.round(stats.getAvgLotsPerMemorial() * 100.0) / 100.0,
                "totalLotsDetected", stats.getTotalLotsDetected()
            ));
            
            // Estatísticas de cache
            response.put("cache", Map.of(
                "currentSize", cacheStats.getCurrentSize(),
                "maxSize", cacheStats.getMaxSize(),
                "usagePercentage", Math.round(cacheStats.getUsagePercentage() * 100.0) / 100.0,
                "expiryHours", cacheStats.getExpiryHours()
            ));
            
            // Estatísticas do sistema
            Runtime runtime = Runtime.getRuntime();
            long totalMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();
            long usedMemory = totalMemory - freeMemory;
            
            response.put("system", Map.of(
                "memoryUsedMB", usedMemory / (1024 * 1024),
                "memoryTotalMB", totalMemory / (1024 * 1024),
                "memoryUsagePercentage", Math.round((double) usedMemory / totalMemory * 100.0 * 100.0) / 100.0,
                "availableProcessors", runtime.availableProcessors()
            ));
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Erro ao obter estatísticas gerais: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Erro ao obter estatísticas",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Obtém estatísticas das últimas 24 horas
     */
    @GetMapping("/last24h")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Map<String, Object>> getStats24Hours() {
        try {
            MemorialMetricsService.MemorialStats stats = metricsService.getStatsLast24Hours();
            
            Map<String, Object> response = Map.of(
                "period", "last24hours",
                "totalGenerations", stats.getTotalGenerations(),
                "successfulGenerations", stats.getSuccessfulGenerations(),
                "failedGenerations", stats.getFailedGenerations(),
                "successRate", Math.round(stats.getSuccessRate() * 100.0) / 100.0,
                "avgProcessingTimeSeconds", Math.round(stats.getAvgProcessingTimeSeconds() * 100.0) / 100.0,
                "avgLotsPerMemorial", Math.round(stats.getAvgLotsPerMemorial() * 100.0) / 100.0,
                "totalLotsDetected", stats.getTotalLotsDetected()
            );
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Erro ao obter estatísticas 24h: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Erro ao obter estatísticas 24h",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Obtém gerações recentes
     */
    @GetMapping("/recent")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Map<String, Object>> getRecentGenerations(
            @RequestParam(defaultValue = "10") int limit) {
        try {
            var recentGenerations = metricsService.getRecentGenerations(Math.min(limit, 50));
            
            var generations = recentGenerations.stream()
                .map(gen -> Map.of(
                    "timestamp", gen.getTimestamp().toString(),
                    "processingTimeSeconds", Math.round(gen.getProcessingTimeMs() / 1000.0 * 100.0) / 100.0,
                    "lotsDetected", gen.getLotsDetected(),
                    "entitiesProcessed", gen.getEntitiesProcessed(),
                    "success", gen.isSuccess(),
                    "memorialLength", gen.getMemorialLength(),
                    "errorMessage", gen.getErrorMessage()
                ))
                .toList();
            
            Map<String, Object> response = Map.of(
                "generations", generations,
                "count", generations.size(),
                "limit", limit
            );
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Erro ao obter gerações recentes: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Erro ao obter gerações recentes",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Limpa apenas entradas expiradas do cache
     */
    @PostMapping("/cache/clear")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> clearCache() {
        try {
            MemorialCacheService.CacheStats beforeStats = cacheService.getStats();
            cacheService.cleanExpiredEntries();
            MemorialCacheService.CacheStats afterStats = cacheService.getStats();
            
            Map<String, Object> response = Map.of(
                "message", "Entradas expiradas removidas com sucesso",
                "before", Map.of(
                    "size", beforeStats.getCurrentSize(),
                    "usagePercentage", Math.round(beforeStats.getUsagePercentage() * 100.0) / 100.0
                ),
                "after", Map.of(
                    "size", afterStats.getCurrentSize(),
                    "usagePercentage", Math.round(afterStats.getUsagePercentage() * 100.0) / 100.0
                ),
                "entriesRemoved", beforeStats.getCurrentSize() - afterStats.getCurrentSize()
            );
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Erro ao limpar cache: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Erro ao limpar cache",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Limpa COMPLETAMENTE o cache (todas as entradas)
     * Use este endpoint para forçar regeneração de todos os memoriais
     */
    @PostMapping("/cache/clear-all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> clearAllCache() {
        try {
            MemorialCacheService.CacheStats beforeStats = cacheService.getStats();
            int entriesRemoved = beforeStats.getCurrentSize();
            
            cacheService.clearAllCache();
            
            MemorialCacheService.CacheStats afterStats = cacheService.getStats();
            
            Map<String, Object> response = Map.of(
                "message", "Cache completamente limpo - todos os memoriais serão regenerados",
                "before", Map.of(
                    "size", beforeStats.getCurrentSize(),
                    "usagePercentage", Math.round(beforeStats.getUsagePercentage() * 100.0) / 100.0
                ),
                "after", Map.of(
                    "size", afterStats.getCurrentSize(),
                    "usagePercentage", 0.0
                ),
                "entriesRemoved", entriesRemoved
            );
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Erro ao limpar cache completamente: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Erro ao limpar cache",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Health check do sistema de memoriais
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealthStatus() {
        try {
            MemorialMetricsService.MemorialStats stats = metricsService.getStatsLast24Hours();
            MemorialCacheService.CacheStats cacheStats = cacheService.getStats();
            
            // Determina status baseado nas métricas
            String status = "healthy";
            if (stats.getTotalGenerations() > 0 && stats.getSuccessRate() < 50) {
                status = "degraded";
            }
            if (stats.getTotalGenerations() > 5 && stats.getSuccessRate() < 20) {
                status = "unhealthy";
            }
            
            Map<String, Object> response = Map.of(
                "status", status,
                "timestamp", java.time.LocalDateTime.now().toString(),
                "metrics", Map.of(
                    "generationsLast24h", stats.getTotalGenerations(),
                    "successRate", Math.round(stats.getSuccessRate() * 100.0) / 100.0,
                    "avgProcessingTime", Math.round(stats.getAvgProcessingTimeSeconds() * 100.0) / 100.0,
                    "cacheUsage", Math.round(cacheStats.getUsagePercentage() * 100.0) / 100.0
                )
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ Erro no health check: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        }
    }
}
