import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useTenantOperationalAccess } from '@/hooks/useTenantOperationalAccess';

import PropertyBasicData from '../components/property/PropertyBasicData';
import PropertyOwners from '../components/property/PropertyOwners';
import PropertyDocuments from '../components/property/PropertyDocuments';
import PropertyFiles from '../components/property/PropertyFiles';
import PropertySummary from '../components/property/PropertySummary';
import type { PropertyFormData, PropertyFormFile, PropertyFormValidation } from '../types/property';
import '../styles/PropertyRegister.css';

const createEmptyReferencePoint = (sequenceOrder: number) => ({
  name: '',
  type: 'REFERENCE_POINT' as const,
  coordinateX: undefined,
  coordinateY: undefined,
  coordinateZ: undefined,
  sequenceOrder,
  description: ''
});

const MIN_REFERENCE_POINTS = 2;

const isDxfFile = (file: Pick<PropertyFormFile, 'name'>): boolean =>
  file.name.toLowerCase().endsWith('.dxf');

const isTechnicalFile = (file: Pick<PropertyFormFile, 'name'>): boolean => {
  const normalizedName = file.name.toLowerCase();
  return normalizedName.endsWith('.dxf') || normalizedName.endsWith('.dwg');
};

const getFileIdentity = (file: Pick<PropertyFormFile, 'name' | 'size' | 'lastModified' | 'backendFileId'>): string =>
  file.backendFileId
    ? `backend:${file.backendFileId}`
    : `${file.name}|${file.size}|${file.lastModified || 0}`;

const dedupeFiles = (files: PropertyFormFile[]): PropertyFormFile[] => {
  const uniqueFiles = new Map<string, PropertyFormFile>();
  files.forEach((file) => {
    uniqueFiles.set(getFileIdentity(file), file);
  });
  return Array.from(uniqueFiles.values());
};

const normalizePrimaryTechnicalSelection = (files: PropertyFormFile[]): PropertyFormFile[] => {
  const technicalIndexes = files.reduce<number[]>((indexes, file, index) => {
    if (isTechnicalFile(file)) {
      indexes.push(index);
    }
    return indexes;
  }, []);

  if (technicalIndexes.length === 0) {
    return files.map((file) => ({
      ...file,
      primaryTechnical: false
    }));
  }

  const explicitlyPrimaryIndex = technicalIndexes.find((index) => files[index].primaryTechnical);
  const primaryIndex = explicitlyPrimaryIndex ?? technicalIndexes[0];

  return files.map((file, index) => ({
    ...file,
    primaryTechnical: isTechnicalFile(file) ? index === primaryIndex : false
  }));
};

const hasMeaningfulLandmarkData = (landmark: PropertyFormData['landmarks'][number]): boolean =>
  Boolean(
    landmark.name.trim() ||
    landmark.coordinateX !== undefined ||
    landmark.coordinateY !== undefined ||
    landmark.coordinateZ !== undefined ||
    landmark.description?.trim()
  );

const normalizeLandmarkName = (name: string): string =>
  name.trim().replace(/\s+/g, '').toUpperCase();

// #region debug-point A:frontend-report
const reportDxfImportDebug = (hypothesisId: string, msg: string, data: Record<string, unknown> = {}) => {
  fetch('http://127.0.0.1:7779/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'dxf-landmarks-import',
      runId: 'pre-fix',
      hypothesisId,
      location: 'PropertyRegister.tsx',
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now()
    })
  }).catch(() => {});
};
// #endregion

// #region debug-point A:frontend-report
const reportDxfUpload500Debug = (hypothesisId: string, msg: string, data: Record<string, unknown> = {}) => {
  const DEBUG_DXF_UPLOAD_500_ENABLED = false;
  if (!DEBUG_DXF_UPLOAD_500_ENABLED) {
    return;
  }
  fetch('http://127.0.0.1:7778/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'dxf-upload-500',
      runId: 'pre-fix',
      hypothesisId,
      location: 'PropertyRegister.tsx',
      msg,
      data,
      ts: Date.now()
    })
  }).catch(() => {});
};
// #endregion

const mapLandmarkToForm = (landmark: any, index: number): PropertyFormData['landmarks'][number] => ({
  id: landmark.landmarkId || landmark.id,
  name: landmark.landmarkName || landmark.name || '',
  type: landmark.landmarkType || landmark.type || 'REFERENCE_POINT',
  coordinateX: landmark.coordinateX,
  coordinateY: landmark.coordinateY,
  coordinateZ: landmark.coordinateZ,
  sequenceOrder: landmark.sequenceOrder || index + 1,
  description: landmark.description || ''
});

const ensureMinimumReferencePoints = (
  landmarks: PropertyFormData['landmarks']
): PropertyFormData['landmarks'] => {
  const nextLandmarks = landmarks
    .map((landmark, index) => ({
      ...landmark,
      sequenceOrder: index + 1
    }));

  while (nextLandmarks.length < MIN_REFERENCE_POINTS) {
    nextLandmarks.push(createEmptyReferencePoint(nextLandmarks.length + 1));
  }

  return nextLandmarks;
};

