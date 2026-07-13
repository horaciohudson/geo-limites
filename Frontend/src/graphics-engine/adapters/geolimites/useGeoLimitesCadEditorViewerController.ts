import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import { useCadEditorViewerController, type UseCadEditorViewerControllerParams } from '@/graphics-engine/pages/cad-editor/useCadEditorViewerController';

export const useGeoLimitesCadEditorViewerController = (
  params: UseCadEditorViewerControllerParams
) => useCadEditorViewerController({
  ...params,
  messages: GEO_LIMITES_CAD_EDITOR_TEXTS.viewerController
});
