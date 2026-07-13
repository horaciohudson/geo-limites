import { useCallback } from 'react';
import type React from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type {
  CadMeasurementUnitOption,
  CadOpenedDocumentFileHandle,
  CadOpenedDocument
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import type { DXFData } from '@/graphics-engine/shared/dxf';
import { readDxfFileAsText } from '@/graphics-engine/shared/dxfTextCodec';
import { parseDXF } from '@/graphics-engine/shared/dxf';
import { buildDXFString, downloadDXF } from '@/utils/dxfExporter';
import { desktopApi } from '@/services/desktopApi';
import { buildUpdatedDxfData } from '@/graphics-engine/pages/cad-editor/cadEditorEntityUtils';
import type { CadGuide, CadRulerInteraction } from '@/graphics-engine/pages/cad-editor/cadEditorRulerUtils';
import {
  getLastDesktopFileDialogDirectory,
  rememberDesktopFileDialogDirectory
} from '@/utils/desktopFileDialogState';

interface UseCadEditorDocumentControllerParams<
  MeasurementUnitId extends string,
  MenuId extends string,
  SelectionItem
> {
  fileInputRef: RefObject<HTMLInputElement>;
  measurementUnitDefinition: { label: string };
  workspaceSizeLabel: string;
  currentEditorData: DXFData | null;
  openedDocument: CadOpenedDocument | null;
  measurementUnitOptions: CadMeasurementUnitOption<MeasurementUnitId>[];
  createEmptyDxfData: () => DXFData;
  buildEditedFileName: (originalName: string) => string;
  defaultActiveLayerName: string;
  normalizeImportedDxfData?: (dxfData: DXFData) => DXFData;
  setOpenedDocument: Dispatch<SetStateAction<CadOpenedDocument | null>>;
  setLoadedDxfData: Dispatch<SetStateAction<DXFData | null>>;
  setActiveLayerName: Dispatch<SetStateAction<string>>;
  setSelectedEntities: Dispatch<SetStateAction<SelectionItem[]>>;
  setViewerSelectionOverride: Dispatch<SetStateAction<string[] | undefined>>;
  setUndoStack: Dispatch<SetStateAction<DXFData[]>>;
  setRedoStack: Dispatch<SetStateAction<DXFData[]>>;
  setViewerZoom: Dispatch<SetStateAction<number>>;
  setMenuOpenId: Dispatch<SetStateAction<MenuId | null>>;
  setEditorNotice: Dispatch<SetStateAction<string>>;
  setMeasurementUnit: Dispatch<SetStateAction<MeasurementUnitId>>;
  setNewDocumentWorkspaceSize: Dispatch<SetStateAction<number>>;
  setGridSnapSize: Dispatch<SetStateAction<number>>;
  setEnableGridSnap: Dispatch<SetStateAction<boolean>>;
  setIsConfiguratorOpen: Dispatch<SetStateAction<boolean>>;
  setRulerGuides: Dispatch<SetStateAction<CadGuide[]>>;
  setRulerGuidePreview: Dispatch<SetStateAction<CadGuide | null>>;
  setSelectedGuideId: Dispatch<SetStateAction<string | null>>;
  setHoveredGuideId: Dispatch<SetStateAction<string | null>>;
  setGuideContextMenu: Dispatch<SetStateAction<{ guideId: string; clientX: number; clientY: number } | null>>;
  suppressViewerCanvasClickRef: React.MutableRefObject<boolean>;
  pendingCanvasGuideDragRef: React.MutableRefObject<{
    guide: CadGuide;
    startClientX: number;
    startClientY: number;
  } | null>;
  rulerInteractionRef: React.MutableRefObject<CadRulerInteraction | null>;
  messages?: {
    closeOpenedFileNotice: string;
    buildNewDocumentNotice: (params: {
      measurementUnitLabel: string;
      workspaceSizeLabel: string;
    }) => string;
    buildApplyMeasurementUnitNotice: (params: {
      unitLabel: string;
      workspaceSize: number;
      gridSnapSize: number;
      majorGridStep: number;
      shortLabel: string;
    }) => string;
    exportRequiresDocumentNotice: string;
    buildExportSuccessNotice: (params: { exportFileName: string }) => string;
    exportErrorNotice: string;
    buildOpenSuccessNotice: (params: { fileName: string }) => string;
    openErrorNotice: string;
  };
}

const DEFAULT_DOCUMENT_CONTROLLER_MESSAGES = {
  closeOpenedFileNotice: 'Arquivo fechado no Editor CAD.',
  buildNewDocumentNotice: ({
    measurementUnitLabel,
    workspaceSizeLabel
  }: {
    measurementUnitLabel: string;
    workspaceSizeLabel: string;
  }) => `Novo desenho iniciado em ${measurementUnitLabel.toLowerCase()} com area-base de ${workspaceSizeLabel}.`,
  buildApplyMeasurementUnitNotice: ({
    unitLabel,
    workspaceSize,
    gridSnapSize,
    majorGridStep,
    shortLabel
  }: {
    unitLabel: string;
    workspaceSize: number;
    gridSnapSize: number;
    majorGridStep: number;
    shortLabel: string;
  }) => `Configuracao aplicada: ${unitLabel} | area-base ${workspaceSize} ${shortLabel} | grid ${gridSnapSize} ${shortLabel} | linha forte ${majorGridStep} ${shortLabel}.`,
  exportRequiresDocumentNotice: 'Abra um arquivo antes de salvar o desenho editado.',
  buildExportSuccessNotice: ({ exportFileName }: { exportFileName: string }) => `Arquivo salvo com sucesso: ${exportFileName}.`,
  exportErrorNotice: 'Nao foi possivel salvar o arquivo editado.',
  buildOpenSuccessNotice: ({ fileName }: { fileName: string }) => `Arquivo aberto no editor: ${fileName}.`,
  openErrorNotice: 'Nao foi possivel abrir o arquivo selecionado.'
};

const normalizeSavedFileName = (fileName: string) => {
  const trimmedName = fileName.trim();
  if (!trimmedName) {
    return 'desenho.dxf';
  }

  return trimmedName.toLowerCase().endsWith('.dxf') ? trimmedName : `${trimmedName}.dxf`;
};

const getFileNameFromPath = (filePath: string) => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return normalizedPath.split('/').pop() || filePath;
};