const mergeImportedLandmarks = (
  currentLandmarks: PropertyFormData['landmarks'],
  importedLandmarks: PropertyFormData['landmarks']
): PropertyFormData['landmarks'] => {
  const filledCurrentLandmarks = currentLandmarks.filter(hasMeaningfulLandmarkData);
  const merged = new Map<string, PropertyFormData['landmarks'][number]>();
  const fallbackLandmarks: PropertyFormData['landmarks'] = [];

  filledCurrentLandmarks.forEach((landmark) => {
    const normalizedName = normalizeLandmarkName(landmark.name);
    if (normalizedName) {
      merged.set(normalizedName, landmark);
    } else {
      fallbackLandmarks.push(landmark);
    }
  });

  importedLandmarks.forEach((landmark) => {
    const normalizedName = normalizeLandmarkName(landmark.name);
    if (!normalizedName) {
      fallbackLandmarks.push(landmark);
      return;
    }

    const existing = merged.get(normalizedName);
    if (existing) {
      merged.set(normalizedName, {
        ...landmark,
        ...existing,
        type: existing.type || landmark.type,
        coordinateX: existing.coordinateX ?? landmark.coordinateX,
        coordinateY: existing.coordinateY ?? landmark.coordinateY,
        coordinateZ: existing.coordinateZ ?? landmark.coordinateZ,
        description: existing.description || landmark.description
      });
      return;
    }

    merged.set(normalizedName, landmark);
  });

  return ensureMinimumReferencePoints([
    ...Array.from(merged.values()),
    ...fallbackLandmarks
  ]);
};

interface CachedIncompleteProperty extends PropertyFormData {
  id: string;
  lastModified: string;
  isComplete: boolean;
  databasePropertyId?: string;
  finalizedInDatabase?: boolean;
}

interface IncompletePropertyListItem {
  id: string;
  registrationNumber: string;
  address: string;
  lastModified: string;
  data: CachedIncompleteProperty;
}

interface ApiErrorLike {
  message?: string;
  code?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;

    if (apiError.code === 'ECONNABORTED') {
      return 'Timeout - O servidor demorou muito para responder.';
    }

    if (apiError.response?.status === 404) {
      return 'Endpoint não encontrado. Verifique se o backend está rodando.';
    }

    if (apiError.response?.status === 500) {
      return 'Erro interno do servidor. Verifique os logs do backend.';
    }

    if (apiError.response?.data?.message) {
      return apiError.response.data.message;
    }

    if (apiError.message) {
      return apiError.message;
    }
  }

  return fallback;
};

const sanitizeFilesForCache = (files: PropertyFormData['files']): PropertyFormData['files'] =>
  normalizePrimaryTechnicalSelection(
    dedupeFiles(
      files.map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        backendFileId: file.backendFileId,
        primaryTechnical: Boolean(file.primaryTechnical),
        uploadedFromBackend: Boolean(file.uploadedFromBackend || file.backendFileId)
      }))
    )
  );

const sanitizeFormDataForCache = (data: PropertyFormData): PropertyFormData => ({
  ...data,
  files: sanitizeFilesForCache(data.files)
});

const hydrateCachedProperty = (data: CachedIncompleteProperty): CachedIncompleteProperty => ({
  ...data,
  files: sanitizeFilesForCache(Array.isArray(data.files) ? data.files : [])
});

const parseBackendFileLastModified = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
};

const mapBackendFileToForm = (file: any): PropertyFormFile => ({
  id: file.id || file.fileId || Math.random().toString(36).substr(2, 9),
  name: file.originalName || file.fileName || file.name || file.storedName || '',
  size: Number(file.sizeBytes ?? file.fileSize ?? file.size ?? 0),
  type: file.contentType || file.fileType || file.type || undefined,
  lastModified: parseBackendFileLastModified(file.updatedAt || file.createdAt || file.lastModified),
  backendFileId: file.id || file.fileId,
  primaryTechnical: Boolean(file.primaryForProperty || file.primaryTechnical),
  uploadedFromBackend: true
});

const extractBackendFiles = (backendData: any): PropertyFormData['files'] => {
  const explicitDxfFiles = Array.isArray(backendData?.dxfFiles) ? backendData.dxfFiles : [];
  const explicitOtherFiles = Array.isArray(backendData?.otherFiles) ? backendData.otherFiles : [];
  const genericFiles = [
    ...(Array.isArray(backendData?.files) ? backendData.files : []),
    ...(Array.isArray(backendData?.technicalFiles) ? backendData.technicalFiles : [])
  ];

  const sourceFiles = explicitDxfFiles.length > 0 || explicitOtherFiles.length > 0
    ? [...explicitDxfFiles, ...explicitOtherFiles]
    : genericFiles;

  return normalizePrimaryTechnicalSelection(
    dedupeFiles(sourceFiles.map(mapBackendFileToForm))
  );
};

