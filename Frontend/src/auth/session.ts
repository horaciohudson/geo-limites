export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';
const AUTH_REDIRECT_REASON_KEY = 'auth_redirect_reason';
export const TOKEN_STORAGE_KEY = 'memorial.token';
const LEGACY_TOKEN_STORAGE_KEYS = ['token', 'authToken', 'jwt', 'access_token'] as const;
type LegacyTokenStorageKey = (typeof LEGACY_TOKEN_STORAGE_KEYS)[number];

type JwtPayload = {
  exp?: number;
  iat?: number;
  roles?: string[];
  role?: string;
};

export function getJwtPayload(token: string): JwtPayload | null {
  try {
    return JSON.parse(atob(token.split('.')[1])) as JwtPayload;
  } catch {
    return null;
  }
}

export function validateJwtLocally(token: string): boolean {
  try {
    const payload = getJwtPayload(token);
    if (!payload) {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    const issuedAt = payload.iat;
    const expiresAt = payload.exp;

    if (typeof issuedAt === 'number' && issuedAt > now + 3600) {
      return false;
    }

    if (typeof expiresAt === 'number' && expiresAt < now) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getStoredJwtRoles(): string[] {
  const token = getStoredToken();
  if (!token) {
    return [];
  }

  const payload = getJwtPayload(token);
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload.roles)) {
    return payload.roles;
  }

  if (typeof payload.role === 'string' && payload.role.trim()) {
    return [payload.role.trim()];
  }

  return [];
}

export function hasStoredAdminRole(): boolean {
  return getStoredJwtRoles().some((role) => role === 'ROLE_ADMIN' || role === 'ADMIN');
}

export function getStoredToken(): string | null {
  const namespacedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (namespacedToken) {
    return namespacedToken;
  }

  for (const legacyKey of LEGACY_TOKEN_STORAGE_KEYS) {
    const legacyToken = localStorage.getItem(legacyKey);
    if (legacyToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, legacyToken);
      localStorage.removeItem(legacyKey);
      return legacyToken;
    }
  }

  return null;
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  LEGACY_TOKEN_STORAGE_KEYS.forEach((legacyKey: LegacyTokenStorageKey) => localStorage.removeItem(legacyKey));
}

export function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  for (const legacyKey of LEGACY_TOKEN_STORAGE_KEYS) {
    localStorage.removeItem(legacyKey);
  }
}

export function storeRedirectReason(message: string): void {
  sessionStorage.setItem(AUTH_REDIRECT_REASON_KEY, message);
}

export function consumeRedirectReason(): string | null {
  const message = sessionStorage.getItem(AUTH_REDIRECT_REASON_KEY);
  if (message) {
    sessionStorage.removeItem(AUTH_REDIRECT_REASON_KEY);
  }
  return message;
}

export function notifySessionExpired(message: string): void {
  clearStoredSession();
  storeRedirectReason(message);
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, { detail: { message } }));
}
