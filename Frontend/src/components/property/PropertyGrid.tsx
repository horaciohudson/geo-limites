import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { AsyncPropertyData } from '@/services/polling-memorial';
import { getSelectedOperationProperty, setSelectedOperationProperty } from '@/utils/operationContext';
import '../../styles/PropertyGrid.css';

interface Property {
  propertyId: string;
  id: string;
  name: string;
  registrationNumber: string;
  ownerName: string;
  ownerDocument: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  propertyType: string;
  totalArea?: number;
  totalPerimeter?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PropertyGridProps {
  onPropertySelect?: (property: Property) => void;
}

interface SelectedPropertyForMemorial extends AsyncPropertyData {
  id?: string;
  propertyId?: string;
}

interface ErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const errorLike = error as ErrorLike;
    return errorLike.response?.data?.message || errorLike.message || fallback;
  }

  return fallback;
};

const PropertyGrid: React.FC<PropertyGridProps> = ({ onPropertySelect }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  // Buscar propriedades do banco
  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/properties');
      const propertiesData = response.data as Property[];
      setProperties(propertiesData);
      
      // Verificar se há uma propriedade já selecionada no localStorage
      const selectedForMemorial = getSelectedOperationProperty<SelectedPropertyForMemorial>();
      if (selectedForMemorial) {
        setSelectedPropertyId(selectedForMemorial.propertyId || selectedForMemorial.id || '');
      }
      
    } catch (err: unknown) {
      console.error('❌ Erro ao buscar propriedades:', err);
      setError(getErrorMessage(err, 'Erro ao carregar propriedades'));
    } finally {
      setLoading(false);
    }
  };

  // Selecionar propriedade para memorial
  const selectPropertyForMemorial = (property: Property) => {
    // Salvar no localStorage
    setSelectedOperationProperty(property);
    
    // Atualizar estado local
    setSelectedPropertyId(property.propertyId || property.id);
    
    // Callback para o componente pai
    if (onPropertySelect) {
      onPropertySelect(property);
    }

    // Mostrar feedback visual
    alert(`Imovel "${property.name}" definido como base da operacao atual!`);
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  // Formatar área
  const formatArea = (area?: number) => {
    return area ? `${area.toFixed(2)} m²` : 'Não informado';
  };

  // Carregar propriedades ao montar o componente
  useEffect(() => {
    fetchProperties();
  }, []);

  if (loading) {
    return (
      <div className="property-grid-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Carregando imoveis ja salvos na base...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="property-grid-container">
        <div className="error-state">
          <h3>❌ Erro ao carregar imoveis</h3>
          <p>{error}</p>
          <button onClick={fetchProperties} className="retry-button">
            🔄 Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="property-grid-container">
      <div className="property-grid-header">
        <h2>🏠 Imoveis Prontos na Base</h2>
        <p>Escolha aqui um imovel ja salvo que pode seguir para a operacao atual.</p>
        <p style={{ marginTop: '0.5rem', color: '#5f6b7a', fontSize: '0.95rem' }}>
          Rascunhos em andamento continuam no seletor "Continuar preparacao" da tela principal.
        </p>
        <button onClick={fetchProperties} className="refresh-button">
          🔄 Atualizar Lista
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="empty-state">
          <h3>📋 Nenhum imovel pronto encontrado</h3>
          <p>Conclua e salve uma preparacao para que ela apareca aqui como base pronta.</p>
        </div>
      ) : (
        <div className="property-grid">
          <div className="grid-header">
            <div className="grid-cell">Operacao</div>
            <div className="grid-cell">Nome</div>
            <div className="grid-cell">Registro</div>
            <div className="grid-cell">Proprietario</div>
            <div className="grid-cell">Endereco</div>
            <div className="grid-cell">Tipo</div>
            <div className="grid-cell">Area</div>
            <div className="grid-cell">Status</div>
            <div className="grid-cell">Criado em</div>
          </div>

          {properties.map((property) => (
            <div 
              key={property.propertyId || property.id} 
              className={`grid-row ${selectedPropertyId === (property.propertyId || property.id) ? 'selected' : ''}`}
            >
              <div className="grid-cell">
                <button
                  onClick={() => selectPropertyForMemorial(property)}
                  className={`select-button ${selectedPropertyId === (property.propertyId || property.id) ? 'selected' : ''}`}
                  title="Definir para a operacao atual"
                >
                  {selectedPropertyId === (property.propertyId || property.id) ? '✅' : '⭕'}
                </button>
              </div>
              
              <div className="grid-cell" title={property.name}>
                {property.name || 'Sem nome'}
              </div>
              
              <div className="grid-cell" title={property.registrationNumber}>
                {property.registrationNumber || 'Sem registro'}
              </div>
              
              <div className="grid-cell" title={property.ownerName}>
                {property.ownerName || 'Sem proprietario'}
              </div>
              
              <div className="grid-cell" title={`${property.street}, ${property.neighborhood}, ${property.city}/${property.state}`}>
                {property.street ? `${property.street}, ${property.city}` : 'Sem endereco'}
              </div>
              
              <div className="grid-cell">
                <span className={`property-type ${property.propertyType?.toLowerCase()}`}>
                  {property.propertyType || 'Nao definido'}
                </span>
              </div>
              
              <div className="grid-cell">
                {formatArea(property.totalArea)}
              </div>
              
              <div className="grid-cell">
                <span className={`status ${property.active ? 'active' : 'inactive'}`}>
                  {property.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              
              <div className="grid-cell">
                {formatDate(property.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPropertyId && (
        <div className="selection-info">
          <h3>✅ Imovel Definido para a Operacao</h3>
          <p>ID: {selectedPropertyId}</p>
          <p>Este imovel ja esta pronto para ser usado nas proximas etapas operacionais.</p>
        </div>
      )}
    </div>
  );
};

export default PropertyGrid;
