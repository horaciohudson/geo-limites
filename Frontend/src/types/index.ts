// Tipos para o GeoLimites
import type React from 'react';

export interface User {
  id: string;
  username: string;
  email?: string;
  fullName: string;
  corporateName?: string;
  tradeName?: string;
  cnpj?: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  phone?: string;
  mobile?: string;
  whatsapp?: string;
  manager?: string;
  address?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  tenantId?: string;
  tenantCode?: string;
  active: boolean;
  verified?: boolean;
  roles?: Role[];
}

export interface Role {
  id?: string;
  name: string;
}

export interface LoginRequest {
  tenantCode: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export interface FileMetadata {
  id: string;
  originalName: string;     // nome original do arquivo
  storedName: string;       // nome salvo no servidor
  extension: string;        // extensão (dxf, dwg)
  contentType: string;      // tipo MIME
  sizeBytes: number;        // tamanho em bytes
  checksumSha256?: string;  // opcional
  diskPath?: string;        // opcional
  ownerId?: string;         // id do dono (UUID)
  createdAt: string;        // data de criação
  updatedAt: string;        // data de alteração
}

export interface UploadResponse {
  id: string;
  fileName: string;
  message: string;
}

// Re-exportar tipos de Template
export * from './template';

export interface MemorialRequest {
  fileId: string;
  projectName: string;
  projectDescription?: string;
}

export interface MemorialResponse {
  memorialText: string;  // Corrigido para corresponder ao backend
  projectName: string;
  projectDescription: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

// Tipos para componentes
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>, ComponentProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

export interface InputProps extends ComponentProps {
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  label?: string;
}

// Re-export memorial standard types
export * from './memorial-standard';
