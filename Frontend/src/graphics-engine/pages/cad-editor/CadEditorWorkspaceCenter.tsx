import type React from 'react';
import { CAD_EDITOR_RULER_THICKNESS, getRulerTickStartRatio, getRulerTickStroke, type CadRulerTick } from '@/graphics-engine/pages/cad-editor/cadEditorRulerUtils';

const HORIZONTAL_RULER_LABEL_Y = 3;
const VERTICAL_RULER_LABEL_OFFSET_Y = 8;
const HORIZONTAL_RULER_LABEL_X_OFFSET = 10;

type RulerGuideMarker = {
  id: string;
  screen: number;
  isPreview: boolean;
  isSelected: boolean;
};

type HoveredGuideState = {
  orientation: 'vertical' | 'horizontal';
  locked: boolean;
} | null;

interface CadEditorWorkspaceCenterProps {
  canvasAreaRef: React.RefObject<HTMLDivElement>;
  canvasAreaSize: { width: number; height: number };
  horizontalRulerTicks: CadRulerTick[];
  verticalRulerTicks: CadRulerTick[];
  horizontalRulerZeroScreen: number;
  verticalRulerZeroScreen: number;
  horizontalRulerGuideMarkers: RulerGuideMarker[];
  verticalRulerGuideMarkers: RulerGuideMarker[];
  embeddedToolMode: string;
  hoveredGuide: HoveredGuideState;
  onRulerCornerMouseDown: React.MouseEventHandler<HTMLButtonElement>;
  onResetRulerOrigin: React.MouseEventHandler<HTMLButtonElement>;
  onHorizontalRulerMouseDown: React.MouseEventHandler<HTMLDivElement>;
  onVerticalRulerMouseDown: React.MouseEventHandler<HTMLDivElement>;
  onCanvasAreaMouseDownCapture: React.MouseEventHandler<HTMLDivElement>;
  onCanvasAreaContextMenuCapture: React.MouseEventHandler<HTMLDivElement>;
  onCanvasAreaDoubleClickCapture: React.MouseEventHandler<HTMLDivElement>;
  onCanvasAreaClickCapture: React.MouseEventHandler<HTMLDivElement>;
  onCanvasAreaMouseMoveCapture: React.MouseEventHandler<HTMLDivElement>;
  onCanvasAreaMouseLeave: React.MouseEventHandler<HTMLDivElement>;
  children: React.ReactNode;
}

