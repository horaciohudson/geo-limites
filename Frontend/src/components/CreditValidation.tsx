import React, { useState, useEffect } from 'react';
import { useCreditContext } from '../contexts/CreditContext';

interface CreditValidationProps {
  requiredCredits: number;
  lotCount?: number;
  onValidationChange?: (isValid: boolean, message: string) => void;
  showDetails?: boolean;
  className?: string;
}

const CreditValidation: React.FC<CreditValidationProps> = ({
  requiredCredits,
  lotCount,
  onValidationChange,
  showDetails = true,
  className = ''
}) => {
  const { currentBalance, hasEnoughCredits, loading } = useCreditContext();
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | 'loading'>('loading');

  useEffect(() => {
    if (loading) {
      setValidationStatus('loading');
      setValidationMessage('Verificando saldo...');
      return;
    }

    const isValid = hasEnoughCredits(requiredCredits);
    setValidationStatus(isValid ? 'valid' : 'invalid');

    let message = '';
    if (isValid) {
      const remaining = currentBalance - requiredCredits;
      message = `✅ Créditos suficientes! Restará ${remaining} crédito${remaining !== 1 ? 's' : ''} após a operação.`;
    } else {
      const missing = requiredCredits - currentBalance;
      message = `❌ Créditos insuficientes! Faltam ${missing} crédito${missing !== 1 ? 's' : ''}.`;
    }

    setValidationMessage(message);
    onValidationChange?.(isValid, message);
  }, [currentBalance, requiredCredits, hasEnoughCredits, loading, onValidationChange]);



  const getStatusIcon = () => {
    switch (validationStatus) {
      case 'valid': return '✅';
      case 'invalid': return '❌';
      case 'loading': return '⏳';
      default: return '❓';
    }
  };

  const handlePurchaseCredits = () => {
    window.location.href = '/my-account?tab=3'; // Navegar para aba de compra
  };

  if (!showDetails && validationStatus === 'valid') {
    return null; // Não mostrar nada se válido e detalhes desabilitados
  }

  return (
    <div className={`credit-validation ${validationStatus} ${className}`}>
      <div className="validation-content">
        <span className="validation-icon">{getStatusIcon()}</span>
        <div className="validation-text">
          <p className="validation-message">{validationMessage}</p>
          {showDetails && (
            <div className="validation-details">
              <div className="detail-item">
                <span className="label">Saldo atual:</span>
                <span className="value">{currentBalance} créditos</span>
              </div>
              <div className="detail-item">
                <span className="label">Necessário:</span>
                <span className="value">{requiredCredits} créditos</span>
              </div>
              {lotCount && (
                <div className="detail-item">
                  <span className="label">Lotes:</span>
                  <span className="value">{lotCount}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {validationStatus === 'invalid' && (
        <div className="validation-actions">
          <button 
            onClick={handlePurchaseCredits}
            className="purchase-credits-btn"
          >
            💰 Comprar Créditos
          </button>
        </div>
      )}
      
      <style>{`
        .credit-validation {
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
          border: 1px solid;
          transition: all 0.3s ease;
        }
        
        .credit-validation.valid {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border-color: #16a34a;
          color: #15803d;
        }
        
        .credit-validation.invalid {
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          border-color: #dc2626;
          color: #dc2626;
        }
        
        .credit-validation.loading {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-color: #6b7280;
          color: #6b7280;
        }
        
        .validation-content {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        
        .validation-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .validation-text {
          flex: 1;
        }
        
        .validation-message {
          font-weight: 600;
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
        }
        
        .validation-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
          opacity: 0.8;
        }
        
        .detail-item .label {
          font-weight: 500;
        }
        
        .detail-item .value {
          font-weight: 600;
        }
        
        .validation-actions {
          margin-top: 1rem;
          text-align: center;
        }
        
        .purchase-credits-btn {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .purchase-credits-btn:hover {
          background: linear-gradient(135deg, #b91c1c, #991b1b);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }
        
        @media (max-width: 768px) {
          .credit-validation {
            padding: 0.75rem;
          }
          
          .validation-content {
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .validation-icon {
            align-self: center;
          }
          
          .detail-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CreditValidation;