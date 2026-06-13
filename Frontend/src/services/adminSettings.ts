import api from '@/services/api';
import type { User } from '@/types';

export interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  passwordMasked: string;
  hasPassword: boolean;
  auth: boolean;
  sslEnabled: boolean;
  startTls: boolean;
  fromAddress: string;
  fromName: string;
}

export interface UpdateSmtpSettingsRequest {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password?: string;
  auth: boolean;
  sslEnabled: boolean;
  startTls: boolean;
  fromAddress: string;
  fromName: string;
}

export interface SmtpOperationResult {
  source: string;
  host: string;
  port: number;
  username: string;
  fromAddress: string;
  fromName: string;
  startTls: boolean;
  sslEnabled: boolean;
}

export interface TenantSettings {
  id: string;
  name: string;
  code: string;
  slug: string;
  planCode?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | string;
  isDefault?: boolean;
}

export interface UpdateTenantSettingsRequest {
  name: string;
  planCode?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
}

export interface ApiSettings {
  templateApiProvider: string;
  memorialApiProvider: string;
}

export interface CreditPackageSettings {
  id: string;
  name: string;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
  pricePerCredit: number;
  popular: boolean;
}

export interface CreditPricingSettings {
  welcomeCredits: number;
  singleLotCreditCost: number;
  smallProjectMaxLots: number;
  smallProjectCreditCost: number;
  largeProjectCreditCost: number;
  customPricePerCredit: number;
  packages: CreditPackageSettings[];
}

export interface UpdateApiSettingsRequest {
  templateApiProvider: string;
  memorialApiProvider: string;
}

export interface UpdateCreditPackageRequest {
  id: string;
  name: string;
  baseCredits: number;
  bonusCredits: number;
  price: number;
  popular: boolean;
}

export interface UpdateCreditPricingSettingsRequest {
  welcomeCredits: number;
  singleLotCreditCost: number;
  smallProjectMaxLots: number;
  smallProjectCreditCost: number;
  largeProjectCreditCost: number;
  customPricePerCredit: number;
  packages: UpdateCreditPackageRequest[];
}

export interface MessageResponse {
  message: string;
  emailSent?: boolean | null;
  verificationUrl?: string | null;
}

export interface AdminUserCreateRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  roleName: 'ROLE_USER' | 'ROLE_ADMIN';
  verified: boolean;
  sendVerificationEmail: boolean;
}

export interface AdminUserUpdateRequest {
  username: string;
  email: string;
  fullName: string;
  roleName: 'ROLE_USER' | 'ROLE_ADMIN';
  active: boolean;
}

export interface AdminUserPasswordResetRequest {
  newPassword: string;
}

const adminSettingsService = {
  async getTenantSettings(): Promise<TenantSettings> {
    const response = await api.get('/admin/settings/tenant');
    return response.data;
  },

  async updateTenantSettings(payload: UpdateTenantSettingsRequest): Promise<TenantSettings> {
    const response = await api.patch('/admin/settings/tenant', payload);
    return response.data;
  },

  async getApiSettings(): Promise<ApiSettings> {
    const response = await api.get('/admin/settings/api');
    return response.data;
  },

  async updateApiSettings(payload: UpdateApiSettingsRequest): Promise<ApiSettings> {
    const response = await api.patch('/admin/settings/api', payload);
    return response.data;
  },

  async getCreditPricingSettings(): Promise<CreditPricingSettings> {
    const response = await api.get('/admin/settings/credits');
    return response.data;
  },

  async updateCreditPricingSettings(payload: UpdateCreditPricingSettingsRequest): Promise<CreditPricingSettings> {
    const response = await api.patch('/admin/settings/credits', payload);
    return response.data;
  },

  async getSmtpSettings(): Promise<SmtpSettings> {
    const response = await api.get('/admin/settings/smtp');
    return response.data;
  },

  async updateSmtpSettings(payload: UpdateSmtpSettingsRequest): Promise<SmtpSettings> {
    const response = await api.patch('/admin/settings/smtp', payload);
    return response.data;
  },

  async clearSmtpPassword(): Promise<SmtpSettings> {
    const response = await api.delete('/admin/settings/smtp/password');
    return response.data;
  },

  async testSmtpConnection(): Promise<SmtpOperationResult> {
    const response = await api.post('/admin/settings/smtp/test-connection');
    return response.data;
  },

  async sendTestEmail(to: string): Promise<SmtpOperationResult> {
    const response = await api.post('/admin/settings/smtp/test-email', { to });
    return response.data;
  },

  async getUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data;
  },

  async resendUserVerification(userId: string): Promise<MessageResponse> {
    const response = await api.post(`/users/${userId}/resend-verification`);
    return response.data;
  },

  async createUser(payload: AdminUserCreateRequest): Promise<User> {
    const response = await api.post('/users', payload);
    return response.data;
  },

  async updateUser(userId: string, payload: AdminUserUpdateRequest): Promise<User> {
    const response = await api.put(`/users/${userId}`, payload);
    return response.data;
  },

  async resetUserPassword(userId: string, payload: AdminUserPasswordResetRequest): Promise<MessageResponse> {
    const response = await api.post(`/users/${userId}/reset-password`, payload);
    return response.data;
  },
};

export default adminSettingsService;
