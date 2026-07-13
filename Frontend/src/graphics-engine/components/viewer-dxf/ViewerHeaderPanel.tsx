import React from 'react';
import type { HoverReferencePoint } from '@/graphics-engine/components/viewer-dxf/viewerState';
import type { Point2D } from '@/graphics-engine/shared/geometry';

export interface ViewerHeaderPanelProps {
  activeConfrontationTextLabel: string | null;
  activeCorrectiveTool: 'inspect' | 'move-vertex' | 'join-endpoints' | 'close-gap-guided';
  canClearSelection: boolean;
  dxfEntityCount: number;
  interactive?: boolean;
  isGeneratingTechnicalSummary?: boolean;
  manualPolygonPoints: number;
  pendingConfrontationPoints: number;
  segmentAnnotationCount: number;
  segmentInspectorMessage: string;
  selectedConfrontationTextCount: number;
  selectedPolygonCount: number;
  selectedSegmentCount: number;
  technicalSummaryReady: boolean;
  viewerMode: 'view' | 'correct';
  hoverPoint: Point2D | null;
  hoverPointIsDetectedVertex?: boolean;
  hoverReferencePoint: HoverReferencePoint | null;
  zoom: number;
  texts?: {
    buildCorrectiveToolLabel: (tool: ViewerHeaderPanelProps['activeCorrectiveTool']) => { color: string; label: string } | null;
    validEntitiesLabel: string;
    correctiveModeLabel: string;
    toolLabel: string;
    massLotsTitle: string;
    massLotsLine1: string;
    massLotsLine2: string;
    massLotsLine3: string;
    massLotsLine4: string;
    readyLotsLabel: string;
    confrontationTextsLabel: string;
    annotatedSegmentsLabel: string;
    activeRouteLabel: string;
    pendingSegmentLabel: string;
    pendingSegmentSuffix: string;
    manualTracingLabel: string;
    manualTracingSuffix: string;
    selectedSegmentsLabel: string;
    clearSelectionButton: string;
    technicalSummaryButton: string;
    technicalSummariesButton: string;
    centerDrawingTitle: string;
    centerDrawingButton: string;
    zoomInTitle: string;
    zoomOutTitle: string;
    resetViewTitle: string;
    resetViewButton: string;
    buildZoomLabel: (params: { zoom: number }) => string;
    autoFitHint: string;
  };
  onCenterDrawing: () => void;
  onClearSelection: () => void;
  onConfirmPolygons: () => void;
  onGenerateTechnicalSummary: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const getCorrectiveToolLabel = (tool: ViewerHeaderPanelProps['activeCorrectiveTool']) => {
  if (tool === 'move-vertex') {
    return { color: '#6d28d9', label: 'mover vertice' };
  }

  if (tool === 'join-endpoints') {
    return { color: '#b45309', label: 'unir pontas' };
  }

  if (tool === 'close-gap-guided') {
    return { color: '#0f766e', label: 'fechar lacuna' };
  }

  return null;
};

const DEFAULT_VIEWER_HEADER_TEXTS: NonNullable<ViewerHeaderPanelProps['texts']> = {
  buildCorrectiveToolLabel: getCorrectiveToolLabel,
  validEntitiesLabel: 'Entidades válidas:',
  correctiveModeLabel: 'Modo corretivo ativo',
  toolLabel: 'Ferramenta:',
  massLotsTitle: 'Modo de Lotes em Massa:',
  massLotsLine1: 'Todos os lotes detectados são pré-selecionados (azul).',
  massLotsLine2: 'Use Ctrl + Clique num lote para adicionar/remover ele da seleção.',
  massLotsLine3: 'Use Shift + Clique em um texto para ativar a via e depois Ctrl + Shift + Clique em dois pontos/snap para marcar o trecho da confrontação.',
  massLotsLine4: 'Para traçar manualmente, faça Ctrl + Clique nos vértices e clique no primeiro vértice para fechar e adicionar o lote.',
  readyLotsLabel: 'Lotes Prontos para Gerar:',
  confrontationTextsLabel: 'Textos de Confrontação:',
  annotatedSegmentsLabel: 'Trechos Anotados:',
  activeRouteLabel: 'Via ativa:',
  pendingSegmentLabel: 'Marcando trecho:',
  pendingSegmentSuffix: '/2 pontos',
  manualTracingLabel: 'Traçando manual:',
  manualTracingSuffix: 'pontos',
  selectedSegmentsLabel: 'Segmentos:',
  clearSelectionButton: 'Limpar Seleção',
  technicalSummaryButton: 'Resumo Técnico',
  technicalSummariesButton: 'Gerar Memoriais',
  centerDrawingTitle: 'Centralizar desenho no canvas',
  centerDrawingButton: 'Centralizar',
  zoomInTitle: 'Aumentar zoom',
  zoomOutTitle: 'Diminuir zoom',
  resetViewTitle: 'Resetar pan e zoom',
  resetViewButton: 'Resetar',
  buildZoomLabel: ({ zoom }) => `Zoom: ${zoom.toFixed(2)}x`,
  autoFitHint: 'Desenho ajustado automaticamente ao canvas'
};

const formatCoordinateValue = (value: number | null | undefined): string => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '--'
);

