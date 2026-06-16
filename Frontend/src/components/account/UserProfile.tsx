import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import api from '../../services/api';
import type { User } from '../../types/index';

interface UserProfileProps {
  user: User | null;
  onUpdate: () => void;
}

interface ProfileFormData {
  fullName: string;
  email: string;
  corporateName: string;
  tradeName: string;
  cnpj: string;
  stateRegistration: string;
  municipalRegistration: string;
  phone: string;
  mobile: string;
  whatsapp: string;
  manager: string;
  address: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileValidation {
  fullName?: string;
  email?: string;
  general?: string;
}

interface PasswordValidation {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
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

    if (apiError.response?.status === 409) {
      return 'Este e-mail já está sendo usado por outro usuário.';
    }

    if (apiError.response?.status === 401) {
      return 'Senha atual incorreta.';
    }

    if (apiError.response?.status === 400) {
      return 'Dados inválidos. Verifique as informações.';
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

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  const { logout } = useAuth();
  const profileType = user?.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN')
    ? 'Administrador'
    : 'Operador';
  
  // Estados do formulário de perfil
  const [profileData, setProfileData] = useState<ProfileFormData>({
    fullName: user?.fullName || '',
    email: user?.email || user?.username || '',
    corporateName: user?.corporateName || '',
    tradeName: user?.tradeName || '',
    cnpj: user?.cnpj || '',
    stateRegistration: user?.stateRegistration || '',
    municipalRegistration: user?.municipalRegistration || '',
    phone: user?.phone || '',
    mobile: user?.mobile || '',
    whatsapp: user?.whatsapp || '',
    manager: user?.manager || '',
    address: user?.address || '',
    district: user?.district || '',
    city: user?.city || '',
    state: user?.state || '',
    zipCode: user?.zipCode || ''
  });
  const [profileValidation, setProfileValidation] = useState<ProfileValidation>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Estados do formulário de senha
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    setProfileData({
      fullName: user?.fullName || '',
      email: user?.email || user?.username || '',
      corporateName: user?.corporateName || '',
      tradeName: user?.tradeName || '',
      cnpj: user?.cnpj || '',
      stateRegistration: user?.stateRegistration || '',
      municipalRegistration: user?.municipalRegistration || '',
      phone: user?.phone || '',
      mobile: user?.mobile || '',
      whatsapp: user?.whatsapp || '',
      manager: user?.manager || '',
      address: user?.address || '',
      district: user?.district || '',
      city: user?.city || '',
      state: user?.state || '',
      zipCode: user?.zipCode || ''
    });
  }, [user]);

  // Validar formulário de perfil
  const validateProfile = (): boolean => {
    const validation: ProfileValidation = {};

    if (!profileData.fullName.trim()) {
      validation.fullName = 'Nome completo é obrigatório';
    } else if (profileData.fullName.trim().length < 2) {
      validation.fullName = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (!profileData.email.trim()) {
      validation.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      validation.email = 'E-mail deve ter um formato válido';
    }

    setProfileValidation(validation);
    return Object.keys(validation).length === 0;
  };

  // Validar formulário de senha
  const validatePassword = (): boolean => {
    const validation: PasswordValidation = {};

    if (!passwordData.currentPassword) {
      validation.currentPassword = 'Senha atual é obrigatória';
    }

    if (!passwordData.newPassword) {
      validation.newPassword = 'Nova senha é obrigatória';
    } else if (passwordData.newPassword.length < 6) {
      validation.newPassword = 'Nova senha deve ter pelo menos 6 caracteres';
    }

    if (!passwordData.confirmPassword) {
      validation.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      validation.confirmPassword = 'Senhas não coincidem';
    }

    setPasswordValidation(validation);
    return Object.keys(validation).length === 0;
  };

  // Atualizar dados do perfil
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfile()) return;

    setProfileLoading(true);
    setProfileValidation({});
    setProfileSuccess(null);