const getDxfBlobSize = (contents: string) => new Blob([contents], { type: 'application/dxf;charset=utf-8' }).size;

const saveDxfContents = async ({
  fileName,
  contents,
  existingFileHandle,
  existingFilePath,
  forceDialog
}: {
  fileName: string;
  contents: string;
  existingFileHandle?: CadOpenedDocumentFileHandle | null;
  existingFilePath?: string | null;
  forceDialog: boolean;
}) => {
  if (!forceDialog && existingFileHandle) {
    const writable = await existingFileHandle.createWritable();
    await writable.write(contents);
    await writable.close();

    return {
      name: existingFileHandle.name || fileName,
      sizeBytes: getDxfBlobSize(contents),
      fileHandle: existingFileHandle,
      savedFilePath: existingFilePath || null
    };
  }

  if (desktopApi.hasBridge()) {
    const lastDialogDirectory = getLastDesktopFileDialogDirectory();
    const result = await desktopApi.saveFile({
      suggestedName: fileName,
      contents,
      targetPath: !forceDialog ? (existingFilePath || undefined) : undefined,
      defaultPath: forceDialog && lastDialogDirectory
        ? `${lastDialogDirectory}\\${fileName}`
        : undefined
    });

    if (!result.saved) {
      return null;
    }

    rememberDesktopFileDialogDirectory(result.path);

    return {
      name: getFileNameFromPath(result.path),
      sizeBytes: getDxfBlobSize(contents),
      fileHandle: null,
      savedFilePath: result.path
    };
  }

  const saveFilePicker = typeof window !== 'undefined'
    ? (window as Window & {
      showSaveFilePicker?: (options?: {
        suggestedName?: string;
        types?: Array<{
          description?: string;
          accept: Record<string, string[]>;
        }>;
      }) => Promise<CadOpenedDocumentFileHandle>;
    }).showSaveFilePicker
    : undefined;

  if (typeof saveFilePicker === 'function') {
    const handle = await saveFilePicker({
      suggestedName: fileName,
      types: [{
        description: 'Arquivo DXF',
        accept: {
          'application/dxf': ['.dxf']
        }
      }]
    });
    const writable = await handle.createWritable();
    await writable.write(contents);
    await writable.close();

    return {
      name: handle.name || fileName,
      sizeBytes: getDxfBlobSize(contents),
      fileHandle: handle,
      savedFilePath: null
    };
  }

  return null;
};

