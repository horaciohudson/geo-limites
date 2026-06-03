package com.momorialPro.CadMemorial.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.List;
import java.util.ArrayList;

/**
 * Serviço para coletar métricas de performance do sistema de memoriais
 */
@Service
@Slf4j
public class MemorialMetricsService {
    
    private final AtomicInteger totalMemorialsGenerated = new AtomicInteger(0);
    private final AtomicInteger successfulGenerations = new AtomicInteger(0);
    private final AtomicInteger failedGenerations = new AtomicInteger(0);
    private final AtomicLong totalProcessingTime = new AtomicLong(0);
    private final AtomicInteger totalLotsDetected = new AtomicInteger(0);
    
    private final ConcurrentMap<String, GenerationMetric> recentGenerations = new ConcurrentHashMap<>();
    private static final int MAX_RECENT_ENTRIES = 50;
    
    public static class GenerationMetric {
        private final LocalDateTime timestamp;
        private final long processingTimeMs;
        private final int lotsDetected;
        private final int entitiesProcessed;
        private final boolean success;
        private final String errorMessage;
        private final int memorialLength;
        
        public GenerationMetric(long processingTimeMs, int lotsDetected, int entitiesProcessed, 
                              boolean success, String errorMessage, int memorialLength) {
            this.timestamp = LocalDateTime.now();
            this.processingTimeMs = processingTimeMs;
            this.lotsDetected = lotsDetected;
            this.entitiesProcessed = entitiesProcessed;
            this.success = success;
            this.errorMessage = errorMessage;
            this.memorialLength = memorialLength;
        }
        
        // Getters
        public LocalDateTime getTimestamp() { return timestamp; }
        public long getProcessingTimeMs() { return processingTimeMs; }
        public int getLotsDetected() { return lotsDetected; }
        public int getEntitiesProcessed() { return entitiesProcessed; }
        public boolean isSuccess() { return success; }
        public String getErrorMessage() { return errorMessage; }
        public int getMemorialLength() { return memorialLength; }
    }
    
    /**
     * Registra uma geração bem-sucedida
     */
    public void recordSuccessfulGeneration(long processingTimeMs, int lotsDetected, 
                                         int entitiesProcessed, int memorialLength) {
        totalMemorialsGenerated.incrementAndGet();
        successfulGenerations.incrementAndGet();
        totalProcessingTime.addAndGet(processingTimeMs);
        totalLotsDetected.addAndGet(lotsDetected);
        
        String key = "gen_" + System.currentTimeMillis();
        GenerationMetric metric = new GenerationMetric(
            processingTimeMs, lotsDetected, entitiesProcessed, true, null, memorialLength
        );

        addRecentGeneration(key, metric);
    }
    
    /**
     * Registra uma geração que falhou
     */
    public void recordFailedGeneration(long processingTimeMs, int entitiesProcessed, String errorMessage) {
        totalMemorialsGenerated.incrementAndGet();
        failedGenerations.incrementAndGet();
        totalProcessingTime.addAndGet(processingTimeMs);
        
        String key = "gen_" + System.currentTimeMillis();
        GenerationMetric metric = new GenerationMetric(
            processingTimeMs, 0, entitiesProcessed, false, errorMessage, 0
        );
        
        addRecentGeneration(key, metric);
        
        log.warn("📊 Falha registrada: {}ms, {} entidades, erro: {}", 
                processingTimeMs, entitiesProcessed, errorMessage);
    }
    
    private void addRecentGeneration(String key, GenerationMetric metric) {
        // Remove entradas antigas se necessário
        if (recentGenerations.size() >= MAX_RECENT_ENTRIES) {
            String oldestKey = recentGenerations.entrySet().stream()
                .min((e1, e2) -> e1.getValue().getTimestamp().compareTo(e2.getValue().getTimestamp()))
                .map(entry -> entry.getKey())
                .orElse(null);
            
            if (oldestKey != null) {
                recentGenerations.remove(oldestKey);
            }
        }
        
        recentGenerations.put(key, metric);
    }
    
