import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/index';
import api from '@/services/api';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  clearStoredSession,
  consumeRedirectReason,
  getStoredToken,
  setStoredToken,
  validateJwtLocally,
} from './session';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (tenantCode: string, username: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: (message?: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginMessage: string | null;
  loginError: string | null;
  clearMessages: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

interface RawRole {
  id?: string | number;
  name?: string;
}

interface RawUserPayload {
  id?: string | number;
  username?: string;
  email?: string;
  fullName?: string;
  corporateName?: string;
  tradeName?: string;
  cnpj?: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  phone?: string;
  mobile?: string;
  whatsapp?: string;
  manager?: string;
  address?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  tenantId?: string;
  tenantCode?: string;
  active?: boolean;
  verified?: boolean;
  roles?: RawRole[];
}

interface ApiErrorLike {
  message?: string;
  code?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;

    if (apiError.response?.data?.message) {
      return apiError.response.data.message;
    }

    if (apiError.response?.status === 400) {
      return 'Dados inválidos. Verifique as informações e tente novamente.';
    }

    if (apiError.response?.status === 409) {
      return 'Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.';
    }

    if (apiError.code === 'ERR_NETWORK') {
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    }

    if (apiError.message) {
      return apiError.message;
    }
  }

  return fallback;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      if (!validateJwtLocally(storedToken)) {
        clearStoredSession();
        setLoginError('Sua sessao expirou. Faca login novamente.');
        setIsLoading(false);
        return;
      }

      try {
        setToken(storedToken);
        const currentUser = await fetchCurrentUser(storedToken);
        setUser(currentUser);

        if (currentUser?.tenantCode) {
          localStorage.setItem('tenantCode', currentUser.tenantCode.toUpperCase());
        }
      } catch (error) {
        console.error('❌ Nao foi possivel restaurar a sessao autenticada:', error);
        clearStoredSession();
        setToken(null);
        setUser(null);
        setLoginError('Sua sessao expirou. Faca login novamente.');
      } finally {
        setIsLoading(false);
      }
    };

    const redirectMessage = consumeRedirectReason();
    if (redirectMessage) {
      setLoginError(redirectMessage);
    }

    void initializeAuth();
  }, []);

  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      logout(customEvent.detail?.message || 'Sua sessao expirou. Faca login novamente.');
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  const login = async (tenantCode: string, username: string, password: string) => {
    try {
      setLoginError(null);
      setLoginMessage(null);
      const normalizedTenantCode = tenantCode.trim().toUpperCase();

      const response = await api.post('/auth/login', {
        tenantCode: normalizedTenantCode,
        username,
        password,
      });

      const { token: newToken } = response.data;
      setStoredToken(newToken);
      setToken(newToken);

      const currentUser = await fetchCurrentUser(newToken);
      setUser(currentUser);

      const resolvedTenantCode = currentUser?.tenantCode
        ? String(currentUser.tenantCode).toUpperCase()
        : normalizedTenantCode;
      localStorage.setItem('tenantCode', resolvedTenantCode);
      setLoginMessage('Login realizado com sucesso!');
    } catch (error: unknown) {
      console.error('❌ Erro detalhado no login:', error);

      const errorMessage = getErrorMessage(
        error,
        'Erro ao fazer login. Verifique suas credenciais.'
      );
      setLoginError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = (message?: string) => {
    clearStoredSession();
    setToken(null);
    setUser(null);
    setLoginMessage(null);
    setLoginError(message || null);
  };

  const register = async (email: string, password: string, fullName: string) => {
    try {
      setLoginError(null);
      setLoginMessage(null);

      const response = await api.post('/auth/register', {
        email,
        password,
        fullName
      });

      setLoginMessage(response.data?.message || 'Conta criada com sucesso!');
      
    } catch (error: unknown) {
      console.error('❌ Erro no registro:', error);

      const errorMessage = getErrorMessage(error, 'Erro ao criar conta. Tente novamente.');
      setLoginError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const clearMessages = () => {
    setLoginMessage(null);
    setLoginError(null);
  };

  const fetchCurrentUser = async (authToken: string): Promise<User> => {
    const response = await api.get<RawUserPayload>('/auth/me', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    return normalizeUser(response.data);
  };

  const normalizeUser = (payload: unknown): User => {
    const normalizedPayload =
      typeof payload === 'object' && payload !== null
        ? (payload as RawUserPayload)
        : {};

    return {
      id: String(normalizedPayload.id || ''),
      username: String(normalizedPayload.username || ''),
      email: normalizedPayload.email || '',
      fullName: normalizedPayload.fullName || normalizedPayload.username || '',
      corporateName: normalizedPayload.corporateName || '',
      tradeName: normalizedPayload.tradeName || '',
      cnpj: normalizedPayload.cnpj || '',
      stateRegistration: normalizedPayload.stateRegistration || '',
      municipalRegistration: normalizedPayload.municipalRegistration || '',
      phone: normalizedPayload.phone || '',
      mobile: normalizedPayload.mobile || '',
      whatsapp: normalizedPayload.whatsapp || '',
      manager: normalizedPayload.manager || '',
      address: normalizedPayload.address || '',
      district: normalizedPayload.district || '',
      city: normalizedPayload.city || '',
      state: normalizedPayload.state || '',
      zipCode: normalizedPayload.zipCode || '',
      tenantId: normalizedPayload.tenantId || undefined,
      tenantCode: normalizedPayload.tenantCode || undefined,
      active: normalizedPayload.active !== false,
      verified: normalizedPayload.verified !== false,
      roles: Array.isArray(normalizedPayload.roles)
        ? normalizedPayload.roles.map((role: RawRole, index: number) => ({
            id: role.id ? String(role.id) : `role-${index}`,
            name: String(role.name || ''),
          }))
        : [],
    };
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
    isLoading,
    loginMessage,
    loginError,
    clearMessages,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
