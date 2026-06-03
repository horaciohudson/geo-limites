// Tipos para cadastro de propriedades
// GeoLimites - Sistema de Cadastro de Terrenos

export interface Property {
  id: string;
  // Dados Básicos
  registrationNumber: string;
  propertyType: PropertyType;
  landUse: LandUse;
  address: PropertyAddress;
  
  // Relacionamentos
  owners: PropertyOwner[];
  documents: PropertyDocument[];
  files: PropertyFile[];
  
  // Metadados
  status: PropertyStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyAddress {
  street: string;
  number?: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  // SIRGAS 2000 Base Coordinates for Memorial Generation
  sirgas?: {
    e: number; // Coordenada Leste (East) em metros
    n: number; // Coordenada Norte (North) em metros
    source: string; // Fonte: GPS, Marco Geodésico, Levantamento, etc.
    zone?: string; // Fuso UTM (ex: 23S, 24S)
    datum?: string; // SIRGAS 2000 (padrão)
  };
}

export interface TechnicalData {
  totalArea: number;
  builtArea?: number;
  perimeter: number;
  vertices: PropertyVertex[];
  confrontations: Confrontation[];
  datum: string; // SIRGAS 2000, etc.
  zone?: string; // Fuso UTM
}

export interface PropertyVertex {
  id: string;
  name: string; // P01, P02, etc.
  x: number; // Coordenada E (Este)
  y: number; // Coordenada N (Norte)
  z?: number; // Altitude (opcional)
  description?: string;
}

export interface Confrontation {
  id: string;
  direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'NORTHEAST' | 'NORTHWEST' | 'SOUTHEAST' | 'SOUTHWEST' | 
           'NORTH_NORTHEAST' | 'EAST_NORTHEAST' | 'EAST_SOUTHEAST' | 'SOUTH_SOUTHEAST' | 
           'SOUTH_SOUTHWEST' | 'WEST_SOUTHWEST' | 'WEST_NORTHWEST' | 'NORTH_NORTHWEST';
  description: string;
  distance: number;
  azimuth?: number; // Azimute em graus (0-360°)
  startVertex: string; // ID do vértice inicial
  endVertex: string; // ID do vértice final
  neighbor?: string; // Vizinho/limitante
}

export interface PropertyOwner {
  id: string;
  propertyId: string;
  ownerType: 'INDIVIDUAL' | 'COMPANY';
  
  // Pessoa Física
  fullName?: string;
  cpf?: string;
  rg?: string;
  
  // Pessoa Jurídica
  companyName?: string;
  cnpj?: string;
  stateRegistration?: string;
  
  // Dados Comuns
  email?: string;
  phone?: string;
  address?: PropertyAddress;
  
  // Participação
  ownershipPercentage: number;
  ownershipType: OwnershipType;
  
  // Metadados
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyDocument {
  id: string;
  propertyId: string;
  documentType: DocumentType;
  documentNumber: string;
  issueDate: string;
  expiryDate?: string;
  issuer: string;
  description?: string;
  fileUrl?: string;
  filePath?: string;
  
  // Metadados
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFile {
  id: string;
  propertyId: string;
  fileName: string;
  originalName: string;
  fileType: FileType;
  fileUrl: string;
  filePath: string;
  sizeBytes: number;
  mimeType: string;
  description?: string;
  
  // Metadados específicos para DXF/DWG
  dxfData?: {
    entities: number;
    layers: string[];
    bounds?: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
  };
  
  // Metadados
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Enums
export type PropertyType = 'URBAN' | 'RURAL' | 'MIXED';
export type LandUse = 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'AGRICULTURAL' | 'MIXED';
export type PropertyStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type OwnershipType = 'FULL' | 'PARTIAL' | 'USUFRUCT' | 'LEASE';
export type DocumentType = 'DEED' | 'REGISTRATION' | 'CERTIFICATE' | 'LICENSE' | 'OTHER';
export type FileType = 'DXF' | 'DWG' | 'PDF' | 'IMAGE' | 'DOCUMENT' | 'OTHER';

// Formulário
export interface PropertyFormData {
  // Aba 1: Dados Básicos
  basicData: {
    registrationNumber: string;
    propertyType: PropertyType;
    landUse: LandUse;
    address: PropertyAddress;
  };
  
  // Aba 2: Proprietários
  owners: Omit<PropertyOwner, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>[];
  
  // Aba 3: Documentos
  documents: Omit<PropertyDocument, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>[];
  
  // Aba 4: Arquivos
  files: File[];
}

export interface PropertyFormValidation {
  basicData: Record<string, string>;
  owners: Record<string, string>;
  documents: Record<string, string>;
  files: Record<string, string>;
  general: string[];
}
