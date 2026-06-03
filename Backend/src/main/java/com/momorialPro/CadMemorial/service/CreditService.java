package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.model.CreditPurchase;
import com.momorialPro.CadMemorial.model.CreditTransaction;
import com.momorialPro.CadMemorial.model.UserCredits;
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
    public CreditPurchase startPurchase(UUID userId, int credits, BigDecimal amountReais) {
        // Validações básicas
        if (credits <= 0) {
            throw new IllegalArgumentException("Quantidade de créditos deve ser maior que zero");
        }
        if (amountReais.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Valor deve ser maior que zero");
        }
        
        // Cria nova compra
        CreditPurchase purchase = new CreditPurchase(
            userId, 
            amountReais, 
            credits, 
            "default"
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
        return userCreditsRepository.findByUserId(userId)
            .orElseGet(() -> {
                // Criar com saldo inicial de 25 créditos
                UserCredits newUserCredits = new UserCredits(userId, 25);
                UserCredits savedCredits = userCreditsRepository.save(newUserCredits);
                
                // Registrar transação de boas-vindas
                CreditTransaction welcomeTransaction = new CreditTransaction(
                    userId, 
                    CreditTransactionType.PURCHASE, 
                    25, 
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
                UserCredits fallbackCredits = new UserCredits();
                fallbackCredits.setUserId(userId);
                fallbackCredits.setTotalCredits(25);
                
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
        if (lotCount == 1) {
            return 1;           // 1 lote → 1 crédito
        } else if (lotCount <= 5) {
            return 3;           // até 5 lotes → 3 créditos  
        } else {
            return 10;          // desmembramento completo → 10 créditos
        }
    }

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
