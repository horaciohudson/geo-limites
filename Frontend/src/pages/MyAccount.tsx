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
import UserProfile from '../components/account/UserProfile';

import '../styles/MyAccount.css';

interface ErrorLike {
  message?: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ErrorLike).message || fallback;
  }

  return fallback;
};

const MyAccount: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados dos dados
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [purchases, setPurchases] = useState<CreditPurchaseResponse[]>([]);
  const [statistics, setStatistics] = useState<CreditStatistics | null>(null);
  const [pricingSettings, setPricingSettings] = useState<CreditPricingSettings | null>(null);

  // Estados de controle
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const tabs = [
    { id: 0, name: 'Visao Geral', icon: '📊', component: 'dashboard', eyebrow: 'Panorama' },
    { id: 1, name: 'Perfil', icon: '👤', component: 'profile', eyebrow: 'Cadastro' },
    { id: 2, name: 'Saldo', icon: '💰', component: 'balance', eyebrow: 'Disponibilidade' },
    { id: 3, name: 'Recargas', icon: '🛒', component: 'purchase', eyebrow: 'Aquisicao' },
    { id: 4, name: 'Extrato', icon: '📋', component: 'transactions', eyebrow: 'Movimentacoes' },
    { id: 5, name: 'Pedidos', icon: '🧾', component: 'purchases', eyebrow: 'Solicitacoes' },
    { id: 6, name: 'Indicadores', icon: '📈', component: 'statistics', eyebrow: 'Desempenho' }
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
      // NOVO: Usar initializeCredits em vez de getBalance para garantir criação automática
      const [balanceData, transactionsData, purchasesData, statisticsData, pricingData] = await Promise.all([
        creditService.initializeCredits().catch(err => {
          console.error('❌ Erro ao inicializar/carregar saldo:', err);
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
        }),
        creditService.getPricingSettings().catch(err => {
          console.error('❌ Erro ao carregar tabela de créditos:', err);
          return null;
        }),
      ]);

      setBalance(balanceData);
      setTransactions(transactionsData);
      setPurchases(purchasesData);
      setStatistics(statisticsData);
      setPricingSettings(pricingData);

    } catch (error: unknown) {
      console.error('❌ Erro ao carregar dados da conta:', error);
      setError(getErrorMessage(error, 'Erro ao carregar dados da conta'));
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

  const currentTabData = tabs[currentTab];
  const pendingPurchases = purchases.filter((purchase) => purchase.status === 'PENDING').length;
  const totalTransactions = transactions.length;

  // Renderizar conteúdo da aba atual
  const renderTabContent = () => {
    const currentTabData = tabs[currentTab];

    switch (currentTabData.component) {
      case 'dashboard':
        return (
          <CreditDashboard />
        );

      case 'profile':
        return (
          <UserProfile
            user={user}
            onUpdate={handleDataUpdate}
          />
        );

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
        <p>Carregando dados da conta...</p>
      </div>
    );
  }

  return (
    <div className="account-container">
      {/* Header */}
      <div className="account-header">
        <div className="header-content">
          <div className="header-top">
            <div className="account-title-block">
              <span className="account-eyebrow">Area do Usuario</span>
              <h1>Conta</h1>
              <p className="account-subtitle">
                Centralize perfil, creditos e acompanhamento operacional da sua conta.
              </p>
            </div>
            <div className="user-info">
              <div className="user-details">
                <span className="user-name">👋 Olá, {user?.fullName || user?.username || 'Usuário'}!</span>
                <span className="user-email">{user?.username}</span>
              </div>
              {balance && (
                <div className="balance-badge">
                  <span className="balance-label">Saldo:</span>
                  <span className="balance-value">{balance.totalCredits} créditos</span>
                </div>
              )}
            </div>
          </div>

          <div className="account-overview-cards">
            <div className="account-overview-card">
              <span className="overview-label">Cadastro</span>
              <strong>{user?.fullName || user?.username || 'Nao informado'}</strong>
              <span>{user?.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN') ? 'Administrador' : 'Operador'}</span>
            </div>
            <div className="account-overview-card">
              <span className="overview-label">Saldo Atual</span>
              <strong>{balance?.totalCredits ?? 0} creditos</strong>
              <span>disponiveis para operacao</span>
            </div>
            <div className="account-overview-card">
              <span className="overview-label">Movimentacoes</span>
              <strong>{totalTransactions}</strong>
              <span>registros no historico</span>
            </div>
            <div className="account-overview-card">
              <span className="overview-label">Pedidos Pendentes</span>
              <strong>{pendingPurchases}</strong>
              <span>solicitacoes em analise</span>
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

      {/* Conteúdo da Aba */}
      <div className="account-content">
        <div className="account-section-intro">
          <div>
            <span className="account-section-eyebrow">{currentTabData.eyebrow}</span>
            <h2>{currentTabData.name}</h2>
          </div>
          <span className="account-section-badge">Aba {currentTab + 1} de {tabs.length}</span>
        </div>
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

export default MyAccount;
