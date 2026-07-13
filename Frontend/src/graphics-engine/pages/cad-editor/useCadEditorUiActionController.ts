import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DrawingTextAlignment, DrawingTextVerticalAlignment } from '@/graphics-engine/components/viewer-dxf/types';
import type { CadMeasurementUnit, CadMeasurementUnitOption } from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

const DEFAULT_UI_ACTION_MESSAGES = {
  showGridEnabled: 'Grade visual ativada no canvas.',
  showGridDisabled: 'Grade visual ocultada no canvas.',
  cursorCoordinatesEnabled: 'Coordenadas do cursor ativadas no canvas.',
  cursorCoordinatesDisabled: 'Coordenadas do cursor ocultadas no canvas.',
  guidesVisibleEnabled: 'Guias visiveis e aptas ao snap.',
  guidesVisibleDisabled: 'Guias ocultadas e snap em guias desativado.',
  buildGridSnapNotice: ({ checked, gridSnapSize }: { checked: boolean; gridSnapSize: number }) => (
    checked ? `Snap ao Grid ativado (${gridSnapSize}).` : 'Snap ao Grid desativado.'
  ),
  buildObjectSnapNotice: ({ checked }: { checked: boolean }) => (
    checked ? 'Snap a Objetos ativado.' : 'Snap a Objetos desativado.'
  ),
  buildActiveLayerNotice: ({ layerName }: { layerName: string }) => `Camada geometrica ativa ajustada para ${layerName}.`,
  buildAnnotationLayerNotice: ({ layerName }: { layerName: string }) => `Camada de anotacao ajustada para ${layerName}.`,
  buildPointToPointCloseNotice: ({ checked }: { checked: boolean }) => (
    checked
      ? 'Ponto a Ponto configurado para fechar o contorno ao concluir.'
      : 'Ponto a Ponto configurado para manter a polilinha aberta.'
  ),
  buildTextAlignmentNotice: ({ value }: { value: DrawingTextAlignment }) => `Alinhamento do texto ajustado para ${value}.`,
  buildTextVerticalAlignmentNotice: ({ value }: { value: DrawingTextVerticalAlignment }) => `Ancoragem vertical do texto ajustada para ${value}.`,
  buildTextUsesAnnotationLayerNotice: ({
    checked,
    textAnnotationLayerName,
    activeLayerName
  }: {
    checked: boolean;
    textAnnotationLayerName: string;
    activeLayerName: string;
  }) => (
    checked
      ? `Texto configurado para usar a camada tecnica ${textAnnotationLayerName}.`
      : `Texto configurado para usar a camada ativa ${activeLayerName}.`
  ),
  buildTextAnnotationLayerNotice: ({ layerName }: { layerName: string }) => `Camada de textos tecnicos ajustada para ${layerName}.`
};

