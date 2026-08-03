import React, { useEffect, useMemo, useState } from 'react';
import adminSettingsService from '@/services/adminSettings';
import { useAuth } from '@/auth/AuthContext';
import type { User } from '@/types';
import { canManageTenantUsers, getPrimaryRoleLabel, isPlatformAdmin, isTenantAdmin } from '@/utils/roles';

interface CreateUserFormState {
  fullName: string;
  email: string;
  password: string;
  verified: boolean;
  sendVerificationEmail: boolean;
}

const defaultForm: CreateUserFormState = {
  fullName: '',
  email: '',
  password: '',
  verified: false,
  sendVerificationEmail: true,
};

const UserAreaXCriarUsuario: React.FC = () => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);
  const [statusUserId, setStatusUserId] = useState<string | null>(null);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [relinquishingAdmin, setRelinquishingAdmin] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateUserFormState>(defaultForm);

  const canManageUsers = canManageTenantUsers(user);
  const adminUsers = useMemo(
    () => users.filter((item) => isPlatformAdmin(item) || isTenantAdmin(item)),
    [users]
  );
  const tenantAdminUsers = useMemo(
    () => users.filter((item) => isTenantAdmin(item)),
    [users]
  );
  const regularUsers = useMemo(
    () => users.filter((item) => !isPlatformAdmin(item) && !isTenantAdmin(item)),
    [users]
  );
  const otherActiveAdminCount = useMemo(
    () => tenantAdminUsers.filter((item) => item.id !== user?.id && item.active).length,
    [tenantAdminUsers, user?.id]
  );
  const canRelinquishAdminRole = isTenantAdmin(user) && otherActiveAdminCount > 0;

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminSettingsService.getUsers();
      setUsers(response);
    } catch (err) {
      setError('Nao foi possivel carregar os usuarios da empresa.');
    } finally {
      setLoading(false);
    }
  };

  const getUserErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  useEffect(() => {
    if (!canManageUsers) {
      setLoading(false);
      return;
    }
    void loadUsers();
  }, [canManageUsers]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      setSaving(true);
      const normalizedEmail = form.email.trim().toLowerCase();

      await adminSettingsService.createUser({
        fullName: form.fullName.trim().toUpperCase(),
        email: normalizedEmail,
        username: normalizedEmail,
        password: form.password,
        roleName: 'ROLE_USER',
        verified: form.verified,
        sendVerificationEmail: form.sendVerificationEmail,
      });

      setForm(defaultForm);
      setMessage('Usuario criado com sucesso.');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel criar o usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handlePromoteToTenantAdmin = async (targetUser: User) => {
    if (!window.confirm(`Promover ${targetUser.fullName || targetUser.username} para administrador da empresa?`)) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      setPromotingUserId(targetUser.id);
      const updatedUser = await adminSettingsService.promoteUserToTenantAdmin(targetUser.id);
      setMessage(`${updatedUser.fullName || updatedUser.username} agora tambem responde como administrador da empresa.`);
      await loadUsers();
    } catch (err) {
      setError(getUserErrorMessage(err, 'Nao foi possivel promover o usuario.'));
    } finally {
      setPromotingUserId(null);
    }
  };

  const handleRelinquishAdminRole = async () => {
    if (!window.confirm('Confirmar transferencia da responsabilidade administrativa? Voce sera desconectado para entrar novamente com o novo perfil.')) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      setRelinquishingAdmin(true);
      const response = await adminSettingsService.relinquishCurrentTenantAdmin();
      logout(response.message || 'Responsabilidade administrativa transferida. Entre novamente para continuar.');
    } catch (err) {
      setError(getUserErrorMessage(err, 'Nao foi possivel transferir a responsabilidade administrativa.'));
      setRelinquishingAdmin(false);
    }
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    setMessage(null);
    setError(null);

    try {
      setStatusUserId(targetUser.id);
      const updatedUser = await adminSettingsService.updateUser(targetUser.id, {
        fullName: targetUser.fullName || targetUser.username,
        email: targetUser.email || targetUser.username,
        username: targetUser.username,
        roleName: 'ROLE_USER',
        active: !targetUser.active,
      });
      setMessage(
        updatedUser.active
          ? `${updatedUser.fullName || updatedUser.username} foi reativado com sucesso.`
          : `${updatedUser.fullName || updatedUser.username} foi inativado com sucesso.`
      );
      await loadUsers();
    } catch (err) {
      setError(getUserErrorMessage(err, 'Nao foi possivel atualizar o status do usuario.'));
    } finally {
      setStatusUserId(null);
    }
  };

  const handleResendVerification = async (targetUser: User) => {
    setMessage(null);
    setError(null);

    try {
      setResendingUserId(targetUser.id);
      const response = await adminSettingsService.resendUserVerification(targetUser.id);
      setMessage(response.message || `Confirmacao reenviada para ${targetUser.email || targetUser.username}.`);
    } catch (err) {
      setError(getUserErrorMessage(err, 'Nao foi possivel reenviar a confirmacao.'));
    } finally {
      setResendingUserId(null);
    }
  };

  if (!canManageUsers) {
    return (
      <div className="account-content" style={{ padding: '2rem', minHeight: '400px' }}>
        <div className="account-section-intro">
          <div>
            <span className="account-section-eyebrow">Equipe</span>
            <h2>Equipe e Acessos</h2>
          </div>
          <span className="account-section-badge">Restrito</span>
        </div>
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">Somente administradores da empresa ou da plataforma podem criar usuarios.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="account-content" style={{ padding: '2rem', minHeight: '400px' }}>
      <div className="account-section-intro">
        <div>
          <span className="account-section-eyebrow">Equipe</span>
          <h2>Equipe e Acessos</h2>
        </div>
        <span className="account-section-badge">Empresa</span>
      </div>

      <div className="account-user-management-grid">
        <form onSubmit={handleSubmit} autoComplete="off" className="profile-section account-user-form-card">
          <div className="section-header">
            <h3>Novo acesso</h3>
            <p>Cadastre usuarios operacionais com e-mail proprio e senha inicial independente.</p>
          </div>

          <div className="account-user-field-grid">
            <label className="account-user-field">
              <span>Nome completo</span>
              <input
                name="new-user-full-name"
                autoComplete="off"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value.toUpperCase() }))}
                required
              />
            </label>

            <label className="account-user-field">
              <span>E-mail</span>
              <input
                type="email"
                name="new-user-email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>

            <label className="account-user-field">
              <span>Senha inicial</span>
              <input
                type="password"
                name="new-user-password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                minLength={6}
                required
              />
            </label>
          </div>

          <div className="account-user-toggle-list">
            <label className="account-user-toggle-row">
              <input
                type="checkbox"
                checked={form.verified}
                onChange={(e) => setForm((prev) => ({ ...prev, verified: e.target.checked }))}
              />
              <span>Criar conta já verificada</span>
            </label>

            <label className="account-user-toggle-row">
              <input
                type="checkbox"
                checked={form.sendVerificationEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, sendVerificationEmail: e.target.checked }))}
                disabled={form.verified}
              />
              <span>Enviar e-mail de verificação</span>
            </label>
          </div>

          {message && <div className="status-banner success account-user-status">{message}</div>}
          {error && <div className="status-banner error account-user-status">{error}</div>}

          <div className="account-user-submit-row">
            <button type="submit" className="profile-submit-btn" disabled={saving}>
              {saving ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>

        <div className="account-user-side-column">
          <div className="profile-section account-user-list-card">
            <div className="section-header">
              <h3>Governanca administrativa</h3>
              <p>Promova gestores somente quando o acesso estiver ativo, confirmado e pronto para operar.</p>
            </div>

            <div className="account-user-list">
              {adminUsers.map((item) => {
                const isCurrentUser = item.id === user?.id;
                return (
                  <div key={item.id} className="account-user-card">
                    <div className="account-user-card-row">
                      <strong>{item.fullName || item.username}</strong>
                      <span className="account-user-card-badge">{isCurrentUser ? 'Voce' : 'Admin'}</span>
                    </div>
                    <span>{item.email || item.username}</span>
                    <span>{getPrimaryRoleLabel(item)}</span>
                    <span>{item.active ? 'Ativo' : 'Inativo'}</span>
                    {isCurrentUser && (
                      <div className="account-user-card-actions">
                        <button
                          type="button"
                          className="profile-submit-btn secondary"
                          onClick={handleRelinquishAdminRole}
                          disabled={!canRelinquishAdminRole || relinquishingAdmin}
                        >
                          {relinquishingAdmin ? 'Transferindo...' : 'Transferir Minha Responsabilidade'}
                        </button>
                        {!canRelinquishAdminRole && (
                          <span className="account-user-action-note">
                            Promova outro administrador ativo antes de encerrar sua gestao.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {!loading && adminUsers.length === 0 && (
                <span>Nenhum administrador encontrado para esta empresa.</span>
              )}
            </div>
          </div>

          <div className="profile-section account-user-list-card">
            <div className="section-header">
              <h3>Usuarios elegiveis para promocao</h3>
              <p>A promocao libera a administracao da empresa, mas nao concede poder sobre a senha de outros gestores.</p>
            </div>

            <div className="account-user-list">
              {regularUsers.map((item) => {
                const promotionBlockedReason = !item.active
                  ? 'Ative o usuario antes da promocao.'
                  : item.verified === false
                    ? 'Confirme o e-mail antes da promocao.'
                    : item.approvalPending
                      ? 'Libere o acesso operacional antes da promocao.'
                      : null;

                return (
                  <div key={`promotion-${item.id}`} className="account-user-card">
                    <strong>{item.fullName || item.username}</strong>
                    <span>{item.email || item.username}</span>
                    <span>{item.active ? 'Ativo' : 'Inativo'}</span>
                    <span>{item.verified === false ? 'E-mail pendente' : item.approvalPending ? 'Aguardando aprovacao' : 'Pronto para governanca'}</span>
                    <div className="account-user-card-actions">
                      <button
                        type="button"
                        className="profile-submit-btn secondary"
                        onClick={() => handlePromoteToTenantAdmin(item)}
                        disabled={Boolean(promotionBlockedReason) || promotingUserId === item.id}
                      >
                        {promotingUserId === item.id ? 'Promovendo...' : 'Promover a Administrador'}
                      </button>
                      {promotionBlockedReason && (
                        <span className="account-user-action-note">{promotionBlockedReason}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {!loading && regularUsers.length === 0 && (
                <span>Nenhum usuario comum encontrado para esta empresa.</span>
              )}
            </div>
          </div>

          <div className="profile-section account-user-list-card">
            <div className="section-header">
              <h3>Usuarios comuns da empresa</h3>
              <p>Controle apenas o vinculo operacional: ativar, inativar e reenviar confirmacao quando necessario.</p>
            </div>

            <div className="account-user-list">
              {regularUsers.map((item) => (
                <div key={item.id} className="account-user-card">
                  <strong>{item.fullName || item.username}</strong>
                  <span>{item.email || item.username}</span>
                  <span>{getPrimaryRoleLabel(item)}</span>
                  <span>{item.active ? 'Ativo' : item.approvalPending ? 'Aguardando aprovacao' : 'Inativo'}</span>
                  <div className="account-user-card-actions">
                    {item.verified === false && (
                      <button
                        type="button"
                        className="profile-submit-btn secondary"
                        onClick={() => handleResendVerification(item)}
                        disabled={resendingUserId === item.id}
                      >
                        {resendingUserId === item.id ? 'Reenviando...' : 'Reenviar Confirmacao'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="profile-submit-btn secondary"
                      onClick={() => handleToggleUserStatus(item)}
                      disabled={statusUserId === item.id}
                    >
                      {statusUserId === item.id
                        ? 'Atualizando...'
                        : item.active
                          ? 'Inativar Usuario'
                          : 'Reativar Usuario'}
                    </button>
                  </div>
                </div>
              ))}

              {!loading && regularUsers.length === 0 && (
                <span>Nenhum usuario comum encontrado para esta empresa.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAreaXCriarUsuario;
