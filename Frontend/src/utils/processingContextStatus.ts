export type ProcessingContextAssessmentStatus = 'absent' | 'partial' | 'complete';

export interface ProcessingContextAssessmentNotice {
  id: string;
  title: string;
  message: string;
}

export interface ProcessingContextStatusDTO {
  status: ProcessingContextAssessmentStatus;
  hasBaseArea: boolean;
  hasOriginalProperty: boolean;
  hasRemainingArea: boolean;
  baseAreaPointCount: number;
  originalPropertyPointCount: number;
  remainingAreaPointCount: number;
  headline: string;
  detail: string;
  notices: ProcessingContextAssessmentNotice[];
}

export type ProcessingContextVisualTone = 'default' | 'inverse' | 'chip';

export interface ProcessingContextVisualTheme {
  border: string;
  background: string;
  title: string;
  body: string;
  badge: string;
  noticeBorder: string;
  noticeBackground: string;
  noticeTitle: string;
  noticeBody: string;
}

export interface ProcessingContextAssessment {
  status: ProcessingContextAssessmentStatus;
  hasBaseArea: boolean;
  hasOriginalProperty: boolean;
  hasRemainingArea: boolean;
  baseAreaPointCount: number;
  originalPropertyPointCount: number;
  remainingAreaPointCount: number;
  headline: string;
  detail: string;
  notices: ProcessingContextAssessmentNotice[];
}

interface BoundaryContextLike {
  vertices?: Array<unknown>;
  pointCount?: number;
}

interface ProcessingContextLike {
  baseArea?: BoundaryContextLike | null;
  originalProperty?: BoundaryContextLike | null;
  remainingArea?: BoundaryContextLike | null;
}

interface TechnicalSummaryLike {
  processingContext?: ProcessingContextLike | null;
}

const buildMissingJsonAssessment = (): ProcessingContextAssessment => ({
  status: 'absent',
  hasBaseArea: false,
  hasOriginalProperty: false,
  hasRemainingArea: false,
  baseAreaPointCount: 0,
  originalPropertyPointCount: 0,
  remainingAreaPointCount: 0,
  headline: 'Contexto territorial ausente',
  detail: 'O resumo tecnico nao contem processingContext valido para o contorno primario do terreno.',
  notices: [{
    id: 'missing-processing-context-json',
    title: 'Resumo sem processingContext',
    message: 'O resumo tecnico atual nao informa o contorno primario salvo em Operacoes. Revise se as Primarias foram realmente aplicadas antes do memorial.'
  }]
});

const buildInvalidJsonAssessment = (): ProcessingContextAssessment => ({
  status: 'absent',
  hasBaseArea: false,
  hasOriginalProperty: false,
  hasRemainingArea: false,
  baseAreaPointCount: 0,
  originalPropertyPointCount: 0,
  remainingAreaPointCount: 0,
  headline: 'Resumo tecnico invalido',
  detail: 'Nao foi possivel interpretar o JSON para avaliar o processingContext.',
  notices: [{
    id: 'invalid-summary-json',
    title: 'Resumo tecnico invalido',
    message: 'O JSON aplicado nao pode ser interpretado para validar o contexto territorial. Revise o resumo tecnico antes de seguir para o memorial.'
  }]
});

const coerceBoolean = (value: unknown): boolean => value === true;

const coerceCount = (value: unknown): number => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : 0
);

const normalizeNotice = (value: unknown): ProcessingContextAssessmentNotice | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const message = typeof candidate.message === 'string' ? candidate.message.trim() : '';

  if (!id || !title || !message) {
    return null;
  }

  return { id, title, message };
};

export const normalizeProcessingContextStatus = (value: unknown): ProcessingContextAssessment | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const status = typeof candidate.status === 'string'
    ? candidate.status.trim().toLowerCase()
    : '';

  if (status !== 'absent' && status !== 'partial' && status !== 'complete') {
    return null;
  }

  const headline = typeof candidate.headline === 'string' ? candidate.headline.trim() : '';
  const detail = typeof candidate.detail === 'string' ? candidate.detail.trim() : '';
  if (!headline || !detail) {
    return null;
  }

  const notices = Array.isArray(candidate.notices)
    ? candidate.notices
      .map((notice) => normalizeNotice(notice))
      .filter((notice): notice is ProcessingContextAssessmentNotice => Boolean(notice))
    : [];

  return {
    status,
    hasBaseArea: coerceBoolean(candidate.hasBaseArea),
    hasOriginalProperty: coerceBoolean(candidate.hasOriginalProperty),
    hasRemainingArea: coerceBoolean(candidate.hasRemainingArea),
    baseAreaPointCount: coerceCount(candidate.baseAreaPointCount),
    originalPropertyPointCount: coerceCount(candidate.originalPropertyPointCount),
    remainingAreaPointCount: coerceCount(candidate.remainingAreaPointCount),
    headline,
    detail,
    notices
  };
};

