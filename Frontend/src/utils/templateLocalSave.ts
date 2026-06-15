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

export const saveTemplateJsonLocally = async (
  content: string,
  fileName: string,
  configuredFolderPath: string
): Promise<string> => {
  const normalizedContent = content.endsWith('\n') ? content : `${content}\n`;
  const fileSystemWindow = window as FileSystemAccessWindow;

  if (fileSystemWindow.showSaveFilePicker) {
    alert(
      `Se a pasta "${configuredFolderPath}" ainda não existir, crie-a na janela de salvamento antes de confirmar o arquivo.`
    );

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

    const writable = await fileHandle.createWritable();
    await writable.write(normalizedContent);
    await writable.close();
  } else {
    downloadTemplateJson(normalizedContent, fileName);
    alert(
      `O navegador não permite salvar direto na pasta configurada.\n\nO arquivo foi baixado como "${fileName}". Mova-o para:\n${configuredFolderPath}`
    );
  }

  return `${configuredFolderPath}\\${fileName}`;
};