export const ViewerHeaderPanel: React.FC<ViewerHeaderPanelProps> = ({
  activeConfrontationTextLabel,
  activeCorrectiveTool,
  canClearSelection,
  dxfEntityCount,
  interactive,
  isGeneratingTechnicalSummary,
  manualPolygonPoints,
  pendingConfrontationPoints,
  segmentAnnotationCount,
  segmentInspectorMessage,
  selectedConfrontationTextCount,
  selectedPolygonCount,
  selectedSegmentCount,
  technicalSummaryReady,
  viewerMode,
  hoverPoint,
  hoverPointIsDetectedVertex = false,
  hoverReferencePoint,
  zoom,
  texts,
  onCenterDrawing,
  onClearSelection,
  onConfirmPolygons,
  onGenerateTechnicalSummary,
  onResetView,
  onZoomIn,
  onZoomOut
}) => {
  const resolvedTexts = texts ?? DEFAULT_VIEWER_HEADER_TEXTS;
  const correctiveToolLabel = viewerMode === 'correct'
    ? resolvedTexts.buildCorrectiveToolLabel(activeCorrectiveTool)
    : null;
  const coordinateCardPoint = hoverReferencePoint ?? hoverPoint;

  return (
    <div style={{ padding: '10px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
      <div>
        <span style={{ marginLeft: '10px' }}>{resolvedTexts.validEntitiesLabel} {dxfEntityCount}</span>
        {viewerMode === 'correct' && (
          <span style={{ marginLeft: '10px', color: '#b91c1c', fontWeight: 700 }}>
            | {resolvedTexts.correctiveModeLabel}
          </span>
        )}
        {correctiveToolLabel && (
          <span style={{ marginLeft: '10px', color: correctiveToolLabel.color, fontWeight: 700 }}>
            | {resolvedTexts.toolLabel} {correctiveToolLabel.label}
          </span>
        )}
      </div>

      {interactive && (
        <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '8px', flexBasis: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px' }}>
            <strong>{resolvedTexts.massLotsTitle}</strong> {resolvedTexts.massLotsLine1}<br />
            {resolvedTexts.massLotsLine2}<br />
            {resolvedTexts.massLotsLine3}<br />
            {resolvedTexts.massLotsLine4}
            <br />
            <span style={{ color: '#007bff', fontWeight: 'bold', marginTop: '5px', display: 'inline-block' }}>
              {resolvedTexts.readyLotsLabel} {selectedPolygonCount}
            </span>
            {selectedConfrontationTextCount > 0 && (
              <span style={{ color: '#d63384', fontWeight: 'bold', marginLeft: '10px' }}>
                | {resolvedTexts.confrontationTextsLabel} {selectedConfrontationTextCount}
              </span>
            )}
            {segmentAnnotationCount > 0 && (
              <span style={{ color: '#7b1fa2', fontWeight: 'bold', marginLeft: '10px' }}>
                | {resolvedTexts.annotatedSegmentsLabel} {segmentAnnotationCount}
              </span>
            )}
            {activeConfrontationTextLabel && (
              <span style={{ color: '#7b1fa2', marginLeft: '10px' }}>
                | {resolvedTexts.activeRouteLabel} {activeConfrontationTextLabel}
              </span>
            )}
            {pendingConfrontationPoints > 0 && (
              <span style={{ color: '#9c27b0', marginLeft: '10px' }}>
                | {resolvedTexts.pendingSegmentLabel} {pendingConfrontationPoints}{resolvedTexts.pendingSegmentSuffix}
              </span>
            )}
            {manualPolygonPoints > 0 && (
              <span style={{ color: '#ffc107', marginLeft: '10px' }}>
                | {resolvedTexts.manualTracingLabel} {manualPolygonPoints} {resolvedTexts.manualTracingSuffix}
              </span>
            )}
            {selectedSegmentCount > 0 && (
              <span style={{ color: '#0f766e', fontWeight: 'bold', marginLeft: '10px' }}>
                | {resolvedTexts.selectedSegmentsLabel} {selectedSegmentCount}
              </span>
            )}
            {segmentInspectorMessage && (
              <span style={{ color: '#0f172a', fontWeight: 700, marginLeft: '10px' }}>
                | {segmentInspectorMessage}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClearSelection}
              style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              disabled={!canClearSelection}
            >
              {resolvedTexts.clearSelectionButton}
            </button>
            <button
              onClick={onGenerateTechnicalSummary}
              style={{ padding: '6px 12px', background: '#0f766e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              disabled={!technicalSummaryReady || isGeneratingTechnicalSummary}
            >
              {resolvedTexts.technicalSummaryButton}
            </button>
            <button
              onClick={onConfirmPolygons}
              style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              disabled={selectedPolygonCount === 0}
            >
              {resolvedTexts.technicalSummariesButton}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {coordinateCardPoint && (
          <div
            style={{
              padding: '5px 10px',
              background: hoverReferencePoint ? '#eef6ff' : (hoverPointIsDetectedVertex ? '#ecfdf5' : '#f8fafc'),
              border: `1px solid ${hoverReferencePoint ? '#bfdbfe' : (hoverPointIsDetectedVertex ? '#86efac' : '#dbe4ee')}`,
              borderRadius: '4px',
              fontSize: '12px',
              lineHeight: 1.35,
              minWidth: '250px'
            }}
          >
            <strong style={{ display: 'block', color: '#0f172a' }}>
              {hoverReferencePoint ? `Ponto ${hoverReferencePoint.label}` : (hoverPointIsDetectedVertex ? 'Vertice de segmento' : 'Cursor')}
            </strong>
            <span style={{ display: 'block', color: '#334155' }}>
              X {formatCoordinateValue(hoverReferencePoint?.originalX ?? coordinateCardPoint.x)}
              {' '}| Y {formatCoordinateValue(hoverReferencePoint?.originalY ?? coordinateCardPoint.y)}
            </span>
            {hoverReferencePoint && (
              <span style={{ display: 'block', color: '#1d4ed8' }}>
                E {formatCoordinateValue(hoverReferencePoint.georeferencedX)}
                {' '}| N {formatCoordinateValue(hoverReferencePoint.georeferencedY)}
              </span>
            )}
          </div>
        )}
        <button
          onClick={onCenterDrawing}
          style={{ padding: '5px 12px', cursor: 'pointer', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
          title={resolvedTexts.centerDrawingTitle}
        >
          🎯 {resolvedTexts.centerDrawingButton}
        </button>
        <button
          onClick={onZoomIn}
          style={{ padding: '5px 10px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          title={resolvedTexts.zoomInTitle}
        >
          🔍+
        </button>
        <button
          onClick={onZoomOut}
          style={{ padding: '5px 10px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          title={resolvedTexts.zoomOutTitle}
        >
          🔍-
        </button>
        <button
          onClick={onResetView}
          style={{ padding: '5px 10px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
          title={resolvedTexts.resetViewTitle}
        >
          🔄 {resolvedTexts.resetViewButton}
        </button>
        <span style={{ padding: '5px 10px', background: '#e9ecef', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
          {resolvedTexts.buildZoomLabel({ zoom })}
        </span>
        <span style={{ padding: '5px 10px', background: '#fff3cd', borderRadius: '4px', fontSize: '11px' }}>
          💡 {resolvedTexts.autoFitHint}
        </span>
      </div>
    </div>
  );
};
