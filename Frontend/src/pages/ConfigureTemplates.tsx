import React, { useEffect, useMemo, useState } from 'react';
import GenerationProgress from '@/components/GenerationProgress';
import { templatesService } from '@/services/templates';
import type { Template } from '@/types/template';
import { memorialStandardsService } from '@/services/memorial-standards';
import type { MemorialStandardCreate, MemorialStandard } from '@/types/memorial-standard';
import {
  deleteTechnicalSummaryExample,
  listTechnicalSummaryExamples,
  saveTechnicalSummaryExample,
  type TechnicalSummaryExampleRecord
} from '@/utils/technicalSummaryExamples';
import { saveTextWithPicker } from '@/utils/fileSave';
import { desktopApi } from '@/services/desktopApi';
import { getLastDesktopFileDialogDirectory, rememberDesktopFileDialogDirectory } from '@/utils/desktopFileDialogState';

interface ErrorLike {
  name?: string;
  message?: string;
}

interface WritableFileHandle {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
}

interface SaveFileHandle {
  createWritable: () => Promise<WritableFileHandle>;
}

interface PreparedTemplateSaveTarget {
  handle: SaveFileHandle | null;
  desktopPath?: string;
  status: 'ready' | 'cancelled' | 'unavailable';
}

interface FileSystemAccessWindow extends Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    startIn?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFileHandle>;
}

interface LocalTemplateRecord {
  template_id?: string;
  name?: string;
  descricao?: string;
  createdAt?: string;
  [key: string]: unknown;
}

interface TemplateListItem {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  source: 'backend' | 'local';
}

const LOCAL_TEMPLATES_KEY = 'createdTemplates';
const LOCAL_STANDARDS_KEY = 'createdMemorialStandards';

const buildDefaultPrompt = (standardName: string): string => `Gere um memorial descritivo seguindo rigorosamente a norma ${standardName}.

Requisitos:
- respeitar a estrutura tecnica da norma
- usar terminologia formal e cartorial
- preservar coerencia entre area, perimetro, confrontacoes e coordenadas
- nao inventar coordenadas nem informacoes ausentes
- sinalizar quando o texto da norma precisar de revisao complementar`;

const sanitizeTemplateName = (rawName: string): string =>
  rawName
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/\s+/g, '_')
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'template';

const getErrorName = (error: unknown): string | undefined => {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    return (error as ErrorLike).name;
  }

  return undefined;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ErrorLike).message || fallback;
  }

  return fallback;
};

const extractTemplateJson = (rawContent: string): string => {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    throw new Error('O conteudo do template veio vazio.');
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonCandidate = fencedMatch?.[1]?.trim() || trimmed;
  return jsonCandidate;
};

const parseLocalTemplates = (): LocalTemplateRecord[] => {
  try {
    const raw = localStorage.getItem(LOCAL_TEMPLATES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalTemplateRecord[]) : [];
  } catch (error) {
    console.error('Erro ao ler templates locais:', error);
    return [];
  }
};

const parseLocalStandards = (): MemorialStandard[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STANDARDS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as MemorialStandard[]) : [];
  } catch (error) {
    console.error('Erro ao ler normas locais:', error);
    return [];
  }
};

const persistLocalStandard = (standard: MemorialStandard) => {
  const currentStandards = parseLocalStandards();
  const nextStandards = currentStandards.filter((item) => item.id !== standard.id && item.name !== standard.name);
  nextStandards.push(standard);
  localStorage.setItem(LOCAL_STANDARDS_KEY, JSON.stringify(nextStandards));
};

const removeLocalStandard = (standard: MemorialStandard) => {
  const currentStandards = parseLocalStandards();
  const nextStandards = currentStandards.filter((item) => item.id !== standard.id && item.name !== standard.name);
  localStorage.setItem(LOCAL_STANDARDS_KEY, JSON.stringify(nextStandards));
};