const readPointCount = (boundary: BoundaryContextLike | null | undefined): number => {
  if (!boundary) {
    return 0;
  }

  if (Array.isArray(boundary.vertices) && boundary.vertices.length > 0) {
    return boundary.vertices.length;
  }

  return typeof boundary.pointCount === 'number' && Number.isFinite(boundary.pointCount)
    ? boundary.pointCount
    : 0;
};

export const assessTechnicalSummaryProcessingContext = (summaryJson: string): ProcessingContextAssessment => {
  if (!summaryJson.trim()) {
    return buildMissingJsonAssessment();
  }

  try {
    const parsed = JSON.parse(summaryJson) as TechnicalSummaryLike;
    const processingContext = parsed?.processingContext;
    const baseAreaPointCount = readPointCount(processingContext?.baseArea);
    const originalPropertyPointCount = readPointCount(processingContext?.originalProperty);
    const remainingAreaPointCount = readPointCount(processingContext?.remainingArea);
    const hasBaseArea = baseAreaPointCount > 0;
    const hasOriginalProperty = originalPropertyPointCount > 0;
    const hasRemainingArea = remainingAreaPointCount > 0;

    if (!hasBaseArea && !hasOriginalProperty) {
      return {
        status: 'absent',
        hasBaseArea,
        hasOriginalProperty,
        hasRemainingArea,
        baseAreaPointCount,
        originalPropertyPointCount,
        remainingAreaPointCount,
        headline: 'Contexto territorial ausente',
        detail: 'O resumo tecnico foi gerado sem o contorno primario do terreno registrado no processingContext.',
        notices: [{
          id: 'missing-primary-boundary',
          title: 'Primarias ausentes no resumo',
          message: 'O memorial ainda pode ser gerado, mas sem o contorno primario salvo em Operacoes. Confirme se isso faz sentido para esta operacao.'
        }]
      };
    }

    if (!hasBaseArea && hasOriginalProperty) {
      return {
        status: 'partial',
        hasBaseArea,
        hasOriginalProperty,
        hasRemainingArea,
        baseAreaPointCount,
        originalPropertyPointCount,
        remainingAreaPointCount,
        headline: 'Contexto territorial parcial',
        detail: 'O resumo tecnico preservou o terreno original, mas sem a Area Total primaria registrada explicitamente no processingContext.',
        notices: [{
          id: 'missing-base-area',
          title: 'Area Total ausente',
          message: 'O resumo tecnico informa apenas o terreno original. Revise se as Primarias foram salvas antes de confiar no memorial final.'
        }]
      };
    }

    return {
      status: 'complete',
      hasBaseArea,
      hasOriginalProperty,
      hasRemainingArea,
      baseAreaPointCount,
      originalPropertyPointCount,
      remainingAreaPointCount,
      headline: 'Contexto territorial completo',
      detail: 'O resumo tecnico contem o contorno primario salvo em Operacoes no processingContext.',
      notices: []
    };
  } catch {
    return buildInvalidJsonAssessment();
  }
};

export const resolveTechnicalSummaryProcessingContext = (
  summaryJson: string,
  processingContextStatus?: unknown
): ProcessingContextAssessment => (
  normalizeProcessingContextStatus(processingContextStatus)
  ?? assessTechnicalSummaryProcessingContext(summaryJson)
);

export const getProcessingContextStatusLabels = (status: ProcessingContextAssessmentStatus) => {
  switch (status) {
    case 'complete':
      return {
        detailedBadge: 'Contexto Completo',
        compactBadge: 'Completo',
        listBadge: 'Contexto completo',
        snapshotState: 'completo'
      };
    case 'partial':
      return {
        detailedBadge: 'Contexto Parcial',
        compactBadge: 'Revisar',
        listBadge: 'Contexto parcial',
        snapshotState: 'pendente'
      };
    case 'absent':
    default:
      return {
        detailedBadge: 'Contexto Ausente',
        compactBadge: 'Ausente',
        listBadge: 'Contexto ausente',
        snapshotState: 'ausente'
      };
  }
};

