package com.momorialPro.CadMemorial.mapper;

import com.momorialPro.CadMemorial.dto.CreditBalanceDTO;
import com.momorialPro.CadMemorial.dto.CreditPurchaseResponseDTO;
import com.momorialPro.CadMemorial.dto.CreditTransactionDTO;
import com.momorialPro.CadMemorial.model.CreditPurchase;
import com.momorialPro.CadMemorial.model.CreditTransaction;
import com.momorialPro.CadMemorial.model.UserCredits;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Mapper para conversão entre Entities e DTOs do módulo de créditos
 */
@Component
public class CreditMapper {

    /**
     * Converte UserCredits para CreditBalanceDTO
     */
    public CreditBalanceDTO toBalanceDTO(UserCredits userCredits) {
        if (userCredits == null) {
            return new CreditBalanceDTO(0);
        }
        
        return new CreditBalanceDTO(
            userCredits.getUserId(),
            userCredits.getTotalCredits(),
            userCredits.getUpdatedAt()
        );
    }

    /**
     * Converte CreditTransaction para CreditTransactionDTO
     */
    public CreditTransactionDTO toTransactionDTO(CreditTransaction transaction) {
        if (transaction == null) {
            return null;
        }
        
        return new CreditTransactionDTO(
            transaction.getId(),
            transaction.getType(),
            transaction.getAmount(),
            transaction.getDescription(),
            transaction.getCreatedAt()
        );
    }

    /**
     * Converte lista de CreditTransaction para lista de CreditTransactionDTO
     */
    public List<CreditTransactionDTO> toTransactionDTOList(List<CreditTransaction> transactions) {
        if (transactions == null) {
            return List.of();
        }
        
        return transactions.stream()
                .map(this::toTransactionDTO)
                .collect(Collectors.toList());
    }

    /**
     * Converte CreditPurchase para CreditPurchaseResponseDTO
     */
    public CreditPurchaseResponseDTO toPurchaseResponseDTO(CreditPurchase purchase) {
        if (purchase == null) {
            return null;
        }
        
        return new CreditPurchaseResponseDTO(
            purchase.getId(),
            purchase.getCreditsPurchased(),
            purchase.getAmountReais(),
            purchase.getPaymentProvider(),
            purchase.getStatus(),
            purchase.getCreatedAt(),
            generatePurchaseMessage(purchase)
        );
    }

    /**
     * Converte CreditPurchase para CreditPurchaseResponseDTO com mensagem customizada
     */
    public CreditPurchaseResponseDTO toPurchaseResponseDTO(CreditPurchase purchase, String customMessage) {
        CreditPurchaseResponseDTO dto = toPurchaseResponseDTO(purchase);
        if (dto != null) {
            dto.setMessage(customMessage);
        }
        return dto;
    }

    /**
     * Gera mensagem baseada no status da compra
     */
    private String generatePurchaseMessage(CreditPurchase purchase) {
        return switch (purchase.getStatus()) {
            case PENDING -> "Compra iniciada. Aguardando confirmação do pagamento.";
            case PAID -> "Pagamento confirmado. Créditos adicionados ao seu saldo.";
            case FAILED -> "Pagamento falhou ou foi cancelado.";
        };
    }

    /**
     * Cria CreditBalanceDTO com saldo zero para usuário novo
     */
    public CreditBalanceDTO createEmptyBalance() {
        return new CreditBalanceDTO(0);
    }
}