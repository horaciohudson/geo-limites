import { useCallback, useMemo } from 'react';
import type { DxfTextLoader } from '@/graphics-engine/shared/contracts';
import type { DXFData } from '@/graphics-engine/shared/dxf';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { CorrectiveDraftOperation } from '@/graphics-engine/shared/viewer-corrective';
import type {
  ViewerCorrectiveHistoryStatusChangeHandler,
  ViewerCorrectiveLotInspectionChangeHandler,
  ViewerCorrectiveSnapshotChangedHandler
} from '@/graphics-engine/components/viewer-dxf/correctiveProps';
import type { ViewerHeaderPanelProps } from '@/graphics-engine/components/viewer-dxf/ViewerHeaderPanel';
import type { ViewerCanvasRendererMessages } from '@/graphics-engine/components/viewer-dxf/useViewerCanvasRenderer';
import type { ViewerCanvasInteractionsMessages } from '@/graphics-engine/components/viewer-dxf/useViewerCanvasInteractions';
import type {
  ConfirmedLotSelection,
  ConfirmedReferencePoint,
  HoverReferencePoint,
  SegmentConfrontationAnnotation,
  SelectedConfrontationText,
  ViewerGeoreferencingTransform
} from '@/graphics-engine/components/viewer-dxf/viewerState';
import type {
  ViewerPolygonConfirmedHandler,
  ViewerTechnicalSummaryHandler
} from '@/graphics-engine/components/viewer-dxf/viewerDocumentCallbacks';
import type { ViewerDXFProps } from '@/graphics-engine/components/viewer-dxf/types';

export interface ViewerRawSegment {
  id: string;
  p1: Point2D;
  p2: Point2D;
}

export interface ViewerCorrectiveInspectionEntry {
  lotNumber: number;
  polygonIndex: number;
  polygon: Point2D[] | null;
  centroid: Point2D | null;
  area: number | null;
  textsInside: string[];
  issueCount: number;
  severity: 'BLOQUEANTE' | 'AVISO' | null;
  detectionSource: 'direct' | 'face' | 'anchor';
  primaryIssueCode?: string | null;
  primaryIssueMessage?: string | null;
  vertexGapCandidates: Array<{
    distance: number;
    startIndex: number;
    endIndex: number;
    startPoint: Point2D;
    endPoint: Point2D;
  }>;
  segmentGapCandidates: Array<{
    distance: number;
    overlapRatio: number;
    parallelismScore: number;
    firstEdgeIndex: number;
    secondEdgeIndex: number;
    firstStart: Point2D;
    firstEnd: Point2D;
    secondStart: Point2D;
    secondEnd: Point2D;
  }>;
}

export interface ViewerDXFHostTexts extends ViewerCanvasInteractionsMessages {
  pointToPointPanel: {
    distanceLabel: string;
    distancePlaceholder: string;
    angleLabel: string;
    anglePlaceholder: string;
    keyboardHint: string;
  };
  buildTextPreviewLabel: (params: {
    textValue: string;
    defaultTextValue: string;
    height: number;
    rotation: number;
    alignment: string;
    verticalAlignment: string;
  }) => string;
  mirrorSelectOneNotice: string;
  mirrorSelectOnlyOneNotice: string;
  mirrorReadyNotice: string;
  joinSelectTwoNotice: string;
  buildJoinInvalidNotice: (params: { weldReason: string }) => string;
  joinReadyNotice: string;
  editNodesSelectNotice: string;
  editNodesUnsupportedNotice: string;
  editNodesDragNotice: string;
  buildEditNodesSnappedNotice: (params: { distance: number }) => string;
  buildEditNodesMovingNotice: (params: { distance: number }) => string;
}

