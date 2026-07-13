import React, { useState, useMemo } from 'react';
import ProcessingContextBanner from '@/components/ProcessingContextBanner';
import {
  saveTechnicalSummaryJson,
  saveTechnicalSummaryPdf,
  saveTechnicalSummaryText
} from '@/utils/technicalSummaryExport';
import {
  resolveTechnicalSummaryProcessingContext,
  type ProcessingContextStatusDTO
} from '@/utils/processingContextStatus';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface TechnicalVertex {
  originalIndex?: number;
  label?: string;
  orderNumber?: number;
  easting?: number;
  northing?: number;
  x?: number;
  y?: number;
}

interface TechnicalSide {
  sideIndex: number;
  startLabel?: string;
  endLabel?: string;
  length?: number;
  direction?: string;
  technicalBearing?: string;
  reference?: string;
  referenceSource?: string;
  reason?: string;
}

interface LotSummary {
  lotNumber: number;
  area?: number;
  perimeter?: number;
  isCornerLot?: boolean;
  hasDualFrontage?: boolean;
  hasGeoreferencedVertices?: boolean;
  streetFrontages?: string[];
  pointOrder?: string[];
  vertices?: TechnicalVertex[];
  sides?: TechnicalSide[];
  consolidatedConfrontations?: {
    NORTE?: ConfrontationEntry | string;
    SUL?: ConfrontationEntry | string;
    LESTE?: ConfrontationEntry | string;
    OESTE?: ConfrontationEntry | string;
  };
  validacaoTecnica?: TechnicalValidation;
}

interface ConfrontationEntry {
  referencia?: string | null;
  status?: string | null;
}

interface TechnicalValidation {
  aprovado?: boolean;
  statusGeral?: 'APROVADO' | 'APROVADO_COM_RESSALVAS' | 'PENDENTE' | string;
  pendencias?: string[];
  bloqueantes?: string[];
  avisos?: string[];
}

interface TechnicalSummaryDocument {
  documentType?: string;
  generatedAt?: string;
  analyzedFile?: string;
  scope?: string | string[];
  lotCount?: number;
  property?: {
    name?: string;
    registrationNumber?: string;
    ownerName?: string;
    city?: string;
    state?: string;
  };
  lots?: LotSummary[];
}

interface TechnicalSummaryPanelProps {
  summaryJson: string;
  summaryText: string;
  processingContextStatus?: ProcessingContextStatusDTO | null;
  manualReviewLotNumbers?: number[];
  selectionScope?: {
    mode: 'full' | 'partial';
    title: string;
    detail: string;
    badgeLabel: string;
    lotNumbers: number[];
  };
}

// ─── Diagnóstico por lote ─────────────────────────────────────────────────────

interface CheckItem {
  label: string;
  ok: boolean;
  detail?: string;
}

type ValidationStatusKey = 'APROVADO' | 'APROVADO_COM_RESSALVAS' | 'PENDENTE' | 'INDEFINIDO';

interface LotDiagnosis {
  lotNumber: number;
  checks: CheckItem[];
  score: number;      // 0–100
  ready: boolean;     // todos os itens críticos OK
  blockingIssues: string[];
  warningIssues: string[];
  hasStrongWarnings: boolean;
  statusKey: ValidationStatusKey;
  statusLabel: string;
  statusDescription: string;
  primaryReason: string;
  recommendedAction: string;
}

const DIRECTIONS = ['NORTE', 'SUL', 'LESTE', 'OESTE'] as const;
const HIGH_ATTENTION_WARNING_CODES = new Set([
  'SEM_FRENTE_VIARIA',
  'CONFRONTACAO_NAO_IDENTIFICADA',
  'CONFRONTACAO_POUCO_ESPECIFICA',
  'CONFRONTACAO_SUSPEITA',
]);

const getConfrontationReference = (value?: ConfrontationEntry | string): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object' && typeof value.referencia === 'string') {
    return value.referencia.trim();
  }

  return '';
};

const getConfrontationStatus = (value?: ConfrontationEntry | string): string => {
  if (value && typeof value === 'object' && typeof value.status === 'string') {
    const normalizedStatus = value.status.trim().toUpperCase();
    const reference = getConfrontationReference(value);
    if (
      normalizedStatus === 'IDENTIFICADA'
      && reference
      && (reference.toLowerCase().includes('não identificado') || reference.toLowerCase().includes('nao identificado'))
    ) {
      return 'NAO_IDENTIFICADA';
    }
    return normalizedStatus;
  }

  const reference = getConfrontationReference(value);
  if (!reference) {
    return 'NAO_IDENTIFICADA';
  }

  if (reference.toLowerCase().includes('não identificado') || reference.toLowerCase().includes('nao identificado')) {
    return 'NAO_IDENTIFICADA';
  }

  return 'IDENTIFICADA';
};

const extractIssueCode = (rawMessage?: string): string => {
  if (!rawMessage) return '';
  const separatorIndex = rawMessage.indexOf(':');
  if (separatorIndex <= 0) return rawMessage.trim().toUpperCase();
  return rawMessage.slice(0, separatorIndex).trim().toUpperCase();
};

const formatIssueMessage = (rawMessage?: string): string => {
  if (!rawMessage) return 'Pendência não detalhada.';
  const separatorIndex = rawMessage.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex >= rawMessage.length - 1) {
    return rawMessage.trim();
  }

  const code = rawMessage.slice(0, separatorIndex).trim().toUpperCase();
  const detail = rawMessage.slice(separatorIndex + 1).trim();
  const label = (() => {
    switch (code) {
      case 'VERTICE_DUPLICADO':
        return 'Vértice duplicado';
      case 'ARESTA_DEGENERADA':
        return 'Aresta degenerada';
      case 'CONFRONTACAO_NAO_IDENTIFICADA':
        return 'Confrontação não identificada';
      case 'CONFRONTACAO_POUCO_ESPECIFICA':
        return 'Confrontação pouco específica';
      case 'SEM_FRENTE_VIARIA':
        return 'Sem frente viária';
      case 'CONFRONTACAO_IMPOSSIVEL':
        return 'Confrontação impossível';
      case 'CONFRONTACAO_SUSPEITA':
        return 'Confrontação suspeita';
      default:
        return code.replaceAll('_', ' ');
    }
  })();

  return `${label}: ${detail}`;
};