// Função de mapeamento para carregar dados do backend (PropertyDTO) para o formulário (PropertyFormData)
const mapBackendToFormData = (backendData: any): PropertyFormData => {
  const owners = [];
  if (backendData.ownerName) {
    const cleanDoc = (backendData.ownerDocument || '').replace(/\D/g, '');
    const isCompany = cleanDoc.length > 11;
    
    owners.push({
      ownerType: (isCompany ? 'COMPANY' : 'INDIVIDUAL') as 'COMPANY' | 'INDIVIDUAL',
      ownershipPercentage: 100,
      ownershipType: 'FULL' as const,
      active: true,
      fullName: isCompany ? '' : backendData.ownerName,
      cpf: isCompany ? '' : backendData.ownerDocument || '',
      companyName: isCompany ? backendData.ownerName : '',
      cnpj: isCompany ? backendData.ownerDocument || '' : '',
      email: backendData.ownerEmail || '',
      phone: backendData.ownerPhone || '',
      rg: !isCompany ? backendData.ownerIdNumber || '' : '',
      stateRegistration: isCompany ? backendData.ownerIdNumber || '' : ''
    });
  } else {
    owners.push({
      ownerType: 'INDIVIDUAL' as const,
      ownershipPercentage: 100,
      ownershipType: 'FULL' as const,
      active: true,
      fullName: '',
      cpf: '',
      companyName: '',
      cnpj: '',
      email: '',
      phone: '',
      rg: '',
      stateRegistration: ''
    });
  }

  const hasSirgasData =
    backendData.sirgas_e !== null &&
    backendData.sirgas_e !== undefined ||
    backendData.sirgas_n !== null &&
    backendData.sirgas_n !== undefined ||
    Boolean(backendData.sirgas_source) ||
    Boolean(backendData.utmZone) ||
    Boolean(backendData.datum);

  return {
    basicData: {
      registrationNumber: backendData.registrationNumber || backendData.name || '',
      propertyType: backendData.propertyType || 'URBAN',
      landUse: backendData.landUse || 'RESIDENTIAL',
      address: {
        street: backendData.street || '',
        number: backendData.number || '',
        complement: backendData.complement || '',
        neighborhood: backendData.neighborhood || '',
        city: backendData.city || '',
        state: backendData.state || '',
        zipCode: backendData.zipCode || '',
        coordinates: (backendData.latitude && backendData.longitude) ? {
          latitude: backendData.latitude,
          longitude: backendData.longitude
        } : undefined,
        sirgas: hasSirgasData ? {
          e: backendData.sirgas_e ?? 0,
          n: backendData.sirgas_n ?? 0,
          source: backendData.sirgas_source || '',
          zone: backendData.utmZone || '24S',
          datum: backendData.datum || 'SIRGAS 2000'
        } : undefined
      }
    },
    landmarks: Array.isArray(backendData.landmarks)
      ? ensureMinimumReferencePoints(
          backendData.landmarks
            .slice()
            .sort((a: any, b: any) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
            .map((landmark: any, index: number) => mapLandmarkToForm(landmark, index))
        )
      : ensureMinimumReferencePoints([]),
    owners: owners,
    documents: backendData.documents || [],
    files: extractBackendFiles(backendData)
  };
};

const getOwnerDisplayName = (owners: PropertyFormData['owners']): string => {
  const owner = owners[0];
  if (!owner) {
    return 'Cadastro em andamento';
  }

  if (owner.ownerType === 'INDIVIDUAL') {
    return owner.fullName?.trim() || 'Cadastro em andamento';
  }

  return owner.companyName?.trim() || 'Cadastro em andamento';
};

const buildPropertyPayload = (
  data: PropertyFormData,
  persistedPropertyId?: string | null
) => ({
  id: persistedPropertyId || undefined,
  propertyId: persistedPropertyId || undefined,
  name: data.basicData.registrationNumber?.trim() || 'Cadastro em andamento',
  registrationNumber: data.basicData.registrationNumber?.trim() || '',
  propertyType: data.basicData.propertyType,
  landUse: data.basicData.landUse,

  street: data.basicData.address.street?.trim() || '',
  number: data.basicData.address.number || '',
  complement: data.basicData.address.complement || '',
  neighborhood: data.basicData.address.neighborhood?.trim() || '',
  city: data.basicData.address.city?.trim() || '',
  state: data.basicData.address.state?.trim() || '',
  zipCode: data.basicData.address.zipCode || '',

  latitude: data.basicData.address.coordinates?.latitude,
  longitude: data.basicData.address.coordinates?.longitude,

  sirgas_e: data.basicData.address.sirgas?.e,
  sirgas_n: data.basicData.address.sirgas?.n,
  sirgas_source: data.basicData.address.sirgas?.source,
  landmarks: data.landmarks
    .filter((landmark) =>
      landmark.name.trim() ||
      landmark.coordinateX !== undefined ||
      landmark.coordinateY !== undefined ||
      landmark.coordinateZ !== undefined
    )
    .map((landmark, index) => ({
      landmarkId: landmark.id,
      landmarkName: landmark.name.trim(),
      landmarkType: landmark.type,
      coordinateX: landmark.coordinateX,
      coordinateY: landmark.coordinateY,
      coordinateZ: landmark.coordinateZ,
      sequenceOrder: index + 1,
      description: landmark.description?.trim() || ''
    })),

  ownerName: getOwnerDisplayName(data.owners),
  ownerDocument: data.owners.length > 0
    ? (data.owners[0].ownerType === 'INDIVIDUAL'
      ? data.owners[0].cpf
      : data.owners[0].cnpj) || ''
    : '',
  ownerEmail: data.owners.length > 0 ? data.owners[0].email || '' : '',
  ownerPhone: data.owners.length > 0 ? data.owners[0].phone || '' : '',
  ownerIdNumber: data.owners.length > 0
    ? (data.owners[0].ownerType === 'INDIVIDUAL'
      ? data.owners[0].rg || ''
      : data.owners[0].stateRegistration || '')
    : '',

  totalArea: 0,
  totalPerimeter: 0,
  datum: 'SIRGAS 2000',
  coordinateSystem: 'SIRGAS 2000 / UTM zone 23S',
  utmZone: data.basicData.address.sirgas?.zone || '23S',
  centralMeridian: data.basicData.address.sirgas?.zone === '24S' ? '-39°' : '-45°',

  active: true,
  documents: data.documents,

  dxfFiles: data.files
    .filter((file) => isTechnicalFile(file) && Boolean(file.backendFileId))
    .map((file) => ({
      id: file.backendFileId,
      originalName: file.name,
      sizeBytes: file.size,
      contentType: file.type || 'application/dxf',
      primaryForProperty: Boolean(file.primaryTechnical)
    })),

  otherFiles: data.files
    .filter((file) => !isTechnicalFile(file))
    .map((file) => ({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'unknown'
    }))
});

const PropertyRegister: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { isRestricted, restrictionMessage, isLoading: isLoadingTenantAccess } = useTenantOperationalAccess();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [dxfImportStatusText, setDxfImportStatusText] = useState('');
  const [formData, setFormData] = useState<PropertyFormData>({
    basicData: {
      registrationNumber: '',
      propertyType: 'URBAN',
      landUse: 'RESIDENTIAL',
      address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: ''
      }
    },
    landmarks: [createEmptyReferencePoint(1), createEmptyReferencePoint(2)],
    owners: [{
      ownerType: 'INDIVIDUAL',
      ownershipPercentage: 100,
      ownershipType: 'FULL',
      active: true,
      fullName: '',
      cpf: '',
      companyName: '',
      cnpj: '',
      email: '',
      phone: '',
      rg: '',
      stateRegistration: ''
    }],
    documents: [],
    files: []
  });

  const [validation, setValidation] = useState<PropertyFormValidation>({
    basicData: {},
    owners: {},
    documents: {},
    files: {},
    general: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [databasePropertyId, setDatabasePropertyId] = useState<string | null>(editId);
  const [selectedIncompleteId, setSelectedIncompleteId] = useState<string>('');
  const [refreshCombobox, setRefreshCombobox] = useState<number>(0);
  
  const [incompletePropertiesList, setIncompletePropertiesList] = useState<IncompletePropertyListItem[]>([]);
  
  useEffect(() => {
    if (!editId) {
      const list = getIncompleteProperties();
      setIncompletePropertiesList(list);
    }
  }, [refreshCombobox, formData.basicData.registrationNumber, editId]);

  useEffect(() => {
    const loadPropertyFromDb = async () => {
      if (!editId) {
        return;
      }
      try {
        setLoadingEdit(true);
        const response = await api.get(`/properties/${editId}/details`);
        setFormData(mapBackendToFormData(response.data));
        setPropertyId(editId);
        setDatabasePropertyId(editId);
      } catch (error) {
        console.error('Erro ao carregar imóvel para edição:', error);
        alert('Não foi possível carregar os dados do imóvel selecionado do banco de dados.');
        navigate('/properties');
      } finally {
        setLoadingEdit(false);
      }
    };
    loadPropertyFromDb();
  }, [editId, navigate]);

  const tabs = [
    { id: 0, name: 'Dados Básicos', icon: '🏠', required: true },
    { id: 1, name: 'Proprietários', icon: '👥', required: true },
    { id: 2, name: 'Documentos', icon: '📄', required: false },
    { id: 3, name: 'Arquivos', icon: '🗂️', required: false },
    { id: 4, name: 'Resumo', icon: '📋', required: false }
  ];

  const generatePropertyId = () => {
    try {
      return window.crypto.randomUUID();
    } catch (e) {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };

  const isPropertyComplete = (data: PropertyFormData): boolean => {
    const owner = data.owners[0];
    const isOwnerValid = owner && (
      owner.ownerType === 'INDIVIDUAL' 
        ? (owner.fullName && owner.cpf)
        : (owner.companyName && owner.cnpj)
    );
    return !!(
      data.basicData.registrationNumber &&
      data.basicData.address.street &&
      isOwnerValid
    );
  };

  const saveIncompleteProperty = useCallback(() => {
    if (!formData.basicData.registrationNumber || editId) {
      return;
    }
    
    const currentId = propertyId || generatePropertyId();
    const propertyData: CachedIncompleteProperty = {
      id: currentId,
      ...sanitizeFormDataForCache(formData),
      lastModified: new Date().toISOString(),
      isComplete: isPropertyComplete(formData),
      databasePropertyId: databasePropertyId || undefined
    };
    
    localStorage.setItem(`incomplete_property_${currentId}`, JSON.stringify(propertyData));
    setLastDraftSavedAt(propertyData.lastModified);
    
    if (!propertyId) {
      setPropertyId(currentId);
    }
    
    setRefreshCombobox(prev => prev + 1);
  }, [formData, propertyId, editId, databasePropertyId]);

  const persistDatabaseLinkInDraftCache = useCallback((savedDatabasePropertyId: string) => {
    if (editId || !propertyId) {
      return;
    }

    const storageKey = `incomplete_property_${propertyId}`;
    const rawDraft = localStorage.getItem(storageKey);
    if (!rawDraft) {
      return;
    }

    try {
      const parsedDraft = hydrateCachedProperty(JSON.parse(rawDraft) as CachedIncompleteProperty);
      const updatedDraft: CachedIncompleteProperty = {
        ...parsedDraft,
        databasePropertyId: savedDatabasePropertyId,
        lastModified: new Date().toISOString()
      };

      localStorage.setItem(storageKey, JSON.stringify(updatedDraft));
      setLastDraftSavedAt(updatedDraft.lastModified);
    } catch (error) {
      console.error('Erro ao vincular rascunho local ao imóvel salvo no banco:', error);
    }
  }, [editId, propertyId]);

  const getIncompleteProperties = (): IncompletePropertyListItem[] => {
    const incompleteProperties: IncompletePropertyListItem[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('incomplete_property_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}') as Partial<CachedIncompleteProperty>;
          
          if (data.basicData?.registrationNumber && !data.finalizedInDatabase) {
            const prop: IncompletePropertyListItem = {
              id: data.id || key.replace('incomplete_property_', ''),
              registrationNumber: data.basicData.registrationNumber,
              address: data.basicData.address?.street || 'Endereço não informado',
              lastModified: data.lastModified || new Date(0).toISOString(),
              data: data as CachedIncompleteProperty
            };
            
            incompleteProperties.push(prop);
          }
        } catch (error) {
          console.error('Erro ao carregar propriedade incompleta:', error);
        }
      }
    }
    
    return incompleteProperties.sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  };

  const loadSelectedProperty = (selectedId: string) => {
    if (!selectedId) return;
    
    try {
      const saved = localStorage.getItem(`incomplete_property_${selectedId}`);
      if (saved) {
        const propertyData = hydrateCachedProperty(JSON.parse(saved) as CachedIncompleteProperty);
        
        setFormData(propertyData);
        setPropertyId(selectedId);
        setDatabasePropertyId(propertyData.databasePropertyId || null);
        setSelectedIncompleteId(selectedId);
      }
    } catch (error) {
      console.error('Erro ao carregar propriedade:', error);
    }
  };

  useEffect(() => {
    if (formData.basicData.registrationNumber && !editId) {
      const timeoutId = setTimeout(() => {
        saveIncompleteProperty();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData, saveIncompleteProperty, editId]);

  useEffect(() => {
    if (!propertyId && !editId) {
      const newId = generatePropertyId();
      setPropertyId(newId);
    }
  }, [propertyId, editId]);

  const persistTechnicalFilesToDatabase = useCallback(async (nextFormData: PropertyFormData) => {
    const persistedTargetId = editId || databasePropertyId;
    const hasLinkedTechnicalFiles = nextFormData.files.some(
      (file) => isTechnicalFile(file) && Boolean(file.backendFileId)
    );

    if (!persistedTargetId && !hasLinkedTechnicalFiles) {
      return null;
    }

    const payload = buildPropertyPayload(nextFormData, persistedTargetId);
    const response = persistedTargetId
      ? await api.put(`/properties/${persistedTargetId}`, payload)
      : await api.post('/properties', payload);

    const savedDatabasePropertyId = response?.data?.propertyId || response?.data?.id;
    if (!savedDatabasePropertyId) {
      throw new Error('O backend nao retornou o identificador do imovel ao persistir os arquivos tecnicos.');
    }

    if (!persistedTargetId) {
      setDatabasePropertyId(savedDatabasePropertyId);
      persistDatabaseLinkInDraftCache(savedDatabasePropertyId);
    }

    return savedDatabasePropertyId;
  }, [databasePropertyId, editId, persistDatabaseLinkInDraftCache]);

  useEffect(() => {
    if (propertyId && !editId) {
      const incompleteProps = getIncompleteProperties();
      const currentProp = incompleteProps.find((p) => p.id === propertyId);
      
      if (currentProp) {
        setSelectedIncompleteId(propertyId);
      } else {
        setSelectedIncompleteId('');
      }
    }
  }, [propertyId, formData.basicData.registrationNumber, editId]);

  const handleFilesChange = useCallback(async (files: PropertyFormData['files']) => {
    const incomingFiles = normalizePrimaryTechnicalSelection(
      dedupeFiles(files.map((file) => ({ ...file })))
    );
    const previousFiles = formData.files;
    const targetPropertyIdForUpload = editId || databasePropertyId;
    const importedLandmarks: PropertyFormData['landmarks'] = [];
    const failedUploads: string[] = [];
    const dxfFilesToImport = incomingFiles.filter((file) => {
      const alreadyKnown = previousFiles.some(
        (previousFile) => getFileIdentity(previousFile) === getFileIdentity(file)
      );
      return !alreadyKnown && isDxfFile(file) && !file.backendFileId && Boolean(file.rawFile);
    });

    if (dxfFilesToImport.length > 0) {
      setDxfImportStatusText(`Importacao iniciada para ${dxfFilesToImport.length} arquivo(s) DXF...`);
    } else if (incomingFiles.length === 0) {
      setDxfImportStatusText('');
    } else {
      setDxfImportStatusText('Nenhum DXF novo precisou ser importado nesta alteracao.');
    }
    // #region debug-point A:handle-files-change
    reportDxfImportDebug('A', 'handleFilesChange called', {
      incomingFileCount: incomingFiles.length,
      previousFileCount: previousFiles.length,
      incomingFiles: incomingFiles.map((file) => ({
        name: file.name,
        backendFileId: file.backendFileId || null,
        hasRawFile: Boolean(file.rawFile)
      }))
    });
    // #endregion

    for (const file of incomingFiles) {
      const alreadyKnown = previousFiles.some(
        (previousFile) => getFileIdentity(previousFile) === getFileIdentity(file)
      );
      // #region debug-point A:file-loop
      reportDxfImportDebug('A', 'evaluating file for import', {
        fileName: file.name,
        alreadyKnown,
        isDxf: isDxfFile(file),
        backendFileId: file.backendFileId || null,
        hasRawFile: Boolean(file.rawFile)
      });
      // #endregion

      if (alreadyKnown || !isDxfFile(file) || file.backendFileId || !file.rawFile) {
        continue;
      }

      try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file.rawFile);
        if (targetPropertyIdForUpload) {
          uploadFormData.append('propertyId', targetPropertyIdForUpload);
          uploadFormData.append('primaryForProperty', String(Boolean(file.primaryTechnical)));
        }
        // #region debug-point A:frontend-upload-request
        reportDxfUpload500Debug('A', '[DEBUG] sending upload request', {
          fileName: file.name,
          targetPropertyIdForUpload: targetPropertyIdForUpload || null,
          primaryTechnical: Boolean(file.primaryTechnical)
        });
        // #endregion

        const uploadResponse = await api.post('/dxf/upload', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        });

        const uploadedFile = Array.isArray(uploadResponse.data)
          ? uploadResponse.data[0]
          : uploadResponse.data;
        // #region debug-point B:upload-response
        reportDxfImportDebug('B', 'upload response received', {
          fileName: file.name,
          uploadedFileId: uploadedFile?.id || null,
          responseType: Array.isArray(uploadResponse.data) ? 'array' : typeof uploadResponse.data
        });
        // #endregion

        if (!uploadedFile?.id) {
          throw new Error('O backend nao retornou o identificador do DXF enviado.');
        }

        setDxfImportStatusText(`DXF ${file.name} enviado. Extraindo pontos do arquivo...`);

        file.id = uploadedFile.id;
        file.backendFileId = uploadedFile.id;
        file.uploadedFromBackend = true;
        file.rawFile = undefined;
        file.type = file.type || uploadedFile.contentType || 'application/dxf';

        const landmarksResponse = await api.get(`/dxf/${uploadedFile.id}/landmarks`);
        const extractedLandmarks = Array.isArray(landmarksResponse.data)
          ? landmarksResponse.data.map((landmark: any, index: number) => mapLandmarkToForm(landmark, index))
          : [];
        // #region debug-point C:landmarks-response
        reportDxfImportDebug('C', 'landmarks response received', {
          fileName: file.name,
          uploadedFileId: uploadedFile.id,
          extractedCount: extractedLandmarks.length,
          extractedNames: extractedLandmarks.map((landmark) => landmark.name)
        });
        // #endregion

        importedLandmarks.push(...extractedLandmarks);
        setDxfImportStatusText(
          extractedLandmarks.length > 0
            ? `DXF ${file.name}: ${extractedLandmarks.length} ponto(s) extraido(s) com sucesso.`
            : `DXF ${file.name} foi enviado, mas o backend retornou 0 pontos.`
        );
      } catch (error) {
        // #region debug-point C:import-error
        reportDxfImportDebug('C', 'error importing dxf landmarks', {
          fileName: file.name,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
        // #endregion
        console.error(`Erro ao importar pontos do DXF ${file.name}:`, error);
        failedUploads.push(file.name);
        setDxfImportStatusText(
          `Falha ao importar o DXF ${file.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // #region debug-point D:before-set-form
    reportDxfImportDebug('D', 'about to update formData with imported landmarks', {
      importedCount: importedLandmarks.length,
      failedUploads,
      resultingFileCount: incomingFiles.length
    });
    // #endregion
    const nextLandmarks = importedLandmarks.length > 0
      ? mergeImportedLandmarks(formData.landmarks, importedLandmarks)
      : formData.landmarks;
    const nextFormData: PropertyFormData = {
      ...formData,
      files: incomingFiles,
      landmarks: nextLandmarks
    };

    setFormData(nextFormData);
    // #region debug-point D:after-set-form
    reportDxfImportDebug('D', 'setFormData dispatched for imported landmarks', {
      importedCount: importedLandmarks.length,
      failedUploadsCount: failedUploads.length
    });
    // #endregion

    if (importedLandmarks.length > 0) {
      alert(`✅ ${importedLandmarks.length} ponto(s) do DXF foram importados automaticamente para a grade de coordenadas.`);
    }

    if (failedUploads.length > 0) {
      alert(`⚠️ Nao foi possivel importar automaticamente os pontos dos seguintes arquivos: ${failedUploads.join(', ')}.`);
    } else if (importedLandmarks.length === 0 && dxfFilesToImport.length > 0) {
      setDxfImportStatusText('O upload foi processado, mas nenhum ponto foi inserido na grade.');
    }

    try {
      // #region debug-point E:frontend-persist-request
      reportDxfUpload500Debug('E', '[DEBUG] persisting technical files to property', {
        editId: editId || null,
        databasePropertyId: databasePropertyId || null,
        dxfFilesWithBackendId: nextFormData.files.filter((currentFile) => isTechnicalFile(currentFile) && Boolean(currentFile.backendFileId)).length
      });
      // #endregion
      const savedDatabasePropertyId = await persistTechnicalFilesToDatabase(nextFormData);
      if (savedDatabasePropertyId) {
        // #region debug-point E:frontend-persist-success
        reportDxfUpload500Debug('E', '[DEBUG] property persistence completed', {
          savedDatabasePropertyId
        });
        // #endregion
        setDxfImportStatusText((currentStatus) => {
          if (!currentStatus) {
            return 'Arquivos tecnicos vinculados ao imovel e persistidos no banco.';
          }

          if (currentStatus.includes('persistidos no banco')) {
            return currentStatus;
          }

          return `${currentStatus} Vínculo persistido no banco.`;
        });
      }
    } catch (error) {
      // #region debug-point E:frontend-persist-error
      reportDxfUpload500Debug('E', '[DEBUG] property persistence failed', {
        errorMessage: error instanceof Error ? error.message : String(error),
        editId: editId || null,
        databasePropertyId: databasePropertyId || null
      });
      // #endregion
      console.error('Erro ao persistir arquivos tecnicos no banco:', error);
      const message = getErrorMessage(error, 'Nao foi possivel persistir os arquivos tecnicos no banco neste momento.');
      setDxfImportStatusText(message);
      alert(`⚠️ ${message}`);
    }
  }, [databasePropertyId, editId, formData, persistTechnicalFilesToDatabase]);

  const calculateProgress = (): number => {
    let completed = 0;
    const total = tabs.filter(tab => tab.required).length;

    if (formData.basicData.registrationNumber && formData.basicData.address.street) completed++;
    if (formData.owners.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const progress = calculateProgress();
  const canSaveToDatabase = progress >= 100;

  const validateTab = (tabIndex: number): boolean => {
    const newValidation = { ...validation };
    const validationKey = getTabValidationKey(tabIndex);

    if (validationKey !== 'general') {
      newValidation[validationKey] = {};
    }

    switch (tabIndex) {
      case 0:
        if (!formData.basicData.registrationNumber) {
          newValidation.basicData.registrationNumber = 'Número de registro é obrigatório';
        }
        if (!formData.basicData.address.street) {
          newValidation.basicData.street = 'Logradouro é obrigatório';
        }
        if (!formData.basicData.address.city) {
          newValidation.basicData.city = 'Cidade é obrigatória';
        }
        break;
        
      case 1:
        const primaryOwner = formData.owners[0];
        if (!primaryOwner) {
          newValidation.owners.general = 'Dados do proprietário são obrigatórios';
        } else {
          if (primaryOwner.ownerType === 'INDIVIDUAL') {
            if (!primaryOwner.fullName || primaryOwner.fullName.trim() === '') {
              newValidation.owners.fullName = 'Nome completo é obrigatório';
            }
            if (!primaryOwner.cpf || primaryOwner.cpf.trim() === '') {
              newValidation.owners.cpf = 'CPF é obrigatório';
            }
          } else {
            if (!primaryOwner.companyName || primaryOwner.companyName.trim() === '') {
              newValidation.owners.companyName = 'Razão social é obrigatória';
            }
            if (!primaryOwner.cnpj || primaryOwner.cnpj.trim() === '') {
              newValidation.owners.cnpj = 'CNPJ é obrigatório';
            }
          }
        }
        break;
    }
    
    setValidation(newValidation);
    
    const tabErrors = validationKey === 'general'
      ? newValidation.general
      : Object.values(newValidation[validationKey]).filter(error => error);

    return tabErrors.length === 0;
  };

  const getTabValidationKey = (tabIndex: number): keyof PropertyFormValidation => {
    const keys: (keyof PropertyFormValidation)[] = ['basicData', 'owners', 'documents', 'files', 'general'];
    return keys[tabIndex] || 'general';
  };

  const goToTab = (tabIndex: number) => {
    if (tabIndex === currentTab) return;

    setCurrentTab(tabIndex);
  };

  const nextTab = () => {
    if (currentTab < tabs.length - 1) {
      goToTab(currentTab + 1);
    }
  };

  const prevTab = () => {
    if (currentTab > 0) {
      goToTab(currentTab - 1);
    }
  };

  const saveProperty = async () => {
    try {
      setIsSaving(true);
      
      let hasErrors = false;
      for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].required) {
          if (!validateTab(i)) {
            hasErrors = true;
            setCurrentTab(i);
            break;
          }
        }
      }
      
      if (hasErrors) {
        alert('Por favor, corrija os erros antes de salvar.');
        return;
      }

      const persistedTargetId = editId || databasePropertyId;
      const propertyPayload = buildPropertyPayload(formData, persistedTargetId);
      const response = persistedTargetId
        ? await api.put(`/properties/${persistedTargetId}`, propertyPayload)
        : await api.post('/properties', propertyPayload);

      const savedPropertyId = response?.data?.propertyId || response?.data?.id || propertyId;
      setDatabasePropertyId(savedPropertyId || null);

      if (savedPropertyId && !editId) {
        if (propertyId) {
          localStorage.removeItem(`incomplete_property_${propertyId}`);
        }
        localStorage.removeItem(`incomplete_property_${savedPropertyId}`);
      }
      
      alert(editId ? '✅ Cadastro do imóvel atualizado com sucesso!' : '✅ Propriedade cadastrada com sucesso no banco de dados!');
      navigate('/properties');
      
    } catch (error: unknown) {
      console.error('❌ Erro ao salvar propriedade:', error);
      const fallbackMsg = editId ? 'Erro desconhecido ao atualizar dados.' : 'Erro desconhecido';
      alert(`Erro ao salvar propriedade: ${getErrorMessage(error, fallbackMsg)}\n\n${!editId ? 'Os dados foram mantidos no cache local como rascunho.' : ''}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraftManual = () => {
    if (editId) return;
    if (!formData.basicData.registrationNumber) {
      alert('⚠️ Por favor, preencha o Número de Registro (ou Matrícula) na aba "Dados Básicos" para poder salvar o rascunho.');
      return;
    }
    
    saveIncompleteProperty();
    alert('📝 Rascunho do imóvel salvo localmente com sucesso!');
  };

  if (isLoadingTenantAccess) {
    return (
      <div className="property-register state-container" style={{ padding: '4rem 2rem', background: 'white' }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Verificando liberacao operacional...</p>
      </div>
    );
  }

  if (isRestricted) {
    return (
      <div className="property-register state-container" style={{ padding: '4rem 2rem', background: 'white' }}>
        <span style={{ fontSize: '2rem' }}>🔒</span>
        <h2 style={{ marginTop: '1rem' }}>Cadastro de Imovel bloqueado</h2>
        <p style={{ marginTop: '0.75rem', color: '#64748b', maxWidth: '680px', textAlign: 'center' }}>
          {restrictionMessage}
        </p>
        <button
          type="button"
          className="nav-button prev"
          onClick={() => navigate('/properties')}
          style={{ marginTop: '1.5rem' }}
        >
          Voltar para Imoveis
        </button>
      </div>
    );
  }

  if (loadingEdit) {
    return (
      <div className="property-register state-container" style={{ padding: '4rem 2rem', background: 'white' }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Carregando dados do imóvel para edição...</p>
      </div>
    );
  }

  return (
    <div className="property-register">
      {/* Cabeçalho Simples (Blue Header) */}
      <div className="property-header">
        <div className="header-content-simple">
          <div className="header-top-simple">
            <h1>{editId ? '✏️ Editar Cadastro de Imovel' : '🏠 Cadastrar Imovel'}</h1>
            
            {/* Seletor de Rascunhos ou Voltar no canto direito do cabeçalho */}
            {editId ? (
              <button 
                type="button"
                className="btn-back-header"
                onClick={() => navigate('/properties')}
                title="Voltar para a página de imóveis"
              >
                ⬅️ Voltar
              </button>
            ) : (
              <div className="incomplete-properties-selector-simple">
                <label htmlFor="incompleteSelect">Continuar rascunho:</label>
                <div className="selector-row-simple">
                  <select
                    id="incompleteSelect"
                    onChange={(e) => {
                      if (e.target.value) {
                        loadSelectedProperty(e.target.value);
                      } else {
                        setSelectedIncompleteId('');
                      }
                    }}
                    value={selectedIncompleteId}
                    className="draft-dropdown"
                  >
                    <option value="">Rascunhos locais...</option>
                    {incompletePropertiesList.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.registrationNumber}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-new-simple"
                    onClick={() => {
                      setFormData({
                        basicData: {
                          registrationNumber: '',
                          propertyType: 'URBAN',
                          landUse: 'RESIDENTIAL',
                          address: {
                            street: '',
                            number: '',
                            complement: '',
                            neighborhood: '',
                            city: '',
                            state: '',
                            zipCode: ''
                          }
                        },
                        landmarks: [createEmptyReferencePoint(1), createEmptyReferencePoint(2)],
                        owners: [{
                          ownerType: 'INDIVIDUAL',
                          ownershipPercentage: 100,
                          ownershipType: 'FULL',
                          active: true,
                          fullName: '',
                          cpf: '',
                          companyName: '',
                          cnpj: '',
                          email: '',
                          phone: '',
                          rg: '',
                          stateRegistration: ''
                        }],
                        documents: [],
                        files: []
                      });
                      setPropertyId(null);
                      setDatabasePropertyId(null);
                      setSelectedIncompleteId('');
                      setCurrentTab(0);
                    }}
                    title="Novo Rascunho"
                  >
                    ➕
                  </button>
                </div>
                {lastDraftSavedAt && (
                  <small style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.72rem', marginTop: '0.25rem', display: 'block' }}>
                    Salvo em: {new Date(lastDraftSavedAt).toLocaleTimeString('pt-BR')}
                  </small>
                )}
              </div>
            )}
          </div>
          
          {/* Barra de Progresso no cabeçalho */}
          <div className="progress-info-simple">
            <div className="progress-bar-simple">
              <div 
                className="progress-fill-simple" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text-simple">{progress}% preenchido</span>
          </div>
        </div>
      </div>

      <div className="property-content">
        {/* Navegação por Abas */}
        <div className="tabs-navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${currentTab === tab.id ? 'active' : ''} ${tab.required ? 'required' : ''}`}
              onClick={() => goToTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-name">{tab.name}</span>
              {tab.required && <span className="required-indicator">*</span>}
            </button>
          ))}
        </div>

        {/* Conteúdo das Abas */}
        <div className="tab-content">
          {currentTab === 0 && (
            <PropertyBasicData
              data={formData.basicData}
              landmarks={formData.landmarks}
              validation={validation.basicData}
              onChange={(basicData: PropertyFormData['basicData']) => setFormData(prev => ({ ...prev, basicData }))}
              onLandmarksChange={(landmarks: PropertyFormData['landmarks']) => setFormData(prev => ({ ...prev, landmarks }))}
            />
          )}
          
          {currentTab === 1 && (
            <PropertyOwners
              owners={formData.owners}
              validation={validation.owners}
              onChange={(owners: PropertyFormData['owners']) => {
                setFormData(prev => ({ ...prev, owners }));
              }}
            />
          )}
          
          {currentTab === 2 && (
            <PropertyDocuments
              documents={formData.documents}
              validation={validation.documents}
              onChange={(documents: PropertyFormData['documents']) => setFormData(prev => ({ ...prev, documents }))}
            />
          )}
          
          {currentTab === 3 && (
            <PropertyFiles
              files={formData.files}
              validation={validation.files}
              onChange={handleFilesChange}
              importStatusText={dxfImportStatusText}
            />
          )}
          
          {currentTab === 4 && (
            <PropertySummary
              data={formData}
              validation={{}}
              onSubmit={saveProperty}
              isSubmitting={isSaving}
              onSaveDraft={handleSaveDraftManual}
            />
          )}
        </div>

        {/* Navegação Inferior */}
        <div className="tab-navigation">
          <button 
            onClick={prevTab}
            disabled={currentTab === 0}
            className="nav-button prev"
          >
            ← Anterior
          </button>
          
          <div className="tab-indicators">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`indicator ${currentTab === tab.id ? 'active' : ''} ${tab.required ? 'required' : ''}`}
                onClick={() => goToTab(tab.id)}
              >
                {tab.id + 1}
              </div>
            ))}
          </div>

          <div className="nav-buttons" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {lastDraftSavedAt && (
              <div className="draft-saved-badge" style={{ fontSize: '0.82rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>🟢</span>
                <span>Rascunho salvo {new Date(lastDraftSavedAt).toLocaleTimeString('pt-BR')}</span>
              </div>
            )}
            
            {currentTab < tabs.length - 1 && (
              <button 
                onClick={nextTab}
                className="nav-button next"
                style={{ background: '#4f46e5', color: 'white' }}
              >
                Avancar →
              </button>
            )}
            
            {!editId && (
              <button 
                onClick={handleSaveDraftManual}
                disabled={!formData.basicData.registrationNumber}
                className="nav-button save-draft"
                title={
                  formData.basicData.registrationNumber
                    ? 'Salvar rascunho local do imóvel'
                    : 'Preencha o Número de Registro na aba Dados Básicos para salvar o rascunho'
                }
              >
                📝 Salvar Rascunho
              </button>
            )}
            
            {currentTab === 4 && (
              <button 
                onClick={saveProperty}
                disabled={isSaving || !canSaveToDatabase}
                className="nav-button save"
                style={{ background: '#10b981', color: 'white' }}
                title={
                  canSaveToDatabase
                    ? 'Salvar imóvel na base'
                    : 'Complete as abas obrigatórias para habilitar o salvamento'
                }
              >
                {isSaving ? 'Salvando...' : '💾 Salvar Imóvel na Base'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyRegister;
