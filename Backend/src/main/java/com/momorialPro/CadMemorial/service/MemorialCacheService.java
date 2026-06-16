package com.momorialPro.CadMemorial.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Serviço de cache para memoriais gerados
 * Evita regenerar memoriais idênticos
 */
@Service
@Slf4j
public class MemorialCacheService {
    
    private final ConcurrentMap<String, CacheEntry> memorialCache = new ConcurrentHashMap<>();
    private static final int MAX_CACHE_SIZE = 100;
    private static final int CACHE_EXPIRY_HOURS = 24;
    
    public static class CacheEntry {
        private final String memorial;
        private final LocalDateTime timestamp;
        private final int lotCount;
        
        public CacheEntry(String memorial, int lotCount) {
            this.memorial = memorial;
            this.lotCount = lotCount;
            this.timestamp = LocalDateTime.now();
        }
        
        public String getMemorial() { return memorial; }
        public int getLotCount() { return lotCount; }
        public LocalDateTime getTimestamp() { return timestamp; }
        
        public boolean isExpired() {
            return ChronoUnit.HOURS.between(timestamp, LocalDateTime.now()) > CACHE_EXPIRY_HOURS;
        }
    }
    
    /**
     * Gera chave de cache baseada nos dados do DXF
     */
    public String generateCacheKey(Object dxfData) {
        try {
            String dataString = dxfData.toString();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(dataString.getBytes(StandardCharsets.UTF_8));
            
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString().substring(0, 16); // Primeiros 16 caracteres
        } catch (Exception e) {
            log.warn("Erro ao gerar chave de cache: {}", e.getMessage());
            return "fallback_" + System.currentTimeMillis();
        }
    }
    
    /**
     * Busca memorial no cache
     */
    public CacheEntry getFromCache(String key) {
        CacheEntry entry = memorialCache.get(key);
        if (entry != null && entry.isExpired()) {
            memorialCache.remove(key);
            return null;
        }

        return entry;
    }
    
    /**
     * Armazena memorial no cache
     */
    public void putInCache(String key, String memorial, int lotCount) {
        // Limpa cache se estiver muito grande
        if (memorialCache.size() >= MAX_CACHE_SIZE) {
            cleanExpiredEntries();
            if (memorialCache.size() >= MAX_CACHE_SIZE) {
                // Remove entrada mais antiga
                String oldestKey = memorialCache.entrySet().stream()
                    .min((e1, e2) -> e1.getValue().getTimestamp().compareTo(e2.getValue().getTimestamp()))
                    .map(entry -> entry.getKey())
                    .orElse(null);
                
                if (oldestKey != null) {
                    memorialCache.remove(oldestKey);
                }
            }
        }

        memorialCache.put(key, new CacheEntry(memorial, lotCount));
    }
    
    /**
     * Remove uma entrada específica do cache
     */
    public void removeFromCache(String key) {
        memorialCache.remove(key);
    }
    
    /**
     * Limpa todo o cache
     */
    public void clearAllCache() {
        memorialCache.clear();
    }
    
    /**
     * Limpa entradas expiradas do cache
     */
    public void cleanExpiredEntries() {
        int removedCount = 0;
        var iterator = memorialCache.entrySet().iterator();
        
        while (iterator.hasNext()) {
            var entry = iterator.next();
            if (entry.getValue().isExpired()) {
                iterator.remove();
                removedCount++;
            }
        }
        
    }
    
    /**
     * Estatísticas do cache
     */
    public CacheStats getStats() {
        cleanExpiredEntries();
        return new CacheStats(
            memorialCache.size(),
            MAX_CACHE_SIZE,
            CACHE_EXPIRY_HOURS
        );
    }
    
    public static class CacheStats {
        private final int currentSize;
        private final int maxSize;
        private final int expiryHours;
        
        public CacheStats(int currentSize, int maxSize, int expiryHours) {
            this.currentSize = currentSize;
            this.maxSize = maxSize;
            this.expiryHours = expiryHours;
        }
        
        public int getCurrentSize() { return currentSize; }
        public int getMaxSize() { return maxSize; }
        public int getExpiryHours() { return expiryHours; }
        public double getUsagePercentage() { return (double) currentSize / maxSize * 100; }
    }
}
