import ProcessingContextBanner from '@/components/ProcessingContextBanner';
import type { RestoredCorrectiveSnapshotView } from '@/graphics-engine/shared/viewer-corrective';
import {
  getProcessingContextStatusLabels,
  resolveTechnicalSummaryProcessingContext
} from '@/utils/processingContextStatus';

type ViewerMode = 'view' | 'correct';

interface ViewerHeaderProps {
  viewerMode: ViewerMode;
  activeFileName?: string | null;
  hasCorrectiveMode: boolean;
  canScanErrors: boolean;
  correctiveIssuesSourceLabel: string;
  correctiveIssueCount: number;
  isLoadingCorrectiveSnapshot: boolean;
  correctiveSnapshotLoadMessage?: string;
  restoredCorrectiveSnapshot?: RestoredCorrectiveSnapshotView | null;
  onSelectViewMode: () => void;
  onSelectCorrectiveMode: () => void;
  onScanErrors: () => void;
  onReopenLatestSnapshot: () => void;
}

const ViewerHeader: React.FC<ViewerHeaderProps> = ({
  viewerMode,
  activeFileName,
  hasCorrectiveMode,
  canScanErrors,
  correctiveIssuesSourceLabel,
  correctiveIssueCount,
  isLoadingCorrectiveSnapshot,
  correctiveSnapshotLoadMessage,
  restoredCorrectiveSnapshot,
  onSelectViewMode,
  onSelectCorrectiveMode,
  onScanErrors,
  onReopenLatestSnapshot
}) => {
  const showCorrectiveHint = !hasCorrectiveMode;
  const showSnapshotMessage = Boolean(correctiveSnapshotLoadMessage);
  const restoredProcessingContextAssessment = restoredCorrectiveSnapshot?.processingContextStatus
    ? resolveTechnicalSummaryProcessingContext('', restoredCorrectiveSnapshot.processingContextStatus)
    : null;
  const restoredProcessingContextLabels = restoredProcessingContextAssessment
    ? getProcessingContextStatusLabels(restoredProcessingContextAssessment.status)
    : null;

  return (
    <div className="viewer-header">
      <div className="viewer-header-copy">
        <span className="viewer-header-eyebrow">Operacao / Memorial</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
          <h1>Memorial</h1>
          {activeFileName && (
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '6px 10px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              color: 'rgba(255, 255, 255, 0.95)'
            }}>
              DXF ativo: {activeFileName}
            </span>
          )}
        </div>
        <p>
          Revise a base tecnica ativa, confira lotes e pontos de referencia e siga para a
          geracao do memorial com mais contexto tecnico.
        </p>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        marginTop: '16px',
        padding: '14px 16px',
        background: viewerMode === 'correct' ? '#eff6ff' : '#f8fafc',
        border: `1px solid ${viewerMode === 'correct' ? '#bfdbfe' : '#e2e8f0'}`,
        borderRadius: '14px'
      }}>
        <div style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Use `Scanear erros` para levantar pendencias do DXF e corrigir manualmente. O resumo tecnico pode ficar para depois, como guia do memorial.
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onSelectViewMode}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: viewerMode === 'view' ? '2px solid #2563eb' : '1px solid #cbd5e1',
              background: viewerMode === 'view' ? '#dbeafe' : '#fff',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Visualizar
          </button>
          <button
            type="button"
            onClick={onScanErrors}
            disabled={!canScanErrors}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #ea580c',
              background: '#fff7ed',
              cursor: canScanErrors ? 'pointer' : 'not-allowed',
              fontWeight: 700,
              color: '#c2410c',
              opacity: canScanErrors ? 1 : 0.6
            }}
          >
            Scanear erros
          </button>
          <button
            type="button"
            onClick={onSelectCorrectiveMode}
            disabled={!hasCorrectiveMode}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: viewerMode === 'correct' ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
              background: viewerMode === 'correct' ? '#dbeafe' : '#fff',
              cursor: hasCorrectiveMode ? 'pointer' : 'not-allowed',
              fontWeight: 700,
              opacity: hasCorrectiveMode ? 1 : 0.6
            }}
          >
            Corrigir arquivo
          </button>
          <button
            type="button"
            onClick={onReopenLatestSnapshot}
            disabled={isLoadingCorrectiveSnapshot}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #0f766e',
              background: '#fff',
              cursor: isLoadingCorrectiveSnapshot ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              color: '#0f766e'
            }}
          >
            {isLoadingCorrectiveSnapshot ? 'Reabrindo...' : 'Reabrir ultimo snapshot'}
          </button>
        </div>
      </div>

      {(showCorrectiveHint || showSnapshotMessage || restoredProcessingContextAssessment) && (
        <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
          {showCorrectiveHint && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: 'rgba(255, 255, 255, 0.92)',
              fontSize: '0.88rem',
              lineHeight: 1.45
            }}>
              Rode o scan do arquivo para habilitar a correcao manual. O resumo tecnico continua opcional.
            </div>
          )}
          {!showCorrectiveHint && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: 'rgba(255, 255, 255, 0.92)',
              fontSize: '0.88rem',
              lineHeight: 1.45
            }}>
              {correctiveIssueCount} item(ns) ativos via {correctiveIssuesSourceLabel}.
            </div>
          )}
          {showSnapshotMessage && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: 'rgba(255, 255, 255, 0.92)',
              fontSize: '0.88rem',
              lineHeight: 1.45
            }}>
              {correctiveSnapshotLoadMessage}
            </div>
          )}
          {restoredProcessingContextAssessment && restoredProcessingContextLabels ? (
            <ProcessingContextBanner
              assessment={restoredProcessingContextAssessment}
              tone="inverse"
              heading={`Snapshot restaurado com contexto territorial ${restoredProcessingContextLabels.snapshotState}`}
              noticesMode="none"
              headingStyle={{ fontSize: '0.82rem', fontWeight: 800 }}
              detailStyle={{ fontSize: '0.84rem' }}
              metricsStyle={{ fontSize: '0.74rem', marginTop: '8px' }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ViewerHeader;
