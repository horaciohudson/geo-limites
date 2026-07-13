import { useMemo } from 'react';
import {
  type CadDockDefinition,
  type CadViewportZoomPreset,
  type CadToolDefinition,
  formatViewportCommandLabel,
  type CadEditorSessionPreferences,
  type CadOpenedDocument
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import { CAD_ICON_PATHS } from '@/graphics-engine/pages/cad-editor/cadEditorIcons';
import type { DXFData } from '@/graphics-engine/shared/dxf';

interface UseCadEditorChromeViewModelParams {
  cadDocks: CadDockDefinition[];
  cadTools: CadToolDefinition[];
  zoomPresets: ReadonlyArray<CadViewportZoomPreset>;
  viewerZoom: number;
  openedDocument: CadOpenedDocument | null;
  loadedDxfData: DXFData | null;
  lastViewportCommandId: CadEditorSessionPreferences['lastViewportCommandId'];
  activeLayerSummaryName: string | null;
  messages?: {
    noFileCommandValue: string;
    buildStatusDocumentLabel: (params: { openedDocumentName: string | null }) => string;
    buildStatusViewportLabel: (params: {
      viewerZoom: number;
      lastViewportCommandLabel: string;
      entityCount: number | null;
    }) => string;
  };
}

const DEFAULT_CHROME_VIEW_MODEL_MESSAGES = {
  noFileCommandValue: 'Sem arquivo',
  buildStatusDocumentLabel: ({ openedDocumentName }: { openedDocumentName: string | null }) => (
    openedDocumentName ? `Arquivo aberto: ${openedDocumentName}` : 'Editor CAD carregado sem arquivo aberto.'
  ),
  buildStatusViewportLabel: ({
    viewerZoom,
    lastViewportCommandLabel,
    entityCount
  }: {
    viewerZoom: number;
    lastViewportCommandLabel: string;
    entityCount: number | null;
  }) => (
    entityCount !== null
      ? `Zoom: ${viewerZoom.toFixed(2)}x | Viewport: ${lastViewportCommandLabel} | Entidades: ${entityCount}`
      : `Zoom: ${viewerZoom.toFixed(2)}x | Viewport: ${lastViewportCommandLabel}`
  )
};

export const useCadEditorChromeViewModel = ({
  cadDocks,
  cadTools,
  zoomPresets,
  viewerZoom,
  openedDocument,
  loadedDxfData,
  lastViewportCommandId,
  activeLayerSummaryName,
  messages
}: UseCadEditorChromeViewModelParams) => {
  const resolvedMessages = messages ?? DEFAULT_CHROME_VIEW_MODEL_MESSAGES;

  const activeZoomPresetId = useMemo(() => {
    const matchedPreset = zoomPresets.find((preset) => Math.abs(viewerZoom - preset.zoom) <= 0.05);
    return matchedPreset?.id || null;
  }, [viewerZoom, zoomPresets]);

  const leftSidebarDocks = useMemo(
    () => cadDocks.map((dock) => ({
      id: dock.id,
      label: dock.label,
      iconPath: CAD_ICON_PATHS[dock.icon as keyof typeof CAD_ICON_PATHS]
    })),
    [cadDocks]
  );

  const leftSidebarTools = useMemo(
    () => cadTools.map((tool) => ({
      id: tool.id,
      label: tool.label,
      section: tool.section,
      iconPath: CAD_ICON_PATHS[tool.id as keyof typeof CAD_ICON_PATHS] || CAD_ICON_PATHS.point
    })),
    [cadTools]
  );

  const fileExtensionLabel = openedDocument?.extension?.toUpperCase() || 'ARQ';
  const editorCommandValue = openedDocument?.name || resolvedMessages.noFileCommandValue;
  const statusDocumentLabel = resolvedMessages.buildStatusDocumentLabel({ openedDocumentName: openedDocument?.name || null });
  const statusActiveLayerLabel = activeLayerSummaryName || 'PRINCIPAL';
  const lastViewportCommandLabel = formatViewportCommandLabel(lastViewportCommandId);
  const statusViewportLabel = resolvedMessages.buildStatusViewportLabel({
    viewerZoom,
    lastViewportCommandLabel,
    entityCount: loadedDxfData ? (loadedDxfData.entities?.length || 0) : null
  });

  return {
    activeZoomPresetId,
    leftSidebarDocks,
    leftSidebarTools,
    fileExtensionLabel,
    editorCommandValue,
    statusDocumentLabel,
    statusActiveLayerLabel,
    statusViewportLabel
  };
};
