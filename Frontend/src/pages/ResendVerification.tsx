import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/auth/AuthContext';

type FormState = {
  tenantCode: string;
  email: string;
};

interface ResendVerificationLocationState {
  tenantCode?: string;
  email?: string;
  username?: string;
}

interface ResendVerificationResponse {
  message?: string;
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
};

const ResendVerification: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const locationState = (location.state as ResendVerificationLocationState | null) || null;
  const [form, setForm] = useState<FormState>({
    tenantCode: String(locationState?.tenantCode || localStorage.getItem('tenantCode') || '').toUpperCase(),
    email: String(locationState?.email || locationState?.username || ''),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (locationState?.tenantCode && !form.tenantCode) {
      setForm((prev) => ({ ...prev, tenantCode: String(locationState.tenantCode).toUpperCase() }));
    }
    if ((locationState?.email || locationState?.username) && !form.email) {
      setForm((prev) => ({ ...prev, email: String(locationState?.email || locationState?.username) }));
    }
  }, [form.email, form.tenantCode, locationState]);

  if (isAuthenticated) {
    return <Navigate to="/properties" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await api.post<ResendVerificationResponse>('/auth/resend-verification', {
        tenantCode: form.tenantCode.trim().toUpperCase(),
        email: form.email.trim().toLowerCase(),
      });
      setSuccessMessage(response.data?.message || 'Novo e-mail de confirmacao enviado com sucesso.');
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(
          error,
          'Nao foi possivel reenviar o e-mail de confirmacao. Verifique os dados e tente novamente.'
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="new-login-page login-page">
      <div className="login-left-panel">
        <div className="login-form-container">
          <div className="login-brand">
            <h1>Geo Limites</h1>
            <p>Reenvio de confirmacao</p>
          </div>

          <form onSubmit={handleSubmit} className="modern-login-form" autoComplete="off">
            <div className="form-header">
              <h2>Reenviar e-mail</h2>
              <p>Informe o identificador da empresa e o e-mail da conta para receber um novo link de confirmacao.</p>
            </div>

            <div className="input-field">
              <label htmlFor="tenantCode">Identificador da Empresa</label>
              <input
                id="tenantCode"
                type="text"
                value={form.tenantCode}
                onChange={(e) => setForm((prev) => ({ ...prev, tenantCode: e.target.value.toUpperCase() }))}
                autoComplete="organization"
                required
              />
            </div>

            <div className="input-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                autoComplete="email"
                required
              />
            </div>

            {successMessage && (
              <div className="alert alert-success">
                <span className="alert-icon">✅</span>
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="alert alert-error">
                <span className="alert-icon">❌</span>
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !form.tenantCode.trim() || !form.email.trim()}
              className="login-submit-btn"
            >
              {isLoading ? 'Enviando...' : 'Reenviar e-mail de confirmacao'}
            </button>

            <div className="form-footer">
              <p>
                <Link
                  to="/login"
                  state={{ username: form.email, tenantCode: form.tenantCode }}
                  className="auth-link"
                >
                  Voltar para o login
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      <div className="login-right-panel">
        <div className="hero-content">
          <div className="hero-text">
            <h2>Ative sua conta</h2>
            <p>Se o primeiro e-mail expirou ou se perdeu, o sistema envia um novo link de confirmacao para liberar o acesso.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResendVerification;
