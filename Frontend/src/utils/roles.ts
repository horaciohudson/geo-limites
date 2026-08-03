import type { Role, User } from '@/types';

const normalizeRoleName = (roleName?: string): string => String(roleName || '').toUpperCase();

export const hasRole = (roles: Role[] | undefined, expectedRole: string): boolean =>
  (roles ?? []).some((role) => normalizeRoleName(role.name) === normalizeRoleName(expectedRole));

export const isPlatformAdmin = (user: User | null | undefined): boolean =>
  hasRole(user?.roles, 'ROLE_ADMIN') || hasRole(user?.roles, 'ADMIN');

export const isTenantAdmin = (user: User | null | undefined): boolean =>
  hasRole(user?.roles, 'ROLE_TENANT_ADMIN') || hasRole(user?.roles, 'TENANT_ADMIN');

export const canManageTenantUsers = (user: User | null | undefined): boolean =>
  isPlatformAdmin(user) || isTenantAdmin(user);

export const getPrimaryRoleLabel = (user: User | null | undefined): string => {
  if (isPlatformAdmin(user)) {
    return 'Administrador da Plataforma';
  }
  if (isTenantAdmin(user)) {
    return 'Administrador da Empresa';
  }
  return 'Usuario';
};