export interface ViewerDXFHostAdapter {
  dxfTextLoader?: DxfTextLoader;
  viewerTexts?: ViewerDXFHostTexts;
  viewerHeaderTexts?: ViewerHeaderPanelProps['texts'];
  viewerRendererMessages?: ViewerCanvasRendererMessages;
  useLotDetection: (params: {
    dxfData: DXFData | null;
    manualBridgeSegments: Array<{ p1: Point2D; p2: Point2D }>;
  }) => {
    rawSegments: ViewerRawSegment[];
    detectedPolygons: Point2D[][];
    detectedPolygonEntries: Array<{
      polygon: Point2D[];
      lotNumber: number | null;
      textsInside: string[];
      lotAnchorPosition: Point2D | null;
      source: 'direct' | 'face';
      area: number;
      vertexCount: number;
    }>;
    extractionTolerance: number;
    segmentMedianLength: number;
  };
  useCorrectiveExecution: (params: {
    correctedPolygons: Point2D[][];
    setCorrectedPolygons: React.Dispatch<React.SetStateAction<Point2D[][]>>;
    setSelectedPolygons: React.Dispatch<React.SetStateAction<Point2D[][]>>;
    clearCorrectiveToolSelections: () => void;
    correctiveSnapshotFileId?: string;
    onRegisterCorrectiveDraftOperation?: (operation: CorrectiveDraftOperation) => void;
    restoredCorrectiveSnapshot?: ViewerDXFProps['restoredCorrectiveSnapshot'];
    correctiveHistoryCommand?: ViewerDXFProps['correctiveHistoryCommand'];
  }) => {
    correctiveHistoryRevision: number;
    canUndoCorrectiveChange: boolean;
    canRedoCorrectiveChange: boolean;
    resetCorrectiveHistory: (polygons: Point2D[][]) => void;
    applyJoinEndpointsCorrection: (params: {
      polygonIndex: number;
      firstIndex: number;
      secondIndex: number;
      lotNumber: number | null;
      operationId: string;
      label: string;
    }) => boolean;
    applyCloseGapGuidedCorrection: (params: {
      polygonIndex: number;
      firstIndex: number;
      secondIndex: number;
      lotNumber: number | null;
      operationId: string;
      label: string;
    }) => boolean;
    applyMoveVertexCorrection: (params: {
      polygonIndex: number;
      vertexIndex: number;
      targetPoint: Point2D;
      lotNumber: number | null;
      operationId: string;
      label: string;
    }) => boolean;
    applySuggestedCorrection: (params: {
      viewerMode: 'view' | 'correct';
      correctiveFocusLotNumber: number | null;
      correctiveFocusPolygon: Point2D[] | null;
      correctiveFocusPolygonIndex: number;
      focusedCorrectiveLotInspection: ViewerCorrectiveInspectionEntry | null;
      validPoints: Point2D[];
    }) => void;
  };
  useViewerIntegration: (params: {
    dxfData: DXFData | null;
    geometryVertices: Point2D[];
    correctedPolygons: Point2D[][];
    propertyLandmarks?: ViewerDXFProps['propertyLandmarks'];
    correctiveIssues?: ViewerDXFProps['correctiveIssues'];
    correctiveFocusLotNumber: number | null;
    recentlyCorrectedLotNumber: number | null;
    selectedCorrectiveVertex: { polygonIndex: number; vertexIndex: number } | null;
    viewerMode: 'view' | 'correct';
    canUndoCorrectiveChange: boolean;
    canRedoCorrectiveChange: boolean;
    correctiveHistoryRevision: number;
    correctiveSnapshotFileId?: string;
    onCorrectiveSnapshotChanged?: ViewerCorrectiveSnapshotChangedHandler;
    onCorrectiveHistoryStatusChange?: ViewerCorrectiveHistoryStatusChangeHandler;
    onCorrectiveLotInspectionChange?: ViewerCorrectiveLotInspectionChangeHandler;
  }) => {
    matchedReferencePoints: HoverReferencePoint[];
    georeferencingTransform: ViewerGeoreferencingTransform | null;
    confirmedReferencePoints: ConfirmedReferencePoint[];
    technicalSummarySnapshot: DXFData | null;
    correctiveFocusPolygon: Point2D[] | null;
    correctiveFocusPolygonIndex: number;
    recentlyCorrectedPolygon: Point2D[] | null;
    recentlyCorrectedPolygonCentroid: Point2D | null;
    correctiveLotInspectionEntries: ViewerCorrectiveInspectionEntry[];
    focusedCorrectiveLotInspection: ViewerCorrectiveInspectionEntry | null;
    selectedCorrectiveVertexPoint: Point2D | null;
  };
  useSelectionSummary: (params: {
    selectedPolygons: Point2D[][];
    dxfData: DXFData | null;
    selectedConfrontationTexts: SelectedConfrontationText[];
    segmentAnnotations: SegmentConfrontationAnnotation[];
    confirmedReferencePoints: ConfirmedReferencePoint[];
    technicalSummarySnapshot: DXFData | null;
    onPolygonConfirmed?: ViewerPolygonConfirmedHandler;
    onGenerateTechnicalSummary?: ViewerTechnicalSummaryHandler;
  }) => {
    confirmedSelections: ConfirmedLotSelection[];
    handleGenerateSummary: () => void;
    handleConfirmPolygonSelection: () => void;
  };
}

