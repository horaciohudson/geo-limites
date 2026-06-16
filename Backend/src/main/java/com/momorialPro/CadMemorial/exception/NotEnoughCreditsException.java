package com.momorialPro.CadMemorial.exception;

/**
 * Exceção lançada quando o usuário não possui créditos suficientes
 */
public class NotEnoughCreditsException extends RuntimeException {
    
    private final int currentCredits;
    private final int requiredCredits;
    
    public NotEnoughCreditsException(String message) {
        super(message);
        this.currentCredits = 0;
        this.requiredCredits = 0;
    }
    
    public NotEnoughCreditsException(int currentCredits, int requiredCredits) {
        super(String.format("Créditos insuficientes. Saldo atual: %d, Necessário: %d", 
                          currentCredits, requiredCredits));
        this.currentCredits = currentCredits;
        this.requiredCredits = requiredCredits;
    }
    
    public NotEnoughCreditsException(String message, int currentCredits, int requiredCredits) {
        super(message);
        this.currentCredits = currentCredits;
        this.requiredCredits = requiredCredits;
    }
    
    public int getCurrentCredits() {
        return currentCredits;
    }
    
    public int getRequiredCredits() {
        return requiredCredits;
    }
    
    public int getMissingCredits() {
        return Math.max(0, requiredCredits - currentCredits);
    }
}