const mergeStandards = (backendStandards: MemorialStandard[], localStandards: MemorialStandard[]): MemorialStandard[] => {
  const merged: MemorialStandard[] = [];
  const seen = new Set<string>();

  [...backendStandards, ...localStandards].forEach((standard) => {
    const key = `${standard.id}::${standard.name}`;
    const secondaryKey = standard.name.trim().toLowerCase();
    if (seen.has(key) || seen.has(secondaryKey)) {
      return;
    }

    seen.add(key);
    seen.add(secondaryKey);
    merged.push(standard);
  });

  return merged.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

const filterPlaceholderStandards = (items: MemorialStandard[]): MemorialStandard[] =>
  items.filter((item) => !item.id.startsWith('mock-') && item.ownerId !== 'mock-user');

const removeLocalTemplate = (templateName: string) => {
  const currentTemplates = parseLocalTemplates();
  const filteredTemplates = currentTemplates.filter((item) => {
    const currentName = item.template_id || item.name || '';
    return currentName !== templateName;
  });

  localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(filteredTemplates));
};

const serializeLegacyTemplateRecord = (template: LocalTemplateRecord): string => {
  const { createdAt, ...templateWithoutMetadata } = template;
  return JSON.stringify(templateWithoutMetadata, null, 2);
};

const buildTemplateSummary = (backendTemplates: Template[], localTemplates: LocalTemplateRecord[]): TemplateListItem[] => {
  const items: TemplateListItem[] = [];
  const seenNames = new Set<string>();

  backendTemplates.forEach((template) => {
    const normalizedName = template.name?.trim();
    if (!normalizedName || seenNames.has(normalizedName)) {
      return;
    }

    seenNames.add(normalizedName);
    items.push({
      id: template.id,
      name: normalizedName,
      description: template.description,
      createdAt: template.createdAt,
      source: 'backend'
    });
  });

  localTemplates.forEach((template, index) => {
    const normalizedName = (template.template_id || template.name || '').trim();
    if (!normalizedName || seenNames.has(normalizedName)) {
      return;
    }

    seenNames.add(normalizedName);
    items.push({
      id: `local-${index}-${normalizedName}`,
      name: normalizedName,
      description: template.descricao,
      createdAt: template.createdAt,
      source: 'local'
    });
  });

  return items.sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || ''));
};

const migrateLegacyLocalTemplates = async (backendTemplates: Template[], localTemplates: LocalTemplateRecord[]) => {
  const backendNames = new Set(
    backendTemplates
      .map((template) => template.name?.trim())
      .filter((name): name is string => Boolean(name))
  );

  const failedTemplates: LocalTemplateRecord[] = [];
  let migratedAny = false;

  for (const template of localTemplates) {
    const templateName = (template.template_id || template.name || '').trim();
    if (!templateName) {
      continue;
    }

    if (backendNames.has(templateName)) {
      removeLocalTemplate(templateName);
      migratedAny = true;
      continue;
    }

    try {
      await templatesService.create({
        name: templateName,
        description: template.descricao,
        templateContent: serializeLegacyTemplateRecord(template)
      });
      backendNames.add(templateName);
      removeLocalTemplate(templateName);
      migratedAny = true;
    } catch (error) {
      console.error(`Erro ao migrar template legado "${templateName}" para o backend:`, error);
      failedTemplates.push(template);
    }
  }

  return {
    migratedAny,
    failedTemplates
  };
};

const buildJsonSavePickerOptions = (suggestedName: string) => ({
  suggestedName,
  startIn: 'documents',
  types: [
    {
      description: 'Arquivo JSON',
      accept: {
        'application/json': ['.json']
      }
    }
  ]
});

const prepareTemplateSaveTarget = async (suggestedName: string): Promise<PreparedTemplateSaveTarget> => {
  if (desktopApi.hasBridge()) {
    const result = await desktopApi.saveFile({
      suggestedName,
      contents: '', // Create an empty file to reserve the path and prompt user
      defaultPath: getLastDesktopFileDialogDirectory()
        ? `${getLastDesktopFileDialogDirectory()}\\${suggestedName}`
        : undefined
    });
    if (result.saved && result.path) {
      rememberDesktopFileDialogDirectory(result.path);
      return {
        handle: null,
        desktopPath: result.path,
        status: 'ready'
      };
    }
    return {
      handle: null,
      status: 'cancelled'
    };
  }

  const fileSystemWindow = window as FileSystemAccessWindow;

  if (!fileSystemWindow.showSaveFilePicker) {
    return {
      handle: null,
      status: 'unavailable'
    };
  }

  try {
    const handle = await fileSystemWindow.showSaveFilePicker(buildJsonSavePickerOptions(suggestedName));
    return {
      handle,
      status: 'ready'
    };
  } catch (error) {
    if (getErrorName(error) === 'AbortError') {
      return {
        handle: null,
        status: 'cancelled'
      };
    }

    if (getErrorName(error) === 'SecurityError') {
      return {
        handle: null,
        status: 'unavailable'
      };
    }

    throw error;
  }
};

