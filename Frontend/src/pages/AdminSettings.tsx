import React, { useEffect, useMemo, useState } from 'react';
import adminSettingsService, {
  type AdminUserCreateRequest,
  type AdminUserPasswordResetRequest,
  type AdminUserUpdateRequest,
  type MessageResponse,
  type SmtpOperationResult,
  type SmtpSettings,
  type TenantSettings,
  type UpdateTenantSettingsRequest,
  type UpdateSmtpSettingsRequest,
} from '@/services/adminSettings';
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

const defaultTenantForm: UpdateTenantSettingsRequest = {
  name: '',
  planCode: '',
  status: 'ACTIVE',
};

const defaultUserForm: AdminUserCreateRequest = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  roleName: 'ROLE_USER',
  verified: false,
  sendVerificationEmail: true,
};

const defaultPasswordResetForm: AdminUserPasswordResetRequest & { confirmPassword: string } = {
  newPassword: '',
  confirmPassword: '',
};

type AdminTab = 'empresa' | 'smtp' | 'usuarios';
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
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null);
  const [tenantForm, setTenantForm] = useState<UpdateTenantSettingsRequest>(defaultTenantForm);
  const [lastOperation, setLastOperation] = useState<SmtpOperationResult | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<AdminUserCreateRequest>(defaultUserForm);
  const [creatingUser, setCreatingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<AdminUserUpdateRequest | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState<string | null>(null);
  const [passwordResetForm, setPasswordResetForm] = useState<(AdminUserPasswordResetRequest & { confirmPassword: string }) | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('empresa');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('all');

  const isAdmin = useMemo(
    () => user?.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN') ?? false,
    [user]
  );

  const confirmedUsersCount = useMemo(
    () => users.filter((item) => item.verified !== false).length,
    [users]
  );

  const activeUsersCount = useMemo(
    () => users.filter((item) => item.active !== false).length,
    [users]
  );

  const pendingUsersCount = useMemo(
    () => users.filter((item) => item.verified === false).length,
    [users]
  );

  const adminUsersCount = useMemo(
    () => users.filter((item) => item.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN')).length,
    [users]
  );

  const tabs: Array<{ id: AdminTab; label: string; eyebrow: string; count: string }> = [
    {
      id: 'empresa',
      label: 'Empresa',
      eyebrow: 'Dados institucionais',
      count: tenantSettings?.status || 'Sem status',
    },
    {
      id: 'smtp',
      label: 'SMTP',
      eyebrow: 'Comunicacao',
      count: currentSettings?.enabled ? 'Ativo' : 'Inativo',
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

  const filteredActiveUsersCount = useMemo(
    () => filteredUsers.filter((item) => item.active !== false).length,
    [filteredUsers]
  );

  const filteredPendingUsersCount = useMemo(
    () => filteredUsers.filter((item) => item.verified === false).length,
    [filteredUsers]
  );

  const filteredAdminUsersCount = useMemo(
    () => filteredUsers.filter((item) => item.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN')).length,
    [filteredUsers]
  );

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setLoadingTenant(false);
      setLoadingUsers(false);
      return;
    }
    void Promise.all([loadTenantSettings(), loadSettings(), loadUsers()]);
  }, [isAdmin]);

  const loadTenantSettings = async () => {
    try {
      setLoadingTenant(true);
      const settings = await adminSettingsService.getTenantSettings();
      syncTenantForm(settings);
      setTenantSettings(settings);
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel carregar os dados da empresa.');
    } finally {
      setLoadingTenant(false);
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

  const syncTenantForm = (settings: TenantSettings) => {
    setTenantForm({
      name: settings.name || '',
      planCode: settings.planCode || '',
      status: settings.status === 'INACTIVE' || settings.status === 'BLOCKED' ? settings.status : 'ACTIVE',
    });
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await adminSettingsService.getUsers();
      setUsers(response);
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel carregar os usuarios do tenant.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const setField = <K extends keyof UpdateSmtpSettingsRequest>(field: K, value: UpdateSmtpSettingsRequest[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setTenantField = <K extends keyof UpdateTenantSettingsRequest>(field: K, value: UpdateTenantSettingsRequest[K]) => {
    setTenantForm((prev) => ({ ...prev, [field]: value }));
  };

  const setUserField = <K extends keyof AdminUserCreateRequest>(field: K, value: AdminUserCreateRequest[K]) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
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

  const handleVerifiedChange = (checked: boolean) => {
    setUserForm((prev) => ({
      ...prev,
      verified: checked,
      sendVerificationEmail: checked ? false : prev.sendVerificationEmail,
    }));
  };

  const handleSendVerificationEmailChange = (checked: boolean) => {
    setUserForm((prev) => ({
      ...prev,
      sendVerificationEmail: checked,
      verified: checked ? false : prev.verified,
    }));
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

  const handleSaveTenant = async () => {
    try {
      setSaving(true);
      const payload: UpdateTenantSettingsRequest = {
        name: tenantForm.name.trim(),
        planCode: tenantForm.planCode?.trim() || undefined,
        status: tenantForm.status || 'ACTIVE',
      };

      const settings = await adminSettingsService.updateTenantSettings(payload);
      setTenantSettings(settings);
      syncTenantForm(settings);
      showSuccess('Dados da empresa atualizados com sucesso.');
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel salvar os dados da empresa.');
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

  const handleCreateUser = async () => {
    try {
      setCreatingUser(true);
      const payload: AdminUserCreateRequest = {
        ...userForm,
        username: userForm.username.trim() || userForm.email.trim().toLowerCase(),
        email: userForm.email.trim().toLowerCase(),
        fullName: userForm.fullName.trim(),
        password: userForm.password,
      };

      const createdUser = await adminSettingsService.createUser(payload);
      setUserForm(defaultUserForm);
      showSuccess(
        payload.verified
          ? `Usuario ${createdUser.email || createdUser.username} criado e confirmado com sucesso.`
          : payload.sendVerificationEmail
            ? `Usuario ${createdUser.email || createdUser.username} criado. O e-mail de confirmacao foi enviado.`
            : `Usuario ${createdUser.email || createdUser.username} criado com confirmacao pendente.`
      );
      await loadUsers();
    } catch (error: unknown) {
      showError(error, 'Nao foi possivel criar o usuario.');
    } finally {
      setCreatingUser(false);
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

      <div className="admin-settings-overview">
        <div className="admin-overview-card">
          <span className="admin-overview-label">Empresa</span>
          <strong>{tenantSettings?.name || 'Carregando...'}</strong>
          <span>{tenantSettings?.status || 'Sem status'}</span>
          <div className="admin-overview-meta">
            <span>{tenantSettings?.planCode || 'Sem plano definido'}</span>
            <span>{tenantSettings?.code || 'Sem codigo'}</span>
          </div>
        </div>
        <div className="admin-overview-card">
          <span className="admin-overview-label">SMTP</span>
          <strong>{currentSettings?.enabled ? 'Habilitado' : 'Desabilitado'}</strong>
          <span>{currentSettings?.fromAddress || 'Sem remetente definido'}</span>
          <div className="admin-overview-meta">
            <span>{currentSettings?.host || 'Sem host'}</span>
            <span>{currentSettings?.port ? `Porta ${currentSettings.port}` : 'Sem porta'}</span>
          </div>
        </div>
        <div className="admin-overview-card">
          <span className="admin-overview-label">Usuarios</span>
          <strong>{users.length}</strong>
          <span>{activeUsersCount} ativos, {confirmedUsersCount} confirmados</span>
          <div className="admin-overview-meta">
            <span>{pendingUsersCount} pendentes</span>
            <span>{adminUsersCount} admins</span>
          </div>
        </div>
      </div>

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

      {activeTab === 'empresa' && (
        <section className="admin-settings-card admin-settings-panel">
          <div className="admin-settings-panel-header">
            <div>
              <h2>Dados da Empresa</h2>
              <p>Controle o nome operacional, o plano e o status da sua conta.</p>
            </div>
            <div className="admin-settings-panel-stats">
              <span className="admin-settings-stat">Status: {tenantSettings?.status || 'Sem status'}</span>
              <span className="admin-settings-stat">Plano: {tenantSettings?.planCode || 'Nao definido'}</span>
            </div>
          </div>
          {loadingTenant ? (
            <p>Carregando dados da empresa...</p>
          ) : (
            <>
              <div className="admin-panel-highlights">
                <div className="admin-panel-highlight-card">
                  <span className="admin-panel-highlight-label">Status</span>
                  <strong>{tenantSettings?.status || 'Sem status'}</strong>
                  <span>governanca operacional</span>
                </div>
                <div className="admin-panel-highlight-card">
                  <span className="admin-panel-highlight-label">Plano</span>
                  <strong>{tenantSettings?.planCode || 'Nao definido'}</strong>
                  <span>enquadramento comercial</span>
                </div>
                <div className="admin-panel-highlight-card">
                  <span className="admin-panel-highlight-label">Codigo</span>
                  <strong>{tenantSettings?.code || 'Sem codigo'}</strong>
                  <span>identificador do tenant</span>
                </div>
                <div className="admin-panel-highlight-card">
                  <span className="admin-panel-highlight-label">Tenant Padrao</span>
                  <strong>{tenantSettings?.isDefault ? 'Sim' : 'Nao'}</strong>
                  <span>vinculo institucional</span>
                </div>
              </div>

              <div className="admin-settings-subsections">
                <section className="admin-settings-subsection">
                  <div className="admin-settings-subsection-header">
                    <div>
                      <h3>Identidade Institucional</h3>
                      <p>Defina como a empresa aparece para os operadores e nos fluxos principais.</p>
                    </div>
                  </div>
                  <div className="admin-settings-form">
                    <div className="admin-settings-row">
                      <div className="admin-settings-field">
                        <label htmlFor="tenant-name">Nome da Empresa</label>
                        <input
                          id="tenant-name"
                          value={tenantForm.name}
                          onChange={(e) => setTenantField('name', e.target.value)}
                          placeholder="Nome exibido para a conta"
                        />
                      </div>
                      <div className="admin-settings-field">
                        <label htmlFor="tenant-plan">Plano</label>
                        <input
                          id="tenant-plan"
                          value={tenantForm.planCode || ''}
                          onChange={(e) => setTenantField('planCode', e.target.value)}
                          placeholder="foundation"
                        />
                      </div>
                    </div>

                    <div className="admin-settings-row">
                      <div className="admin-settings-field">
                        <label htmlFor="tenant-code">Codigo</label>
                        <input
                          id="tenant-code"
                          value={tenantSettings?.code || ''}
                          readOnly
                          className="admin-settings-readonly"
                        />
                      </div>
                      <div className="admin-settings-field">
                        <label htmlFor="tenant-slug">Identificador</label>
                        <input
                          id="tenant-slug"
                          value={tenantSettings?.slug || ''}
                          readOnly
                          className="admin-settings-readonly"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="admin-settings-subsection">
                  <div className="admin-settings-subsection-header">
                    <div>
                      <h3>Governanca Operacional</h3>
                      <p>Controle o status da conta e visualize impactos operacionais do tenant.</p>
                    </div>
                  </div>
                  <div className="admin-settings-form">
                    <div className="admin-settings-row">
                      <div className="admin-settings-field">
                        <label htmlFor="tenant-status">Status Operacional</label>
                        <select
                          id="tenant-status"
                          value={tenantForm.status || 'ACTIVE'}
                          onChange={(e) => setTenantField('status', e.target.value as UpdateTenantSettingsRequest['status'])}
                        >
                          <option value="ACTIVE">Ativo</option>
                          <option value="INACTIVE">Inativo</option>
                          <option value="BLOCKED">Bloqueado</option>
                        </select>
                      </div>
                      <div className="admin-settings-field">
                        <label htmlFor="tenant-current-status">Status Atual</label>
                        <input
                          id="tenant-current-status"
                          value={tenantSettings?.status || 'Nao informado'}
                          readOnly
                          className="admin-settings-readonly"
                        />
                      </div>
                    </div>

                    <div className="admin-settings-meta">
                      <div>Tenant padrao: {tenantSettings?.isDefault ? 'Sim' : 'Nao'}</div>
                      <div>Impacto operacional: apenas tenants com status ACTIVE conseguem autenticar novos logins.</div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="admin-settings-actions">
                <button
                  className="admin-settings-button primary"
                  onClick={handleSaveTenant}
                  disabled={saving || !tenantForm.name.trim()}
                >
                  {saving ? 'Salvando...' : 'Salvar Dados da Empresa'}
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
              <div>Senha cadastrada: {currentSettings?.hasPassword ? 'Sim' : 'Nao'}</div>
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
              <p>Crie usuarios, ajuste perfis e controle confirmacao, senha e atividade.</p>
            </div>
            <div className="admin-settings-panel-stats">
              <span className="admin-settings-stat">Ativos: {activeUsersCount}</span>
              <span className="admin-settings-stat">Pendentes: {pendingUsersCount}</span>
              <span className="admin-settings-stat">Admins: {adminUsersCount}</span>
            </div>
          </div>
          <div className="admin-user-sections">
            <section className="admin-user-section admin-user-section-create">
              <div className="admin-user-section-header">
                <div>
                  <h3>Novo Usuario</h3>
                  <p>Cadastre novos acessos com perfil, senha inicial e regra de confirmacao.</p>
                </div>
              </div>

              <div className="admin-user-create">
                <div className="admin-user-create-grid">
                  <div className="admin-settings-field">
                    <label htmlFor="create-user-full-name">Nome Completo</label>
                    <input
                      id="create-user-full-name"
                      value={userForm.fullName}
                      onChange={(e) => setUserField('fullName', e.target.value)}
                      placeholder="Nome do usuario"
                    />
                  </div>
                  <div className="admin-settings-field">
                    <label htmlFor="create-user-email">E-mail</label>
                    <input
                      id="create-user-email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserField('email', e.target.value)}
                      placeholder="usuario@dominio.com"
                    />
                  </div>
                  <div className="admin-settings-field">
                    <label htmlFor="create-user-username">Login</label>
                    <input
                      id="create-user-username"
                      value={userForm.username}
                      onChange={(e) => setUserField('username', e.target.value)}
                      placeholder="Opcional. Se vazio, usa o e-mail"
                    />
                  </div>
                  <div className="admin-settings-field">
                    <label htmlFor="create-user-password">Senha Inicial</label>
                    <input
                      id="create-user-password"
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserField('password', e.target.value)}
                      placeholder="Minimo de 6 caracteres"
                    />
                  </div>
                  <div className="admin-settings-field">
                    <label htmlFor="create-user-role">Perfil</label>
                    <select
                      id="create-user-role"
                      value={userForm.roleName}
                      onChange={(e) => setUserField('roleName', e.target.value as AdminUserCreateRequest['roleName'])}
                    >
                      <option value="ROLE_USER">Usuario</option>
                      <option value="ROLE_ADMIN">Administrador</option>
                    </select>
                  </div>
                </div>

                <div className="admin-settings-checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={userForm.verified}
                      onChange={(e) => handleVerifiedChange(e.target.checked)}
                    />
                    Criar conta ja confirmada e liberar login sem e-mail
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={userForm.sendVerificationEmail}
                      onChange={(e) => handleSendVerificationEmailChange(e.target.checked)}
                    />
                    Enviar e-mail de confirmacao e deixar conta pendente
                  </label>
                </div>

                <div className="admin-settings-meta">
                  {userForm.verified && <div>Modo atual: a conta sera criada pronta para login e nenhum e-mail de confirmacao sera enviado.</div>}
                  {!userForm.verified && userForm.sendVerificationEmail && <div>Modo atual: a conta sera criada pendente e o sistema enviara um e-mail de confirmacao.</div>}
                  {!userForm.verified && !userForm.sendVerificationEmail && <div>Modo atual: a conta sera criada pendente sem envio automatico de e-mail.</div>}
                </div>

                <div className="admin-settings-actions">
                  <button
                    className="admin-settings-button primary"
                    onClick={handleCreateUser}
                    disabled={
                      creatingUser ||
                      !userForm.fullName.trim() ||
                      !userForm.email.trim() ||
                      !userForm.password.trim()
                    }
                  >
                    {creatingUser ? 'Criando...' : 'Criar Usuario'}
                  </button>
                </div>
              </div>
            </section>

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

              <div className="admin-users-highlights">
                <div className="admin-users-highlight-card">
                  <span className="admin-users-highlight-label">Exibidos</span>
                  <strong>{filteredUsers.length}</strong>
                  <span>usuarios no recorte atual</span>
                </div>
                <div className="admin-users-highlight-card">
                  <span className="admin-users-highlight-label">Ativos</span>
                  <strong>{filteredActiveUsersCount}</strong>
                  <span>aptos para acesso</span>
                </div>
                <div className="admin-users-highlight-card">
                  <span className="admin-users-highlight-label">Pendentes</span>
                  <strong>{filteredPendingUsersCount}</strong>
                  <span>aguardando confirmacao</span>
                </div>
                <div className="admin-users-highlight-card">
                  <span className="admin-users-highlight-label">Admins</span>
                  <strong>{filteredAdminUsersCount}</strong>
                  <span>com controle administrativo</span>
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
