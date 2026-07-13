import axios from 'axios';
import {
  getStoredToken,
  notifySessionExpired,
  validateJwtLocally,
} from '@/auth/session';
import { desktopApi } from '@/services/desktopApi';

// Configuracao da API para GeoLimites
const fallbackApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const normalizeBackendApiBaseUrl = (baseUrl: string) => {
  const sanitizedBaseUrl = baseUrl.replace(/\/+$/, '');
  return sanitizedBaseUrl.toLowerCase().endsWith('/api')
    ? sanitizedBaseUrl
    : `${sanitizedBaseUrl}/api`;
};

let cachedDesktopApiBaseUrlPromise: Promise<string> | null = null;

const resolveApiBaseUrl = async () => {
  if (!desktopApi.hasBridge()) {
    return fallbackApiBaseUrl;
  }

  if (!cachedDesktopApiBaseUrlPromise) {
    cachedDesktopApiBaseUrlPromise = desktopApi
      .getBackendBaseUrl()
      .then((baseUrl) => normalizeBackendApiBaseUrl(baseUrl))
      .catch(() => fallbackApiBaseUrl);
  }

  return cachedDesktopApiBaseUrlPromise;
};

const api = axios.create({
  baseURL: fallbackApiBaseUrl,
  timeout: 900000, // 15 MINUTOS - Necessario para geracao de memorial em fluxos soberanos longos
});

// Interceptor para adicionar token JWT automaticamente
api.interceptors.request.use(
  async (config) => {
    config.baseURL = await resolveApiBaseUrl();

    const token = getStoredToken();
    if (token) {
      // Validar token antes de usar
      if (!validateJwtLocally(token)) {
        console.error('Sessao invalida detectada antes da requisicao.');
        notifySessionExpired('Sua sessao expirou. Faca login novamente.');
        return Promise.reject(new Error('Token inválido'));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const hasStoredToken = !!getStoredToken();
    const tokenExpiredHeader = error.response?.headers?.['x-token-expired'] === 'true';
    const isAuthRequest =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/register') ||
      error.config?.url?.includes('/auth/verify') ||
      error.config?.url?.includes('/auth/resend-verification');

    // Tratamento específico para timeout
    if (error.code === 'ECONNABORTED') {
      console.error('â° Timeout: RequisiÃ§Ã£o demorou mais que 15 minutos');
    } else if (!isAuthRequest && hasStoredToken && (error.response?.status === 401 || tokenExpiredHeader)) {
      notifySessionExpired('Sua sessao expirou. Faca login novamente.');
    } else if (!isAuthRequest && hasStoredToken && error.response?.status === 403) {
    } else if (error.response?.status === 500) {
      console.error('🔧 Erro interno do servidor - Verificar logs do backend');
    }
    return Promise.reject(error);
  }
);

export default api;