export const CadEditorWorkspaceCenter: React.FC<CadEditorWorkspaceCenterProps> = ({
  canvasAreaRef,
  canvasAreaSize,
  horizontalRulerTicks,
  verticalRulerTicks,
  horizontalRulerZeroScreen,
  verticalRulerZeroScreen,
  horizontalRulerGuideMarkers,
  verticalRulerGuideMarkers,
  embeddedToolMode,
  hoveredGuide,
  onRulerCornerMouseDown,
  onResetRulerOrigin,
  onHorizontalRulerMouseDown,
  onVerticalRulerMouseDown,
  onCanvasAreaMouseDownCapture,
  onCanvasAreaContextMenuCapture,
  onCanvasAreaDoubleClickCapture,
  onCanvasAreaClickCapture,
  onCanvasAreaMouseMoveCapture,
  onCanvasAreaMouseLeave,
  children
}) => (
  <div className="cad-editor-center">
    <div className="cad-editor-ruler-row">
      <button
        type="button"
        className="cad-editor-ruler-corner"
        onMouseDown={onRulerCornerMouseDown}
        onDoubleClick={onResetRulerOrigin}
        title="Arraste o canto para reposicionar o zero das duas reguas. Duplo clique restaura."
        aria-label="Origem das reguas"
      />
      <div
        className="cad-editor-ruler-top"
        onMouseDown={onHorizontalRulerMouseDown}
        title="Clique e arraste para criar uma guia horizontal."
      >
        <svg
          aria-hidden="true"
          width="100%"
          height="100%"
          viewBox={`0 0 ${Math.max(canvasAreaSize.width, 1)} ${CAD_EDITOR_RULER_THICKNESS}`}
          preserveAspectRatio="none"
          style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <rect width={Math.max(canvasAreaSize.width, 1)} height={CAD_EDITOR_RULER_THICKNESS} fill="rgb(246 246 246)" />
          <line
            x1="0"
            y1={CAD_EDITOR_RULER_THICKNESS - 0.5}
            x2={Math.max(canvasAreaSize.width, 1)}
            y2={CAD_EDITOR_RULER_THICKNESS - 0.5}
            stroke="rgb(180 180 180)"
            strokeWidth="1"
          />
          {horizontalRulerTicks.map((tick) => {
            const y1 = CAD_EDITOR_RULER_THICKNESS * getRulerTickStartRatio(tick.level);
            const stroke = getRulerTickStroke(tick.level);
            return (
              <g key={tick.key}>
                <line
                  x1={tick.screen}
                  y1={y1}
                  x2={tick.screen}
                  y2={CAD_EDITOR_RULER_THICKNESS}
                  stroke={stroke}
                  strokeWidth={tick.level === 'origin' ? 1.2 : 1}
                />
                {tick.label ? (
                  <text
                    x={tick.screen + HORIZONTAL_RULER_LABEL_X_OFFSET}
                    y={HORIZONTAL_RULER_LABEL_Y}
                    fill="rgb(60 60 60)"
                    fontSize="10"
                    fontFamily="Segoe UI, Arial, sans-serif"
                    dominantBaseline="hanging"
                  >
                    {tick.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {horizontalRulerZeroScreen >= 0 && horizontalRulerZeroScreen <= canvasAreaSize.width ? (
            <line
              x1={horizontalRulerZeroScreen}
              y1="0"
              x2={horizontalRulerZeroScreen}
              y2={CAD_EDITOR_RULER_THICKNESS}
              stroke="rgb(210 60 60)"
              strokeWidth="1.4"
            />
          ) : null}
          {horizontalRulerGuideMarkers.map((guide) => (
            <line
              key={guide.id}
              x1={guide.screen}
              y1="0"
              x2={guide.screen}
              y2={CAD_EDITOR_RULER_THICKNESS}
              stroke={guide.isPreview ? '#000000' : guide.isSelected ? '#020202' : '#222222'}
              strokeWidth={guide.isSelected ? '1.6' : '1'}
            />
          ))}
        </svg>
      </div>
    </div>

    <div className="cad-editor-center-body">
      <div
        className="cad-editor-ruler-side"
        onMouseDown={onVerticalRulerMouseDown}
        title="Clique e arraste para criar uma guia vertical."
      >
        <svg
          aria-hidden="true"
          width="100%"
          height="100%"
          viewBox={`0 0 ${CAD_EDITOR_RULER_THICKNESS} ${Math.max(canvasAreaSize.height, 1)}`}
          preserveAspectRatio="none"
          style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <rect width={CAD_EDITOR_RULER_THICKNESS} height={Math.max(canvasAreaSize.height, 1)} fill="rgb(246 246 246)" />
          <line
            x1={CAD_EDITOR_RULER_THICKNESS - 0.5}
            y1="0"
            x2={CAD_EDITOR_RULER_THICKNESS - 0.5}
            y2={Math.max(canvasAreaSize.height, 1)}
            stroke="rgb(180 180 180)"
            strokeWidth="1"
          />
          {verticalRulerTicks.map((tick) => {
            const x1 = CAD_EDITOR_RULER_THICKNESS * getRulerTickStartRatio(tick.level);
            const stroke = getRulerTickStroke(tick.level);
            return (
              <g key={tick.key}>
                <line
                  x1={x1}
                  y1={tick.screen}
                  x2={CAD_EDITOR_RULER_THICKNESS}
                  y2={tick.screen}
                  stroke={stroke}
                  strokeWidth={tick.level === 'origin' ? 1.2 : 1}
                />
                {tick.label ? (
                  <text
                    x={2}
                    y={tick.screen - VERTICAL_RULER_LABEL_OFFSET_Y}
                    fill="rgb(60 60 60)"
                    fontSize="10"
                    fontFamily="Segoe UI, Arial, sans-serif"
                  >
                    {tick.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {verticalRulerZeroScreen >= 0 && verticalRulerZeroScreen <= canvasAreaSize.height ? (
            <line
              x1="0"
              y1={verticalRulerZeroScreen}
              x2={CAD_EDITOR_RULER_THICKNESS}
              y2={verticalRulerZeroScreen}
              stroke="rgb(210 60 60)"
              strokeWidth="1.4"
            />
          ) : null}
          {verticalRulerGuideMarkers.map((guide) => (
            <line
              key={guide.id}
              x1="0"
              y1={guide.screen}
              x2={CAD_EDITOR_RULER_THICKNESS}
              y2={guide.screen}
              stroke={guide.isPreview ? '#000000' : guide.isSelected ? '#020202' : '#222222'}
              strokeWidth={guide.isSelected ? '1.6' : '1'}
            />
          ))}
        </svg>
      </div>

      <div
        ref={canvasAreaRef}
        className="cad-editor-canvas-area"
        onMouseDownCapture={onCanvasAreaMouseDownCapture}
        onContextMenuCapture={onCanvasAreaContextMenuCapture}
        onDoubleClickCapture={onCanvasAreaDoubleClickCapture}
        onClickCapture={onCanvasAreaClickCapture}
        onMouseMoveCapture={onCanvasAreaMouseMoveCapture}
        onMouseLeave={onCanvasAreaMouseLeave}
        style={{
          cursor: embeddedToolMode === 'select' && hoveredGuide
            ? hoveredGuide.locked
              ? 'not-allowed'
              : hoveredGuide.orientation === 'vertical'
                ? 'ew-resize'
                : 'ns-resize'
            : undefined
        }}
      >
        {children}
      </div>
    </div>
  </div>
);