    try {
      const response = await api.put<User>('/auth/profile', {
        fullName: profileData.fullName.trim(),
        email: profileData.email.trim(),
        corporateName: profileData.corporateName.trim(),
        tradeName: profileData.tradeName.trim(),
        cnpj: profileData.cnpj.trim(),
        stateRegistration: profileData.stateRegistration.trim(),
        municipalRegistration: profileData.municipalRegistration.trim(),
        phone: profileData.phone.trim(),
        mobile: profileData.mobile.trim(),
        whatsapp: profileData.whatsapp.trim(),
        manager: profileData.manager.trim(),
        address: profileData.address.trim(),
        district: profileData.district.trim(),
        city: profileData.city.trim(),
        state: profileData.state.trim(),
        zipCode: profileData.zipCode.trim()
      });

      setProfileData((prev) => ({
        ...prev,
        fullName: response.data?.fullName || prev.fullName,
        email: response.data?.email || prev.email,
        corporateName: response.data?.corporateName || '',
        tradeName: response.data?.tradeName || '',
        cnpj: response.data?.cnpj || '',
        stateRegistration: response.data?.stateRegistration || '',
        municipalRegistration: response.data?.municipalRegistration || '',
        phone: response.data?.phone || '',
        mobile: response.data?.mobile || '',
        whatsapp: response.data?.whatsapp || '',
        manager: response.data?.manager || '',
        address: response.data?.address || '',
        district: response.data?.district || '',
        city: response.data?.city || '',
        state: response.data?.state || '',
        zipCode: response.data?.zipCode || ''
      }));
      setProfileSuccess('Dados atualizados com sucesso!');
      onUpdate();

    } catch (error: unknown) {
      console.error('❌ Erro ao atualizar perfil:', error);

      setProfileValidation({
        general: getErrorMessage(error, 'Erro ao atualizar dados. Tente novamente.')
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Alterar senha
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) return;

    setPasswordLoading(true);
    setPasswordValidation({});
    setPasswordSuccess(null);

    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordSuccess('Senha alterada com sucesso! Você será redirecionado para fazer login novamente.');
      
      // Limpar formulário
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Fazer logout após 3 segundos para reautenticar
      setTimeout(() => {
        logout();
      }, 3000);

    } catch (error: unknown) {
      console.error('❌ Erro ao alterar senha:', error);

      setPasswordValidation({
        general: getErrorMessage(error, 'Erro ao alterar senha. Tente novamente.')
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <span className="profile-eyebrow">Perfil Cadastral</span>
        <h2>👤 Dados do Usuario</h2>
        <p>Gerencie sua identificacao, contatos principais e informacoes basicas de localizacao.</p>
      </div>

      <div className="profile-overview-cards">
        <div className="profile-overview-card">
          <span className="profile-overview-label">Identificacao</span>
          <strong>{profileData.tradeName || profileData.fullName || 'Nao informado'}</strong>
          <span>{profileData.cnpj || 'Documento ainda nao informado'}</span>
        </div>
        <div className="profile-overview-card">
          <span className="profile-overview-label">Contato Principal</span>
          <strong>{profileData.whatsapp || profileData.mobile || profileData.phone || 'Nao informado'}</strong>
          <span>{profileData.email || 'E-mail ainda nao informado'}</span>
        </div>
        <div className="profile-overview-card">
          <span className="profile-overview-label">Localizacao</span>
          <strong>{profileData.city || 'Cidade nao informada'}</strong>
          <span>{profileData.state || 'UF nao informada'}</span>
        </div>
        <div className="profile-overview-card">
          <span className="profile-overview-label">Perfil de Acesso</span>
          <strong>{profileType}</strong>
          <span>{user?.active ? 'Conta ativa' : 'Conta inativa'}</span>
        </div>
      </div>

      <div className="profile-content">
        {/* Seção de Dados Pessoais */}
        <div className="profile-section">
          <div className="section-header">
            <h3>📝 Informações Pessoais</h3>
            <p>Atualize seus dados pessoais</p>
          </div>

          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div className="profile-form-block">
              <div className="profile-form-block-header">
                <span className="profile-form-block-eyebrow">Identificacao</span>
                <h4>Dados principais</h4>
                <p>Informacoes institucionais e documento de referencia do usuario.</p>
              </div>

              <div className="form-row">
                <div className="input-field">
                  <label htmlFor="fullName">Nome Completo</label>
                  <input
                    id="fullName"
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => {
                      setProfileData(prev => ({ ...prev, fullName: e.target.value }));
                      if (profileValidation.fullName) {
                        setProfileValidation(prev => ({ ...prev, fullName: undefined }));
                      }
                    }}
                    placeholder="Digite seu nome completo"
                    className={profileValidation.fullName ? 'error' : ''}
                  />
                  {profileValidation.fullName && (
                    <span className="field-error">{profileValidation.fullName}</span>
                  )}
                </div>

                <div className="input-field">
                  <label htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => {
                      setProfileData(prev => ({ ...prev, email: e.target.value }));
                      if (profileValidation.email) {
                        setProfileValidation(prev => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder="Digite seu e-mail"
                    className={profileValidation.email ? 'error' : ''}
                  />
                  {profileValidation.email && (
                    <span className="field-error">{profileValidation.email}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="input-field">
                  <label htmlFor="corporateName">Razao Social</label>
                  <input
                    id="corporateName"
                    type="text"
                    value={profileData.corporateName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, corporateName: e.target.value }))}
                    placeholder="Nome institucional principal"
                  />
                </div>

                <div className="input-field">
                  <label htmlFor="tradeName">Nome Fantasia</label>
                  <input
                    id="tradeName"
                    type="text"
                    value={profileData.tradeName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, tradeName: e.target.value }))}
                    placeholder="Nome comercial ou operacional"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="input-field">
                  <label htmlFor="cnpj">CNPJ</label>
                  <input
                    id="cnpj"
                    type="text"
                    value={profileData.cnpj}
                    onChange={(e) => setProfileData(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="input-field">
                  <label htmlFor="manager">Responsavel</label>
                  <input
                    id="manager"
                    type="text"
                    value={profileData.manager}
                    onChange={(e) => setProfileData(prev => ({ ...prev, manager: e.target.value }))}
                    placeholder="Nome curto do responsavel"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="input-field">
                  <label htmlFor="stateRegistration">Inscricao Estadual</label>
                  <input
                    id="stateRegistration"
                    type="text"
                    value={profileData.stateRegistration}
                    onChange={(e) => setProfileData(prev => ({ ...prev, stateRegistration: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>

                <div className="input-field">
                  <label htmlFor="municipalRegistration">Inscricao Municipal</label>
                  <input
                    id="municipalRegistration"
                    type="text"
                    value={profileData.municipalRegistration}
                    onChange={(e) => setProfileData(prev => ({ ...prev, municipalRegistration: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>

            <div className="profile-form-block">
              <div className="profile-form-block-header">
                <span className="profile-form-block-eyebrow">Contato</span>
                <h4>Canais de comunicacao</h4>
                <p>Defina os telefones principais para retorno operacional e atendimento.</p>
              </div>

              <div className="form-row">
                <div className="input-field">
                  <label htmlFor="phone">Telefone</label>
                  <input
                    id="phone"
                    type="text"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Telefone principal"
                  />
                </div>

                <div className="input-field">
                  <label htmlFor="mobile">Celular</label>
                  <input
                    id="mobile"
                    type="text"
                    value={profileData.mobile}
                    onChange={(e) => setProfileData(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="Celular principal"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="input-field">
                  <label htmlFor="whatsapp">WhatsApp</label>
                  <input
                    id="whatsapp"
                    type="text"
                    value={profileData.whatsapp}
                    onChange={(e) => setProfileData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="Numero para contato rapido"
                  />
                </div>
              </div>
            </div>

            <div className="profile-form-block">
              <div className="profile-form-block-header">
                <span className="profile-form-block-eyebrow">Endereco</span>
                <h4>Base territorial</h4>
                <p>Informacoes basicas de localizacao para cadastro e referencia operacional.</p>
              </div>

              <div className="form-row">
                <div className="input-field">
                  <label htmlFor="zipCode">CEP</label>
                  <input
                    id="zipCode"
                    type="text"
                    value={profileData.zipCode}
                    onChange={(e) => setProfileData(prev => ({ ...prev, zipCode: e.target.value }))}
                    placeholder="00000-000"
                  />
                </div>

                <div className="input-field">
                  <label htmlFor="address">Endereco</label>
                  <input
                    id="address"
                    type="text"
                    value={profileData.address}
                    onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Rua, avenida ou complemento principal"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="input-field">
                  <label htmlFor="district">Bairro</label>
                  <input
                    id="district"
                    type="text"
                    value={profileData.district}
                    onChange={(e) => setProfileData(prev => ({ ...prev, district: e.target.value }))}
                    placeholder="Bairro"
                  />
                </div>

                <div className="input-field">
                  <label htmlFor="city">Cidade</label>
                  <input
                    id="city"
                    type="text"
                    value={profileData.city}
                    onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Cidade"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="input-field">
                  <label htmlFor="state">UF</label>
                  <input
                    id="state"
                    type="text"
                    maxLength={2}
                    value={profileData.state}
                    onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                    placeholder="UF"
                  />
                </div>
              </div>
            </div>

            {profileSuccess && (
              <div className="alert alert-success">
                <span className="alert-icon">✅</span>
                {profileSuccess}
              </div>
            )}

            {profileValidation.general && (
              <div className="alert alert-error">
                <span className="alert-icon">❌</span>
                {profileValidation.general}
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                disabled={profileLoading}
                className="btn-primary"
              >
                {profileLoading ? (
                  <>
                    <div className="spinner"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    💾 Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Seção de Segurança */}
        <div className="profile-section">
          <div className="section-header">
            <h3>🔒 Segurança da Conta</h3>
            <p>Altere sua senha para manter sua conta segura</p>
          </div>

          {!showPasswordForm ? (
            <div className="password-section-closed">
              <div className="security-info">
                <div className="security-item">
                  <span className="security-icon">🔐</span>
                  <div className="security-details">
                    <h4>Senha</h4>
                    <p>Última alteração: Não disponível</p>
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="btn-secondary"
              >
                🔑 Alterar Senha
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-row">
                <div className="input-field">
                  <label htmlFor="currentPassword">Senha Atual</label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }));
                      if (passwordValidation.currentPassword) {
                        setPasswordValidation(prev => ({ ...prev, currentPassword: undefined }));
                      }
                    }}
                    placeholder="Digite sua senha atual"
                    className={passwordValidation.currentPassword ? 'error' : ''}
                  />
                  {passwordValidation.currentPassword && (
                    <span className="field-error">{passwordValidation.currentPassword}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="input-field">
                  <label htmlFor="newPassword">Nova Senha</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                      if (passwordValidation.newPassword) {
                        setPasswordValidation(prev => ({ ...prev, newPassword: undefined }));
                      }
                    }}
                    placeholder="Digite sua nova senha (mín. 6 caracteres)"
                    className={passwordValidation.newPassword ? 'error' : ''}
                  />
                  {passwordValidation.newPassword && (
                    <span className="field-error">{passwordValidation.newPassword}</span>
                  )}
                </div>

                <div className="input-field">
                  <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      if (passwordValidation.confirmPassword) {
                        setPasswordValidation(prev => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    placeholder="Digite a nova senha novamente"
                    className={passwordValidation.confirmPassword ? 'error' : ''}
                  />
                  {passwordValidation.confirmPassword && (
                    <span className="field-error">{passwordValidation.confirmPassword}</span>
                  )}
                </div>
              </div>

              {passwordSuccess && (
                <div className="alert alert-success">
                  <span className="alert-icon">✅</span>
                  {passwordSuccess}
                </div>
              )}

              {passwordValidation.general && (
                <div className="alert alert-error">
                  <span className="alert-icon">❌</span>
                  {passwordValidation.general}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                    setPasswordValidation({});
                    setPasswordSuccess(null);
                  }}
                  className="btn-secondary"
                  disabled={passwordLoading}
                >
                  ❌ Cancelar
                </button>
                
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="btn-primary"
                >
                  {passwordLoading ? (
                    <>
                      <div className="spinner"></div>
                      Alterando...
                    </>
                  ) : (
                    <>
                      🔑 Alterar Senha
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Informações da Conta */}
        <div className="profile-section">
          <div className="section-header">
            <h3>ℹ️ Informações da Conta</h3>
            <p>Detalhes sobre sua conta no GeoLimites Memorial</p>
          </div>

          <div className="account-info">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">ID da Conta:</span>
                <span className="info-value">{user?.id || 'N/A'}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Tipo de Conta:</span>
                <span className="info-value">
                  {user?.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN')
                    ? '👑 Administrador'
                    : '👤 Usuário'}
                </span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value">
                  {user?.active ? '✅ Ativa' : '❌ Inativa'}
                </span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Membro desde:</span>
                <span className="info-value">Não disponível</span>
              </div>

              <div className="info-item">
                <span className="info-label">Documento:</span>
                <span className="info-value">{profileData.cnpj || 'Nao informado'}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Contato:</span>
                <span className="info-value">{profileData.whatsapp || profileData.mobile || profileData.phone || 'Nao informado'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
