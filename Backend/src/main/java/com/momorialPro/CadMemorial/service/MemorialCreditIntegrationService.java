package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.exception.NotEnoughCreditsException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Service para integrar o sistema de créditos com a geração de memoriais
 * Responsável por calcular, validar e consumir créditos antes da geração
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MemorialCreditIntegrationService {

    private final CreditService creditService;

    /**
     * Calcula créditos necessários baseado no número de lotes detectados
     */
    public int calculateRequiredCredits(DxfCompareResultDTO dxfData) {
        // Estima número de lotes baseado nas entidades DXF
        int estimatedLots = estimateLotCount(dxfData);

        // Aplica regras de negócio
        int requiredCredits = creditService.calculateRequiredCredits(estimatedLots);
        return requiredCredits;
    }

    /**
     * Valida e consome créditos antes da geração do memorial
     */
    public void validateAndConsumeCredits(UUID userId, DxfCompareResultDTO dxfData) {
        int requiredCredits = calculateRequiredCredits(dxfData);

        // Verifica se tem créditos suficientes
        if (!creditService.hasEnoughCredits(userId, requiredCredits)) {
            int currentBalance = creditService.getCurrentBalance(userId);
            log.warn("❌ Créditos insuficientes - Saldo: {}, Necessário: {}", currentBalance, requiredCredits);
            throw new NotEnoughCreditsException(currentBalance, requiredCredits);
        }
        
        // Consome os créditos
        String description = String.format("Geração de memorial - %d lotes estimados", 
                                         estimateLotCount(dxfData));
        creditService.consumeCredits(userId, requiredCredits);
    }

    /**
     * Estima número de lotes baseado nas entidades DXF
     * (Lógica simplificada - pode ser melhorada)
     */
    private int estimateLotCount(DxfCompareResultDTO dxfData) {
        if (dxfData == null || dxfData.getAdded() == null) {
            return 1; // Valor padrão
        }
        
        int totalEntities = dxfData.getAdded().size();
        
        // Lógica de estimativa baseada no número de entidades
        if (totalEntities <= 10) {
            return 1;           // Poucos elementos = 1 lote
        } else if (totalEntities <= 50) {
            return totalEntities / 10;  // Estimativa: 10 entidades por lote
        } else {
            return Math.min(25, totalEntities / 8);  // Máximo 25 lotes
        }
    }

    /**
     * Reembolsa créditos em caso de erro na geração
     */
    public void refundCreditsOnError(UUID userId, DxfCompareResultDTO dxfData, String errorReason) {
        try {
            int refundAmount = calculateRequiredCredits(dxfData);
            String description = String.format("Reembolso por erro na geração: %s", errorReason);
            
            creditService.addCredits(userId, refundAmount, description);
        } catch (Exception e) {
            log.error("❌ Erro ao reembolsar créditos - UserId: {}, Erro: {}", userId, e.getMessage(), e);
        }
    }

    /**
     * Obtém informações de créditos para logs/métricas
     */
    public CreditUsageInfo getCreditUsageInfo(UUID userId, DxfCompareResultDTO dxfData) {
        int currentBalance = creditService.getCurrentBalance(userId);
        int requiredCredits = calculateRequiredCredits(dxfData);
        int estimatedLots = estimateLotCount(dxfData);
        
        return new CreditUsageInfo(
            currentBalance,
            requiredCredits,
            estimatedLots,
            currentBalance >= requiredCredits
        );
    }

    /**
     * Record para informações de uso de créditos
     */
    public record CreditUsageInfo(
        int currentBalance,
        int requiredCredits,
        int estimatedLots,
        boolean hasEnoughCredits
    ) {}
}
