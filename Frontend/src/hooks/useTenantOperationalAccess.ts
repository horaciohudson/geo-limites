import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import tenantAdminService, { type TenantOperationalAdminDTO } from '@/services/tenantAdminService';

const BLOCKED_ONBOARDING_STATUSES = new Set(['DRAFT', 'PENDING_FIRST_PAYMENT']);

const DEFAULT_BLOCK_MESSAGE =
  'Entre em sua conta e complete as informacoes pendentes. Se ainda assim nao for liberado, envie um email para contato@sigeve.com.br relatando o ocorrido.';

interface TenantOperationalAccessState {
  tenantOperational: TenantOperationalAdminDTO | null;
  isLoading: boolean;
  isRestricted: boolean;
  restrictionMessage: string;
}

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
    if (!tenantOperational) {
      return DEFAULT_BLOCK_MESSAGE;
    }

    return DEFAULT_BLOCK_MESSAGE;
  }, [tenantOperational]);

  return {
    tenantOperational,
    isLoading,
    isRestricted,
    restrictionMessage,
  };
};
