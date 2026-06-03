import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { AsyncPropertyData } from '@/services/polling-memorial';
import '../../styles/PropertySearch.css';

interface PropertySummary {
  property_id: string;
  registration_number: string;
  name: string;
  property_type: string;
  full_address: string;
  owner_name: string;
  owner_document: string;
  total_owners: number;
  total_documents: number;
  total_files: number;
  total_dxf_files: number;
  dxf_files_list: string;
  completeness_status: string;
  created_at: string;
  updated_at: string;
}

interface PropertyFileSummary {
  fileName: string;
}

interface PropertyApiResponse {
  id?: string;
  property_id?: string;
  registrationNumber?: string;
  registration_number?: string;
  name?: string;
  propertyType?: string;
  property_type?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  ownerName?: string;
  owner_name?: string;
  ownerDocument?: string;
  owner_document?: string;
  dxfFiles?: PropertyFileSummary[];
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

interface SelectedPropertyForMemorial extends AsyncPropertyData {
  id: string;
  dxfFiles: string[];
}

interface ErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface PropertySearchProps {
  onPropertySelect: (property: PropertySummary) => void;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const errorLike = error as ErrorLike;
    return errorLike.response?.data?.message || errorLike.message || fallback;
  }

  return fallback;
};

const buildPropertySummary = (prop: PropertyApiResponse): PropertySummary => ({
  property_id: prop.id || prop.property_id || '',
  registration_number: prop.registrationNumber || prop.registration_number || '',
  name: prop.name || '',
  property_type: prop.propertyType || prop.property_type || '',
  full_address: `${prop.street || ''}, ${prop.number || ''} - ${prop.neighborhood || ''}, ${prop.city || ''} - ${prop.state || ''}`,
  owner_name: prop.ownerName || prop.owner_name || '',
  owner_document: prop.ownerDocument || prop.owner_document || '',
  total_owners: 1,
  total_documents: 0,
  total_files: 0,
  total_dxf_files: prop.dxfFiles?.length || 0,
  dxf_files_list: prop.dxfFiles?.map((file) => file.fileName).join(', ') || '',
  completeness_status: (prop.registrationNumber && prop.street && prop.ownerName) ? 'COMPLETO' : 'INCOMPLETO',
  created_at: prop.createdAt || prop.created_at || '',
  updated_at: prop.updatedAt || prop.updated_at || ''
});

