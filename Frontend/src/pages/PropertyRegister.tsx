import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useTenantOperationalAccess } from '@/hooks/useTenantOperationalAccess';

import PropertyBasicData from '../components/property/PropertyBasicData';
import PropertyOwners from '../components/property/PropertyOwners';
import PropertyDocuments from '../components/property/PropertyDocuments';
import PropertyFiles from '../components/property/PropertyFiles';
import PropertySummary from '../components/property/PropertySummary';
import type { PropertyFormData, PropertyFormValidation } from '../types/property';
import '../styles/PropertyRegister.css';

interface CachedIncompleteProperty extends PropertyFormData {
  id: string;
  lastModified: string;
  isComplete: boolean;
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
        sirgas: (backendData.sirgas_e && backendData.sirgas_n) ? {
          e: backendData.sirgas_e,
          n: backendData.sirgas_n,
          source: backendData.sirgas_source || '',
          zone: backendData.utmZone || '24S',
          datum: backendData.datum || 'SIRGAS 2000'
        } : undefined
      }
    },
    owners: owners,
    documents: backendData.documents || [],
    files: [
      ...(backendData.dxfFiles || []).map((f: any) => ({
        id: f.id || Math.random().toString(36).substr(2, 9),
        name: f.fileName,
        size: f.fileSize,
        type: 'dxf'
      })),
      ...(backendData.otherFiles || []).map((f: any) => ({
        id: f.id || Math.random().toString(36).substr(2, 9),
        name: f.fileName,
        size: f.fileSize,
        type: f.fileType
      }))
    ]
  };
};

const PropertyRegister: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { isRestricted, restrictionMessage, isLoading: isLoadingTenantAccess } = useTenantOperationalAccess();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
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
      if (!editId) return;
      try {
        setLoadingEdit(true);
        const response = await api.get(`/properties/${editId}/details`);
        const mapped = mapBackendToFormData(response.data);
        setFormData(mapped);
        setPropertyId(editId);
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
      ...formData,
      lastModified: new Date().toISOString(),
      isComplete: isPropertyComplete(formData)
    };
    
    localStorage.setItem(`incomplete_property_${currentId}`, JSON.stringify(propertyData));
    setLastDraftSavedAt(propertyData.lastModified);
    
    if (!propertyId) {
      setPropertyId(currentId);
    }
    
    setRefreshCombobox(prev => prev + 1);
  }, [formData, propertyId, editId]);

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
        const propertyData = JSON.parse(saved) as CachedIncompleteProperty;
        
        setFormData(propertyData);
        setPropertyId(selectedId);
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

      const propertyPayload = {
        id: editId ? propertyId : undefined,
        propertyId: editId ? propertyId : undefined,
        name: formData.basicData.registrationNumber,
        registrationNumber: formData.basicData.registrationNumber,
        propertyType: formData.basicData.propertyType,
        landUse: formData.basicData.landUse,
        
        street: formData.basicData.address.street,
        number: formData.basicData.address.number || '',
        complement: formData.basicData.address.complement || '',
        neighborhood: formData.basicData.address.neighborhood,
        city: formData.basicData.address.city,
        state: formData.basicData.address.state,
        zipCode: formData.basicData.address.zipCode || '',
        
        latitude: formData.basicData.address.coordinates?.latitude,
        longitude: formData.basicData.address.coordinates?.longitude,
        
        sirgas_e: formData.basicData.address.sirgas?.e,
        sirgas_n: formData.basicData.address.sirgas?.n,
        sirgas_source: formData.basicData.address.sirgas?.source,
        
        ownerName: formData.owners.length > 0 ? 
          (formData.owners[0].ownerType === 'INDIVIDUAL' ? 
            formData.owners[0].fullName : 
            formData.owners[0].companyName) : '',
        ownerDocument: formData.owners.length > 0 ? 
          (formData.owners[0].ownerType === 'INDIVIDUAL' ? 
            formData.owners[0].cpf : 
            formData.owners[0].cnpj) : '',
        ownerEmail: formData.owners.length > 0 ? formData.owners[0].email || '' : '',
        ownerPhone: formData.owners.length > 0 ? formData.owners[0].phone || '' : '',
        ownerIdNumber: formData.owners.length > 0 ? 
          (formData.owners[0].ownerType === 'INDIVIDUAL' ? 
            formData.owners[0].rg || '' : 
            formData.owners[0].stateRegistration || '') : '',
        
        totalArea: 0,
        totalPerimeter: 0,
        datum: 'SIRGAS 2000',
        coordinateSystem: 'SIRGAS 2000 / UTM zone 23S',
        utmZone: formData.basicData.address.sirgas?.zone || '23S',
        centralMeridian: formData.basicData.address.sirgas?.zone === '24S' ? '-39°' : '-45°',
        
        active: true,
        
        documents: formData.documents,
        
        dxfFiles: formData.files
          .filter(file => {
            const fileName = file.name.toLowerCase();
            return fileName.endsWith('.dxf') || fileName.endsWith('.dwg');
          })
          .map(file => ({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.name.toLowerCase().endsWith('.dxf') ? 'DXF' : 'DWG',
            filePath: `properties/${propertyId}/technical/${file.name}`
          })),
        
        otherFiles: formData.files
          .filter(file => {
            const fileName = file.name.toLowerCase();
            return !fileName.endsWith('.dxf') && !fileName.endsWith('.dwg');
          })
          .map(file => ({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'unknown'
          }))
      };
      
      if (editId) {
        await api.put(`/properties/${editId}`, propertyPayload);
      } else {
        await api.post('/properties', propertyPayload);
      }
      
      if (propertyId && !editId) {
        localStorage.removeItem(`incomplete_property_${propertyId}`);
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
              validation={validation.basicData}
              onChange={(basicData: PropertyFormData['basicData']) => setFormData(prev => ({ ...prev, basicData }))}
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
              onChange={(files: PropertyFormData['files']) => setFormData(prev => ({ ...prev, files }))}
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
