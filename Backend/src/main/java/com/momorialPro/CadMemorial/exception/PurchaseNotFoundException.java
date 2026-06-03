package com.momorialPro.CadMemorial.exception;

import java.util.UUID;

/**
 * Exceção lançada quando uma compra não é encontrada
 */
public class PurchaseNotFoundException extends RuntimeException {
    
    private final UUID purchaseId;
    
    public PurchaseNotFoundException(UUID purchaseId) {
        super(String.format("Compra não encontrada: %s", purchaseId));
        this.purchaseId = purchaseId;
    }
    
    public PurchaseNotFoundException(String message, UUID purchaseId) {
        super(message);
        this.purchaseId = purchaseId;
    }
    
    public UUID getPurchaseId() {
        return purchaseId;
    }
}