export interface UseCadEditorUiActionControllerParams {
  gridSnapSize: number;
  activeLayerName: string;
  activeLayerSummaryName: string | null;
  textAnnotationLayerName: string;
  measurementUnitOptions: ReadonlyArray<CadMeasurementUnitOption>;
  setShowGrid: Dispatch<SetStateAction<boolean>>;
  setShowCursorCoordinates: Dispatch<SetStateAction<boolean>>;
  setGuidesVisible: Dispatch<SetStateAction<boolean>>;
  setHoveredGuideId: Dispatch<SetStateAction<string | null>>;
  setEnableGridSnap: Dispatch<SetStateAction<boolean>>;
  setEnableObjectSnap: Dispatch<SetStateAction<boolean>>;
  setActiveLayerName: Dispatch<SetStateAction<string>>;
  setAnnotationLayerName: Dispatch<SetStateAction<string>>;
  setClosePointToPointShape: Dispatch<SetStateAction<boolean>>;
  setDrawingTextAlignment: Dispatch<SetStateAction<DrawingTextAlignment>>;
  setDrawingTextVerticalAlignment: Dispatch<SetStateAction<DrawingTextVerticalAlignment>>;
  setTextUsesAnnotationLayer: Dispatch<SetStateAction<boolean>>;
  setTextAnnotationLayerName: Dispatch<SetStateAction<string>>;
  setMeasurementUnit: Dispatch<SetStateAction<CadMeasurementUnit>>;
  setNewDocumentWorkspaceSize: Dispatch<SetStateAction<number>>;
  setEditorNotice: Dispatch<SetStateAction<string>>;
  messages?: {
    showGridEnabled: string;
    showGridDisabled: string;
    cursorCoordinatesEnabled: string;
    cursorCoordinatesDisabled: string;
    guidesVisibleEnabled: string;
    guidesVisibleDisabled: string;
    buildGridSnapNotice: (params: { checked: boolean; gridSnapSize: number }) => string;
    buildObjectSnapNotice: (params: { checked: boolean }) => string;
    buildActiveLayerNotice: (params: { layerName: string }) => string;
    buildAnnotationLayerNotice: (params: { layerName: string }) => string;
    buildPointToPointCloseNotice: (params: { checked: boolean }) => string;
    buildTextAlignmentNotice: (params: { value: DrawingTextAlignment }) => string;
    buildTextVerticalAlignmentNotice: (params: { value: DrawingTextVerticalAlignment }) => string;
    buildTextUsesAnnotationLayerNotice: (params: {
      checked: boolean;
      textAnnotationLayerName: string;
      activeLayerName: string;
    }) => string;
    buildTextAnnotationLayerNotice: (params: { layerName: string }) => string;
  };
}

