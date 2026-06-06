import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/auth/AuthContext';

type VerificationState = 'loading' | 'success' | 'error';

interface VerifyEmailResponse {
  message?: string;
  tenantCode?: string;
  email?: string;
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

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerificationState>('loading');
  const [message, setMessage] = useState('Validando seu token de confirmacao...');
  const [tenantCode, setTenantCode] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setState('error');
      setMessage('Token de verificacao nao informado.');
      return;
    }

    const verify = async () => {
      try {
        const response = await api.get<VerifyEmailResponse>('/auth/verify', {
          params: { token },
        });

        setState('success');
        setMessage(response.data?.message || 'Conta verificada com sucesso.');
        setTenantCode(response.data?.tenantCode || '');
        setEmail(response.data?.email || '');

        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: {
              message: response.data?.message || 'Conta verificada com sucesso. Faça login para continuar.',
              username: response.data?.email || '',
              tenantCode: response.data?.tenantCode || '',
            },
          });
        }, 2500);
      } catch (error: unknown) {
        setState('error');
        setMessage(
          getErrorMessage(
            error,
            'Nao foi possivel validar sua conta. O token pode estar expirado ou invalido.'
          )
        );
      }
    };

    verify();
  }, [navigate, searchParams]);

  if (isAuthenticated) {
    return <Navigate to="/properties" replace />;
  }

  return (
    <div className="new-login-page">
      <div className="login-left-panel">
        <div className="login-form-container">
          <div className="login-brand">
            <div className="brand-icon">✉️</div>
            <h1>Geo Limites</h1>
            <p>Confirmacao de conta</p>
          </div>

          <div className="modern-login-form">
            <div className="form-header">
              <h2>Verificacao de e-mail</h2>
              <p>Estamos finalizando a ativacao do seu acesso.</p>
            </div>

            {state === 'loading' && (
              <div className="alert alert-success">
                <span className="alert-icon">⏳</span>
                {message}
              </div>
            )}

            {state === 'success' && (
              <div className="alert alert-success">
                <span className="alert-icon">✅</span>
                {message}
                {tenantCode && <div>Identificador da empresa: {tenantCode}</div>}
                {email && <div>E-mail: {email}</div>}
              </div>
            )}

            {state === 'error' && (
              <div className="alert alert-error">
                <span className="alert-icon">❌</span>
                <div>
                  <div>{message}</div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <Link
                      to="/resend-verification"
                      state={{ email, tenantCode }}
                      className="auth-link"
                    >
                      Solicitar novo e-mail de confirmacao
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="form-footer">
              <p>
                <Link
                  to="/login"
                  state={{
                    username: email,
                    tenantCode,
                  }}
                  className="auth-link"
                >
                  Ir para o login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right-panel">
        <div className="hero-content">
          <div className="hero-text">
            <h2>Ativacao segura da conta</h2>
            <p>Depois da verificacao, o acesso tenant-aware fica liberado para o ambiente correto.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
