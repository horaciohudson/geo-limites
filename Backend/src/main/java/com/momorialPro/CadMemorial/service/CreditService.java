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
import java.util.List;
import java.util.UUID;

/**
 * Service para gerenciar créditos dos usuários
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
     * 1. Verifica se o usuário possui créditos suficientes
     */
    public boolean hasEnoughCredits(UUID userId, int requiredCredits) {
        UserCredits userCredits = findOrCreateUserCredits(userId);
        return userCredits.hasEnoughCredits(requiredCredits);
    }

    /**
     * 2. Consome créditos do usuário
     */
    @Transactional
    public void consumeCredits(UUID userId, int amount) {
        UserCredits userCredits = findOrCreateUserCredits(userId);
        
        // Valida saldo antes de consumir
        if (!userCredits.hasEnoughCredits(amount)) {
            throw new NotEnoughCreditsException(userCredits.getTotalCredits(), amount);
        }
        
        // Subtrai créditos
        userCredits.subtractCredits(amount);
        userCreditsRepository.save(userCredits);
        
        // Registra transação
        CreditTransaction transaction = new CreditTransaction(
            userId, 
            CreditTransactionType.USE, 
            amount, 
            "Créditos consumidos pelo sistema"
        );
        transactionRepository.save(transaction);
    }

    /**
     * 3. Adiciona créditos ao usuário
     */
    @Transactional
    public void addCredits(UUID userId, int amount, String description) {
        UserCredits userCredits = findOrCreateUserCredits(userId);
        
        // Adiciona créditos
        userCredits.addCredits(amount);
        userCreditsRepository.save(userCredits);
        
        // Registra transação
        CreditTransaction transaction = new CreditTransaction(
            userId, 
            CreditTransactionType.PURCHASE, 
            amount, 
            description
        );
        transactionRepository.save(transaction);
    }

    /**
     * 4. Obtém o saldo atual do usuário
     */
    public UserCredits getBalance(UUID userId) {
        return findOrCreateUserCredits(userId);
    }

    /**
     * 5. Lista todas as transações do usuário
     */
    public List<CreditTransaction> listTransactions(UUID userId) {
        return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * 6. Inicia uma compra de créditos
     */
    @Transactional
    public CreditPurchase startPurchase(UUID userId, String packageId, Integer credits, BigDecimal amountReais, String paymentProvider) {
        CreditPurchaseDraft purchaseDraft = resolvePurchaseDraft(packageId, credits, amountReais);

        CreditPurchase purchase = new CreditPurchase(
            userId, 
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
        
        // Adiciona créditos ao usuário
        addCredits(
            purchase.getUserId(), 
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
     * Método auxiliar: Busca ou cria registro de créditos do usuário
     * NOVO: Cria com saldo inicial de 50 créditos para novos usuários
     */
    private UserCredits findOrCreateUserCredits(UUID userId) {
        CreditPricingSettings pricingSettings = creditPricingSettingsService.getOrCreateEntity();
        int welcomeCredits = pricingSettings.getWelcomeCredits();

        return userCreditsRepository.findByUserId(userId)
            .orElseGet(() -> {
                UserCredits newUserCredits = new UserCredits(userId, welcomeCredits);
                UserCredits savedCredits = userCreditsRepository.save(newUserCredits);
                
                CreditTransaction welcomeTransaction = new CreditTransaction(
                    userId, 
                    CreditTransactionType.PURCHASE, 
                    welcomeCredits,
                    "Créditos de boas-vindas - Novo usuário"
                );
                transactionRepository.save(welcomeTransaction);
                return savedCredits;
            });
    }

    /**
     * NOVO: Inicializa créditos para usuário (chamado no login/primeiro acesso)
     * Garante que todo usuário tenha registro de créditos
     */
    @Transactional
    public UserCredits initializeUserCredits(UUID userId) {
        try {
            return findOrCreateUserCredits(userId);
        } catch (Exception e) {
            log.error("❌ Erro ao inicializar créditos para usuário {}: {}", userId, e.getMessage());
            
            // Fallback: tentar criar manualmente
            try {
                int welcomeCredits = creditPricingSettingsService.getOrCreateEntity().getWelcomeCredits();
                UserCredits fallbackCredits = new UserCredits();
                fallbackCredits.setUserId(userId);
                fallbackCredits.setTotalCredits(welcomeCredits);
                
                UserCredits saved = userCreditsRepository.save(fallbackCredits);
                return saved;
                
            } catch (Exception fallbackError) {
                log.error("❌ Falha total na criação de créditos: {}", fallbackError.getMessage());
                throw new RuntimeException("Não foi possível inicializar créditos para o usuário", fallbackError);
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
    public int getCurrentBalance(UUID userId) {
        return userCreditsRepository.findTotalCreditsByUserId(userId).orElse(0);
    }

    /**
     * Método auxiliar: Lista últimas transações (otimizado)
     */
    public List<CreditTransaction> getRecentTransactions(UUID userId) {
        return transactionRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Método auxiliar: Busca compras do usuário
     */
    public List<CreditPurchase> getUserPurchases(UUID userId) {
        return purchaseRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Método auxiliar: Busca compra específica do usuário (com segurança)
     */
    public CreditPurchase getUserPurchase(UUID purchaseId, UUID userId) {
        return purchaseRepository.findByIdAndUserId(purchaseId, userId)
            .orElseThrow(() -> new PurchaseNotFoundException(purchaseId));
    }
}
