import React, { useState } from 'react';
import creditService from '../../services/creditService';
import type { CreditBalance as CreditBalanceType } from '../../types/credit';

interface CreditBalanceProps {
  balance: CreditBalanceType | null;
  onRefresh: () => void;
  loading: boolean;
}

const CreditBalance: React.FC<CreditBalanceProps> = ({ balance, onRefresh, loading }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay
      onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const getBalanceStatus = () => {
    if (!balance) return { status: 'unknown', message: 'Carregando...', color: '#6c757d' };
    
    const credits = balance.totalCredits;
    
    if (credits >= 50) {
      return { 
        status: 'excellent', 
        message: 'Saldo excelente! Você pode gerar muitos memoriais.', 
        color: '#28a745' 
      };
    } else if (credits >= 20) {
      return { 
        status: 'good', 
        message: 'Bom saldo de créditos.', 
        color: '#17a2b8' 
      };
    } else if (credits >= 5) {
      return { 
        status: 'low', 
        message: 'Saldo baixo. Considere comprar mais créditos.', 
        color: '#ffc107' 
      };
    } else {
      return { 
        status: 'critical', 
        message: 'Saldo crítico! Compre créditos para continuar.', 
        color: '#dc3545' 
      };
    }
  };

  const balanceStatus = getBalanceStatus();

  if (loading && !balance) {
    return (
      <div className="balance-loading">
        <div className="loading-spinner">⏳</div>
        <p>Carregando saldo...</p>
      </div>
    );
  }

  return (
    <div className="credit-balance-container">
      {/* Card Principal do Saldo */}
      <div className="balance-main-card">
        <div className="balance-header">
          <div className="balance-title">
            <h2>💰 Seu Saldo de Créditos</h2>
            <button 
              className={`refresh-button ${refreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              disabled={refreshing}
              title="Atualizar saldo"
            >
              🔄
            </button>
          </div>
          {balance?.lastUpdated && (
            <p className="last-updated">
              Última atualização: {creditService.formatDate(balance.lastUpdated)}
            </p>
          )}
        </div>

        <div className="balance-display">
          <div className="balance-amount">
            <span className="balance-number">{balance?.totalCredits || 0}</span>
            <span className="balance-unit">créditos</span>
          </div>
          
          <div 
            className="balance-status"
            style={{ color: balanceStatus.color }}
          >
            <span className="status-icon">
              {balanceStatus.status === 'excellent' && '🌟'}
              {balanceStatus.status === 'good' && '👍'}
              {balanceStatus.status === 'low' && '⚠️'}
              {balanceStatus.status === 'critical' && '🚨'}
              {balanceStatus.status === 'unknown' && '❓'}
            </span>
            <span className="status-message">{balanceStatus.message}</span>
          </div>
        </div>
      </div>

      {/* Cards de Informações */}
      <div className="balance-info-grid">
        {/* Uso de Créditos */}
        <div className="info-card">
          <div className="card-header">
            <h3>📊 Como Usar Créditos</h3>
          </div>
          <div className="card-content">
            <div className="usage-rules">
              <div className="usage-rule">
                <span className="rule-icon">🏠</span>
                <span className="rule-text">1 lote = 1 crédito</span>
              </div>
              <div className="usage-rule">
                <span className="rule-icon">🏘️</span>
                <span className="rule-text">2-5 lotes = 3 créditos</span>
              </div>
              <div className="usage-rule">
                <span className="rule-icon">🏙️</span>
                <span className="rule-text">6+ lotes = 10 créditos</span>
              </div>
            </div>
            <div className="usage-note">
              <p>💡 Os créditos são consumidos automaticamente ao gerar memoriais descritivos.</p>
            </div>
          </div>
        </div>

        {/* Estimativa de Uso */}
        <div className="info-card">
          <div className="card-header">
            <h3>🎯 Estimativa de Uso</h3>
          </div>
          <div className="card-content">
            <div className="usage-estimates">
              {balance && (
                <>
                  <div className="estimate-item">
                    <span className="estimate-label">Lotes individuais:</span>
                    <span className="estimate-value">{balance.totalCredits} memoriais</span>
                  </div>
                  <div className="estimate-item">
                    <span className="estimate-label">Projetos pequenos (3 créditos):</span>
                    <span className="estimate-value">{Math.floor(balance.totalCredits / 3)} memoriais</span>
                  </div>
                  <div className="estimate-item">
                    <span className="estimate-label">Projetos grandes (10 créditos):</span>
                    <span className="estimate-value">{Math.floor(balance.totalCredits / 10)} memoriais</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="info-card">
          <div className="card-header">
            <h3>⚡ Ações Rápidas</h3>
          </div>
          <div className="card-content">
            <div className="quick-actions">
              <button 
                className="quick-action-btn purchase"
                onClick={() => {
                  // Navegar para aba de compra
                  const event = new CustomEvent('navigateToTab', { detail: { tab: 1 } });
                  window.dispatchEvent(event);
                }}
              >
                <span className="action-icon">🛒</span>
                <span className="action-text">Comprar Créditos</span>
              </button>
              
              <button 
                className="quick-action-btn transactions"
                onClick={() => {
                  // Navegar para aba de transações
                  const event = new CustomEvent('navigateToTab', { detail: { tab: 2 } });
                  window.dispatchEvent(event);
                }}
              >
                <span className="action-icon">📊</span>
                <span className="action-text">Ver Transações</span>
              </button>
              
              <button 
                className="quick-action-btn memorial"
                onClick={() => {
                  // Navegar para geração de memorial
                  window.location.href = '/files';
                }}
              >
                <span className="action-icon">📋</span>
                <span className="action-text">Gerar Memorial</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas e Avisos */}
      {balance && balance.totalCredits < 5 && (
        <div className="balance-alert critical">
          <div className="alert-content">
            <span className="alert-icon">🚨</span>
            <div className="alert-text">
              <h4>Saldo Baixo!</h4>
              <p>
                Você tem apenas {balance.totalCredits} créditos restantes. 
                Compre mais créditos para continuar gerando memoriais.
              </p>
            </div>
            <button 
              className="alert-action"
              onClick={() => {
                const event = new CustomEvent('navigateToTab', { detail: { tab: 1 } });
                window.dispatchEvent(event);
              }}
            >
              Comprar Agora
            </button>
          </div>
        </div>
      )}

      {balance && balance.totalCredits === 0 && (
        <div className="balance-alert emergency">
          <div className="alert-content">
            <span className="alert-icon">⛔</span>
            <div className="alert-text">
              <h4>Sem Créditos!</h4>
              <p>
                Você não possui créditos. Compre créditos para poder gerar memoriais descritivos.
              </p>
            </div>
            <button 
              className="alert-action emergency"
              onClick={() => {
                const event = new CustomEvent('navigateToTab', { detail: { tab: 1 } });
                window.dispatchEvent(event);
              }}
            >
              Comprar Créditos
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditBalance;