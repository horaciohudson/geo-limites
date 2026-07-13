import React from 'react';
import ViewerDXF from '@/graphics-engine/components/viewer-dxf';
import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import { loadGeoLimitesDxfText } from '@/graphics-engine/adapters/geolimites/dxfTransport';
import { useGeoLimitesCorrectiveExecution } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCorrectiveExecution';
import { useGeoLimitesLotDetection } from '@/graphics-engine/adapters/geolimites/useGeoLimitesLotDetection';
import { useGeoLimitesSelectionSummary } from '@/graphics-engine/adapters/geolimites/useGeoLimitesSelectionSummary';
import { useGeoLimitesViewerIntegration } from '@/graphics-engine/adapters/geolimites/useGeoLimitesViewerIntegration';
import type { ViewerDXFHostAdapter } from '@/graphics-engine/components/viewer-dxf/hostAdapter';
import type { ViewerDXFProps } from '@/graphics-engine/components/viewer-dxf/types';

const GEO_LIMITES_VIEWER_DXF_HOST_ADAPTER: ViewerDXFHostAdapter = {
  dxfTextLoader: loadGeoLimitesDxfText,
  viewerTexts: GEO_LIMITES_CAD_EDITOR_TEXTS.viewer,
  viewerHeaderTexts: GEO_LIMITES_CAD_EDITOR_TEXTS.viewerHeader,
  viewerRendererMessages: GEO_LIMITES_CAD_EDITOR_TEXTS.viewerRenderer,
  useLotDetection: useGeoLimitesLotDetection,
  useCorrectiveExecution: useGeoLimitesCorrectiveExecution,
  useViewerIntegration: useGeoLimitesViewerIntegration,
  useSelectionSummary: useGeoLimitesSelectionSummary
};

const GeoLimitesViewerDXF: React.FC<ViewerDXFProps> = (props) => (
  <ViewerDXF
    {...props}
    hostAdapter={GEO_LIMITES_VIEWER_DXF_HOST_ADAPTER}
  />
);

export default GeoLimitesViewerDXF;
