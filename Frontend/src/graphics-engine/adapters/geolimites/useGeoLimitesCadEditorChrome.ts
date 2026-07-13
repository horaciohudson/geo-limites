import {
  GEO_LIMITES_CAD_COMMAND_ITEMS,
  GEO_LIMITES_CAD_MENU_ITEMS
} from '@/graphics-engine/adapters/geolimites/cadEditorMenuConfig';
import {
  GEO_LIMITES_CAD_DOCKS,
  GEO_LIMITES_CAD_TOOLS
} from '@/graphics-engine/adapters/geolimites/cadEditorToolConfig';
import {
  GEO_LIMITES_CAD_MEASUREMENT_UNITS,
  GEO_LIMITES_VIEWPORT_ZOOM_PRESETS
} from '@/graphics-engine/adapters/geolimites/cadEditorContentConfig';
import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import {
  type CadEditorSessionPreferences,
  type CadOpenedDocument
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import { useCadEditorChromeViewModel } from '@/graphics-engine/pages/cad-editor/useCadEditorChromeViewModel';
import { useCadEditorCommandPresentation } from '@/graphics-engine/pages/cad-editor/useCadEditorCommandPresentation';
import type { DXFData } from '@/graphics-engine/shared/dxf';

const GEO_LIMITES_CAD_EDITOR_ZOOM_PRESET_IDS = GEO_LIMITES_VIEWPORT_ZOOM_PRESETS.map((preset) => preset.id);

interface UseGeoLimitesCadEditorChromeParams {
  openedDocument: CadOpenedDocument | null;
  currentEditorDataAvailable: boolean;
  canUndo: boolean;
  canRedo: boolean;
  weldCanApply: boolean;
  selectedEntityCount: number;
  canGroupSelection: boolean;
  canUngroupSelection: boolean;
  viewerZoom: number;
  loadedDxfData: DXFData | null;
  lastViewportCommandId: CadEditorSessionPreferences['lastViewportCommandId'];
  activeLayerSummaryName: string | null;
}

export const useGeoLimitesCadEditorChrome = ({
  openedDocument,
  currentEditorDataAvailable,
  canUndo,
  canRedo,
  weldCanApply,
  selectedEntityCount,
  canGroupSelection,
  canUngroupSelection,
  viewerZoom,
  loadedDxfData,
  lastViewportCommandId,
  activeLayerSummaryName
}: UseGeoLimitesCadEditorChromeParams) => {
  const { menuActionsByMenu, isCommandBarActionDisabled } = useCadEditorCommandPresentation({
    openedDocument,
    currentEditorDataAvailable,
    canUndo,
    canRedo,
    weldCanApply,
    selectedEntityCount,
    canGroupSelection,
    canUngroupSelection,
    zoomPresetIds: GEO_LIMITES_CAD_EDITOR_ZOOM_PRESET_IDS,
    buildMenuActionsByMenu: GEO_LIMITES_CAD_EDITOR_TEXTS.commandPresentation.buildMenuActionsByMenu
  });

  const chromeViewModel = useCadEditorChromeViewModel({
    cadDocks: GEO_LIMITES_CAD_DOCKS,
    cadTools: GEO_LIMITES_CAD_TOOLS,
    zoomPresets: GEO_LIMITES_VIEWPORT_ZOOM_PRESETS,
    viewerZoom,
    openedDocument,
    loadedDxfData,
    lastViewportCommandId,
    activeLayerSummaryName,
    messages: GEO_LIMITES_CAD_EDITOR_TEXTS.chromeViewModel
  });

  return {
    menuItems: GEO_LIMITES_CAD_MENU_ITEMS,
    commandItems: GEO_LIMITES_CAD_COMMAND_ITEMS,
    leftSidebarTitle: GEO_LIMITES_CAD_EDITOR_TEXTS.leftSidebarTitle,
    topBarBackButtonLabel: GEO_LIMITES_CAD_EDITOR_TEXTS.topBarBackButtonLabel,
    topBarDocumentLabel: GEO_LIMITES_CAD_EDITOR_TEXTS.topBarDocumentLabel,
    emptyStateTitle: GEO_LIMITES_CAD_EDITOR_TEXTS.emptyStateTitle,
    emptyStateSubtitle: GEO_LIMITES_CAD_EDITOR_TEXTS.emptyStateSubtitle,
    emptyStateHint: GEO_LIMITES_CAD_EDITOR_TEXTS.emptyStateHint,
    settingsDialogTexts: GEO_LIMITES_CAD_EDITOR_TEXTS.settingsDialog,
    shortcutsDialogTexts: GEO_LIMITES_CAD_EDITOR_TEXTS.shortcutsDialog,
    textDialogTexts: GEO_LIMITES_CAD_EDITOR_TEXTS.textDialog,
    layerDialogTexts: GEO_LIMITES_CAD_EDITOR_TEXTS.layerDialog,
    statusBarTexts: GEO_LIMITES_CAD_EDITOR_TEXTS.statusBar,
    rightSidebarTexts: GEO_LIMITES_CAD_EDITOR_TEXTS.rightSidebar,
    toolDefinitions: GEO_LIMITES_CAD_TOOLS,
    measurementUnitOptions: GEO_LIMITES_CAD_MEASUREMENT_UNITS,
    zoomPresets: GEO_LIMITES_VIEWPORT_ZOOM_PRESETS,
    menuActionsByMenu,
    isCommandBarActionDisabled,
    ...chromeViewModel
  };
};
