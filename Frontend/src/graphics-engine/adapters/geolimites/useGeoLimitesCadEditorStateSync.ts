import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import {
  useCadEditorStateSync,
  type UseCadEditorStateSyncParams
} from '@/graphics-engine/pages/cad-editor/useCadEditorStateSync';

export const useGeoLimitesCadEditorStateSync = (
  params: UseCadEditorStateSyncParams
) => useCadEditorStateSync({
  ...params,
  messages: GEO_LIMITES_CAD_EDITOR_TEXTS.stateSync
});
