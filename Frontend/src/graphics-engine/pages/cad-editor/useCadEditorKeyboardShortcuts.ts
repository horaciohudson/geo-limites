import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';
import type { CadGuideContextMenuState } from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import type { CadGuide, CadRulerInteraction } from '@/graphics-engine/pages/cad-editor/cadEditorRulerUtils';
import { isEditableKeyboardTarget } from '@/graphics-engine/pages/cad-editor/useCadEditorUiUtils';

export interface UseCadEditorKeyboardShortcutsParams {
  selectedGuideId: string | null;
  rulerGuides: CadGuide[];
  rulerGuidePreview: CadGuide | null;
  selectedEntities: ViewerSelectedEntityInfo[];
  copiedEntitiesCount: number;
  pendingCanvasGuideDragRef: MutableRefObject<{
    guide: CadGuide;
    startClientX: number;
    startClientY: number;
  } | null>;
  rulerInteractionRef: MutableRefObject<CadRulerInteraction | null>;
  setRulerGuides: Dispatch<SetStateAction<CadGuide[]>>;
  setRulerGuidePreview: Dispatch<SetStateAction<CadGuide | null>>;
  setHoveredGuideId: Dispatch<SetStateAction<string | null>>;
  setSelectedGuideId: Dispatch<SetStateAction<string | null>>;
  setGuideContextMenu: Dispatch<SetStateAction<CadGuideContextMenuState | null>>;
  setEditorNotice: Dispatch<SetStateAction<string>>;
  isShortcutsDialogOpen: boolean;
  setIsShortcutsDialogOpen: Dispatch<SetStateAction<boolean>>;
  handleUndoEdit: () => void;
  handleRedoEdit: () => void;
  handleCreateNewDocument: () => void;
  handleOpenLocalFile: () => void;
  handleExportEditedDxf: () => void;
  handleSaveAsEditedDxf: () => void;
  handleCloseOpenedFile: () => void;
  handleMenuAction: (actionId: string) => void;
  clearSelectedEntities: (notice?: string) => void;
  cutSelectedEntities: () => void;
  copySelectedEntities: () => void;
  pasteCopiedEntities: () => void;
  bringSelectedEntitiesToFront: () => void;
  bringSelectedEntitiesForwardOneStep: () => void;
  sendSelectedEntitiesToBack: () => void;
  sendSelectedEntitiesBackwardOneStep: () => void;
  removeSelectedEntities: () => void;
  groupSelectedEntities: () => void;
  ungroupSelectedEntities: () => void;
  messages?: {
    clearSelectedGuideNotice: string;
    buildGuideLockedToRemoveNotice: (params: { orientation: CadGuide['orientation'] }) => string;
    buildGuideRemovedNotice: (params: { orientation: CadGuide['orientation'] }) => string;
    clearSelectedEntitiesNotice: string;
  };
}

const DEFAULT_KEYBOARD_SHORTCUTS_MESSAGES: NonNullable<UseCadEditorKeyboardShortcutsParams['messages']> = {
  clearSelectedGuideNotice: 'Guia desmarcada.',
  buildGuideLockedToRemoveNotice: ({ orientation }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} travada. Destrave para remover.`,
  buildGuideRemovedNotice: ({ orientation }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} removida.`,
  clearSelectedEntitiesNotice: 'Selecao de entidades limpa.'
};

const getNormalizedKeyboardKey = (event: KeyboardEvent) => event.key.toLowerCase();

const isKeyboardHelpShortcut = (event: KeyboardEvent) =>
  event.key === 'F1' || event.key === '?' || (event.code === 'Slash' && event.shiftKey);

const isKeyboardDeleteShortcut = (event: KeyboardEvent) => event.key === 'Delete' || event.key === 'Backspace';

