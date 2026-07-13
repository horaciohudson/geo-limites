import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loading from '@/components/Loading';
import GenerationProgress from '@/components/GenerationProgress';
import { useDocumentGenerationState } from '@/hooks/useDocumentGenerationState';
import { useDocumentGenerationActions } from '@/hooks/useDocumentGenerationActions';
import type { MemorialStandard } from '@/types/memorial-standard';
import type { AsyncPropertyData } from '@/services/polling-memorial';
import type { FileMetadata, TemplateOption } from '@/types';
import { useFileContext } from '@/contexts/FileContext';
import { useOperationContext } from '@/contexts/OperationContext';
import {
  SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY,
  SELECTED_TEMPLATE_BY_PROPERTY_KEY,
  getPropertyScopedValue,
} from '@/utils/operationContext';
import {
  buildCurrentTechnicalSummarySelectionValue,
  getAppliedTechnicalSummarySelection,
  getStoredTechnicalSummary,
  parseAppliedTechnicalSummarySelection,
  setAppliedTechnicalSummarySelection
} from '@/utils/technicalSummaryStorage';

const loadJsPdf = async () => (await import('jspdf')).default;

interface PropertySelection extends AsyncPropertyData {
  id: string;
  propertyId?: string;
}

interface StoredTemplateSelection {
  template_id?: string;
  name?: string;
  descricao?: string;
  backendTemplateId?: string;
}

interface ErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

const parseStoredTemplateSelectionId = (rawValue: string | null): string => {
  if (!rawValue) {
    return '';
  }

  try {
    const parsedTemplate = JSON.parse(rawValue) as unknown;

    if (typeof parsedTemplate === 'string') {
      return parsedTemplate.trim();
    }

    if (parsedTemplate && typeof parsedTemplate === 'object' && !Array.isArray(parsedTemplate)) {
      const templateRecord = parsedTemplate as { template_id?: unknown; name?: unknown };
      if (typeof templateRecord.template_id === 'string' && templateRecord.template_id.trim()) {
        return templateRecord.template_id.trim();
      }
      if (typeof templateRecord.name === 'string' && templateRecord.name.trim()) {
        return templateRecord.name.trim();
      }
    }
  } catch (error) {
    console.error('❌ Erro ao interpretar template salvo do memorial:', error);
  }

  return '';
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const errorLike = error as ErrorLike;
    return errorLike.response?.data?.message || errorLike.message || fallback;
  }

  return fallback;
};

