import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DrawingTextAlignment, DrawingTextVerticalAlignment } from '@/graphics-engine/components/viewer-dxf/types';
import type { TextToolPresetDefinition } from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

export interface UseCadEditorTextToolControllerParams {
  textToolPresets: ReadonlyArray<TextToolPresetDefinition>;
  selectedTextToolPresetId: TextToolPresetDefinition['id'];
  selectedTextToolPresetLabel: string;
  annotationLayerName: string;
  textAnnotationLayerName: string;
  activeLayerName: string;
  activeLayerSummaryName: string | null;
  defaultTextAnnotationLayerName: string;
  setTextToolPresetId: Dispatch<SetStateAction<TextToolPresetDefinition['id']>>;
  setDrawingTextValue: Dispatch<SetStateAction<string>>;
  setDrawingTextHeight: Dispatch<SetStateAction<number>>;
  setDrawingTextRotation: Dispatch<SetStateAction<number>>;
  setDrawingTextAlignment: Dispatch<SetStateAction<DrawingTextAlignment>>;
  setDrawingTextVerticalAlignment: Dispatch<SetStateAction<DrawingTextVerticalAlignment>>;
  setTextUsesAnnotationLayer: Dispatch<SetStateAction<boolean>>;
  setTextAnnotationLayerName: Dispatch<SetStateAction<string>>;
  setEditorNotice: Dispatch<SetStateAction<string>>;
  messages?: {
    buildApplyTextToolPresetNotice: (params: { presetLabel: string; targetLayerLabel: string }) => string;
    buildRestoreSelectedTextToolPresetNotice: (params: { presetLabel: string }) => string;
  };
}

const DEFAULT_TEXT_TOOL_CONTROLLER_MESSAGES: NonNullable<UseCadEditorTextToolControllerParams['messages']> = {
  buildApplyTextToolPresetNotice: ({ presetLabel, targetLayerLabel }) => `Preset de texto aplicado: ${presetLabel} na camada ${targetLayerLabel}.`,
  buildRestoreSelectedTextToolPresetNotice: ({ presetLabel }) => `Preset de texto restaurado: ${presetLabel}.`
};

export const useCadEditorTextToolController = ({
  textToolPresets,
  selectedTextToolPresetId,
  selectedTextToolPresetLabel,
  annotationLayerName,
  textAnnotationLayerName,
  activeLayerName,
  activeLayerSummaryName,
  defaultTextAnnotationLayerName,
  setTextToolPresetId,
  setDrawingTextValue,
  setDrawingTextHeight,
  setDrawingTextRotation,
  setDrawingTextAlignment,
  setDrawingTextVerticalAlignment,
  setTextUsesAnnotationLayer,
  setTextAnnotationLayerName,
  setEditorNotice,
  messages
}: UseCadEditorTextToolControllerParams) => {
  const resolvedMessages = messages ?? DEFAULT_TEXT_TOOL_CONTROLLER_MESSAGES;
  const applyTextToolPreset = useCallback((presetId: TextToolPresetDefinition['id']) => {
    const preset = textToolPresets.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }

    setTextToolPresetId(preset.id);
    setDrawingTextValue(preset.textValue);
    setDrawingTextHeight(preset.height);
    setDrawingTextRotation(preset.rotation);
    setDrawingTextAlignment(preset.alignment);
    setDrawingTextVerticalAlignment(preset.verticalAlignment);

    if (preset.target === 'active') {
      setTextUsesAnnotationLayer(false);
    } else {
      setTextUsesAnnotationLayer(true);
      if (preset.target === 'dimension-annotation') {
        setTextAnnotationLayerName(annotationLayerName);
      } else if (!textAnnotationLayerName) {
        setTextAnnotationLayerName(defaultTextAnnotationLayerName);
      }
    }

    const targetLayerLabel = preset.target === 'active'
      ? activeLayerSummaryName || activeLayerName
      : preset.target === 'dimension-annotation'
        ? annotationLayerName
        : textAnnotationLayerName || defaultTextAnnotationLayerName;

    setEditorNotice(resolvedMessages.buildApplyTextToolPresetNotice({
      presetLabel: preset.label,
      targetLayerLabel
    }));
  }, [
    activeLayerName,
    activeLayerSummaryName,
    annotationLayerName,
    defaultTextAnnotationLayerName,
    resolvedMessages,
    setDrawingTextAlignment,
    setDrawingTextHeight,
    setDrawingTextRotation,
    setDrawingTextValue,
    setDrawingTextVerticalAlignment,
    setEditorNotice,
    setTextAnnotationLayerName,
    setTextToolPresetId,
    setTextUsesAnnotationLayer,
    textAnnotationLayerName,
    textToolPresets
  ]);

  const restoreSelectedTextToolPreset = useCallback(() => {
    applyTextToolPreset(selectedTextToolPresetId);
    setEditorNotice(resolvedMessages.buildRestoreSelectedTextToolPresetNotice({ presetLabel: selectedTextToolPresetLabel }));
  }, [applyTextToolPreset, resolvedMessages, selectedTextToolPresetId, selectedTextToolPresetLabel, setEditorNotice]);

  return {
    applyTextToolPreset,
    restoreSelectedTextToolPreset
  };
};
