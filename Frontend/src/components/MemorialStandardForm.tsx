import React, { useState, useEffect } from 'react';
import type { MemorialStandard, MemorialStandardFormData } from '../types/index';
import { Button } from './Button';
import { Input } from './Input';

interface MemorialStandardFormProps {
  standard?: MemorialStandard;
  onSubmit: (data: MemorialStandardFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const MemorialStandardForm: React.FC<MemorialStandardFormProps> = ({
  standard,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<MemorialStandardFormData>({
    name: '',
    description: '',
    standardText: '',
    promptTemplate: '',
    isDefault: false
  });

  useEffect(() => {
    if (standard) {
      setFormData({
        name: standard.name,
        description: standard.description,
        standardText: standard.standardText,
        promptTemplate: standard.promptTemplate,
        isDefault: standard.isDefault
      });
    }
  }, [standard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (field: keyof MemorialStandardFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="memorial-standard-form">
      <h3>{standard ? 'Editar Norma' : 'Nova Norma'}</h3>
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="name">Nome da Norma *</label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(value) => handleChange('name', value)}
            placeholder="Ex: ABNT NBR 13133"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Descrição</label>
          <Input
            id="description"
            type="text"
            value={formData.description}
            onChange={(value) => handleChange('description', value)}
            placeholder="Breve descrição da norma"
          />
        </div>

        <div className="form-group">
          <label htmlFor="standardText">Texto da Norma *</label>
          <textarea
            id="standardText"
            value={formData.standardText}
            onChange={(e) => handleChange('standardText', e.target.value)}
            placeholder="Cole aqui o texto completo da norma que deve ser seguida..."
            rows={8}
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="promptTemplate">Template do Prompt</label>
          <textarea
            id="promptTemplate"
            value={formData.promptTemplate}
            onChange={(e) => handleChange('promptTemplate', e.target.value)}
            placeholder="Template personalizado para o prompt de geracao assistida (opcional)"
            rows={4}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            Se vazio, será usado o prompt padrão do sistema
          </small>
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => handleChange('isDefault', e.target.checked)}
            />
            Definir como norma padrão
          </label>
        </div>

        <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : (standard ? 'Atualizar' : 'Criar')}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MemorialStandardForm;