const openDxfFileWithSystemPicker = async () => {
  if (desktopApi.hasBridge()) {
    const lastDialogDirectory = getLastDesktopFileDialogDirectory();
    const selectedFile = await desktopApi.openFile({
      filters: [{
        name: 'Arquivo DXF',
        extensions: ['dxf']
      }],
      defaultPath: lastDialogDirectory || undefined
    });

    if (!selectedFile) {
      return null;
    }

    rememberDesktopFileDialogDirectory(selectedFile.path);

    return {
      file: new File(
        [new Uint8Array(selectedFile.bytes)],
        selectedFile.name,
        { type: 'application/dxf' }
      ),
      fileHandle: null,
      savedFilePath: selectedFile.path
    };
  }

  const openFilePicker = typeof window !== 'undefined'
    ? (window as Window & {
      showOpenFilePicker?: (options?: {
        multiple?: boolean;
        types?: Array<{
          description?: string;
          accept: Record<string, string[]>;
        }>;
      }) => Promise<CadOpenedDocumentFileHandle[]>;
    }).showOpenFilePicker
    : undefined;

  if (typeof openFilePicker !== 'function') {
    return null;
  }

  const [handle] = await openFilePicker({
    multiple: false,
    types: [{
      description: 'Arquivo DXF',
      accept: {
        'application/dxf': ['.dxf']
      }
    }]
  });

  if (!handle) {
    return null;
  }

  const file = await handle.getFile();
  return {
    file,
    fileHandle: handle,
    savedFilePath: null
  };
};

export const useCadEditorDocumentController = <
  MeasurementUnitId extends string,
  MenuId extends string,
  SelectionItem = unknown
