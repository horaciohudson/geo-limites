package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.CreditBalanceDTO;
import com.momorialPro.CadMemorial.dto.CreditPurchaseRequestDTO;
import com.momorialPro.CadMemorial.dto.CreditPurchaseResponseDTO;
import com.momorialPro.CadMemorial.dto.CreditTransactionDTO;
import com.momorialPro.CadMemorial.model.CreditPurchase;
import com.momorialPro.CadMemorial.model.CreditTransaction;
import com.momorialPro.CadMemorial.model.UserCredits;
import com.momorialPro.CadMemorial.mapper.CreditMapper;
import com.momorialPro.CadMemorial.security.AuthUtils;
import com.momorialPro.CadMemorial.service.CreditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller REST para gerenciar créditos dos usuários
 * Endpoints para consulta de saldo, transações e compras
 */
@RestController
@RequestMapping("/api/credits")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
public class CreditController {

    private final CreditService creditService;
    private final CreditMapper creditMapper;

    /**
     * 1. GET /api/credits/balance
     * Retorna o saldo atual do usuário logado
     * NOVO: Inicializa automaticamente créditos se não existir
     */
    @GetMapping("/balance")
    public ResponseEntity<CreditBalanceDTO> getBalance() {
        try {
            UUID userId = AuthUtils.getCurrentUserId();

            // NOVO: Usar initializeUserCredits para garantir que o usuário tenha créditos
            UserCredits userCredits = creditService.initializeUserCredits(userId);
            CreditBalanceDTO balanceDTO = creditMapper.toBalanceDTO(userCredits);

            return ResponseEntity.ok(balanceDTO);
            
        } catch (Exception e) {
            log.error("❌ Erro ao consultar saldo: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(creditMapper.createEmptyBalance());
        }
    }

    /**
     * 2. GET /api/credits/transactions
     * Lista todas as transações do usuário logado
     */
    @GetMapping("/transactions")
    public ResponseEntity<List<CreditTransactionDTO>> getTransactions() {
        try {
            UUID userId = AuthUtils.getCurrentUserId();

            List<CreditTransaction> transactions = creditService.listTransactions(userId);
            List<CreditTransactionDTO> transactionDTOs = creditMapper.toTransactionDTOList(transactions);

            return ResponseEntity.ok(transactionDTOs);
            
        } catch (Exception e) {
            log.error("❌ Erro ao listar transações: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(List.of());
        }
    }

    /**
     * 3. POST /api/credits/purchase/start
     * Inicia uma compra de créditos
     */
    @PostMapping("/purchase/start")
    public ResponseEntity<CreditPurchaseResponseDTO> startPurchase(
            @Valid @RequestBody CreditPurchaseRequestDTO request) {
        try {
            UUID userId = AuthUtils.getCurrentUserId();

            CreditPurchase purchase = creditService.startPurchase(
                userId, 
                request.getCredits(), 
                request.getAmountReais()
            );
            
            CreditPurchaseResponseDTO responseDTO = creditMapper.toPurchaseResponseDTO(
                purchase, 
                "Compra iniciada com sucesso. Prossiga com o pagamento."
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(responseDTO);
            
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ Dados inválidos na compra: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
            
        } catch (Exception e) {
            log.error("❌ Erro ao iniciar compra: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 4. POST /api/credits/purchase/confirm/{id}
     * Confirma uma compra (chamado pelo webhook do gateway de pagamento)
     */
    @PostMapping("/purchase/confirm/{id}")
    public ResponseEntity<CreditPurchaseResponseDTO> confirmPurchase(@PathVariable UUID id) {
        try {
            creditService.confirmPurchase(id);
            
            // Busca a compra atualizada para retornar
            UUID userId = AuthUtils.getCurrentUserId();
            CreditPurchase purchase = creditService.getUserPurchase(id, userId);
            CreditPurchaseResponseDTO responseDTO = creditMapper.toPurchaseResponseDTO(
                purchase, 
                "Pagamento confirmado! Créditos adicionados ao seu saldo."
            );

            return ResponseEntity.ok(responseDTO);
            
        } catch (Exception e) {
            log.error("❌ Erro ao confirmar compra {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 5. POST /api/credits/purchase/fail/{id}
     * Marca uma compra como falha
     */
    @PostMapping("/purchase/fail/{id}")
    public ResponseEntity<CreditPurchaseResponseDTO> failPurchase(@PathVariable UUID id) {
        try {
            log.warn("❌ Marcando compra como falha - ID: {}", id);

            creditService.failPurchase(id);
            
            // Busca a compra atualizada para retornar
            UUID userId = AuthUtils.getCurrentUserId();
            CreditPurchase purchase = creditService.getUserPurchase(id, userId);
            CreditPurchaseResponseDTO responseDTO = creditMapper.toPurchaseResponseDTO(
                purchase, 
                "Pagamento falhou ou foi cancelado."
            );

            return ResponseEntity.ok(responseDTO);
            
        } catch (Exception e) {
            log.error("❌ Erro ao marcar compra como falha {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Endpoint adicional: GET /api/credits/purchases
     * Lista todas as compras do usuário
     */
    @GetMapping("/purchases")
    public ResponseEntity<List<CreditPurchaseResponseDTO>> getUserPurchases() {
        try {
            UUID userId = AuthUtils.getCurrentUserId();

            List<CreditPurchase> purchases = creditService.getUserPurchases(userId);
            List<CreditPurchaseResponseDTO> purchaseDTOs = purchases.stream()
                .map(creditMapper::toPurchaseResponseDTO)
                .toList();

            return ResponseEntity.ok(purchaseDTOs);
            
        } catch (Exception e) {
            log.error("❌ Erro ao listar compras: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(List.of());
        }
    }

    /**
     * Endpoint adicional: GET /api/credits/summary
     * Retorna resumo completo (saldo + últimas transações)
     */
    @GetMapping("/summary")
    public ResponseEntity<CreditSummaryDTO> getSummary() {
        try {
            UUID userId = AuthUtils.getCurrentUserId();

            UserCredits userCredits = creditService.getBalance(userId);
            List<CreditTransaction> recentTransactions = creditService.getRecentTransactions(userId);
            
            CreditSummaryDTO summary = new CreditSummaryDTO(
                creditMapper.toBalanceDTO(userCredits),
                creditMapper.toTransactionDTOList(recentTransactions)
            );

            return ResponseEntity.ok(summary);
            
        } catch (Exception e) {
            log.error("❌ Erro ao consultar resumo: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * NOVO: POST /api/credits/initialize
     * Inicializa créditos para o usuário (chamado no login/primeiro acesso)
     */
    @PostMapping("/initialize")
    public ResponseEntity<CreditBalanceDTO> initializeCredits() {
        try {
            UUID userId = AuthUtils.getCurrentUserId();

            UserCredits userCredits = creditService.initializeUserCredits(userId);
            CreditBalanceDTO balanceDTO = creditMapper.toBalanceDTO(userCredits);

            return ResponseEntity.ok(balanceDTO);
            
        } catch (Exception e) {
            log.error("❌ Erro ao inicializar créditos: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(creditMapper.createEmptyBalance());
        }
    }

    /**
     * DTO para resumo completo
     */
    public record CreditSummaryDTO(
        CreditBalanceDTO balance,
        List<CreditTransactionDTO> recentTransactions
    ) {}
}
