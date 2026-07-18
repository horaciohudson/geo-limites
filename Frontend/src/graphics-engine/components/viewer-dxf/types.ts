import type { DxfTextLoader } from '@/graphics-engine/shared/contracts';
import type { DXFData } from '@/graphics-engine/shared/dxf';
import type {
  ViewerDXFCorrectiveProps
} from '@/graphics-engine/components/viewer-dxf/correctiveProps';
import type {
  DrawingTextAlignment,
  DrawingTextVerticalAlignment,
  EmbeddedCadToolMode,
  ViewerEntitiesDrawnPayload,
  ViewerOverlayPoint,
  ViewerOverlaySegment,
  ViewerSnapGuide,
  ViewerTextPlacementRequest,
  ViewerViewportCommand,
  ViewerViewportState
} from '@/graphics-engine/components/viewer-dxf/viewerContracts';
import type {
  ViewerEntityCopyHandler,
  ViewerEntityEditNodeHandler,
  ViewerEntityExtendHandler,
  ViewerEntityOffsetHandler,
  ViewerEntityTransformHandler,
  ViewerEntityTranslateHandler,
  ViewerEntityTrimHandler
} from '@/graphics-engine/components/viewer-dxf/viewerEntityCallbacks';
import type {
  ViewerConfrontationSelectionChangeHandler,
  ViewerReferencePointsChangeHandler,
  ViewerPolygonConfirmedHandler,
  ViewerSelectionSummaryChangeHandler,
  ViewerTechnicalSummaryHandler
} from '@/graphics-engine/components/viewer-dxf/viewerDocumentCallbacks';
import type {
  ViewerEntitySelectionChange
} from '@/graphics-engine/components/viewer-dxf/viewerState';

export type {
  ConfirmedConfrontationText,
  ConfirmedLotSelection,
  ConfirmedReferencePoint,
  HoverConfrontationText,
  HoverReferencePoint,
  SegmentConfrontationAnnotation,
  SelectedConfrontationText,
  ViewerEntitySelectionChange,
  ViewerGeoreferencingTransform,
  ViewerSelectedEntityInfo
} from '@/graphics-engine/components/viewer-dxf/viewerState';
export type {
  DrawingBounds,
  DrawingTextAlignment,
  DrawingTextVerticalAlignment,
  EmbeddedCadToolMode,
  ViewerEntitiesDrawnPayload,
  ViewerOverlayPoint,
  ViewerOverlaySegment,
  ViewerSnapGuide,
  ViewerTextPlacementRequest,
  ViewerViewportCommand,
  ViewerViewportState
} from '@/graphics-engine/components/viewer-dxf/viewerContracts';
export type {
  ViewerEntityCopyHandler,
  ViewerEntityCopyHandler as ViewerEntityCopyCallback,
  ViewerEntityEditNodeHandler,
  ViewerEntityExtendHandler,
  ViewerEntityMovePayload,
  ViewerEntityOffsetHandler,
  ViewerEntityOffsetPayload,
  ViewerEntityEditNodePayload,
  ViewerEntityExtendPayload,
  ViewerEntityTransformHandler,
  ViewerEntityTransformPayload,
  ViewerEntityTranslateHandler,
  ViewerEntityTrimHandler,
  ViewerEntityTrimPayload
} from '@/graphics-engine/components/viewer-dxf/viewerEntityCallbacks';
export type {
  ViewerConfrontationSelectionChangeHandler,
  ViewerConfrontationSelectionChangePayload,
  ViewerReferencePointsChangeHandler,
  ViewerReferencePointsChangePayload,
  ViewerPolygonConfirmedHandler,
  ViewerPolygonConfirmedPayload,
  ViewerSelectionSummaryChangeHandler,
  ViewerSelectionSummaryChangePayload,
  ViewerTechnicalSummaryHandler,
  ViewerTechnicalSummaryPayload
} from '@/graphics-engine/components/viewer-dxf/viewerDocumentCallbacks';
export type { DXFEntityProperties, DXFVertex } from '@/graphics-engine/shared/dxf';

export interface ViewerDXFProps extends ViewerDXFCorrectiveProps {
  fileId?: string;
  dxfTextLoader?: DxfTextLoader;
  data?: DXFData;
  boundsData?: DXFData;
  className?: string;
  embeddedMode?: boolean;
  embeddedToolMode?: EmbeddedCadToolMode;
  activeToolId?: string;
  drawingTextValue?: string;
  drawingTextHeight?: number;
  drawingTextRotation?: number;
  drawingTextAlignment?: DrawingTextAlignment;
  drawingTextVerticalAlignment?: DrawingTextVerticalAlignment;
  closePointToPointShape?: boolean;
  annotationLayerName?: string;
  textAnnotationLayerName?: string;
  textUsesAnnotationLayer?: boolean;
  showGrid?: boolean;
  showHoverCoordinates?: boolean;
  enableObjectSnap?: boolean;
  enableGridSnap?: boolean;
  gridSnapSize?: number;
  gridMajorStep?: number;
  minimumWorkspaceSize?: number;
  viewportCommand?: ViewerViewportCommand;
  onViewportStateChange?: (viewport: ViewerViewportState) => void;
  onEntitySelectionChange?: (selection: ViewerEntitySelectionChange) => void;
  onEntityTranslate?: ViewerEntityTranslateHandler;
  onEntityCopy?: ViewerEntityCopyHandler;
  onEntityOffset?: ViewerEntityOffsetHandler;
  onEntityExtend?: ViewerEntityExtendHandler;
  onEntityTrim?: ViewerEntityTrimHandler;
  onEntityMirror?: () => void;
  onEntityWeld?: () => void;
  weldCanApply?: boolean;
  weldReason?: string;
  onEntityEditNode?: ViewerEntityEditNodeHandler;
  onEntityTransform?: ViewerEntityTransformHandler;
  onDXFDataLoaded?: (data: DXFData) => void;
  onInitialCanvasRendered?: () => void;
  interactive?: boolean;
  activeLayerName?: string;
  selectedEntityIdsOverride?: string[];
  clearConfrontationSelectionNonce?: number;
  overlaySegments?: ViewerOverlaySegment[];
  overlayPoints?: ViewerOverlayPoint[];
  snapGuides?: ViewerSnapGuide[];
  onEntitiesDrawn?: (payload: ViewerEntitiesDrawnPayload) => void;
  onTextPlacementRequest?: (payload: ViewerTextPlacementRequest) => void;
  onConfrontationSelectionChange?: ViewerConfrontationSelectionChangeHandler;
  onReferencePointsChange?: ViewerReferencePointsChangeHandler;
  onPolygonConfirmed?: ViewerPolygonConfirmedHandler;
  onSelectionSummaryChange?: ViewerSelectionSummaryChangeHandler;
  onGenerateTechnicalSummary?: ViewerTechnicalSummaryHandler;
  isGeneratingTechnicalSummary?: boolean;
  primaryBoundaryReady?: boolean;
  allowLotSelectionWithoutPrimaryBoundary?: boolean;
  showDetectedPolygonMeasurements?: boolean;
}
