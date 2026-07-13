import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { memorialStandardsService } from '../services/memorial-standards';
import { templatesService } from '../services/templates';
import type { MemorialStandard } from '../types/memorial-standard';
import type { Template as BackendTemplate } from '../types/template';
import Loading from '../components/Loading';
import { useOperationContext } from '@/contexts/OperationContext';
import {
  MEMORIAL_SELECTION_DRAFT_BY_PROPERTY_KEY,
  SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY,
  SELECTED_TEMPLATE_BY_PROPERTY_KEY,
  getPropertyScopedValue,
  removePropertyScopedValue,
  setPropertyScopedValue
} from '@/utils/operationContext';
import {
  buildCurrentTechnicalSummarySelectionValue,
  clearAppliedTechnicalSummarySelection,
  getAppliedTechnicalSummarySelection,
  parseAppliedTechnicalSummarySelection,
  getStoredTechnicalSummary,
  setAppliedTechnicalSummarySelection,
  type StoredTechnicalSummaryRecord
} from '@/utils/technicalSummaryStorage';
import {
  listTechnicalSummaryExamples,
  type TechnicalSummaryExampleRecord
} from '@/utils/technicalSummaryExamples';

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
  selectedTechnicalSummary: string | null;
}

type TechnicalSummarySelectionData =
  | {
    kind: 'current';
    record: StoredTechnicalSummaryRecord;
  }
  | {
    kind: 'example';
    record: TechnicalSummaryExampleRecord;
  };

const MEMORIAL_SELECTION_DRAFT_KEY = 'memorialSelectionDraft';

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

const parseStoredTemplateData = (rawValue: string | null): StoredTemplateData | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (typeof parsed === 'string' && parsed.trim()) {
      return { template_id: parsed.trim() };
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const templateRecord = parsed as StoredTemplateData;
      const templateId = typeof templateRecord.template_id === 'string' && templateRecord.template_id.trim()
        ? templateRecord.template_id.trim()
        : typeof templateRecord.name === 'string' && templateRecord.name.trim()
          ? templateRecord.name.trim()
          : '';

      if (templateId) {
        return {
          ...templateRecord,
          template_id: templateId
        };
      }
    }
  } catch (error) {
    console.error('❌ Erro ao interpretar template salvo do memorial:', error);
  }

  return null;
};

const mapBackendTemplateToStoredTemplate = (template: BackendTemplate): StoredTemplateData => ({
  template_id: template.name,
  descricao: template.description,
  backendTemplateId: template.id,
  fileUrl: template.fileUrl,
  filePath: template.filePath
});

const getTechnicalSummaryPrimaryLabel = (selection: TechnicalSummarySelectionData | null): string => {
  if (!selection) {
    return 'Nenhum resumo técnico selecionado';
  }

  if (selection.kind === 'example') {
    return selection.record.fileName || selection.record.analyzedFile || 'Resumo Técnico base';
  }

  return selection.record.analyzedFile || 'Resumo Técnico atual';
};

const isCurrentTechnicalSummarySelection = (value: string | null | undefined): boolean => (
  parseAppliedTechnicalSummarySelection(value)?.kind === 'current'
);

const formatTechnicalSummaryDisplayName = (fileName: string | null | undefined, fallback: string): string => {
  const normalizedName = typeof fileName === 'string' ? fileName.trim() : '';
  return normalizedName ? `Arquivo do resumo: ${normalizedName}` : fallback;
};

