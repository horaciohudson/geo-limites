import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface MemorialSelectionDraft {
  selectedStandards: string[];
  selectedTemplate: string | null;
}

const MEMORIAL_SELECTION_DRAFT_KEY = 'memorialSelectionDraft';

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

const parseSelectionDraft = (rawValue: string | null): MemorialSelectionDraft | null => {
  if (!rawValue) {
    return null;
  }

  return JSON.parse(rawValue) as MemorialSelectionDraft;
};

const MemorialStandards: React.FC = () => {
  const navigate = useNavigate();
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
      let savedDraft: MemorialSelectionDraft | null = null;
      
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

      try {
        const savedDraftRaw = localStorage.getItem(MEMORIAL_SELECTION_DRAFT_KEY);
        if (savedDraftRaw) {
          savedDraft = parseSelectionDraft(savedDraftRaw);
        }
      } catch (error) {
        console.error('❌ Erro ao parsear memorialSelectionDraft:', error);
        localStorage.removeItem(MEMORIAL_SELECTION_DRAFT_KEY);
        savedDraft = null;
      }
      
      // Restaurar seleções
      if (savedNorms.length > 0) {
        const savedNormIds = savedNorms.map((norm) => norm.id);
        setSelectedStandards(savedNormIds);
      } else if (savedDraft?.selectedStandards?.length) {
        setSelectedStandards(savedDraft.selectedStandards);
      }
      
      if (savedTemplate && savedTemplate.template_id) {
        setSelectedTemplate(savedTemplate.template_id);
      } else if (savedDraft?.selectedTemplate) {
        setSelectedTemplate(savedDraft.selectedTemplate);
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

  useEffect(() => {
    localStorage.setItem(
      MEMORIAL_SELECTION_DRAFT_KEY,
      JSON.stringify({
        selectedStandards,
        selectedTemplate
      })
    );
  }, [selectedStandards, selectedTemplate]);





  const hasNormSelected = selectedStandards.length > 0;
  const hasTemplateSelected = Boolean(selectedTemplate);
  const canApplyCurrentSelection = hasNormSelected && hasTemplateSelected;

  const persistSelection = (showSuccessAlert: boolean): boolean => {
    const selectedNorms = standards.filter(s => selectedStandards.includes(s.id));
    const selectedTemplateData = templates.find(t => t.template_id === selectedTemplate);

    if (selectedNorms.length === 0) {
      alert('Escolha a norma deste memorial antes de continuar.');
      return false;
    }

    if (!selectedTemplateData) {
      alert('Escolha o template deste memorial antes de continuar.');
      return false;
    }

    // Salvar seleção no localStorage
    localStorage.setItem('selectedMemorialNorms', JSON.stringify(selectedNorms));
    localStorage.setItem('selectedTemplate', JSON.stringify(selectedTemplateData));
    localStorage.setItem(
      MEMORIAL_SELECTION_DRAFT_KEY,
      JSON.stringify({
        selectedStandards,
        selectedTemplate
      })
    );
    
    if (showSuccessAlert) {
      alert(`✅ Seleção aplicada!\n\n📋 Norma: ${selectedNorms[0]?.id ? selectedNorms[0].name : 'Nenhuma'}\n📄 Template: ${selectedTemplateData.template_id}\n\n💡 Essas escolhas passam a valer para o memorial atual.`);
    }

    return true;
  };

  const handleApplySelection = () => {
    persistSelection(true);
  };



  const handleClearSelection = () => {
    setSelectedStandards([]);
    setSelectedTemplate(null);
    localStorage.removeItem('selectedMemorialNorms');
    localStorage.removeItem('selectedTemplate');
    localStorage.removeItem(MEMORIAL_SELECTION_DRAFT_KEY);
    alert('🗑️ As escolhas do memorial atual foram limpas.');
  };





  if (loading) {
    return <Loading />;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#2c3e50', fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Normas e Template do Memorial
        </h1>
        <p style={{ color: '#5f6b7a', marginBottom: '1.5rem' }}>
          Esta escolha vale para o memorial que esta sendo montado agora e pode mudar no proximo trabalho.
        </p>

        <div style={{
          backgroundColor: '#f8fbff',
          border: '1px solid #d7e8fb',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ color: '#2c3e50', fontSize: '1.05rem', margin: '0 0 0.75rem 0' }}>
            Etapa operacional deste trabalho
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
            <span style={{
              backgroundColor: hasNormSelected ? '#eafaf1' : '#fff6e5',
              color: hasNormSelected ? '#1e8449' : '#b9770e',
              border: `1px solid ${hasNormSelected ? '#b9e5c9' : '#f6d98b'}`,
              borderRadius: '999px',
              padding: '0.35rem 0.7rem',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {hasNormSelected ? 'OK Norma escolhida' : 'Pendente norma'}
            </span>
            <span style={{
              backgroundColor: hasTemplateSelected ? '#eafaf1' : '#fff6e5',
              color: hasTemplateSelected ? '#1e8449' : '#b9770e',
              border: `1px solid ${hasTemplateSelected ? '#b9e5c9' : '#f6d98b'}`,
              borderRadius: '999px',
              padding: '0.35rem 0.7rem',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {hasTemplateSelected ? 'OK Template escolhido' : 'Pendente template'}
            </span>
          </div>
          <p style={{ color: '#5f6b7a', margin: 0, fontSize: '0.92rem' }}>
            Escolha os dois itens abaixo e aplique a selecao.
          </p>
        </div>
        
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
              📋 Norma deste memorial:
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
              📄 Template deste memorial:
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
            🗑️ Limpar Escolhas
          </button>
          
          <button
            onClick={() => navigate('/manage-standards')}
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
            ⚙️ Ir para Configuracao
          </button>
          
          <button
            onClick={handleApplySelection}
            disabled={!canApplyCurrentSelection}
            style={{ 
              backgroundColor: canApplyCurrentSelection ? '#27ae60' : '#95a5a6',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              cursor: canApplyCurrentSelection ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            ✅ Aplicar Escolhas
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
          <strong>💡 Instruções:</strong> Selecione a norma usada neste trabalho. Se faltar cadastro estrutural, use "⚙️ Ir para Configuracao".
        </div>

        {standards.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e9ecef' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              📋 Nenhuma norma cadastrada ainda.
            </p>
            <p>Vá para <strong>"⚙️ Ir para Configuracao"</strong> para cadastrar sua primeira norma.</p>
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
          <strong>💡 Instruções:</strong> Selecione o template que sera usado neste memorial. Se ainda faltar cadastro estrutural, ajuste em "⚙️ Ir para Configuracao".
          </div>

          {templates.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                📄 Nenhum template cadastrado ainda.
              </p>
              <p>Vá para <strong>"⚙️ Ir para Configuracao"</strong> para cadastrar seu primeiro template.</p>
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
