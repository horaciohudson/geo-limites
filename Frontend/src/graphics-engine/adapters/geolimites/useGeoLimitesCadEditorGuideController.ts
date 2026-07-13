import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import { useCadEditorGuideController, type UseCadEditorGuideControllerParams } from '@/graphics-engine/pages/cad-editor/useCadEditorGuideController';

export const useGeoLimitesCadEditorGuideController = (
  params: UseCadEditorGuideControllerParams
) => useCadEditorGuideController({
  ...params,
  messages: GEO_LIMITES_CAD_EDITOR_TEXTS.guideController
});
