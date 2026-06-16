package com.momorialPro.CadMemorial.enums;

/**
 * Status das compras de crédito
 * 
 * PENDING - Compra iniciada, aguardando pagamento
 * PAID - Pagamento confirmado, créditos adicionados
 * FAILED - Pagamento falhou ou foi cancelado
 */
public enum CreditPurchaseStatus {
    PENDING,
    PAID,
    FAILED
}