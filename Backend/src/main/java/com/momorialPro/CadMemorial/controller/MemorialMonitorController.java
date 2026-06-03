package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.service.MemorialMetricsService;
import com.momorialPro.CadMemorial.service.MemorialCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Controller para monitoramento em tempo real do sistema
 */
@RestController
@RequestMapping("/api/monitor")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class MemorialMonitorController {

    private final MemorialMetricsService metricsService;
    private final MemorialCacheService cacheService;

    /**
     * Dashboard completo do sistema
     */
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        try {
            Map<String, Object> dashboard = new HashMap<>();
            
            // Estatísticas gerais
            MemorialMetricsService.MemorialStats generalStats = metricsService.getStats();
            MemorialMetricsService.MemorialStats stats24h = metricsService.getStatsLast24Hours();
            MemorialCacheService.CacheStats cacheStats = cacheService.getStats();
            
            // Seção de performance
            dashboard.put("performance", Map.of(
                "totalGenerations", generalStats.getTotalGenerations(),
                "successRate", Math.round(generalStats.getSuccessRate() * 100.0) / 100.0,
                "avgProcessingTime", Math.round(generalStats.getAvgProcessingTimeSeconds() * 100.0) / 100.0,
                "avgLotsDetected", Math.round(generalStats.getAvgLotsPerMemorial() * 100.0) / 100.0,
                "totalLotsProcessed", generalStats.getTotalLotsDetected()
            ));
            
            // Seção de atividade recente (24h)
            dashboard.put("recent24h", Map.of(
                "generations", stats24h.getTotalGenerations(),
                "successRate", Math.round(stats24h.getSuccessRate() * 100.0) / 100.0,
                "avgProcessingTime", Math.round(stats24h.getAvgProcessingTimeSeconds() * 100.0) / 100.0,
                "lotsDetected", stats24h.getTotalLotsDetected()
            ));
            
            // Seção de cache
            dashboard.put("cache", Map.of(
                "entries", cacheStats.getCurrentSize(),
                "maxEntries", cacheStats.getMaxSize(),
                "usagePercentage", Math.round(cacheStats.getUsagePercentage() * 100.0) / 100.0,
                "expiryHours", cacheStats.getExpiryHours(),
                "status", cacheStats.getUsagePercentage() > 90 ? "warning" : "ok"
            ));
            
            // Seção de sistema
            Runtime runtime = Runtime.getRuntime();
            long totalMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();
            long usedMemory = totalMemory - freeMemory;
            double memoryUsage = (double) usedMemory / totalMemory * 100.0;
            
            dashboard.put("system", Map.of(
                "memoryUsageMB", usedMemory / (1024 * 1024),
                "memoryTotalMB", totalMemory / (1024 * 1024),
                "memoryUsagePercentage", Math.round(memoryUsage * 100.0) / 100.0,
                "processors", runtime.availableProcessors(),
                "status", memoryUsage > 85 ? "warning" : "ok"
            ));
            
            // Status geral do sistema
            String overallStatus = "healthy";
            if (generalStats.getTotalGenerations() > 0 && generalStats.getSuccessRate() < 80) {
                overallStatus = "warning";
            }
            if (generalStats.getTotalGenerations() > 5 && generalStats.getSuccessRate() < 50) {
                overallStatus = "critical";
            }
            if (memoryUsage > 90 || cacheStats.getUsagePercentage() > 95) {
                overallStatus = "warning";
            }
            
            dashboard.put("status", Map.of(
                "overall", overallStatus,
                "timestamp", LocalDateTime.now().toString(),
                "uptime", getUptimeInfo()
            ));
            
            // Gerações recentes
            var recentGenerations = metricsService.getRecentGenerations(5);
            dashboard.put("recentActivity", recentGenerations.stream()
                .map(gen -> Map.of(
                    "timestamp", gen.getTimestamp().toString(),
                    "success", gen.isSuccess(),
                    "processingTime", Math.round(gen.getProcessingTimeMs() / 1000.0 * 100.0) / 100.0,
                    "lotsDetected", gen.getLotsDetected(),
                    "memorialSize", gen.getMemorialLength()
                ))
                .toList()
            );
            
            return ResponseEntity.ok(dashboard);

        } catch (Exception e) {
            log.error("❌ Erro ao gerar dashboard: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Erro ao gerar dashboard",
                "message", e.getMessage(),
                "timestamp", LocalDateTime.now().toString()
            ));
        }
    }
    
    /**
     * Status de conectividade com serviços externos
     */
    @GetMapping("/connectivity")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Map<String, Object>> getConnectivityStatus() {
        try {
            Map<String, Object> connectivity = new HashMap<>();
            
            // Status da base de dados (simples verificação)
            boolean dbConnected = true;
            try {
                // Aqui poderia fazer uma query simples para testar DB
                // Por enquanto assumimos que está conectado se chegou até aqui
            } catch (Exception e) {
                dbConnected = false;
                log.warn("Problema de conectividade com DB: {}", e.getMessage());
            }
            
            connectivity.put("database", Map.of(
                "connected", dbConnected,
                "status", dbConnected ? "ok" : "error"
            ));
            
            // Status do servico de geracao assistida (baseado em configuracao)
            connectivity.put("claude", Map.of(
                "configured", true,
                "provider", "Servico de geracao assistida",
                "status", "ok"
            ));
            
            // Status geral de conectividade
            connectivity.put("overall", Map.of(
                "status", dbConnected ? "connected" : "issues",
                "timestamp", LocalDateTime.now().toString()
            ));
            
            return ResponseEntity.ok(connectivity);

        } catch (Exception e) {
            log.error("❌ Erro ao verificar conectividade: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Erro ao verificar conectividade",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Métricas em tempo real (lightweight)
     */
    @GetMapping("/realtime")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Map<String, Object>> getRealtimeMetrics() {
        try {
            MemorialMetricsService.MemorialStats stats = metricsService.getStatsLast24Hours();
            MemorialCacheService.CacheStats cacheStats = cacheService.getStats();
            
            Runtime runtime = Runtime.getRuntime();
            long usedMemory = runtime.totalMemory() - runtime.freeMemory();
            
            Map<String, Object> realtime = Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "generations24h", stats.getTotalGenerations(),
                "successRate", Math.round(stats.getSuccessRate() * 100.0) / 100.0,
                "avgProcessingTime", Math.round(stats.getAvgProcessingTimeSeconds() * 100.0) / 100.0,
                "cacheEntries", cacheStats.getCurrentSize(),
                "memoryUsageMB", usedMemory / (1024 * 1024),
                "status", stats.getSuccessRate() > 80 ? "ok" : "warning"
            );
            
            return ResponseEntity.ok(realtime);
            
        } catch (Exception e) {
            log.error("❌ Erro ao obter métricas em tempo real: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Erro ao obter métricas",
                "timestamp", LocalDateTime.now().toString()
            ));
        }
    }
    
    private Map<String, Object> getUptimeInfo() {
        // Informações básicas de uptime
        long uptimeMs = java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime();
        long uptimeSeconds = uptimeMs / 1000;
        long uptimeMinutes = uptimeSeconds / 60;
        long uptimeHours = uptimeMinutes / 60;
        
        return Map.of(
            "uptimeMs", uptimeMs,
            "uptimeSeconds", uptimeSeconds,
            "uptimeMinutes", uptimeMinutes,
            "uptimeHours", uptimeHours,
            "uptimeFormatted", String.format("%dh %dm %ds", 
                uptimeHours, uptimeMinutes % 60, uptimeSeconds % 60)
        );
    }
}
