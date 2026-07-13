import {
  type CadMeasurementUnit,
  type CadMenuId
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import { useCadEditorCommandController, type UseCadEditorCommandControllerParams } from '@/graphics-engine/pages/cad-editor/useCadEditorCommandController';

type GeoLimitesCadEditorCommandControllerParams<SelectionItem> = Omit<
  UseCadEditorCommandControllerParams<SelectionItem, CadMenuId, CadMeasurementUnit>,
  'measurementUnitMenuActions'
>;

export const useGeoLimitesCadEditorCommandController = <SelectionItem = unknown>(
  params: GeoLimitesCadEditorCommandControllerParams<SelectionItem>
) => useCadEditorCommandController({
  ...params,
  measurementUnitMenuActions: {},
  messages: {
    ...GEO_LIMITES_CAD_EDITOR_TEXTS.commandNotices,
    zoomAdjusted: (zoomValue) => `Zoom ajustado para ${zoomValue.toFixed(2)}x.`
  }
});
