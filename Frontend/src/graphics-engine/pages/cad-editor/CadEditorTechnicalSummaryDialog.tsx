import React, { useMemo } from 'react';
import type { ComponentType } from 'react';
import ProcessingContextBanner from '@/components/ProcessingContextBanner';
import type {
  ProcessingContextAssessment,
  ProcessingContextAssessmentNotice,
  ProcessingContextStatusDTO
} from '@/utils/processingContextStatus';

interface TechnicalSummaryPanelProps {
  summaryJson: string;
  summaryText: string;
  processingContextStatus?: ProcessingContextStatusDTO | null;
  manualReviewLotNumbers?: number[];
  selectionScope?: TechnicalSummarySelectionScopeStatus;
}

interface BoundaryContextStatus {
  id: string;
  title: string;
  label: string;
  pointCount: number;
  isSaved: boolean;
  description: string;
}

interface TechnicalSummaryOperationalNotice {
  id: string;
  title: string;
  message: string;
}

interface TechnicalSummarySelectionScopeStatus {
  mode: 'full' | 'partial';
  title: string;
  detail: string;
  badgeLabel: string;
  lotNumbers: number[];
}

interface CadEditorTechnicalSummaryDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  summaryError: string;
  summaryJson: string;
  summaryText: string;
  processingContextStatus?: ProcessingContextStatusDTO | null;
  analyzedFileName: string;
  manualReviewLotNumbers?: number[];
  boundaryContexts: BoundaryContextStatus[];
  operationalNotices: TechnicalSummaryOperationalNotice[];
  selectionScope: TechnicalSummarySelectionScopeStatus;
  TechnicalSummaryPanelComponent?: ComponentType<TechnicalSummaryPanelProps>;
  onClose: () => void;
}

