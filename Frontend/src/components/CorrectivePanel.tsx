import type {
  CorrectiveDraftOperation,
  CorrectiveHistoryStatus,
  CorrectiveLotInspectionView,
  RestoredCorrectiveSnapshotView
} from '@/graphics-engine/shared/viewer-corrective';
import ProcessingContextBanner from '@/components/ProcessingContextBanner';
import type { CorrectiveSnapshotSaveInfo, CorrectiveSnapshotState } from '@/hooks/useCorrectiveSnapshots';
import {
  formatCorrectiveToolLabel,
  formatIssueCodeLabel,
  getCorrectiveToolHelpText,
  getCorrectiveToolImpactText,
  getSuggestionConfidenceColor,
  type CorrectiveIssueView,
  type CorrectiveTool
} from '@/utils/viewerCorrective';
import {
  resolveTechnicalSummaryProcessingContext,
} from '@/utils/processingContextStatus';

interface CorrectivePanelProps {
  hasCorrectiveMode: boolean;
  correctiveIssuesSourceLabel: string;
  correctiveIssues: CorrectiveIssueView[];
  selectedIssueId: string | null;
  selectedCorrectiveIssue: CorrectiveIssueView | null;
  activeCorrectiveTool: CorrectiveTool;
  currentCorrectiveSnapshot?: CorrectiveSnapshotState;
  currentDraftOperations: CorrectiveDraftOperation[];
  latestAppliedSuggestion?: CorrectiveDraftOperation | null;
  isFocusedSuggestionRecentlyApplied?: boolean;
  currentDxfDataAvailable: boolean;
  savedCorrectiveSnapshot?: CorrectiveSnapshotSaveInfo;
  restoredCorrectiveSnapshot?: RestoredCorrectiveSnapshotView;
  correctiveHistoryStatus?: CorrectiveHistoryStatus;
  correctiveLotInspection?: CorrectiveLotInspectionView | null;
  correctiveSnapshotSaveMessage: string;
  correctiveSnapshotLoadMessage: string;
  isGeneratingMemorial: boolean;
  isLoadingCorrectiveSnapshot: boolean;
  isSavingCorrectiveSnapshot: boolean;
  onSelectIssue: (issueId: string) => void;
  onClearFocus: () => void;
  onSetActiveCorrectiveTool: (tool: CorrectiveTool) => void;
  onApplySuggestion: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPrepareDraft: () => void;
  onRemoveDraftOperation: (operationId: string) => void;
  onClearDraft: () => void;
  onReopenSnapshot: () => void;
  onSaveSnapshot: () => void;
  onRevalidateSummary: () => void;
}

const getDetectionSourcePresentation = (detectionSource?: 'direct' | 'face' | 'anchor' | null) => {
  switch (detectionSource) {
    case 'direct':
      return { label: 'DXF fechado', color: '#166534', background: '#dcfce7', border: '#86efac' };
    case 'face':
      return { label: 'Face inferida', color: '#9a3412', background: '#ffedd5', border: '#fdba74' };
    case 'anchor':
      return { label: 'Ancora de texto', color: '#1d4ed8', background: '#dbeafe', border: '#93c5fd' };
    default:
      return null;
  }
};

