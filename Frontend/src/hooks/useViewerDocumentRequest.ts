import { useEffect, useMemo, useState } from 'react';
import type { ConfirmedLotSelection, ConfirmedReferencePoint } from '@/graphics-engine/components/viewer-dxf';
import type { FileMetadata } from '@/types';
import type { DXFData } from '@/utils/dxfParser';

export type GeneratedDocumentKind = 'memorial' | 'resumo-tecnico';

export interface ViewerDocumentRequest {
  kind: GeneratedDocumentKind;
  sourceFile?: FileMetadata | null;
  sourceDxfData?: DXFData | null;
  selections?: ConfirmedLotSelection[];
  referencePoints?: ConfirmedReferencePoint[];
  createdAt: string;
}

const VIEWER_DOCUMENT_REQUEST_STORAGE_PREFIX = 'viewerDocumentRequest:';

const buildViewerDocumentRequestKey = (): string =>
  `${VIEWER_DOCUMENT_REQUEST_STORAGE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const persistViewerDocumentRequest = (request: ViewerDocumentRequest): string => {
  const requestKey = buildViewerDocumentRequestKey();
  localStorage.setItem(requestKey, JSON.stringify(request));
  return requestKey;
};

export const readViewerDocumentRequest = (requestKey: string | null): ViewerDocumentRequest | null => {
  if (!requestKey) {
    return null;
  }

  const rawValue = localStorage.getItem(requestKey);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as ViewerDocumentRequest;
  } catch (error) {
    console.error('Erro ao ler requisicao de documento do viewer:', error);
    return null;
  }
};

export const clearViewerDocumentRequest = (requestKey: string | null) => {
  if (!requestKey) {
    return;
  }

  localStorage.removeItem(requestKey);
};

interface UseViewerDocumentRequestBootstrapParams {
  enabled: boolean;
  requestKey: string | null;
  currentFile?: FileMetadata | null;
  currentDxfData?: DXFData | null;
  isGenerating: boolean;
  onGenerateTechnicalSummary: (sourceDxfData?: DXFData | null, sourceFile?: FileMetadata | null, referencePoints?: ConfirmedReferencePoint[]) => Promise<void>;
  onHandlePolygonConfirmed: (selections: ConfirmedLotSelection[], referencePoints?: ConfirmedReferencePoint[], currentFile?: FileMetadata | null) => Promise<void>;
  onGenerateMemorial: (sourceDxfData?: DXFData | null, sourceFile?: FileMetadata | null) => Promise<void>;
}

export const useViewerDocumentRequestBootstrap = ({
  enabled,
  requestKey,
  currentFile,
  currentDxfData,
  isGenerating,
  onGenerateTechnicalSummary,
  onHandlePolygonConfirmed,
  onGenerateMemorial
}: UseViewerDocumentRequestBootstrapParams) => {
  const [requestConsumed, setRequestConsumed] = useState(false);

  const documentRequest = useMemo(
    () => (enabled ? readViewerDocumentRequest(requestKey) : null),
    [enabled, requestKey]
  );

  useEffect(() => {
    setRequestConsumed(false);
  }, [requestKey]);

  useEffect(() => {
    if (!enabled || requestConsumed || isGenerating || !documentRequest || !currentFile) {
      return;
    }

    const runRequest = async () => {
      setRequestConsumed(true);
      clearViewerDocumentRequest(requestKey);

      if (documentRequest.kind === 'resumo-tecnico') {
        await onGenerateTechnicalSummary(
          documentRequest.sourceDxfData || currentDxfData,
          documentRequest.sourceFile || currentFile,
          documentRequest.referencePoints || []
        );
        return;
      }

      if ((documentRequest.selections || []).length > 0) {
        await onHandlePolygonConfirmed(
          documentRequest.selections || [],
          documentRequest.referencePoints || [],
          documentRequest.sourceFile || currentFile
        );
        return;
      }

      await onGenerateMemorial(documentRequest.sourceDxfData || currentDxfData, documentRequest.sourceFile || currentFile);
    };

    void runRequest();
  }, [
    currentDxfData,
    currentFile,
    documentRequest,
    enabled,
    isGenerating,
    onGenerateMemorial,
    onGenerateTechnicalSummary,
    onHandlePolygonConfirmed,
    requestConsumed,
    requestKey
  ]);

  return documentRequest;
};
