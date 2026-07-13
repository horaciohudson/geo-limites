import { useMemo } from 'react';
import type { DrawingTextAlignment, DrawingTextVerticalAlignment } from '@/graphics-engine/components/viewer-dxf/types';
import {
  buildTextPresetDeviationLabels,
  CUSTOM_TEXT_TOOL_PRESET_ID,
  CUSTOM_TEXT_TOOL_PRESET_LABEL,
  matchesTextToolPreset,
  type TextToolPresetDefinition
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

interface UseCadEditorTextToolViewModelParams {
  textToolPresets: ReadonlyArray<TextToolPresetDefinition>;
  selectedTextToolPresetId: TextToolPresetDefinition['id'];
  drawingTextValue: string;
  drawingTextHeight: number;
  drawingTextRotation: number;
  drawingTextAlignment: DrawingTextAlignment;
  drawingTextVerticalAlignment: DrawingTextVerticalAlignment;
  textUsesAnnotationLayer: boolean;
  annotationLayerName: string;
  textAnnotationLayerName: string;
}

export const useCadEditorTextToolViewModel = ({
  textToolPresets,
  selectedTextToolPresetId,
  drawingTextValue,
  drawingTextHeight,
  drawingTextRotation,
  drawingTextAlignment,
  drawingTextVerticalAlignment,
  textUsesAnnotationLayer,
  annotationLayerName,
  textAnnotationLayerName
}: UseCadEditorTextToolViewModelParams) => {
  const activeTextToolPreset = useMemo(
    () => textToolPresets.find((preset) => matchesTextToolPreset(preset, {
      textValue: drawingTextValue,
      height: drawingTextHeight,
      rotation: drawingTextRotation,
      alignment: drawingTextAlignment,
      verticalAlignment: drawingTextVerticalAlignment,
      textUsesAnnotationLayer,
      annotationLayerName,
      textAnnotationLayerName
    })) || null,
    [
      annotationLayerName,
      drawingTextAlignment,
      drawingTextHeight,
      drawingTextRotation,
      drawingTextValue,
      drawingTextVerticalAlignment,
      textAnnotationLayerName,
      textToolPresets,
      textUsesAnnotationLayer
    ]
  );

  const selectedTextToolPreset = useMemo(
    () => textToolPresets.find((preset) => preset.id === selectedTextToolPresetId) || textToolPresets[0],
    [selectedTextToolPresetId, textToolPresets]
  );

  const activeTextToolPresetId = activeTextToolPreset?.id || CUSTOM_TEXT_TOOL_PRESET_ID;
  const activeTextToolPresetLabel = activeTextToolPreset?.label || CUSTOM_TEXT_TOOL_PRESET_LABEL;

  const textPresetDeviationLabels = useMemo(
    () => buildTextPresetDeviationLabels(selectedTextToolPreset, {
      textValue: drawingTextValue,
      height: drawingTextHeight,
      rotation: drawingTextRotation,
      alignment: drawingTextAlignment,
      verticalAlignment: drawingTextVerticalAlignment,
      textUsesAnnotationLayer,
      annotationLayerName,
      textAnnotationLayerName
    }),
    [
      annotationLayerName,
      drawingTextAlignment,
      drawingTextHeight,
      drawingTextRotation,
      drawingTextValue,
      drawingTextVerticalAlignment,
      selectedTextToolPreset,
      textAnnotationLayerName,
      textUsesAnnotationLayer
    ]
  );

  const hasCustomTextPreset = activeTextToolPresetId === CUSTOM_TEXT_TOOL_PRESET_ID;

  const textFieldModifiedMap = useMemo(
    () => ({
      textValue: textPresetDeviationLabels.includes('Conteudo'),
      height: textPresetDeviationLabels.includes('Altura'),
      rotation: textPresetDeviationLabels.includes('Rotacao'),
      alignment: textPresetDeviationLabels.includes('Alinhamento'),
      verticalAlignment: textPresetDeviationLabels.includes('Ancoragem'),
      target: textPresetDeviationLabels.includes('Destino')
    }),
    [textPresetDeviationLabels]
  );

  return {
    selectedTextToolPreset,
    activeTextToolPresetId,
    activeTextToolPresetLabel,
    textPresetDeviationLabels,
    hasCustomTextPreset,
    textFieldModifiedMap
  };
};

