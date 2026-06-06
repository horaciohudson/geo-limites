import React, { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

interface LoginLocationState {
  message?: string;
  username?: string;
  tenantCode?: string;
  from?: {
    pathname?: string;
  };
}

const Login: React.FC = () => {
  const [tenantCode, setTenantCode] = useState(() => (localStorage.getItem('tenantCode') || '').toUpperCase());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated, loginMessage, loginError, clearMessages } = useAuth();
  const location = useLocation();
  const locationState = (location.state as LoginLocationState | null) || null;

  // Verificar se há mensagem vinda do cadastro
  const registerMessage = locationState?.message;
  const prefilledUsername = locationState?.username;
  const prefilledTenantCode = locationState?.tenantCode;

  // Preencher username se veio do cadastro
  React.useEffect(() => {
    if (prefilledUsername && !username) {
      setUsername(prefilledUsername);
    }
  }, [prefilledUsername, username]);

  React.useEffect(() => {
    if (prefilledTenantCode && !tenantCode) {
      setTenantCode(String(prefilledTenantCode).toUpperCase());
    }
  }, [prefilledTenantCode, tenantCode]);

  // Redirecionar se já estiver autenticado
  if (isAuthenticated) {
    const from = locationState?.from?.pathname || '/properties';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages(); // Limpar mensagens anteriores
    setIsLoading(true);

    try {
      await login(tenantCode, username, password);
    } catch {
      // O erro já é tratado no AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="new-login-page">
      {/* Lado Esquerdo - Formulário de Login */}
      <div className="login-left-panel">
        <div className="login-form-container">
          <div className="login-brand">
            <div className="brand-icon">GL</div>
            <h1>GeoLimites</h1>
            <p>Plataforma operacional para memoriais descritivos</p>
          </div>

          <form onSubmit={handleSubmit} className="modern-login-form" autoComplete="off">
            <div className="form-header">
              <h2>Bem-vindo de volta</h2>
              <p>Informe o identificador da empresa, e-mail e senha para acessar sua conta</p>
            </div>

            <div className="input-field">
              <label htmlFor="tenantCode">Identificador da Empresa</label>
              <input
                id="tenantCode"
                type="text"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                placeholder="ex: SIGEVE"
                autoComplete="organization"
                required
                className={loginError && !tenantCode ? 'error' : ''}
              />
              {loginError && !tenantCode && (
                <span className="field-error">Identificador da empresa e obrigatorio</span>
              )}
            </div>

            <div className="input-field">
              <label htmlFor="username">E-mail</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=""
                autoComplete="off"
                required
                className={loginError && !username ? 'error' : ''}
              />
              {loginError && !username && (
                <span className="field-error">E-mail é obrigatório</span>
              )}
            </div>

            <div className="input-field">
              <div className="password-header">
                <label htmlFor="password">Senha</label>
                <Link
                  to="/resend-verification"
                  state={{ email: username, tenantCode }}
                  className="forgot-password"
                  tabIndex={-1}
                >
                  Reenviar confirmacao
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                autoComplete="new-password"
                required
                className={loginError && !password ? 'error' : ''}
              />
              {loginError && !password && (
                <span className="field-error">Senha é obrigatória</span>
              )}
            </div>



            {(loginMessage || registerMessage) && (
              <div className="alert alert-success">
                <span className="alert-icon">✅</span>
                {registerMessage || loginMessage}
              </div>
            )}

            {loginError && (
              <div className="alert alert-error">
                <span className="alert-icon">❌</span>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !tenantCode || !username || !password}
              className="login-submit-btn"
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>

            <div className="form-footer">
              <p>
                Não tem uma conta?{' '}
                <Link to="/register" className="auth-link">
                  Criar conta
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Lado Direito - Imagem/Ilustração */}
      <div className="login-right-panel">
        <div className="hero-content">
          <div className="hero-illustration">
            <div className="memorial-ai-system">
              <div className="document-flow">
                <div className="input-doc">📐</div>
                <div className="flow-arrow">→</div>
                <div className="ai-processor">
                  <div className="ai-core">GEO</div>
                  <div className="processing-dots">
                    <div className="dot dot-1"></div>
                    <div className="dot dot-2"></div>
                    <div className="dot dot-3"></div>
                  </div>
                </div>
                <div className="flow-arrow">→</div>
                <div className="output-doc">📋</div>
              </div>
              <div className="system-label">GeoLimites Memorial</div>
            </div>
          </div>
          <div className="hero-text">
            <h2>Memoriais com suporte da plataforma</h2>
            <p>Transforme seus arquivos DXF/DWG em memoriais descritivos profissionais com estrutura operacional padronizada pela plataforma.</p>
            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span>Fluxo documental padronizado</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📐</span>
                <span>Análise precisa de coordenadas</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📋</span>
                <span>Conformidade com normas ABNT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
