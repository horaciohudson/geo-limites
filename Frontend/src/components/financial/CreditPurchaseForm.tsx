import React, { useState } from 'react';
import creditService from '../../services/creditService';
import type { 
  CreditPurchaseFormData, 
  CreditPurchaseFormValidation,
  CreditPurchaseResponse 
} from '../../types/credit';
import { CREDIT_PACKAGES, PAYMENT_PROVIDERS } from '../../types/credit';

interface CreditPurchaseFormProps {
  currentBalance: number;
  onPurchaseComplete: () => void;
}

interface ErrorLike {
  message?: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ErrorLike).message || fallback;
  }

  return fallback;
};

const CreditPurchaseForm: React.FC<CreditPurchaseFormProps> = ({ 
  currentBalance, 
  onPurchaseComplete 
}) => {
  const [formData, setFormData] = useState<CreditPurchaseFormData>({
    credits: 10,
    amountReais: 25.00,
    paymentProvider: 'default'
  });

  const [validation, setValidation] = useState<CreditPurchaseFormValidation>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<CreditPurchaseResponse | null>(null);

  // Validar formulário
  const validateForm = (): boolean => {
    const newValidation: CreditPurchaseFormValidation = {};

    if (!formData.credits || formData.credits < 1) {
      newValidation.credits = 'Quantidade mínima é 1 crédito';
    } else if (formData.credits > 1000) {
      newValidation.credits = 'Quantidade máxima é 1000 créditos';
    }

    if (!formData.amountReais || formData.amountReais < 0.01) {
      newValidation.amountReais = 'Valor mínimo é R$ 0,01';
    } else if (formData.amountReais > 10000) {
      newValidation.amountReais = 'Valor máximo é R$ 10.000,00';
    }

    if (!formData.paymentProvider) {
      newValidation.paymentProvider = 'Selecione uma forma de pagamento';
    }

    setValidation(newValidation);
    return Object.keys(newValidation).length === 0;
  };

  // Selecionar pacote pré-definido
  const selectPackage = (packageIndex: number) => {
    const pkg = CREDIT_PACKAGES[packageIndex];
    const totalCredits = pkg.credits + pkg.bonus;
    
    setSelectedPackage(packageIndex);
    setFormData(prev => ({
      ...prev,
      credits: totalCredits,
      amountReais: pkg.price
    }));
    setPurchaseResult(null);
  };

  // Calcular preço por crédito
  const calculatePricePerCredit = (): number => {
    if (formData.credits <= 0) return 0;
    return formData.amountReais / formData.credits;
  };

  // Submeter compra
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await creditService.startPurchase({
        credits: formData.credits,
        amountReais: formData.amountReais,
        paymentProvider: formData.paymentProvider
      });

      setPurchaseResult(result);

      // Simular confirmação automática para desenvolvimento
      if (result.status === 'PENDING') {
        setTimeout(async () => {
          try {
            const confirmed = await creditService.confirmPurchase(result.id);
            setPurchaseResult(confirmed);
            onPurchaseComplete();
          } catch (error) {
            console.error('❌ Erro na confirmação simulada:', error);
          }
        }, 2000);
      }

    } catch (error: unknown) {
      console.error('❌ Erro ao iniciar compra:', error);
      setValidation({ 
        general: [getErrorMessage(error, 'Erro ao processar compra')] 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      credits: 10,
      amountReais: 25.00,
      paymentProvider: 'default'
    });
    setSelectedPackage(null);
    setPurchaseResult(null);
    setValidation({});
  };

  return (
    <div className="credit-purchase-container">
      <div className="purchase-header">
        <h2>🛒 Comprar Créditos para Minha Conta</h2>
        <p>Escolha um pacote ou personalize sua compra pessoal</p>
      </div>

      {/* Pacotes Pré-definidos */}
      <div className="packages-section">
        <h3>📦 Pacotes Recomendados</h3>
        <div className="packages-grid">
          {CREDIT_PACKAGES.map((pkg, index) => (
            <div 
              key={index}
              className={`package-card ${selectedPackage === index ? 'selected' : ''} ${pkg.popular ? 'popular' : ''}`}
              onClick={() => selectPackage(index)}
            >
              {pkg.popular && <div className="popular-badge">🌟 Mais Popular</div>}
              
              <div className="package-header">
                <div className="package-credits">
                  <span className="base-credits">{pkg.credits}</span>
                  {pkg.bonus > 0 && (
                    <span className="bonus-credits">+{pkg.bonus} bônus</span>
                  )}
                  <span className="credits-label">créditos</span>
                </div>
                <div className="package-price">
                  {creditService.formatCurrency(pkg.price)}
                </div>
              </div>

              <div className="package-details">
                <div className="price-per-credit">
                  {creditService.formatCurrency(pkg.price / (pkg.credits + pkg.bonus))} por crédito
                </div>
                {pkg.bonus > 0 && (
                  <div className="bonus-info">
                    🎁 {pkg.bonus} créditos de bônus!
                  </div>
                )}
              </div>

              <div className="package-usage">
                <div className="usage-item">
                  <span>🏠 Lotes individuais:</span>
                  <span>{pkg.credits + pkg.bonus} memoriais</span>
                </div>
                <div className="usage-item">
                  <span>🏘️ Projetos pequenos:</span>
                  <span>{Math.floor((pkg.credits + pkg.bonus) / 3)} memoriais</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulário Personalizado */}
      <div className="custom-purchase-section">
        <h3>⚙️ Compra Personalizada</h3>
        
        <form onSubmit={handleSubmit} className="purchase-form">
          <div className="form-grid">
            {/* Quantidade de Créditos */}
            <div className="form-group">
              <label htmlFor="credits">
                Quantidade de Créditos
                <span className="required">*</span>
              </label>
              <input
                type="number"
                id="credits"
                min="1"
                max="1000"
                value={formData.credits}
                onChange={(e) => {
                  const credits = parseInt(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, credits }));
                  setSelectedPackage(null);
                }}
                className={validation.credits ? 'error' : ''}
                disabled={isSubmitting}
              />
              {validation.credits && (
                <span className="error-message">{validation.credits}</span>
              )}
            </div>

            {/* Valor em Reais */}
            <div className="form-group">
              <label htmlFor="amountReais">
                Valor (R$)
                <span className="required">*</span>
              </label>
              <input
                type="number"
                id="amountReais"
                min="0.01"
                max="10000"
                step="0.01"
                value={formData.amountReais}
                onChange={(e) => {
                  const amountReais = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, amountReais }));
                  setSelectedPackage(null);
                }}
                className={validation.amountReais ? 'error' : ''}
                disabled={isSubmitting}
              />
              {validation.amountReais && (
                <span className="error-message">{validation.amountReais}</span>
              )}
            </div>

            {/* Forma de Pagamento */}
            <div className="form-group full-width">
              <label htmlFor="paymentProvider">
                Forma de Pagamento
                <span className="required">*</span>
              </label>
              <select
                id="paymentProvider"
                value={formData.paymentProvider}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  paymentProvider: e.target.value 
                }))}
                className={validation.paymentProvider ? 'error' : ''}
                disabled={isSubmitting}
              >
                {PAYMENT_PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
              {validation.paymentProvider && (
                <span className="error-message">{validation.paymentProvider}</span>
              )}
            </div>
          </div>

          {/* Resumo da Compra */}
          <div className="purchase-summary">
            <h4>📋 Resumo da Compra</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Créditos:</span>
                <span className="value">{formData.credits}</span>
              </div>
              <div className="summary-item">
                <span className="label">Valor Total:</span>
                <span className="value">{creditService.formatCurrency(formData.amountReais)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Preço por Crédito:</span>
                <span className="value">{creditService.formatCurrency(calculatePricePerCredit())}</span>
              </div>
              <div className="summary-item">
                <span className="label">Saldo Atual:</span>
                <span className="value">{currentBalance} créditos</span>
              </div>
              <div className="summary-item highlight">
                <span className="label">Saldo Após Compra:</span>
                <span className="value">{currentBalance + formData.credits} créditos</span>
              </div>
            </div>
          </div>

          {/* Erros Gerais */}
          {validation.general && validation.general.length > 0 && (
            <div className="form-errors">
              {validation.general.map((error, index) => (
                <div key={index} className="error-message">
                  ⚠️ {error}
                </div>
              ))}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={resetForm}
              disabled={isSubmitting}
            >
              🔄 Limpar
            </button>
            
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || formData.credits <= 0 || formData.amountReais <= 0}
            >
              {isSubmitting ? (
                <>
                  <span className="loading-spinner">⏳</span>
                  Processando...
                </>
              ) : (
                <>
                  💳 Comprar {formData.credits} Créditos
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Resultado da Compra */}
      {purchaseResult && (
        <div className="purchase-result">
          <div className={`result-card ${purchaseResult.status.toLowerCase()}`}>
            <div className="result-header">
              <span className="result-icon">
                {creditService.getPurchaseStatusIcon(purchaseResult.status)}
              </span>
              <h4>{creditService.getPurchaseStatusText(purchaseResult.status)}</h4>
            </div>
            
            <div className="result-content">
              <p>{purchaseResult.message}</p>
              
              <div className="result-details">
                <div className="detail-item">
                  <span className="label">ID da Compra:</span>
                  <span className="value">{purchaseResult.id}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Créditos:</span>
                  <span className="value">{purchaseResult.creditsPurchased}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Valor:</span>
                  <span className="value">{creditService.formatCurrency(purchaseResult.amountReais)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Data:</span>
                  <span className="value">{creditService.formatDate(purchaseResult.createdAt)}</span>
                </div>
              </div>

              {purchaseResult.status === 'PAID' && (
                <div className="success-actions">
                  <button 
                    className="btn-primary"
                    onClick={() => window.location.href = '/files'}
                  >
                    🚀 Gerar Memorial Agora
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditPurchaseForm;
