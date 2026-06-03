package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.exception.NotEnoughCreditsException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Extensão do MemorialAiService com integração de créditos
 * Esta classe demonstra como integrar o sistema de créditos
 */
@Service("memorialAiServiceWithCredits")
@RequiredArgsConstructor
@Slf4j
public class MemorialAiServiceWithCredits {

    @Autowired
    private MemorialApiService originalMemorialService;
    
    @Autowired
    private MemorialCreditIntegrationService creditIntegrationService;

    /**
     * Método principal que integra créditos com geração de memorial
     */
    public String generateMemorialWithCredits(DxfCompareResultDTO r, UUID standardId, UUID userId, UUID propertyId) {
        long startTime = System.currentTimeMillis();
        
        try {
            // ===== ETAPA 1: VALIDAÇÃO E CONSUMO DE CRÉDITOS =====
            // ⚠️ TEMPORÁRIO: Validação de créditos desabilitada para desenvolvimento
            // TODO: Reabilitar em produção
            creditIntegrationService.getCreditUsageInfo(userId, r);
            
            // Valida e consome créditos ANTES de chamar a IA
            // creditIntegrationService.validateAndConsumeCredits(userId, r);
            
            // ===== ETAPA 2: GERAÇÃO DO MEMORIAL =====
            // Chama o serviço original para gerar o memorial
            String memorial = originalMemorialService.generate(r, standardId, userId, propertyId);

            // Registra uso bem-sucedido de créditos (desabilitado)
            return memorial;
            
        } catch (NotEnoughCreditsException e) {
            // Erro de créditos insuficientes - não deve acontecer com validação desabilitada
            log.error("Creditos insuficientes. Saldo atual: {}, necessario: {}, faltam: {}",
                    e.getCurrentCredits(), e.getRequiredCredits(), e.getMissingCredits());
            
            throw e; // Repassa a exceção
            
        } catch (Exception e) {
            // Erro na geração - NÃO reembolsa créditos (pois não foram consumidos)
            log.error("Erro na geração do memorial: {}", e.getMessage(), e);
            
            throw new RuntimeException("Erro na geração do memorial: " + e.getMessage(), e);
        }
    }

    /**
     * Método para verificar créditos sem consumir (preview)
     */
    public CreditPreviewDTO previewCreditUsage(DxfCompareResultDTO r, UUID userId) {
        try {
            var creditInfo = creditIntegrationService.getCreditUsageInfo(userId, r);
            
            return new CreditPreviewDTO(
                creditInfo.currentBalance(),
                creditInfo.requiredCredits(),
                creditInfo.estimatedLots(),
                creditInfo.hasEnoughCredits(),
                creditInfo.hasEnoughCredits() ? "Créditos suficientes" : 
                    String.format("Faltam %d créditos", creditInfo.requiredCredits() - creditInfo.currentBalance())
            );
            
        } catch (Exception e) {
            log.error("❌ Erro ao calcular preview de créditos: {}", e.getMessage(), e);
            return new CreditPreviewDTO(0, 0, 0, false, "Erro ao calcular créditos");
        }
    }

    /**
     * DTO para preview de uso de créditos
     */
    public record CreditPreviewDTO(
        int currentBalance,
        int requiredCredits,
        int estimatedLots,
        boolean canGenerate,
        String message
    ) {}
}

/**
 * INSTRUÇÕES PARA INTEGRAÇÃO NO MemorialAiService ORIGINAL:
 * 
 * 1. Adicionar dependência no MemorialAiService:
 * 
 * @Autowired
 * private MemorialCreditIntegrationService creditIntegrationService;
 * 
 * 2. No início do método generate(), adicionar:
 * 
 * // Validação e consumo de créditos
 * try {
 *     creditIntegrationService.validateAndConsumeCredits(userId, r);
 * } catch (NotEnoughCreditsException e) {
 *     log.error("❌ Créditos insuficientes: {}", e.getMessage());
 *     throw e;
 * }
 * 
 * 3. No catch de exceções, adicionar reembolso:
 * 
 * } catch (Exception e) {
 *     // Reembolsa créditos em caso de erro
 *     creditIntegrationService.refundCreditsOnError(userId, r, e.getMessage());
 *     throw e;
 * }
 * 
 * 4. Adicionar logs de créditos:
 * 
 * var creditInfo = creditIntegrationService.getCreditUsageInfo(userId, r);
 * registrar resumo de créditos calculados, se necessário,
 *          creditInfo.currentBalance(), creditInfo.requiredCredits(), creditInfo.estimatedLots());
 */