export const getProcessingContextVisualTheme = (
  status: ProcessingContextAssessmentStatus,
  tone: ProcessingContextVisualTone = 'default'
): ProcessingContextVisualTheme => {
  if (tone === 'inverse') {
    switch (status) {
      case 'complete':
        return {
          border: 'rgba(134, 239, 172, 0.42)',
          background: 'rgba(240, 253, 244, 0.16)',
          title: 'rgba(220, 252, 231, 0.96)',
          body: 'rgba(220, 252, 231, 0.9)',
          badge: '#bbf7d0',
          noticeBorder: 'rgba(134, 239, 172, 0.24)',
          noticeBackground: 'rgba(255, 255, 255, 0.08)',
          noticeTitle: 'rgba(220, 252, 231, 0.96)',
          noticeBody: 'rgba(220, 252, 231, 0.9)'
        };
      case 'partial':
        return {
          border: 'rgba(252, 211, 77, 0.45)',
          background: 'rgba(255, 251, 235, 0.14)',
          title: 'rgba(254, 243, 199, 0.98)',
          body: 'rgba(254, 243, 199, 0.92)',
          badge: '#fde68a',
          noticeBorder: 'rgba(252, 211, 77, 0.24)',
          noticeBackground: 'rgba(255, 255, 255, 0.08)',
          noticeTitle: 'rgba(254, 243, 199, 0.98)',
          noticeBody: 'rgba(254, 243, 199, 0.92)'
        };
      case 'absent':
      default:
        return {
          border: 'rgba(252, 165, 165, 0.45)',
          background: 'rgba(254, 242, 242, 0.14)',
          title: 'rgba(254, 226, 226, 0.98)',
          body: 'rgba(254, 226, 226, 0.92)',
          badge: '#fecaca',
          noticeBorder: 'rgba(252, 165, 165, 0.24)',
          noticeBackground: 'rgba(255, 255, 255, 0.08)',
          noticeTitle: 'rgba(254, 226, 226, 0.98)',
          noticeBody: 'rgba(254, 226, 226, 0.92)'
        };
    }
  }

  if (tone === 'chip') {
    switch (status) {
      case 'complete':
        return {
          border: '#86efac',
          background: '#dcfce7',
          title: '#166534',
          body: '#166534',
          badge: '#166534',
          noticeBorder: '#86efac',
          noticeBackground: '#dcfce7',
          noticeTitle: '#166534',
          noticeBody: '#166534'
        };
      case 'partial':
        return {
          border: '#fcd34d',
          background: '#fffbeb',
          title: '#92400e',
          body: '#92400e',
          badge: '#92400e',
          noticeBorder: '#fcd34d',
          noticeBackground: '#fffbeb',
          noticeTitle: '#92400e',
          noticeBody: '#92400e'
        };
      case 'absent':
      default:
        return {
          border: '#fca5a5',
          background: '#fee2e2',
          title: '#991b1b',
          body: '#991b1b',
          badge: '#991b1b',
          noticeBorder: '#fca5a5',
          noticeBackground: '#fee2e2',
          noticeTitle: '#991b1b',
          noticeBody: '#991b1b'
        };
    }
  }

  switch (status) {
    case 'complete':
      return {
        border: '#86efac',
        background: '#f0fdf4',
        title: '#166534',
        body: '#166534',
        badge: '#15803d',
        noticeBorder: 'rgba(22, 101, 52, 0.18)',
        noticeBackground: 'rgba(255,255,255,0.78)',
        noticeTitle: '#166534',
        noticeBody: '#166534'
      };
    case 'partial':
      return {
        border: '#fcd34d',
        background: '#fffbeb',
        title: '#92400e',
        body: '#78350f',
        badge: '#b45309',
        noticeBorder: 'rgba(180, 83, 9, 0.18)',
        noticeBackground: 'rgba(255,255,255,0.78)',
        noticeTitle: '#92400e',
        noticeBody: '#78350f'
      };
    case 'absent':
    default:
      return {
        border: '#fca5a5',
        background: '#fef2f2',
        title: '#b91c1c',
        body: '#991b1b',
        badge: '#dc2626',
        noticeBorder: 'rgba(220, 38, 38, 0.18)',
        noticeBackground: 'rgba(255,255,255,0.78)',
        noticeTitle: '#b91c1c',
        noticeBody: '#991b1b'
      };
  }
};
