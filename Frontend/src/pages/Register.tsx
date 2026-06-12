import React, { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import api from '@/services/api';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

interface RegisterFormValidation {
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
  general?: string;
}

interface RegisterResponse {
  message?: string;
  tenantCode?: string;
  emailSent?: boolean | null;
  verificationUrl?: string | null;
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

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [validation, setValidation] = useState<RegisterFormValidation>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedTenantCode, setGeneratedTenantCode] = useState('');
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirecionar se já estiver autenticado
  if (isAuthenticated) {
    return <Navigate to="/properties" replace />;
  }

  const validateForm = (): boolean => {
    const newValidation: RegisterFormValidation = {};

    // Validar email
    if (!formData.email) {
      newValidation.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newValidation.email = 'E-mail deve ter um formato válido';
    }

    // Validar nome completo
    if (!formData.fullName) {
      newValidation.fullName = 'Nome completo é obrigatório';
    } else if (formData.fullName.length < 2) {
      newValidation.fullName = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Validar senha
    if (!formData.password) {
      newValidation.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newValidation.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    // Validar confirmação de senha
    if (!formData.confirmPassword) {
      newValidation.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.confirmPassword) {
      newValidation.confirmPassword = 'Senhas não coincidem';
    }

    setValidation(newValidation);
    return Object.keys(newValidation).length === 0;
  };

  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar validação do campo quando usuário começar a digitar
    if (validation[field]) {
      setValidation(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Limpar mensagem de erro geral
    if (validation.general) {
      setValidation(prev => ({ ...prev, general: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setValidation({});
    setSuccessMessage(null);
    setGeneratedTenantCode('');
    setVerificationUrl(null);

    try {
      const response = await api.post<RegisterResponse>('/auth/register', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        fullName: formData.fullName
      });

      const tenantCode = String(response.data?.tenantCode || '').toUpperCase();
      if (tenantCode) {
        localStorage.setItem('tenantCode', tenantCode);
        setGeneratedTenantCode(tenantCode);
      }
      const successText = response.data?.message || 'Conta criada com sucesso!';
      setSuccessMessage(successText);
      setVerificationUrl(response.data?.verificationUrl || null);
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: successText,
            username: formData.email,
            tenantCode
          } 
        });
      }, 2000);

    } catch (error: unknown) {
      console.error('❌ Erro no cadastro:', error);

      setValidation({
        general: getErrorMessage(error, 'Erro ao criar conta. Tente novamente.')
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="new-login-page login-page">
      {/* Lado Esquerdo - Formulário de Cadastro */}
      <div className="login-left-panel">
        <div className="login-form-container">
          <div className="login-brand">
            <h1>GeoLimites</h1>
            <p>Plataforma operacional para memoriais descritivos</p>
          </div>

          <form onSubmit={handleSubmit} className="modern-login-form" autoComplete="off">
            <div className="form-header">
              <h2>Criar sua conta</h2>
              <p>Preencha os dados para comecar a usar a plataforma</p>
              <p>O identificador da empresa sera gerado automaticamente no primeiro cadastro.</p>
            </div>

            <div className="input-field">
              <label htmlFor="fullName">Nome Completo</label>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="Digite seu nome completo"
                autoComplete="name"
                required
                className={validation.fullName ? 'error' : ''}
              />
              {validation.fullName && (
                <span className="field-error">{validation.fullName}</span>
              )}
            </div>

            <div className="input-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Digite seu e-mail"
                autoComplete="email"
                required
                className={validation.email ? 'error' : ''}
              />
              {validation.email && (
                <span className="field-error">{validation.email}</span>
              )}
            </div>

            <div className="input-field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Digite sua senha (mín. 6 caracteres)"
                autoComplete="new-password"
                required
                className={validation.password ? 'error' : ''}
              />
              {validation.password && (
                <span className="field-error">{validation.password}</span>
              )}
            </div>

            <div className="input-field">
              <label htmlFor="confirmPassword">Confirmar Senha</label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Digite a senha novamente"
                autoComplete="new-password"
                required
                className={validation.confirmPassword ? 'error' : ''}
              />
              {validation.confirmPassword && (
                <span className="field-error">{validation.confirmPassword}</span>
              )}
            </div>

            {successMessage && (
              <div className="alert alert-success">
                <span className="alert-icon">✅</span>
                <div>
                  <div>{successMessage}</div>
                  {generatedTenantCode && <div>Identificador da empresa: {generatedTenantCode}</div>}
                  {verificationUrl && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <a href={verificationUrl} target="_blank" rel="noreferrer" className="auth-link">
                        Abrir link de confirmacao
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {validation.general && (
              <div className="alert alert-error">
                <span className="alert-icon">❌</span>
                {validation.general}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="login-submit-btn"
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </button>

            <div className="form-footer">
              <p>
                Já tem uma conta?{' '}
                <Link to="/login" className="auth-link">
                  Fazer login
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
            <h2>Estruture sua operacao com a GeoLimites</h2>
            <p>Crie sua conta e comece a organizar arquivos tecnicos, cadastros e memoriais descritivos em um fluxo operacional padronizado.</p>
            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">🚀</span>
                <span>Cadastro rápido e simples</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span>Dados seguros e protegidos</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💼</span>
                <span>Ferramenta profissional</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
