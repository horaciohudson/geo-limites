interface WritableFileHandle {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
}

interface SaveFileHandle {
  createWritable: () => Promise<WritableFileHandle>;
}

interface FileSystemAccessWindow extends Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    startIn?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFileHandle>;
}

export interface PendingTemplateSaveTarget {
  mode: 'picker' | 'download';
  fileName: string;
  configuredFolderPath: string;
  fileHandle?: SaveFileHandle;
}

const downloadTemplateJson = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const prepareTemplateLocalSave = async (
  fileName: string,
  configuredFolderPath: string
): Promise<PendingTemplateSaveTarget> => {
  const fileSystemWindow = window as FileSystemAccessWindow;

  if (fileSystemWindow.showSaveFilePicker) {
    const fileHandle = await fileSystemWindow.showSaveFilePicker({
      suggestedName: fileName,
      startIn: 'documents',
      types: [
        {
          description: 'Template JSON',
          accept: {
            'application/json': ['.json']
          }
        }
      ]
    });

    return {
      mode: 'picker',
      fileName,
      configuredFolderPath,
      fileHandle
    };
  }

  return {
    mode: 'download',
    fileName,
    configuredFolderPath
  };
};

export const saveTemplateJsonLocally = async (
  target: PendingTemplateSaveTarget,
  content: string
): Promise<string> => {
  const normalizedContent = content.endsWith('\n') ? content : `${content}\n`;

  if (target.mode === 'picker' && target.fileHandle) {
    const writable = await target.fileHandle.createWritable();
    await writable.write(normalizedContent);
    await writable.close();
    return `${target.configuredFolderPath}\\${target.fileName}`;
  }

  downloadTemplateJson(normalizedContent, target.fileName);
  alert(
    `Selecione a pasta configurada "${target.configuredFolderPath}" no navegador. Se ela ainda não existir, crie-a antes de mover o arquivo.\n\nO arquivo foi baixado como "${target.fileName}".`
  );
  return `${target.configuredFolderPath}\\${target.fileName}`;
};

export const getTemplateLocalSaveErrorMessage = (
  error: unknown,
  configuredFolderPath: string
): string => {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const errorName = String((error as { name?: string }).name);

    if (errorName === 'AbortError') {
      return 'Salvamento cancelado pelo usuário antes de escolher o arquivo de destino.';
    }

    if (errorName === 'SecurityError') {
      return `O navegador bloqueou a abertura da janela de salvamento. Tente novamente clicando direto na ação e, se necessário, crie a pasta "${configuredFolderPath}" manualmente antes de salvar.`;
    }
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: string }).message || 'Falha ao salvar o arquivo localmente.');
  }

  return 'Falha ao salvar o arquivo localmente.';
};
