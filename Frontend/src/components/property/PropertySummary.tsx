import React from 'react';
import type { PropertyFormData } from '@/types/property';

interface PropertySummaryProps {
  data: PropertyFormData;
  validation: Record<string, string>;
  onSubmit: () => void;
  isSubmitting: boolean;
  onSaveDraft?: () => void;
}

const PropertySummary: React.FC<PropertySummaryProps> = ({ 
  data, 
  validation, 
  onSubmit, 
  isSubmitting,
  onSaveDraft
}) => {
  const primaryOwner = data?.owners?.[0];
  const isOwnerValid = Boolean(
    primaryOwner && (
      primaryOwner.ownerType === 'INDIVIDUAL' 
        ? (primaryOwner.fullName?.trim() && primaryOwner.cpf?.trim())
        : (primaryOwner.companyName?.trim() && primaryOwner.cnpj?.trim())
    )
  );

  const getValidationSummary = () => {
    try {
      if (!validation || typeof validation !== 'object') return 0;
      const errors = Object.values(validation).filter(error => error);
      return errors.length;
    } catch (error) {
      console.error('Erro ao calcular resumo de validação:', error);
      return 0;
    }
  };

  const isFormValid = () => {
    return getValidationSummary() === 0 && isOwnerValid;
  };

  const hasBasicIdentification = Boolean(
    data?.basicData?.registrationNumber &&
    data?.basicData?.address?.street &&
    data?.basicData?.address?.city &&
    data?.basicData?.address?.state
  );

  const hasOwnersReady = isOwnerValid;

  const hasSupportDocuments = Boolean(data?.documents?.length);
  const hasSupportFiles = Boolean(data?.files?.length);

  // Verificação de segurança para evitar página branca
  if (!data || typeof data !== 'object') {
    return (
      <div className="property-summary">
        <div className="error-state">
          <h2>⚠️ Erro ao carregar resumo</h2>
          <p>Dados da propriedade não encontrados ou corrompidos.</p>
          <p>Volte às abas anteriores para verificar os dados.</p>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="property-summary">
      <div className="section-header">
        <h2>📋 Prontidao da Preparacao do Imovel</h2>
        <p className="section-description">
          Revise aqui o que ja esta pronto na base do imovel antes de salvar e seguir para a operacao.
        </p>
      </div>

      {/* Status de Validação */}
      <div className={`validation-status ${isFormValid() ? 'valid' : 'invalid'}`}>
        <div className="status-header">
          <h3>
            {isFormValid() ? '✅ Base pronta para salvar' : '⚠️ Ainda faltam ajustes na preparacao'}
          </h3>
        </div>
        
        {getValidationSummary() > 0 && (
          <div className="validation-errors">
            <p><strong>Pendencias encontradas:</strong> {getValidationSummary()}</p>
            <p>Revise as abas anteriores para concluir a preparacao antes de salvar.</p>
          </div>
        )}

        {!isOwnerValid && (
          <div className="ownership-warning">
            <p><strong>Proprietário Pendente:</strong> Dados obrigatórios não preenchidos.</p>
            <p>Preencha os campos obrigatórios na aba "Proprietários" para o imóvel ficar pronto.</p>
          </div>
        )}
      </div>

      <div className="summary-section">
        <h3>✅ Checklist Final de Prontidao</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="label">Identificacao do imovel</span>
            <span className="value">{hasBasicIdentification ? 'Pronta' : 'Pendente'}</span>
          </div>
          <div className="summary-item">
            <span className="label">Proprietarios</span>
            <span className="value">{hasOwnersReady ? 'Prontos' : 'Pendentes'}</span>
          </div>
          <div className="summary-item">
            <span className="label">Documentos de apoio</span>
            <span className="value">{hasSupportDocuments ? 'Disponiveis' : 'Nao informados'}</span>
          </div>
          <div className="summary-item">
            <span className="label">Arquivos de apoio</span>
            <span className="value">{hasSupportFiles ? 'Disponiveis' : 'Nao informados'}</span>
          </div>
        </div>
        <p className="section-description" style={{ marginTop: '0.75rem' }}>
          Quando os itens essenciais estiverem prontos, salve o imovel e depois escolha-o em "Imoveis Prontos" para usar na operacao atual.
        </p>
      </div>

      {/* Resumo dos Dados Básicos */}
      <div className="summary-section">
        <h3>📍 Identificacao Preparada</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="label">Numero de Registro:</span>
            <span className="value">{data.basicData.registrationNumber || 'Nao informado'}</span>
          </div>
          <div className="summary-item">
            <span className="label">Tipo de Imovel:</span>
            <span className="value">
              {{
                'URBAN': '🏙️ Urbana',
                'RURAL': '🌾 Rural',
                'MIXED': '🏘️ Mista'
              }[data.basicData.propertyType]}
            </span>
          </div>
          <div className="summary-item">
            <span className="label">Uso do Solo:</span>
            <span className="value">
              {{
                'RESIDENTIAL': '🏠 Residencial',
                'COMMERCIAL': '🏢 Comercial',
                'INDUSTRIAL': '🏭 Industrial',
                'AGRICULTURAL': '🌾 Agrícola',
                'MIXED': '🏘️ Misto'
              }[data.basicData.landUse]}
            </span>
          </div>
          <div className="summary-item full-width">
            <span className="label">Endereço:</span>
            <span className="value">
              {data.basicData.address.street}
              {data.basicData.address.number && `, ${data.basicData.address.number}`}
              {data.basicData.address.complement && `, ${data.basicData.address.complement}`}
              <br />
              {data.basicData.address.neighborhood}, {data.basicData.address.city} - {data.basicData.address.state}
              {data.basicData.address.zipCode && ` - ${data.basicData.address.zipCode}`}
            </span>
          </div>
        </div>
      </div>

      {/* Resumo dos Proprietários */}
      <div className="summary-section">
        <h3>👥 Proprietário do Imóvel</h3>
        <p className="section-description">
          Confira os dados jurídicos do proprietário antes de salvar.
        </p>
        {primaryOwner && isOwnerValid ? (
          <div className="owners-summary">
            <div className="owner-summary-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div className="owner-info" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span className="owner-name">
                  {primaryOwner.ownerType === 'INDIVIDUAL' ? '👤' : '🏢'}{' '}
                  {primaryOwner.ownerType === 'INDIVIDUAL' ? primaryOwner.fullName : primaryOwner.companyName}
                </span>
                <span className="owner-type" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                  {primaryOwner.ownerType === 'INDIVIDUAL' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </span>
              </div>
              <div className="owner-document" style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                <strong>Documento:</strong> {primaryOwner.ownerType === 'INDIVIDUAL' ? primaryOwner.cpf : primaryOwner.cnpj}
                {(primaryOwner.rg || primaryOwner.stateRegistration) && (
                  <>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>|</span>
                    <strong>{primaryOwner.ownerType === 'INDIVIDUAL' ? 'RG' : 'I.E.'}:</strong>{' '}
                    {primaryOwner.ownerType === 'INDIVIDUAL' ? primaryOwner.rg : primaryOwner.stateRegistration}
                  </>
                )}
              </div>
              {(primaryOwner.email || primaryOwner.phone) && (
                <div className="owner-contact" style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  {primaryOwner.email && <span>📧 {primaryOwner.email}</span>}
                  {primaryOwner.email && primaryOwner.phone && <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>|</span>}
                  {primaryOwner.phone && <span>📞 {primaryOwner.phone}</span>}
                </div>
              )}
              <div className="ownership-details" style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                <strong>Regime:</strong>{' '}
                {{
                  'FULL': 'Propriedade Plena (100%)',
                  'USUFRUCT': 'Usufruto',
                  'LEASE': 'Arrendamento / Concessão',
                  'PARTIAL': 'Posse / Outro'
                }[primaryOwner.ownershipType] || 'Propriedade Plena'}
              </div>
            </div>
          </div>
        ) : (
          <p className="empty-message" style={{ color: '#dc3545', fontWeight: 500 }}>
            ⚠️ Dados do proprietário incompletos ou não informados.
          </p>
        )}
      </div>

      {/* Nota sobre Dados Técnicos */}
      <div className="summary-section">
        <h3>📐 Leitura Tecnica na Operacao</h3>
        <div className="technical-note">
          <p>📋 Area, perimetro, coordenadas e confrontacoes serao extraidos dos arquivos DXF/DWG durante a operacao do memorial.</p>
          <p>🎯 Esta etapa acontece depois, no visualizador e na geracao do memorial, usando a base preparada aqui.</p>
        </div>
      </div>

      {/* Resumo dos Documentos */}
      {data.documents && data.documents.length > 0 && (
        <div className="summary-section">
          <h3>📄 Documentos de Apoio ({data.documents.length})</h3>
          <div className="documents-summary">
            {data.documents.map((doc, index) => (
              <div key={index} className="document-summary-item">
                <span className="document-type">
                  {{
                    'DEED': '📜 Escritura',
                    'REGISTRATION': '📋 Matrícula',
                    'CERTIFICATE': '📄 Certidão',
                    'LICENSE': '📝 Licença',
                    'OTHER': '📁 Outro'
                  }[doc.documentType]}
                </span>
                <span className="document-number">{doc.documentNumber}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo dos Arquivos */}
      {data.files && data.files.length > 0 && (
        <div className="summary-section">
          <h3>🗂️ Arquivos de Apoio ({data.files.length})</h3>
          <div className="files-summary">
            {data.files.map((file, index) => (
              <div key={index} className="file-summary-item">
                <span className="file-name">{file?.name || 'Nome não disponível'}</span>
                <span className="file-size">
                  {file?.size ? (file.size / 1024 / 1024).toFixed(2) : '0.00'} MB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão de Submissão */}
      <div className="submit-section">
        <button
          onClick={onSubmit}
          disabled={!isFormValid() || isSubmitting}
          className={`btn-submit ${isFormValid() ? 'valid' : 'invalid'}`}
        >
          {isSubmitting ? (
            <>
              <span className="loading-spinner">⏳</span>
              Salvando Imovel...
            </>
          ) : (
            <>
              <span>✅</span>
              Salvar Imovel na Base
            </>
          )}
        </button>

        {!isFormValid() && (
          <div style={{ marginTop: '1rem' }}>
            <p className="submit-warning" style={{ marginBottom: '1rem' }}>
              Corrija as pendencias acima antes de salvar a preparacao do imovel.
            </p>
            {onSaveDraft && data.basicData.registrationNumber && (
              <button
                type="button"
                onClick={onSaveDraft}
                className="btn-secondary"
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                📝 Salvar Rascunho Local
              </button>
            )}
          </div>
        )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Erro no componente PropertySummary:', error);
    return (
      <div className="property-summary">
        <div className="error-state">
          <h2>⚠️ Erro ao exibir resumo</h2>
          <p>Ocorreu um erro ao processar os dados da propriedade.</p>
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

export default PropertySummary;
