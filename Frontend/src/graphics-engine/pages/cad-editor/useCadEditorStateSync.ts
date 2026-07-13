import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CadLayerDefinition, CadOpenedDocument } from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

const DEFAULT_STATE_SYNC_MESSAGES = {
  defaultActiveLayerName: 'PRINCIPAL',
  buildGridSnapActiveNotice: ({
    gridSnapSize,
    measurementUnitShortLabel
  }: {
    gridSnapSize: number;
    measurementUnitShortLabel: string;
  }) => `Snap ao Grid ativo em ${gridSnapSize} ${measurementUnitShortLabel}.`,
  buildNewDocumentStabilizedNotice: ({
    workspaceSizeLabel,
    measurementUnitLabel
  }: {
    workspaceSizeLabel: string;
    measurementUnitLabel: string;
  }) => `Novo desenho estabilizado em ${workspaceSizeLabel} com unidade ${measurementUnitLabel.toLowerCase()}.`
};

export interface UseCadEditorStateSyncParams {
  layerSummaries: ReadonlyArray<Pick<CadLayerDefinition, 'name'>>;
  activeLayerName: string;
  annotationLayerName: string;
  textAnnotationLayerName: string;
  defaultAnnotationLayerName: string;
  defaultTextAnnotationLayerName: string;
  enableGridSnap: boolean;
  gridSnapSize: number;
  measurementUnitShortLabel: string;
  measurementUnitLabel: string;
  workspaceSizeLabel: string;
  openedDocument: Pick<CadOpenedDocument, 'source'> | null;
  setActiveLayerName: Dispatch<SetStateAction<string>>;
  setAnnotationLayerName: Dispatch<SetStateAction<string>>;
  setTextAnnotationLayerName: Dispatch<SetStateAction<string>>;
  setEditorNotice: Dispatch<SetStateAction<string>>;
  messages?: {
    defaultActiveLayerName: string;
    buildGridSnapActiveNotice: (params: {
      gridSnapSize: number;
      measurementUnitShortLabel: string;
    }) => string;
    buildNewDocumentStabilizedNotice: (params: {
      workspaceSizeLabel: string;
      measurementUnitLabel: string;
    }) => string;
  };
}

export const useCadEditorStateSync = ({
  layerSummaries,
  activeLayerName,
  annotationLayerName,
  textAnnotationLayerName,
  defaultAnnotationLayerName,
  defaultTextAnnotationLayerName,
  enableGridSnap,
  gridSnapSize,
  measurementUnitShortLabel,
  measurementUnitLabel,
  workspaceSizeLabel,
  openedDocument,
  setActiveLayerName,
  setAnnotationLayerName,
  setTextAnnotationLayerName,
  setEditorNotice,
  messages
}: UseCadEditorStateSyncParams) => {
  const resolvedMessages = messages ?? DEFAULT_STATE_SYNC_MESSAGES;

  useEffect(() => {
    if (layerSummaries.length === 0) {
      setActiveLayerName(resolvedMessages.defaultActiveLayerName);
      return;
    }

    const stillExists = layerSummaries.some((layer) => layer.name === activeLayerName);
    if (!stillExists) {
      setActiveLayerName(layerSummaries[0].name);
    }
  }, [activeLayerName, layerSummaries, resolvedMessages.defaultActiveLayerName, setActiveLayerName]);

  useEffect(() => {
    const stillExists = layerSummaries.some((layer) => layer.name === annotationLayerName);
    if (!stillExists) {
      setAnnotationLayerName(defaultAnnotationLayerName);
    }
  }, [annotationLayerName, defaultAnnotationLayerName, layerSummaries, setAnnotationLayerName]);

  useEffect(() => {
    const stillExists = layerSummaries.some((layer) => layer.name === textAnnotationLayerName);
    if (!stillExists) {
      setTextAnnotationLayerName(defaultTextAnnotationLayerName);
    }
  }, [defaultTextAnnotationLayerName, layerSummaries, setTextAnnotationLayerName, textAnnotationLayerName]);

  useEffect(() => {
    if (!enableGridSnap) {
      return;
    }

    setEditorNotice(
      resolvedMessages.buildGridSnapActiveNotice({
        gridSnapSize,
        measurementUnitShortLabel
      })
    );
  }, [enableGridSnap, gridSnapSize, measurementUnitShortLabel, resolvedMessages, setEditorNotice]);

  useEffect(() => {
    if (!openedDocument || openedDocument.source !== 'new') {
      return;
    }

    setEditorNotice(
      resolvedMessages.buildNewDocumentStabilizedNotice({
        workspaceSizeLabel,
        measurementUnitLabel
      })
    );
  }, [measurementUnitLabel, openedDocument, resolvedMessages, setEditorNotice, workspaceSizeLabel]);
};
