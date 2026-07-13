import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantOperationalAccess } from '@/hooks/useTenantOperationalAccess';
import { useOperationContext } from '@/contexts/OperationContext';
import api from '../services/api';
import '../styles/PropertiesPresentation.css';

interface Property {
  propertyId: string;
  id: string;
  name: string;
  registrationNumber: string;
  ownerName: string;
  ownerDocument: string;
  ownerPhone?: string;
  ownerEmail?: string;
  street: string;
  number?: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode?: string;
  propertyType: string;
  landUse?: string;
  totalArea?: number;
  totalPerimeter?: number;
  sirgas_e?: number;
  sirgas_n?: number;
  sirgas_source?: string;
  utmZone?: string;
  datum?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  documents?: any[];
  landmarks?: any[];
  boundaries?: any[];
  dxfFiles?: Array<{
    id?: string;
    originalName?: string;
    fileName?: string;
    sizeBytes?: number;
    contentType?: string;
    primaryForProperty?: boolean;
  }>;
  otherFiles?: Array<{
    id?: string;
    originalName?: string;
    fileName?: string;
    sizeBytes?: number;
    contentType?: string;
  }>;
}

interface PropertyLandmark {
  id?: string;
  landmarkName?: string;
  landmarkType?: string;
  coordinateX?: number;
  coordinateY?: number;
  coordinateZ?: number;
  description?: string;
}

const formatCoordinateSource = (source?: string): string => {
  if (!source) {
    return '';
  }

  return {
    GPS_CAMPO: 'GPS de Campo',
    MARCO_GEODESICO: 'Marco Geodesico',
    LEVANTAMENTO_TOPOGRAFICO: 'Levantamento Topografico',
    MEMORIAL_ORIGINAL: 'Memorial Original',
    GOOGLE_EARTH: 'Google Earth',
    IBGE_COORDENADAS: 'Base IBGE',
    OUTRO: 'Outro'
  }[source] || source;
};

