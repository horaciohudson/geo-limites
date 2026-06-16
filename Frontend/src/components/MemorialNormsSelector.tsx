import React, { useState, useEffect } from 'react';
import { memorialStandardsService } from '@/services/memorial-standards';
import type { MemorialStandard } from '@/types/memorial-standard';

interface MemorialNormsSelectorProps {
  onSelectedNormsChange?: (norms: MemorialStandard[]) => void;
  className?: string;
}

export const MemorialNormsSelector: React.FC<MemorialNormsSelectorProps> = ({
  onSelectedNormsChange,
  className = ''
}) => {
  const [selectedNorms, setSelectedNorms] = useState<MemorialStandard[]>([]);
  const [currentSelection, setCurrentSelection] = useState<string>('');
  const [availableNorms, setAvailableNorms] = useState<MemorialStandard[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega normas do backend
  useEffect(() => {
    const loadNorms = async () => {
      try {
        setLoading(true);
        const norms = await memorialStandardsService.getAll();
        setAvailableNorms(norms);
      } catch (error) {
        console.error('❌ Erro ao carregar normas:', error);
        // Fallback para normas hardcoded se necessário
        setAvailableNorms([]);
      } finally {
        setLoading(false);
      }
    };

    loadNorms();
  }, []);

  // Notifica mudanças nas normas selecionadas
  useEffect(() => {
    onSelectedNormsChange?.(selectedNorms);
    
    // Salva no localStorage para validação no Sidebar
    try {
      localStorage.setItem('selectedMemorialNorms', JSON.stringify(selectedNorms));
    } catch (error) {
      console.error('❌ Erro ao salvar normas no localStorage:', error);
    }
  }, [selectedNorms, onSelectedNormsChange]);

  // Adiciona norma ao segundo combobox quando pressiona Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentSelection) {
      e.preventDefault();
      
      const normToAdd = availableNorms.find(norm => norm.id === currentSelection);
      if (normToAdd && !selectedNorms.find(norm => norm.id === currentSelection)) {
        setSelectedNorms(prev => [...prev, normToAdd]);
      }
    }
  };

  // Remove norma do segundo combobox
  const removeNorm = (normId: string) => {
    setSelectedNorms(prev => prev.filter(norm => norm.id !== normId));
  };

  return (
    <div className={`memorial-norms-selector ${className}`}>
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="abnt-norms-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Selecionar Normas ABNT
        </label>
        {loading ? (
          <div style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', color: '#666' }}>
            Carregando normas...
          </div>
        ) : (
          <select
            id="abnt-norms-select"
            value={currentSelection}
            onChange={(e) => setCurrentSelection(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="">Selecione uma norma ABNT...</option>
            {availableNorms.map(norm => (
              <option key={norm.id} value={norm.id}>
                {norm.name}
              </option>
            ))}
          </select>
        )}
        <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
          💡 Selecione uma norma e pressione <strong>Enter</strong> para adicionar à base do memorial
        </small>
      </div>

      <div>
        <label htmlFor="selected-norms" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          🎯 Normas Base para o Memorial ({selectedNorms.length})
        </label>
        
        {selectedNorms.length === 0 ? (
          <div style={{
            padding: '12px',
            border: '1px dashed #ccc',
            borderRadius: '4px',
            textAlign: 'center',
            color: '#666',
            fontSize: '14px'
          }}>
            Nenhuma norma selecionada. Use o combobox acima para adicionar normas.
          </div>
        ) : (
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            maxHeight: '150px',
            overflowY: 'auto',
            backgroundColor: 'white'
          }}>
            {selectedNorms.map(norm => (
              <div
                key={norm.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderBottom: '1px solid #eee',
                  fontSize: '14px'
                }}
              >
                <span>{norm.name}</span>
                <button
                  onClick={() => removeNorm(norm.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc3545',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '0 4px'
                  }}
                  title="Remover norma"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        
        {selectedNorms.length > 0 && (
          <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
            ✅ Estas normas serão usadas como base para gerar o memorial descritivo
          </small>
        )}
      </div>
    </div>
  );
};

export default MemorialNormsSelector;