const saveTemplateWithBrowserDialog = async (
  templateContent: string,
  suggestedName: string,
  preparedTarget?: PreparedTemplateSaveTarget
) => {
  if (preparedTarget?.status === 'cancelled') {
    return 'cancelled';
  }

  if (preparedTarget?.status === 'ready') {
    if (preparedTarget.handle) {
      const writable = await preparedTarget.handle.createWritable();
      await writable.write(templateContent);
      await writable.close();
      return 'saved';
    }
    
    if (preparedTarget.desktopPath) {
      await desktopApi.saveFile({
        suggestedName,
        contents: templateContent,
        targetPath: preparedTarget.desktopPath
      });
      return 'saved';
    }
  }

  const saved = await saveTextWithPicker({
    suggestedName,
    contents: templateContent,
    contentType: 'application/json;charset=utf-8',
    pickerTypeDescription: 'Arquivo JSON',
    accept: {
      'application/json': ['.json']
    }
  });

  return saved ? 'saved' : 'cancelled';
};

const normalizeTemplateContent = (rawContent: string): string => {
  const extractedJson = extractTemplateJson(rawContent);
  return JSON.stringify(JSON.parse(extractedJson), null, 2);
};

const helpButtonStyle: React.CSSProperties = {
  width: '1.4rem',
  height: '1.4rem',
  border: '1px solid #cbd5e1',
  borderRadius: '999px',
  background: '#eef2ff',
  color: '#4f46e5',
  fontSize: '0.8rem',
  fontWeight: 700,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease'
};

const helpTextStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#475569',
  background: '#eef2ff',
  border: '1px solid #c7d2fe',
  borderRadius: '8px',
  padding: '0.75rem 0.9rem',
  lineHeight: 1.4,
  marginTop: '0.75rem'
};

