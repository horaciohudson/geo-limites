import {
  loadGeoLimitesCadEditorSettings,
  loadGeoLimitesTextToolSessionState
} from '@/graphics-engine/adapters/geolimites/cadEditorContentConfig';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CAD_EDITOR_SESSION_PREFERENCES_KEY,
  loadCadEditorSessionPreferences,
  TEXT_TOOL_SESSION_STORAGE_KEY,
  type CadEditorSessionPreferences,
  type CadEditorSettings,
  type TextToolSessionState
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import { useCadEditorPersistence } from '@/graphics-engine/pages/cad-editor/useCadEditorPersistence';

interface UseGeoLimitesCadEditorPersistenceParams {
  textToolSessionPayload: TextToolSessionState;
  sessionPreferencesPayload: CadEditorSessionPreferences;
}

export const useGeoLimitesCadEditorBoot = ({
  initialSystemSettings
}: {
  initialSystemSettings?: CadEditorSettings;
}) => {
  const navigate = useNavigate();

  const initialCadEditorSettings = useMemo(
    () => initialSystemSettings ?? loadGeoLimitesCadEditorSettings(),
    [initialSystemSettings]
  );
  const initialCadEditorSessionPreferences = useMemo(() => loadCadEditorSessionPreferences(), []);
  const initialTextToolSessionState = useMemo(() => loadGeoLimitesTextToolSessionState(), []);

  const handleNavigateBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return {
    initialCadEditorSettings,
    initialCadEditorSessionPreferences,
    initialTextToolSessionState,
    handleNavigateBack
  };
};

export const useGeoLimitesCadEditorPersistence = ({
  textToolSessionPayload,
  sessionPreferencesPayload
}: UseGeoLimitesCadEditorPersistenceParams) => {
  useCadEditorPersistence({
    textToolSessionStorageKey: TEXT_TOOL_SESSION_STORAGE_KEY,
    textToolSessionPayload,
    sessionPreferencesStorageKey: CAD_EDITOR_SESSION_PREFERENCES_KEY,
    sessionPreferencesPayload
  });
};
