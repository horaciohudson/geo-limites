import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import { useCadEditorEntityActions, type UseCadEditorEntityActionsParams } from '@/graphics-engine/pages/cad-editor/useCadEditorEntityActions';

export const useGeoLimitesCadEditorEntityActions = (
  params: UseCadEditorEntityActionsParams
) => useCadEditorEntityActions({
  ...params,
  messages: GEO_LIMITES_CAD_EDITOR_TEXTS.entityActions
});
