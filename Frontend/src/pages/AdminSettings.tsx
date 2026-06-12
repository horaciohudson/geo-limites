import React, { useEffect, useMemo, useState } from 'react';
import adminSettingsService, {
  type AdminUserPasswordResetRequest,
  type AdminUserUpdateRequest,
  type MessageResponse,
  type SmtpOperationResult,
  type SmtpSettings,
  type UpdateSmtpSettingsRequest,
  type UpdateApiSettingsRequest,
} from '@/services/adminSettings';
import tenantAdminService, {
  type TenantOperationalAdminDTO,
} from '@/services/tenantAdminService';
import { useAuth } from '@/auth/AuthContext';
import type { User } from '@/types';
import '@/styles/AdminSettings.css';

const defaultForm: UpdateSmtpSettingsRequest = {
  enabled: false,
  host: '',
  port: 587,
  username: '',
  password: '',
  auth: true,
  sslEnabled: false,
  startTls: true,
  fromAddress: '',
  fromName: 'Geo Limites',
};

const defaultPasswordResetForm: AdminUserPasswordResetRequest & { confirmPassword: string } = {
  newPassword: '',
  confirmPassword: '',
};

type AdminTab = 'empresas' | 'smtp' | 'api' | 'usuarios';
type UserRoleFilter = 'all' | 'admin' | 'user';
type UserStatusFilter = 'all' | 'active' | 'inactive' | 'pending';

interface ApiErrorLike {
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

const toUserUpdateForm = (targetUser: User): AdminUserUpdateRequest => ({
  username: targetUser.username || '',
  email: targetUser.email || '',
  fullName: targetUser.fullName || '',
  roleName: targetUser.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN')
    ? 'ROLE_ADMIN'
    : 'ROLE_USER',
  active: targetUser.active !== false,
});

const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const [form, setForm] = useState<UpdateSmtpSettingsRequest>(defaultForm);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [currentSettings, setCurrentSettings] = useState<SmtpSettings | null>(null);
  const [operationalTenants, setOperationalTenants] = useState<TenantOperationalAdminDTO[]>([]);
  const [loadingOperationalTenants, setLoadingOperationalTenants] = useState(true);
  const [apiForm, setApiForm] = useState<UpdateApiSettingsRequest>({ templateApiProvider: 'CLAUDE', memorialApiProvider: 'CLAUDE' });
  const [loadingApi, setLoadingApi] = useState(true);
  const [lastOperation, setLastOperation] = useState<SmtpOperationResult | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<AdminUserUpdateRequest | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState<string | null>(null);
  const [passwordResetForm, setPasswordResetForm] = useState<(AdminUserPasswordResetRequest & { confirmPassword: string }) | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('empresas');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('all');

  const isAdmin = useMemo(
    () => user?.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN') ?? false,
    [user]
  );

  const tabs: Array<{ id: AdminTab; label: string; eyebrow: string; count: string }> = [
    {
      id: 'empresas',
      label: 'Empresas (Tenants)',
      eyebrow: 'Dados institucionais',
      count: `${operationalTenants.length}`,
    },
    {
      id: 'smtp',
      label: 'SMTP',
      eyebrow: 'Comunicacao',
      count: currentSettings?.enabled ? 'Ativo' : 'Inativo',
    },
    {
      id: 'api',
      label: 'API',
      eyebrow: 'Inteligência Artificial',
      count: 'Configurações',
    },
    {
      id: 'usuarios',
      label: 'Usuarios',
      eyebrow: 'Acessos',
      count: `${users.length}`,
    },
  ];

