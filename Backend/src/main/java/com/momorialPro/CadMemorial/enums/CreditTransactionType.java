package com.momorialPro.CadMemorial.enums;

/**
 * Tipos de transações de crédito no sistema
 * 
 * PURCHASE - Compra de créditos (adiciona ao saldo)
 * USE - Uso de créditos (subtrai do saldo)
 */
public enum CreditTransactionType {
    PURCHASE,
    USE
}