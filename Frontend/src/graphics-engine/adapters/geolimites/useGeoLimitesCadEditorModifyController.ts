import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import { useCadEditorModifyController, type UseCadEditorModifyControllerParams } from '@/graphics-engine/pages/cad-editor/useCadEditorModifyController';

export const useGeoLimitesCadEditorModifyController = (
  params: UseCadEditorModifyControllerParams
) => useCadEditorModifyController({
  ...params,
  messages: GEO_LIMITES_CAD_EDITOR_TEXTS.modifyController
});