    /**
     * Obtém estatísticas gerais
     */
    public MemorialStats getStats() {
        int total = totalMemorialsGenerated.get();
        int successful = successfulGenerations.get();
        int failed = failedGenerations.get();
        long totalTime = totalProcessingTime.get();
        int totalLots = totalLotsDetected.get();
        
        double successRate = total > 0 ? (double) successful / total * 100 : 0;
        double avgProcessingTime = successful > 0 ? (double) totalTime / successful : 0;
        double avgLotsPerMemorial = successful > 0 ? (double) totalLots / successful : 0;
        
        return new MemorialStats(
            total, successful, failed, successRate,
            avgProcessingTime, avgLotsPerMemorial, totalLots
        );
    }
    
    /**
     * Obtém gerações recentes
     */
    public List<GenerationMetric> getRecentGenerations(int limit) {
        return recentGenerations.values().stream()
            .sorted((m1, m2) -> m2.getTimestamp().compareTo(m1.getTimestamp()))
            .limit(limit)
            .toList();
    }
    
    /**
     * Obtém estatísticas das últimas 24 horas
     */
    public MemorialStats getStatsLast24Hours() {
        LocalDateTime cutoff = LocalDateTime.now().minus(24, ChronoUnit.HOURS);
        
        List<GenerationMetric> recent = recentGenerations.values().stream()
            .filter(m -> m.getTimestamp().isAfter(cutoff))
            .toList();
        
        int total = recent.size();
        int successful = (int) recent.stream().filter(GenerationMetric::isSuccess).count();
        int failed = total - successful;
        
        double successRate = total > 0 ? (double) successful / total * 100 : 0;
        
        double avgProcessingTime = recent.stream()
            .filter(GenerationMetric::isSuccess)
            .mapToLong(GenerationMetric::getProcessingTimeMs)
            .average()
            .orElse(0);
        
        double avgLotsPerMemorial = recent.stream()
            .filter(GenerationMetric::isSuccess)
            .mapToInt(GenerationMetric::getLotsDetected)
            .average()
            .orElse(0);
        
        int totalLots = recent.stream()
            .filter(GenerationMetric::isSuccess)
            .mapToInt(GenerationMetric::getLotsDetected)
            .sum();
        
        return new MemorialStats(
            total, successful, failed, successRate,
            avgProcessingTime, avgLotsPerMemorial, totalLots
        );
    }
    
    public static class MemorialStats {
        private final int totalGenerations;
        private final int successfulGenerations;
        private final int failedGenerations;
        private final double successRate;
        private final double avgProcessingTimeMs;
        private final double avgLotsPerMemorial;
        private final int totalLotsDetected;
        
        public MemorialStats(int totalGenerations, int successfulGenerations, int failedGenerations,
                           double successRate, double avgProcessingTimeMs, double avgLotsPerMemorial,
                           int totalLotsDetected) {
            this.totalGenerations = totalGenerations;
            this.successfulGenerations = successfulGenerations;
            this.failedGenerations = failedGenerations;
            this.successRate = successRate;
            this.avgProcessingTimeMs = avgProcessingTimeMs;
            this.avgLotsPerMemorial = avgLotsPerMemorial;
            this.totalLotsDetected = totalLotsDetected;
        }
        
        // Getters
        public int getTotalGenerations() { return totalGenerations; }
        public int getSuccessfulGenerations() { return successfulGenerations; }
        public int getFailedGenerations() { return failedGenerations; }
        public double getSuccessRate() { return successRate; }
        public double getAvgProcessingTimeMs() { return avgProcessingTimeMs; }
        public double getAvgProcessingTimeSeconds() { return avgProcessingTimeMs / 1000.0; }
        public double getAvgLotsPerMemorial() { return avgLotsPerMemorial; }
        public int getTotalLotsDetected() { return totalLotsDetected; }
    }
}
