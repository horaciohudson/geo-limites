import React, { useState } from 'react';
import type { PropertyOwner } from '@/types/property';

type PropertyOwnerDraft = Omit<PropertyOwner, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>;

interface PropertyOwnersProps {
  owners: PropertyOwnerDraft[];
  validation: Record<string, string>;
  onChange: (owners: PropertyOwnerDraft[]) => void;
}

const PropertyOwners: React.FC<PropertyOwnersProps> = ({ owners, validation, onChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [newOwner, setNewOwner] = useState<PropertyOwnerDraft>({
    ownerType: 'INDIVIDUAL',
    ownershipPercentage: 0,
    ownershipType: 'FULL',
    active: true,
    fullName: '',
    cpf: '',
    companyName: '',
    cnpj: ''
  });

  const resetNewOwner = () => {
    setNewOwner({
      ownerType: 'INDIVIDUAL',
      ownershipPercentage: 0,
      ownershipType: 'FULL',
      active: true,
      fullName: '',
      cpf: '',
      companyName: '',
      cnpj: ''
    });
  };

  const isOwnerPlaceholder = (owner: PropertyOwnerDraft) => {
    const textFields = [
      owner.fullName,
      owner.cpf,
      owner.companyName,
      owner.cnpj,
      owner.email,
      owner.phone,
      owner.rg,
      owner.stateRegistration
    ];

    return textFields.every((value) => !value || value.trim() === '');
  };

  const visibleOwners = owners
    .map((owner, index) => ({ owner, index }))
    .filter(({ owner }) => !isOwnerPlaceholder(owner));

  const addOwner = (ownerToAdd: typeof newOwner) => {
    if (validateOwner(ownerToAdd)) {
      const newOwners =
        owners.length === 1 && isOwnerPlaceholder(owners[0])
          ? [ownerToAdd]
          : [...owners, ownerToAdd];
      onChange(newOwners);
      resetNewOwner();
      setShowAddForm(false);
    }
  };

  const updateOwner = (index: number, updatedOwner: typeof newOwner) => {
    if (validateOwner(updatedOwner)) {
      const updatedOwners = [...owners];
      updatedOwners[index] = updatedOwner;
      onChange(updatedOwners);
      setEditingIndex(null);
    }
  };

  const removeOwner = (index: number) => {
    const updatedOwners = owners.filter((_, i) => i !== index);
    onChange(updatedOwners);
  };

  const validateOwner = (owner: typeof newOwner): boolean => {
    if (owner.ownerType === 'INDIVIDUAL') {
      if (!owner.fullName || owner.fullName.trim() === '' || !owner.cpf || owner.cpf.trim() === '') {
        alert('Nome completo e CPF são obrigatórios para pessoa física.');
        return false;
      }
    } else {
      if (!owner.companyName || owner.companyName.trim() === '' || !owner.cnpj || owner.cnpj.trim() === '') {
        alert('Razão social e CNPJ são obrigatórios para pessoa jurídica.');
        return false;
      }
    }
    
    if (owner.ownershipPercentage <= 0 || owner.ownershipPercentage > 100) {
      alert('Percentual de participação deve ser entre 1% e 100%.');
      return false;
    }
    
    return true;
  };

  const getTotalPercentage = () => {
    return visibleOwners.reduce((sum, { owner }) => sum + owner.ownershipPercentage, 0);
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

  const OwnerForm = ({ 
    owner, 
    onSave, 
    onCancel, 
    isEditing = false 
  }: { 
    owner: typeof newOwner;
    onSave: (owner: typeof newOwner) => void;
    onCancel: () => void;
    isEditing?: boolean;
  }) => {
    const [formOwner, setFormOwner] = useState(owner);

    const handleChange = <K extends keyof PropertyOwnerDraft>(field: K, value: PropertyOwnerDraft[K]) => {
      setFormOwner(prev => ({ ...prev, [field]: value }));
    };

    return (
      <div className="owner-form">
        <div className="form-header">
          <h4>{isEditing ? '✏️ Editar Proprietário' : '➕ Adicionar Proprietário'}</h4>
        </div>

        <div className="form-grid">
          {/* Tipo de Pessoa */}
          <div className="form-group">
            <label>Tipo de Pessoa *</label>
            <select
              value={formOwner.ownerType}
              onChange={(e) => handleChange('ownerType', e.target.value as PropertyOwnerDraft['ownerType'])}
            >
              <option value="INDIVIDUAL">👤 Pessoa Física</option>
              <option value="COMPANY">🏢 Pessoa Jurídica</option>
            </select>
          </div>

          {/* Campos para Pessoa Física */}
          {formOwner.ownerType === 'INDIVIDUAL' && (
            <>
              <div className="form-group full-width">
                <label>Nome Completo *</label>
                <input
                  type="text"
                  value={formOwner.fullName || ''}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="João da Silva Santos"
                />
              </div>

              <div className="form-group">
                <label>CPF *</label>
                <input
                  type="text"
                  value={formOwner.cpf || ''}
                  onChange={(e) => handleChange('cpf', formatCPF(e.target.value))}
                  placeholder="123.456.789-00"
                  maxLength={14}
                />
              </div>

              <div className="form-group">
                <label>RG</label>
                <input
                  type="text"
                  value={formOwner.rg || ''}
                  onChange={(e) => handleChange('rg', e.target.value)}
                  placeholder="12.345.678-9"
                />
              </div>
            </>
          )}

          {/* Campos para Pessoa Jurídica */}
          {formOwner.ownerType === 'COMPANY' && (
            <>
              <div className="form-group full-width">
                <label>Razão Social *</label>
                <input
                  type="text"
                  value={formOwner.companyName || ''}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Empresa LTDA"
                />
              </div>

              <div className="form-group">
                <label>CNPJ *</label>
                <input
                  type="text"
                  value={formOwner.cnpj || ''}
                  onChange={(e) => handleChange('cnpj', formatCNPJ(e.target.value))}
                  placeholder="12.345.678/0001-90"
                  maxLength={18}
                />
              </div>

              <div className="form-group">
                <label>Inscrição Estadual</label>
                <input
                  type="text"
                  value={formOwner.stateRegistration || ''}
                  onChange={(e) => handleChange('stateRegistration', e.target.value)}
                  placeholder="123.456.789.012"
                />
              </div>
            </>
          )}

          {/* Dados de Contato */}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formOwner.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="contato@email.com"
            />
          </div>

          <div className="form-group">
            <label>Telefone</label>
            <input
              type="tel"
              value={formOwner.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* Participação */}
          <div className="form-group">
            <label>Participação (%) *</label>
            <input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={formOwner.ownershipPercentage}
              onChange={(e) => handleChange('ownershipPercentage', parseFloat(e.target.value) || 0)}
              placeholder="50.00"
            />
          </div>

          <div className="form-group">
            <label>Tipo de Propriedade</label>
            <select
              value={formOwner.ownershipType}
              onChange={(e) => handleChange('ownershipType', e.target.value as PropertyOwnerDraft['ownershipType'])}
            >
              <option value="FULL">🏠 Propriedade Plena</option>
              <option value="PARTIAL">📊 Propriedade Parcial</option>
              <option value="USUFRUCT">🔄 Usufruto</option>
              <option value="LEASE">📋 Arrendamento</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancelar
          </button>
          <button type="button" onClick={() => onSave(formOwner)} className="btn-save">
            {isEditing ? 'Atualizar' : 'Adicionar'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="property-owners">
      <div className="section-header">
        <h2>👥 Proprietários da Propriedade</h2>
        <div className="ownership-summary">
          <span className={`total-percentage ${getTotalPercentage() === 100 ? 'complete' : 'incomplete'}`}>
            Total: {getTotalPercentage().toFixed(2)}% 
            {getTotalPercentage() === 100 ? '✅' : '⚠️'}
          </span>
        </div>
      </div>

      {validation.general && (
        <div className="error-message">{validation.general}</div>
      )}
      {validation.percentage && (
        <div className="error-message">{validation.percentage}</div>
      )}

      {/* Lista de Proprietários */}
      <div className="owners-list">
        {visibleOwners.length === 0 && (
          <div className="owner-card" style={{ borderStyle: 'dashed', background: '#f8fafc' }}>
            <div className="owner-info">
              <div className="owner-header">
                <h4>👥 Nenhum proprietário informado ainda</h4>
              </div>
              <div className="owner-details">
                <p>Use o botão "Adicionar Proprietário" para preencher essa etapa quando chegar o momento.</p>
              </div>
            </div>
          </div>
        )}

        {visibleOwners.map(({ owner, index }) => {
          // Verificar se o proprietário tem dados válidos
          const isValidOwner = owner.ownerType === 'INDIVIDUAL' 
            ? (owner.fullName && owner.cpf && owner.ownershipPercentage > 0)
            : (owner.companyName && owner.cnpj && owner.ownershipPercentage > 0);
          
          return (
            <div key={index} className={`owner-card ${!isValidOwner ? 'invalid' : ''}`}>
              {editingIndex === index ? (
              <OwnerForm
                owner={owner}
                onSave={(updatedOwner) => updateOwner(index, updatedOwner)}
                onCancel={() => setEditingIndex(null)}
                isEditing={true}
              />
            ) : (
              <>
                <div className="owner-info">
                  <div className="owner-header">
                    <h4>
                      {owner.ownerType === 'INDIVIDUAL' ? '👤' : '🏢'} 
                      {owner.ownerType === 'INDIVIDUAL' ? owner.fullName : owner.companyName}
                    </h4>
                    <span className="ownership-percentage">
                      {owner.ownershipPercentage}%
                    </span>
                  </div>
                  
                  <div className="owner-details">
                    <p>
                      <strong>Documento:</strong> 
                      {owner.ownerType === 'INDIVIDUAL' ? owner.cpf : owner.cnpj}
                    </p>
                    {owner.email && <p><strong>Email:</strong> {owner.email}</p>}
                    {owner.phone && <p><strong>Telefone:</strong> {owner.phone}</p>}
                    <p>
                      <strong>Tipo:</strong> 
                      {{
                        'FULL': '🏠 Propriedade Plena',
                        'PARTIAL': '📊 Propriedade Parcial',
                        'USUFRUCT': '🔄 Usufruto',
                        'LEASE': '📋 Arrendamento'
                      }[owner.ownershipType]}
                    </p>
                  </div>
                </div>
                
                <div className="owner-actions">
                  <button 
                    onClick={() => setEditingIndex(index)}
                    className="btn-edit"
                  >
                    ✏️ Editar
                  </button>
                  <button 
                    onClick={() => removeOwner(index)}
                    className="btn-remove"
                  >
                    🗑️ Remover
                  </button>
                </div>
              </>
            )}
            </div>
          );
        })}
      </div>

      {/* Formulário de Adição */}
      {showAddForm ? (
        <OwnerForm
          owner={newOwner}
          onSave={(ownerData) => addOwner(ownerData)}
          onCancel={() => {
            setShowAddForm(false);
            resetNewOwner();
          }}
        />
      ) : (
        <button 
          onClick={() => setShowAddForm(true)}
          className="btn-add-owner"
        >
          ➕ Adicionar Proprietário
        </button>
      )}

      {visibleOwners.length > 0 && (
        <div className="owners-summary">
          <h4>📊 Resumo da Propriedade</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">Total de Proprietários:</span>
              <span className="value">{visibleOwners.length}</span>
            </div>
            <div className="summary-item">
              <span className="label">Participação Total:</span>
              <span className={`value ${getTotalPercentage() === 100 ? 'complete' : 'incomplete'}`}>
                {getTotalPercentage().toFixed(2)}%
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Pessoas Físicas:</span>
              <span className="value">
                {visibleOwners.filter(({ owner }) => owner.ownerType === 'INDIVIDUAL').length}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Pessoas Jurídicas:</span>
              <span className="value">
                {visibleOwners.filter(({ owner }) => owner.ownerType === 'COMPANY').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyOwners;
