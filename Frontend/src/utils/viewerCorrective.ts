export type ViewerMode = 'view' | 'correct';
export type CorrectiveTool = 'inspect' | 'move-vertex' | 'join-endpoints' | 'close-gap-guided';
export type SuggestionConfidence = 'alta' | 'media' | 'baixa';

interface TechnicalValidationView {
  statusGeral?: string;
  pendencias?: string[];
  bloqueantes?: string[];
  avisos?: string[];
}

interface TechnicalSummaryLotView {
  lotNumber: number;
  validacaoTecnica?: TechnicalValidationView;
}

interface TechnicalSummaryDocumentView {
  lots?: TechnicalSummaryLotView[];
}

export interface CorrectiveIssueView {
  id: string;
  lotNumber: number;
  code: string;
  severity: 'BLOQUEANTE' | 'AVISO';
  message: string;
  statusLabel: string;
  detectionSource?: 'direct' | 'face' | 'anchor';
}

export const parseIssueCode = (issue: string): string => {
  const [rawCode] = issue.split(':');
  return rawCode?.trim() || 'PENDENCIA_TECNICA';
};

export const formatIssueCodeLabel = (issueCode: string): string =>
  issueCode
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

export const parseTechnicalSummaryIssues = (summaryJson: string): CorrectiveIssueView[] => {
  if (!summaryJson.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(summaryJson) as TechnicalSummaryDocumentView;
    const issues: CorrectiveIssueView[] = [];

    (parsed.lots || []).forEach((lot) => {
      const lotNumber = Number(lot.lotNumber);
      if (!Number.isFinite(lotNumber)) {
        return;
      }

      const validation = lot.validacaoTecnica;
      const statusLabel = validation?.statusGeral || 'SEM_STATUS';

      (validation?.bloqueantes || []).forEach((issue, index) => {
        const code = parseIssueCode(issue);
        issues.push({
          id: `lot-${lotNumber}-blocking-${code}-${index}`,
          lotNumber,
          code,
          severity: 'BLOQUEANTE',
          message: issue,
          statusLabel
        });
      });

      (validation?.avisos || []).forEach((issue, index) => {
        const code = parseIssueCode(issue);
        issues.push({
          id: `lot-${lotNumber}-warning-${code}-${index}`,
          lotNumber,
          code,
          severity: 'AVISO',
          message: issue,
          statusLabel
        });
      });
    });

    return issues;
  } catch (error) {
    console.error('Erro ao interpretar technicalSummaryJson para o modo corretivo:', error);
    return [];
  }
};

export const formatCorrectiveToolLabel = (tool: CorrectiveTool): string => {
  switch (tool) {
    case 'move-vertex':
      return 'Mover vertice';
    case 'join-endpoints':
      return 'Unir pontas';
    case 'close-gap-guided':
      return 'Fechar lacuna';
    default:
      return 'Inspecionar';
  }
};

export const getSuggestionConfidenceColor = (confidence: SuggestionConfidence): string => {
  switch (confidence) {
    case 'alta':
      return '#166534';
    case 'media':
      return '#9a3412';
    default:
      return '#475569';
  }
};

export const getCorrectiveToolHelpText = (tool: CorrectiveTool): string => {
  switch (tool) {
    case 'move-vertex':
      return 'Clique em um vertice do lote e depois em um ponto de snap.';
    case 'join-endpoints':
      return 'Clique em duas pontas do lote para unir as extremidades.';
    case 'close-gap-guided':
      return 'Clique em duas pontas do lote para fechar a lacuna guiada.';
    default:
      return 'Use este modo para navegar pelas pendencias e escolher o lote.';
  }
};

export const getCorrectiveToolImpactText = (tool: CorrectiveTool): string => {
  switch (tool) {
    case 'join-endpoints':
      return 'Fecha a lacuna entre vertices (conecta pontas).';
    case 'close-gap-guided':
      return 'Fecha a lacuna entre arestas proximas (ajuste guiado).';
    case 'move-vertex':
      return 'Realinha um vertice para reduzir erro de geometria.';
    default:
      return 'Inspecao sem alteracao automatica.';
  }
};
