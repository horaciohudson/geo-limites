import React, { useState, useEffect } from 'react';
import type { TemplateOption } from '@/types';

// Dados dos templates inline para evitar problemas de importação
const templateIndex = [
  {
    id: "memorial_descritivo",
    name: "Memorial Descritivo (UI)",
    file: "memorial_descritivo.json"
  },
  
  {
    id: "relatorio_geometrico", 
    name: "Relatório Geométrico (UI)",
    file: "relatorio_geometrico.json"
  },
  
  {
    id: "cadastro_terreno",
    name: "Cadastro de Terreno (UI)", 
    file: "cadastro_terreno.json"
  },
  
  {
    id: "desmembramento_terreno",
    name: "Desmembramento de Terreno", 
    file: "memorial_desmembramento.json"
  },

  // Templates normativos tecnicos para o fluxo documental
  {
    id: "memorial_descritivo_normativo",
    name: "Memorial Descritivo (Normativo ABNT)",
    file: "memorial_descritivo_normativo.json"
  },
  
  {
    id: "relatorio_geometrico_normativo", 
    name: "Relatório Geométrico (Normativo ABNT)",
    file: "relatorio_geometrico_normativo.json"
  },
  
  {
    id: "cadastro_terreno_normativo",
    name: "Cadastro de Terreno (Normativo ABNT)", 
    file: "cadastro_terreno_normativo.json"
  }

];

// Tipos para os templates
interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea';
}

interface Template {
  title: string;
  fields: TemplateField[];
}

interface LoadedTemplate extends Template {
  originalData?: unknown;
}

interface TemplateSelectorProps {
  onTemplateSelect?: (templateId: string, template: LoadedTemplate) => void;
  className?: string;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onTemplateSelect,
  className = ''
}) => {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [currentTemplate, setCurrentTemplate] = useState<LoadedTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega o índice de templates
  useEffect(() => {
    loadTemplateIndex();
  }, []);

  const loadTemplateIndex = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Usa o índice importado estaticamente
      setTemplates(templateIndex);
    } catch (err) {
      console.error('Erro ao carregar índice de templates:', err);
      setError('Erro ao carregar templates disponíveis');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (templateFile: string, templateId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Usa fetch para carregar o template
      const response = await fetch(`/src/data/templates/${templateFile}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const template = await response.json() as Partial<LoadedTemplate>;
      
      if (!template) {
        throw new Error(`Template ${templateFile} não foi encontrado`);
      }
      
      // Para templates que nao seguem o padrao title/fields (como memorial_desmembramento.json)
      // vamos trata-los de forma especial
      if (templateFile === 'memorial_desmembramento.json' || 
          templateFile === 'memorial_descritivo_normativo.json' ||
          templateFile === 'relatorio_geometrico_normativo.json' ||
          templateFile === 'cadastro_terreno_normativo.json') {
        // Estes templates tem estrutura normativa especifica, vamos criar um wrapper
        const templateName = templateFile.replace('.json', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const wrappedTemplate: LoadedTemplate = {
          title: templateName,
          fields: [], // Campos vazios pois serao preenchidos pelo fluxo documental
          originalData: template // Dados originais para processamento normativo
        };
        setCurrentTemplate(wrappedTemplate);
        onTemplateSelect?.(templateId, wrappedTemplate);
      } else {
        // Templates normais com title e fields
        if (!template.title || !template.fields) {
          throw new Error(`Template ${templateFile} não possui estrutura válida (title e fields são obrigatórios)`);
        }
        const normalizedTemplate: LoadedTemplate = {
          title: template.title,
          fields: template.fields,
          originalData: template.originalData
        };
        setCurrentTemplate(normalizedTemplate);
        onTemplateSelect?.(templateId, normalizedTemplate);
      }
    } catch (err) {
      console.error('❌ Erro ao carregar template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar template';
      setError(`Erro ao carregar template selecionado: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    setCurrentTemplate(null);
    
    // Salva no localStorage para validação no Sidebar
    try {
      if (templateId) {
        localStorage.setItem('selectedTemplate', templateId);
      } else {
        localStorage.removeItem('selectedTemplate');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar template no localStorage:', error);
    }
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template?.file) {
        loadTemplate(template.file, templateId);
      }
    }
  };

  return (
    <div className={`template-selector ${className}`}>
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="template-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          📄 Selecionar Template
        </label>
        <select
          id="template-select"
          value={selectedTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: loading ? '#f5f5f5' : 'white'
          }}
        >
          <option value="">Selecione um template...</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        
        {loading && (
          <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
            ⏳ Carregando template...
          </small>
        )}
        
        {error && (
          <small style={{ color: '#dc3545', fontSize: '12px', display: 'block', marginTop: '4px' }}>
            ❌ {error}
          </small>
        )}
      </div>

      {currentTemplate && (
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: '#f8f9fa'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#495057' }}>
            📋 {currentTemplate.title}
          </h4>
          
          <div style={{ marginBottom: '12px' }}>
            <strong>Campos disponíveis:</strong>
          </div>
          
          <div style={{ display: 'grid', gap: '8px' }}>
            {currentTemplate.fields.map((field) => (
              <div
                key={field.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: 'white',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <span style={{ fontWeight: '500' }}>{field.label}</span>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#6c757d',
                  backgroundColor: '#e9ecef',
                  padding: '2px 6px',
                  borderRadius: '3px'
                }}>
                  {field.type}
                </span>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
            💡 Este template contém {currentTemplate.fields.length} campos para preenchimento
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
