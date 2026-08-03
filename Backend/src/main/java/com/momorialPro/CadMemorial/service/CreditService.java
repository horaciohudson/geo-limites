package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.model.CreditPurchase;
import com.momorialPro.CadMemorial.model.CreditTransaction;
import com.momorialPro.CadMemorial.model.UserCredits;
import com.momorialPro.CadMemorial.dto.CreditPackageDTO;
import com.momorialPro.CadMemorial.model.CreditPricingSettings;
import com.momorialPro.CadMemorial.enums.CreditPurchaseStatus;
import com.momorialPro.CadMemorial.enums.CreditTransactionType;
import com.momorialPro.CadMemorial.exception.InvalidPurchaseStateException;
import com.momorialPro.CadMemorial.exception.NotEnoughCreditsException;
import com.momorialPro.CadMemorial.exception.PurchaseNotFoundException;
import com.momorialPro.CadMemorial.repository.CreditPurchaseRepository;
import com.momorialPro.CadMemorial.repository.CreditTransactionRepository;
import com.momorialPro.CadMemorial.repository.UserCreditsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service para gerenciar créditos dos tenants
 * Implementa todas as operações de crédito: consulta, consumo, adição e compras
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CreditService {

    private final UserCreditsRepository userCreditsRepository;
    private final CreditTransactionRepository transactionRepository;
    private final CreditPurchaseRepository purchaseRepository;
    private final CreditPricingSettingsService creditPricingSettingsService;

    /**
     * 1. Verifica se o tenant possui créditos suficientes
     */
    public boolean hasEnoughCredits(UUID tenantId, int requiredCredits) {
        UserCredits userCredits = findOrCreateTenantCredits(tenantId);
        return userCredits.hasEnoughCredits(requiredCredits);
    }

    /**
     * 2. Consome créditos do tenant
     */
    @Transactional
    public void consumeCredits(UUID tenantId, int amount) {
        consumeCredits(tenantId, amount, "Créditos consumidos pela empresa");
    }

    /**
     * 2b. Consome créditos do tenant com descrição customizada
     */
    @Transactional
    public void consumeCredits(UUID tenantId, int amount, String description) {
        UserCredits userCredits = findOrCreateTenantCredits(tenantId);
        
        // Valida saldo antes de consumir
        if (!userCredits.hasEnoughCredits(amount)) {
            throw new NotEnoughCreditsException(userCredits.getTotalCredits(), amount);
        }
        
        // Subtrai créditos
        userCredits.subtractCredits(amount);
        userCreditsRepository.save(userCredits);
        
        // Registra transação
        CreditTransaction transaction = new CreditTransaction(
            tenantId,
            CreditTransactionType.USE, 
            amount, 
            description
        );
        transactionRepository.save(transaction);
    }

    /**
     * 3. Adiciona créditos ao tenant
     */
    @Transactional
    public void addCredits(UUID tenantId, int amount, String description) {
        UserCredits userCredits = findOrCreateTenantCredits(tenantId);
        
        // Adiciona créditos
        userCredits.addCredits(amount);
        userCreditsRepository.save(userCredits);
        
        // Registra transação
        CreditTransaction transaction = new CreditTransaction(
            tenantId,
            CreditTransactionType.PURCHASE, 
            amount, 
            description
        );
        transactionRepository.save(transaction);
    }

    /**
     * 4. Obtém o saldo atual do tenant
     */
    public UserCredits getBalance(UUID tenantId) {
        return findOrCreateTenantCredits(tenantId);
    }

    /**
     * 5. Lista todas as transações do tenant
     */
    public List<CreditTransaction> listTransactions(UUID tenantId) {
        return transactionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    /**
     * 6. Inicia uma compra de créditos para o tenant
     */
    @Transactional
    public CreditPurchase startPurchase(UUID tenantId, String packageId, Integer credits, BigDecimal amountReais, String paymentProvider) {
        CreditPurchaseDraft purchaseDraft = resolvePurchaseDraft(packageId, credits, amountReais);

        CreditPurchase purchase = new CreditPurchase(
            tenantId,
            purchaseDraft.amountReais(),
            purchaseDraft.credits(),
            paymentProvider != null && !paymentProvider.isBlank() ? paymentProvider : "default"
        );

        CreditPurchase savedPurchase = purchaseRepository.save(purchase);

        return savedPurchase;
    }

    /**
     * 7. Confirma uma compra (chamado pelo webhook do gateway de pagamento)
     */
    @Transactional
    public void confirmPurchase(UUID purchaseId) {
        CreditPurchase purchase = purchaseRepository.findById(purchaseId)
            .orElseThrow(() -> new PurchaseNotFoundException(purchaseId));
        
        // Valida estado da compra
        if (!purchase.isPending()) {
            throw new InvalidPurchaseStateException(
                purchaseId, 
                purchase.getStatus(), 
                CreditPurchaseStatus.PENDING
            );
        }
        
        // Marca como paga
        purchase.markAsPaid();
        purchaseRepository.save(purchase);
        
        // Adiciona créditos ao tenant
        addCredits(
            purchase.getTenantId(),
            purchase.getCreditsPurchased(), 
            String.format("Compra confirmada - ID: %s", purchaseId)
        );
    }

    /**
     * 8. Marca uma compra como falha
     */
    @Transactional
    public void failPurchase(UUID purchaseId) {
        log.warn("❌ Marcando compra como falha: {}", purchaseId);
        
        CreditPurchase purchase = purchaseRepository.findById(purchaseId)
            .orElseThrow(() -> new PurchaseNotFoundException(purchaseId));
        
        // Valida estado da compra
        if (!purchase.isPending()) {
            throw new InvalidPurchaseStateException(
                purchaseId, 
                purchase.getStatus(), 
                CreditPurchaseStatus.PENDING
            );
        }
        
        // Marca como falha
        purchase.markAsFailed();
        purchaseRepository.save(purchase);
    }

    /**
     * Método auxiliar: Busca ou cria registro de créditos do tenant
     */
    private UserCredits findOrCreateTenantCredits(UUID tenantId) {
        CreditPricingSettings pricingSettings = creditPricingSettingsService.getOrCreateEntity();
        int welcomeCredits = pricingSettings.getWelcomeCredits();

        return userCreditsRepository.findByTenantId(tenantId)
            .orElseGet(() -> {
                UserCredits newTenantCredits = new UserCredits(tenantId, welcomeCredits);
                UserCredits savedCredits = userCreditsRepository.save(newTenantCredits);
                
                CreditTransaction welcomeTransaction = new CreditTransaction(
                    tenantId,
                    CreditTransactionType.PURCHASE, 
                    welcomeCredits,
                    "Créditos iniciais da empresa"
                );
                transactionRepository.save(welcomeTransaction);
                return savedCredits;
            });
    }

    /**
     * Inicializa créditos para o tenant (chamado no login/primeiro acesso)
     */
    @Transactional
    public UserCredits initializeTenantCredits(UUID tenantId) {
        try {
            return findOrCreateTenantCredits(tenantId);
        } catch (Exception e) {
            log.error("❌ Erro ao inicializar créditos para tenant {}: {}", tenantId, e.getMessage());
            
            try {
                int welcomeCredits = creditPricingSettingsService.getOrCreateEntity().getWelcomeCredits();
                UserCredits fallbackCredits = new UserCredits();
                fallbackCredits.setTenantId(tenantId);
                fallbackCredits.setTotalCredits(welcomeCredits);
                
                UserCredits saved = userCreditsRepository.save(fallbackCredits);
                return saved;
                
            } catch (Exception fallbackError) {
                log.error("❌ Falha total na criação de créditos: {}", fallbackError.getMessage());
                throw new RuntimeException("Não foi possível inicializar créditos para a empresa", fallbackError);
            }
        }
    }

    /**
     * Método auxiliar: Calcula créditos necessários baseado no número de lotes
     */
    public int calculateRequiredCredits(int lotCount) {
        CreditPricingSettings settings = creditPricingSettingsService.getOrCreateEntity();

        if (lotCount == 1) {
            return settings.getSingleLotCreditCost();
        } else if (lotCount <= settings.getSmallProjectMaxLots()) {
            return settings.getSmallProjectCreditCost();
        } else {
            return settings.getLargeProjectCreditCost();
        }
    }

    private CreditPurchaseDraft resolvePurchaseDraft(String packageId, Integer credits, BigDecimal amountReais) {
        if (packageId != null && !packageId.isBlank()) {
            CreditPackageDTO selectedPackage = creditPricingSettingsService.findPackageById(packageId);
            return new CreditPurchaseDraft(selectedPackage.getTotalCredits(), selectedPackage.getPrice());
        }

        if (credits == null || credits <= 0) {
            throw new IllegalArgumentException("Quantidade de créditos deve ser maior que zero");
        }
        if (amountReais == null || amountReais.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Valor deve ser maior que zero");
        }

        BigDecimal expectedAmount = creditPricingSettingsService.getOrCreateEntity()
                .getCustomPricePerCredit()
                .multiply(BigDecimal.valueOf(credits));

        if (expectedAmount.compareTo(amountReais) != 0) {
            throw new IllegalArgumentException("O valor informado nao confere com a tabela oficial de creditos.");
        }

        return new CreditPurchaseDraft(credits, amountReais);
    }

    private record CreditPurchaseDraft(int credits, BigDecimal amountReais) {}

    /**
     * Método auxiliar: Obtém apenas o saldo (otimizado)
     */
    public int getCurrentBalance(UUID tenantId) {
        return userCreditsRepository.findTotalCreditsByTenantId(tenantId).orElse(0);
    }

    /**
     * Método auxiliar: Lista últimas transações (otimizado)
     */
    public List<CreditTransaction> getRecentTransactions(UUID tenantId) {
        return transactionRepository.findTop10ByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    /**
     * Resumo de memoriais cobrados para a conta da empresa.
     */
    public MemorialUsageSummary getMemorialUsageSummary(UUID tenantId) {
        long memorialsCreated = transactionRepository.countMemorialGenerationsByTenantId(tenantId);
        int creditsUsedForMemorials = transactionRepository.sumMemorialCreditsUsedByTenantId(tenantId);
        LocalDateTime lastMemorialGenerationAt = transactionRepository.findLastMemorialGenerationAtByTenantId(tenantId);

        double averageCreditsPerMemorial = memorialsCreated > 0
                ? (double) creditsUsedForMemorials / memorialsCreated
                : 0.0;

        return new MemorialUsageSummary(
                memorialsCreated,
                creditsUsedForMemorials,
                averageCreditsPerMemorial,
                lastMemorialGenerationAt
        );
    }

    /**
     * Método auxiliar: Busca compras do tenant
     */
    public List<CreditPurchase> getUserPurchases(UUID tenantId) {
        return purchaseRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    /**
     * Método auxiliar: Busca compra específica do tenant (com segurança)
     */
    public CreditPurchase getUserPurchase(UUID purchaseId, UUID tenantId) {
        return purchaseRepository.findByIdAndTenantId(purchaseId, tenantId)
            .orElseThrow(() -> new PurchaseNotFoundException(purchaseId));
    }

    public record MemorialUsageSummary(
            long memorialsCreated,
            int creditsUsedForMemorials,
            double averageCreditsPerMemorial,
            LocalDateTime lastMemorialGenerationAt
    ) {}
}
