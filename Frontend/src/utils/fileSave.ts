import { desktopApi } from '@/services/desktopApi';
import {
  getLastDesktopFileDialogDirectory,
  rememberDesktopFileDialogDirectory
} from '@/utils/desktopFileDialogState';

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface FileSystemWritableFileStreamLike {
  write: (data: Blob | BufferSource | string) => Promise<void>;
  close: () => Promise<void>;
}

interface FileSystemFileHandleLike {
  createWritable: () => Promise<FileSystemWritableFileStreamLike>;
}

interface SavePickerWindow extends Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
  }) => Promise<FileSystemFileHandleLike>;
}

const isAbortError = (error: unknown) => (
  typeof error === 'object'
  && error !== null
  && 'name' in error
  && (error as { name?: string }).name === 'AbortError'
);

const isSecurityError = (error: unknown) => (
  typeof error === 'object'
  && error !== null
  && 'name' in error
  && (error as { name?: string }).name === 'SecurityError'
);

const triggerBlobDownload = (blob: Blob, suggestedName: string) => {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
};

export const saveTextWithPicker = async (params: {
  suggestedName: string;
  contents: string;
  contentType: string;
  pickerTypeDescription: string;
  accept: Record<string, string[]>;
}) => {
  const { suggestedName, contents, contentType, pickerTypeDescription, accept } = params;

  try {
    if (desktopApi.hasBridge()) {
      const result = await desktopApi.saveFile({
        suggestedName,
        contents,
        defaultPath: getLastDesktopFileDialogDirectory()
          ? `${getLastDesktopFileDialogDirectory()}\\${suggestedName}`
          : undefined
      });
      if (result.saved) {
        rememberDesktopFileDialogDirectory(result.path);
        return true;
      }
    }

    const saveFilePicker = typeof window !== 'undefined'
      ? (window as SavePickerWindow).showSaveFilePicker
      : undefined;

    if (typeof saveFilePicker === 'function') {
      try {
        const handle = await saveFilePicker({
          suggestedName,
          types: [{
            description: pickerTypeDescription,
            accept
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(contents);
        await writable.close();
        return true;
      } catch (error) {
        if (isAbortError(error)) {
          return false;
        }

        if (!isSecurityError(error)) {
          throw error;
        }
      }
    }

    triggerBlobDownload(new Blob([contents], { type: contentType }), suggestedName);
    return true;
  } catch (error) {
    if (isAbortError(error)) {
      return false;
    }
    throw error;
  }
};

export const saveBlobWithPicker = async (params: {
  suggestedName: string;
  blob: Blob;
  pickerTypeDescription: string;
  accept: Record<string, string[]>;
}) => {
  const { suggestedName, blob, pickerTypeDescription, accept } = params;

  try {
    if (desktopApi.hasBridge()) {
      const fileBytes = new Uint8Array(await blob.arrayBuffer());
      const result = await desktopApi.saveFile({
        suggestedName,
        bytes: Array.from(fileBytes),
        defaultPath: getLastDesktopFileDialogDirectory()
          ? `${getLastDesktopFileDialogDirectory()}\\${suggestedName}`
          : undefined
      });

      if (result.saved) {
        rememberDesktopFileDialogDirectory(result.path);
        return true;
      }
    }

    const saveFilePicker = typeof window !== 'undefined'
      ? (window as SavePickerWindow).showSaveFilePicker
      : undefined;

    if (typeof saveFilePicker === 'function') {
      try {
        const handle = await saveFilePicker({
          suggestedName,
          types: [{
            description: pickerTypeDescription,
            accept
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (error) {
        if (isAbortError(error)) {
          return false;
        }

        if (!isSecurityError(error)) {
          throw error;
        }
      }
    }

    triggerBlobDownload(blob, suggestedName);
    return true;
  } catch (error) {
    if (isAbortError(error)) {
      return false;
    }
    throw error;
  }
};