const MemorialStandards: React.FC = () => {
  const navigate = useNavigate();
  const { activePropertyId } = useOperationContext();
  const [standards, setStandards] = useState<MemorialStandard[]>([]);
  const [templates, setTemplates] = useState<StoredTemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedTechnicalSummary, setSelectedTechnicalSummary] = useState<string | null>(null);
  const [storedTechnicalSummary, setStoredTechnicalSummary] = useState<StoredTechnicalSummaryRecord | null>(null);
  const [technicalSummaryExamples, setTechnicalSummaryExamples] = useState<TechnicalSummaryExampleRecord[]>([]);
  const [hasRestoredSelection, setHasRestoredSelection] = useState(false);

  const restoreSelectionForCurrentProperty = (
    technicalSummaryExamplesData: TechnicalSummaryExampleRecord[] = technicalSummaryExamples
  ) => {
    let savedNorms: SelectedNormReference[] = [];
    let savedTemplate: StoredTemplateData | null = null;
    let savedTemplateId: string | null = null;
    let savedDraft: MemorialSelectionDraft | null = null;

    try {
      const scopedNorms = getPropertyScopedValue<SelectedNormReference[]>(SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY, activePropertyId);
      if (scopedNorms?.length) {
        savedNorms = scopedNorms;
      } else {
        const savedNormsRaw = localStorage.getItem('selectedMemorialNorms');
        if (savedNormsRaw) {
          savedNorms = parseSelectedNorms(savedNormsRaw);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao restaurar normas do memorial:', error);
      localStorage.removeItem('selectedMemorialNorms');
      removePropertyScopedValue(SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY, activePropertyId);
      savedNorms = [];
    }

    try {
      const scopedTemplate = getPropertyScopedValue<StoredTemplateData>(SELECTED_TEMPLATE_BY_PROPERTY_KEY, activePropertyId);
      if (scopedTemplate?.template_id) {
        savedTemplate = scopedTemplate;
        savedTemplateId = scopedTemplate.template_id;
      } else {
        savedTemplate = parseStoredTemplateData(localStorage.getItem('selectedTemplate'));
        savedTemplateId = savedTemplate?.template_id || null;
      }
    } catch (error) {
      console.error('❌ Erro ao restaurar template do memorial:', error);
      localStorage.removeItem('selectedTemplate');
      removePropertyScopedValue(SELECTED_TEMPLATE_BY_PROPERTY_KEY, activePropertyId);
      savedTemplate = null;
      savedTemplateId = null;
    }

    try {
      const scopedDraft = getPropertyScopedValue<MemorialSelectionDraft>(MEMORIAL_SELECTION_DRAFT_BY_PROPERTY_KEY, activePropertyId);
      if (scopedDraft) {
        savedDraft = scopedDraft;
      } else {
        const savedDraftRaw = localStorage.getItem(MEMORIAL_SELECTION_DRAFT_KEY);
        if (savedDraftRaw) {
          savedDraft = parseSelectionDraft(savedDraftRaw);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao restaurar rascunho do memorial:', error);
      localStorage.removeItem(MEMORIAL_SELECTION_DRAFT_KEY);
      removePropertyScopedValue(MEMORIAL_SELECTION_DRAFT_BY_PROPERTY_KEY, activePropertyId);
      savedDraft = null;
    }

    if (savedNorms.length > 0) {
      setSelectedStandards(savedNorms.map((norm) => norm.id));
    } else if (savedDraft?.selectedStandards?.length) {
      setSelectedStandards(savedDraft.selectedStandards);
    } else {
      setSelectedStandards([]);
    }

    const selectedTemplateId =
      savedTemplateId ||
      savedDraft?.selectedTemplate ||
      null;

    if (selectedTemplateId) {
      setSelectedTemplate(selectedTemplateId);
    } else {
      setSelectedTemplate(null);
    }

    const appliedTechnicalSummary = getAppliedTechnicalSummarySelection(activePropertyId);
    const selectedTechnicalSummaryId = appliedTechnicalSummary || savedDraft?.selectedTechnicalSummary || null;
    const storedSummaryRecord = getStoredTechnicalSummary(activePropertyId) || getStoredTechnicalSummary();
    const hasStoredSummary = Boolean(storedSummaryRecord);
    const hasSavedExampleSummary = Boolean(
      selectedTechnicalSummaryId
      && selectedTechnicalSummaryId.startsWith('example:')
      && technicalSummaryExamplesData.some((item) => `example:${item.id}` === selectedTechnicalSummaryId)
    );
    const currentTechnicalSummarySelectionValue = hasStoredSummary
      ? buildCurrentTechnicalSummarySelectionValue(storedSummaryRecord?.sourceFileId)
      : null;

    if (hasSavedExampleSummary && selectedTechnicalSummaryId) {
      setSelectedTechnicalSummary(selectedTechnicalSummaryId);
    } else if (
      selectedTechnicalSummaryId
      && selectedTechnicalSummaryId === currentTechnicalSummarySelectionValue
      && hasStoredSummary
    ) {
      setSelectedTechnicalSummary(selectedTechnicalSummaryId);
    } else if (hasStoredSummary && currentTechnicalSummarySelectionValue) {
      setSelectedTechnicalSummary(currentTechnicalSummarySelectionValue);
    } else {
      setSelectedTechnicalSummary(null);
    }

    setHasRestoredSelection(true);
  };

  // Função para carregar dados
  const loadData = async () => {
    try {
      setLoading(true);
      const [normsData, backendTemplates, technicalSummaryExamplesData] = await Promise.all([
        memorialStandardsService.getAll(),
        templatesService.getAll().catch((error) => {
          console.error('❌ Erro ao carregar templates do backend:', error);
          return [];
        }),
        listTechnicalSummaryExamples().catch((error) => {
          console.error('❌ Erro ao carregar JSONs de resumo tecnico base:', error);
          return [];
        })
      ]);
      setStandards(normsData);
      const templatesData = backendTemplates.map(mapBackendTemplateToStoredTemplate);
      setTemplates(templatesData);
      setTechnicalSummaryExamples(technicalSummaryExamplesData);
      setStoredTechnicalSummary(getStoredTechnicalSummary(activePropertyId));
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setStandards([]);
      setTemplates([]);
      setTechnicalSummaryExamples([]);
      alert('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };



  // Carregamento automático na inicialização
  useEffect(() => {
    setHasRestoredSelection(false);
    void loadData();
  }, [activePropertyId]);

  useEffect(() => {
    if (!hasRestoredSelection) {
      return;
    }

    const draftPayload = {
      selectedStandards,
      selectedTemplate,
      selectedTechnicalSummary
    };

    localStorage.setItem(
      MEMORIAL_SELECTION_DRAFT_KEY,
      JSON.stringify(draftPayload)
    );
    setPropertyScopedValue(MEMORIAL_SELECTION_DRAFT_BY_PROPERTY_KEY, draftPayload, activePropertyId);
  }, [activePropertyId, hasRestoredSelection, selectedStandards, selectedTemplate, selectedTechnicalSummary]);

  useEffect(() => {
    restoreSelectionForCurrentProperty(technicalSummaryExamples);
  }, [templates, technicalSummaryExamples, activePropertyId]);

  useEffect(() => {
    setStoredTechnicalSummary(getStoredTechnicalSummary(activePropertyId));
  }, [activePropertyId, selectedStandards, selectedTemplate]);

  useEffect(() => {
    if (!selectedTechnicalSummary) {
      return;
    }

    if (isCurrentTechnicalSummarySelection(selectedTechnicalSummary) && !storedTechnicalSummary) {
      setSelectedTechnicalSummary(null);
      return;
    }

    if (selectedTechnicalSummary.startsWith('example:')) {
      const selectedExampleId = selectedTechnicalSummary.replace('example:', '');
      const hasSelectedExample = technicalSummaryExamples.some((item) => item.id === selectedExampleId);

      if (!hasSelectedExample) {
        setSelectedTechnicalSummary(null);
      }
    }
  }, [selectedTechnicalSummary, storedTechnicalSummary, technicalSummaryExamples]);





  const hasNormSelected = selectedStandards.length > 0;
  const hasTemplateSelected = Boolean(selectedTemplate);
  const hasTechnicalSummarySelected = Boolean(selectedTechnicalSummary);
  const canApplyCurrentSelection = hasNormSelected || hasTemplateSelected || hasTechnicalSummarySelected;

  const persistSelection = (showSuccessAlert: boolean): boolean => {
    const selectedNorms = standards.filter(s => selectedStandards.includes(s.id));
    const selectedTemplateData = templates.find(t => t.template_id === selectedTemplate);
    const technicalSummarySelectionToPersist = selectedTechnicalSummary
      || (
        storedTechnicalSummary
          ? buildCurrentTechnicalSummarySelectionValue(storedTechnicalSummary.sourceFileId)
          : null
      );

    if (selectedNorms.length === 0 && !selectedTemplateData && !technicalSummarySelectionToPersist) {
      alert('Escolha ao menos uma configuracao deste memorial antes de continuar.');
      return false;
    }

    if (selectedNorms.length > 0) {
      localStorage.setItem('selectedMemorialNorms', JSON.stringify(selectedNorms));
      setPropertyScopedValue(SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY, selectedNorms, activePropertyId);
    } else {
      localStorage.removeItem('selectedMemorialNorms');
      removePropertyScopedValue(SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY, activePropertyId);
    }

    if (selectedTemplateData) {
      localStorage.setItem('selectedTemplate', JSON.stringify(selectedTemplateData));
      setPropertyScopedValue(SELECTED_TEMPLATE_BY_PROPERTY_KEY, selectedTemplateData, activePropertyId);
    } else {
      localStorage.removeItem('selectedTemplate');
      removePropertyScopedValue(SELECTED_TEMPLATE_BY_PROPERTY_KEY, activePropertyId);
    }

    setAppliedTechnicalSummarySelection(technicalSummarySelectionToPersist, activePropertyId);
    localStorage.setItem(
      MEMORIAL_SELECTION_DRAFT_KEY,
      JSON.stringify({
        selectedStandards,
        selectedTemplate,
        selectedTechnicalSummary: technicalSummarySelectionToPersist
      })
    );
    setPropertyScopedValue(MEMORIAL_SELECTION_DRAFT_BY_PROPERTY_KEY, {
      selectedStandards,
      selectedTemplate,
      selectedTechnicalSummary: technicalSummarySelectionToPersist
    }, activePropertyId);
    
    if (showSuccessAlert) {
      alert(`✅ Seleção aplicada!\n\n📋 Norma: ${selectedNorms[0]?.id ? selectedNorms[0].name : 'Nenhuma'}\n📄 Template: ${selectedTemplateData?.template_id || 'Nenhum selecionado'}\n🧾 Resumo Técnico: ${selectedTechnicalSummaryData?.kind === 'current'
        ? getTechnicalSummaryPrimaryLabel(selectedTechnicalSummaryData)
        : selectedTechnicalSummaryData?.kind === 'example'
          ? getTechnicalSummaryPrimaryLabel(selectedTechnicalSummaryData)
          : 'Nenhum selecionado'}\n\n💡 Essas escolhas passam a valer para o memorial atual.`);
    }

    return true;
  };

  const handleApplySelection = () => {
    persistSelection(true);
  };


  const handleClearSelection = () => {
    setSelectedStandards([]);
    setSelectedTemplate(null);
    setSelectedTechnicalSummary(null);
    localStorage.removeItem('selectedMemorialNorms');
    localStorage.removeItem('selectedTemplate');
    localStorage.removeItem(MEMORIAL_SELECTION_DRAFT_KEY);
    removePropertyScopedValue(SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY, activePropertyId);
    removePropertyScopedValue(SELECTED_TEMPLATE_BY_PROPERTY_KEY, activePropertyId);
    removePropertyScopedValue(MEMORIAL_SELECTION_DRAFT_BY_PROPERTY_KEY, activePropertyId);
    clearAppliedTechnicalSummarySelection(activePropertyId);
    alert('🗑️ As escolhas do memorial atual foram limpas.');
  };


  const selectedNormData = standards.find((standard) => selectedStandards.includes(standard.id)) || null;
  const persistedTemplateData = parseStoredTemplateData(
    JSON.stringify(
      getPropertyScopedValue<StoredTemplateData>(SELECTED_TEMPLATE_BY_PROPERTY_KEY, activePropertyId)
      || parseStoredTemplateData(localStorage.getItem('selectedTemplate'))
    )
  );
  const selectedTemplateData = templates.find((template) => template.template_id === selectedTemplate)
    || (persistedTemplateData && persistedTemplateData.template_id === selectedTemplate ? persistedTemplateData : null);
  const selectedTechnicalSummaryExample = selectedTechnicalSummary?.startsWith('example:')
    ? technicalSummaryExamples.find((item) => item.id === selectedTechnicalSummary.replace('example:', '')) || null
    : null;
  const selectedTechnicalSummaryData: TechnicalSummarySelectionData | null = isCurrentTechnicalSummarySelection(selectedTechnicalSummary) && storedTechnicalSummary
    ? { kind: 'current', record: storedTechnicalSummary }
    : selectedTechnicalSummaryExample
      ? { kind: 'example', record: selectedTechnicalSummaryExample }
      : null;

  const panelWrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1rem'
  };

  const selectorBlockStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem 1rem 1.1rem'
  };

  const selectorLabelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: '0.6rem'
  };

  const selectorStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    backgroundColor: 'white',
    cursor: 'pointer'
  };

  const hasStoredTechnicalSummaryOption = Boolean(storedTechnicalSummary) || technicalSummaryExamples.length > 0;

  if (loading) {
    return <Loading />;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#2c3e50', fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Configurar Memorial
        </h1>
        <p style={{ color: '#5f6b7a', marginBottom: '1.5rem' }}>
          Esta escolha vale para o memorial que esta sendo montado agora e pode mudar no proximo trabalho.
        </p>

        <div style={panelWrapperStyle}>
          <div style={selectorBlockStyle}>
            <label style={selectorLabelStyle}>
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
              style={selectorStyle}
            >
                <option value="">Nenhuma norma selecionada</option>
                {standards.map((standard) => (
                  <option key={standard.id} value={standard.id}>
                    {standard.name}
                    {standard.isDefault ? ' (Padrão)' : ''}
                  </option>
                ))}
            </select>

            {standards.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: '#6c757d', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e9ecef', marginTop: '1rem' }}>
                <p style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                  📋 Nenhuma norma cadastrada ainda.
                </p>
                <p>Vá para <strong>"⚙️ Ir para Configuracao"</strong> para cadastrar sua primeira norma.</p>
              </div>
            ) : selectedNormData ? (
              <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '2px solid #27ae60', padding: '1.25rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <h4 style={{ color: '#2c3e50', margin: 0, fontSize: '1.05rem' }}>
                    ✅ {selectedNormData.name}
                  </h4>
                  {selectedNormData.isDefault && (
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
                {selectedNormData.description && (
                  <p style={{ color: '#6c757d', margin: '0.5rem 0', fontSize: '0.9rem' }}>
                    {selectedNormData.description}
                  </p>
                )}
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.5rem' }}>
                  <span>📅 Criado em: {new Date(selectedNormData.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: '#6c757d', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e9ecef', marginTop: '1rem' }}>
                <p style={{ fontSize: '1rem' }}>
                  👆 Selecione uma norma no combobox acima
                </p>
              </div>
            )}
          </div>

          <div style={selectorBlockStyle}>
            <label style={selectorLabelStyle}>
              📄 Template deste memorial:
            </label>
            <select
              value={selectedTemplate || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                setSelectedTemplate(selectedId || null);
              }}
              style={selectorStyle}
            >
                <option value="">Nenhum template selecionado</option>
                {selectedTemplate && !templates.some((template) => template.template_id === selectedTemplate) && (
                  <option value={selectedTemplate}>
                    {selectedTemplateData?.template_id || selectedTemplate}
                    {selectedTemplateData?.descricao ? ` - ${selectedTemplateData.descricao.substring(0, 40)}${selectedTemplateData.descricao.length > 40 ? '...' : ''}` : ' (aplicado)'}
                  </option>
                )}
                {templates.map((template) => (
                  <option key={template.template_id} value={template.template_id}>
                    {template.template_id}
                    {template.descricao ? ` - ${template.descricao.substring(0, 40)}${template.descricao.length > 40 ? '...' : ''}` : ''}
                  </option>
                ))}
            </select>

            {templates.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: '#6c757d', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef', marginTop: '1rem' }}>
                <p style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                  📄 Nenhum template cadastrado ainda.
                </p>
                <p>Vá para <strong>"⚙️ Ir para Configuracao"</strong> para cadastrar seu primeiro template.</p>
              </div>
            ) : selectedTemplateData ? (
              <div style={{ backgroundColor: '#f0f8ff', borderRadius: '8px', border: '2px solid #3498db', padding: '1.25rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <h4 style={{ color: '#2c3e50', margin: 0, fontSize: '1.05rem' }}>
                    ✅ {selectedTemplateData.template_id}
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
                {selectedTemplateData.descricao && (
                  <p style={{ color: '#6c757d', margin: '0.5rem 0', fontSize: '0.9rem' }}>
                    {selectedTemplateData.descricao}
                  </p>
                )}
              </div>
            ) : (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: '#6c757d', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef', marginTop: '1rem' }}>
                <p style={{ fontSize: '1rem' }}>
                  👆 Selecione um template no combobox acima
                </p>
              </div>
            )}
          </div>

          <div style={selectorBlockStyle}>
            <label style={selectorLabelStyle}>
              🧾 Arquivo do Resumo Técnico:
            </label>
            <select
              value={selectedTechnicalSummary || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                setSelectedTechnicalSummary(selectedId || null);
              }}
              style={selectorStyle}
            >
              <option value="">Nenhum resumo técnico selecionado</option>
              {storedTechnicalSummary ? (
                <option value={buildCurrentTechnicalSummarySelectionValue(storedTechnicalSummary.sourceFileId)}>
                  {formatTechnicalSummaryDisplayName(
                    storedTechnicalSummary.analyzedFile,
                    'Resumo Técnico atual'
                  )}
                </option>
              ) : null}
              {technicalSummaryExamples.map((record) => (
                <option key={record.id} value={`example:${record.id}`}>
                  {formatTechnicalSummaryDisplayName(
                    record.fileName || record.analyzedFile,
                    'Resumo Técnico base'
                  )}
                </option>
              ))}
            </select>

            {selectedTechnicalSummaryData?.kind === 'current' ? (
              <div style={{ backgroundColor: '#fffaf0', borderRadius: '8px', border: '2px solid #f59e0b', padding: '1.25rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <h4 style={{ color: '#2c3e50', margin: 0, fontSize: '1.05rem' }}>
                    ✅ {formatTechnicalSummaryDisplayName(
                      getTechnicalSummaryPrimaryLabel(selectedTechnicalSummaryData),
                      'Resumo Técnico atual'
                    )}
                  </h4>
                  <span style={{
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    RESUMO ATUAL
                  </span>
                </div>
                <p style={{ color: '#6c757d', margin: '0.5rem 0', fontSize: '0.9rem' }}>
                  Última geração: {new Date(selectedTechnicalSummaryData.record.generatedAt).toLocaleString('pt-BR')} via {selectedTechnicalSummaryData.record.source === 'cad-editor' ? 'Editor CAD' : 'Memorial'}.
                </p>
                <p style={{ color: '#475569', margin: '0.85rem 0 0', fontSize: '0.92rem', lineHeight: 1.55 }}>
                  Este resumo técnico já existe. Aqui você apenas define qual JSON fica vinculado ao memorial atual ao clicar em <strong>Aplicar Escolhas</strong>.
                </p>
              </div>
            ) : selectedTechnicalSummaryData?.kind === 'example' ? (
              <div style={{ backgroundColor: '#fffaf0', borderRadius: '8px', border: '2px solid #f59e0b', padding: '1.25rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <h4 style={{ color: '#2c3e50', margin: 0, fontSize: '1.05rem' }}>
                    ✅ {formatTechnicalSummaryDisplayName(
                      getTechnicalSummaryPrimaryLabel(selectedTechnicalSummaryData),
                      'Resumo Técnico base'
                    )}
                  </h4>
                  <span style={{
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    JSON BASE
                  </span>
                </div>
                <p style={{ color: '#6c757d', margin: '0.5rem 0', fontSize: '0.9rem' }}>
                  Importado em {new Date(selectedTechnicalSummaryData.record.createdAt).toLocaleString('pt-BR')}
                  {selectedTechnicalSummaryData.record.generatedAt
                    ? ` • Gerado em ${new Date(selectedTechnicalSummaryData.record.generatedAt).toLocaleString('pt-BR')}`
                    : ''}.
                </p>
                <p style={{ color: '#475569', margin: '0.85rem 0 0', fontSize: '0.92rem', lineHeight: 1.55 }}>
                  Este JSON base fica disponível para vínculo. Use <strong>Aplicar Escolhas</strong> para torná-lo o resumo técnico selecionado deste memorial.
                </p>
              </div>
            ) : hasStoredTechnicalSummaryOption ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: '#6c757d', backgroundColor: '#fffaf0', borderRadius: '8px', border: '1px solid #fcd34d', marginTop: '1rem' }}>
                <p style={{ fontSize: '1rem', margin: 0 }}>
                  👆 Selecione um resumo técnico no combobox acima
                </p>
              </div>
            ) : (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: '#6c757d', backgroundColor: '#fffaf0', borderRadius: '8px', border: '1px solid #fcd34d', marginTop: '1rem' }}>
                <p style={{ fontSize: '1rem', margin: 0 }}>
                  Nenhum resumo técnico atual disponível.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Linha de Botões */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleClearSelection}
            disabled={selectedStandards.length === 0 && !selectedTemplate && !selectedTechnicalSummary}
            style={{ 
              backgroundColor: '#e74c3c',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: selectedStandards.length === 0 && !selectedTemplate && !selectedTechnicalSummary ? 0.5 : 1
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
    </div>
  );
};

export default MemorialStandards;
