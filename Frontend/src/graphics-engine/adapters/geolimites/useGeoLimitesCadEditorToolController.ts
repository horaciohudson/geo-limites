import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import { useCadEditorToolController, type UseCadEditorToolControllerParams } from '@/graphics-engine/pages/cad-editor/useCadEditorToolController';

export const useGeoLimitesCadEditorToolController = (
  params: UseCadEditorToolControllerParams
) => useCadEditorToolController({
  ...params,
  messages: GEO_LIMITES_CAD_EDITOR_TEXTS.toolController
});
