import api from './api';
import type { User } from '@/types';

export interface TenantOperationalAdminDTO {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  tenantStatus: string;
  onboardingStatus: string;
  billingStatus: string;
  companyDataCompleted: boolean;
  adminApproved: boolean;
  firstPaymentConfirmed: boolean;
  operationalAccessReleased: boolean;
  adminApprovedBy: string;
  adminApprovedAt: string;
  firstPaymentConfirmedBy: string;
  firstPaymentConfirmedAt: string;
  operationalAccessReleasedBy: string;
  operationalAccessReleasedAt: string;
  releaseNotes: string;
}

export interface TenantOperationalActionRequest {
  value: boolean;
  notes?: string;
}

class TenantAdminService {
  async getGlobalUsers(): Promise<User[]> {
    const response = await api.get('/admin/tenants/users');
    return response.data;
  }

  async getCurrentTenantOperational(): Promise<TenantOperationalAdminDTO> {
    const response = await api.get('/tenant-access/current');
    return response.data;
  }

  async getOperationalTenants(): Promise<TenantOperationalAdminDTO[]> {
    const response = await api.get('/admin/tenants/operational');
    return response.data;
  }

  async getTenantOperational(tenantId: string): Promise<TenantOperationalAdminDTO> {
    const response = await api.get(`/admin/tenants/operational/${tenantId}`);
    return response.data;
  }

  async setAdminApproved(tenantId: string, payload: TenantOperationalActionRequest): Promise<TenantOperationalAdminDTO> {
    const response = await api.patch(`/admin/tenants/operational/${tenantId}/admin-approval`, payload);
    return response.data;
  }

  async setFirstPaymentConfirmed(tenantId: string, payload: TenantOperationalActionRequest): Promise<TenantOperationalAdminDTO> {
    const response = await api.patch(`/admin/tenants/operational/${tenantId}/first-payment`, payload);
    return response.data;
  }

  async setOperationalAccessReleased(tenantId: string, payload: TenantOperationalActionRequest): Promise<TenantOperationalAdminDTO> {
    const response = await api.patch(`/admin/tenants/operational/${tenantId}/release`, payload);
    return response.data;
  }
}

export default new TenantAdminService();
