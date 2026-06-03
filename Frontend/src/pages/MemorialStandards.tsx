import React, { useState, useEffect } from 'react';
import { memorialStandardsService } from '../services/memorial-standards';
import type { MemorialStandard } from '../types/memorial-standard';
import Loading from '../components/Loading';

interface StoredTemplateData {
  template_id: string;
  descricao?: string;
  estrutura?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SelectedNormReference {
  id: string;
}

const parseStoredTemplates = (rawValue: string | null): StoredTemplateData[] => {
  if (!rawValue) {
    return [];
  }

  return JSON.parse(rawValue) as StoredTemplateData[];
};

const parseSelectedNorms = (rawValue: string | null): SelectedNormReference[] => {
  if (!rawValue) {
    return [];
  }

  return JSON.parse(rawValue) as SelectedNormReference[];
};

const MemorialStandards: React.FC = () => {
  const [standards, setStandards] = useState<MemorialStandard[]>([]);
  const [templates, setTemplates] = useState<StoredTemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);


  // Função para carregar dados
  const loadData = async () => {
    try {
      setLoading(true);
      const normsData = await memorialStandardsService.getAll();
      setStandards(normsData);
      const templatesRaw = localStorage.getItem('createdTemplates');
      
      let templatesData = parseStoredTemplates(templatesRaw);
      
      // VERIFICAÇÃO DE INTEGRIDADE
      if (templatesData.length === 0) {
        // Tentar recuperar de backup
        try {
          const allKeys = Object.keys(localStorage);
          const backupKeys = allKeys.filter(key => key.startsWith('createdTemplates_backup_'))
            .sort().reverse(); // Mais recente primeiro
          
          if (backupKeys.length > 0) {
            const latestBackup = backupKeys[0];
            const backupData = parseStoredTemplates(localStorage.getItem(latestBackup));
            
            if (backupData.length > 0) {
              localStorage.setItem('createdTemplates', JSON.stringify(backupData));
              templatesData = backupData;
            }
          }
        } catch (error) {
          console.error('❌ Erro ao recuperar backup:', error);
        }
      }
      
      // Verificar se há um template selecionado que não está na lista
      const selectedTemplateRaw = localStorage.getItem('selectedTemplate');
      
      if (selectedTemplateRaw) {
        try {
          const selectedTemplateData = JSON.parse(selectedTemplateRaw) as StoredTemplateData;
          
          // Verificar se o template selecionado já está na lista de templates criados
          const existsInCreated = templatesData.find((t) => t.template_id === selectedTemplateData.template_id);
          
          if (!existsInCreated && selectedTemplateData.template_id) {
            templatesData.push(selectedTemplateData);
            
            // Salvar na chave createdTemplates para futuras sessões
            localStorage.setItem('createdTemplates', JSON.stringify(templatesData));
          }
        } catch (error) {
          console.error('❌ Erro ao processar template selecionado:', error);
        }
      }
      
      setTemplates(templatesData);
      
      let savedNorms: SelectedNormReference[] = [];
      let savedTemplate: StoredTemplateData | null = null;
      
      // Parse savedNorms com tratamento de erro
      try {
        const savedNormsRaw = localStorage.getItem('selectedMemorialNorms');
        if (savedNormsRaw) {
          savedNorms = parseSelectedNorms(savedNormsRaw);
        }
      } catch (error) {
        console.error('❌ Erro ao parsear selectedMemorialNorms:', error);
        localStorage.removeItem('selectedMemorialNorms');
        savedNorms = [];
      }
      
      // Parse savedTemplate com tratamento de erro
      try {
        const savedTemplateRaw = localStorage.getItem('selectedTemplate');
        if (savedTemplateRaw) {
          savedTemplate = JSON.parse(savedTemplateRaw) as StoredTemplateData;
        }
      } catch (error) {
        console.error('❌ Erro ao parsear selectedTemplate:', error);
        localStorage.removeItem('selectedTemplate');
        savedTemplate = null;
      }
      
      // Restaurar seleções
      if (savedNorms.length > 0) {
        const savedNormIds = savedNorms.map((norm) => norm.id);
        setSelectedStandards(savedNormIds);
      }
      
      if (savedTemplate && savedTemplate.template_id) {
        setSelectedTemplate(savedTemplate.template_id);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setStandards([]);
      setTemplates([]);
      alert('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };



  // Carregamento automático na inicialização
  useEffect(() => {
    loadData();
  }, []);





  const handleApplySelection = () => {
    const selectedNorms = standards.filter(s => selectedStandards.includes(s.id));
    const selectedTemplateData = templates.find(t => t.template_id === selectedTemplate);

    // Salvar seleção no localStorage
    localStorage.setItem('selectedMemorialNorms', JSON.stringify(selectedNorms));
    if (selectedTemplateData) {
      localStorage.setItem('selectedTemplate', JSON.stringify(selectedTemplateData));
    } else {
      localStorage.removeItem('selectedTemplate');
    }
    
    alert(`✅ Seleção aplicada e salva!\n\n📋 Normas: ${selectedNorms.length}\n📄 Template: ${selectedTemplateData ? selectedTemplateData.template_id : 'Nenhum'}\n\n💡 Suas seleções foram salvas e serão restauradas na próxima vez.`);
  };

  const handleClearSelection = () => {
    setSelectedStandards([]);
    setSelectedTemplate(null);
    localStorage.removeItem('selectedMemorialNorms');
    localStorage.removeItem('selectedTemplate');
    alert('🗑️ Todas as seleções foram limpas!');
  };





  if (loading) {
    return <Loading />;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#2c3e50', fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          Normas e Templates
        </h1>
        
        {/* Linha de Seleção */}
        <div style={{ 
          display: 'flex', 
          gap: '1.5rem', 
          alignItems: 'center', 
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}>
          {/* Combobox para selecionar norma */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: '500', color: '#2c3e50', whiteSpace: 'nowrap' }}>
              📋 Selecionar Norma:
            </label>
            <select
              value={selectedStandards[0] || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (selectedId) {
                  setSelectedStandards([selectedId]);
                } else {
                  setSelectedStandards([]);
                }
              }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '1rem',
                minWidth: '280px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">Nenhuma norma selecionada</option>
              {standards.map((standard) => (
                <option key={standard.id} value={standard.id}>
                  {standard.name}
                  {standard.isDefault ? ' (Padrão)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Combobox para selecionar template */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: '500', color: '#2c3e50', whiteSpace: 'nowrap' }}>
              📄 Selecionar Template:
            </label>
            <select
              value={selectedTemplate || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                setSelectedTemplate(selectedId || null);
              }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '1rem',
                minWidth: '280px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">Nenhum template selecionado</option>
              {templates.map((template) => (
                <option key={template.template_id} value={template.template_id}>
                  {template.template_id}
                  {template.descricao ? ` - ${template.descricao.substring(0, 40)}${template.descricao.length > 40 ? '...' : ''}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha de Botões */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleClearSelection}
            disabled={selectedStandards.length === 0 && !selectedTemplate}
            style={{ 
              backgroundColor: '#e74c3c',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: selectedStandards.length === 0 && !selectedTemplate ? 0.5 : 1
            }}
          >
            🗑️ Limpar Seleção
          </button>
          
          <button
            onClick={() => window.location.href = '/manage-standards'}
            style={{ 
              backgroundColor: '#3498db',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            ⚙️ Gerenciar Normas
          </button>
          
          <button
            onClick={handleApplySelection}
            disabled={selectedStandards.length === 0 && !selectedTemplate}
            style={{ 
              backgroundColor: selectedStandards.length > 0 || selectedTemplate ? '#27ae60' : '#95a5a6',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              cursor: selectedStandards.length > 0 || selectedTemplate ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            ✅ Aplicar Seleção
          </button>
        </div>
      </div>

      {/* Seção de Norma ABNT Selecionada */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        border: '1px solid #e9ecef'
      }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          📋 Norma ABNT Selecionada
        </h2>
        
        <div style={{ 
          backgroundColor: '#e8f4fd', 
          border: '1px solid #bee5eb', 
          borderRadius: '8px', 
          padding: '1rem', 
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          <strong>💡 Instruções:</strong> Selecione a norma ABNT no combobox acima. Para criar novas normas, vá em "⚙️ Gerenciar Normas".
        </div>

        {standards.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e9ecef' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              📋 Nenhuma norma cadastrada ainda.
            </p>
            <p>Vá para <strong>"⚙️ Gerenciar Normas"</strong> para cadastrar sua primeira norma.</p>
          </div>
        ) : selectedStandards.length > 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '2px solid #27ae60', padding: '1.5rem' }}>
            {standards.filter(s => selectedStandards.includes(s.id)).map((standard) => (
              <div key={standard.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: '#2c3e50', margin: 0, fontSize: '1.1rem' }}>
                    ✅ {standard.name}
                  </h4>
                  {standard.isDefault && (
                    <span style={{
                      backgroundColor: '#3498db',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      PADRÃO
                    </span>
                  )}
                </div>
                
                {standard.description && (
                  <p style={{ color: '#6c757d', margin: '0.5rem 0', fontSize: '0.9rem' }}>
                    {standard.description}
                  </p>
                )}
                
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.5rem' }}>
                  <span>📅 Criado em: {new Date(standard.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e9ecef' }}>
            <p style={{ fontSize: '1rem' }}>
              👆 Selecione uma norma no combobox acima
            </p>
          </div>
        )}
      </div>

      {/* Seção de Template Selecionado */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e9ecef'
        }}>
          <h3 style={{ color: '#2c3e50', margin: 0, fontSize: '1.25rem' }}>
            📄 Template Selecionado
          </h3>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ 
            backgroundColor: '#e8f4fd', 
            border: '1px solid #bee5eb', 
            borderRadius: '8px', 
            padding: '1rem', 
            marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}>
            <strong>💡 Instruções:</strong> Selecione um template no combobox acima. Para criar novos templates, vá em "⚙️ Gerenciar Normas".
          </div>

          {templates.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                📄 Nenhum template cadastrado ainda.
              </p>
              <p>Vá para <strong>"⚙️ Gerenciar Normas"</strong> para cadastrar seu primeiro template.</p>
            </div>
          ) : selectedTemplate ? (
            (() => {
              const template = templates.find(t => t.template_id === selectedTemplate);
              return template ? (
                <div style={{ 
                  backgroundColor: '#f0f8ff', 
                  borderRadius: '8px', 
                  border: '2px solid #3498db', 
                  padding: '1.5rem' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ color: '#2c3e50', margin: 0, fontSize: '1.1rem' }}>
                      ✅ {template.template_id}
                    </h4>
                    <span style={{
                      backgroundColor: '#3498db',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      SELECIONADO
                    </span>
                  </div>
                  
                  {template.descricao && (
                    <p style={{ color: '#6c757d', margin: '0.5rem 0', fontSize: '0.9rem' }}>
                      {template.descricao}
                    </p>
                  )}
                  
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.5rem' }}>
                    <span>Seções: {template.estrutura ? Object.keys(template.estrutura).length : 0}</span>
                    <span style={{ margin: '0 0.5rem' }}>•</span>
                    <span>Template ID: {template.template_id}</span>
                  </div>
                </div>
              ) : null;
            })()
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <p style={{ fontSize: '1rem' }}>
                👆 Selecione um template no combobox acima
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemorialStandards;
