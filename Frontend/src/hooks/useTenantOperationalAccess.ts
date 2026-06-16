import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import tenantAdminService, { type TenantOperationalAdminDTO } from '@/services/tenantAdminService';

const BLOCKED_ONBOARDING_STATUSES = new Set(['DRAFT', 'PENDING_FIRST_PAYMENT', 'REJECTED']);

const DEFAULT_BLOCK_MESSAGE =
  'Entre em sua conta e complete as informacoes pendentes. Se ainda assim nao for liberado, envie um email para contato@sigeve.com.br relatando o ocorrido.';

interface TenantOperationalAccessState {
  tenantOperational: TenantOperationalAdminDTO | null;
  isLoading: boolean;
  isRestricted: boolean;
  restrictionMessage: string;
  onboardingStageLabel: string;
  onboardingStageTone: 'neutral' | 'warning' | 'info' | 'success' | 'danger';
  onboardingGuidanceTitle: string;
  onboardingGuidanceMessage: string;
}

interface TenantOperationalStageCopy {
  label: string;
  tone: 'neutral' | 'warning' | 'info' | 'success' | 'danger';
  title: string;
  message: string;
}

const getTenantOperationalStageCopy = (
  tenantOperational: TenantOperationalAdminDTO | null
): TenantOperationalStageCopy => {
  if (!tenantOperational) {
    return {
      label: 'Situacao indisponivel',
      tone: 'neutral',
      title: 'Nao foi possivel identificar a situacao operacional',
      message: DEFAULT_BLOCK_MESSAGE,
    };
  }

  const onboardingStatus = (tenantOperational.onboardingStatus || '').toUpperCase();

  if (tenantOperational.operationalAccessReleased || onboardingStatus === 'ACTIVE') {
    return {
      label: 'Liberado',
      tone: 'success',
      title: 'Conta liberada para operacao',
      message: 'Seu acesso operacional esta liberado. Voce ja pode preparar arquivos, cadastrar imoveis e seguir para a geracao dos trabalhos.',
    };
  }

  if (onboardingStatus === 'REJECTED') {
    return {
      label: 'Rejeitado',
      tone: 'danger',
      title: 'Cadastro encerrado na triagem',
      message: 'Seu cadastro foi interrompido na analise inicial. Revise seus dados e entre em contato com a equipe responsavel para orientacao sobre os proximos passos.',
    };
  }

  if (tenantOperational.adminApproved && tenantOperational.firstPaymentConfirmed) {
    return {
      label: 'Pronto para liberar',
      tone: 'info',
      title: 'Aguardando liberacao operacional final',
      message: 'Sua conta ja passou pela analise e pela confirmacao financeira. A equipe agora so precisa concluir a liberacao operacional do ambiente.',
    };
  }

  if (tenantOperational.adminApproved && !tenantOperational.firstPaymentConfirmed) {
    return {
      label: 'Aguardando pagamento',
      tone: 'warning',
      title: 'Aprovado, pendente de confirmacao financeira',
      message: 'Seu cadastro ja foi aprovado pela equipe. O proximo passo e a confirmacao do pagamento inicial para liberar a conta operacional.',
    };
  }

  if (onboardingStatus === 'PENDING_APPROVAL') {
    return {
      label: 'Em analise',
      tone: 'warning',
      title: 'Cadastro em analise inicial',
      message: 'Seu e-mail ja foi confirmado e sua conta esta na fila de triagem da equipe. Assim que a revisao for concluida, os proximos passos serao liberados.',
    };
  }

  if (onboardingStatus === 'DRAFT' || !tenantOperational.companyDataCompleted) {
    return {
      label: 'Dados pendentes',
      tone: 'warning',
      title: 'Ainda faltam informacoes de cadastro',
      message: 'Complete os dados principais da conta e acompanhe a liberacao. Se continuar bloqueado depois disso, entre em contato com a equipe.',
    };
  }

  return {
    label: 'Aguardando liberacao',
    tone: 'neutral',
    title: 'Conta ainda nao liberada',
    message: DEFAULT_BLOCK_MESSAGE,
  };
};

export const useTenantOperationalAccess = (): TenantOperationalAccessState => {
  const { isAuthenticated } = useAuth();
  const [tenantOperational, setTenantOperational] = useState<TenantOperationalAdminDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setTenantOperational(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadTenantOperational = async () => {
      try {
        setIsLoading(true);
        const response = await tenantAdminService.getCurrentTenantOperational();
        if (isMounted) {
          setTenantOperational(response);
        }
      } catch (error) {
        if (isMounted) {
          setTenantOperational(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTenantOperational();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const isRestricted = useMemo(() => {
    if (!tenantOperational) {
      return false;
    }

    return !tenantOperational.operationalAccessReleased
      || BLOCKED_ONBOARDING_STATUSES.has((tenantOperational.onboardingStatus || '').toUpperCase());
  }, [tenantOperational]);

  const restrictionMessage = useMemo(() => {
    return getTenantOperationalStageCopy(tenantOperational).message;
  }, [tenantOperational]);

  const stageCopy = useMemo(() => getTenantOperationalStageCopy(tenantOperational), [tenantOperational]);

  return {
    tenantOperational,
    isLoading,
    isRestricted,
    restrictionMessage,
    onboardingStageLabel: stageCopy.label,
    onboardingStageTone: stageCopy.tone,
    onboardingGuidanceTitle: stageCopy.title,
    onboardingGuidanceMessage: stageCopy.message,
  };
};
