import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import {
  useCadEditorUiActionController,
  type UseCadEditorUiActionControllerParams
} from '@/graphics-engine/pages/cad-editor/useCadEditorUiActionController';

export const useGeoLimitesCadEditorUiActionController = (
  params: UseCadEditorUiActionControllerParams
) => useCadEditorUiActionController({
  ...params,
  messages: GEO_LIMITES_CAD_EDITOR_TEXTS.uiActions
});
