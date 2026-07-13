import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import { useCadEditorKeyboardShortcuts, type UseCadEditorKeyboardShortcutsParams } from '@/graphics-engine/pages/cad-editor/useCadEditorKeyboardShortcuts';

export const useGeoLimitesCadEditorKeyboardShortcuts = (
  params: UseCadEditorKeyboardShortcutsParams
) => useCadEditorKeyboardShortcuts({
  ...params,
  messages: GEO_LIMITES_CAD_EDITOR_TEXTS.keyboardShortcuts
});
