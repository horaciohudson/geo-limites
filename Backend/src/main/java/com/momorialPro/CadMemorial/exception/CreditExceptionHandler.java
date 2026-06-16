package com.momorialPro.CadMemorial.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Handler global para exceções relacionadas ao sistema de créditos
 */
@RestControllerAdvice
@Slf4j
public class CreditExceptionHandler {

    /**
     * Handler para créditos insuficientes
     */
    @ExceptionHandler(NotEnoughCreditsException.class)
    public ResponseEntity<Map<String, Object>> handleNotEnoughCredits(NotEnoughCreditsException e) {
        log.warn("💰 Créditos insuficientes: {}", e.getMessage());
        
        Map<String, Object> response = Map.of(
            "error", "INSUFFICIENT_CREDITS",
            "message", e.getMessage(),
            "currentCredits", e.getCurrentCredits(),
            "requiredCredits", e.getRequiredCredits(),
            "missingCredits", e.getMissingCredits(),
            "timestamp", LocalDateTime.now(),
            "suggestion", "Compre mais créditos para continuar usando o sistema"
        );
        
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(response);
    }

    /**
     * Handler para compra não encontrada
     */
    @ExceptionHandler(PurchaseNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handlePurchaseNotFound(PurchaseNotFoundException e) {
        log.warn("🛒 Compra não encontrada: {}", e.getMessage());
        
        Map<String, Object> response = Map.of(
            "error", "PURCHASE_NOT_FOUND",
            "message", e.getMessage(),
            "purchaseId", e.getPurchaseId().toString(),
            "timestamp", LocalDateTime.now()
        );
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    /**
     * Handler para estado inválido da compra
     */
    @ExceptionHandler(InvalidPurchaseStateException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidPurchaseState(InvalidPurchaseStateException e) {
        log.warn("⚠️ Estado inválido da compra: {}", e.getMessage());
        
        Map<String, Object> response = Map.of(
            "error", "INVALID_PURCHASE_STATE",
            "message", e.getMessage(),
            "purchaseId", e.getPurchaseId().toString(),
            "currentStatus", e.getCurrentStatus().toString(),
            "timestamp", LocalDateTime.now()
        );
        
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    /**
     * Handler genérico para outras exceções de crédito
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException e) {
        log.warn("⚠️ Argumento inválido: {}", e.getMessage());
        
        Map<String, Object> response = Map.of(
            "error", "INVALID_ARGUMENT",
            "message", e.getMessage(),
            "timestamp", LocalDateTime.now()
        );
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }
}