const isKeyboardZoomInShortcut = (event: KeyboardEvent, modifierPressed: boolean) =>
  !modifierPressed && !event.altKey && (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd');

const isKeyboardZoomOutShortcut = (event: KeyboardEvent, modifierPressed: boolean) =>
  !modifierPressed && !event.altKey && (event.key === '-' || event.code === 'NumpadSubtract');

const isKeyboardResetShortcut = (event: KeyboardEvent, modifierPressed: boolean) =>
  !modifierPressed && !event.altKey && (event.key === '0' || event.code === 'Numpad0');

const shouldIgnoreRepeatedKeyboardShortcut = (event: KeyboardEvent, modifierPressed: boolean) => {
  if (!event.repeat) {
    return false;
  }

  return !isKeyboardZoomInShortcut(event, modifierPressed) && !isKeyboardZoomOutShortcut(event, modifierPressed);
};

const shouldPreventBrowserBackNavigation = (event: KeyboardEvent, modifierPressed: boolean) =>
  event.key === 'Backspace' && !modifierPressed && !event.altKey;

export const useCadEditorKeyboardShortcuts = ({
  selectedGuideId,
  rulerGuides,
  rulerGuidePreview,
  selectedEntities,
  copiedEntitiesCount,
  pendingCanvasGuideDragRef,
  rulerInteractionRef,
  setRulerGuides,
  setRulerGuidePreview,
  setHoveredGuideId,
  setSelectedGuideId,
  setGuideContextMenu,
  setEditorNotice,
  isShortcutsDialogOpen,
  setIsShortcutsDialogOpen,
  handleUndoEdit,
  handleRedoEdit,
  handleCreateNewDocument,
  handleOpenLocalFile,
  handleExportEditedDxf,
  handleSaveAsEditedDxf,
  handleCloseOpenedFile,
  handleMenuAction,
  clearSelectedEntities,
  cutSelectedEntities,
  copySelectedEntities,
  pasteCopiedEntities,
  bringSelectedEntitiesToFront,
  bringSelectedEntitiesForwardOneStep,
  sendSelectedEntitiesToBack,
  sendSelectedEntitiesBackwardOneStep,
  removeSelectedEntities,
  groupSelectedEntities,
  ungroupSelectedEntities,
  messages
}: UseCadEditorKeyboardShortcutsParams) => {
  const resolvedMessages = messages ?? DEFAULT_KEYBOARD_SHORTCUTS_MESSAGES;
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      const modifierPressed = event.ctrlKey || event.metaKey;
      const normalizedKey = getNormalizedKeyboardKey(event);

      if (isShortcutsDialogOpen) {
        if (event.key === 'Escape' || isKeyboardHelpShortcut(event)) {
          event.preventDefault();
          setIsShortcutsDialogOpen(false);
        }
        return;
      }

      if (selectedGuideId) {
        if (event.key === 'Escape') {
          event.preventDefault();
          pendingCanvasGuideDragRef.current = null;
          if (rulerInteractionRef.current?.mode === 'guide' && rulerInteractionRef.current.guideId === selectedGuideId) {
            rulerInteractionRef.current = null;
          }
          if (rulerGuidePreview?.id === selectedGuideId) {
            setRulerGuidePreview(null);
          }
          setHoveredGuideId(null);
          setSelectedGuideId(null);
          setGuideContextMenu(null);
          setEditorNotice(resolvedMessages.clearSelectedGuideNotice);
          return;
        }

        if (isKeyboardDeleteShortcut(event) && !modifierPressed && !event.altKey && selectedEntities.length === 0) {
          event.preventDefault();
          const guideToRemove = rulerGuides.find((guide) => guide.id === selectedGuideId);
          if (!guideToRemove) {
            return;
          }
          if (guideToRemove.locked) {
            setEditorNotice(resolvedMessages.buildGuideLockedToRemoveNotice({ orientation: guideToRemove.orientation }));
            return;
          }

          pendingCanvasGuideDragRef.current = null;
          setRulerGuides((current) => current.filter((guide) => guide.id !== selectedGuideId));
          if (rulerGuidePreview?.id === selectedGuideId) {
            setRulerGuidePreview(null);
          }
          if (rulerInteractionRef.current?.mode === 'guide' && rulerInteractionRef.current.guideId === selectedGuideId) {
            rulerInteractionRef.current = null;
          }
          setGuideContextMenu(null);
          setSelectedGuideId(null);
          setEditorNotice(resolvedMessages.buildGuideRemovedNotice({ orientation: guideToRemove.orientation }));
          return;
        }
      }

      if (shouldIgnoreRepeatedKeyboardShortcut(event, modifierPressed)) {
        return;
      }

      if (event.altKey && !modifierPressed && normalizedKey === 'n') {
        event.preventDefault();
        handleCreateNewDocument();
        return;
      }

      if (modifierPressed && normalizedKey === 'n') {
        event.preventDefault();
        handleCreateNewDocument();
        return;
      }

      if (modifierPressed && normalizedKey === 'o') {
        event.preventDefault();
        handleOpenLocalFile();
        return;
      }

      if (modifierPressed && event.shiftKey && normalizedKey === 's') {
        event.preventDefault();
        handleSaveAsEditedDxf();
        return;
      }

      if (modifierPressed && normalizedKey === 's') {
        event.preventDefault();
        handleExportEditedDxf();
        return;
      }

      if (modifierPressed && normalizedKey === 'w') {
        event.preventDefault();
        handleCloseOpenedFile();
        return;
      }

      if (modifierPressed && normalizedKey === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedoEdit();
          return;
        }
        handleUndoEdit();
        return;
      }

      if (modifierPressed && normalizedKey === 'y') {
        event.preventDefault();
        handleRedoEdit();
        return;
      }

      if (modifierPressed && event.shiftKey && normalizedKey === 'g') {
        event.preventDefault();
        ungroupSelectedEntities();
        return;
      }

      if (modifierPressed && normalizedKey === 'g') {
        event.preventDefault();
        groupSelectedEntities();
        return;
      }

      if (isKeyboardHelpShortcut(event)) {
        event.preventDefault();
        handleMenuAction('help-shortcuts');
        return;
      }

      if (isKeyboardZoomInShortcut(event, modifierPressed)) {
        event.preventDefault();
        handleMenuAction('view-zoom-in');
        return;
      }

      if (isKeyboardZoomOutShortcut(event, modifierPressed)) {
        event.preventDefault();
        handleMenuAction('view-zoom-out');
        return;
      }

      if (isKeyboardResetShortcut(event, modifierPressed)) {
        event.preventDefault();
        handleMenuAction('view-reset');
        return;
      }

      if (!modifierPressed && !event.altKey) {
        switch (normalizedKey) {
          case 'v':
            event.preventDefault();
            handleMenuAction('tool-select');
            return;
          case 'h':
            event.preventDefault();
            handleMenuAction('tool-pan');
            return;
          case 'z':
            event.preventDefault();
            handleMenuAction('tool-zoom');
            return;
          case 'j':
            event.preventDefault();
            handleMenuAction('tool-join');
            return;
          case 'm':
            event.preventDefault();
            handleMenuAction('tool-mirror');
            return;
          case 'r':
            event.preventDefault();
            handleMenuAction('tool-rotate');
            return;
          case 'o':
            event.preventDefault();
            handleMenuAction('tool-offset');
            return;
          case 'e':
            event.preventDefault();
            handleMenuAction('tool-extend');
            return;
          case 't':
            event.preventDefault();
            handleMenuAction('tool-trim');
            return;
          case 'f':
            event.preventDefault();
            handleMenuAction('view-fit');
            return;
          default:
            break;
        }
      }

      if (modifierPressed && normalizedKey === 'x') {
        if (selectedEntities.length === 0) {
          return;
        }
        event.preventDefault();
        cutSelectedEntities();
        return;
      }

      if (modifierPressed && normalizedKey === 'c') {
        if (selectedEntities.length === 0) {
          return;
        }
        event.preventDefault();
        copySelectedEntities();
        return;
      }

      if (modifierPressed && normalizedKey === 'v') {
        if (copiedEntitiesCount === 0) {
          return;
        }
        event.preventDefault();
        pasteCopiedEntities();
        return;
      }

      if (event.altKey && event.key === 'ArrowUp') {
        if (selectedEntities.length === 0) {
          return;
        }
        event.preventDefault();
        if (event.shiftKey) {
          bringSelectedEntitiesToFront();
          return;
        }
        bringSelectedEntitiesForwardOneStep();
        return;
      }

      if (event.altKey && event.key === 'ArrowDown') {
        if (selectedEntities.length === 0) {
          return;
        }
        event.preventDefault();
        if (event.shiftKey) {
          sendSelectedEntitiesToBack();
          return;
        }
        sendSelectedEntitiesBackwardOneStep();
        return;
      }

      if (event.key === 'Escape') {
        if (selectedEntities.length === 0) {
          return;
        }
        event.preventDefault();
        clearSelectedEntities(resolvedMessages.clearSelectedEntitiesNotice);
        return;
      }

      if (!isKeyboardDeleteShortcut(event)) {
        return;
      }

      if (selectedEntities.length === 0) {
        if (shouldPreventBrowserBackNavigation(event, modifierPressed)) {
          event.preventDefault();
        }
        return;
      }

      event.preventDefault();
      removeSelectedEntities();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    pendingCanvasGuideDragRef,
    rulerGuidePreview,
    rulerGuides,
    rulerInteractionRef,
    bringSelectedEntitiesForwardOneStep,
    bringSelectedEntitiesToFront,
    clearSelectedEntities,
    copiedEntitiesCount,
    copySelectedEntities,
    cutSelectedEntities,
    handleCloseOpenedFile,
    handleCreateNewDocument,
    handleExportEditedDxf,
    handleMenuAction,
    handleOpenLocalFile,
    handleRedoEdit,
    handleUndoEdit,
    groupSelectedEntities,
    pasteCopiedEntities,
    resolvedMessages,
    resolvedMessages.clearSelectedEntitiesNotice,
    removeSelectedEntities,
    selectedGuideId,
    selectedEntities,
    setEditorNotice,
    setGuideContextMenu,
    setHoveredGuideId,
    setIsShortcutsDialogOpen,
    setRulerGuidePreview,
    setRulerGuides,
    setSelectedGuideId,
    sendSelectedEntitiesBackwardOneStep,
    sendSelectedEntitiesToBack,
    ungroupSelectedEntities,
    isShortcutsDialogOpen
  ]);
};
