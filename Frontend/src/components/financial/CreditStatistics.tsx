import React, { useState } from 'react';
import creditService from '../../services/creditService';
import type { 
  CreditStatistics as CreditStatisticsType, 
  CreditBalance 
} from '../../types/credit';

interface CreditStatisticsProps {
  statistics: CreditStatisticsType | null;
  balance: CreditBalance | null;
  onRefresh: () => void;
  loading: boolean;
}

const CreditStatistics: React.FC<CreditStatisticsProps> = ({ 
  statistics, 
  balance, 
  onRefresh, 
  loading 
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Calcular métricas adicionais
  const calculateMetrics = () => {
    if (!statistics || !balance) return null;

    const efficiency = statistics.totalPurchased > 0 
      ? ((statistics.totalPurchased - statistics.totalUsed) / statistics.totalPurchased) * 100 
      : 0;

    const averageUsage = statistics.totalUsed > 0 && statistics.totalPurchased > 0
      ? statistics.totalUsed / (statistics.totalPurchased / 100) * 100
      : 0;

    return {
      efficiency: Math.max(0, efficiency),
      averageUsage,
      remainingCredits: balance.totalCredits,
      utilizationRate: statistics.totalPurchased > 0 
        ? (statistics.totalUsed / statistics.totalPurchased) * 100 
        : 0
    };
  };

  const metrics = calculateMetrics();

  if (loading && !statistics) {
    return (
      <div className="statistics-loading">
        <div className="loading-spinner">⏳</div>
        <p>Carregando estatísticas...</p>
      </div>
    );
  }

  if (!statistics || !balance) {
    return (
      <div className="statistics-empty">
        <div className="empty-icon">📈</div>
        <h3>Estatísticas Indisponíveis</h3>
        <p>Não foi possível carregar suas estatísticas pessoais.</p>
        <button className="btn-primary" onClick={handleRefresh}>
          🔄 Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="credit-statistics-container">
      {/* Header */}
      <div className="statistics-header">
        <div className="header-title">
          <h2>📈 Minhas Estatísticas</h2>
          <button 
            className={`refresh-button ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing}
            title="Atualizar estatísticas"
          >
            🔄
          </button>
        </div>
        <p className="header-subtitle">
          Análise completa do seu uso de créditos
        </p>
      </div>

      {/* Métricas Principais */}
      <div className="main-metrics">
        <div className="metric-card balance">
          <div className="metric-header">
            <span className="metric-icon">💰</span>
            <h3>Saldo Atual</h3>
          </div>
          <div className="metric-value">
            <span className="value-number">{balance.totalCredits}</span>
            <span className="value-unit">créditos</span>
          </div>
          <div className="metric-trend">
            {balance.totalCredits > 10 ? (
              <span className="trend positive">🟢 Saldo saudável</span>
            ) : balance.totalCredits > 5 ? (
              <span className="trend warning">🟡 Saldo baixo</span>
            ) : (
              <span className="trend negative">🔴 Saldo crítico</span>
            )}
          </div>
        </div>

        <div className="metric-card purchased">
          <div className="metric-header">
            <span className="metric-icon">🛒</span>
            <h3>Total Comprado</h3>
          </div>
          <div className="metric-value">
            <span className="value-number">{statistics.totalPurchased}</span>
            <span className="value-unit">créditos</span>
          </div>
          <div className="metric-detail">
            {creditService.formatCurrency(statistics.totalSpent)} gastos
          </div>
        </div>

        <div className="metric-card used">
          <div className="metric-header">
            <span className="metric-icon">📤</span>
            <h3>Total Usado</h3>
          </div>
          <div className="metric-value">
            <span className="value-number">{statistics.totalUsed}</span>
            <span className="value-unit">créditos</span>
          </div>
          <div className="metric-detail">
            {metrics && `${metrics.utilizationRate.toFixed(1)}% de utilização`}
          </div>
        </div>

        <div className="metric-card efficiency">
          <div className="metric-header">
            <span className="metric-icon">⚡</span>
            <h3>Eficiência</h3>
          </div>
          <div className="metric-value">
            <span className="value-number">
              {metrics ? metrics.efficiency.toFixed(1) : '0'}
            </span>
            <span className="value-unit">%</span>
          </div>
          <div className="metric-trend">
            {metrics && metrics.efficiency > 50 ? (
              <span className="trend positive">🟢 Boa eficiência</span>
            ) : metrics && metrics.efficiency > 20 ? (
              <span className="trend warning">🟡 Eficiência média</span>
            ) : (
              <span className="trend negative">🔴 Baixa eficiência</span>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos e Análises */}
      <div className="statistics-charts">
        {/* Distribuição de Uso */}
        <div className="chart-card">
          <h3>📊 Distribuição de Créditos</h3>
          <div className="distribution-chart">
            <div className="distribution-item">
              <div className="distribution-bar">
                <div 
                  className="bar-fill purchased"
                  style={{ 
                    width: `${statistics.totalPurchased > 0 ? 100 : 0}%` 
                  }}
                ></div>
              </div>
              <div className="distribution-label">
                <span className="label-text">Comprados</span>
                <span className="label-value">{statistics.totalPurchased}</span>
              </div>
            </div>

            <div className="distribution-item">
              <div className="distribution-bar">
                <div 
                  className="bar-fill used"
                  style={{ 
                    width: `${statistics.totalPurchased > 0 ? (statistics.totalUsed / statistics.totalPurchased) * 100 : 0}%` 
                  }}
                ></div>
              </div>
              <div className="distribution-label">
                <span className="label-text">Usados</span>
                <span className="label-value">{statistics.totalUsed}</span>
              </div>
            </div>

            <div className="distribution-item">
              <div className="distribution-bar">
                <div 
                  className="bar-fill remaining"
                  style={{ 
                    width: `${statistics.totalPurchased > 0 ? (balance.totalCredits / statistics.totalPurchased) * 100 : 0}%` 
                  }}
                ></div>
              </div>
              <div className="distribution-label">
                <span className="label-text">Restantes</span>
                <span className="label-value">{balance.totalCredits}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Análise Financeira */}
        <div className="chart-card">
          <h3>💳 Análise Financeira</h3>
          <div className="financial-analysis">
            <div className="analysis-item">
              <span className="analysis-label">Total Investido:</span>
              <span className="analysis-value">
                {creditService.formatCurrency(statistics.totalSpent)}
              </span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">Compra Média:</span>
              <span className="analysis-value">
                {creditService.formatCurrency(statistics.averagePurchase)}
              </span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">Custo por Crédito:</span>
              <span className="analysis-value">
                {statistics.totalPurchased > 0 
                  ? creditService.formatCurrency(statistics.totalSpent / statistics.totalPurchased)
                  : 'N/A'
                }
              </span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">Valor Restante:</span>
              <span className="analysis-value">
                {statistics.totalPurchased > 0 
                  ? creditService.formatCurrency((balance.totalCredits / statistics.totalPurchased) * statistics.totalSpent)
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Atividade */}
      <div className="activity-history">
        <h3>📅 Atividade Recente</h3>
        <div className="activity-grid">
          <div className="activity-item">
            <div className="activity-icon">🛒</div>
            <div className="activity-content">
              <div className="activity-title">Última Compra</div>
              <div className="activity-date">
                {statistics.lastPurchaseDate 
                  ? creditService.formatDate(statistics.lastPurchaseDate)
                  : 'Nenhuma compra realizada'
                }
              </div>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-icon">📤</div>
            <div className="activity-content">
              <div className="activity-title">Último Uso</div>
              <div className="activity-date">
                {statistics.lastUsageDate 
                  ? creditService.formatDate(statistics.lastUsageDate)
                  : 'Nenhum uso registrado'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recomendações */}
      <div className="recommendations">
        <h3>💡 Recomendações</h3>
        <div className="recommendations-list">
          {balance.totalCredits < 5 && (
            <div className="recommendation urgent">
              <span className="rec-icon">🚨</span>
              <div className="rec-content">
                <div className="rec-title">Saldo Crítico</div>
                <div className="rec-description">
                  Seu saldo está muito baixo. Considere comprar mais créditos para continuar usando o sistema.
                </div>
              </div>
              <button 
                className="rec-action"
                onClick={() => {
                  const event = new CustomEvent('navigateToTab', { detail: { tab: 1 } });
                  window.dispatchEvent(event);
                }}
              >
                Comprar Agora
              </button>
            </div>
          )}

          {metrics && metrics.efficiency < 30 && statistics.totalPurchased > 10 && (
            <div className="recommendation warning">
              <span className="rec-icon">⚠️</span>
              <div className="rec-content">
                <div className="rec-title">Baixa Eficiência</div>
                <div className="rec-description">
                  Você está usando muitos créditos rapidamente. Considere otimizar o uso ou comprar pacotes maiores.
                </div>
              </div>
            </div>
          )}

          {balance.totalCredits > 50 && (
            <div className="recommendation positive">
              <span className="rec-icon">🌟</span>
              <div className="rec-content">
                <div className="rec-title">Saldo Excelente</div>
                <div className="rec-description">
                  Você tem um ótimo saldo de créditos! Continue gerando memoriais sem preocupações.
                </div>
              </div>
            </div>
          )}

          {statistics.totalPurchased === 0 && (
            <div className="recommendation info">
              <span className="rec-icon">🎯</span>
              <div className="rec-content">
                <div className="rec-title">Primeira Compra</div>
                <div className="rec-description">
                  Faça sua primeira compra de créditos para começar a gerar memoriais descritivos.
                </div>
              </div>
              <button 
                className="rec-action"
                onClick={() => {
                  const event = new CustomEvent('navigateToTab', { detail: { tab: 1 } });
                  window.dispatchEvent(event);
                }}
              >
                Começar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditStatistics;