export interface MemorialStandard {
  id: string;
  name: string;
  description: string;
  standardText: string;
  promptTemplate: string;
  active: boolean;
  isDefault: boolean;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemorialStandardCreate {
  name: string;
  description: string;
  standardText: string;
  promptTemplate: string;
  isDefault: boolean;
}

export interface MemorialStandardFormData {
  name: string;
  description: string;
  standardText: string;
  promptTemplate: string;
  isDefault: boolean;
}