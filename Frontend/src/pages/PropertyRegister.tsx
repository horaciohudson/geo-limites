import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

import PropertyGrid from '../components/property/PropertyGrid';
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

const PropertyRegister: React.FC = () => {
  const navigate = useNavigate();
  
  const [currentTab, setCurrentTab] = useState(0);
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
    owners: [],
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
  
  // Hook para gerenciar lista de propriedades incompletas
  const [incompletePropertiesList, setIncompletePropertiesList] = useState<IncompletePropertyListItem[]>([]);
  
  // Atualizar lista quando necessário
  useEffect(() => {
    const updateList = () => {
      const list = getIncompleteProperties();
      setIncompletePropertiesList(list);
    };
    
    updateList();
  }, [refreshCombobox, formData.basicData.registrationNumber]);

const tabs = [
    { id: 0, name: 'Pesquisar', icon: '🔍', required: false },
    { id: 1, name: 'Dados Básicos', icon: '🏠', required: true },
    { id: 2, name: 'Proprietários', icon: '👥', required: true },
    { id: 3, name: 'Documentos', icon: '📄', required: false },
    { id: 4, name: 'Arquivos', icon: '🗂️', required: false },
    { id: 5, name: 'Resumo', icon: '📋', required: false }
  ];

  // ===== SISTEMA SIMPLES DE CADASTROS INCOMPLETOS =====
  

  
  // Gerar ID único para propriedade
  const generatePropertyId = () => {
    return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Verificar se propriedade está completa
  const isPropertyComplete = (data: PropertyFormData): boolean => {
    return !!(
      data.basicData.registrationNumber &&
      data.basicData.address.street &&
      data.owners.length > 0 &&
      data.owners.reduce((sum, owner) => sum + owner.ownershipPercentage, 0) === 100
    );
  };

  // Salvar cadastro incompleto
  const saveIncompleteProperty = useCallback(() => {
    if (!formData.basicData.registrationNumber) {
      return;
    }
    
    const propertyData: CachedIncompleteProperty = {
      id: propertyId || generatePropertyId(),
      ...formData,
      lastModified: new Date().toISOString(),
      isComplete: isPropertyComplete(formData)
    };
    
    // Salvar no localStorage
    localStorage.setItem(`incomplete_property_${propertyData.id}`, JSON.stringify(propertyData));
    
    if (!propertyId) {
      setPropertyId(propertyData.id);
    }
    
    // Forçar atualização do combobox
    setRefreshCombobox(prev => prev + 1);
  }, [formData, propertyId]);

  // Carregar cadastros incompletos
  const getIncompleteProperties = (): IncompletePropertyListItem[] => {
    const incompleteProperties: IncompletePropertyListItem[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('incomplete_property_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}') as Partial<CachedIncompleteProperty>;
          
          // Mostrar todas as propriedades que têm número de registro (completas ou incompletas)
          // A única exceção são as que foram finalizadas (enviadas para o banco)
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

  // Carregar propriedade selecionada
  const loadSelectedProperty = (selectedId: string) => {
    if (!selectedId) return;
    
    try {
      const saved = localStorage.getItem(`incomplete_property_${selectedId}`);
      if (saved) {
        const propertyData = JSON.parse(saved) as CachedIncompleteProperty;
        
        setFormData(propertyData);
        setPropertyId(selectedId);
        setSelectedIncompleteId(selectedId); // ✅ Manter seleção no combobox
      }
    } catch (error) {
      console.error('Erro ao carregar propriedade:', error);
    }
  };

  // Auto-save a cada mudança
  useEffect(() => {
    if (formData.basicData.registrationNumber) {
      const timeoutId = setTimeout(() => {
        saveIncompleteProperty();
      }, 1000); // Salva após 1 segundo de inatividade
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData, saveIncompleteProperty]);

  // Inicialização
  useEffect(() => {
    if (!propertyId) {
      const newId = generatePropertyId();
      setPropertyId(newId);
    }
  }, [propertyId]);

  // Sincronizar selectedIncompleteId com propertyId atual
  useEffect(() => {
    if (propertyId) {
      // Verificar se o propertyId atual existe na lista de incompletos
      const incompleteProps = getIncompleteProperties();
      const currentProp = incompleteProps.find((p) => p.id === propertyId);
      
      if (currentProp) {
        setSelectedIncompleteId(propertyId);
      } else {
        setSelectedIncompleteId('');
      }
    }
  }, [propertyId, formData.basicData.registrationNumber]); // Re-executar quando registrationNumber muda

  // ===== FIM DO SISTEMA SIMPLES =====

  // Calcular progresso de completude
  const calculateProgress = (): number => {
    let completed = 0;
    const total = tabs.filter(tab => tab.required).length;

    // Verificar cada aba obrigatória (ignorar aba de pesquisa)
    if (formData.basicData.registrationNumber && formData.basicData.address.street) completed++;
    if (formData.owners.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const progress = calculateProgress();

  // Validar aba atual
  const validateCurrentTab = (): boolean => {
    const newValidation = { ...validation };
    
    switch (currentTab) {
      case 0: // Pesquisar - não precisa validação
        break;
      case 1: // Dados Básicos
        newValidation.basicData = {};
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
        
      case 2: // Proprietários
        newValidation.owners = {};
        if (formData.owners.length === 0) {
          newValidation.owners.general = 'Pelo menos um proprietário é obrigatório';
        } else {
          // Validar dados de cada proprietário
          let hasInvalidOwner = false;
          formData.owners.forEach((owner, index) => {
            if (owner.ownerType === 'INDIVIDUAL') {
              if (!owner.fullName || owner.fullName.trim() === '' || !owner.cpf || owner.cpf.trim() === '') {
                newValidation.owners[`owner_${index}`] = 'Nome completo e CPF são obrigatórios para pessoa física';
                hasInvalidOwner = true;
              }
            } else {
              if (!owner.companyName || owner.companyName.trim() === '' || !owner.cnpj || owner.cnpj.trim() === '') {
                newValidation.owners[`owner_${index}`] = 'Razão social e CNPJ são obrigatórios para pessoa jurídica';
                hasInvalidOwner = true;
              }
            }
            
            if (owner.ownershipPercentage <= 0 || owner.ownershipPercentage > 100) {
              newValidation.owners[`owner_${index}_percentage`] = 'Percentual deve ser entre 1% e 100%';
              hasInvalidOwner = true;
            }
          });
          
          if (hasInvalidOwner) {
            newValidation.owners.general = 'Corrija os dados dos proprietários antes de continuar';
          }
        }
        
        // Verificar se soma das participações = 100%
        const totalPercentage = formData.owners.reduce((sum, owner) => sum + owner.ownershipPercentage, 0);
        if (totalPercentage !== 100) {
          newValidation.owners.percentage = `Total de participação deve ser 100% (atual: ${totalPercentage}%)`;
        }
        break;
    }
    
    setValidation(newValidation);
    
    // Verificar se há erros na aba atual
    const currentTabErrors = Object.values(newValidation[getCurrentTabValidationKey()]).filter(error => error);
    return currentTabErrors.length === 0;
  };

  const getCurrentTabValidationKey = (): keyof PropertyFormValidation => {
    const keys: (keyof PropertyFormValidation)[] = ['general', 'basicData', 'owners', 'documents', 'files', 'general'];
    return keys[currentTab] || 'general';
  };

  // Navegar entre abas
  const goToTab = (tabIndex: number) => {
    if (tabIndex === currentTab) return;
    
    // Validar aba atual antes de sair (apenas para abas obrigatórias)
    const currentTabData = tabs[currentTab];
    if (currentTabData.required && !validateCurrentTab()) {
      // Mensagem específica para cada aba
      let message = `Por favor, corrija os erros na aba "${currentTabData.name}" antes de continuar.`;
      
      if (currentTab === 1) { // Proprietários
        const invalidOwners = formData.owners.filter(owner => {
          if (owner.ownerType === 'INDIVIDUAL') {
            return !owner.fullName || owner.fullName.trim() === '' || !owner.cpf || owner.cpf.trim() === '' || owner.ownershipPercentage <= 0;
          } else {
            return !owner.companyName || owner.companyName.trim() === '' || !owner.cnpj || owner.cnpj.trim() === '' || owner.ownershipPercentage <= 0;
          }
        });
        
        const totalPercentage = formData.owners.reduce((sum, owner) => sum + owner.ownershipPercentage, 0);
        
        if (formData.owners.length === 0) {
          message = 'Adicione pelo menos um proprietário antes de continuar.';
        } else if (invalidOwners.length > 0) {
          message = `Complete os dados de ${invalidOwners.length} proprietário(s) (nome/razão social e CPF/CNPJ são obrigatórios).`;
        } else if (totalPercentage !== 100) {
          message = `A soma das participações deve ser 100% (atual: ${totalPercentage}%).`;
        }
      }
      
      alert(message);
      return;
    }
    
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

  // Salvar propriedade
  const saveProperty = async () => {
    try {
      setIsSaving(true);
      
      // Validar todas as abas obrigatórias
      let hasErrors = false;
      for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].required) {
          setCurrentTab(i);
          if (!validateCurrentTab()) {
            hasErrors = true;
            break;
          }
        }
      }
      
      if (hasErrors) {
        alert('Por favor, corrija os erros antes de salvar.');
        return;
      }

      // Preparar dados para envio - transformar para o formato esperado pelo backend
      const propertyPayload = {
        id: propertyId,
        // Dados básicos
        name: formData.basicData.registrationNumber, // O backend espera 'name' mas enviamos registrationNumber
        registrationNumber: formData.basicData.registrationNumber,
        propertyType: formData.basicData.propertyType,
        landUse: formData.basicData.landUse,
        
        // Endereço
        street: formData.basicData.address.street,
        number: formData.basicData.address.number || '',
        complement: formData.basicData.address.complement || '',
        neighborhood: formData.basicData.address.neighborhood,
        city: formData.basicData.address.city,
        state: formData.basicData.address.state,
        zipCode: formData.basicData.address.zipCode || '',
        
        // Coordenadas (se existirem)
        latitude: formData.basicData.address.coordinates?.latitude,
        longitude: formData.basicData.address.coordinates?.longitude,
        
        // SIRGAS 2000 Coordinates (for memorial generation)
        sirgas_e: formData.basicData.address.sirgas?.e,
        sirgas_n: formData.basicData.address.sirgas?.n,
        sirgas_source: formData.basicData.address.sirgas?.source,
        
        // Proprietários (primeiro proprietário como principal)
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
        
        // Dados técnicos padrão (serão preenchidos pelo DXF)
        totalArea: 0,
        totalPerimeter: 0,
        datum: 'SIRGAS 2000',
        coordinateSystem: 'SIRGAS 2000 / UTM zone 23S',
        utmZone: '23S',
        centralMeridian: '-45°',
        
        // Status
        active: true,
        
        // Arrays relacionados
        owners: formData.owners,
        documents: formData.documents,
        
        // Processar arquivos - salvar apenas nomes e caminhos dos DXF/DWG
        dxfFiles: formData.files
          .filter(file => {
            const fileName = file.name.toLowerCase();
            return fileName.endsWith('.dxf') || fileName.endsWith('.dwg');
          })
          .map(file => ({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.name.toLowerCase().endsWith('.dxf') ? 'DXF' : 'DWG',
            // O backend pode gerar um caminho baseado no ID da propriedade
            filePath: `properties/${propertyId}/technical/${file.name}`
          })),
        
        // Outros arquivos (documentos, imagens, etc.)
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
      
      // Salvar no banco de dados
      await api.post('/properties', propertyPayload);
      
      // Remover do cache local após salvar com sucesso
      if (propertyId) {
        localStorage.removeItem(`incomplete_property_${propertyId}`);
      }
      
      alert('✅ Propriedade cadastrada com sucesso no banco de dados!');
      navigate('/files');
      
    } catch (error: unknown) {
      console.error('❌ Erro ao salvar propriedade:', error);
      
      // Manter no cache local se falhar ao salvar
      alert(`Erro ao salvar propriedade: ${getErrorMessage(error, 'Erro desconhecido')}\n\nOs dados foram mantidos no cache local. Tente novamente quando o servidor estiver disponível.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="property-register">
      <div className="property-header">
        <div className="header-content">
          <div className="header-top">
            <h1>🏠 Cadastro de Propriedade</h1>
            
            {/* Combobox para cadastros incompletos */}
            <div className="incomplete-properties-selector">
              <label htmlFor="incompleteSelect">Continuar cadastro:</label>
              <div className="selector-row">
                <select
                  id="incompleteSelect"
                  onChange={(e) => {
                    if (e.target.value) {
                      loadSelectedProperty(e.target.value);
                    } else {
                      // Se selecionou a opção vazia, limpar seleção
                      setSelectedIncompleteId('');
                    }
                  }}
                  value={selectedIncompleteId}
                >
                  <option value="">Selecione um cadastro incompleto...</option>
                  {incompletePropertiesList.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.registrationNumber} - {prop.address} 
                      ({new Date(prop.lastModified).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-new"
                  onClick={() => {
                    // Criar novo cadastro
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
                      owners: [],
                      documents: [],
                      files: []
                    });
                    setPropertyId(null);
                    setSelectedIncompleteId('');
                    setCurrentTab(0);
                  }}
                  title="Criar novo cadastro"
                >
                  ➕
                </button>
              </div>
            </div>

            <div className="property-guidance-banner">
              <div className="property-guidance-header">
                <span className="property-guidance-icon">🧭</span>
                <div className="property-guidance-copy">
                  <span className="property-guidance-title">Memorial Assistido por IA</span>
                </div>
                <span className="property-guidance-status">Ativo</span>
              </div>
              <p className="property-guidance-text">
                Complete as abas em sequencia para estruturar os dados do imovel, validar informacoes principais
                e preparar a geracao documental com o padrao operacional da plataforma.
              </p>
            </div>
          </div>
          
          <div className="progress-info">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">{progress}% completo</span>
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
            <PropertyGrid
              onPropertySelect={() => {
                // Propriedade salva automaticamente no localStorage pelo componente
              }}
            />
          )}
          
          {currentTab === 1 && (
            <PropertyBasicData
              data={formData.basicData}
              validation={validation.basicData}
              onChange={(basicData: PropertyFormData['basicData']) => setFormData(prev => ({ ...prev, basicData }))}
            />
          )}
          
          {currentTab === 2 && (
            <PropertyOwners
              owners={formData.owners}
              validation={validation.owners}
              onChange={(owners: PropertyFormData['owners']) => {
                setFormData(prev => ({ ...prev, owners }));
              }}
            />
          )}
          
          {currentTab === 3 && (
            <PropertyDocuments
              documents={formData.documents}
              validation={validation.documents}
              onChange={(documents: PropertyFormData['documents']) => setFormData(prev => ({ ...prev, documents }))}
            />
          )}
          
          {currentTab === 4 && (
            <PropertyFiles
              files={formData.files}
              validation={validation.files}
              onChange={(files: PropertyFormData['files']) => setFormData(prev => ({ ...prev, files }))}
            />
          )}
          
          {currentTab === 5 && (
            <PropertySummary
              data={formData}
              validation={{}}
              onSubmit={saveProperty}
              isSubmitting={isSaving}
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
          
          {currentTab < tabs.length - 1 ? (
            <button 
              onClick={nextTab}
              className="nav-button next"
            >
              Próximo →
            </button>
          ) : (
            <button 
              onClick={saveProperty}
              disabled={isSaving || progress < 100}
              className="nav-button save"
            >
              {isSaving ? 'Salvando...' : '💾 Salvar Propriedade'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyRegister;