  const filteredUsers = useMemo(() => {
    const normalizedSearch = userSearch.trim().toLowerCase();

    return users.filter((item) => {
      const isAdminUser = item.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN');
      const matchesSearch = !normalizedSearch || [
        item.fullName,
        item.email,
        item.username,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));

      const matchesRole = userRoleFilter === 'all'
        || (userRoleFilter === 'admin' && isAdminUser)
        || (userRoleFilter === 'user' && !isAdminUser);

      const matchesStatus = userStatusFilter === 'all'
        || (userStatusFilter === 'active' && item.active !== false)
        || (userStatusFilter === 'inactive' && item.active === false)
        || (userStatusFilter === 'pending' && item.verified === false);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, userRoleFilter, userSearch, userStatusFilter]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setLoadingOperationalTenants(false);
      setLoadingUsers(false);
      return;
    }
    void Promise.all([loadOperationalTenants(), loadSettings(), loadApiSettings(), loadUsers()]);
  }, [isAdmin]);

  const loadOperationalTenants = async () => {
    try {
      setLoadingOperationalTenants(true);
      const response = await tenantAdminService.getOperationalTenants();
      setOperationalTenants(response);
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel carregar as empresas.');
    } finally {
      setLoadingOperationalTenants(false);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await adminSettingsService.getSmtpSettings();
      syncForm(settings);
      setCurrentSettings(settings);
      setStatusMessage(null);
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel carregar as configuracoes SMTP.');
    } finally {
      setLoading(false);
    }
  };

  const loadApiSettings = async () => {
    try {
      setLoadingApi(true);
      const settings = await adminSettingsService.getApiSettings();
      setApiForm({
        templateApiProvider: settings.templateApiProvider || 'CLAUDE',
        memorialApiProvider: settings.memorialApiProvider || 'CLAUDE',
      });
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel carregar as configuracoes de API.');
    } finally {
      setLoadingApi(false);
    }
  };

  const syncForm = (settings: SmtpSettings) => {
    setForm({
      enabled: settings.enabled,
      host: settings.host || '',
      port: settings.port || 587,
      username: settings.username || '',
      password: '',
      auth: settings.auth,
      sslEnabled: settings.sslEnabled,
      startTls: settings.startTls,
      fromAddress: settings.fromAddress || '',
      fromName: settings.fromName || 'Geo Limites',
    });
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await tenantAdminService.getGlobalUsers();
      setUsers(response);
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel carregar os usuarios do sistema.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const setField = <K extends keyof UpdateSmtpSettingsRequest>(field: K, value: UpdateSmtpSettingsRequest[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setApiField = <K extends keyof UpdateApiSettingsRequest>(field: K, value: UpdateApiSettingsRequest[K]) => {
    setApiForm((prev) => ({ ...prev, [field]: value }));
  };

  const setEditUserField = <K extends keyof AdminUserUpdateRequest>(field: K, value: AdminUserUpdateRequest[K]) => {
    setEditUserForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const setPasswordResetField = <K extends keyof (AdminUserPasswordResetRequest & { confirmPassword: string })>(
    field: K,
    value: (AdminUserPasswordResetRequest & { confirmPassword: string })[K]
  ) => {
    setPasswordResetForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: UpdateSmtpSettingsRequest = {
        ...form,
        password: form.password?.trim() || undefined,
        host: form.host.trim(),
        username: form.username.trim(),
        fromAddress: form.fromAddress.trim(),
        fromName: form.fromName.trim(),
      };

      const settings = await adminSettingsService.updateSmtpSettings(payload);
      syncForm(settings);
      setCurrentSettings(settings);
      setLastOperation(null);
      showSuccess('Configuracao SMTP salva com sucesso.');
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel salvar a configuracao SMTP.');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveTenant = async (tenantId: string) => {
    try {
      setSaving(true);
      await tenantAdminService.setAdminApproved(tenantId, { value: true });
      showSuccess('Tenant aprovado com sucesso.');
      await loadOperationalTenants();
    } catch (error) {
      showError(error, 'Erro ao aprovar tenant.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPayment = async (tenantId: string) => {
    try {
      setSaving(true);
      await tenantAdminService.setFirstPaymentConfirmed(tenantId, { value: true });
      showSuccess('Pagamento confirmado.');
      await loadOperationalTenants();
    } catch (error) {
      showError(error, 'Erro ao confirmar pagamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseAccess = async (tenantId: string) => {
    try {
      setSaving(true);
      await tenantAdminService.setOperationalAccessReleased(tenantId, { value: true });
      showSuccess('Acesso operacional liberado.');
      await loadOperationalTenants();
    } catch (error) {
      showError(error, 'Erro ao liberar acesso.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApiSettings = async () => {
    try {
      setSaving(true);
      const settings = await adminSettingsService.updateApiSettings(apiForm);
      setApiForm({
        templateApiProvider: settings.templateApiProvider,
        memorialApiProvider: settings.memorialApiProvider,
      });
      showSuccess('Configuracoes de API atualizadas com sucesso.');
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel salvar as configuracoes de API.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearPassword = async () => {
    try {
      setSaving(true);
      const settings = await adminSettingsService.clearSmtpPassword();
      syncForm(settings);
      setCurrentSettings(settings);
      showSuccess('Senha SMTP removida. Informe uma nova senha antes do proximo envio.');
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel limpar a senha SMTP.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      const result = await adminSettingsService.testSmtpConnection();
      setLastOperation(result);
      showSuccess(`Conexao SMTP validada com sucesso via ${result.source}.`);
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel testar a conexao SMTP.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setTestingEmail(true);
      const result = await adminSettingsService.sendTestEmail(testEmail.trim());
      setLastOperation(result);
      showSuccess(`E-mail de teste enviado para ${testEmail.trim()}.`);
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel enviar o e-mail de teste.');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleResendVerification = async (targetUser: User) => {
    try {
      setResendingUserId(targetUser.id);
      const result: MessageResponse = await adminSettingsService.resendUserVerification(targetUser.id);
      showSuccess(result.message || `Novo e-mail de confirmacao enviado para ${targetUser.email || targetUser.username}.`);
      await loadUsers();
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel reenviar o e-mail de confirmacao.');
    } finally {
      setResendingUserId(null);
    }
  };

  const handleStartEditUser = (targetUser: User) => {
    setEditingUserId(targetUser.id);
    setEditUserForm(toUserUpdateForm(targetUser));
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setEditUserForm(null);
  };

  const handleStartPasswordReset = (userId: string) => {
    setResettingPasswordUserId(userId);
    setPasswordResetForm(defaultPasswordResetForm);
  };

  const handleCancelPasswordReset = () => {
    setResettingPasswordUserId(null);
    setPasswordResetForm(null);
  };

  const handleSaveUser = async (userId: string) => {
    if (!editUserForm) {
      return;
    }

    try {
      setUpdatingUserId(userId);
      const payload: AdminUserUpdateRequest = {
        username: editUserForm.username.trim().toLowerCase(),
        email: editUserForm.email.trim().toLowerCase(),
        fullName: editUserForm.fullName.trim(),
        roleName: editUserForm.roleName,
        active: editUserForm.active,
      };

      const updatedUser = await adminSettingsService.updateUser(userId, payload);
      showSuccess(`Usuario ${updatedUser.email || updatedUser.username} atualizado com sucesso.`);
      handleCancelEditUser();
      await loadUsers();
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel atualizar o usuario.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    try {
      setUpdatingUserId(targetUser.id);
      const payload: AdminUserUpdateRequest = {
        ...toUserUpdateForm(targetUser),
        active: !(targetUser.active !== false),
      };

      const updatedUser = await adminSettingsService.updateUser(targetUser.id, payload);
      showSuccess(
        updatedUser.active
          ? `Usuario ${updatedUser.email || updatedUser.username} reativado com sucesso.`
          : `Usuario ${updatedUser.email || updatedUser.username} inativado com sucesso.`
      );

      if (editingUserId === targetUser.id) {
        handleCancelEditUser();
      }

      await loadUsers();
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel atualizar o status do usuario.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleResetUserPassword = async (targetUser: User) => {
    if (!passwordResetForm) {
      return;
    }

    try {
      setUpdatingUserId(targetUser.id);
      const result = await adminSettingsService.resetUserPassword(targetUser.id, {
        newPassword: passwordResetForm.newPassword,
      });
      showSuccess(result.message || `Senha redefinida com sucesso para ${targetUser.email || targetUser.username}.`);
      handleCancelPasswordReset();
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel redefinir a senha do usuario.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const showSuccess = (message: string) => {
    setStatusType('success');
    setStatusMessage(message);
  };

  const showError = (error: unknown, fallback: string) => {
    const apiError =
      typeof error === 'object' && error !== null
        ? (error as ApiErrorLike)
        : null;

    const message = apiError?.response?.status === 403
      ? 'Seu usuario nao possui permissao administrativa para alterar esta configuracao.'
      : apiError?.response?.data?.message || apiError?.message || fallback;
    setStatusType('error');
    setStatusMessage(message);
  };

  if (!isAdmin) {
    return (
      <div className="admin-settings-page">
        <div className="admin-settings-denied">
          <h1>Administracao</h1>
          <p>Este menu permanece desabilitado para operadores sem perfil administrativo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-settings-page">
      <div className="admin-settings-header">
        <h1>Administracao</h1>
        <p>Gerencie a configuracao operacional do sistema e os recursos iniciais da sua conta.</p>
      </div>

      {statusMessage && (
        <div className={`admin-settings-banner ${statusType}`}>
          {statusMessage}
        </div>
      )}



      <div className="admin-settings-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="admin-settings-tab-eyebrow">{tab.eyebrow}</span>
            <span className="admin-settings-tab-label">{tab.label}</span>
            <span className="admin-settings-tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === 'empresas' && (
        <section className="admin-settings-card admin-settings-panel">
          <div className="admin-settings-panel-header">
            <div>
              <h2>Controle de Clientes SAAS</h2>
              <p>Controle a liberacao e as assinaturas de todos os tenants cadastrados.</p>
            </div>
            <div className="admin-settings-panel-stats">
              <span className="admin-settings-stat">Total: {operationalTenants.length}</span>
            </div>
          </div>
          {loadingOperationalTenants ? (
            <p>Carregando empresas...</p>
          ) : (
            <div className="admin-users-list">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Status Onboarding</th>
                    <th>Status Financeiro</th>
                    <th style={{ textAlign: 'right' }}>Acoes Administrativas</th>
                  </tr>
                </thead>
                <tbody>
                  {operationalTenants.map((t) => (
                    <tr key={t.tenantId}>
                      <td>
                        <strong>{t.tenantName}</strong>
                        <div className="admin-user-email">#{t.tenantCode}</div>
                      </td>
                      <td>
                        <span className={`admin-user-role ${t.onboardingStatus === 'ACTIVE' ? 'ROLE_ADMIN' : 'ROLE_USER'}`}>
                          {t.onboardingStatus}
                        </span>
                        <div className="admin-user-email">Aprovado: {t.adminApproved ? 'Sim' : 'Nao'}</div>
                      </td>
                      <td>
                        <span className={`admin-user-status ${t.billingStatus === 'PAID' ? 'active' : 'inactive'}`}>
                          {t.billingStatus}
                        </span>
                        <div className="admin-user-email">Pagamento: {t.firstPaymentConfirmed ? 'Confirmado' : 'Pendente'}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="admin-user-actions" style={{ justifyContent: 'flex-end' }}>
                          <button 
                            className="admin-settings-button secondary" 
                            disabled={t.adminApproved || saving}
                            onClick={() => handleApproveTenant(t.tenantId)}
                          >
                            Aprovar
                          </button>
                          <button 
                            className="admin-settings-button secondary" 
                            disabled={t.firstPaymentConfirmed || saving}
                            onClick={() => handleConfirmPayment(t.tenantId)}
                          >
                            Pgto
                          </button>
                          <button 
                            className="admin-settings-button primary" 
                            disabled={t.operationalAccessReleased || saving}
                            onClick={() => handleReleaseAccess(t.tenantId)}
                          >
                            Liberar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {operationalTenants.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                        Nenhuma empresa cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'api' && (
        <section className="admin-settings-card admin-settings-panel">
          <div className="admin-settings-panel-header">
            <div>
              <h2>Configurar API</h2>
              <p>Escolha qual provedor de Inteligência Artificial deve ser utilizado pelo sistema.</p>
            </div>
          </div>
          {loadingApi ? (
            <p>Carregando configuracoes...</p>
          ) : (
            <>
              <div className="admin-settings-subsections">
                <section className="admin-settings-subsection">
                  <div className="admin-settings-subsection-header">
                    <div>
                      <h3>Provedores de Inteligência Artificial</h3>
                      <p>Selecione a API (Claude ou GPT) para as rotinas automatizadas.</p>
                    </div>
                  </div>
                  <div className="admin-settings-form">
                    <div className="admin-settings-row">
                      <div className="admin-settings-field">
                        <label htmlFor="template-api-provider">Criar Templates</label>
                        <select
                          id="template-api-provider"
                          value={apiForm.templateApiProvider}
                          onChange={(e) => setApiField('templateApiProvider', e.target.value)}
                        >
                          <option value="CLAUDE">Claude (Anthropic)</option>
                          <option value="GPT">GPT (OpenAI)</option>
                        </select>
                      </div>
                      <div className="admin-settings-field">
                        <label htmlFor="memorial-api-provider">Gerar Memoriais</label>
                        <select
                          id="memorial-api-provider"
                          value={apiForm.memorialApiProvider}
                          onChange={(e) => setApiField('memorialApiProvider', e.target.value)}
                        >
                          <option value="CLAUDE">Claude (Anthropic)</option>
                          <option value="GPT">GPT (OpenAI)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="admin-settings-actions">
                <button
                  className="admin-settings-button primary"
                  onClick={handleSaveApiSettings}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar Configuracoes da API'}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === 'smtp' && (
        <div className="admin-settings-grid">
          <section className="admin-settings-card admin-settings-panel">
            <div className="admin-settings-panel-header">
              <div>
                <h2>SMTP</h2>
                <p>Configure envio, validacao de conexao e remetente padrao.</p>
              </div>
              <div className="admin-settings-panel-stats">
                <span className="admin-settings-stat">SMTP: {currentSettings?.enabled ? 'Ativo' : 'Inativo'}</span>
                <span className="admin-settings-stat">Senha: {currentSettings?.hasPassword ? 'Configurada' : 'Pendente'}</span>
              </div>
            </div>
            {loading ? (
              <p>Carregando configuracoes...</p>
            ) : (
              <>
                <div className="admin-panel-highlights">
                  <div className="admin-panel-highlight-card">
                    <span className="admin-panel-highlight-label">Conexao</span>
                    <strong>{currentSettings?.enabled ? 'Ativa' : 'Desabilitada'}</strong>
                    <span>{currentSettings?.host || 'Sem host definido'}</span>
                  </div>
                  <div className="admin-panel-highlight-card">
                    <span className="admin-panel-highlight-label">Remetente</span>
                    <strong>{currentSettings?.fromName || 'Geo Limites'}</strong>
                    <span>{currentSettings?.fromAddress || 'Sem e-mail informado'}</span>
                  </div>
                  <div className="admin-panel-highlight-card">
                    <span className="admin-panel-highlight-label">Seguranca</span>
                    <strong>{currentSettings?.sslEnabled ? 'SSL' : currentSettings?.startTls ? 'StartTLS' : 'Sem camada'}</strong>
                    <span>{currentSettings?.auth ? 'com autenticacao' : 'sem autenticacao'}</span>
                  </div>
                  <div className="admin-panel-highlight-card">
                    <span className="admin-panel-highlight-label">Ultima Validacao</span>
                    <strong>{lastOperation?.source || 'Sem teste recente'}</strong>
                    <span>{lastOperation ? `${lastOperation.host}:${lastOperation.port}` : 'Execute um teste de conexao'}</span>
                  </div>
                </div>

                <div className="admin-settings-subsections">
                  <section className="admin-settings-subsection">
                    <div className="admin-settings-subsection-header">
                      <div>
                        <h3>Conexao e Credenciais</h3>
                        <p>Configure host, porta e acesso ao provedor de e-mail.</p>
                      </div>
                    </div>
                    <div className="admin-settings-form">
                      <div className="admin-settings-row">
                        <div className="admin-settings-field">
                          <label htmlFor="smtp-host">Host</label>
                          <input id="smtp-host" value={form.host} onChange={(e) => setField('host', e.target.value)} placeholder="smtp.hostinger.com" />
                        </div>
                        <div className="admin-settings-field">
                          <label htmlFor="smtp-port">Porta</label>
                          <input
                            id="smtp-port"
                            type="number"
                            min={1}
                            max={65535}
                            value={form.port}
                            onChange={(e) => setField('port', Number(e.target.value) || 587)}
                          />
                        </div>
                      </div>

                      <div className="admin-settings-row">
                        <div className="admin-settings-field">
                          <label htmlFor="smtp-username">Usuario SMTP</label>
                          <input id="smtp-username" value={form.username} onChange={(e) => setField('username', e.target.value)} placeholder="nao-responda@seudominio.com" />
                        </div>
                        <div className="admin-settings-field">
                          <label htmlFor="smtp-password">Senha SMTP</label>
                          <input
                            id="smtp-password"
                            type="password"
                            value={form.password || ''}
                            onChange={(e) => setField('password', e.target.value)}
                            placeholder={currentSettings?.hasPassword ? currentSettings.passwordMasked || 'Senha cadastrada' : 'Informe a senha'}
                          />
                          {currentSettings?.hasPassword && currentSettings.passwordMasked && (
                            <small style={{ color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                              Senha atual cadastrada: termina com `{currentSettings.passwordMasked.slice(-4)}`.
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="admin-settings-subsection">
                    <div className="admin-settings-subsection-header">
                      <div>
                        <h3>Remetente e Seguranca</h3>
                        <p>Ajuste identidade do remetente e as camadas de autenticacao do envio.</p>
                      </div>
                    </div>
                    <div className="admin-settings-form">
                      <div className="admin-settings-row">
                        <div className="admin-settings-field">
                          <label htmlFor="smtp-from-address">Remetente</label>
                          <input id="smtp-from-address" value={form.fromAddress} onChange={(e) => setField('fromAddress', e.target.value)} placeholder="nao-responda@seudominio.com" />
                        </div>
                        <div className="admin-settings-field">
                          <label htmlFor="smtp-from-name">Nome do Remetente</label>
                          <input id="smtp-from-name" value={form.fromName} onChange={(e) => setField('fromName', e.target.value)} placeholder="Geo Limites" />
                        </div>
                      </div>

                      <div className="admin-settings-checks">
                        <label><input type="checkbox" checked={form.enabled} onChange={(e) => setField('enabled', e.target.checked)} /> Habilitar SMTP</label>
                        <label><input type="checkbox" checked={form.auth} onChange={(e) => setField('auth', e.target.checked)} /> Exigir autenticacao</label>
                        <label><input type="checkbox" checked={form.startTls} onChange={(e) => setField('startTls', e.target.checked)} /> StartTLS</label>
                        <label><input type="checkbox" checked={form.sslEnabled} onChange={(e) => setField('sslEnabled', e.target.checked)} /> SSL</label>
                      </div>
                    </div>
                  </section>

                  <section className="admin-settings-subsection">
                    <div className="admin-settings-subsection-header">
                      <div>
                        <h3>Validacao e Testes</h3>
                        <p>Teste a conexao e simule um envio antes de ativar notificacoes operacionais.</p>
                      </div>
                    </div>
                    <div className="admin-settings-form">
                      <div className="admin-settings-row">
                        <div className="admin-settings-field">
                          <label htmlFor="smtp-test-email">E-mail para teste</label>
                          <input id="smtp-test-email" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="voce@dominio.com" />
                        </div>
                      </div>

                      <div className="admin-settings-test-actions">
                        <button className="admin-settings-button secondary" onClick={handleTestConnection} disabled={testingConnection}>
                          {testingConnection ? 'Testando...' : 'Testar Conexao'}
                        </button>
                        <button className="admin-settings-button secondary" onClick={handleSendTestEmail} disabled={testingEmail || !testEmail.trim()}>
                          {testingEmail ? 'Enviando...' : 'Enviar E-mail de Teste'}
                        </button>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="admin-settings-actions">
                  <button className="admin-settings-button primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Configuracao'}
                  </button>
                  <button className="admin-settings-button danger" onClick={handleClearPassword} disabled={saving}>
                    Limpar Senha
                  </button>
                </div>
              </>
            )}
          </section>

          <aside className="admin-settings-placeholder admin-settings-panel">
            <h3>Resumo do Ambiente</h3>
            <div className="admin-settings-meta">
              <div>
                Senha cadastrada: {currentSettings?.hasPassword ? `Sim (${currentSettings.passwordMasked || 'mascarada'})` : 'Nao'}
              </div>
              <div>SMTP habilitado: {currentSettings?.enabled ? 'Sim' : 'Nao'}</div>
              <div>Remetente atual: {currentSettings?.fromAddress || 'Nao informado'}</div>
              <div>Nome exibido: {currentSettings?.fromName || 'Geo Limites'}</div>
              {lastOperation && <div>Ultima validacao: {lastOperation.source} em {lastOperation.host}:{lastOperation.port}</div>}
            </div>

            <h3 style={{ marginTop: '1.5rem' }}>Acoes Rapidas</h3>
            <div className="admin-settings-meta">
              <div>Validar conexao antes de enviar e-mails operacionais.</div>
              <div>Confirme remetente e autenticacao antes de liberar em producao.</div>
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <section className="admin-settings-card admin-settings-panel">
          <div className="admin-settings-panel-header">
            <div>
              <h2>Gestao de Usuarios</h2>
              <p>Busque, filtre e administre acessos, confirme e-mails, redefina senhas ou desative contas.</p>
            </div>
          </div>
          <div className="admin-user-sections">

            <section className="admin-user-section">
              <div className="admin-user-section-header">
                <div>
                  <h3>Base de Usuarios</h3>
                  <p>Busque, filtre e administre acessos do tenant sem poluir a leitura da lista.</p>
                </div>
                <div className="admin-user-section-badges">
                  <span className="admin-user-chip">{filteredUsers.length} exibidos</span>
                  <span className="admin-user-chip success">{users.length} totais</span>
                </div>
              </div>

              <div className="admin-users-toolbar">
                <div className="admin-settings-field">
                  <label htmlFor="user-search">Buscar Usuario</label>
                  <input
                    id="user-search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Nome, e-mail ou login"
                  />
                </div>
                <div className="admin-settings-field">
                  <label htmlFor="user-role-filter">Perfil</label>
                  <select
                    id="user-role-filter"
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value as UserRoleFilter)}
                  >
                    <option value="all">Todos</option>
                    <option value="admin">Apenas admins</option>
                    <option value="user">Apenas usuarios</option>
                  </select>
                </div>
                <div className="admin-settings-field">
                  <label htmlFor="user-status-filter">Status</label>
                  <select
                    id="user-status-filter"
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as UserStatusFilter)}
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                    <option value="pending">Pendentes</option>
                  </select>
                </div>
              </div>


            </section>
          </div>

          {loadingUsers ? (
            <p>Carregando usuarios...</p>
          ) : users.length === 0 ? (
            <p>Nenhum usuario encontrado para este tenant.</p>
          ) : filteredUsers.length === 0 ? (
            <div className="admin-users-empty">
              <strong>Nenhum usuario encontrado com os filtros atuais.</strong>
              <span>Ajuste a busca ou altere os filtros para visualizar outros acessos.</span>
            </div>
          ) : (
            <div className="admin-users-list">
              <div className="admin-users-table-head">
                <span>Usuario</span>
                <span>Perfil</span>
                <span>Confirmacao</span>
                <span>Status</span>
                <span>Acoes</span>
              </div>
              {filteredUsers.map((item) => {
                const isVerified = item.verified !== false;
                const isCurrentUser = item.id === user?.id;
                const isResending = resendingUserId === item.id;
                const isEditing = editingUserId === item.id;
                const isUpdating = updatingUserId === item.id;
                const isResettingPassword = resettingPasswordUserId === item.id;
                const isAdminUser = item.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN');
                return (
                  <div key={item.id} className="admin-user-item">
                    <div className="admin-user-row">
                      <div className="admin-user-cell admin-user-main">
                        <div className="admin-user-cell-label">Usuario</div>
                        <div className="admin-user-title">
                          <strong>{item.fullName || item.username}</strong>
                          {isCurrentUser && <span className="admin-user-chip">Voce</span>}
                          {isAdminUser && (
                            <span className="admin-user-chip">Admin</span>
                          )}
                        </div>
                        <div className="admin-user-identity">
                          <span>{item.email || item.username}</span>
                          <span>Login: {item.username}</span>
                          {item.tenantCode && (
                            <span className="admin-user-tenant">Empresa: #{item.tenantCode}</span>
                          )}
                        </div>
                      </div>

                      <div className="admin-user-cell">
                        <div className="admin-user-cell-label">Perfil</div>
                        <span className="admin-user-state-chip neutral">
                          {isAdminUser ? 'Administrador' : 'Usuario'}
                        </span>
                      </div>

                      <div className="admin-user-cell">
                        <div className="admin-user-cell-label">Confirmacao</div>
                        <span className={`admin-user-state-chip ${isVerified ? 'confirmed' : 'pending'}`}>
                          {isVerified ? 'Confirmado' : 'Pendente'}
                        </span>
                      </div>

                      <div className="admin-user-cell">
                        <div className="admin-user-cell-label">Status</div>
                        <span className={`admin-user-state-chip ${item.active ? 'active' : 'inactive'}`}>
                          {item.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      <div className="admin-user-actions admin-user-cell">
                        <div className="admin-user-cell-label">Acoes</div>
                        {!isVerified ? (
                          <button
                            className="admin-settings-button secondary"
                            onClick={() => handleResendVerification(item)}
                            disabled={isResending || isUpdating}
                          >
                            {isResending ? 'Reenviando...' : 'Reenviar Confirmacao'}
                          </button>
                        ) : (
                          <span className="admin-user-chip success">Confirmado</span>
                        )}

                        {isEditing && editUserForm ? (
                          <>
                            <button
                              className="admin-settings-button primary"
                              onClick={() => handleSaveUser(item.id)}
                              disabled={
                                isUpdating ||
                                !editUserForm.fullName.trim() ||
                                !editUserForm.email.trim() ||
                                !editUserForm.username.trim()
                              }
                            >
                              {isUpdating ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button
                              className="admin-settings-button secondary"
                              onClick={handleCancelEditUser}
                              disabled={isUpdating}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            className="admin-settings-button secondary"
                            onClick={() => handleStartEditUser(item)}
                            disabled={isUpdating || isResettingPassword}
                          >
                            Editar
                          </button>
                        )}

                        {isResettingPassword && passwordResetForm ? (
                          <>
                            <button
                              className="admin-settings-button primary"
                              onClick={() => handleResetUserPassword(item)}
                              disabled={
                                isUpdating ||
                                !passwordResetForm.newPassword.trim() ||
                                passwordResetForm.newPassword.trim().length < 6 ||
                                passwordResetForm.newPassword !== passwordResetForm.confirmPassword
                              }
                            >
                              {isUpdating ? 'Salvando...' : 'Salvar Senha'}
                            </button>
                            <button
                              className="admin-settings-button secondary"
                              onClick={handleCancelPasswordReset}
                              disabled={isUpdating}
                            >
                              Cancelar Senha
                            </button>
                          </>
                        ) : (
                          <button
                            className="admin-settings-button secondary"
                            onClick={() => handleStartPasswordReset(item.id)}
                            disabled={isUpdating || isEditing}
                          >
                            Redefinir Senha
                          </button>
                        )}

                        <button
                          className={`admin-settings-button ${item.active ? 'danger' : 'secondary'}`}
                          onClick={() => handleToggleUserStatus(item)}
                          disabled={isUpdating || isEditing || isResettingPassword}
                        >
                          {isUpdating ? 'Atualizando...' : item.active ? 'Inativar' : 'Reativar'}
                        </button>
                      </div>
                    </div>

                    {(isEditing && editUserForm) || (isResettingPassword && passwordResetForm) ? (
                      <div className="admin-user-detail-panels">
                        {isEditing && editUserForm && (
                          <div className="admin-user-edit-grid">
                            <div className="admin-settings-field">
                              <label htmlFor={`edit-user-full-name-${item.id}`}>Nome Completo</label>
                              <input
                                id={`edit-user-full-name-${item.id}`}
                                value={editUserForm.fullName}
                                onChange={(e) => setEditUserField('fullName', e.target.value)}
                                placeholder="Nome do usuario"
                              />
                            </div>
                            <div className="admin-settings-field">
                              <label htmlFor={`edit-user-email-${item.id}`}>E-mail</label>
                              <input
                                id={`edit-user-email-${item.id}`}
                                type="email"
                                value={editUserForm.email}
                                onChange={(e) => setEditUserField('email', e.target.value)}
                                placeholder="usuario@dominio.com"
                              />
                            </div>
                            <div className="admin-settings-field">
                              <label htmlFor={`edit-user-username-${item.id}`}>Login</label>
                              <input
                                id={`edit-user-username-${item.id}`}
                                value={editUserForm.username}
                                onChange={(e) => setEditUserField('username', e.target.value)}
                                placeholder="Login do usuario"
                              />
                            </div>
                            <div className="admin-settings-field">
                              <label htmlFor={`edit-user-role-${item.id}`}>Perfil</label>
                              <select
                                id={`edit-user-role-${item.id}`}
                                value={editUserForm.roleName}
                                onChange={(e) => setEditUserField('roleName', e.target.value as AdminUserUpdateRequest['roleName'])}
                              >
                                <option value="ROLE_USER">Usuario</option>
                                <option value="ROLE_ADMIN">Administrador</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {isResettingPassword && passwordResetForm && (
                          <div className="admin-user-password-grid">
                            <div className="admin-settings-field">
                              <label htmlFor={`reset-user-password-${item.id}`}>Nova Senha</label>
                              <input
                                id={`reset-user-password-${item.id}`}
                                type="password"
                                value={passwordResetForm.newPassword}
                                onChange={(e) => setPasswordResetField('newPassword', e.target.value)}
                                placeholder="Minimo de 6 caracteres"
                              />
                            </div>
                            <div className="admin-settings-field">
                              <label htmlFor={`reset-user-password-confirm-${item.id}`}>Confirmar Nova Senha</label>
                              <input
                                id={`reset-user-password-confirm-${item.id}`}
                                type="password"
                                value={passwordResetForm.confirmPassword}
                                onChange={(e) => setPasswordResetField('confirmPassword', e.target.value)}
                                placeholder="Repita a nova senha"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default AdminSettings;