const normalizeIssueList = (issues?: string[]): string[] => (
  Array.isArray(issues)
    ? issues
      .filter((issue): issue is string => typeof issue === 'string')
      .map((issue) => issue.trim())
      .filter(Boolean)
    : []
);

const resolveIssueSeverity = (rawMessage?: string): 'BLOQUEANTE' | 'AVISO' => {
  switch (extractIssueCode(rawMessage)) {
    case 'VERTICE_DUPLICADO':
    case 'ARESTA_DEGENERADA':
    case 'CONFRONTACAO_IMPOSSIVEL':
      return 'BLOQUEANTE';
    default:
      return 'AVISO';
  }
};

const hasHighAttentionWarnings = (issues: string[]): boolean => issues.some((issue) => HIGH_ATTENTION_WARNING_CODES.has(extractIssueCode(issue)));

const resolveValidationState = (validation?: TechnicalValidation): {
  blockingIssues: string[];
  warningIssues: string[];
  statusKey: ValidationStatusKey;
} => {
  const pendingIssues = normalizeIssueList(validation?.pendencias);
  const explicitBlockingIssues = normalizeIssueList(validation?.bloqueantes);
  const explicitWarningIssues = normalizeIssueList(validation?.avisos);

  const fallbackBlockingIssues = pendingIssues.filter((issue) => resolveIssueSeverity(issue) === 'BLOQUEANTE');
  const fallbackWarningIssues = pendingIssues.filter((issue) => resolveIssueSeverity(issue) === 'AVISO');

  const blockingIssues = explicitBlockingIssues.length > 0 ? explicitBlockingIssues : fallbackBlockingIssues;
  const warningIssues = explicitWarningIssues.length > 0
    ? explicitWarningIssues
    : fallbackWarningIssues.filter((issue) => !blockingIssues.includes(issue));

  const normalizedStatus = (validation?.statusGeral ?? '').trim().toUpperCase();
  if (normalizedStatus === 'APROVADO' || normalizedStatus === 'APROVADO_COM_RESSALVAS' || normalizedStatus === 'PENDENTE') {
    return { blockingIssues, warningIssues, statusKey: normalizedStatus };
  }

  if (blockingIssues.length > 0) {
    return { blockingIssues, warningIssues, statusKey: 'PENDENTE' };
  }

  if (warningIssues.length > 0) {
    return { blockingIssues, warningIssues, statusKey: 'APROVADO_COM_RESSALVAS' };
  }

  if (validation?.aprovado === true) {
    return { blockingIssues, warningIssues, statusKey: 'APROVADO' };
  }

  return { blockingIssues, warningIssues, statusKey: 'INDEFINIDO' };
};

const buildStatusDescription = (statusGeral?: string, ready?: boolean): string => {
  const normalized = (statusGeral ?? '').toUpperCase();
  if (normalized === 'APROVADO') return 'Lote apto para seguir com a geração do memorial.';
  if (normalized === 'APROVADO_COM_RESSALVAS') return 'Lote utilizável, mas com ressalvas que merecem conferência.';
  if (normalized === 'PENDENTE') return 'Lote com impedimentos técnicos que exigem ajuste antes do memorial.';
  return ready ? 'Lote com indícios de consistência técnica.' : 'Lote ainda requer revisão técnica.';
};

const buildPrimaryReason = (statusGeral: string, blockingIssues: string[], warningIssues: string[]): string => {
  if (statusGeral === 'APROVADO') {
    return 'Nenhuma pendência técnica relevante foi identificada.';
  }

  const mainIssue = blockingIssues[0] ?? warningIssues[0];
  const code = extractIssueCode(mainIssue);
  switch (code) {
    case 'VERTICE_DUPLICADO':
      return 'Há vértices coincidentes que comprometem a leitura correta do perímetro.';
    case 'ARESTA_DEGENERADA':
      return 'Existe segmento com comprimento nulo ou praticamente nulo na geometria.';
    case 'CONFRONTACAO_NAO_IDENTIFICADA':
      return 'Nem todos os lados possuem confrontante definido no DXF.';
    case 'CONFRONTACAO_POUCO_ESPECIFICA':
      return 'As confrontações consolidadas ainda estão genéricas demais para dar segurança ao memorial.';
    case 'SEM_FRENTE_VIARIA':
      return 'A frente viária do lote não foi identificada.';
    case 'CONFRONTACAO_IMPOSSIVEL':
      return 'Foi encontrada confrontação do lote com ele mesmo, o que invalida a descrição.';
    case 'CONFRONTACAO_SUSPEITA':
      return 'A confrontação consolidada apresenta referência inconsistente para revisão.';
    default:
      return formatIssueMessage(mainIssue) || 'Pendências em análise.';
  }
};