export const useCadEditorUiActionController = ({
  gridSnapSize,
  activeLayerName,
  activeLayerSummaryName,
  textAnnotationLayerName,
  measurementUnitOptions,
  setShowGrid,
  setShowCursorCoordinates,
  setGuidesVisible,
  setHoveredGuideId,
  setEnableGridSnap,
  setEnableObjectSnap,
  setActiveLayerName,
  setAnnotationLayerName,
  setClosePointToPointShape,
  setDrawingTextAlignment,
  setDrawingTextVerticalAlignment,
  setTextUsesAnnotationLayer,
  setTextAnnotationLayerName,
  setMeasurementUnit,
  setNewDocumentWorkspaceSize,
  setEditorNotice,
  messages
}: UseCadEditorUiActionControllerParams) => {
  const resolvedMessages = messages ?? DEFAULT_UI_ACTION_MESSAGES;

  const handleShowGridChange = useCallback((checked: boolean) => {
    setShowGrid(checked);
    setEditorNotice(checked ? resolvedMessages.showGridEnabled : resolvedMessages.showGridDisabled);
  }, [resolvedMessages, setEditorNotice, setShowGrid]);

  const handleShowCursorCoordinatesChange = useCallback((checked: boolean) => {
    setShowCursorCoordinates(checked);
    setEditorNotice(checked ? resolvedMessages.cursorCoordinatesEnabled : resolvedMessages.cursorCoordinatesDisabled);
  }, [resolvedMessages, setEditorNotice, setShowCursorCoordinates]);

  const handleGuidesVisibleChange = useCallback((checked: boolean) => {
    setGuidesVisible(checked);
    setHoveredGuideId(null);
    setEditorNotice(checked ? resolvedMessages.guidesVisibleEnabled : resolvedMessages.guidesVisibleDisabled);
  }, [resolvedMessages, setEditorNotice, setGuidesVisible, setHoveredGuideId]);

  const handleEnableGridSnapChange = useCallback((checked: boolean) => {
    setEnableGridSnap(checked);
    setEditorNotice(resolvedMessages.buildGridSnapNotice({ checked, gridSnapSize }));
  }, [gridSnapSize, resolvedMessages, setEditorNotice, setEnableGridSnap]);

  const handleEnableObjectSnapChange = useCallback((checked: boolean) => {
    setEnableObjectSnap(checked);
    setEditorNotice(resolvedMessages.buildObjectSnapNotice({ checked }));
  }, [resolvedMessages, setEditorNotice, setEnableObjectSnap]);

  const handleActiveLayerChange = useCallback((nextLayerName: string) => {
    setActiveLayerName(nextLayerName);
    setEditorNotice(resolvedMessages.buildActiveLayerNotice({ layerName: nextLayerName }));
  }, [resolvedMessages, setActiveLayerName, setEditorNotice]);

  const handleAnnotationLayerChange = useCallback((nextLayerName: string) => {
    setAnnotationLayerName(nextLayerName);
    setEditorNotice(resolvedMessages.buildAnnotationLayerNotice({ layerName: nextLayerName }));
  }, [resolvedMessages, setAnnotationLayerName, setEditorNotice]);

  const handleClosePointToPointShapeChange = useCallback((checked: boolean) => {
    setClosePointToPointShape(checked);
    setEditorNotice(resolvedMessages.buildPointToPointCloseNotice({ checked }));
  }, [resolvedMessages, setClosePointToPointShape, setEditorNotice]);

  const handleDrawingTextAlignmentChange = useCallback((nextValue: DrawingTextAlignment) => {
    setDrawingTextAlignment(nextValue);
    setEditorNotice(resolvedMessages.buildTextAlignmentNotice({ value: nextValue }));
  }, [resolvedMessages, setDrawingTextAlignment, setEditorNotice]);

  const handleDrawingTextVerticalAlignmentChange = useCallback((nextValue: DrawingTextVerticalAlignment) => {
    setDrawingTextVerticalAlignment(nextValue);
    setEditorNotice(resolvedMessages.buildTextVerticalAlignmentNotice({ value: nextValue }));
  }, [resolvedMessages, setDrawingTextVerticalAlignment, setEditorNotice]);

  const handleTextUsesAnnotationLayerChange = useCallback((checked: boolean) => {
    setTextUsesAnnotationLayer(checked);
    setEditorNotice(
      resolvedMessages.buildTextUsesAnnotationLayerNotice({
        checked,
        textAnnotationLayerName,
        activeLayerName: activeLayerSummaryName || activeLayerName
      })
    );
  }, [
    activeLayerName,
    activeLayerSummaryName,
    resolvedMessages,
    setEditorNotice,
    setTextUsesAnnotationLayer,
    textAnnotationLayerName
  ]);

  const handleTextAnnotationLayerNameChange = useCallback((nextLayerName: string) => {
    setTextAnnotationLayerName(nextLayerName);
    setEditorNotice(resolvedMessages.buildTextAnnotationLayerNotice({ layerName: nextLayerName }));
  }, [resolvedMessages, setEditorNotice, setTextAnnotationLayerName]);

  const handleMeasurementUnitChange = useCallback((unitId: string) => {
    const nextUnit = unitId as CadMeasurementUnit;
    const preset = measurementUnitOptions.find((unit) => unit.id === nextUnit) || measurementUnitOptions[1];
    setMeasurementUnit(nextUnit);
    setNewDocumentWorkspaceSize(preset.defaultWorkspaceSize);
  }, [measurementUnitOptions, setMeasurementUnit, setNewDocumentWorkspaceSize]);

  return {
    handleShowGridChange,
    handleShowCursorCoordinatesChange,
    handleGuidesVisibleChange,
    handleEnableGridSnapChange,
    handleEnableObjectSnapChange,
    handleActiveLayerChange,
    handleAnnotationLayerChange,
    handleClosePointToPointShapeChange,
    handleDrawingTextAlignmentChange,
    handleDrawingTextVerticalAlignmentChange,
    handleTextUsesAnnotationLayerChange,
    handleTextAnnotationLayerNameChange,
    handleMeasurementUnitChange
  };
};