const ConfigureTemplates: React.FC = () => {
  const [standards, setStandards] = useState<MemorialStandard[]>([]);
  const [loadingStandards, setLoadingStandards] = useState(true);
  const [uploadingStandard, setUploadingStandard] = useState(false);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [technicalSummaryExamples, setTechnicalSummaryExamples] = useState<TechnicalSummaryExampleRecord[]>([]);
  const [loadingTechnicalSummaryExamples, setLoadingTechnicalSummaryExamples] = useState(true);
  const [uploadingTechnicalSummaryExample, setUploadingTechnicalSummaryExample] = useState(false);
  const [processingSeconds, setProcessingSeconds] = useState(0);
  const [processingLabel, setProcessingLabel] = useState('');
  const [processingFileName, setProcessingFileName] = useState('');
  const [selectedModelFile, setSelectedModelFile] = useState<File | null>(null);
  const [showStandardsHelp, setShowStandardsHelp] = useState(false);
  const [showTemplatesHelp, setShowTemplatesHelp] = useState(false);
  const [showTechnicalSummaryHelp, setShowTechnicalSummaryHelp] = useState(false);
  const modelProgress = useMemo(() => Math.min(92, Math.max(12, 12 + processingSeconds * 7)), [processingSeconds]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      let backendTemplates: Template[] = [];

      try {
        backendTemplates = await templatesService.getAll();
      } catch (error) {
        console.error('Erro ao carregar templates do backend:', error);
      }

      const localTemplates = parseLocalTemplates();
      const { migratedAny, failedTemplates } = await migrateLegacyLocalTemplates(backendTemplates, localTemplates);

      if (migratedAny) {
        try {
          backendTemplates = await templatesService.getAll();
        } catch (error) {
          console.error('Erro ao recarregar templates do backend apos migracao:', error);
        }
      }

      setTemplates(buildTemplateSummary(backendTemplates, failedTemplates));
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadStandards = async () => {
    try {
      setLoadingStandards(true);
      let backendStandards: MemorialStandard[] = [];

      try {
        backendStandards = await memorialStandardsService.getAll();
      } catch (error) {
        console.error('Erro ao carregar normas do backend:', error);
      }

      const localStandards = parseLocalStandards();
      setStandards(mergeStandards(filterPlaceholderStandards(backendStandards), localStandards));
    } catch (error) {
      console.error('Erro ao carregar normas:', error);
      setStandards([]);
    } finally {
      setLoadingStandards(false);
    }
  };

  const loadTechnicalSummaryExamples = async () => {
    try {
      setLoadingTechnicalSummaryExamples(true);
      setTechnicalSummaryExamples(await listTechnicalSummaryExamples());
    } catch (error) {
      console.error('Erro ao carregar resumos tecnicos base:', error);
      setTechnicalSummaryExamples([]);
    } finally {
      setLoadingTechnicalSummaryExamples(false);
    }
  };

  useEffect(() => {
    loadStandards();
    loadTemplates();
    void loadTechnicalSummaryExamples();
  }, []);

  useEffect(() => {
    if (!uploadingModel) {
      setProcessingSeconds(0);
      return;
    }

    setProcessingSeconds(0);
    const intervalId = window.setInterval(() => {
      setProcessingSeconds((current) => current + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [uploadingModel]);

  const handleNormUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isPdf = file.type === 'application/pdf' || fileExtension === '.pdf';
    const isTxt = file.type === 'text/plain' || fileExtension === '.txt';

    if (!isPdf && !isTxt) {
      alert('Selecione apenas arquivos PDF ou TXT para a norma.');
      event.target.value = '';
      return;
    }

    try {
      setUploadingStandard(true);
      setProcessingFileName(file.name);
      setProcessingLabel('Importando norma base...');

      const standardName = file.name.replace(/\.[^/.]+$/, '').trim() || 'Norma sem nome';
      const standardText = isTxt
        ? await file.text()
        : `Norma importada do arquivo ${file.name}.\n\nO texto integral do PDF precisa de revisao complementar se necessario.`;

      const payload: MemorialStandardCreate = {
        name: standardName,
        description: `Norma base importada de ${file.name}`,
        standardText,
        promptTemplate: buildDefaultPrompt(standardName),
        isDefault: false
      };

      const createdStandard = await memorialStandardsService.create(payload);
      persistLocalStandard(createdStandard);
      await loadStandards();
      alert(`✅ Norma "${standardName}" carregada com sucesso.`);
    } catch (error: unknown) {
      console.error('Erro ao carregar norma:', error);
      alert(`❌ Falha ao carregar a norma: ${getErrorMessage(error, 'Erro desconhecido.')}`);
    } finally {
      setUploadingStandard(false);
      setProcessingLabel('');
      setProcessingFileName('');
      event.target.value = '';
    }
  };

  const handleModelUploadSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setSelectedModelFile(file);
    event.target.value = '';
  };

  const handleModelUploadProcess = async () => {
    const file = selectedModelFile;
    if (!file) {
      return;
    }

    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isJson = file.type === 'application/json' || fileExtension === '.json';
    const isPdf = file.type === 'application/pdf' || fileExtension === '.pdf';
    const isTxt = file.type === 'text/plain' || fileExtension === '.txt';

    if (!isJson && !isPdf && !isTxt) {
      alert('Selecione apenas arquivos JSON, PDF ou TXT.');
      setSelectedModelFile(null);
      return;
    }

    try {
      let requestName = sanitizeTemplateName(file.name);
      let requestDescription = `Modelo base criado a partir do arquivo ${file.name}`;
      const suggestedSaveName = `${requestName || 'template'}.json`;
      let preparedSaveTarget: PreparedTemplateSaveTarget | undefined;

      if (isJson) {
        setUploadingModel(true);
        setProcessingFileName(file.name);
        setProcessingLabel('Importando modelo base...');
        const rawJson = await file.text();
        const parsedJson = JSON.parse(rawJson) as LocalTemplateRecord;
        requestName = sanitizeTemplateName((parsedJson.template_id || parsedJson.name || requestName).toString());
        requestDescription = (parsedJson.descricao || requestDescription).toString();
        const normalizedTemplateContent = normalizeTemplateContent(rawJson);
        await templatesService.create({
          name: requestName,
          description: requestDescription,
          templateContent: normalizedTemplateContent
        });
        await loadTemplates();
        setSelectedModelFile(null);
        alert(`✅ Modelo "${requestName}" importado com sucesso.`);
        return;
      }

      preparedSaveTarget = await prepareTemplateSaveTarget(suggestedSaveName);

      if (preparedSaveTarget.status === 'cancelled') {
        setSelectedModelFile(null);
        return;
      }

      setUploadingModel(true);
      setProcessingFileName(file.name);
      setProcessingLabel('Gerando modelo base com a IA...');

      const response = await templatesService.generateTemplate(file, {
        name: requestName,
        description: requestDescription
      });

      const templateContent = response.templateContent || '';
      if (!templateContent) {
        throw new Error('A IA nao retornou o conteudo do template em JSON.');
      }

      const normalizedTemplateContent = normalizeTemplateContent(templateContent);

      try {
        const saveResult = await saveTemplateWithBrowserDialog(
          normalizedTemplateContent,
          suggestedSaveName,
          preparedSaveTarget
        );

        if (saveResult === 'cancelled') {
          await loadTemplates();
          setSelectedModelFile(null);
          alert(`✅ Modelo "${requestName}" processado e salvo no sistema. O arquivo local nao foi salvo porque a escolha do local foi cancelada.`);
          return;
        }

        await loadTemplates();

      } catch (error) {
        throw error;
      }

      setSelectedModelFile(null);
      alert(`✅ Modelo "${requestName}" processado com sucesso.`);
    } catch (error: unknown) {
      console.error('Erro ao processar modelo:', error);
      alert(`❌ Falha ao processar o modelo: ${getErrorMessage(error, 'Erro desconhecido.')}`);
    } finally {
      setUploadingModel(false);
      setProcessingLabel('');
      setProcessingFileName('');
    }
  };

  const handleDeleteTemplate = async (template: TemplateListItem) => {
    if (!window.confirm(`Deseja excluir o modelo "${template.name}"?`)) {
      return;
    }

    try {
      if (template.source === 'backend') {
        await templatesService.delete(template.id);
      }

      removeLocalTemplate(template.name);
      await loadTemplates();
      alert(`✅ Modelo "${template.name}" excluido com sucesso.`);
    } catch (error: unknown) {
      console.error('Erro ao excluir modelo:', error);
      alert(`❌ Falha ao excluir o modelo: ${getErrorMessage(error, 'Erro desconhecido.')}`);
    }
  };

  const handleDeleteStandard = async (standard: MemorialStandard) => {
    if (!window.confirm(`Deseja excluir a norma "${standard.name}"?`)) {
      return;
    }

    try {
      await memorialStandardsService.delete(standard.id);
      removeLocalStandard(standard);
      await loadStandards();
      alert(`✅ Norma "${standard.name}" excluida com sucesso.`);
    } catch (error: unknown) {
      console.error('Erro ao excluir norma:', error);
      alert(`❌ Falha ao excluir a norma: ${getErrorMessage(error, 'Erro desconhecido.')}`);
    }
  };

  const handleTechnicalSummaryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isJson = file.type === 'application/json' || fileExtension === '.json';

    if (!isJson) {
      alert('Selecione apenas arquivos JSON para o Resumo Tecnico base.');
      event.target.value = '';
      return;
    }

    try {
      setUploadingTechnicalSummaryExample(true);
      await saveTechnicalSummaryExample(file);
      await loadTechnicalSummaryExamples();
      alert(`✅ Resumo Tecnico "${file.name}" carregado com sucesso.`);
    } catch (error: unknown) {
      console.error('Erro ao carregar resumo tecnico base:', error);
      alert(`❌ Falha ao carregar o resumo tecnico base: ${getErrorMessage(error, 'Erro desconhecido.')}`);
    } finally {
      setUploadingTechnicalSummaryExample(false);
      event.target.value = '';
    }
  };

  const handleDeleteTechnicalSummaryExample = async (record: TechnicalSummaryExampleRecord) => {
    if (!window.confirm(`Deseja excluir o resumo tecnico base "${record.fileName}"?`)) {
      return;
    }

    try {
      await deleteTechnicalSummaryExample(record.id);
      await loadTechnicalSummaryExamples();
      alert(`✅ Resumo Tecnico "${record.fileName}" excluido com sucesso.`);
    } catch (error: unknown) {
      console.error('Erro ao excluir resumo tecnico base:', error);
      alert(`❌ Falha ao excluir o resumo tecnico base: ${getErrorMessage(error, 'Erro desconhecido.')}`);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <GenerationProgress
        isGenerating={uploadingModel}
        progress={modelProgress}
        currentStep={processingFileName ? `Arquivo: ${processingFileName}` : 'Preparando processamento do modelo'}
        timeElapsed={processingSeconds}
        title="Processando Modelo Base"
        subtitle={processingLabel || 'Aguarde enquanto a IA prepara o template em JSON.'}
        tips={
          <>
            <p>O modelo esta sendo transformado em template estruturado para uso no memorial.</p>
            <p>Ao concluir, o sistema abre a janela para voce salvar o arquivo JSON.</p>
          </>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#2c3e50', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
            ⚙️ Normas e Exemplos
          </h1>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
          overflow: 'hidden',
          marginBottom: '1.5rem'
        }}
      >
        <div
          style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '1.2rem' }}>
                📘 Normas Base ({standards.length})
              </h2>
              <button
                type="button"
                aria-label="Ajuda sobre normas base"
                aria-expanded={showStandardsHelp}
                onClick={() => setShowStandardsHelp((prev) => !prev)}
                style={helpButtonStyle}
              >
                ?
              </button>
            </div>
            {showStandardsHelp && (
              <div style={helpTextStyle}>
                Use esta area para importar a norma base que servira de referencia tecnica.
                O sistema aceita `PDF` ou `TXT` e cadastra essa norma para reutilizacao nos proximos trabalhos.
              </div>
            )}
          </div>
          <button
            onClick={() => document.getElementById('standardUploadDirect')?.click()}
            disabled={uploadingStandard}
            style={{
              backgroundColor: uploadingStandard ? '#95a5a6' : '#8e44ad',
              color: 'white',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              cursor: uploadingStandard ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
              opacity: uploadingStandard ? 0.7 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            {uploadingStandard ? '⏳ Processando...' : 'Buscar Norma'}
          </button>
        </div>

        <input
          id="standardUploadDirect"
          type="file"
          accept=".pdf,.txt"
          style={{ display: 'none' }}
          onChange={handleNormUpload}
        />

        <div style={{ padding: '1.5rem' }}>
          {loadingStandards ? (
            <div style={{ color: '#5f6b7a' }}>Carregando normas...</div>
          ) : standards.length === 0 ? (
            <div style={{ color: '#5f6b7a' }}>
              Nenhuma norma cadastrada ainda. Use `Buscar Norma` para adicionar a primeira.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.9rem' }}>
              {standards.map((standard) => (
                <div
                  key={standard.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '1rem',
                    backgroundColor: '#fff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#2c3e50', marginBottom: '0.25rem' }}>
                        {standard.name}
                      </div>
                      {standard.description && (
                        <div style={{ color: '#5f6b7a', fontSize: '0.92rem' }}>{standard.description}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {standard.isDefault && (
                        <div
                          style={{
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            borderRadius: '999px',
                            padding: '0.35rem 0.7rem',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Padrão
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteStandard(standard)}
                        style={{
                          backgroundColor: '#dc2626',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <input
        id="templateUploadDirect"
        type="file"
        accept=".json,.pdf,.txt"
        style={{ display: 'none' }}
        onChange={handleModelUploadSelect}
      />

      <input
        id="technicalSummaryUploadDirect"
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleTechnicalSummaryUpload}
      />

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
          overflow: 'hidden',
          marginBottom: '1.5rem'
        }}
      >
        <div
          style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '1.2rem' }}>
                📄 Modelos Base ({templates.length})
              </h2>
              <button
                type="button"
                aria-label="Ajuda sobre modelos base"
                aria-expanded={showTemplatesHelp}
                onClick={() => setShowTemplatesHelp((prev) => !prev)}
                style={helpButtonStyle}
              >
                ?
              </button>
            </div>
            {showTemplatesHelp && (
              <div style={helpTextStyle}>
                Use esta area para trazer um `JSON` de template pronto ou um exemplo em `PDF/TXT`.
                Se for `JSON`, o sistema importa o template. Se for `PDF/TXT`, o sistema gera um modelo/template com IA e persiste para reutilizacao.
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {!selectedModelFile ? (
              <button
                onClick={() => document.getElementById('templateUploadDirect')?.click()}
                disabled={uploadingModel}
                style={{
                  backgroundColor: uploadingModel ? '#95a5a6' : '#8e44ad',
                  color: 'white',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: uploadingModel ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  opacity: uploadingModel ? 0.7 : 1,
                  whiteSpace: 'nowrap'
                }}
              >
                {uploadingModel ? '⏳ Processando...' : 'Buscar Modelo/Template'}
              </button>
            ) : (
              <>
                <span style={{ fontSize: '0.9rem', color: '#2c3e50', fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedModelFile.name}
                </span>
                <button
                  onClick={handleModelUploadProcess}
                  disabled={uploadingModel}
                  style={{
                    backgroundColor: uploadingModel ? '#95a5a6' : '#27ae60',
                    color: 'white',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: uploadingModel ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    opacity: uploadingModel ? 0.7 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {uploadingModel ? '⏳ Gerando...' : 'Gerar / Importar'}
                </button>
                <button
                  onClick={() => setSelectedModelFile(null)}
                  disabled={uploadingModel}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#e74c3c',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #e74c3c',
                    cursor: uploadingModel ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    opacity: uploadingModel ? 0.7 : 1
                  }}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {loadingTemplates ? (
            <div style={{ color: '#5f6b7a' }}>Carregando modelos...</div>
          ) : templates.length === 0 ? (
            <div style={{ color: '#5f6b7a' }}>
              Nenhum modelo encontrado ainda. Use `Buscar Modelo/Template` para adicionar o primeiro.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.9rem' }}>
              {templates.map((template) => (
                <div
                  key={template.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '1rem',
                    backgroundColor: '#fff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#2c3e50', marginBottom: '0.25rem' }}>
                        {template.name}
                      </div>
                      {template.description && (
                        <div style={{ color: '#5f6b7a', fontSize: '0.92rem' }}>{template.description}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        style={{
                          backgroundColor: '#dc2626',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
          overflow: 'hidden',
          marginBottom: '1.5rem'
        }}
      >
        <div
          style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '1.2rem' }}>
                🧾 JSONs de Resumo Técnico ({technicalSummaryExamples.length})
              </h2>
              <button
                type="button"
                aria-label="Ajuda sobre JSONs de resumo tecnico"
                aria-expanded={showTechnicalSummaryHelp}
                onClick={() => setShowTechnicalSummaryHelp((prev) => !prev)}
                style={helpButtonStyle}
              >
                ?
              </button>
            </div>
            {showTechnicalSummaryHelp && (
              <div style={helpTextStyle}>
                Use esta area para guardar JSONs de `Resumo Tecnico` que servem de base para a IA e devem aparecer no formulario `Configurar Memorial`.
                Esses JSONs ficam disponiveis como referencia e selecao posterior no combobox de resumo tecnico.
              </div>
            )}
          </div>
          <button
            onClick={() => document.getElementById('technicalSummaryUploadDirect')?.click()}
            disabled={uploadingTechnicalSummaryExample}
            style={{
              backgroundColor: uploadingTechnicalSummaryExample ? '#95a5a6' : '#8e44ad',
              color: 'white',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              cursor: uploadingTechnicalSummaryExample ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
              opacity: uploadingTechnicalSummaryExample ? 0.7 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            {uploadingTechnicalSummaryExample ? '⏳ Processando...' : 'Buscar JSON Resumo Tecnico'}
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {loadingTechnicalSummaryExamples ? (
            <div style={{ color: '#5f6b7a' }}>Carregando JSONs de resumo tecnico...</div>
          ) : technicalSummaryExamples.length === 0 ? (
            <div style={{ color: '#5f6b7a' }}>
              Nenhum JSON de resumo tecnico encontrado ainda. Use `Buscar JSON Resumo Tecnico` para adicionar o primeiro.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.9rem' }}>
              {technicalSummaryExamples.map((record) => (
                <div
                  key={record.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '1rem',
                    backgroundColor: '#fff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#2c3e50', marginBottom: '0.25rem' }}>
                        {record.fileName || record.analyzedFile}
                      </div>
                      <div style={{ color: '#5f6b7a', fontSize: '0.92rem' }}>
                        Importado em {new Date(record.createdAt).toLocaleString('pt-BR')}
                        {record.generatedAt ? ` • Gerado em ${new Date(record.generatedAt).toLocaleString('pt-BR')}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => void handleDeleteTechnicalSummaryExample(record)}
                      style={{
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigureTemplates;
