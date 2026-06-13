import React, { useEffect, useMemo, useState } from 'react';
import creditService from '../../services/creditService';
import type { 
  CreditPackage,
  CreditPricingSettings,
  CreditPurchaseFormData, 
  CreditPurchaseFormValidation,
  CreditPurchaseResponse 
} from '../../types/credit';
import { PAYMENT_PROVIDERS } from '../../types/credit';

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
  const [pricingSettings, setPricingSettings] = useState<CreditPricingSettings | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [formData, setFormData] = useState<CreditPurchaseFormData>({
    credits: 10,
    amountReais: 25.00,
    paymentProvider: 'default'
  });

  const [validation, setValidation] = useState<CreditPurchaseFormValidation>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<CreditPurchaseResponse | null>(null);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        setLoadingPricing(true);
        const settings = await creditService.getPricingSettings();
        setPricingSettings(settings);

        const defaultPackage = settings.packages.find((pkg) => pkg.popular) || settings.packages[0];
        if (defaultPackage) {
          setSelectedPackage(defaultPackage.id);
          setFormData((prev) => ({
            ...prev,
            credits: defaultPackage.totalCredits,
            amountReais: defaultPackage.price,
          }));
        }
      } catch (error: unknown) {
        setValidation({ general: [getErrorMessage(error, 'Nao foi possivel carregar a tabela de creditos.')] });
      } finally {
        setLoadingPricing(false);
      }
    };

    void loadPricing();
  }, []);

  const packages = pricingSettings?.packages || [];
  const customPricePerCredit = pricingSettings?.customPricePerCredit || 0;
  const usageReference = useMemo(() => ({
    single: pricingSettings?.singleLotCreditCost || 1,
    small: pricingSettings?.smallProjectCreditCost || 3,
  }), [pricingSettings]);

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
    }

    if (!formData.paymentProvider) {
      newValidation.paymentProvider = 'Selecione uma forma de pagamento';
    }

    setValidation(newValidation);
    return Object.keys(newValidation).length === 0;
  };

  // Selecionar pacote pré-definido
  const selectPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg.id);
    setFormData(prev => ({
      ...prev,
      credits: pkg.totalCredits,
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
        packageId: selectedPackage || undefined,
        credits: selectedPackage ? undefined : formData.credits,
        amountReais: selectedPackage ? undefined : formData.amountReais,
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
      credits: packages[0]?.totalCredits || 10,
      amountReais: packages[0]?.price || (customPricePerCredit * 10),
      paymentProvider: 'default'
    });
    setSelectedPackage(packages[0]?.id || null);
    setPurchaseResult(null);
    setValidation({});
  };

  const updateCustomCredits = (credits: number) => {
    setSelectedPackage(null);
    setFormData(prev => ({
      ...prev,
      credits,
      amountReais: Number((credits * customPricePerCredit).toFixed(2)),
    }));
  };

  return (
    <div className="credit-purchase-container">
      <div className="purchase-header">
        <h2>🛒 Comprar Créditos para Minha Conta</h2>
        <p>Escolha um pacote pronto ou use a recarga personalizada com a tabela oficial do sistema.</p>
      </div>

      {loadingPricing ? (
        <div className="purchase-summary">
          <h4>Carregando tabela de creditos...</h4>
        </div>
      ) : (
        <>

      {/* Pacotes Pré-definidos */}
      <div className="packages-section">
        <h3>📦 Pacotes Recomendados</h3>
        <div className="packages-grid">
          {packages.map((pkg) => (
            <div 
              key={pkg.id}
              className={`package-card ${selectedPackage === pkg.id ? 'selected' : ''} ${pkg.popular ? 'popular' : ''}`}
              onClick={() => selectPackage(pkg)}
            >
              {pkg.popular && <div className="popular-badge">🌟 Mais Popular</div>}
              
              <div className="package-header">
                <div className="package-credits">
                  <span className="base-credits">{pkg.baseCredits}</span>
                  {pkg.bonusCredits > 0 && (
                    <span className="bonus-credits">+{pkg.bonusCredits} bônus</span>
                  )}
                  <span className="credits-label">créditos</span>
                </div>
                <div className="package-price">
                  {creditService.formatCurrency(pkg.price)}
                </div>
              </div>

              <div className="package-details">
                <div className="price-per-credit">
                  {creditService.formatCurrency(pkg.pricePerCredit)} por crédito
                </div>
                {pkg.bonusCredits > 0 && (
                  <div className="bonus-info">
                    🎁 {pkg.bonusCredits} créditos de bônus!
                  </div>
                )}
              </div>

              <div className="package-usage">
                <div className="usage-item">
                  <span>🏠 Lotes individuais:</span>
                  <span>{Math.floor(pkg.totalCredits / usageReference.single)} memoriais</span>
                </div>
                <div className="usage-item">
                  <span>🏘️ Projetos pequenos:</span>
                  <span>{Math.floor(pkg.totalCredits / usageReference.small)} memoriais</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulário Personalizado */}
      <div className="custom-purchase-section">
        <h3>⚙️ Compra Personalizada</h3>
        <p style={{ marginBottom: '1rem', color: '#64748b' }}>
          Valor unitario atual: {creditService.formatCurrency(customPricePerCredit)} por credito.
        </p>
        
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
                  updateCustomCredits(credits);
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
                className={validation.amountReais ? 'error' : ''}
                disabled
                readOnly
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
        </>
      )}

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