const normalizeMemorialText = (content: string): string =>
  content
    .replace(/“|”/g, '')
    .replace(/"/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const deduplicateLeadingMemorialHeaders = (content: string): string => {
  const normalized = normalizeMemorialText(content);
  const headerPattern =
    /(^|\n)(Memorial Descritivo\s*\n(?:Projeto:.*\n)?(?:Arquivo:.*\n)?(?:Data:.*\n)?(?:Metodo:.*(?:\n|$))?)/gi;
  const headers = Array.from(normalized.matchAll(headerPattern), (match) => match[2]?.trim()).filter(Boolean);

  if (headers.length <= 1) {
    return normalized;
  }

  const preferredHeader = headers[headers.length - 1];
  const contentWithoutHeaders = normalized
    .replace(headerPattern, (_, prefix) => prefix || '')
    .replace(/^\s+/, '');

  return [preferredHeader, contentWithoutHeaders]
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const TECHNICAL_SUMMARY_STORAGE_PREFIX = 'technicalSummaryJson:';

const hasFileScopedTechnicalSummary = (fileId?: string | null): boolean => {
  if (!fileId?.trim()) {
    return false;
  }

  const storedValue = localStorage.getItem(`${TECHNICAL_SUMMARY_STORAGE_PREFIX}${fileId.trim()}`);
  return Boolean(storedValue && storedValue.trim());
};

const buildVirtualSourceFile = (fileId: string, analyzedFile: string): FileMetadata => {
  const fallbackName = analyzedFile.trim() || 'ResumoTecnico.dxf';
  const nowIso = new Date().toISOString();

  return {
    id: fileId,
    originalName: fallbackName,
    storedName: fallbackName,
    extension: fallbackName.split('.').pop()?.toLowerCase() || 'dxf',
    contentType: 'application/dxf',
    sizeBytes: 0,
    createdAt: nowIso,
    updatedAt: nowIso
  };
};

const buildVirtualAppliedSummaryFile = (
  selectionKind: 'current' | 'example' | null,
  sourceFileId: string,
  analyzedFile: string
): FileMetadata | null => {
  if (!selectionKind) {
    return null;
  }

  if (selectionKind === 'example') {
    return buildVirtualSourceFile(
      sourceFileId || 'applied-technical-summary-example',
      analyzedFile || 'ResumoTecnicoBase.json'
    );
  }

  if (sourceFileId) {
    return buildVirtualSourceFile(sourceFileId, analyzedFile || 'ResumoTecnicoAtual.dxf');
  }

  return null;
};

const Memorial: React.FC = () => {
  const navigate = useNavigate();
  const { selectedFiles } = useFileContext();
  const {
    selectedProperty,
    activePropertyId,
  } = useOperationContext();
  
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para normas e templates
  const [selectedNorms, setSelectedNorms] = useState<MemorialStandard[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [propertyData, setPropertyData] = useState<PropertySelection | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  const {
    memorial,
    memorialError,
    isGeneratingMemorial,
    memorialTimeElapsed,
    generationProgress,
    memorialCurrentStep,
    setMemorial,
    setMemorialError,
    beginGeneration,
    updateGeneration,
    completeGeneration,
    failGeneration
  } = useDocumentGenerationState();

  const currentFile = files[currentFileIndex] || files[0] || null;
  const candidatePropertyIds = [
    activePropertyId,
    selectedProperty?.propertyId,
    selectedProperty?.id
  ].filter((value, index, self): value is string => typeof value === 'string' && value.trim().length > 0 && self.indexOf(value) === index);
  const persistedNorms = candidatePropertyIds
    .map((propertyId) => getPropertyScopedValue<MemorialStandard[]>(SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY, propertyId))
    .find((norms): norms is MemorialStandard[] => Array.isArray(norms) && norms.length > 0)
    || (() => {
      try {
        const savedNorms = localStorage.getItem('selectedMemorialNorms');
        if (!savedNorms) {
          return null;
        }

        const parsedNorms = JSON.parse(savedNorms) as unknown;
        return Array.isArray(parsedNorms) ? parsedNorms as MemorialStandard[] : null;
      } catch {
        return null;
      }
    })();
  const persistedTemplateSelection = candidatePropertyIds
    .map((propertyId) => getPropertyScopedValue<StoredTemplateSelection>(SELECTED_TEMPLATE_BY_PROPERTY_KEY, propertyId))
    .find((template): template is StoredTemplateSelection => Boolean(template))
    || (() => {
      try {
        const savedTemplate = localStorage.getItem('selectedTemplate');
        if (!savedTemplate) {
          return null;
        }

        return JSON.parse(savedTemplate) as StoredTemplateSelection;
      } catch {
        return null;
      }
    })();
  const currentNorm = selectedNorms[0] || persistedNorms?.[0] || null;
  const currentTemplateName = (
    selectedTemplate?.name?.trim()
    || persistedTemplateSelection?.name?.trim()
    || persistedTemplateSelection?.template_id?.trim()
    || ''
  );
  const currentTemplateDescription = (
    selectedTemplate?.description?.trim()
    || persistedTemplateSelection?.descricao?.trim()
    || ''
  );
  const scopedTechnicalSummaryCandidates = candidatePropertyIds.map((propertyId) => ({
    propertyId,
    storedTechnicalSummary: getStoredTechnicalSummary(propertyId),
    appliedSelection: parseAppliedTechnicalSummarySelection(getAppliedTechnicalSummarySelection(propertyId))
  }));
  const preferredScopedSelectionCandidate = scopedTechnicalSummaryCandidates.find(
    (candidate) => Boolean(candidate.appliedSelection)
  ) || scopedTechnicalSummaryCandidates.find(
    (candidate) => Boolean(candidate.storedTechnicalSummary)
  ) || null;
  const scopedStoredTechnicalSummary = preferredScopedSelectionCandidate?.storedTechnicalSummary
    || scopedTechnicalSummaryCandidates.find(
      (candidate) => Boolean(candidate.storedTechnicalSummary)
    )?.storedTechnicalSummary
    || null;
  const globalStoredTechnicalSummary = getStoredTechnicalSummary();
  const storedTechnicalSummary = scopedStoredTechnicalSummary || globalStoredTechnicalSummary;
  const scopedAppliedTechnicalSummarySelection = preferredScopedSelectionCandidate?.appliedSelection || null;
  const globalAppliedTechnicalSummarySelection = parseAppliedTechnicalSummarySelection(
    getAppliedTechnicalSummarySelection()
  );
  const promotedCurrentSelection = (
    (() => {
      if (scopedAppliedTechnicalSummarySelection || globalAppliedTechnicalSummarySelection) {
        return null;
      }

      const selectedFileWithSummary = selectedFiles.find((selectedFile) => hasFileScopedTechnicalSummary(selectedFile.id)) || null;
      const effectiveCurrentFileId = (
        scopedStoredTechnicalSummary?.sourceFileId?.trim()
        || storedTechnicalSummary?.sourceFileId?.trim()
        || selectedFileWithSummary?.id
        || ''
      );

      if (!effectiveCurrentFileId) {
        return null;
      }

      return parseAppliedTechnicalSummarySelection(
        buildCurrentTechnicalSummarySelectionValue(effectiveCurrentFileId)
      );
    })()
  );
  const appliedTechnicalSummarySelection = scopedAppliedTechnicalSummarySelection
    || globalAppliedTechnicalSummarySelection
    || promotedCurrentSelection;
  const appliedSelectionKind = appliedTechnicalSummarySelection?.kind || null;
  const selectedFileWithScopedTechnicalSummary = selectedFiles.find(
    (selectedFile) => hasFileScopedTechnicalSummary(selectedFile.id)
  ) || null;
  const effectiveCurrentSummaryFileId = (
    promotedCurrentSelection?.fileId?.trim()
    || scopedStoredTechnicalSummary?.sourceFileId?.trim()
    || storedTechnicalSummary?.sourceFileId?.trim()
    || selectedFileWithScopedTechnicalSummary?.id
    || ''
  );
  const hasEffectiveCurrentTechnicalSummary = Boolean(
    storedTechnicalSummary?.summaryJson?.trim()
    || (effectiveCurrentSummaryFileId && hasFileScopedTechnicalSummary(effectiveCurrentSummaryFileId))
  );
  const effectiveTechnicalSummaryScopeId = candidatePropertyIds[0] || null;
  const effectiveAppliedSelectionKind = appliedSelectionKind || (hasEffectiveCurrentTechnicalSummary ? 'current' : null);
  const explicitAppliedSourceFileId = (
    appliedTechnicalSummarySelection?.kind === 'current' && appliedTechnicalSummarySelection.fileId?.trim()
      ? appliedTechnicalSummarySelection.fileId.trim()
      : appliedTechnicalSummarySelection?.kind === 'example' && appliedTechnicalSummarySelection.exampleId?.trim()
        ? `example:${appliedTechnicalSummarySelection.exampleId.trim()}`
        : ''
  );
  const appliedSourceFileId = (
    effectiveAppliedSelectionKind === 'example'
      ? explicitAppliedSourceFileId
      : effectiveCurrentSummaryFileId
    || (
      appliedTechnicalSummarySelection?.kind === 'current' && appliedTechnicalSummarySelection.fileId?.trim()
        ? appliedTechnicalSummarySelection.fileId.trim()
        : storedTechnicalSummary?.sourceFileId?.trim() || (storedTechnicalSummary ? 'stored-technical-summary' : '')
    )
  );
  const appliedSourceFileName = (
    selectedFiles.find((selectedFile) => selectedFile.id === appliedSourceFileId)?.originalName?.trim()
    || storedTechnicalSummary?.analyzedFile?.trim()
    || ''
  );
  const missingConfigurationItems = [
    !currentNorm ? 'Norma' : null,
    !currentTemplateName ? 'Template selecionado' : null,
    !currentTemplateDescription ? 'Modelo base' : null
  ].filter((item): item is string => Boolean(item));
  const {
    generateMemorial: generateStableMemorial
  } = useDocumentGenerationActions({
    file: currentFile,
    files,
    currentFileIndex,
    dxfData: null,
    selectedProperty: propertyData,
    activePropertyId,
    setCurrentFileIndex,
    setMemorialError,
    beginGeneration,
    updateGeneration,
    completeGeneration,
    failGeneration,
    getErrorMessage
  });

  useEffect(() => {
    const currentProperty = selectedProperty as PropertySelection | null;
    setPropertyData(currentProperty);
  }, [activePropertyId, selectedProperty]);

  useEffect(() => {
    if (
      !hasEffectiveCurrentTechnicalSummary
      || !effectiveCurrentSummaryFileId
      || appliedTechnicalSummarySelection?.kind === 'example'
    ) {
      return;
    }

    const promotedSelectionValue = buildCurrentTechnicalSummarySelectionValue(effectiveCurrentSummaryFileId);
    if (appliedTechnicalSummarySelection?.rawValue === promotedSelectionValue) {
      return;
    }

    setAppliedTechnicalSummarySelection(promotedSelectionValue, effectiveTechnicalSummaryScopeId);
  }, [
    appliedTechnicalSummarySelection?.rawValue,
    appliedTechnicalSummarySelection?.kind,
    effectiveCurrentSummaryFileId,
    effectiveTechnicalSummaryScopeId,
    hasEffectiveCurrentTechnicalSummary,
    storedTechnicalSummary
  ]);

  useEffect(() => {
    if (!memorial) {
      return;
    }

    const normalizedMemorial = deduplicateLeadingMemorialHeaders(memorial);
    if (normalizedMemorial !== memorial) {
      setMemorial(normalizedMemorial);
    }
  }, [memorial, setMemorial]);

  // Removido carregamento automático da norma padrão para evitar erros quando backend não disponível
  // useEffect(() => {
  //   const loadDefaultStandard = async () => {
  //     try {
  //       const defaultNorm = await memorialStandardsService.getDefault();
  //       if (defaultNorm) {
  //         setDefaultStandard(defaultNorm);
  //           //       } else {
  //       }
  //     } catch (error) {
  //       console.error('❌ Erro ao carregar norma padrão:', error);
  //     }
  //   };

  //   loadDefaultStandard();
  // }, []);

  // Carregar normas e templates do localStorage
  useEffect(() => {
    try {
      // Carregar normas selecionadas
      const scopedNorms = getPropertyScopedValue<MemorialStandard[]>(SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY, activePropertyId);
      const savedNorms = scopedNorms ? JSON.stringify(scopedNorms) : localStorage.getItem('selectedMemorialNorms');
            
      if (savedNorms) {
        const parsedNorms = JSON.parse(savedNorms);
                        setSelectedNorms(parsedNorms);
              } else {
              }

      // Carregar template selecionado
      const scopedTemplate = getPropertyScopedValue<StoredTemplateSelection>(SELECTED_TEMPLATE_BY_PROPERTY_KEY, activePropertyId);
      const savedTemplateRaw = scopedTemplate ? JSON.stringify(scopedTemplate) : localStorage.getItem('selectedTemplate');
      if (savedTemplateRaw) {
        let parsedTemplate: StoredTemplateSelection | null = null;

        try {
          parsedTemplate = JSON.parse(savedTemplateRaw) as StoredTemplateSelection | null;
        } catch {
          parsedTemplate = {
            template_id: savedTemplateRaw
          };
        }

        const selectedTemplateId = parseStoredTemplateSelectionId(savedTemplateRaw);

        // Buscar o template completo pelo ID
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
        
        const foundTemplate = templateIndex.find(t => t.id === selectedTemplateId);
        if (foundTemplate) {
          setSelectedTemplate(foundTemplate);
        } else if (parsedTemplate && selectedTemplateId) {
          setSelectedTemplate({
            id: selectedTemplateId,
            name: parsedTemplate.name || parsedTemplate.template_id || selectedTemplateId,
            description: parsedTemplate.descricao
          });
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados do localStorage:', error);
    }
  }, [activePropertyId]);

  const loadSourceFiles = async (): Promise<FileMetadata[]> => {
    try {
      setIsLoading(true);
      setError('');
      const fileFromSelection = appliedSourceFileId
        ? selectedFiles.find((selectedFile) => selectedFile.id === appliedSourceFileId) || null
        : null;
      const fallbackSelectedFile = selectedFiles[0] || null;
      const virtualAppliedSummaryFile = buildVirtualAppliedSummaryFile(
        effectiveAppliedSelectionKind,
        appliedSourceFileId,
        appliedSourceFileName
      );
      const resolvedFile = (
        effectiveAppliedSelectionKind === 'example'
          ? virtualAppliedSummaryFile
          : fileFromSelection
      )
        || (effectiveCurrentSummaryFileId
          ? selectedFiles.find((selectedFile) => selectedFile.id === effectiveCurrentSummaryFileId) || null
          : null)
        || fallbackSelectedFile
        || virtualAppliedSummaryFile;
      const loadedFiles = resolvedFile ? [resolvedFile] : [];

      if (loadedFiles.length === 0) {
        setFiles([]);
        return [];
      }

      setFiles(loadedFiles);

      setError('');
      return loadedFiles;
    } catch (err: unknown) {
      console.error('Erro ao carregar arquivos:', err);
      setFiles([]);
      setError(getErrorMessage(err, 'Erro ao carregar arquivos'));
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const generateMemorial = async () => {
    setMemorial('');
    setMemorialError('');

    if (missingConfigurationItems.length > 0) {
      setMemorialError(
        `Revise "Operacao > Configurar Memorial". Falta configurar: ${missingConfigurationItems.join(', ')}.`
      );
      return;
    }

    const resolvedFiles = files.length > 0 ? files : await loadSourceFiles();
    const currentFiles = resolvedFiles.length > 0 ? resolvedFiles : files;

    if (currentFiles.length === 0) {
      setMemorialError('Nenhum Resumo Tecnico aplicado foi encontrado para este memorial. Em "Operacao > Configurar Memorial", selecione o JSON desejado e clique em "Aplicar Escolhas".');
      return;
    }

    try {
      const standardIdToUse = currentNorm?.id || '';
            
      // Validar se é um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(standardIdToUse)) {
        console.error('❌ ERRO: standardId não é um UUID válido:', standardIdToUse);
        setMemorialError('❌ ERRO: ID da norma inválido. Ajuste a selecao em "Operacao > Configurar Memorial" ou revise o cadastro em "Configuracao".');
        return;
      }

      setCurrentFileIndex(0);
      await generateStableMemorial(null, currentFiles[0] || null);

    } catch (err: unknown) {
      console.error('❌ Erro ao iniciar geração do memorial:', err);
      setMemorialError(getErrorMessage(err, 'Erro ao iniciar geração do memorial'));
    }
  };

  const downloadPDF = async () => {
    if (!memorial) return;

    const JsPdf = await loadJsPdf();
    const pdf = new JsPdf();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    const hasDocumentHeader = /^\s*Memorial Descritivo\b/i.test(memorial);
    let yPosition = 20;

    if (!hasDocumentHeader) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MEMORIAL DESCRITIVO', pageWidth / 2, 30, { align: 'center' });

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      yPosition = 50;

      const resolvedProjectName = propertyData?.name || propertyData?.registrationNumber || files[0]?.originalName || '';

      if (resolvedProjectName) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Projeto:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(resolvedProjectName, margin + 25, yPosition);
        yPosition += 10;
      }

      if (files.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Arquivos:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        const fileNames = files.map(f => f.originalName).join(', ');
        const fileLines = pdf.splitTextToSize(fileNames, maxWidth - 25);
        pdf.text(fileLines, margin + 25, yPosition);
        yPosition += fileLines.length * 5 + 5;
      }

      yPosition += 10;
    }

    // Conteúdo do memorial
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(memorial, maxWidth);
    
    for (let i = 0; i < lines.length; i++) {
      if (yPosition > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(lines[i], margin, yPosition);
      yPosition += 5;
    }

    // Nome do arquivo
    const fileName = `Memorial_Descritivo_${propertyData?.name || propertyData?.registrationNumber || 'Projeto'}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  const copyToClipboard = async () => {
    if (!memorial) return;
    
    try {
      await navigator.clipboard.writeText(memorial);
      // Aqui você pode adicionar uma notificação de sucesso
          } catch (err) {
      console.error('Erro ao copiar para área de transferência:', err);
    }
  };

  const pageStyle = {
    minHeight: '100vh',
    overflow: 'auto',
    backgroundColor: '#f4f7fb',
    padding: '1.5rem'
  };

  const heroCardStyle = {
    background: 'linear-gradient(135deg, #ffffff 0%, #eef5ff 100%)',
    border: '1px solid #d8e5f5',
    borderRadius: '18px',
    padding: '1.5rem 1.75rem',
    marginBottom: '1.25rem',
    boxShadow: '0 10px 30px rgba(44, 62, 80, 0.08)'
  };

  const panelStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e3ebf5',
    borderRadius: '16px',
    padding: '1.25rem',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)'
  };

  const smallCardStyle = {
    backgroundColor: '#f8fbff',
    border: '1px solid #dbe7f3',
    borderRadius: '12px',
    padding: '0.9rem 1rem'
  };

  if (isLoading) {
    return (
      <div className="memorial-page">
        <div className="memorial-loading">
          <Loading />
          <p>Carregando o arquivo-fonte do Resumo Tecnico...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="memorial-page">
        <div className="memorial-error">
          <h2>Erro</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="btn-back">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="memorial-page" style={pageStyle}>
      <div style={heroCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5f6b7a', marginBottom: '0.4rem' }}>
              Fechamento do Memorial
            </div>
            <h1 style={{ margin: 0, fontSize: '2rem', color: '#1f2d3d' }}>
              MEMORIAL
            </h1>
            <p style={{ margin: '0.65rem 0 0 0', maxWidth: '760px', color: '#51606f', lineHeight: 1.6 }}>
              Confira o contexto do trabalho, gere o memorial a partir do Resumo Tecnico aplicado e revise o texto final antes de exportar.
            </p>
          </div>
          <div style={{ ...smallCardStyle, minWidth: '220px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#5f6b7a', marginBottom: '0.35rem' }}>
              Estado Atual
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1f2d3d' }}>
              {memorial
                  ? 'Memorial gerado'
                  : isGeneratingMemorial
                    ? 'Gerando memorial'
                    : 'Aguardando geracao'}
            </div>
          </div>
        </div>
      </div>

      <div className="memorial-info" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.9fr)', gap: '1.25rem', alignItems: 'start' }}>
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#223548' }}>
            Contexto do trabalho
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
            <div style={smallCardStyle}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5f6b7a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Imovel ativo</div>
              <div style={{ fontSize: '0.98rem', color: '#1f2d3d', fontWeight: 600 }}>{propertyData?.registrationNumber || propertyData?.name || 'Nao confirmado'}</div>
            </div>
          </div>

          <div className="project-info" style={{ ...smallCardStyle, backgroundColor: '#ffffff' }}>
            <h3 style={{ margin: '0 0 0.85rem 0', color: '#223548' }}>Informacoes do trabalho</h3>
            <p><strong>Projeto:</strong> {propertyData?.name || propertyData?.registrationNumber || 'Nao especificado'}</p>
            <p><strong>Base do memorial:</strong> {propertyData?.registrationNumber || propertyData?.name || 'Nao confirmada'}</p>

            {propertyData && (
              <div className="property-info" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e6edf5' }}>
                <h4 style={{ margin: '0 0 0.65rem 0', color: '#223548' }}>Apresentacao do imovel ativo</h4>
                <p>
                  <strong>Imovel ativo:</strong>{' '}
                  {propertyData.registrationNumber || 'Sem registro'} - {propertyData.name || 'Sem nome'}
                  {propertyData.city ? ` (${propertyData.city})` : ''}
                </p>
                <p><strong>Registro:</strong> {propertyData.registrationNumber}</p>
                <p><strong>Nome:</strong> {propertyData.name}</p>
                <p><strong>Endereco:</strong> {propertyData.street}, {propertyData.number} - {propertyData.neighborhood}</p>
                <p><strong>Cidade:</strong> {propertyData.city} - {propertyData.state}</p>
                <p><strong>Proprietario:</strong> {propertyData.ownerName}</p>
                <p><strong>Documento:</strong> {propertyData.ownerDocument}</p>
              </div>
            )}

            {!propertyData && (
              <div className="no-property-warning" style={{ marginTop: '1rem', backgroundColor: '#fff8f1', border: '1px solid #f0d7bb', borderRadius: '12px', padding: '1rem' }}>
                <p>⚠️ <strong>Nenhum imovel foi confirmado para este trabalho.</strong></p>
                <p>Volte em "Preparacao {'>'} Imoveis" para selecionar ou cadastrar a base do memorial.</p>
                <button
                  onClick={() => navigate('/property-register')}
                  className="btn-register-property"
                >
                  Ir para Imoveis
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="norms-templates" style={{ display: 'grid', gap: '1rem' }}>
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 0.9rem 0', color: '#223548' }}>Acao principal</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={smallCardStyle}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#5f6b7a', textTransform: 'uppercase', marginBottom: '0.25rem' }}>1. Gerar</div>
                <div style={{ color: '#334155' }}>Monte ou atualize o memorial usando apenas o Resumo Tecnico aplicado.</div>
              </div>
              <div style={smallCardStyle}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#5f6b7a', textTransform: 'uppercase', marginBottom: '0.25rem' }}>2. Revisar</div>
                <div style={{ color: '#334155' }}>Confira o texto e a coerencia do documento antes da saida final.</div>
              </div>
              <div style={smallCardStyle}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#5f6b7a', textTransform: 'uppercase', marginBottom: '0.25rem' }}>3. Exportar</div>
                <div style={{ color: '#334155' }}>Baixe o PDF ou copie o texto final quando a revisao estiver concluida.</div>
              </div>
            </div>
            <button
              onClick={generateMemorial}
              disabled={isGeneratingMemorial}
              className="btn-regenerate"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {isGeneratingMemorial ? 'Gerando Memorial...' : 'Gerar Memorial'}
            </button>

            {(memorialError || memorialCurrentStep) && (
              <div
                style={{
                  marginTop: '0.85rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: memorialError ? '1px solid #efc3c3' : '1px solid #dbe7f3',
                  backgroundColor: memorialError ? '#fff5f5' : '#f8fbff',
                  color: memorialError ? '#8a2d2d' : '#334155'
                }}
              >
                <strong>{memorialError ? 'Status da geracao:' : 'Ultima atualizacao:'}</strong>{' '}
                {memorialError || memorialCurrentStep}
              </div>
            )}
          </div>

        </div>
      </div>

      <GenerationProgress
        isGenerating={isGeneratingMemorial}
        progress={generationProgress}
        currentStep={memorialCurrentStep}
        timeElapsed={memorialTimeElapsed}
      />

      {memorialError && (
        <div className="memorial-error">
          <p>Erro: {memorialError}</p>
        </div>
      )}

      {memorial && (
        <div className="memorial-content" style={{ ...panelStyle, marginTop: '1.25rem' }}>
          <div
            style={{
              backgroundColor: '#f6fbf7',
              border: '1px solid #cfe9d6',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1rem'
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f6f43' }}>
              Resultado pronto para revisao e saida
            </h3>
            <p style={{ margin: 0, color: '#45645a' }}>
              Revise o texto abaixo. Quando estiver satisfeito, use as acoes de saida para baixar o PDF ou copiar o conteudo final.
            </p>
          </div>

          <div className="memorial-actions">
            <button onClick={downloadPDF} className="btn-download">
              💾 Baixar PDF Final
            </button>
            <button onClick={copyToClipboard} className="btn-copy">
              📋 Copiar Texto Final
            </button>
          </div>

          <div className="memorial-text" style={{ maxHeight: '60vh', overflow: 'auto', border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
            <h3>Memorial Gerado</h3>
            <div className="memorial-body">
              {memorial.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="memorial-footer" style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-start' }}>
        <button onClick={() => navigate(-1)} className="btn-back">
          Voltar ao Fluxo
        </button>
      </div>
    </div>
  );
};

export default Memorial;
