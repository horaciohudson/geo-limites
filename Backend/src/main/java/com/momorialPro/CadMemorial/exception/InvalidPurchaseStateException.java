package com.momorialPro.CadMemorial.exception;

import com.momorialPro.CadMemorial.enums.CreditPurchaseStatus;

import java.util.UUID;

/**
 * Exceção lançada quando uma operação é tentada em uma compra com status inválido
 */
public class InvalidPurchaseStateException extends RuntimeException {
    
    private final UUID purchaseId;
    private final CreditPurchaseStatus currentStatus;
    private final CreditPurchaseStatus expectedStatus;
    
    public InvalidPurchaseStateException(UUID purchaseId, CreditPurchaseStatus currentStatus, 
                                       CreditPurchaseStatus expectedStatus) {
        super(String.format("Estado inválido da compra %s. Estado atual: %s, Esperado: %s", 
                          purchaseId, currentStatus, expectedStatus));
        this.purchaseId = purchaseId;
        this.currentStatus = currentStatus;
        this.expectedStatus = expectedStatus;
    }
    
    public InvalidPurchaseStateException(String message, UUID purchaseId, 
                                       CreditPurchaseStatus currentStatus) {
        super(message);
        this.purchaseId = purchaseId;
        this.currentStatus = currentStatus;
        this.expectedStatus = null;
    }
    
    public UUID getPurchaseId() {
        return purchaseId;
    }
    
    public CreditPurchaseStatus getCurrentStatus() {
        return currentStatus;
    }
    
    public CreditPurchaseStatus getExpectedStatus() {
        return expectedStatus;
    }
}