export const DEFAULT_VIEWER_TEXTS: ViewerDXFHostTexts = {
  selectSegmentsBeforeCheckNotice: 'Selecione um ou mais segmentos antes de verificar.',
  buildContourClosedNotice: ({ segmentCount }) => `Contorno fechado (${segmentCount} segmento(s)).`,
  buildContourOpenNotice: ({ openNodeCount, closestGapDistance }) => `Contorno aberto (${openNodeCount} ponta(s) solta(s)).${closestGapDistance !== null ? ` Gap ~${closestGapDistance.toFixed(3)}` : ''}`,
  invalidContourNotice: 'Contorno invalido.',
  selectSegmentsBeforeCloseNotice: 'Selecione segmentos do contorno antes de fechar.',
  alreadyClosedNotice: 'Ja esta fechado.',
  buildAutoCloseFailureNotice: ({ openNodeCount }) => `Nao foi possivel fechar automaticamente (pontas soltas: ${openNodeCount}).`,
  buildBridgeCreatedNotice: ({ distance }) => `Ponte criada para fechar (distancia ${distance.toFixed(3)}).`,
  cancelEmbeddedDrawingNotice: 'Rascunho de desenho cancelado.',
  buildPointToPointCreatedNotice: ({ isClosed, vertexCount, layerName }) => `${isClosed ? 'Contorno fechado' : 'Polilinha'} criado com ${vertexCount} vertices na camada ${layerName}.`,
  pointToPointClosedAtFirstVertexNotice: 'Contorno fechado ao retornar ao primeiro vertice.',
  buildPointCreatedNotice: ({ point }) => `Ponto criado em X ${point.x.toFixed(3)} / Y ${point.y.toFixed(3)}.`,
  defaultTextValue: 'Texto',
  buildTextInsertedNotice: ({ layerName, height, rotation, alignment, verticalAlignment }) => `Texto inserido na camada ${layerName} com altura ${height.toFixed(2)}, rotacao ${rotation.toFixed(1)}°, alinhamento ${alignment} e ancoragem ${verticalAlignment}.`,
  buildDistanceCreatedNotice: ({ distance, layerName }) => `Cota criada: ${distance.toFixed(3)} na camada ${layerName}.`,
  buildLineCreatedNotice: ({ layerName }) => `Linha criada na camada ${layerName}.`,
  buildCircleCreatedNotice: ({ layerName }) => `Circulo criado na camada ${layerName}.`,
  buildRectangleCreatedNotice: ({ layerName }) => `Retangulo criado na camada ${layerName}.`,
  buildBezierCreatedNotice: ({ layerName }) => `Curva Bezier criada na camada ${layerName}.`,
  defaultAnnotationLayerName: 'COTAS',
  defaultTextAnnotationLayerName: 'TEXTOS',
  pointToPointPanel: {
    distanceLabel: 'Distancia',
    distancePlaceholder: '0.000',
    angleLabel: 'Angulo',
    anglePlaceholder: '0.0',
    keyboardHint: 'Tab alterna | D distancia | A angulo'
  },
  buildTextPreviewLabel: ({
    textValue,
    defaultTextValue,
    height,
    rotation,
    alignment,
    verticalAlignment
  }) => `Texto em curso: ${textValue.trim() || defaultTextValue} | h=${height.toFixed(2)} | rot=${rotation.toFixed(1)}° | alin=${alignment} | anc=${verticalAlignment}`,
  mirrorSelectOneNotice: 'Espelhar: selecione uma entidade.',
  mirrorSelectOnlyOneNotice: 'Espelhar: selecione apenas uma entidade.',
  mirrorReadyNotice: 'Espelhar: preview ativo no eixo central | Clique/Enter aplica',
  joinSelectTwoNotice: 'Weld: selecione ao menos duas entidades.',
  buildJoinInvalidNotice: ({ weldReason }) => `Weld: ${weldReason || 'ajuste a selecao para aplicar.'}`,
  joinReadyNotice: 'Weld: preview ativo | Clique/Enter aplica',
  editNodesSelectNotice: 'Editar nos: selecione uma entidade.',
  editNodesUnsupportedNotice: 'Editar nos: a selecao atual nao expoe nos editaveis.',
  editNodesDragNotice: 'Editar nos: arraste uma garra para mover o vertice.',
  buildEditNodesSnappedNotice: ({ distance }) => `Editar nos: snap ativo | dist ${distance.toFixed(3)} | solte para aplicar`,
  buildEditNodesMovingNotice: ({ distance }) => `Editar nos: dist ${distance.toFixed(3)} | solte para aplicar`
};

