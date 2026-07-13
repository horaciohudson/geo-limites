import { useCallback, useMemo } from 'react';
import type {
  CadMenuActionsByMenu
} from '@/graphics-engine/pages/cad-editor/cadEditorMenuConfig';
import type { ViewportCommandId } from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

export interface UseCadEditorCommandPresentationParams {
  openedDocument: { name: string } | null;
  currentEditorDataAvailable: boolean;
  canUndo: boolean;
  canRedo: boolean;
  weldCanApply: boolean;
  selectedEntityCount: number;
  canGroupSelection?: boolean;
  canUngroupSelection?: boolean;
  zoomPresetIds: ReadonlyArray<ViewportCommandId>;
  buildMenuActionsByMenu?: (params: {
    openedDocument: { name: string } | null;
    currentEditorDataAvailable: boolean;
    canUndo: boolean;
    canRedo: boolean;
    weldCanApply: boolean;
    selectedEntityCount: number;
    canGroupSelection: boolean;
    canUngroupSelection: boolean;
  }) => CadMenuActionsByMenu;
}

const COMMAND_BAR_VIEWPORT_ACTION_IDS = new Set(['zoom-in', 'zoom-out', 'fit']);

const DEFAULT_BUILD_MENU_ACTIONS_BY_MENU: NonNullable<UseCadEditorCommandPresentationParams['buildMenuActionsByMenu']> = ({
  openedDocument,
  currentEditorDataAvailable,
  canUndo,
  canRedo,
  weldCanApply,
  selectedEntityCount,
  canGroupSelection,
  canUngroupSelection
}) => ({
  file: [
    { id: 'file-new', label: 'Novo' },
    { id: 'file-open', label: 'Abrir...', disabled: false },
    { id: 'file-save-dxf', label: 'Salvar', disabled: !openedDocument || !currentEditorDataAvailable },
    { id: 'file-save-as-dxf', label: 'Salvar Como...', disabled: !openedDocument || !currentEditorDataAvailable },
    { id: 'file-close', label: 'Fechar', disabled: !openedDocument }
  ],
  edit: [
    { id: 'edit-undo', label: 'Undo', disabled: !canUndo },
    { id: 'edit-redo', label: 'Redo', disabled: !canRedo },
    { id: 'edit-group', label: 'Agrupar', disabled: !canGroupSelection },
    { id: 'edit-ungroup', label: 'Desagrupar', disabled: !canUngroupSelection }
  ],
  view: [
    { id: 'view-zoom-in', label: 'Aumentar Zoom', disabled: !openedDocument },
    { id: 'view-zoom-out', label: 'Reduzir Zoom', disabled: !openedDocument },
    { id: 'view-fit', label: 'Ajustar ao Canvas', disabled: !openedDocument },
    { id: 'view-reset', label: 'Resetar Viewport', disabled: !openedDocument }
  ],
  tools: [
    { id: 'tool-select', label: 'Selecionar' },
    { id: 'tool-pan', label: 'Mover (Pan)' },
    { id: 'tool-zoom', label: 'Zoom' },
    { id: 'tool-join', label: 'Unir (Weld)' },
    { id: 'tool-join-apply', label: 'Aplicar Weld', disabled: !weldCanApply },
    { id: 'tool-mirror', label: 'Espelhar' },
    { id: 'tool-rotate', label: 'Rotacionar' },
    { id: 'tool-scale', label: 'Escalar' },
    { id: 'tool-offset', label: 'Offset' },
    { id: 'tool-extend', label: 'Estender' },
    { id: 'tool-trim', label: 'Aparar' },
    { id: 'tool-mirror-apply', label: 'Aplicar Espelhar', disabled: selectedEntityCount !== 1 }
  ],
  help: [
    { id: 'help-shortcuts', label: 'Atalhos Basicos' },
    { id: 'help-about', label: 'Sobre o Editor CAD' }
  ],
  config: [
    { id: 'config-open', label: 'Configuracoes do Sistema...' }
  ]
});

export const useCadEditorCommandPresentation = ({
  openedDocument,
  currentEditorDataAvailable,
  canUndo,
  canRedo,
  weldCanApply,
  selectedEntityCount,
  canGroupSelection = false,
  canUngroupSelection = false,
  zoomPresetIds,
  buildMenuActionsByMenu
}: UseCadEditorCommandPresentationParams) => {
  const resolvedBuildMenuActionsByMenu = buildMenuActionsByMenu ?? DEFAULT_BUILD_MENU_ACTIONS_BY_MENU;
  const menuActionsByMenu = useMemo<CadMenuActionsByMenu>(() => {
    return resolvedBuildMenuActionsByMenu({
      openedDocument,
      currentEditorDataAvailable,
      canUndo,
      canRedo,
      weldCanApply,
      selectedEntityCount,
      canGroupSelection,
      canUngroupSelection
    });
  }, [canGroupSelection, canRedo, canUndo, canUngroupSelection, currentEditorDataAvailable, openedDocument, resolvedBuildMenuActionsByMenu, selectedEntityCount, weldCanApply]);

  const isCommandBarActionDisabled = useCallback((actionId: string) => {
    if (actionId === 'undo') {
      return !canUndo;
    }
    if (actionId === 'redo') {
      return !canRedo;
    }

    return !openedDocument && !COMMAND_BAR_VIEWPORT_ACTION_IDS.has(actionId) && !zoomPresetIds.includes(actionId as ViewportCommandId)
      ? true
      : !openedDocument && (COMMAND_BAR_VIEWPORT_ACTION_IDS.has(actionId) || zoomPresetIds.includes(actionId as ViewportCommandId));
  }, [canRedo, canUndo, openedDocument, zoomPresetIds]);

  return {
    menuActionsByMenu,
    isCommandBarActionDisabled
  };
};