>({
  fileInputRef,
  measurementUnitDefinition,
  workspaceSizeLabel,
  currentEditorData,
  openedDocument,
  measurementUnitOptions,
  createEmptyDxfData,
  buildEditedFileName,
  defaultActiveLayerName,
  normalizeImportedDxfData,
  setOpenedDocument,
  setLoadedDxfData,
  setActiveLayerName,
  setSelectedEntities,
  setViewerSelectionOverride,
  setUndoStack,
  setRedoStack,
  setViewerZoom,
  setMenuOpenId,
  setEditorNotice,
  setMeasurementUnit,
  setNewDocumentWorkspaceSize,
  setGridSnapSize,
  setEnableGridSnap,
  setIsConfiguratorOpen,
  setRulerGuides,
  setRulerGuidePreview,
  setSelectedGuideId,
  setHoveredGuideId,
  setGuideContextMenu,
  suppressViewerCanvasClickRef,
  pendingCanvasGuideDragRef,
  rulerInteractionRef,
  messages
}: UseCadEditorDocumentControllerParams<MeasurementUnitId, MenuId, SelectionItem>) => {
  const resolvedMessages = messages ?? DEFAULT_DOCUMENT_CONTROLLER_MESSAGES;

  const resetEditorTransientState = useCallback((notice: string) => {
    setSelectedEntities([]);
    setViewerSelectionOverride([]);
    setUndoStack([]);
    setRedoStack([]);
    setViewerZoom(1);
    setMenuOpenId(null);
    setEditorNotice(notice);
  }, [
    setEditorNotice,
    setMenuOpenId,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride,
    setViewerZoom
  ]);

  const resetDocumentGuideState = useCallback(() => {
    setRulerGuides([]);
    setRulerGuidePreview(null);
    setSelectedGuideId(null);
    setHoveredGuideId(null);
    setGuideContextMenu(null);
    suppressViewerCanvasClickRef.current = false;
    pendingCanvasGuideDragRef.current = null;
    rulerInteractionRef.current = null;
  }, [
    pendingCanvasGuideDragRef,
    rulerInteractionRef,
    setGuideContextMenu,
    setHoveredGuideId,
    setRulerGuidePreview,
    setRulerGuides,
    setSelectedGuideId,
    suppressViewerCanvasClickRef
  ]);
  const openSelectedDxfFile = useCallback(async (
    selectedFile: File,
    options?: {
      fileHandle?: CadOpenedDocumentFileHandle | null;
      savedFilePath?: string | null;
    }
  ) => {
    const content = await readDxfFileAsText(selectedFile);
    const rawParsedData = parseDXF(content);
    const mergedParsedData = buildUpdatedDxfData(rawParsedData, rawParsedData.entities);
    const extension = selectedFile.name.split('.').pop()?.toLowerCase() || 'dxf';

    const normalizedParsedData = normalizeImportedDxfData
      ? normalizeImportedDxfData(mergedParsedData)
      : mergedParsedData;

    setOpenedDocument({
      name: selectedFile.name,
      sizeBytes: selectedFile.size,
      extension,
      dxfData: normalizedParsedData,
      source: 'local-dxf',
      fileHandle: options?.fileHandle ?? null,
      savedFilePath: options?.savedFilePath ?? null
    });
    setLoadedDxfData(normalizedParsedData);
    setActiveLayerName(normalizedParsedData.layers[0]?.name || defaultActiveLayerName);
    resetDocumentGuideState();
    resetEditorTransientState(resolvedMessages.buildOpenSuccessNotice({ fileName: selectedFile.name }));
  }, [
    defaultActiveLayerName,
    normalizeImportedDxfData,
    resetDocumentGuideState,
    resetEditorTransientState,
    resolvedMessages,
    setActiveLayerName,
    setLoadedDxfData,
    setOpenedDocument
  ]);

  const handleCloseOpenedFile = useCallback(() => {
    setOpenedDocument(null);
    setLoadedDxfData(null);
    resetDocumentGuideState();
    resetEditorTransientState(resolvedMessages.closeOpenedFileNotice);
  }, [resetDocumentGuideState, resetEditorTransientState, resolvedMessages.closeOpenedFileNotice, setLoadedDxfData, setOpenedDocument]);

  const handleCreateNewDocument = useCallback(() => {
    const emptyDxfData = createEmptyDxfData();
    const documentName = 'novo-desenho.dxf';

    setOpenedDocument({
      name: documentName,
      sizeBytes: 0,
      extension: 'dxf',
      dxfData: emptyDxfData,
      source: 'new',
      fileHandle: null,
      savedFilePath: null
    });
    setLoadedDxfData(emptyDxfData);
    setActiveLayerName(emptyDxfData.layers[0]?.name || defaultActiveLayerName);
    resetDocumentGuideState();
    resetEditorTransientState(
      resolvedMessages.buildNewDocumentNotice({
        measurementUnitLabel: measurementUnitDefinition.label,
        workspaceSizeLabel
      })
    );
  }, [
    createEmptyDxfData,
    defaultActiveLayerName,
    measurementUnitDefinition.label,
    resetDocumentGuideState,
    resetEditorTransientState,
    resolvedMessages,
    setActiveLayerName,
    setLoadedDxfData,
    setOpenedDocument,
    workspaceSizeLabel
  ]);

  const handleApplyMeasurementUnit = useCallback((nextUnit: MeasurementUnitId) => {
    const unitPreset = measurementUnitOptions.find((unit) => unit.id === nextUnit) || measurementUnitOptions[1];
    if (!unitPreset) {
      return;
    }

    setMeasurementUnit(nextUnit);
    setNewDocumentWorkspaceSize(unitPreset.defaultWorkspaceSize);
    setGridSnapSize(unitPreset.defaultGridSnapSize);
    setEnableGridSnap(true);
    setIsConfiguratorOpen(false);
    setMenuOpenId(null);
    setEditorNotice(
      resolvedMessages.buildApplyMeasurementUnitNotice({
        unitLabel: unitPreset.label,
        workspaceSize: unitPreset.defaultWorkspaceSize,
        gridSnapSize: unitPreset.defaultGridSnapSize,
        majorGridStep: unitPreset.majorGridStep,
        shortLabel: unitPreset.shortLabel
      })
    );
  }, [
    measurementUnitOptions,
    resolvedMessages,
    setEditorNotice,
    setEnableGridSnap,
    setGridSnapSize,
    setIsConfiguratorOpen,
    setMeasurementUnit,
    setMenuOpenId,
    setNewDocumentWorkspaceSize
  ]);

  const handleOpenLocalFile = useCallback(() => {
    void (async () => {
      try {
        const pickedFile = await openDxfFileWithSystemPicker();
        if (pickedFile) {
          await openSelectedDxfFile(pickedFile.file, {
            fileHandle: pickedFile.fileHandle,
            savedFilePath: pickedFile.savedFilePath
          });
          setMenuOpenId(null);
          return;
        }
      } catch (error) {
        console.warn('Falha ao abrir DXF com picker nativo. Recuando para input padrao.', error);
      }

      fileInputRef.current?.click();
      setMenuOpenId(null);
    })();
  }, [fileInputRef, openSelectedDxfFile, setMenuOpenId]);

  const handleSaveDxf = useCallback((forceDialog: boolean) => {
    if (!currentEditorData || !openedDocument) {
      setEditorNotice(resolvedMessages.exportRequiresDocumentNotice);
      return;
    }

    void (async () => {
      try {
        const exportData = buildUpdatedDxfData(currentEditorData, currentEditorData.entities);
        const dxfContents = buildDXFString(exportData);
        const saveFileName = normalizeSavedFileName(
          openedDocument.name || buildEditedFileName(openedDocument.name)
        );
        const savedFile = await saveDxfContents({
          fileName: saveFileName,
          contents: dxfContents,
          existingFileHandle: openedDocument.fileHandle,
          existingFilePath: openedDocument.savedFilePath,
          forceDialog
        });

        if (!savedFile) {
          downloadDXF(exportData, saveFileName);
          setLoadedDxfData(exportData);
          setOpenedDocument((current) => (
            current
              ? {
                ...current,
                name: saveFileName,
                sizeBytes: getDxfBlobSize(dxfContents),
                fileHandle: null,
                savedFilePath: null,
                dxfData: exportData
              }
              : current
          ));
          setEditorNotice(resolvedMessages.buildExportSuccessNotice({ exportFileName: saveFileName }));
          return;
        }

        setLoadedDxfData(exportData);
        setOpenedDocument((current) => (
          current
            ? {
              ...current,
              name: savedFile.name,
              sizeBytes: savedFile.sizeBytes,
              fileHandle: savedFile.fileHandle,
              savedFilePath: savedFile.savedFilePath,
              dxfData: exportData
            }
            : current
        ));
        setEditorNotice(resolvedMessages.buildExportSuccessNotice({ exportFileName: savedFile.name }));
      } catch (error) {
        console.error('Erro ao exportar DXF editado no editor CAD:', error);
        setEditorNotice(resolvedMessages.exportErrorNotice);
      }
    })();
  }, [buildEditedFileName, currentEditorData, openedDocument, resolvedMessages, setEditorNotice, setLoadedDxfData, setOpenedDocument]);

  const handleExportEditedDxf = useCallback(() => {
    handleSaveDxf(false);
  }, [handleSaveDxf]);

  const handleSaveAsEditedDxf = useCallback(() => {
    handleSaveDxf(true);
  }, [handleSaveDxf]);

  const handleFileInputChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    try {
      await openSelectedDxfFile(selectedFile, {
        fileHandle: null,
        savedFilePath: null
      });
    } catch (error) {
      console.error('Erro ao abrir DXF local no editor CAD:', error);
      setEditorNotice(resolvedMessages.openErrorNotice);
    } finally {
      event.target.value = '';
    }
  }, [
    openSelectedDxfFile,
    resolvedMessages,
    setEditorNotice,
    setOpenedDocument
  ]);

  return {
    resetEditorTransientState,
    resetDocumentGuideState,
    handleCloseOpenedFile,
    handleCreateNewDocument,
    handleApplyMeasurementUnit,
    handleOpenLocalFile,
    handleExportEditedDxf,
    handleSaveAsEditedDxf,
    handleFileInputChange
  };
};
