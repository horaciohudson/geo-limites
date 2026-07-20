import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import creditService from '../services/creditService';
import type { 
  CreditBalance, 
  CreditPricingSettings,
  CreditTransaction, 
  CreditPurchaseResponse,
  CreditStatistics 
} from '../types/credit';

// Componentes das abas
import CreditDashboard from '../components/financial/CreditDashboard';
import CreditBalanceComponent from '../components/financial/CreditBalance';
import CreditTransactions from '../components/financial/CreditTransactions';
import CreditPurchases from '../components/financial/CreditPurchases';
import CreditStatisticsComponent from '../components/financial/CreditStatistics';
import CreditPurchaseForm from '../components/financial/CreditPurchaseForm';

interface ErrorLike {
  message?: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ErrorLike).message || fallback;
  }
  return fallback;
};

const UserAreaXOperacoes: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [purchases, setPurchases] = useState<CreditPurchaseResponse[]>([]);
  const [statistics, setStatistics] = useState<CreditStatistics | null>(null);
  const [pricingSettings, setPricingSettings] = useState<CreditPricingSettings | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const tabs = [
    { id: 0, name: 'Visao Geral', icon: '📊', component: 'dashboard', eyebrow: 'Panorama' },
    { id: 1, name: 'Saldo', icon: '💰', component: 'balance', eyebrow: 'Disponibilidade' },
    { id: 2, name: 'Recargas', icon: '🛒', component: 'purchase', eyebrow: 'Aquisicao' },
    { id: 3, name: 'Extrato', icon: '📋', component: 'transactions', eyebrow: 'Movimentacoes' },
    { id: 4, name: 'Pedidos', icon: '🧾', component: 'purchases', eyebrow: 'Solicitacoes' },
    { id: 5, name: 'Indicadores', icon: '📈', component: 'statistics', eyebrow: 'Desempenho' }
  ];

  useEffect(() => {
    loadAllData();
  }, [refreshTrigger]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [balanceData, transactionsData, purchasesData, statisticsData, pricingData] = await Promise.all([
        creditService.initializeCredits().catch(() => null),
        creditService.getTransactions().catch(() => []),
        creditService.getPurchases().catch(() => []),
        creditService.getStatistics().catch(() => null),
        creditService.getPricingSettings().catch(() => null),
      ]);

      setBalance(balanceData);
      setTransactions(transactionsData);
      setPurchases(purchasesData);
      setStatistics(statisticsData);
      setPricingSettings(pricingData);

    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Erro ao carregar dados operacionais'));
    } finally {
      setLoading(false);
    }
  };

  const handleDataUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const goToTab = (tabIndex: number) => {
    setCurrentTab(tabIndex);
  };

  const currentTabData = tabs[currentTab];

  const renderTabContent = () => {
    switch (currentTabData.component) {
      case 'dashboard':
        return <CreditDashboard />;
      case 'balance':
        return (
          <CreditBalanceComponent
            balance={balance}
            pricingSettings={pricingSettings}
            onRefresh={handleDataUpdate}
            loading={loading}
          />
        );
      case 'purchase':
        return (
          <CreditPurchaseForm
            currentBalance={balance?.totalCredits || 0}
            onPurchaseComplete={handleDataUpdate}
          />
        );
      case 'transactions':
        return (
          <CreditTransactions
            transactions={transactions}
            onRefresh={handleDataUpdate}
            loading={loading}
          />
        );
      case 'purchases':
        return (
          <CreditPurchases
            purchases={purchases}
            onRefresh={handleDataUpdate}
            onStatusUpdate={handleDataUpdate}
            loading={loading}
          />
        );
      case 'statistics':
        return (
          <CreditStatisticsComponent
            statistics={statistics}
            balance={balance}
            onRefresh={handleDataUpdate}
            loading={loading}
          />
        );
      default:
        return <div>Aba não encontrada</div>;
    }
  };

  if (loading && !balance) {
    return (
      <div className="account-loading">
        <div className="loading-spinner">⏳</div>
        <p>Carregando dados operacionais...</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '-1rem' }}>
      {/* Navegação por Abas Internas */}
      <div className="account-tabs">
        <div className="tabs-navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${currentTab === tab.id ? 'active' : ''}`}
              onClick={() => goToTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-texts">
                <span className="tab-eyebrow">{tab.eyebrow}</span>
                <span className="tab-name">{tab.name}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo da Aba Interna */}
      <div className="account-content">
        <div className="account-section-intro">
          <div>
            <span className="account-section-eyebrow">{currentTabData.eyebrow}</span>
            <h2>{currentTabData.name}</h2>
          </div>
          <span className="account-section-badge">Aba {currentTab + 1} de {tabs.length}</span>
        </div>
        
        {error && (
          <div className="error-banner" style={{ marginBottom: '1rem' }}>
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button className="error-retry" onClick={handleDataUpdate}>
              Tentar Novamente
            </button>
          </div>
        )}

        <div className="tab-content">
          {renderTabContent()}
        </div>
      </div>

      {/* Footer com informações */}
      <div className="account-footer">
        <div className="footer-info">
          <div className="info-item">
            <span className="info-icon">🔒</span>
            <span className="info-text">
              Seus dados estão seguros e protegidos
            </span>
          </div>
          <div className="info-item">
            <span className="info-icon">💰</span>
            <span className="info-text">
              Créditos são necessários para gerar memoriais descritivos
            </span>
          </div>
          <div className="info-item">
            <span className="info-icon">📋</span>
            <span className="info-text">
              {pricingSettings
                ? `1 lote = ${pricingSettings.singleLotCreditCost} crédito(s) | 2-${pricingSettings.smallProjectMaxLots} lotes = ${pricingSettings.smallProjectCreditCost} crédito(s) | ${pricingSettings.smallProjectMaxLots + 1}+ lotes = ${pricingSettings.largeProjectCreditCost} crédito(s)`
                : '1 lote = 1 crédito | 2-5 lotes = 3 créditos | 6+ lotes = 10 créditos'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAreaXOperacoes;