const CorrectivePanel: React.FC<CorrectivePanelProps> = ({
  hasCorrectiveMode,
  correctiveIssuesSourceLabel,
  correctiveIssues,
  selectedIssueId,
  selectedCorrectiveIssue,
  activeCorrectiveTool,
  currentCorrectiveSnapshot,
  currentDraftOperations,
  latestAppliedSuggestion,
  isFocusedSuggestionRecentlyApplied = false,
  currentDxfDataAvailable,
  savedCorrectiveSnapshot,
  restoredCorrectiveSnapshot,
  correctiveHistoryStatus,
  correctiveLotInspection,
  correctiveSnapshotSaveMessage,
  correctiveSnapshotLoadMessage,
  isGeneratingMemorial,
  isLoadingCorrectiveSnapshot,
  isSavingCorrectiveSnapshot,
  onSelectIssue,
  onClearFocus,
  onSetActiveCorrectiveTool,
  onApplySuggestion,
  onUndo,
  onRedo,
  onPrepareDraft,
  onRemoveDraftOperation,
  onClearDraft,
  onReopenSnapshot,
  onSaveSnapshot,
  onRevalidateSummary
}) => {
  if (!hasCorrectiveMode) {
    return (
      <div style={{
        width: '320px',
        minWidth: '320px',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '18px',
        alignSelf: 'flex-start'
      }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>
          Modo corretivo
        </div>
        <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6, fontSize: '0.92rem' }}>
          Rode o `Scanear erros` para listar os lotes que precisam de revisao manual no Memorial.
        </p>
      </div>
    );
  }

  const canRevalidateSummary = Boolean(currentCorrectiveSnapshot?.dxfData || currentDxfDataAvailable) && !isGeneratingMemorial;
  const recentDraftOperations = currentDraftOperations.slice(-3).reverse();
  const restoredProcessingContextAssessment = restoredCorrectiveSnapshot?.processingContextStatus
    ? resolveTechnicalSummaryProcessingContext('', restoredCorrectiveSnapshot.processingContextStatus)
    : null;

  return (
    <div style={{
      width: '320px',
      minWidth: '320px',
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '14px',
      padding: '16px',
      alignSelf: 'flex-start',
      boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
      display: 'grid',
      gap: '14px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>Modo corretivo</div>
          <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
            {correctiveIssues.length} item(ns) ativos via {correctiveIssuesSourceLabel}
          </div>
        </div>
        <button
          onClick={onClearFocus}
          style={{ padding: '8px 10px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
          type="button"
        >
          Limpar foco
        </button>
      </div>

      <div style={{ display: 'grid', gap: '8px', paddingRight: '4px' }}>
        {correctiveIssues.map((issue) => {
          const isSelected = issue.id === selectedIssueId;
          const isBlocking = issue.severity === 'BLOQUEANTE';
          const detectionSourcePresentation = getDetectionSourcePresentation(issue.detectionSource);

          return (
            <button
              key={issue.id}
              onClick={() => onSelectIssue(issue.id)}
              type="button"
              style={{
                textAlign: 'left',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: isSelected
                  ? `2px solid ${isBlocking ? '#dc2626' : '#d97706'}`
                  : '1px solid #e5e7eb',
                background: isSelected
                  ? (isBlocking ? '#fef2f2' : '#fff7ed')
                  : '#f9fafb',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.9rem' }}>Lote {issue.lotNumber}</strong>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: isBlocking ? '#b91c1c' : '#b45309'
                }}>
                  {issue.severity}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827', marginTop: '4px' }}>
                {formatIssueCodeLabel(issue.code)}
              </div>
              {detectionSourcePresentation && (
                <div style={{ marginTop: '6px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    border: `1px solid ${detectionSourcePresentation.border}`,
                    background: detectionSourcePresentation.background,
                    color: detectionSourcePresentation.color,
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    {detectionSourcePresentation.label}
                  </span>
                </div>
              )}
              <div style={{ fontSize: '0.78rem', color: '#4b5563', lineHeight: 1.4, marginTop: '2px' }}>
                {issue.message}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Foco atual</div>
        {selectedCorrectiveIssue ? (
          <>
            {getDetectionSourcePresentation(selectedCorrectiveIssue.detectionSource) && (
              <div style={{ marginBottom: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 9px',
                  borderRadius: '999px',
                  border: `1px solid ${getDetectionSourcePresentation(selectedCorrectiveIssue.detectionSource)?.border}`,
                  background: getDetectionSourcePresentation(selectedCorrectiveIssue.detectionSource)?.background,
                  color: getDetectionSourcePresentation(selectedCorrectiveIssue.detectionSource)?.color,
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {getDetectionSourcePresentation(selectedCorrectiveIssue.detectionSource)?.label}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                Lote {selectedCorrectiveIssue.lotNumber} • {formatIssueCodeLabel(selectedCorrectiveIssue.code)}
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '999px',
                background: selectedCorrectiveIssue.severity === 'BLOQUEANTE' ? '#fee2e2' : '#fff7ed',
                color: selectedCorrectiveIssue.severity === 'BLOQUEANTE' ? '#b91c1c' : '#b45309',
                border: selectedCorrectiveIssue.severity === 'BLOQUEANTE' ? '1px solid #fecaca' : '1px solid #fed7aa'
              }}>
                {selectedCorrectiveIssue.severity}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
              {selectedCorrectiveIssue.message}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
            Selecione um item do scan para abrir o foco corretivo.
          </div>
        )}
      </div>

      {latestAppliedSuggestion && (
        <div style={{
          padding: '12px',
          borderRadius: '12px',
          background: isFocusedSuggestionRecentlyApplied ? '#ecfdf5' : '#f8fafc',
          border: isFocusedSuggestionRecentlyApplied ? '1px solid #86efac' : '1px solid #cbd5e1',
          boxShadow: isFocusedSuggestionRecentlyApplied ? '0 0 0 1px rgba(34, 197, 94, 0.08)' : 'none'
        }}>
          <div style={{
            fontSize: '0.76rem',
            color: isFocusedSuggestionRecentlyApplied ? '#166534' : '#64748b',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontWeight: 700
          }}>
            {isFocusedSuggestionRecentlyApplied ? 'Correcao automatica aplicada' : 'Ultima correcao automatica'}
          </div>
          <div style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 700, lineHeight: 1.45 }}>
            {latestAppliedSuggestion.label}
          </div>
          {isFocusedSuggestionRecentlyApplied && correctiveLotInspection && (
            <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
              <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700 }}>
                {formatCorrectiveToolLabel(correctiveLotInspection.suggestedTool)} • {getCorrectiveToolImpactText(correctiveLotInspection.suggestedTool)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#14532d', lineHeight: 1.45 }}>
                Motivo: {correctiveLotInspection.suggestionReason}
              </div>
              {(correctiveLotInspection.nearestVertexGapDistance !== null || correctiveLotInspection.nearestSegmentGapDistance !== null) && (
                <div style={{ fontSize: '0.78rem', color: '#065f46', lineHeight: 1.45 }}>
                  {correctiveLotInspection.nearestVertexGapDistance !== null && (
                    <span>Lacuna entre vertices: {correctiveLotInspection.nearestVertexGapDistance.toFixed(2)}</span>
                  )}
                  {correctiveLotInspection.nearestVertexGapDistance !== null && correctiveLotInspection.nearestSegmentGapDistance !== null && (
                    <span> • </span>
                  )}
                  {correctiveLotInspection.nearestSegmentGapDistance !== null && (
                    <span>Arestas proximas: {correctiveLotInspection.nearestSegmentGapDistance.toFixed(2)}</span>
                  )}
                </div>
              )}
            </div>
          )}
          {latestAppliedSuggestion.revision !== undefined && (
            <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '6px', lineHeight: 1.45 }}>
              Revisao {latestAppliedSuggestion.revision} no historico corretivo.
            </div>
          )}
        </div>
      )}

      {selectedCorrectiveIssue && (
        <div style={{ padding: '12px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Inspecao do lote</div>
          {correctiveLotInspection ? (
            <>
              <div style={{ fontWeight: 700, color: correctiveLotInspection.severity === 'BLOQUEANTE' ? '#b91c1c' : '#0f172a', marginBottom: '6px' }}>
                {correctiveLotInspection.detected
                  ? `Lote ${correctiveLotInspection.lotNumber} localizado`
                  : `Lote ${correctiveLotInspection.lotNumber} nao localizado`}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.55 }}>
                {correctiveLotInspection.detected
                  ? `Area: ${correctiveLotInspection.area?.toFixed(2) || 'n/d'} • Pendencias: ${correctiveLotInspection.issueCount}`
                  : `Inspecao com ${correctiveLotInspection.issueCount} item(ns), sem lote materializado na extracao atual.`}
              </div>
              {correctiveLotInspection.detected && (
                <div style={{ marginTop: '8px', display: 'grid', gap: '4px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.45 }}>
                    Lacuna entre vertices: {correctiveLotInspection.nearestVertexGapDistance?.toFixed(2) || 'n/d'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.45 }}>
                    Afastamento entre arestas: {correctiveLotInspection.nearestSegmentGapDistance?.toFixed(2) || 'n/d'}
                  </div>
                </div>
              )}
              <div style={{ marginTop: '10px', padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #dbeafe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Sugestao automatica
                  </div>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: getSuggestionConfidenceColor(correctiveLotInspection.suggestionConfidence)
                  }}>
                    Confianca {correctiveLotInspection.suggestionConfidence}
                  </span>
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  {formatCorrectiveToolLabel(correctiveLotInspection.suggestedTool)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                  {correctiveLotInspection.suggestionReason}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {correctiveLotInspection.suggestedTool !== activeCorrectiveTool && (
                    <button
                      type="button"
                      onClick={() => onSetActiveCorrectiveTool(correctiveLotInspection.suggestedTool)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #93c5fd',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      Usar sugerida
                    </button>
                  )}
                  {correctiveLotInspection.detected && correctiveLotInspection.suggestedTool !== 'inspect' && (
                    <button
                      type="button"
                      onClick={onApplySuggestion}
                      disabled={isFocusedSuggestionRecentlyApplied}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isFocusedSuggestionRecentlyApplied ? '#16a34a' : '#1d4ed8',
                        color: '#fff',
                        cursor: isFocusedSuggestionRecentlyApplied ? 'not-allowed' : 'pointer',
                        opacity: isFocusedSuggestionRecentlyApplied ? 0.9 : 1,
                        fontWeight: 700
                      }}
                    >
                      {isFocusedSuggestionRecentlyApplied ? 'Aplicada agora' : 'Aplicar sugestao'}
                    </button>
                  )}
                </div>
              </div>
              {correctiveLotInspection.textsInside.length > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, marginTop: '8px' }}>
                  Textos: {correctiveLotInspection.textsInside.slice(0, 3).join(' | ')}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.55 }}>
              O canvas ainda nao devolveu metadados do lote em foco.
            </div>
          )}
        </div>
      )}

      <div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ferramenta ativa</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onSetActiveCorrectiveTool('inspect')}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              border: activeCorrectiveTool === 'inspect' ? '2px solid #2563eb' : '1px solid #cbd5e1',
              background: activeCorrectiveTool === 'inspect' ? '#dbeafe' : '#fff',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Inspecionar
          </button>
          <button
            type="button"
            onClick={() => onSetActiveCorrectiveTool('move-vertex')}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              border: activeCorrectiveTool === 'move-vertex' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
              background: activeCorrectiveTool === 'move-vertex' ? '#ede9fe' : '#fff',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Mover vertice
          </button>
          <button
            type="button"
            onClick={() => onSetActiveCorrectiveTool('join-endpoints')}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              border: activeCorrectiveTool === 'join-endpoints' ? '2px solid #dc2626' : '1px solid #cbd5e1',
              background: activeCorrectiveTool === 'join-endpoints' ? '#fee2e2' : '#fff',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Unir pontas
          </button>
          <button
            type="button"
            onClick={() => onSetActiveCorrectiveTool('close-gap-guided')}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              border: activeCorrectiveTool === 'close-gap-guided' ? '2px solid #0891b2' : '1px solid #cbd5e1',
              background: activeCorrectiveTool === 'close-gap-guided' ? '#cffafe' : '#fff',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Fechar lacuna
          </button>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45, marginTop: '8px' }}>
          {getCorrectiveToolHelpText(activeCorrectiveTool)}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rascunho recente</div>
        {currentDraftOperations.length > 0 ? (
          <div style={{ display: 'grid', gap: '8px' }}>
            {recentDraftOperations.map((operation) => (
              <div
                key={operation.id}
                style={{
                  padding: '9px 10px',
                  borderRadius: '10px',
                  background: operation.status === 'undone' ? '#f8fafc' : '#eef2ff',
                  border: operation.status === 'undone' ? '1px dashed #cbd5e1' : '1px solid #c7d2fe',
                  fontSize: '0.82rem',
                  opacity: operation.status === 'undone' ? 0.72 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ color: '#0f172a', lineHeight: 1.45 }}>
                    {operation.label}
                    {operation.revision !== undefined && (
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
                        Revisao {operation.revision} {operation.status === 'undone' ? '• desfeita' : '• ativa'}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveDraftOperation(operation.id)}
                    style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                {currentDraftOperations.length} operacao(oes) neste arquivo
              </div>
              <button
                type="button"
                onClick={onClearDraft}
                style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#475569', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontWeight: 600 }}
              >
                Limpar rascunho
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px', borderRadius: '10px', background: '#f9fafb', border: '1px dashed #d1d5db', color: '#6b7280', fontSize: '0.86rem', lineHeight: 1.5 }}>
            Nenhuma correcao registrada para este arquivo ainda.
          </div>
        )}
      </div>

      {(correctiveSnapshotSaveMessage || correctiveSnapshotLoadMessage || savedCorrectiveSnapshot || restoredCorrectiveSnapshot) && (
        <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
          {correctiveSnapshotSaveMessage && (
            <div style={{ fontSize: '0.86rem', color: '#0f172a', marginBottom: (savedCorrectiveSnapshot || correctiveSnapshotLoadMessage || restoredCorrectiveSnapshot) ? '6px' : 0 }}>
              {correctiveSnapshotSaveMessage}
            </div>
          )}
          {correctiveSnapshotLoadMessage && (
            <div style={{ fontSize: '0.86rem', color: '#0f172a', marginBottom: (savedCorrectiveSnapshot || restoredCorrectiveSnapshot) ? '6px' : 0 }}>
              {correctiveSnapshotLoadMessage}
            </div>
          )}
          {savedCorrectiveSnapshot && (
            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5, marginBottom: restoredCorrectiveSnapshot ? '4px' : 0 }}>
              Snapshot salvo: {savedCorrectiveSnapshot.snapshotId.slice(0, 8)}... em {new Date(savedCorrectiveSnapshot.generatedAt).toLocaleString('pt-BR')}
            </div>
          )}
          {restoredCorrectiveSnapshot && (
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                Estado reaberto no canvas a partir do snapshot {restoredCorrectiveSnapshot.snapshotId.slice(0, 8)}...
              </div>
              {restoredProcessingContextAssessment ? (
                <ProcessingContextBanner
                  assessment={restoredProcessingContextAssessment}
                  heading="Contexto territorial restaurado"
                  noticesMode="first"
                  containerStyle={{ borderRadius: '10px' }}
                  headingStyle={{ fontSize: '0.78rem', fontWeight: 700 }}
                  detailStyle={{ fontSize: '0.78rem' }}
                  metricsStyle={{ fontSize: '0.7rem' }}
                />
              ) : null}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gap: '10px' }}>
        <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Acoes
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onUndo}
            disabled={!correctiveHistoryStatus?.canUndo}
            style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #7c3aed', background: '#fff', color: '#7c3aed', cursor: correctiveHistoryStatus?.canUndo ? 'pointer' : 'not-allowed', fontWeight: 700 }}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!correctiveHistoryStatus?.canRedo}
            style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #7c3aed', background: '#fff', color: '#7c3aed', cursor: correctiveHistoryStatus?.canRedo ? 'pointer' : 'not-allowed', fontWeight: 700 }}
          >
            Redo
          </button>
          <button
            type="button"
            onClick={onPrepareDraft}
            disabled={!selectedCorrectiveIssue}
            style={{ padding: '10px 12px', borderRadius: '10px', border: 'none', background: '#1d4ed8', color: '#fff', cursor: selectedCorrectiveIssue ? 'pointer' : 'not-allowed', fontWeight: 700 }}
          >
            Rascunho
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onReopenSnapshot}
            disabled={isLoadingCorrectiveSnapshot}
            style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #0f766e', background: '#fff', color: '#0f766e', cursor: isLoadingCorrectiveSnapshot ? 'not-allowed' : 'pointer', fontWeight: 700 }}
          >
            {isLoadingCorrectiveSnapshot ? 'Reabrindo...' : 'Reabrir'}
          </button>
          <button
            type="button"
            onClick={onSaveSnapshot}
            disabled={!currentCorrectiveSnapshot?.dxfData || isSavingCorrectiveSnapshot}
            style={{ padding: '10px 12px', borderRadius: '10px', border: 'none', background: '#0f766e', color: '#fff', cursor: (!currentCorrectiveSnapshot?.dxfData || isSavingCorrectiveSnapshot) ? 'not-allowed' : 'pointer', fontWeight: 700 }}
          >
            {isSavingCorrectiveSnapshot ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={onRevalidateSummary}
            disabled={!canRevalidateSummary}
            style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', cursor: canRevalidateSummary ? 'pointer' : 'not-allowed', fontWeight: 700 }}
          >
            Revalidar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CorrectivePanel;
