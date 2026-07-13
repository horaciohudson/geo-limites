import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import { useCadEditorLayoutController, type UseCadEditorLayoutControllerParams } from '@/graphics-engine/pages/cad-editor/useCadEditorLayoutController';

export const useGeoLimitesCadEditorLayoutController = (
  params: UseCadEditorLayoutControllerParams
) => useCadEditorLayoutController({
  ...params,
  messages: GEO_LIMITES_CAD_EDITOR_TEXTS.layoutController
});
