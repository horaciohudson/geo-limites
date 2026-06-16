import axios from 'axios';
import {
  getStoredToken,
  notifySessionExpired,
  validateJwtLocally,
} from '@/auth/session';

// Configuracao da API para GeoLimites
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 300000, // 5 MINUTOS (300 segundos) - Necessario para geracao de memorial em fluxos longos
});

// Interceptor para adicionar token JWT automaticamente
api.interceptors.request.use(
  (config) => {
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
      console.error('⏰ Timeout: Requisição demorou mais que 5 minutos');
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
