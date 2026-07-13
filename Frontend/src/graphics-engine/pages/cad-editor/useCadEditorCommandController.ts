import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ViewerViewportCommand } from '@/graphics-engine/components/viewer-dxf/viewerContracts';
import type {
  CadDockSection,
  CadOpenedDocument,
  ViewportCommandId
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import { commitCadEditorUndoRedoTransition } from '@/graphics-engine/pages/cad-editor/cadEditorHistoryUtils';
import type { DXFData } from '@/graphics-engine/shared/dxf';

export interface UseCadEditorCommandControllerParams<
  SelectionItem = unknown,
  MenuId extends string = string,
  MeasurementUnitId extends string = string
> {
  currentEditorData: DXFData | null;
  openedDocument: CadOpenedDocument | null;
  undoStack: DXFData[];
  redoStack: DXFData[];
  setUndoStack: Dispatch<SetStateAction<DXFData[]>>;
  setRedoStack: Dispatch<SetStateAction<DXFData[]>>;
  setLoadedDxfData: Dispatch<SetStateAction<DXFData | null>>;
  setSelectedEntities: Dispatch<SetStateAction<SelectionItem[]>>;
  setViewerSelectionOverride: Dispatch<SetStateAction<string[] | undefined>>;
  setEditorNotice: Dispatch<SetStateAction<string>>;
  setLastViewportCommandId: Dispatch<SetStateAction<ViewportCommandId | null>>;
  setViewportCommand: Dispatch<SetStateAction<ViewerViewportCommand>>;
  setMenuOpenId: Dispatch<SetStateAction<MenuId | null>>;
  setIsConfiguratorOpen: Dispatch<SetStateAction<boolean>>;
  setIsShortcutsDialogOpen: Dispatch<SetStateAction<boolean>>;
  activateEditorTool: (toolId: string, section?: CadDockSection) => void;
  handleCreateNewDocument: () => void;
  handleOpenLocalFile: () => void;
  handleExportEditedDxf: () => void;
  handleSaveAsEditedDxf: () => void;
  handleCloseOpenedFile: () => void;
  handleApplyMeasurementUnit: (unitId: MeasurementUnitId) => void;
  handleApplyWeldToSelection: () => void;
  handleApplyMirrorToSelection: () => void;
  handleGroupSelectedEntities: () => void;
  handleUngroupSelectedEntities: () => void;
  measurementUnitMenuActions: Record<string, MeasurementUnitId>;
  messages?: {
    undoUnavailable: string;
    redoUnavailable: string;
    undoApplied: string;
    redoApplied: string;
    zoomInApplied: string;
    zoomOutApplied: string;
    fitApplied: string;
    resetApplied: string;
    helpShortcuts: string;
    helpAbout: string;
    zoomAdjusted: (zoomValue: number) => string;
  };
}

export const useCadEditorCommandController = <
  SelectionItem = unknown,
  MenuId extends string = string,
  MeasurementUnitId extends string = string
>({
  currentEditorData,
  openedDocument,
  undoStack,
  redoStack,
  setUndoStack,
  setRedoStack,
  setLoadedDxfData,
  setSelectedEntities,
  setViewerSelectionOverride,
  setEditorNotice,
  setLastViewportCommandId,
  setViewportCommand,
  setMenuOpenId,
  setIsConfiguratorOpen,
  setIsShortcutsDialogOpen,
  activateEditorTool,
  handleCreateNewDocument,
  handleOpenLocalFile,
  handleExportEditedDxf,
  handleSaveAsEditedDxf,
  handleCloseOpenedFile,
  handleApplyMeasurementUnit,
  handleApplyWeldToSelection,
  handleApplyMirrorToSelection,
  handleGroupSelectedEntities,
  handleUngroupSelectedEntities,
  measurementUnitMenuActions,
  messages
}: UseCadEditorCommandControllerParams<SelectionItem, MenuId, MeasurementUnitId>) => {
  const commandMessages = messages || {
    undoUnavailable: 'Nao ha operacoes para desfazer.',
    redoUnavailable: 'Nao ha operacoes para refazer.',
    undoApplied: 'Undo aplicado no Editor CAD.',
    redoApplied: 'Redo aplicado no Editor CAD.',
    zoomInApplied: 'Zoom aumentado.',
    zoomOutApplied: 'Zoom reduzido.',
    fitApplied: 'Desenho ajustado ao canvas.',
    resetApplied: 'Viewport resetado.',
    helpShortcuts: 'Atalhos atuais: roda do mouse para zoom, arraste para pan, menus superiores para comandos do editor.',
    helpAbout: 'Editor CAD independente em construcao, com foco em abertura de arquivos e comandos de viewport.',
    zoomAdjusted: (zoomValue: number) => `Zoom ajustado para ${zoomValue.toFixed(2)}x.`
  };

  const handleUndoEdit = useCallback(() => {
    if (!currentEditorData || undoStack.length === 0) {
      setEditorNotice(commandMessages.undoUnavailable);
      return;
    }

    const previousData = undoStack[undoStack.length - 1];
    commitCadEditorUndoRedoTransition({
      currentEditorData,
      targetData: previousData,
      setSourceStack: setUndoStack,
      setTargetStack: setRedoStack,
      setLoadedDxfData,
      setSelectedEntities,
      setViewerSelectionOverride
    });
    setEditorNotice(commandMessages.undoApplied);
  }, [
    commandMessages,
    currentEditorData,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride,
    undoStack
  ]);

  const handleRedoEdit = useCallback(() => {
    if (!currentEditorData || redoStack.length === 0) {
      setEditorNotice(commandMessages.redoUnavailable);
      return;
    }

    const nextData = redoStack[redoStack.length - 1];
    commitCadEditorUndoRedoTransition({
      currentEditorData,
      targetData: nextData,
      setSourceStack: setRedoStack,
      setTargetStack: setUndoStack,
      setLoadedDxfData,
      setSelectedEntities,
      setViewerSelectionOverride
    });
    setEditorNotice(commandMessages.redoApplied);
  }, [
    commandMessages,
    currentEditorData,
    redoStack,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  ]);

  const triggerViewportCommand = useCallback((commandId: 'zoom-in' | 'zoom-out' | 'fit' | 'reset') => {
    if (!openedDocument && commandId !== 'reset') {
      return;
    }

    setLastViewportCommandId(commandId);
    setViewportCommand((current) => {
      switch (commandId) {
        case 'zoom-in':
          return { ...current, zoomInToken: current.zoomInToken + 1 };
        case 'zoom-out':
          return { ...current, zoomOutToken: current.zoomOutToken + 1 };
        case 'fit':
          return { ...current, fitToken: current.fitToken + 1 };
        case 'reset':
          return { ...current, resetToken: current.resetToken + 1 };
        default:
          return current;
      }
    });
  }, [openedDocument, setLastViewportCommandId, setViewportCommand]);

  const applyViewportZoomPreset = useCallback((presetId: ViewportCommandId, zoomValue: number) => {
    if (!openedDocument) {
      return;
    }

    setLastViewportCommandId(presetId);
    setViewportCommand((current) => ({
      ...current,
      absoluteZoomToken: (current.absoluteZoomToken ?? 0) + 1,
      absoluteZoomValue: zoomValue
    }));
    setEditorNotice(commandMessages.zoomAdjusted(zoomValue));
  }, [commandMessages, openedDocument, setEditorNotice, setLastViewportCommandId, setViewportCommand]);

  const handleMenuAction = useCallback((actionId: string) => {
    const measurementUnitId = measurementUnitMenuActions[actionId];
    if (measurementUnitId) {
      handleApplyMeasurementUnit(measurementUnitId);
      return;
    }

    switch (actionId) {
      case 'file-new':
        handleCreateNewDocument();
        return;
      case 'file-open':
        handleOpenLocalFile();
        return;
      case 'file-save-dxf':
        handleExportEditedDxf();
        return;
      case 'file-save-as-dxf':
        handleSaveAsEditedDxf();
        return;
      case 'file-close':
        handleCloseOpenedFile();
        return;
      case 'edit-undo':
        handleUndoEdit();
        break;
      case 'edit-redo':
        handleRedoEdit();
        break;
      case 'edit-group':
        handleGroupSelectedEntities();
        break;
      case 'edit-ungroup':
        handleUngroupSelectedEntities();
        break;
      case 'view-zoom-in':
        triggerViewportCommand('zoom-in');
        setEditorNotice(commandMessages.zoomInApplied);
        break;
      case 'view-zoom-out':
        triggerViewportCommand('zoom-out');
        setEditorNotice(commandMessages.zoomOutApplied);
        break;
      case 'view-fit':
        triggerViewportCommand('fit');
        setEditorNotice(commandMessages.fitApplied);
        break;
      case 'view-reset':
        triggerViewportCommand('reset');
        setEditorNotice(commandMessages.resetApplied);
        break;
      case 'tool-select':
        activateEditorTool('select', 'ferramentas');
        break;
      case 'tool-pan':
        activateEditorTool('pan', 'ferramentas');
        break;
      case 'tool-zoom':
        activateEditorTool('zoom', 'ferramentas');
        break;
      case 'tool-join':
        activateEditorTool('join', 'ajustes');
        break;
      case 'tool-join-apply':
        handleApplyWeldToSelection();
        break;
      case 'tool-mirror':
        activateEditorTool('mirror', 'ajustes');
        break;
      case 'tool-rotate':
        activateEditorTool('rotate', 'ajustes');
        break;
      case 'tool-scale':
        activateEditorTool('scale', 'ajustes');
        break;
      case 'tool-offset':
        activateEditorTool('offset', 'ajustes');
        break;
      case 'tool-extend':
        activateEditorTool('extend', 'ajustes');
        break;
      case 'tool-trim':
        activateEditorTool('trim', 'ajustes');
        break;
      case 'tool-mirror-apply':
        handleApplyMirrorToSelection();
        break;
      case 'help-shortcuts':
        setIsShortcutsDialogOpen(true);
        break;
      case 'help-about':
        setEditorNotice(commandMessages.helpAbout);
        break;
      case 'config-open':
        setIsConfiguratorOpen(true);
        break;
      default:
        break;
    }

    setMenuOpenId(null);
  }, [
    activateEditorTool,
    commandMessages,
    handleApplyMeasurementUnit,
    handleApplyMirrorToSelection,
    handleApplyWeldToSelection,
    handleGroupSelectedEntities,
    handleCloseOpenedFile,
    handleCreateNewDocument,
    handleExportEditedDxf,
    handleOpenLocalFile,
    handleRedoEdit,
    handleUngroupSelectedEntities,
    handleUndoEdit,
    measurementUnitMenuActions,
    setEditorNotice,
    setIsConfiguratorOpen,
    setIsShortcutsDialogOpen,
    setMenuOpenId,
    triggerViewportCommand
  ]);

  const handleCommandBarAction = useCallback((actionId: string, zoomPresets: ReadonlyArray<{ id: ViewportCommandId; zoom: number }>) => {
    if (actionId === 'undo') {
      handleUndoEdit();
      return;
    }
    if (actionId === 'redo') {
      handleRedoEdit();
      return;
    }
    if (actionId === 'zoom-in' || actionId === 'zoom-out' || actionId === 'fit') {
      triggerViewportCommand(actionId);
      return;
    }

    const zoomPreset = zoomPresets.find((preset) => preset.id === actionId);
    if (zoomPreset) {
      applyViewportZoomPreset(zoomPreset.id, zoomPreset.zoom);
    }
  }, [applyViewportZoomPreset, handleRedoEdit, handleUndoEdit, triggerViewportCommand]);

  return {
    handleUndoEdit,
    handleRedoEdit,
    triggerViewportCommand,
    applyViewportZoomPreset,
    handleMenuAction,
    handleCommandBarAction
  };
};