const PropertySearch: React.FC<PropertySearchProps> = ({ onPropertySelect }) => {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<PropertySummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<PropertySummary | null>(null);

  // Wrapper de erro para evitar página branca
  try {

  // Carregar propriedades
  useEffect(() => {
    loadProperties();
  }, []);

  // Filtrar propriedades quando o termo de busca mudar
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProperties(properties);
    } else {
      const filtered = properties.filter(property => 
        property.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.full_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.owner_document?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProperties(filtered);
    }
  }, [searchTerm, properties]);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      let propertiesData = [];
      
      try {
        // Tentar buscar dados da view primeiro
        const response = await api.get('/properties/summary');
        propertiesData = response.data;
      } catch (viewError: unknown) {
        
        // Fallback: usar endpoint padrão de propriedades
        const response = await api.get('/properties');
        const rawProperties = response.data as PropertyApiResponse[];
        
        // Transformar dados para o formato esperado
        propertiesData = rawProperties.map(buildPropertySummary);
      }
      
      setProperties(propertiesData);
      setFilteredProperties(propertiesData);
      
    } catch (err: unknown) {
      console.error('❌ Erro ao carregar propriedades:', err);
      setError(getErrorMessage(err, 'Erro ao carregar propriedades'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePropertySelect = (property: PropertySummary) => {
    setSelectedProperty(property);
    
    // Salvar no localStorage para uso no memorial
    const propertyForMemorial: SelectedPropertyForMemorial = {
      id: property.property_id,
      registrationNumber: property.registration_number,
      name: property.name,
      street: property.full_address.split(' - ')[0], // Extrair rua do endereço completo
      neighborhood: property.full_address.split(' - ')[1]?.split(',')[0],
      city: property.full_address.split(', ')[1]?.split(' - ')[0],
      state: property.full_address.split(' - ')[2]?.split(' -')[0],
      ownerName: property.owner_name,
      ownerDocument: property.owner_document,
      propertyType: property.property_type,
      dxfFiles: property.dxf_files_list ? property.dxf_files_list.split(', ') : []
    };
    
    localStorage.setItem('selectedPropertyForMemorial', JSON.stringify(propertyForMemorial));
    
    // Callback para o componente pai
    onPropertySelect(property);
  };

  const getPropertyTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'URBAN': '🏙️ Urbana',
      'RURAL': '🌾 Rural',
      'MIXED': '🏘️ Mista'
    };
    return types[type] || type;
  };

  const getCompletenessColor = (status: string) => {
    return status === 'COMPLETO' ? '#4caf50' : '#ff9800';
  };

    return (
      <div className="property-search">
      <div className="search-header">
        <h2>🔍 Pesquisar Propriedades Existentes</h2>
        <p className="section-description">
          Selecione uma propriedade existente para editar ou use como base para um novo cadastro.
        </p>
      </div>

      {/* Barra de Pesquisa */}
      <div className="search-controls">
        <div className="search-input-group">
          <input
            type="text"
            placeholder="Pesquisar por registro, nome, endereço, proprietário ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button 
            onClick={loadProperties}
            className="btn-refresh"
            title="Atualizar lista"
          >
            🔄
          </button>
        </div>
        
        <div className="search-stats">
          <span>📊 {filteredProperties.length} de {properties.length} propriedades</span>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="loading-state">
          <p>🔄 Carregando propriedades...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={loadProperties} className="btn-retry">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Tabela de Propriedades */}
      {!isLoading && !error && (
        <div className="properties-table-container">
          <table className="properties-table">
            <thead>
              <tr>
                <th>Registro</th>
                <th>Nome/Identificação</th>
                <th>Endereço</th>
                <th>Proprietário</th>
                <th>Tipo</th>
                <th>Arquivos DXF</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProperties.map((property) => (
                <tr 
                  key={property.property_id}
                  className={selectedProperty?.property_id === property.property_id ? 'selected' : ''}
                >
                  <td>
                    <strong>{property.registration_number}</strong>
                  </td>
                  <td>
                    <div className="property-name">
                      {property.name}
                      <small>{property.property_id.substring(0, 8)}...</small>
                    </div>
                  </td>
                  <td>
                    <div className="address-cell">
                      {property.full_address}
                    </div>
                  </td>
                  <td>
                    <div className="owner-cell">
                      <strong>{property.owner_name}</strong>
                      <small>{property.owner_document}</small>
                    </div>
                  </td>
                  <td>
                    {getPropertyTypeLabel(property.property_type)}
                  </td>
                  <td>
                    <div className="files-cell">
                      <span className="file-count">
                        📐 {property.total_dxf_files}
                      </span>
                      {property.dxf_files_list && (
                        <small title={property.dxf_files_list}>
                          {property.dxf_files_list.length > 30 
                            ? property.dxf_files_list.substring(0, 30) + '...'
                            : property.dxf_files_list
                          }
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ 
                        backgroundColor: getCompletenessColor(property.completeness_status),
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.8em'
                      }}
                    >
                      {property.completeness_status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handlePropertySelect(property)}
                      className="btn-select"
                      title="Selecionar esta propriedade"
                    >
                      ✅ Selecionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProperties.length === 0 && !isLoading && (
            <div className="empty-state">
              <p>📭 Nenhuma propriedade encontrada</p>
              {searchTerm && (
                <p>Tente ajustar os termos de pesquisa ou <button onClick={() => setSearchTerm('')}>limpar filtros</button></p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Propriedade Selecionada */}
      {selectedProperty && (
        <div className="selected-property-info">
          <h3>✅ Propriedade Selecionada</h3>
          <div className="selected-details">
            <p><strong>Registro:</strong> {selectedProperty.registration_number}</p>
            <p><strong>Nome:</strong> {selectedProperty.name}</p>
            <p><strong>Endereço:</strong> {selectedProperty.full_address}</p>
            <p><strong>Proprietário:</strong> {selectedProperty.owner_name} ({selectedProperty.owner_document})</p>
            <p><strong>Arquivos DXF:</strong> {selectedProperty.total_dxf_files} arquivo(s)</p>
            <p><strong>Status:</strong> {selectedProperty.completeness_status}</p>
          </div>
          
          <div className="selection-actions">
            <button 
              onClick={() => {
                // Limpar seleção
                setSelectedProperty(null);
                localStorage.removeItem('selectedPropertyForMemorial');
              }}
              className="btn-clear"
            >
              🗑️ Limpar Seleção
            </button>
          </div>
        </div>
      )}
      </div>
    );
  } catch (error) {
    console.error('Erro no componente PropertySearch:', error);
    return (
      <div className="property-search">
        <div className="error-state">
          <h2>⚠️ Erro ao carregar pesquisa de propriedades</h2>
          <p>Ocorreu um erro ao inicializar a pesquisa.</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-reload"
          >
            🔄 Recarregar página
          </button>
        </div>
      </div>
    );
  }
};

export default PropertySearch;
