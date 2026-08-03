import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTenantOperationalAccess } from '@/hooks/useTenantOperationalAccess';
import { getPrimaryRoleLabel } from '@/utils/roles';
import creditService from '../services/creditService';
import type {
  CreditBalance,
  CreditTransaction,
  CreditPurchaseResponse,
} from '../types/credit';

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

const UserAreaXConta: React.FC = () => {
  const { user } = useAuth();
  const {
    tenantOperational,
    onboardingStageLabel,
    onboardingStageTone,
    onboardingGuidanceTitle,
    onboardingGuidanceMessage,
  } = useTenantOperationalAccess();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [purchases, setPurchases] = useState<CreditPurchaseResponse[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadAllData();
  }, [refreshTrigger]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [balanceData, transactionsData, purchasesData] = await Promise.all([
        creditService.initializeCredits().catch(() => null),
        creditService.getTransactions().catch(() => []),
        creditService.getPurchases().catch(() => [])
      ]);

      setBalance(balanceData);
      setTransactions(transactionsData);
      setPurchases(purchasesData);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Erro ao carregar dados da area do usuario'));
    } finally {
      setLoading(false);
    }
  };

  const handleDataUpdate = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const pendingPurchases = purchases.filter((purchase) => purchase.status === 'PENDING').length;
  const totalTransactions = transactions.length;
  const onboardingDates = [
    tenantOperational?.emailVerifiedAt
      ? `Email confirmado em ${new Date(tenantOperational.emailVerifiedAt).toLocaleString('pt-BR')}`
      : null,
    tenantOperational?.pendingApprovalAt
      ? `Entrou em analise em ${new Date(tenantOperational.pendingApprovalAt).toLocaleString('pt-BR')}`
      : null,
    tenantOperational?.adminApprovedAt
      ? `Aprovado em ${new Date(tenantOperational.adminApprovedAt).toLocaleString('pt-BR')}`
      : null,
    tenantOperational?.operationalAccessReleasedAt
      ? `Liberado em ${new Date(tenantOperational.operationalAccessReleasedAt).toLocaleString('pt-BR')}`
      : null,
  ].filter(Boolean) as string[];
  
  const rejectionReason = tenantOperational?.onboardingStatus === 'REJECTED'
    ? tenantOperational.rejectionReason
    : null;

  if (loading && !balance) {
    return (
      <div className="account-loading">
        <div className="loading-spinner">⏳</div>
        <p>Carregando area do usuario...</p>
      </div>
    );
  }

  return (
    <div className="account-header" style={{ marginBottom: 0, borderBottom: 'none' }}>
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
            <span>{getPrimaryRoleLabel(user)}</span>
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
            <span className="overview-label">Onboarding</span>
            <strong>{onboardingStageLabel}</strong>
            <span>{tenantOperational?.tenantCode ? `Tenant ${tenantOperational.tenantCode}` : 'acompanhamento da liberacao'}</span>
          </div>
          <div className="account-overview-card">
            <span className="overview-label">Pedidos Pendentes</span>
            <strong>{pendingPurchases}</strong>
            <span>solicitacoes em analise</span>
          </div>
        </div>

        <div className={`account-onboarding-banner tone-${onboardingStageTone}`}>
          <div className="account-onboarding-banner-copy">
            <span className="account-onboarding-badge">{onboardingStageLabel}</span>
            <strong>{onboardingGuidanceTitle}</strong>
            <p>{onboardingGuidanceMessage}</p>
            {rejectionReason && (
              <div className="account-onboarding-alert-detail">
                <span className="account-onboarding-alert-label">Motivo informado pela equipe</span>
                <strong>{rejectionReason}</strong>
              </div>
            )}
          </div>
          <div className="account-onboarding-banner-meta">
            <span className="account-onboarding-meta-label">Situacao da conta</span>
            <strong>{tenantOperational?.tenantName || 'Conta principal'}</strong>
            <span>{tenantOperational?.contactEmail || user?.username || 'Sem e-mail principal identificado'}</span>
            {onboardingDates.length > 0 && (
              <div className="account-onboarding-timeline">
                {onboardingDates.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button className="error-retry" onClick={handleDataUpdate}>
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAreaXConta;