export const DEFAULT_DXF_TEXT_LOADER: DxfTextLoader = async () => {
  throw new Error('Nenhum carregador DXF configurado para o ViewerDXF.');
};

const useDefaultViewerLotDetection: ViewerDXFHostAdapter['useLotDetection'] = ({
  manualBridgeSegments
}) => ({
  rawSegments: manualBridgeSegments.map((segment, index) => ({
    id: `bridge-${index}`,
    p1: segment.p1,
    p2: segment.p2
  })),
  detectedPolygons: [],
  detectedPolygonEntries: [],
  extractionTolerance: 0.01,
  segmentMedianLength: 0
});

const useDefaultViewerCorrectiveExecution: ViewerDXFHostAdapter['useCorrectiveExecution'] = () => ({
  correctiveHistoryRevision: 0,
  canUndoCorrectiveChange: false,
  canRedoCorrectiveChange: false,
  resetCorrectiveHistory: () => {},
  applyJoinEndpointsCorrection: () => false,
  applyCloseGapGuidedCorrection: () => false,
  applyMoveVertexCorrection: () => false,
  applySuggestedCorrection: () => {}
});

const useDefaultViewerIntegration: ViewerDXFHostAdapter['useViewerIntegration'] = ({
  dxfData
}) => ({
  matchedReferencePoints: [],
  georeferencingTransform: null,
  confirmedReferencePoints: [],
  technicalSummarySnapshot: dxfData,
  correctiveFocusPolygon: null,
  correctiveFocusPolygonIndex: -1,
  recentlyCorrectedPolygon: null,
  recentlyCorrectedPolygonCentroid: null,
  correctiveLotInspectionEntries: [],
  focusedCorrectiveLotInspection: null,
  selectedCorrectiveVertexPoint: null
});

const useDefaultViewerSelectionSummary: ViewerDXFHostAdapter['useSelectionSummary'] = ({
  confirmedReferencePoints,
  onGenerateTechnicalSummary,
  onPolygonConfirmed,
  technicalSummarySnapshot
}) => {
  const confirmedSelections = useMemo<ConfirmedLotSelection[]>(() => [], []);
  const handleGenerateSummary = useCallback(() => {
    if (technicalSummarySnapshot && onGenerateTechnicalSummary) {
      onGenerateTechnicalSummary({
        viewerData: technicalSummarySnapshot,
        referencePoints: confirmedReferencePoints
      });
    }
  }, [confirmedReferencePoints, onGenerateTechnicalSummary, technicalSummarySnapshot]);
  const handleConfirmPolygonSelection = useCallback(() => {
    onPolygonConfirmed?.({
      selections: confirmedSelections,
      referencePoints: confirmedReferencePoints
    });
  }, [confirmedReferencePoints, confirmedSelections, onPolygonConfirmed]);

  return {
    confirmedSelections,
    handleGenerateSummary,
    handleConfirmPolygonSelection
  };
};

export const DEFAULT_VIEWER_DXF_HOST_ADAPTER: ViewerDXFHostAdapter = {
  dxfTextLoader: DEFAULT_DXF_TEXT_LOADER,
  viewerTexts: DEFAULT_VIEWER_TEXTS,
  useLotDetection: useDefaultViewerLotDetection,
  useCorrectiveExecution: useDefaultViewerCorrectiveExecution,
  useViewerIntegration: useDefaultViewerIntegration,
  useSelectionSummary: useDefaultViewerSelectionSummary
};
