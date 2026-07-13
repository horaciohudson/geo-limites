const LAST_DESKTOP_FILE_DIALOG_DIRECTORY_KEY = 'desktop:last-file-dialog-directory';

const normalizeDirectoryPath = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  return trimmedValue.replace(/[\\/]+$/, '');
};

const extractDirectoryFromPath = (filePath: string) => {
  const normalizedPath = filePath.trim().replace(/[\\/]+$/, '');
  if (!normalizedPath) {
    return null;
  }

  const lastSeparatorIndex = Math.max(
    normalizedPath.lastIndexOf('/'),
    normalizedPath.lastIndexOf('\\')
  );

  if (lastSeparatorIndex <= 0) {
    return null;
  }

  return normalizeDirectoryPath(normalizedPath.slice(0, lastSeparatorIndex));
};

export const getLastDesktopFileDialogDirectory = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return normalizeDirectoryPath(
      window.localStorage.getItem(LAST_DESKTOP_FILE_DIALOG_DIRECTORY_KEY) || ''
    );
  } catch {
    return null;
  }
};

export const rememberDesktopFileDialogDirectory = (filePath?: string | null) => {
  if (typeof window === 'undefined' || !filePath) {
    return;
  }

  const directoryPath = extractDirectoryFromPath(filePath);
  if (!directoryPath) {
    return;
  }

  try {
    window.localStorage.setItem(LAST_DESKTOP_FILE_DIALOG_DIRECTORY_KEY, directoryPath);
  } catch {
    // Nao interrompe o fluxo principal quando a persistencia local falhar.
  }
};

export const LAST_DESKTOP_FILE_DIALOG_DIRECTORY_STORAGE_KEY =
  LAST_DESKTOP_FILE_DIALOG_DIRECTORY_KEY;
