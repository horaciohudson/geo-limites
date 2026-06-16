import React from 'react';
import type { PropertyOwner } from '@/types/property';

type PropertyOwnerDraft = Omit<PropertyOwner, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>;

interface PropertyOwnersProps {
  owners: PropertyOwnerDraft[];
  validation: Record<string, string>;
  onChange: (owners: PropertyOwnerDraft[]) => void;
}

const PropertyOwners: React.FC<PropertyOwnersProps> = ({ owners, validation, onChange }) => {
  // Garantir que temos pelo menos um proprietário no array
  const owner = owners[0] || {
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
  };

  const handleChange = (field: keyof PropertyOwnerDraft, value: any) => {
    const updatedOwner = {
      ...owner,
      [field]: value
    };
    onChange([updatedOwner]);
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  return (
    <div className="property-owners">
      <div className="section-header">
        <h2>👥 Proprietario do Imovel</h2>
        <p className="section-description">
          Defina aqui quem e o proprietario do imovel para deixar a base juridica pronta antes da operacao.
        </p>
      </div>

      {validation.general && (
        <div className="error-message" style={{ marginBottom: '1.5rem', fontSize: '0.9rem', padding: '0.5rem', background: '#fee2e2', borderRadius: '4px' }}>
          {validation.general}
        </div>
      )}

      <div className="form-section">
        <div className="form-grid">
          {/* Tipo de Pessoa */}
          <div className="form-group">
            <label htmlFor="ownerType">Tipo de Pessoa *</label>
            <select
              id="ownerType"
              value={owner.ownerType}
              onChange={(e) => {
                const type = e.target.value as 'INDIVIDUAL' | 'COMPANY';
                // Preserva e limpa de acordo com a mudança
                onChange([{
                  ...owner,
                  ownerType: type,
                  // Resetando campos específicos ao mudar de tipo
                  fullName: '',
                  cpf: '',
                  rg: '',
                  companyName: '',
                  cnpj: '',
                  stateRegistration: ''
                }]);
              }}
            >
              <option value="INDIVIDUAL">👤 Pessoa Física</option>
              <option value="COMPANY">🏢 Pessoa Jurídica</option>
            </select>
          </div>
        </div>

        {/* Campos para Pessoa Física */}
        {owner.ownerType === 'INDIVIDUAL' && (
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="fullName">Nome Completo *</label>
              <input
                type="text"
                id="fullName"
                value={owner.fullName || ''}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Ex: João da Silva Santos"
                className={validation.fullName ? 'error' : ''}
              />
              {validation.fullName && (
                <span className="error-message">{validation.fullName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="cpf">CPF *</label>
              <input
                type="text"
                id="cpf"
                value={owner.cpf || ''}
                onChange={(e) => handleChange('cpf', formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                className={validation.cpf ? 'error' : ''}
              />
              {validation.cpf && (
                <span className="error-message">{validation.cpf}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="rg">RG (Documento de Identidade)</label>
              <input
                type="text"
                id="rg"
                value={owner.rg || ''}
                onChange={(e) => handleChange('rg', e.target.value)}
                placeholder="Ex: 12.345.678-9"
              />
            </div>
          </div>
        )}

        {/* Campos para Pessoa Jurídica */}
        {owner.ownerType === 'COMPANY' && (
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="companyName">Razão Social *</label>
              <input
                type="text"
                id="companyName"
                value={owner.companyName || ''}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="Ex: Agropecuária Vale Verde LTDA"
                className={validation.companyName ? 'error' : ''}
              />
              {validation.companyName && (
                <span className="error-message">{validation.companyName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="cnpj">CNPJ *</label>
              <input
                type="text"
                id="cnpj"
                value={owner.cnpj || ''}
                onChange={(e) => handleChange('cnpj', formatCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                className={validation.cnpj ? 'error' : ''}
              />
              {validation.cnpj && (
                <span className="error-message">{validation.cnpj}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="stateRegistration">Inscrição Estadual</label>
              <input
                type="text"
                id="stateRegistration"
                value={owner.stateRegistration || ''}
                onChange={(e) => handleChange('stateRegistration', e.target.value)}
                placeholder="Ex: 123.456.789.012"
              />
            </div>
          </div>
        )}
      </div>

      <div className="form-section">
        <h3>📞 Informações de Contato</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="ownerEmail">E-mail</label>
            <input
              type="email"
              id="ownerEmail"
              value={owner.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Ex: contato@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ownerPhone">Telefone</label>
            <input
              type="tel"
              id="ownerPhone"
              value={owner.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Ex: (11) 99999-9999"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>⚖️ Tipo de Posse / Propriedade</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="ownershipType">Regime de Titularidade</label>
            <select
              id="ownershipType"
              value={owner.ownershipType}
              onChange={(e) => handleChange('ownershipType', e.target.value)}
            >
              <option value="FULL">🏠 Propriedade Plena (100%)</option>
              <option value="USUFRUCT">🔄 Usufruto</option>
              <option value="LEASE">📋 Arrendamento / Concessão</option>
              <option value="PARTIAL">📊 Posse / Outro</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyOwners;