export const CadEditorTechnicalSummaryDialog: React.FC<CadEditorTechnicalSummaryDialogProps> = ({
  isOpen,
  isLoading,
  summaryError,
  summaryJson,
  summaryText,
  processingContextStatus,
  analyzedFileName,
  manualReviewLotNumbers = [],
  boundaryContexts,
  operationalNotices,
  selectionScope,
  TechnicalSummaryPanelComponent,
  onClose
}) => {
  const operationalContextAssessment = useMemo<ProcessingContextAssessment>(() => {
    const savedBoundaryContexts = boundaryContexts.filter((context) => context.isSaved);
    const totalPointCount = savedBoundaryContexts.reduce((total, context) => total + context.pointCount, 0);
    const notices: ProcessingContextAssessmentNotice[] = operationalNotices.map((notice) => ({
      id: notice.id,
      title: notice.title,
      message: notice.message
    }));

    if (savedBoundaryContexts.length === 0) {
      return {
        status: 'absent',
        hasBaseArea: false,
        hasOriginalProperty: false,
        hasRemainingArea: false,
        baseAreaPointCount: 0,
        originalPropertyPointCount: 0,
        remainingAreaPointCount: 0,
        headline: 'Primarias ausentes no editor',
        detail: 'Nenhum trecho primario foi salvo em Operacoes antes da geracao do resumo tecnico.',
        notices
      };
    }

    return {
      status: 'complete',
      hasBaseArea: true,
      hasOriginalProperty: true,
      hasRemainingArea: false,
      baseAreaPointCount: totalPointCount,
      originalPropertyPointCount: totalPointCount,
      remainingAreaPointCount: 0,
      headline: 'Primarias salvas no editor',
      detail: 'Os trechos primarios atuais foram salvos em Operacoes antes da geracao do resumo tecnico.',
      notices
    };
  }, [boundaryContexts, operationalNotices]);
  const normalizedManualReviewLotNumbers = useMemo(
    () => Array.from(new Set(manualReviewLotNumbers.filter((value) => Number.isFinite(value)))).sort((left, right) => left - right),
    [manualReviewLotNumbers]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="cad-editor-settings-backdrop" onClick={onClose}>
      <div
        className="cad-editor-settings-dialog cad-editor-technical-summary-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cad-editor-settings-header">
          <div className="cad-editor-technical-summary-header">
            <strong>Resumo Técnico</strong>
            <span>{analyzedFileName || 'Documento atual do editor'}</span>
          </div>
          <button type="button" className="cad-editor-secondary-button" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="cad-editor-settings-body cad-editor-technical-summary-body">
          <section className="cad-editor-technical-summary-context">
            <div className="cad-editor-technical-summary-context-header">
              <strong>Contexto operacional</strong>
              <span>Trechos primarios salvos em Operacoes antes da geracao.</span>
            </div>
            <ProcessingContextBanner
              assessment={operationalContextAssessment}
              heading={operationalContextAssessment.headline}
              noticesMode="none"
              containerStyle={{ marginBottom: '12px' }}
              headingStyle={{ fontSize: '0.8rem' }}
              detailStyle={{ fontSize: '0.78rem' }}
              metricsStyle={{ fontSize: '0.72rem', marginTop: '8px' }}
            />
            <div className="cad-editor-technical-summary-context-grid">
              {boundaryContexts.map((context) => (
                <article
                  key={context.id}
                  className={`cad-editor-technical-summary-context-card ${context.isSaved ? 'is-saved' : 'is-empty'}`}
                >
                  <div className="cad-editor-technical-summary-context-title-row">
                    <strong>{context.title}</strong>
                    <span>{context.isSaved ? 'Salva' : 'Nao salva'}</span>
                  </div>
                  <div className="cad-editor-technical-summary-context-metadata">
                    <span>Rotulo: {context.label}</span>
                    <span>Pontos: {context.pointCount}</span>
                  </div>
                  <p>{context.description}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="cad-editor-technical-summary-notices">
            <div className="cad-editor-technical-summary-context-header">
              <strong>Escopo da geracao</strong>
              <span>Como o editor interpretou o fluxo atual antes de gerar o resumo.</span>
            </div>
            <div
              style={{
                border: `1px solid ${selectionScope.mode === 'partial' ? 'rgba(234, 88, 12, 0.24)' : 'rgba(15, 118, 110, 0.24)'}`,
                background: selectionScope.mode === 'partial' ? 'rgba(255, 237, 213, 0.4)' : 'rgba(220, 252, 231, 0.45)',
                borderRadius: '12px',
                padding: '12px'
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <strong style={{ color: '#0f172a' }}>{selectionScope.title}</strong>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: '#ffffff',
                    border: `1px solid ${selectionScope.mode === 'partial' ? 'rgba(234, 88, 12, 0.28)' : 'rgba(15, 118, 110, 0.28)'}`,
                    color: selectionScope.mode === 'partial' ? '#c2410c' : '#0f766e',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  {selectionScope.badgeLabel}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                {selectionScope.detail}
              </div>
              {selectionScope.lotNumbers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {selectionScope.lotNumbers.map((lotNumber) => (
                    <span
                      key={lotNumber}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '999px',
                        background: 'rgba(249, 115, 22, 0.10)',
                        border: '1px solid rgba(249, 115, 22, 0.24)',
                        color: '#c2410c',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}
                    >
                      Lote {lotNumber}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
          {operationalNotices.length > 0 ? (
            <section className="cad-editor-technical-summary-notices">
              <div className="cad-editor-technical-summary-context-header">
                <strong>Avisos Operacionais</strong>
                <span>A geração continua, mas o contexto territorial merece revisão.</span>
              </div>
              <div className="cad-editor-technical-summary-notice-list">
                {operationalNotices.map((notice) => (
                  <article key={notice.id} className="cad-editor-technical-summary-notice-card">
                    <strong>{notice.title}</strong>
                    <p>{notice.message}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {normalizedManualReviewLotNumbers.length > 0 && !TechnicalSummaryPanelComponent ? (
            <section className="cad-editor-technical-summary-notices">
              <div className="cad-editor-technical-summary-context-header">
                <strong>Revisao manual separada</strong>
                <span>Lotes marcados com Alt+Clique no viewer para conferencia humana.</span>
              </div>
              <div
                style={{
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderRadius: '12px',
                  padding: '12px'
                }}
              >
                <div style={{ fontSize: '0.82rem', color: '#92400e', marginBottom: '10px' }}>
                  Esses lotes ficam separados da validacao automatica para ajudar a revisar casos fora do padrao.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {normalizedManualReviewLotNumbers.map((lotNumber) => (
                    <span
                      key={lotNumber}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '999px',
                        background: 'rgba(217, 119, 6, 0.14)',
                        border: '1px solid rgba(217, 119, 6, 0.32)',
                        color: '#9a3412',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}
                    >
                      Lote {lotNumber}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
          {isLoading ? (
            <div className="cad-editor-technical-summary-placeholder">
              Gerando resumo técnico do desenho atual...
            </div>
          ) : null}
          {!isLoading && summaryError ? (
            <div className="cad-editor-technical-summary-error">
              {summaryError}
            </div>
          ) : null}
          {!isLoading && !summaryError && TechnicalSummaryPanelComponent ? (
            <TechnicalSummaryPanelComponent
              summaryJson={summaryJson}
              summaryText={summaryText}
              processingContextStatus={processingContextStatus}
              manualReviewLotNumbers={normalizedManualReviewLotNumbers}
              selectionScope={selectionScope}
            />
          ) : null}
          {!isLoading && !summaryError && !TechnicalSummaryPanelComponent ? (
            <div className="cad-editor-technical-summary-placeholder">
              O host atual não forneceu o painel de Resumo Técnico.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
