import type React from 'react';
import type { RefObject } from 'react';
import {
  createGeoLimitesEmptyDxfData,
  GEO_LIMITES_CAD_LAYERS,
  GEO_LIMITES_CAD_MEASUREMENT_UNITS
} from '@/graphics-engine/adapters/geolimites/cadEditorContentConfig';
import {
  GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM
} from '@/graphics-engine/adapters/geolimites/functionalLayerUtils';
import { normalizeDxfToFunctionalLayers } from '@/graphics-engine/adapters/geolimites/normalizeDxfToFunctionalLayers';
import {
  buildEditedFileName,
  type CadGuideContextMenuState,
  type CadMenuId,
  type CadMeasurementUnit,
  type CadOpenedDocument
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import type { CadGuide, CadRulerInteraction } from '@/graphics-engine/pages/cad-editor/cadEditorRulerUtils';
import { useCadEditorDocumentController } from '@/graphics-engine/pages/cad-editor/useCadEditorDocumentController';
import type { DXFData } from '@/graphics-engine/shared/dxf';

interface UseGeoLimitesCadEditorDocumentControllerParams<SelectionItem = unknown> {
  fileInputRef: RefObject<HTMLInputElement>;
  measurementUnitLabel: string;
  workspaceSizeLabel: string;
  currentEditorData: DXFData | null;
  openedDocument: CadOpenedDocument | null;
  setOpenedDocument: React.Dispatch<React.SetStateAction<CadOpenedDocument | null>>;
  setLoadedDxfData: React.Dispatch<React.SetStateAction<DXFData | null>>;
  setActiveLayerName: React.Dispatch<React.SetStateAction<string>>;
  setSelectedEntities: React.Dispatch<React.SetStateAction<SelectionItem[]>>;
  setViewerSelectionOverride: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  setUndoStack: React.Dispatch<React.SetStateAction<DXFData[]>>;
  setRedoStack: React.Dispatch<React.SetStateAction<DXFData[]>>;
  setViewerZoom: React.Dispatch<React.SetStateAction<number>>;
  setMenuOpenId: React.Dispatch<React.SetStateAction<CadMenuId | null>>;
  setEditorNotice: React.Dispatch<React.SetStateAction<string>>;
  setMeasurementUnit: React.Dispatch<React.SetStateAction<CadMeasurementUnit>>;
  setNewDocumentWorkspaceSize: React.Dispatch<React.SetStateAction<number>>;
  setGridSnapSize: React.Dispatch<React.SetStateAction<number>>;
  setEnableGridSnap: React.Dispatch<React.SetStateAction<boolean>>;
  setIsConfiguratorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setRulerGuides: React.Dispatch<React.SetStateAction<CadGuide[]>>;
  setRulerGuidePreview: React.Dispatch<React.SetStateAction<CadGuide | null>>;
  setSelectedGuideId: React.Dispatch<React.SetStateAction<string | null>>;
  setHoveredGuideId: React.Dispatch<React.SetStateAction<string | null>>;
  setGuideContextMenu: React.Dispatch<React.SetStateAction<CadGuideContextMenuState | null>>;
  suppressViewerCanvasClickRef: React.MutableRefObject<boolean>;
  pendingCanvasGuideDragRef: React.MutableRefObject<{
    guide: CadGuide;
    startClientX: number;
    startClientY: number;
  } | null>;
  rulerInteractionRef: React.MutableRefObject<CadRulerInteraction | null>;
}

export const useGeoLimitesCadEditorDocumentController = <SelectionItem = unknown>({
  fileInputRef,
  measurementUnitLabel,
  workspaceSizeLabel,
  currentEditorData,
  openedDocument,
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
  rulerInteractionRef
}: UseGeoLimitesCadEditorDocumentControllerParams<SelectionItem>) => useCadEditorDocumentController<
  CadMeasurementUnit,
  CadMenuId,
  SelectionItem
>({
  fileInputRef,
  measurementUnitDefinition: { label: measurementUnitLabel },
  workspaceSizeLabel,
  currentEditorData,
  openedDocument,
  measurementUnitOptions: GEO_LIMITES_CAD_MEASUREMENT_UNITS,
  createEmptyDxfData: createGeoLimitesEmptyDxfData,
  buildEditedFileName,
  defaultActiveLayerName: GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM,
  normalizeImportedDxfData: (dxfData) => normalizeDxfToFunctionalLayers(dxfData, GEO_LIMITES_CAD_LAYERS),
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
  messages: GEO_LIMITES_CAD_EDITOR_TEXTS.documentController
});
