import React from 'react';
import type { PropertyFormData } from '@/types/property';

interface PropertySummaryProps {
  data: PropertyFormData;
  validation: Record<string, string>;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const PropertySummary: React.FC<PropertySummaryProps> = ({ 
  data, 
  validation, 
  onSubmit, 
  isSubmitting 
}) => {
  const getTotalOwnershipPercentage = () => {
    try {
      if (!data?.owners || !Array.isArray(data.owners)) return 0;
      return data.owners.reduce((sum, owner) => sum + (owner?.ownershipPercentage || 0), 0);
    } catch (error) {
      console.error('Erro ao calcular percentual de propriedade:', error);
      return 0;
    }
  };

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
    return getValidationSummary() === 0 && getTotalOwnershipPercentage() === 100;
  };

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
        <h2>📋 Resumo do Cadastro</h2>
        <p className="section-description">
          Revise todas as informações antes de finalizar o cadastro da propriedade.
        </p>
      </div>

      {/* Status de Validação */}
      <div className={`validation-status ${isFormValid() ? 'valid' : 'invalid'}`}>
        <div className="status-header">
          <h3>
            {isFormValid() ? '✅ Formulário Válido' : '⚠️ Atenção Necessária'}
          </h3>
        </div>
        
        {getValidationSummary() > 0 && (
          <div className="validation-errors">
            <p><strong>Erros encontrados:</strong> {getValidationSummary()}</p>
            <p>Corrija os erros nas abas anteriores antes de continuar.</p>
          </div>
        )}

        {getTotalOwnershipPercentage() !== 100 && (
          <div className="ownership-warning">
            <p><strong>Participação dos proprietários:</strong> {getTotalOwnershipPercentage()}%</p>
            <p>A soma da participação deve ser exatamente 100%.</p>
          </div>
        )}
      </div>

      {/* Resumo dos Dados Básicos */}
      <div className="summary-section">
        <h3>📍 Dados Básicos</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="label">Número de Registro:</span>
            <span className="value">{data.basicData.registrationNumber || 'Não informado'}</span>
          </div>
          <div className="summary-item">
            <span className="label">Tipo de Propriedade:</span>
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
        <h3>👥 Proprietários ({data.owners?.length || 0})</h3>
        {data.owners && data.owners.length > 0 ? (
          <div className="owners-summary">
            {data.owners.map((owner, index) => (
              <div key={index} className="owner-summary-item">
                <div className="owner-info">
                  <span className="owner-name">
                    {owner.ownerType === 'INDIVIDUAL' ? '👤' : '🏢'} 
                    {owner.ownerType === 'INDIVIDUAL' ? owner.fullName : owner.companyName}
                  </span>
                  <span className="owner-percentage">{owner.ownershipPercentage}%</span>
                </div>
                <div className="owner-document">
                  {owner.ownerType === 'INDIVIDUAL' ? owner.cpf : owner.cnpj}
                </div>
              </div>
            ))}
            <div className="total-percentage">
              <strong>Total: {getTotalOwnershipPercentage()}%</strong>
            </div>
          </div>
        ) : (
          <p className="empty-message">Nenhum proprietário cadastrado.</p>
        )}
      </div>

      {/* Nota sobre Dados Técnicos */}
      <div className="summary-section">
        <h3>📐 Dados Técnicos</h3>
        <div className="technical-note">
          <p>📋 Os dados técnicos (área, perímetro, coordenadas, confrontações) serão extraídos automaticamente dos arquivos DXF/DWG durante a geração do memorial.</p>
          <p>🎯 Esta funcionalidade utiliza o ViewerDXF integrado para análise precisa dos desenhos técnicos.</p>
        </div>
      </div>

      {/* Resumo dos Documentos */}
      {data.documents && data.documents.length > 0 && (
        <div className="summary-section">
          <h3>📄 Documentos ({data.documents.length})</h3>
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
          <h3>🗂️ Arquivos ({data.files.length})</h3>
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
              Cadastrando Propriedade...
            </>
          ) : (
            <>
              <span>✅</span>
              Finalizar Cadastro
            </>
          )}
        </button>

        {!isFormValid() && (
          <p className="submit-warning">
            Corrija os erros acima antes de finalizar o cadastro.
          </p>
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