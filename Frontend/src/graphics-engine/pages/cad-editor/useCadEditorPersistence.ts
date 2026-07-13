import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface UseCadEditorPersistenceParams {
  textToolSessionStorageKey: string;
  textToolSessionPayload: unknown;
  sessionPreferencesStorageKey: string;
  sessionPreferencesPayload: unknown;
}

export const useCadEditorPersistence = ({
  textToolSessionStorageKey,
  textToolSessionPayload,
  sessionPreferencesStorageKey,
  sessionPreferencesPayload
}: UseCadEditorPersistenceParams) => {
  const latestPayloadsRef = useRef({
    textToolSessionStorageKey,
    textToolSessionPayload,
    sessionPreferencesStorageKey,
    sessionPreferencesPayload
  });

  latestPayloadsRef.current = {
    textToolSessionStorageKey,
    textToolSessionPayload,
    sessionPreferencesStorageKey,
    sessionPreferencesPayload
  };

  const persistAllPayloads = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const latestPayloads = latestPayloadsRef.current;
    window.sessionStorage.setItem(latestPayloads.textToolSessionStorageKey, JSON.stringify(latestPayloads.textToolSessionPayload));

    const serializedSessionPreferences = JSON.stringify(latestPayloads.sessionPreferencesPayload);
    window.sessionStorage.setItem(latestPayloads.sessionPreferencesStorageKey, serializedSessionPreferences);
    window.localStorage.setItem(latestPayloads.sessionPreferencesStorageKey, serializedSessionPreferences);
  }, []);

  useLayoutEffect(() => {
    persistAllPayloads();
  }, [persistAllPayloads, textToolSessionPayload, textToolSessionStorageKey, sessionPreferencesPayload, sessionPreferencesStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handlePageHide = () => {
      persistAllPayloads();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistAllPayloads();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [persistAllPayloads]);
};