const PropertiesPresentation: React.FC = () => {
  const navigate = useNavigate();
  const { isRestricted, restrictionMessage } = useTenantOperationalAccess();
  const { activePropertyId, clearSelectedProperty, setSelectedProperty } = useOperationContext();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedPropertyDetails, setSelectedPropertyDetails] = useState<Property | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string>('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const normalizeId = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

  const getLinkedDxfCount = (property: Property | null): number =>
    Array.isArray(property?.dxfFiles) ? property!.dxfFiles!.length : 0;

  const getLinkedOtherFileCount = (property: Property | null): number =>
    Array.isArray(property?.otherFiles) ? property!.otherFiles!.length : 0;

  // Buscar lista de imóveis
  const fetchPropertiesList = async (selectIdToLoad?: string) => {
    try {
      setLoadingList(true);
      setError('');
      const response = await api.get('/properties');
      const list = response.data as Property[];
      setProperties(list);

      const normalizedToLoad = normalizeId(selectIdToLoad).trim();
      if (normalizedToLoad) {
        const exists = list.some((p) => normalizeId(p.propertyId || p.id) === normalizedToLoad);
        if (exists) {
          setSelectedPropertyId(normalizedToLoad);
          await fetchPropertyDetails(normalizedToLoad, list);
        } else {
          setSelectedPropertyId('');
          setSelectedPropertyDetails(null);
          clearSelectedProperty();
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar lista de imóveis:', err);
      setError('Falha ao carregar a lista de imóveis da base de dados.');
    } finally {
      setLoadingList(false);
    }
  };

  // Buscar detalhes do imóvel selecionado
  const fetchPropertyDetails = async (id: string, currentList?: Property[]) => {
    if (!id) return;
    try {
      setLoadingDetails(true);
      setError('');
      
      const response = await api.get(`/properties/${id}/details`);
      const details = response.data as Property;
      setSelectedPropertyDetails(details);

      // Atualizar o localStorage para fins de operação (memorial, visualizador)
      const listToSearch = currentList || properties;
      const normalizedId = normalizeId(id);
      const simpleProperty = listToSearch.find(p => normalizeId(p.propertyId || p.id) === normalizedId) || details;
      
      setSelectedProperty({
        ...simpleProperty,
        ...details,
        id: id,
        propertyId: id
      });

    } catch (err: any) {
      console.error('Erro ao buscar detalhes do imóvel:', err);
      setError('Falha ao buscar os detalhes completos do imóvel selecionado.');
      
      // Fallback para os dados básicos da lista caso a chamada de detalhes falhe
      const listToSearch = currentList || properties;
      const normalizedId = normalizeId(id);
      const basic = listToSearch.find(p => normalizeId(p.propertyId || p.id) === normalizedId);
      if (basic) {
        setSelectedPropertyDetails(basic);
        setSelectedProperty({
          ...basic,
          id: id,
          propertyId: id
        });
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  // Tratar mudança no seletor de imóveis
  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPropertyId(val);
    if (val) {
      fetchPropertyDetails(val);
    } else {
      setSelectedPropertyDetails(null);
      clearSelectedProperty();
    }
  };

  // Deletar o imóvel
  const handleDeleteProperty = async () => {
    if (!selectedPropertyId) return;
    try {
      setIsDeleting(true);
      await api.delete(`/properties/${selectedPropertyId}`);
      
      // Limpar seleção se deletou o selecionado
      clearSelectedProperty();
      setSelectedPropertyId('');
      setSelectedPropertyDetails(null);
      setDeleteConfirmOpen(false);
      
      alert('Imóvel excluído com sucesso!');
      
      // Recarregar lista
      await fetchPropertiesList();
    } catch (err: any) {
      console.error('Erro ao excluir imóvel:', err);
      alert('Falha ao excluir o imóvel. Tente novamente mais tarde.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calcular prontidão operacional do imóvel selecionado
  const calculateReadiness = (): number => {
    if (!selectedPropertyDetails) return 0;
    let score = 0;
    const hasReferenceCoordinates = Array.isArray(selectedPropertyDetails.landmarks)
      && selectedPropertyDetails.landmarks.some((landmark: PropertyLandmark) =>
        landmark.coordinateX !== undefined && landmark.coordinateY !== undefined
      );
    const hasLinkedDxf = getLinkedDxfCount(selectedPropertyDetails) > 0;
    
    // 1. Dados básicos cadastrados (Número de registro + Cidade preenchidos)
    if (selectedPropertyDetails.registrationNumber && selectedPropertyDetails.city) score += 20;
    
    // 2. Coordenadas de referência configuradas
    if (hasReferenceCoordinates || (selectedPropertyDetails.sirgas_e && selectedPropertyDetails.sirgas_n)) score += 20;
    
    // 3. Proprietário cadastrado
    if (selectedPropertyDetails.ownerName) score += 20;
    
    // 4. Documentos anexados
    if (selectedPropertyDetails.documents && selectedPropertyDetails.documents.length > 0) score += 20;

    // 5. DXF tecnico vinculado ao cadastro
    if (hasLinkedDxf) score += 20;
    
    return score;
  };

  const readiness = calculateReadiness();
  const linkedDxfCount = getLinkedDxfCount(selectedPropertyDetails);
  const linkedOtherFilesCount = getLinkedOtherFileCount(selectedPropertyDetails);

  // Inicialização
  useEffect(() => {
    fetchPropertiesList(normalizeId(activePropertyId) || undefined);
  }, []);

  return (
    <div className="properties-presentation">
      {/* Cabeçalho Rico (Purple Header) */}
      <div className="presentation-header">
        <div className="header-content">
          <div className="header-top">
            <div className="header-info">
              <h1>🏠 Apresentacao de Imoveis</h1>
            </div>
            
            {/* Seletor de Imóveis Integrado no Cabeçalho */}
            <div className="incomplete-properties-selector">
              <label htmlFor="propertySelect">Imovel Ativo da Operacao:</label>
              <div className="selector-row">
                <select 
                  id="propertySelect" 
                  value={selectedPropertyId} 
                  onChange={handlePropertyChange}
                  disabled={loadingList}
                  className="property-dropdown-header"
                >
                  {properties.length === 0 ? (
                    <option value="">Nenhum imóvel cadastrado...</option>
                  ) : (
                    <>
                      <option value="">Selecione um imóvel...</option>
                      {properties.map(p => (
                        <option key={p.propertyId || p.id} value={p.propertyId || p.id}>
                          {p.name || p.registrationNumber || 'Sem Nome'}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <button 
                  className="btn-new"
                  onClick={() => !isRestricted && navigate('/properties/cadastro')}
                  title={isRestricted ? restrictionMessage : 'Cadastrar novo imóvel'}
                  disabled={isRestricted}
                >
                  ➕
                </button>
              </div>
            </div>
          </div>

          {isRestricted && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.9rem 1rem',
                borderRadius: '12px',
                background: 'rgba(254, 243, 199, 0.22)',
                border: '1px solid rgba(253, 224, 71, 0.4)',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Liberacao pendente.</strong>
              <span>{restrictionMessage}</span>
            </div>
          )}

          {/* Banner de Orientação Operacional */}
          <div className="property-guidance-banner">
            <div className="property-guidance-header">
              <span className="property-guidance-icon">🧭</span>
              <div className="property-guidance-copy">
                <span className="property-guidance-title">Status da Operacao</span>
              </div>
              <span className="property-guidance-status">
                {selectedPropertyId ? 'Imovel Definido' : 'Sem Selecao'}
              </span>
            </div>
            <p className="property-guidance-text">
              {selectedPropertyDetails ? (
                linkedDxfCount > 0
                  ? `O imovel "${selectedPropertyDetails.name || selectedPropertyDetails.registrationNumber}" esta ativo e ja possui ${linkedDxfCount} arquivo(s) tecnico(s) pronto(s) para operacao.`
                  : `O imovel "${selectedPropertyDetails.name || selectedPropertyDetails.registrationNumber}" esta ativo, mas ainda precisa do DXF tecnico vinculado no cadastro para seguir completo para a operacao.`
              ) : (
                'Escolha um imóvel no seletor para ativar a operação. Novos imóveis devem ser criados através do menu lateral "Cadastrar Imóvel".'
              )}
            </p>
          </div>

          {selectedPropertyDetails && (
            <div className="property-readiness-checklist">
              <div className={`readiness-pill ${selectedPropertyDetails.registrationNumber && selectedPropertyDetails.city ? 'ready' : 'pending'}`}>
                Identificacao
              </div>
              <div className={`readiness-pill ${(Array.isArray(selectedPropertyDetails.landmarks) && selectedPropertyDetails.landmarks.some((landmark: PropertyLandmark) => landmark.coordinateX !== undefined && landmark.coordinateY !== undefined)) || (selectedPropertyDetails.sirgas_e && selectedPropertyDetails.sirgas_n) ? 'ready' : 'pending'}`}>
                Pontos
              </div>
              <div className={`readiness-pill ${selectedPropertyDetails.ownerName ? 'ready' : 'pending'}`}>
                Proprietario
              </div>
              <div className={`readiness-pill ${selectedPropertyDetails.documents && selectedPropertyDetails.documents.length > 0 ? 'ready' : 'pending'}`}>
                Documentos
              </div>
              <div className={`readiness-pill ${linkedDxfCount > 0 ? 'ready' : 'pending'}`}>
                DXF Tecnico
              </div>
            </div>
          )}

          {/* Barra de Progresso de Prontidão Operacional */}
          <div className="progress-info">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${readiness}%` }}
              ></div>
            </div>
            <span className="progress-text">{readiness}% pronto para operar</span>
          </div>
        </div>
      </div>

      {/* Barra de Ações Rápidas (abaixo do cabeçalho) */}
      {selectedPropertyDetails && (
        <div className="quick-actions-bar">
          <div className="selected-property-label-bar">
            <span>Imóvel Atual: <strong>{selectedPropertyDetails.name || selectedPropertyDetails.registrationNumber}</strong></span>
            <div className="selected-property-meta">
              <span>{linkedDxfCount} DXF tecnico(s)</span>
              <span>{Array.isArray(selectedPropertyDetails.landmarks) ? selectedPropertyDetails.landmarks.length : 0} ponto(s)</span>
              <span>{selectedPropertyDetails.documents?.length || 0} documento(s)</span>
              {selectedPropertyDetails.sirgas_source && (
                <span>Fonte da coordenada: {formatCoordinateSource(selectedPropertyDetails.sirgas_source)}</span>
              )}
            </div>
          </div>
          <div className="selector-actions">
            <button 
              className="btn-action-edit"
              onClick={() => !isRestricted && navigate(`/properties/cadastro?edit=${selectedPropertyId}`)}
              title={isRestricted ? restrictionMessage : 'Editar os dados de cadastro deste imóvel'}
              disabled={isRestricted}
            >
              ✏️ Editar Cadastro
            </button>
            <button 
              className="btn-action-danger"
              onClick={() => setDeleteConfirmOpen(true)}
              title="Excluir este imóvel permanentemente"
            >
              🗑️ Excluir
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteConfirmOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3>⚠️ Confirmar Exclusao</h3>
            <p>Você tem certeza que deseja excluir o imóvel <strong>"{selectedPropertyDetails?.name || selectedPropertyDetails?.registrationNumber}"</strong> permanentemente?</p>
            <p className="danger-warning">Esta ação não poderá ser desfeita e removerá o imóvel da base.</p>
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button 
                className="btn-danger-confirm" 
                onClick={handleDeleteProperty}
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback de Estados */}
      {error && (
        <div className="state-container error-state" style={{ color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2' }}>
          <span>❌</span>
          <h3>Erro ao processar informacoes</h3>
          <p>{error}</p>
          <button className="btn-action-primary" onClick={() => fetchPropertiesList()}>
            🔄 Tentar Novamente
          </button>
        </div>
      )}

      {loadingList && (
        <div className="state-container">
          <div className="loading-spinner"></div>
          <p>Carregando imóveis da base de dados...</p>
        </div>
      )}

      {!loadingList && properties.length === 0 && (
        <div className="state-container empty-state">
          <span>📋</span>
          <h3>Nenhum imovel cadastrado</h3>
          <p>Comece criando seu primeiro cadastro de imóvel para utilizá-lo nas operações de memorial.</p>
          <button
            className="btn-action-primary"
            onClick={() => !isRestricted && navigate('/properties/cadastro')}
            disabled={isRestricted}
            title={isRestricted ? restrictionMessage : 'Cadastrar novo imóvel'}
          >
            Cadastrar Novo Imóvel
          </button>
        </div>
      )}

      {!loadingList && properties.length > 0 && !selectedPropertyId && (
        <div className="state-container prompt-state">
          <span>🧭</span>
          <h3>Selecione um imovel</h3>
          <p>Escolha um imóvel no menu suspenso acima para visualizar seus dados e ativar a operação.</p>
        </div>
      )}

      {loadingDetails && (
        <div className="state-container">
          <div className="loading-spinner"></div>
          <p>Buscando detalhes do imóvel...</p>
        </div>
      )}

      {/* Apresentação por Cards (Apenas Leitura) */}
      {!loadingDetails && selectedPropertyDetails && (
        <div className="cards-grid">
          
          {/* CARD 1: Dados Básicos e Localização */}
          <div className="info-card basic-card">
            <div className="card-header">
              <span className="card-icon">📍</span>
              <h3>Dados Basicos e Endereco</h3>
            </div>
            <div className="card-body">
              <div className="info-row">
                <span className="info-label">Identificação / Registro:</span>
                <span className="info-value highlight">{selectedPropertyDetails.registrationNumber || selectedPropertyDetails.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Tipo de Imóvel:</span>
                <span className="info-value">
                  {selectedPropertyDetails.propertyType === 'RURAL' ? '🌾 Rural' : 
                   selectedPropertyDetails.propertyType === 'URBAN' ? '🏙️ Urbana' : '🏘️ Misto'}
                </span>
              </div>
              {selectedPropertyDetails.landUse && (
                <div className="info-row">
                  <span className="info-label">Uso do Solo:</span>
                  <span className="info-value">
                    {{
                      'RESIDENTIAL': '🏠 Residencial',
                      'COMMERCIAL': '🏢 Comercial',
                      'INDUSTRIAL': '🏭 Industrial',
                      'AGRICULTURAL': '🌾 Agrícola',
                      'MIXED': '🏘️ Misto'
                    }[selectedPropertyDetails.landUse] || selectedPropertyDetails.landUse}
                  </span>
                </div>
              )}
              <hr />
              <div className="info-row">
                <span className="info-label">Endereço:</span>
                <span className="info-value">
                  {selectedPropertyDetails.street}
                  {selectedPropertyDetails.number ? `, Nº ${selectedPropertyDetails.number}` : ''}
                  {selectedPropertyDetails.complement ? ` - ${selectedPropertyDetails.complement}` : ''}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Bairro:</span>
                <span className="info-value">{selectedPropertyDetails.neighborhood}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Cidade / Estado:</span>
                <span className="info-value">{selectedPropertyDetails.city} - {selectedPropertyDetails.state}</span>
              </div>
              {selectedPropertyDetails.zipCode && (
                <div className="info-row">
                  <span className="info-label">CEP:</span>
                  <span className="info-value">{selectedPropertyDetails.zipCode}</span>
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: Pontos de Referencia */}
          <div className="info-card sirgas-card">
            <div className="card-header">
              <span className="card-icon">📐</span>
              <h3>Arquivo Tecnico e Pontos de Referencia</h3>
            </div>
            <div className="card-body">
              {linkedDxfCount === 0 && (
                <div className="sirgas-empty-warning">
                  <span>⚠️ Nenhum DXF tecnico vinculado ao cadastro</span>
                  <p>Envie o DXF principal na aba Arquivos do cadastro para liberar a operacao tecnica deste imovel.</p>
                </div>
              )}

              {linkedDxfCount > 0 && (
                <div className="linked-files-list">
                  {selectedPropertyDetails.dxfFiles?.map((file, index) => (
                    <div key={file.id || `${file.originalName || file.fileName || 'dxf'}-${index}`} className="linked-file-item">
                      <span className="linked-file-name">
                        📐 {file.originalName || file.fileName || `Arquivo tecnico ${index + 1}`}
                        {file.primaryForProperty ? ' · Principal' : ''}
                      </span>
                      <span className="linked-file-meta">
                        {file.sizeBytes ? `${(file.sizeBytes / 1024 / 1024).toFixed(2)} MB` : 'Tamanho nao informado'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {linkedOtherFilesCount > 0 && (
                <div className="info-row" style={{ marginTop: '0.85rem' }}>
                  <span className="info-label">Outros anexos tecnicos:</span>
                  <span className="info-value">{linkedOtherFilesCount}</span>
                </div>
              )}

              <hr />
              {Array.isArray(selectedPropertyDetails.landmarks) && selectedPropertyDetails.landmarks.length > 0 ? (
                <>
                  <div className="landmarks-table-shell">
                    <div className="landmarks-table-scroll">
                      <table className="landmarks-table">
                      <thead>
                        <tr>
                          <th>Ponto</th>
                          <th>Tipo</th>
                          <th>Coordenada E/X</th>
                          <th>Coordenada N/Y</th>
                          <th>Observacao</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPropertyDetails.landmarks.map((landmark: PropertyLandmark, index: number) => (
                          <tr key={landmark.id || `${landmark.landmarkName || 'ponto'}-${index}`}>
                            <td>
                              {landmark.landmarkName || `Ponto ${index + 1}`}
                            </td>
                            <td>
                              {landmark.landmarkType || 'Nao informado'}
                            </td>
                            <td>
                              {landmark.coordinateX !== undefined ? `${landmark.coordinateX.toLocaleString('pt-BR')} m` : 'Nao informado'}
                            </td>
                            <td>
                              {landmark.coordinateY !== undefined ? `${landmark.coordinateY.toLocaleString('pt-BR')} m` : 'Nao informado'}
                            </td>
                            <td>
                              {landmark.description || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="sirgas-empty-warning">
                  <span>⚠️ Nenhum ponto de referencia cadastrado</span>
                  <p>Cadastre pontos ou estacas nomeados na tela de edicao para aproveitar coordenadas reais na operacao.</p>
                </div>
              )}
            </div>
          </div>

          {/* CARD 3: Proprietários */}
          <div className="info-card owners-card">
            <div className="card-header">
              <span className="card-icon">👥</span>
              <h3>Proprietarios</h3>
            </div>
            <div className="card-body">
              {selectedPropertyDetails.ownerName ? (
                <div className="owner-presentation-item">
                  <div className="owner-pres-header">
                    <h4>{selectedPropertyDetails.ownerName}</h4>
                    <span className="share-badge">100.00%</span>
                  </div>
                  <div className="owner-pres-details">
                    <div className="detail-line">
                      <strong>Documento:</strong> {selectedPropertyDetails.ownerDocument || 'Não informado'}
                    </div>
                    {selectedPropertyDetails.ownerEmail && (
                      <div className="detail-line">
                        <strong>Email:</strong> {selectedPropertyDetails.ownerEmail}
                      </div>
                    )}
                    {selectedPropertyDetails.ownerPhone && (
                      <div className="detail-line">
                        <strong>Telefone:</strong> {selectedPropertyDetails.ownerPhone}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="no-data-msg">Nenhum proprietário cadastrado para este imóvel.</p>
              )}
            </div>
          </div>

          {/* CARD 4: Documentos Anexos */}
          <div className="info-card documents-card">
            <div className="card-header">
              <span className="card-icon">📄</span>
              <h3>Documentos e Anexos</h3>
            </div>
            <div className="card-body">
              {selectedPropertyDetails.documents && selectedPropertyDetails.documents.length > 0 ? (
                <ul className="document-presentation-list">
                  {selectedPropertyDetails.documents.map((doc: any, index: number) => (
                    <li key={index} className="document-presentation-item">
                      <span className="doc-icon">📁</span>
                      <div className="doc-meta">
                        <strong>
                          {doc.documentType === 'MATRICULA' ? '🏠 Matrícula' : 
                           doc.documentType === 'CONTRATO_COMPRA_VENDA' ? '📜 Contrato' : 
                           doc.documentType === 'ESCRITURA' ? '✒️ Escritura' : '📄 Outro'}
                        </strong>
                        <span>Número: {doc.documentNumber || 'Não informado'}</span>
                        {doc.description && <span className="doc-desc">{doc.description}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-data-msg">Nenhum documento legal anexado a este cadastro.</p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default PropertiesPresentation;
