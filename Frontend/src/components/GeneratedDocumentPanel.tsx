import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';
import type { ProcessingContextStatusDTO } from '@/utils/processingContextStatus';

const TechnicalSummaryPanel = React.lazy(() => import('./TechnicalSummaryPanel'));

type GeneratedDocumentKind = 'memorial' | 'resumo-tecnico';

interface GeneratedDocumentPanelProps {
  generatedDocumentKind: GeneratedDocumentKind;
  requestedDocumentKind?: GeneratedDocumentKind;
  memorial: string;
  technicalSummaryJson: string;
  processingContextStatus?: ProcessingContextStatusDTO | null;
  isGenerating: boolean;
  memorialError?: string;
  onDownloadMemorial?: () => void;
  onCopyMemorial?: () => void;
}

const GeneratedDocumentPanel: React.FC<GeneratedDocumentPanelProps> = ({
  generatedDocumentKind,
  requestedDocumentKind = 'memorial',
  memorial,
  technicalSummaryJson,
  processingContextStatus,
  isGenerating,
  memorialError,
  onDownloadMemorial,
  onCopyMemorial
}) => {
  if (!memorial && !memorialError && !isGenerating) {
    return (
      <div className="memorial-section">
        <div className="memorial-header">
          <h2>{requestedDocumentKind === 'resumo-tecnico' ? 'Resumo Tecnico do Memorial' : 'Memorial Descritivo'}</h2>
        </div>
        <div className="memorial-content">
          <pre>Aguardando o processamento do documento.</pre>
        </div>
      </div>
    );
  }

  if (!memorial) {
    return null;
  }

  return (
    <div className="memorial-section">
      <div className="memorial-header">
        <h2>{generatedDocumentKind === 'resumo-tecnico' ? 'Resumo Tecnico do Memorial' : 'Memorial Descritivo Gerado'}</h2>
        {generatedDocumentKind !== 'resumo-tecnico' && (
          <div className="memorial-actions">
            <button
              onClick={onDownloadMemorial}
              className="btn-download-memorial"
              title="Exportar memorial como PDF"
              disabled={!onDownloadMemorial}
            >
              📄 Exportar PDF
            </button>
            <button
              onClick={onCopyMemorial}
              className="btn-copy-memorial"
              title="Copiar memorial para área de transferência"
              disabled={!onCopyMemorial}
            >
              📋 Copiar Texto
            </button>
          </div>
        )}
      </div>
      <div className="memorial-content">
        {generatedDocumentKind === 'resumo-tecnico' ? (
          technicalSummaryJson ? (
            <ErrorBoundary
              fallback={(
                <div style={{ padding: '16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px' }}>
                  <p style={{ margin: '0 0 12px', color: '#9a3412', fontWeight: 600 }}>
                    Nao foi possivel renderizar o painel do Resumo Tecnico. Exibindo o conteudo textual.
                  </p>
                  <pre>{memorial}</pre>
                </div>
              )}
            >
              <Suspense fallback={<pre>{memorial}</pre>}>
                <TechnicalSummaryPanel
                  summaryJson={technicalSummaryJson}
                  summaryText={memorial}
                  processingContextStatus={processingContextStatus}
                />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <pre>{memorial}</pre>
          )
        ) : (
          <pre>{memorial}</pre>
        )}
      </div>
    </div>
  );
};

export default GeneratedDocumentPanel;