const buildRecommendedAction = (statusGeral: string, issues: string[]): string => {
  if (statusGeral === 'APROVADO') {
    return 'Prosseguir com a geração do memorial e manter a conferência final dos dados.';
  }

  const actions = new Set<string>();
  issues.forEach((issue) => {
    switch (extractIssueCode(issue)) {
      case 'VERTICE_DUPLICADO':
        actions.add('Revisar vértices sobrepostos e corrigir a sequência do perímetro.');
        break;
      case 'ARESTA_DEGENERADA':
        actions.add('Corrigir o segmento com comprimento nulo antes de gerar o memorial.');
        break;
      case 'CONFRONTACAO_NAO_IDENTIFICADA':
        actions.add('Selecionar ou revisar o texto e o segmento do confrontante no DXF.');
        break;
      case 'CONFRONTACAO_POUCO_ESPECIFICA':
        actions.add('Reforçar a seleção dos textos de confrontação e confirmar a frente viária ou confrontantes nominais do lote.');
        break;
      case 'SEM_FRENTE_VIARIA':
        actions.add('Identificar a frente viária principal do lote.');
        break;
      case 'CONFRONTACAO_IMPOSSIVEL':
        actions.add('Revisar a associação entre texto e segmento, pois o lote não pode confrontar consigo mesmo.');
        break;
      case 'CONFRONTACAO_SUSPEITA':
        actions.add('Conferir a confrontação consolidada por direção e ajustar a referência.');
        break;
      default:
        actions.add('Revisar as pendências técnicas indicadas para este lote.');
        break;
    }
  });

  return Array.from(actions)[0] ?? 'Revisar as pendências técnicas indicadas para este lote.';
};

function diagnoseLot(lot: LotSummary): LotDiagnosis {
  const checks: CheckItem[] = [];

  // 1. Área calculada
  const hasArea = lot.area != null && lot.area > 0;
  checks.push({
    label: 'Área calculada',
    ok: hasArea,
    detail: hasArea ? `${lot.area!.toFixed(2)} m²` : 'Não foi possível calcular — verifique os polígonos',
  });

  // 2. Perímetro calculado
  const hasPerimeter = lot.perimeter != null && lot.perimeter > 0;
  checks.push({
    label: 'Perímetro calculado',
    ok: hasPerimeter,
    detail: hasPerimeter ? `${lot.perimeter!.toFixed(2)} m` : 'Não identificado',
  });

  // 3. Vértices identificados
  const vertexCount = lot.vertices?.length ?? 0;
  const hasVertices = vertexCount >= 3;
  checks.push({
    label: 'Vértices do polígono',
    ok: hasVertices,
    detail: hasVertices ? `${vertexCount} pontos` : 'Menos de 3 vértices — polígono inválido',
  });

  // 4. Coordenadas georreferenciadas
  const isGeoreferenced = Boolean(lot.hasGeoreferencedVertices);
  checks.push({
    label: 'Coordenadas georreferenciadas',
    ok: isGeoreferenced,
    detail: isGeoreferenced
      ? 'Sistema de coordenadas reais (SIRGAS/UTM)'
      : 'Usando coordenadas locais do DXF — cadastre pontos de referência para georreferenciar',
  });

  // 5. Confrontações por direção
  const confrontations = lot.consolidatedConfrontations ?? {};
  const foundDirections = DIRECTIONS.filter((d) => {
    const entry = confrontations[d];
    const reference = getConfrontationReference(entry);
    const status = getConfrontationStatus(entry);
    return reference.length > 0 && status !== 'NAO_IDENTIFICADA';
  });
  const hasConfrontations = foundDirections.length >= 2;
  checks.push({
    label: 'Confrontações identificadas',
    ok: hasConfrontations,
    detail: hasConfrontations
      ? `${foundDirections.length}/4 direções: ${foundDirections.join(', ')}`
      : 'Menos de 2 confrontações resolvidas — selecione os textos de confrontação no mapa antes de gerar',
  });

  // 6. Arestas com referência
  const sides = lot.sides ?? [];
  const sidesWithRef = sides.filter(
    (s) => s.reference && s.reference.trim().length > 0 && !s.reference.toLowerCase().includes('não identificado') && !s.reference.toLowerCase().includes('nao identificado')
  );
  const hasEdgeRefs = sides.length === 0 || sidesWithRef.length > 0;
  checks.push({
    label: 'Referências nas arestas',
    ok: hasEdgeRefs,
    detail: sides.length === 0
      ? 'Nenhuma aresta detectada'
      : `${sidesWithRef.length}/${sides.length} arestas com confrontação`,
  });

  // 7. Frentes viárias (informativo — não bloqueia)
  const frontages = lot.streetFrontages ?? [];
  checks.push({
    label: 'Frentes viárias',
    ok: frontages.length > 0,
    detail: frontages.length > 0 ? frontages.join(', ') : 'Nenhuma rua/avenida identificada nas bordas',
  });

  // Score: peso dos itens críticos (1–5) vs informativos (6–7)
  const criticalChecks = checks.slice(0, 5);
  const criticalOk = criticalChecks.filter((c) => c.ok).length;
  const heuristicScore = Math.round((criticalOk / criticalChecks.length) * 100);

  // Pronto = área + vértices + ao menos 2 confrontações
  const fallbackReady = hasArea && hasVertices && hasConfrontations;
  const validationState = resolveValidationState(lot.validacaoTecnica);
  const { blockingIssues, warningIssues, statusKey } = validationState;
  const hasStrongWarnings = statusKey === 'APROVADO_COM_RESSALVAS' && hasHighAttentionWarnings(warningIssues);
  const ready = statusKey !== 'INDEFINIDO'
    ? statusKey !== 'PENDENTE'
    : fallbackReady;
  const statusLabel = statusKey === 'APROVADO'
    ? 'Pronto'
    : statusKey === 'APROVADO_COM_RESSALVAS'
      ? hasStrongWarnings ? 'Ressalvas fortes' : 'Ressalvas'
      : statusKey === 'PENDENTE'
        ? 'Pendente'
      : ready
        ? 'Pronto'
        : heuristicScore >= 50 ? 'Atenção' : 'Incompleto';
  const score = statusKey === 'APROVADO'
    ? 100
    : statusKey === 'APROVADO_COM_RESSALVAS'
      ? hasStrongWarnings
        ? Math.min(69, Math.max(60, heuristicScore))
        : Math.max(70, heuristicScore)
      : statusKey === 'PENDENTE'
        ? Math.min(45, heuristicScore)
        : heuristicScore;
  const statusDescription = buildStatusDescription(statusKey, ready);
  const primaryReason = buildPrimaryReason(statusKey, blockingIssues, warningIssues);
  const recommendedAction = buildRecommendedAction(statusKey, [...blockingIssues, ...warningIssues]);

  return {
    lotNumber: lot.lotNumber,
    checks,
    score,
    ready,
    blockingIssues,
    warningIssues,
    hasStrongWarnings,
    statusKey,
    statusLabel,
    statusDescription,
    primaryReason,
    recommendedAction,
  };
}

