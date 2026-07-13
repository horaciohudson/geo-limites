import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import { useCadEditorTextToolController, type UseCadEditorTextToolControllerParams } from '@/graphics-engine/pages/cad-editor/useCadEditorTextToolController';

export const useGeoLimitesCadEditorTextToolController = (
  params: UseCadEditorTextToolControllerParams
) => useCadEditorTextToolController({
  ...params,
  messages: GEO_LIMITES_CAD_EDITOR_TEXTS.textToolController
});
