// Tipos para templates gerados pelo fluxo documental
// GeoLimites - Frontend

export interface Template {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  filePath: string;
  memorialStandardId?: string;
  municipality?: string;
  abntNorm?: string;
  status: TemplateStatus;
  ownerId: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCreate {
  name: string;
  description?: string;
  fileUrl: string;
  filePath: string;
  memorialStandardId?: string;
  municipality?: string;
  abntNorm?: string;
  status?: TemplateStatus;
}

export interface TemplateUpdate {
  name?: string;
  description?: string;
  fileUrl?: string;
  filePath?: string;
  memorialStandardId?: string;
  municipality?: string;
  abntNorm?: string;
  status?: TemplateStatus;
}

export interface TemplateFormData {
  name: string;
  description: string;
  municipality: string;
  abntNorm: string;
  memorialStandardId: string;
  exampleFile?: File;
}

export type TemplateStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';

export interface TemplateGenerationRequest {
  name: string;
  description?: string;
  municipality?: string;
  abntNorm?: string;
  memorialStandardId?: string;
  exampleFileId: string;
  targetFolderPath: string;
}

export interface TemplateGenerationResponse {
  id: string;
  name: string;
  fileUrl: string;
  filePath: string;
  message: string;
}

// Interface para seleção de templates (compatibilidade com código existente)
export interface TemplateOption {
  id: string;
  name: string;
  description?: string;
  file?: string;
}
