import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import creditService from '../services/creditService';
import type { 
  CreditBalance, 
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

import '../styles/Financial.css';

interface ErrorLike {
  message?: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ErrorLike).message || fallback;
  }

  return fallback;
};

const Financial: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados dos dados
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [purchases, setPurchases] = useState<CreditPurchaseResponse[]>([]);
  const [statistics, setStatistics] = useState<CreditStatistics | null>(null);

  // Estados de controle
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const tabs = [
    { id: 0, name: 'Minha Conta', icon: '📊', component: 'dashboard' },
    { id: 1, name: 'Meu Saldo', icon: '💰', component: 'balance' },
    { id: 2, name: 'Comprar', icon: '🛒', component: 'purchase' },
    { id: 3, name: 'Minhas Transações', icon: '📋', component: 'transactions' },
    { id: 4, name: 'Minhas Compras', icon: '🧾', component: 'purchases' },
    { id: 5, name: 'Estatísticas', icon: '📈', component: 'statistics' }
  ];

  // Verificar parâmetro de URL para aba inicial
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      const tabIndex = parseInt(tabParam);
      if (tabIndex >= 0 && tabIndex < tabs.length) {
        setCurrentTab(tabIndex);
      }
    }
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    loadAllData();
  }, [refreshTrigger]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar dados em paralelo
      const [balanceData, transactionsData, purchasesData, statisticsData] = await Promise.all([
        creditService.getBalance().catch(err => {
          console.error('❌ Erro ao carregar saldo:', err);
          return null;
        }),
        creditService.getTransactions().catch(err => {
          console.error('❌ Erro ao carregar transações:', err);
          return [];
        }),
        creditService.getPurchases().catch(err => {
          console.error('❌ Erro ao carregar compras:', err);
          return [];
        }),
        creditService.getStatistics().catch(err => {
          console.error('❌ Erro ao carregar estatísticas:', err);
          return null;
        })
      ]);

      setBalance(balanceData);
      setTransactions(transactionsData);
      setPurchases(purchasesData);
      setStatistics(statisticsData);

    } catch (error: unknown) {
      console.error('❌ Erro ao carregar dados financeiros:', error);
      setError(getErrorMessage(error, 'Erro ao carregar dados financeiros'));
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar dados após operações
  const handleDataUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Função para navegar entre abas
  const goToTab = (tabIndex: number) => {
    setCurrentTab(tabIndex);
  };

  // Renderizar conteúdo da aba atual
  const renderTabContent = () => {
    const currentTabData = tabs[currentTab];

    switch (currentTabData.component) {
      case 'dashboard':
        return (
          <CreditDashboard />
        );

      case 'balance':
        return (
          <CreditBalanceComponent
            balance={balance}
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
      <div className="financial-loading">
        <div className="loading-spinner">⏳</div>
        <p>Carregando dados financeiros...</p>
      </div>
    );
  }

  return (
    <div className="financial-container">
      {/* Header */}
      <div className="financial-header">
        <div className="header-content">
          <div className="header-top">
            <h1>💰 Minha Conta de Créditos</h1>
            <div className="user-info">
              <span>👤 {user?.fullName || user?.username || 'Usuário'}</span>
              {balance && (
                <div className="balance-badge">
                  <span className="balance-label">Saldo:</span>
                  <span className="balance-value">{balance.totalCredits} créditos</span>
                </div>
              )}
            </div>
          </div>
          
          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{error}</span>
              <button 
                className="error-retry"
                onClick={handleDataUpdate}
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="financial-tabs">
        <div className="tabs-navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${currentTab === tab.id ? 'active' : ''}`}
              onClick={() => goToTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-name">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo da Aba */}
      <div className="financial-content">
        <div className="tab-content">
          {renderTabContent()}
        </div>
      </div>

      {/* Footer com informações */}
      <div className="financial-footer">
        <div className="footer-info">
          <div className="info-item">
            <span className="info-icon">💡</span>
            <span className="info-text">
              Créditos são necessários para gerar memoriais descritivos
            </span>
          </div>
          <div className="info-item">
            <span className="info-icon">📋</span>
            <span className="info-text">
              1 lote = 1 crédito | 2-5 lotes = 3 créditos | 6+ lotes = 10 créditos
            </span>
          </div>
          <div className="info-item">
            <span className="info-icon">🔒</span>
            <span className="info-text">
              Todas as transações são seguras e criptografadas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Financial;