// ─── Helpers visuais ──────────────────────────────────────────────────────────

const fmt = (v?: number | null, d = 2) => (v != null && Number.isFinite(v) ? v.toFixed(d) : '—');
const fmtCoord = (v?: number | null) => (v != null && Number.isFinite(v) ? v.toFixed(3) : '—');

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; }
};

const dirColor: Record<string, string> = {
  NORTE: '#0284c7', SUL: '#16a34a', LESTE: '#d97706', OESTE: '#9333ea',
};
const dirIcon: Record<string, string> = {
  NORTE: '⬆', SUL: '⬇', LESTE: '➡', OESTE: '⬅',
};

const thStyle: React.CSSProperties = {
  padding: '5px 10px', textAlign: 'left', fontWeight: 700,
  color: '#475569', fontSize: '0.68rem', textTransform: 'uppercase',
  letterSpacing: '0.06em', whiteSpace: 'nowrap', background: '#f1f5f9',
};
const tdStyle: React.CSSProperties = {
  padding: '5px 10px', color: '#334155', verticalAlign: 'top',
  fontSize: '0.78rem', fontFamily: 'monospace',
};

// ─── Checklist de um lote ─────────────────────────────────────────────────────

const LotChecklist: React.FC<{ diagnosis: LotDiagnosis }> = ({ diagnosis }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {(diagnosis.blockingIssues.length > 0 || diagnosis.warningIssues.length > 0) && (
      <div style={{ display: 'grid', gap: '8px' }}>
        {diagnosis.blockingIssues.length > 0 && (
          <div style={{
            padding: '10px 12px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              Bloqueantes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {diagnosis.blockingIssues.map((issue, index) => (
                <div key={`blocking-${index}`} style={{ fontSize: '0.78rem', color: '#7f1d1d', lineHeight: 1.45 }}>
                  {`❌ ${formatIssueMessage(issue)}`}
                </div>
              ))}
            </div>
          </div>
        )}
        {diagnosis.warningIssues.length > 0 && (
          <div style={{
            padding: '10px 12px',
            borderRadius: '10px',
            background: '#fff7ed',
            border: '1px solid #fed7aa',
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              Avisos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {diagnosis.warningIssues.map((issue, index) => (
                <div key={`warning-${index}`} style={{ fontSize: '0.78rem', color: '#9a3412', lineHeight: 1.45 }}>
                  {`⚠️ ${formatIssueMessage(issue)}`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {diagnosis.checks.map((check, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '8px',
            background: check.ok ? '#f0fdf4' : i < 5 ? '#fef2f2' : '#fafafa',
            border: `1px solid ${check.ok ? '#bbf7d0' : i < 5 ? '#fecaca' : '#e2e8f0'}`,
          }}
        >
          <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: '1px' }}>
            {check.ok ? '✅' : i < 5 ? '❌' : '⚠️'}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: check.ok ? '#15803d' : i < 5 ? '#dc2626' : '#64748b' }}>
              {check.label}
            </div>
            {check.detail && (
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                {check.detail}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Tabela de vértices ───────────────────────────────────────────────────────

const VerticesTable: React.FC<{ vertices?: TechnicalVertex[]; georef?: boolean }> = ({ vertices, georef }) => {
  if (!vertices || vertices.length === 0) return <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Sem vértices.</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
      <thead>
        <tr>
          <th style={thStyle}>Ponto</th>
          <th style={thStyle}>Ordem</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>{georef ? 'E (m)' : 'X'}</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>{georef ? 'N (m)' : 'Y'}</th>
        </tr>
      </thead>
      <tbody>
        {vertices.map((v, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={tdStyle}>{v.label ?? `P${i + 1}`}</td>
            <td style={tdStyle}>{v.orderNumber ?? i + 1}</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtCoord(georef ? v.easting : v.x)}</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtCoord(georef ? v.northing : v.y)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ─── Tabela de arestas ────────────────────────────────────────────────────────

const SidesTable: React.FC<{ sides?: TechnicalSide[] }> = ({ sides }) => {
  if (!sides || sides.length === 0) return <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Sem arestas.</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, width: '44px' }}>#</th>
          <th style={{ ...thStyle, width: '140px' }}>Trecho</th>
          <th style={{ ...thStyle, width: '110px', textAlign: 'right' }}>Comprimento</th>
          <th style={{ ...thStyle, width: '120px' }}>Rumo</th>
          <th style={thStyle}>Confrontação</th>
        </tr>
      </thead>
      <tbody>
        {sides.map((s, i) => {
          const hasRef = s.reference && !s.reference.toLowerCase().includes('nao identificado') && !s.reference.toLowerCase().includes('não identificado');
          return (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: hasRef ? '#fff' : '#fff8f0' }}>
              <td style={{ ...tdStyle, color: '#94a3b8', whiteSpace: 'nowrap' }}>{String(s.sideIndex).padStart(2, '0')}</td>
              <td style={{ ...tdStyle, color: '#0f172a', wordBreak: 'break-word' }}>
                {s.startLabel ?? '?'} → {s.endLabel ?? '?'}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{s.length != null ? `${fmt(s.length)} m` : '—'}</td>
              <td style={{ ...tdStyle, color: '#0f172a', wordBreak: 'break-word' }}>{s.technicalBearing ?? s.direction ?? '—'}</td>
              <td style={{ ...tdStyle, color: hasRef ? '#166534' : '#f97316', wordBreak: 'break-word' }}>
                {hasRef ? s.reference : <span>⚠ {s.reference || 'não identificada'}</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ─── Card de Lote ─────────────────────────────────────────────────────────────

const LotCard: React.FC<{
  lot: LotSummary;
  diagnosis: LotDiagnosis;
  defaultExpanded?: boolean;
  selectionScopeMode?: 'full' | 'partial';
  selectedInPartialScope?: boolean;
}> = ({
  lot, diagnosis, defaultExpanded = false, selectionScopeMode = 'full', selectedInPartialScope = false
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [tab, setTab] = useState<'checklist' | 'confrontations' | 'vertices' | 'sides'>('checklist');
  const georef = Boolean(lot.hasGeoreferencedVertices);
  const { ready, score, statusLabel, blockingIssues, warningIssues, hasStrongWarnings, statusDescription, primaryReason, recommendedAction } = diagnosis;

  const scoreColor = diagnosis.statusKey === 'PENDENTE'
    ? '#dc2626'
    : diagnosis.statusKey === 'APROVADO_COM_RESSALVAS' && hasStrongWarnings
      ? '#c2410c'
      : score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  const scoreBg = diagnosis.statusKey === 'PENDENTE'
    ? '#fee2e2'
    : diagnosis.statusKey === 'APROVADO_COM_RESSALVAS' && hasStrongWarnings
      ? '#ffedd5'
      : score >= 80 ? '#dcfce7' : score >= 50 ? '#fef3c7' : '#fee2e2';
  const statusIcon = diagnosis.statusKey === 'PENDENTE'
    ? '❌'
    : diagnosis.statusKey === 'APROVADO_COM_RESSALVAS' && hasStrongWarnings
      ? '🟠'
      : ready ? '✅' : score >= 50 ? '⚠️' : '❌';
  const frameColor = diagnosis.statusKey === 'PENDENTE'
    ? '#fecaca'
    : diagnosis.statusKey === 'APROVADO_COM_RESSALVAS' && hasStrongWarnings
      ? '#fdba74'
      : ready ? '#bbf7d0' : score >= 50 ? '#fed7aa' : '#fecaca';
  const headerBg = diagnosis.statusKey === 'PENDENTE'
    ? '#fef2f2'
    : diagnosis.statusKey === 'APROVADO_COM_RESSALVAS' && hasStrongWarnings
      ? '#fff7ed'
      : ready ? '#f0fdf4' : score >= 50 ? '#fff7ed' : '#fef2f2';

  return (
    <div style={{
      border: `2px solid ${frameColor}`,
      borderRadius: '12px',
      overflow: 'hidden',
      background: '#fff',
      marginBottom: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          border: 'none',
          cursor: 'pointer',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: headerBg,
          textAlign: 'left',
        }}
      >
        {/* Número do lote */}
        <span style={{
          minWidth: '38px', height: '38px', borderRadius: '10px',
          background: scoreColor, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
        }}>
          {lot.lotNumber}
        </span>

        {/* Info resumida */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>
              Lote {lot.lotNumber}
            </span>
            <span style={{
              padding: '2px 10px', borderRadius: '999px', fontSize: '0.68rem',
              fontWeight: 700, color: scoreColor, background: scoreBg,
            }}>
              {statusIcon} {statusLabel} — {score}%
            </span>
            {hasStrongWarnings && (
              <span style={{
                padding: '2px 10px', borderRadius: '999px', fontSize: '0.68rem',
                fontWeight: 700, color: '#9a3412', background: '#ffedd5',
              }}>
                Exige atenção
              </span>
            )}
            {blockingIssues.length > 0 && (
              <span style={{
                padding: '2px 10px', borderRadius: '999px', fontSize: '0.68rem',
                fontWeight: 700, color: '#b91c1c', background: '#fee2e2',
              }}>
                {blockingIssues.length} bloqueante(s)
              </span>
            )}
            {warningIssues.length > 0 && (
              <span style={{
                padding: '2px 10px', borderRadius: '999px', fontSize: '0.68rem',
                fontWeight: 700, color: '#b45309', background: '#fef3c7',
              }}>
                {warningIssues.length} aviso(s)
              </span>
            )}
            {selectionScopeMode === 'partial' && (
              <span style={{
                padding: '2px 10px', borderRadius: '999px', fontSize: '0.68rem',
                fontWeight: 700, color: selectedInPartialScope ? '#c2410c' : '#7c2d12', background: '#ffedd5',
              }}>
                {selectedInPartialScope ? 'Escopo parcial confirmado' : 'Fluxo parcial'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '14px', marginTop: '4px', flexWrap: 'wrap' }}>
            {lot.area != null && (
              <span style={{ fontSize: '0.75rem', color: '#475569' }}>🏠 {fmt(lot.area)} m²</span>
            )}
            {lot.perimeter != null && (
              <span style={{ fontSize: '0.75rem', color: '#475569' }}>📏 {fmt(lot.perimeter)} m</span>
            )}
            {georef && (
              <span style={{ fontSize: '0.75rem', color: '#0284c7' }}>📡 Georreferenciado</span>
            )}
            {lot.isCornerLot && (
              <span style={{ fontSize: '0.75rem', color: '#d97706' }}>⬡ Esquina</span>
            )}
          </div>
        </div>

        <span style={{ color: '#94a3b8', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Conteúdo */}
      {expanded && (
        <div style={{ padding: '12px 16px 16px' }}>
          <div style={{
            display: 'grid',
            gap: '10px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            marginBottom: '12px',
          }}>
            <div style={{
              border: '1px solid #dbeafe',
              background: '#f8fbff',
              borderRadius: '10px',
              padding: '10px 12px',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Situação do lote
              </div>
              <div style={{ marginTop: '4px', fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.45 }}>
                {statusDescription}
              </div>
            </div>
            <div style={{
              border: '1px solid #fde68a',
              background: '#fffbeb',
              borderRadius: '10px',
              padding: '10px 12px',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Motivo principal
              </div>
              <div style={{ marginTop: '4px', fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.45 }}>
                {primaryReason}
              </div>
            </div>
            <div style={{
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              borderRadius: '10px',
              padding: '10px 12px',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ação recomendada
              </div>
              <div style={{ marginTop: '4px', fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.45 }}>
                {recommendedAction}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', borderRadius: '8px', overflow: 'hidden',
            border: '1px solid #e2e8f0', marginBottom: '12px',
          }}>
            {([
              { key: 'checklist', label: '🔍 Diagnóstico' },
              { key: 'confrontations', label: '🧭 Confrontações' },
              { key: 'vertices', label: `📍 Vértices (${lot.vertices?.length ?? 0})` },
              { key: 'sides', label: `📐 Arestas (${lot.sides?.length ?? 0})` },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: '7px 2px', border: 'none', cursor: 'pointer',
                background: tab === key ? '#1e3a5f' : '#f8fafc',
                color: tab === key ? '#fff' : '#64748b',
                fontWeight: tab === key ? 700 : 500,
                fontSize: '0.72rem',
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* Tab: Diagnóstico */}
          {tab === 'checklist' && <LotChecklist diagnosis={diagnosis} />}

          {/* Tab: Confrontações */}
          {tab === 'confrontations' && (
            <div>
              {DIRECTIONS.map((dir) => {
                const entry = lot.consolidatedConfrontations?.[dir];
                const reference = getConfrontationReference(entry);
                const status = getConfrontationStatus(entry);
                const hasVal = reference.length > 0 && status !== 'NAO_IDENTIFICADA';
                return (
                  <div key={dir} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '8px 12px', borderRadius: '8px', marginBottom: '6px',
                    background: hasVal ? `${dirColor[dir]}10` : '#fafafa',
                    border: `1px solid ${hasVal ? `${dirColor[dir]}44` : '#e2e8f0'}`,
                  }}>
                    <span style={{
                      fontSize: '1rem', flexShrink: 0,
                      color: hasVal ? dirColor[dir] : '#94a3b8',
                    }}>
                      {dirIcon[dir]}
                    </span>
                    <div>
                      <div style={{
                        fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
                        color: hasVal ? dirColor[dir] : '#94a3b8', textTransform: 'uppercase',
                      }}>
                        {dir}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: hasVal ? '#1e293b' : '#f97316', marginTop: '2px' }}>
                        {hasVal ? reference : <span>⚠ Não identificado — selecione o texto no mapa</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab: Vértices */}
          {tab === 'vertices' && <VerticesTable vertices={lot.vertices} georef={georef} />}

          {/* Tab: Arestas */}
          {tab === 'sides' && <SidesTable sides={lot.sides} />}
        </div>
      )}
    </div>
  );
};

// ─── Barra de prontidão geral ─────────────────────────────────────────────────

const ReadinessBanner: React.FC<{ diagnoses: LotDiagnosis[] }> = ({ diagnoses }) => {
  if (diagnoses.length === 0) return null;

  const total = diagnoses.length;
  const approvedCount = diagnoses.filter((d) => d.statusKey === 'APROVADO').length;
  const warningCount = diagnoses.filter((d) => d.statusKey === 'APROVADO_COM_RESSALVAS').length;
  const strongWarningCount = diagnoses.filter((d) => d.statusKey === 'APROVADO_COM_RESSALVAS' && d.hasStrongWarnings).length;
  const pendingCount = diagnoses.filter((d) => d.statusKey === 'PENDENTE').length;
  const overallStatus = pendingCount > 0
    ? 'PENDENTE'
    : warningCount > 0 ? 'APROVADO_COM_RESSALVAS' : 'APROVADO';

  const bg = overallStatus === 'APROVADO'
    ? 'linear-gradient(135deg,#14532d,#166534)'
    : overallStatus === 'APROVADO_COM_RESSALVAS'
      ? 'linear-gradient(135deg,#78350f,#92400e)'
      : 'linear-gradient(135deg,#7f1d1d,#991b1b)';
  const icon = overallStatus === 'APROVADO'
    ? '✅'
    : overallStatus === 'APROVADO_COM_RESSALVAS' ? '⚠️' : '❌';
  const title = overallStatus === 'APROVADO'
    ? `Arquivo aprovado: ${approvedCount} de ${total} lote(s) aptos.`
    : overallStatus === 'APROVADO_COM_RESSALVAS'
      ? strongWarningCount > 0
        ? `Arquivo aprovado com ressalvas: ${strongWarningCount} lote(s) exigem atenção reforçada.`
        : `Arquivo aprovado com ressalvas: ${warningCount} lote(s) exigem conferência.`
      : `Arquivo pendente: ${pendingCount} lote(s) exigem ajuste antes do memorial.`;

  const subtitle = overallStatus === 'APROVADO'
    ? 'As confrontações, coordenadas e polígonos estão consistentes para seguir com a geração do memorial.'
    : overallStatus === 'APROVADO_COM_RESSALVAS'
      ? strongWarningCount > 0
        ? `Há ${approvedCount} lote(s) aprovados e ${warningCount} com ressalvas, sendo ${strongWarningCount} com atenção reforçada. O memorial pode avançar, mas os pontos destacados merecem conferência operacional.`
        : `Há ${approvedCount} lote(s) aprovados e ${warningCount} com ressalvas. O memorial pode avançar, mas convém revisar os pontos destacados.`
      : `Há ${approvedCount} lote(s) aprovados, ${warningCount} com ressalvas, sendo ${strongWarningCount} com atenção reforçada, e ${pendingCount} pendentes. Revise os lotes marcados antes de confiar no memorial final.`;

  return (
    <div style={{
      background: bg,
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '16px',
      color: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
        <span style={{ fontWeight: 800, fontSize: '1rem' }}>{title}</span>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>
        {subtitle}
      </p>
      <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{
          padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(255,255,255,0.2)', color: '#fff',
        }}>
          ✅ {approvedCount} aprovado(s)
        </span>
        <span style={{
          padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(255,210,120,0.24)', color: '#fff',
        }}>
          ⚠️ {warningCount} com ressalvas
        </span>
        {strongWarningCount > 0 && (
          <span style={{
            padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
            background: 'rgba(255,190,120,0.34)', color: '#fff',
          }}>
            🟠 {strongWarningCount} atenção reforçada
          </span>
        )}
        <span style={{
          padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(255,100,100,0.3)', color: '#fff',
        }}>
          ❌ {pendingCount} pendente(s)
        </span>
      </div>
      {overallStatus !== 'APROVADO' && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {diagnoses.map((d) => (
            <span key={d.lotNumber} style={{
              padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
              background: d.statusKey === 'PENDENTE'
                ? 'rgba(255,100,100,0.3)'
                : d.statusKey === 'APROVADO_COM_RESSALVAS' && d.hasStrongWarnings
                  ? 'rgba(255,190,120,0.34)'
                : d.statusKey === 'APROVADO_COM_RESSALVAS'
                  ? 'rgba(255,210,120,0.24)'
                  : 'rgba(255,255,255,0.2)',
              color: '#fff',
            }}>
              {d.statusKey === 'PENDENTE' ? '❌' : d.statusKey === 'APROVADO_COM_RESSALVAS' && d.hasStrongWarnings ? '🟠' : d.statusKey === 'APROVADO_COM_RESSALVAS' ? '⚠️' : '✅'} Lote {d.lotNumber}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const TechnicalSummaryPanel: React.FC<TechnicalSummaryPanelProps> = ({
  summaryJson,
  summaryText,
  processingContextStatus,
  manualReviewLotNumbers = [],
  selectionScope
}) => {
  const [showAll, setShowAll] = useState(false);

  const summaryDocument = useMemo<TechnicalSummaryDocument | null>(() => {
    if (!summaryJson) return null;
    try {
      const parsed = JSON.parse(summaryJson) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
      }
      return parsed as TechnicalSummaryDocument;
    } catch {
      return null;
    }
  }, [summaryJson]);

  const lots = Array.isArray(summaryDocument?.lots) ? summaryDocument.lots : [];
  const property = summaryDocument?.property;
  const scope = Array.isArray(summaryDocument?.scope)
    ? summaryDocument.scope.join(', ')
    : (summaryDocument?.scope ?? 'arquivo completo');

  const diagnoses = useMemo(() => lots.map(diagnoseLot), [lots]);
  const normalizedManualReviewLotNumbers = useMemo(
    () => Array.from(new Set(manualReviewLotNumbers.filter((value) => Number.isFinite(value)))).sort((left, right) => left - right),
    [manualReviewLotNumbers]
  );
  const normalizedSelectionScopeLotNumbers = useMemo(
    () => Array.from(new Set((selectionScope?.lotNumbers ?? []).filter((value) => Number.isFinite(value)))).sort((left, right) => left - right),
    [selectionScope?.lotNumbers]
  );
  const processingContextAssessment = useMemo(
    () => resolveTechnicalSummaryProcessingContext(summaryJson, processingContextStatus),
    [processingContextStatus, summaryJson]
  );
  const approvedCount = diagnoses.filter((d) => d.statusKey === 'APROVADO').length;
  const effectivelyApprovedCount = diagnoses.filter((d) => d.statusKey !== 'PENDENTE').length;
  const exportBaseName = summaryDocument?.analyzedFile?.replace(/\.[^/.]+$/, '') ?? 'resumo_tecnico';

  const handleExportPdf = async () => {
    await saveTechnicalSummaryPdf({
      summaryJson,
      summaryText,
      analyzedFile: exportBaseName
    });
  };

  const handleExportText = async () => {
    await saveTechnicalSummaryText({
      summaryJson,
      summaryText,
      analyzedFile: exportBaseName
    });
  };

  const handleExportJson = async () => {
    await saveTechnicalSummaryJson({
      summaryJson,
      analyzedFile: exportBaseName
    });
  };

  if (!summaryDocument) {
    return (
      <div style={{ padding: '20px', color: '#ef4444', fontWeight: 600 }}>
        Erro ao interpretar os dados do Resumo Técnico.
      </div>
    );
  }

  return (
    <div style={{
      background: '#f8fafc', borderRadius: '16px', padding: '20px',
      marginTop: '20px', border: '1px solid #e2e8f0',
    }}>
      {/* ── Cabeçalho do documento ── */}
      <div style={{
        background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)',
        borderRadius: '12px', padding: '18px 22px', marginBottom: '16px', color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '3px' }}>
              Pré-voo — Resumo Técnico
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '6px' }}>
              {summaryDocument.analyzedFile ?? 'Arquivo não informado'}
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>📅 {formatDate(summaryDocument.generatedAt)}</span>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>🗂 {scope}</span>
            </div>
            {property && (property.name || property.ownerName) && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                {property.name && <span style={{ fontSize: '0.76rem', color: '#e2e8f0' }}>🏘 {property.name}{property.registrationNumber ? ` (${property.registrationNumber})` : ''}</span>}
                {property.ownerName && <span style={{ fontSize: '0.76rem', color: '#e2e8f0' }}>👤 {property.ownerName}</span>}
                {(property.city || property.state) && <span style={{ fontSize: '0.76rem', color: '#e2e8f0' }}>📍 {[property.city, property.state].filter(Boolean).join(' / ')}</span>}
              </div>
            )}
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.12)', borderRadius: '10px',
            padding: '10px 18px', textAlign: 'center', flexShrink: 0,
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{effectivelyApprovedCount}/{lots.length}</div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Aptos ou com ressalvas</div>
            <div style={{ fontSize: '0.68rem', color: '#e2e8f0', marginTop: '4px' }}>{approvedCount} aprovado(s) plenos</div>
          </div>
        </div>
      </div>

      {/* ── Banner de prontidão ── */}
      <ReadinessBanner diagnoses={diagnoses} />
      <ProcessingContextBanner
        assessment={processingContextAssessment}
        noticesMode="all"
        containerStyle={{ marginBottom: '16px', padding: '14px 16px' }}
        headingStyle={{ fontSize: '0.8rem' }}
        detailStyle={{ fontSize: '0.8rem' }}
        metricsStyle={{ fontSize: '0.72rem', marginTop: '10px' }}
      />
      {selectionScope ? (
        <div style={{
          marginBottom: '16px',
          padding: '14px 16px',
          borderRadius: '12px',
          border: `1px solid ${selectionScope.mode === 'partial' ? 'rgba(234, 88, 12, 0.24)' : 'rgba(15, 118, 110, 0.24)'}`,
          background: selectionScope.mode === 'partial' ? 'rgba(255, 237, 213, 0.4)' : 'rgba(220, 252, 231, 0.45)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>{selectionScope.title}</strong>
            <span style={{
              padding: '4px 10px',
              borderRadius: '999px',
              background: '#ffffff',
              border: `1px solid ${selectionScope.mode === 'partial' ? 'rgba(234, 88, 12, 0.28)' : 'rgba(15, 118, 110, 0.28)'}`,
              color: selectionScope.mode === 'partial' ? '#c2410c' : '#0f766e',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {selectionScope.badgeLabel}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#334155' }}>
            {selectionScope.detail}
          </div>
        </div>
      ) : null}
      {normalizedManualReviewLotNumbers.length > 0 ? (
        <div style={{
          marginBottom: '16px',
          padding: '14px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(217, 119, 6, 0.24)',
          background: 'rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400e', marginBottom: '6px' }}>
            Revisao manual separada
          </div>
          <div style={{ fontSize: '0.78rem', color: '#9a3412', marginBottom: '10px' }}>
            Lotes marcados pelo operador com Alt+Clique no viewer para conferencia fora da validacao automatica.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {normalizedManualReviewLotNumbers.map((lotNumber) => (
              <span
                key={lotNumber}
                style={{
                  padding: '6px 10px',
                  borderRadius: '999px',
                  background: 'rgba(217, 119, 6, 0.14)',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  color: '#9a3412',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                Lote {lotNumber}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Ações ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setShowAll((v) => !v)}
          style={{
            padding: '7px 14px', background: '#f1f5f9', color: '#475569',
            border: '1px solid #e2e8f0', borderRadius: '8px',
            fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
          }}
        >
          {showAll ? '▲ Recolher todos' : '▼ Expandir todos'}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={handleExportPdf} disabled={!summaryJson && !summaryText} style={{
          padding: '7px 16px', background: '#0f172a', color: '#fff', border: 'none',
          borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem',
          cursor: summaryJson || summaryText ? 'pointer' : 'not-allowed', opacity: summaryJson || summaryText ? 1 : 0.5,
        }}>
          📄 Exportar PDF
        </button>
        <button onClick={handleExportText} disabled={!summaryJson && !summaryText} style={{
          padding: '7px 16px', background: '#475569', color: '#fff', border: 'none',
          borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem',
          cursor: summaryJson || summaryText ? 'pointer' : 'not-allowed', opacity: summaryJson || summaryText ? 1 : 0.5,
        }}>
          📝 Exportar Texto
        </button>
        <button onClick={handleExportJson} style={{
          padding: '7px 16px', background: '#0284c7', color: '#fff', border: 'none',
          borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
        }}>
          ⬇ Exportar JSON
        </button>
      </div>

      {/* ── Cards de lotes ── */}
      {lots.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '32px', color: '#94a3b8',
          background: '#fff', borderRadius: '12px', border: '1px dashed #e2e8f0',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
          <div style={{ fontWeight: 600 }}>Nenhum lote identificado neste escopo.</div>
          <div style={{ fontSize: '0.82rem', marginTop: '6px' }}>
            O arquivo pode não conter polígonos fechados ou textos de lote reconhecíveis.
          </div>
        </div>
      ) : (
        lots.map((lot, i) => (
          <LotCard
            key={lot.lotNumber}
            lot={lot}
            diagnosis={diagnoses[i]}
            defaultExpanded={showAll || i === 0}
            selectionScopeMode={selectionScope?.mode}
            selectedInPartialScope={normalizedSelectionScopeLotNumbers.includes(lot.lotNumber)}
          />
        ))
      )}
    </div>
  );
};

export default TechnicalSummaryPanel;
