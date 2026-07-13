import type React from 'react';
import type { DrawingTextAlignment, DrawingTextVerticalAlignment, ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';
import type { TextToolPresetDefinition } from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import type { CadGuide } from '@/graphics-engine/pages/cad-editor/cadEditorRulerUtils';

type CadRightPanelId = 'colors' | 'properties' | 'view' | 'layers' | 'info';

type CadLayerSummary = {
  name: string;
  colorClass: string;
  entityCount?: number;
};

type TextFieldModifiedMap = {
  textValue: boolean;
  height: boolean;
  rotation: boolean;
  alignment: boolean;
  verticalAlignment: boolean;
  target: boolean;
};

interface CadEditorRightSidebarProps {
  rightPanelWidth: number;
  minRightPanelWidth: number;
  maxRightPanelWidth: number;
  rightPanelState: Record<CadRightPanelId, boolean>;
  activeToolId: string;
  activeToolLabel: string;
  activeToolShortcutLabel: string | null;
  drawingLineColor: string;
  drawingFillColor: string;
  paintFillEnabled: boolean;
  selectedEntities: ViewerSelectedEntityInfo[];
  openedDocumentName: string;
  openedDocumentSizeLabel: string;
  fileExtensionLabel: string;
  measurementUnitLabel: string;
  measurementUnitShortLabel: string;
  workspaceSizeLabel: string;
  selectionEntityLabel: string;
  selectionLayerLabel: string;
  selectionPositionLabel: string;
  selectionLength: number | null;
  selectionVertexCount: number | null;
  selectionTextLabel: string;
  selectedGuide: CadGuide | null;
  showGrid: boolean;
  showCursorCoordinates: boolean;
  guidesVisible: boolean;
  enableGridSnap: boolean;
  enableObjectSnap: boolean;
  gridSnapSize: number;
  majorGridStepLabel: string;
  layerCount: number;
  textEntityCount: number;
  weldTolerance: number;
  weldGap: number | null;
  weldCanApply: boolean;
  weldReason: string;
  activeLayerName: string;
  activeLayerSummaryName: string;
  annotationLayerName: string;
  textAnnotationLayerName: string;
  textUsesAnnotationLayer: boolean;
  closePointToPointShape: boolean;
  layerSummaries: CadLayerSummary[];
  hiddenLayerNames: string[];
  activeTextToolPresetId: string;
  activeTextToolPresetLabel: string;
  customTextToolPresetId: string;
  customTextToolPresetLabel: string;
  textToolPresets: ReadonlyArray<TextToolPresetDefinition>;
  hasCustomTextPreset: boolean;
  textPresetDeviationLabels: string[];
  selectedTextToolPresetLabel: string;
  drawingTextValue: string;
  drawingTextHeight: number;
  drawingTextRotation: number;
  drawingTextAlignment: DrawingTextAlignment;
  drawingTextVerticalAlignment: DrawingTextVerticalAlignment;
  textFieldModifiedMap: TextFieldModifiedMap;
  drawingToolHint: string | null;
  layerPlaceholderIds: string[];
  geometryEntityCount: number;
  totalEntityCount: number;
  topEntityTypes: Array<[string, number]>;
  activeLayerEntityTypes: Array<[string, number]>;
  selectedTypeLabels: string[];
  editorInfoMessage: string;
  copiedEntitiesCount: number;
  flowSummary: {
    stage: string;
    detail: string;
    nextStep: string;
    confrontationSummary: string;
  };
  selectionSummary: {
    entitySummary: string;
    manualLotsSummary: string;
    manualReviewSummary: string;
  };
  technicalSummaryModeInfo: {
    modeLabel: string;
    modeDetail: string;
    scopeLabel: string;
    lastGeneratedSummary: string;
  };
  texts?: {
    resizeHandleAriaLabel: string;
    resizeHandleTitle: string;
    panelTitles: {
      colors: string;
      properties: string;
      view: string;
      layers: string;
      info: string;
    };
    colors: {
      line: string;
      fill: string;
      lineColorAriaLabel: string;
      fillColorAriaLabel: string;
      applyFillWhilePainting: string;
      applyToSelectionButton: string;
      clearFillButton: string;
      details: string;
      extractStartActiveNotice: string;
    };
    properties: {
      file: string;
      none: string;
      format: string;
      size: string;
      unit: string;
      workspaceBase: string;
      entity: string;
      layer: string;
      position: string;
      length: string;
      vertices: string;
      text: string;
      selectedGuideTitle: string;
      orientation: string;
      vertical: string;
      horizontal: string;
      guidePosition: string;
      guideState: string;
      locked: string;
      unlocked: string;
      unlockButton: string;
      lockButton: string;
      removeButton: string;
      clearButton: string;
    };
    view: {
      showGrid: string;
      showCursorCoordinates: string;
      showGuides: string;
      enableGridSnap: string;
      enableObjectSnap: string;
      gridStep: string;
      buildGridInfo: (params: {
        gridSnapSize: number;
        measurementUnitShortLabel: string;
        majorGridStepLabel: string;
      }) => string;
      layerCount: string;
      activeLayer: string;
      noneActiveLayer: string;
      textEntityCount: string;
      weldTolerance: string;
      weldGap: string;
      weldStatus: string;
      weldWaiting: string;
      weldReady: string;
      weldFailure: string;
      mode: string;
      shortcut: string;
      noShortcut: string;
      targetLayer: string;
      geometryLayer: string;
      annotationLayer: string;
      snaps: string;
      snapFree: string;
      buildSnapsValue: (params: {
        enableObjectSnap: boolean;
        enableGridSnap: boolean;
        gridSnapSize: number;
      }) => string;
      closeOnFinish: string;
      preset: string;
      buildCustomPresetNotice: (params: {
        selectedTextToolPresetLabel: string;
        textPresetDeviationLabels: string[];
      }) => string;
      actions: string;
      restorePreset: string;
      content: string;
      textPlaceholder: string;
      height: string;
      rotation: string;
      alignment: string;
      alignmentLeft: string;
      alignmentCenter: string;
      alignmentRight: string;
      verticalAlignment: string;
      verticalBaseline: string;
      verticalMiddle: string;
      verticalTop: string;
      textInAnnotation: string;
      textLayer: string;
      activePreset: string;
      textTarget: string;
      zoom: string;
    };
    layers: {
      selectLayerTitle: (params: { layerName: string }) => string;
      activateLayerTitle: (params: { layerName: string }) => string;
      visibilityHeader: string;
      activeHeader: string;
      visibleLayerLabel: (params: { layerName: string }) => string;
      hiddenLayerLabel: (params: { layerName: string }) => string;
      selectionTargetLabel: string;
      moveSelectionButton: string;
      moveSelectionDisabled: string;
      entitiesSuffix: string;
    };
    info: {
      flowTitle: string;
      selectionTitle: string;
      summaryTitle: string;
      helpTitle: string;
      currentStage: string;
      nextStep: string;
      confrontations: string;
      canvasSelection: string;
      partialSelection: string;
      manualReview: string;
      mode: string;
      scope: string;
      lastGenerated: string;
      helpDescription: string;
    };
  };
  onRightPanelResizeStart: React.MouseEventHandler<HTMLButtonElement>;
  onResetRightPanelWidth: React.MouseEventHandler<HTMLButtonElement>;
  onRightPanelResizeKeyDown: React.KeyboardEventHandler<HTMLButtonElement>;
  onToggleRightPanel: (panelId: CadRightPanelId) => void;
  onDrawingLineColorChange: (value: string) => void;
  onDrawingFillColorChange: (value: string) => void;
  onPaintFillEnabledChange: (checked: boolean) => void;
  onApplySelectedEntityColors: () => void;
  onClearSelectedEntityFill: () => void;
  onToggleGuideLocked: (guideId: string) => void;
  onRemoveGuideById: (guideId: string) => void;
  onClearSelectedGuide: () => void;
  onShowGridChange: (checked: boolean) => void;
  onShowCursorCoordinatesChange: (checked: boolean) => void;
  onGuidesVisibleChange: (checked: boolean) => void;
  onEnableGridSnapChange: (checked: boolean) => void;
  onEnableObjectSnapChange: (checked: boolean) => void;
  onGridSnapSizeChange: (value: number) => void;
  onWeldToleranceChange: (value: number) => void;
  onActiveLayerChange: (layerName: string) => void;
  onMoveSelectedEntitiesToActiveLayer: () => void;
  canMoveActiveLayerUp: boolean;
  canMoveActiveLayerDown: boolean;
  onMoveActiveLayerUp: () => void;
  onMoveActiveLayerDown: () => void;
  onLayerVisibilityChange: (layerName: string, visible: boolean) => void;
  onCreateLayer: () => void;
  onDeleteLayer: () => void;
  onAnnotationLayerChange: (layerName: string) => void;
  onClosePointToPointShapeChange: (checked: boolean) => void;
  onApplyTextToolPreset: (presetId: TextToolPresetDefinition['id']) => void;
  onRestoreSelectedTextToolPreset: () => void;
  onDrawingTextValueChange: (value: string) => void;
  onDrawingTextHeightChange: (value: number) => void;
  onDrawingTextRotationChange: (value: number) => void;
  onDrawingTextAlignmentChange: (value: DrawingTextAlignment) => void;
  onDrawingTextVerticalAlignmentChange: (value: DrawingTextVerticalAlignment) => void;
  onTextUsesAnnotationLayerChange: (checked: boolean) => void;
  onTextAnnotationLayerNameChange: (layerName: string) => void;
}

const DEFAULT_RIGHT_SIDEBAR_TEXTS: NonNullable<CadEditorRightSidebarProps['texts']> = {
  resizeHandleAriaLabel: 'Redimensionar painel direito',
  resizeHandleTitle: 'Arraste para redimensionar o painel direito. Duplo clique restaura o padrao.',
  panelTitles: {
    colors: 'Cores',
    properties: 'Propriedades',
    view: 'Visualizacao',
    layers: 'Camadas',
    info: 'Informacoes'
  },
  colors: {
    line: 'Linha:',
    fill: 'Preench.:',
    lineColorAriaLabel: 'Selecionar cor da linha',
    fillColorAriaLabel: 'Selecionar cor de preenchimento',
    applyFillWhilePainting: 'Aplicar preenchimento ao pintar',
    applyToSelectionButton: 'Aplicar na selecao',
    clearFillButton: 'Limpar preench.',
    details: 'Novas entidades nascem em aramado com a cor de linha atual. O preenchimento so entra ao pintar a selecao.',
    extractStartActiveNotice: 'Ferramenta Pintar ativa. Selecione entidades no canvas e aplique as cores por este painel.'
  },
  properties: {
    file: 'Arquivo:',
    none: 'Nenhum',
    format: 'Formato:',
    size: 'Tamanho:',
    unit: 'Unidade:',
    workspaceBase: 'Area base:',
    entity: 'Entidade:',
    layer: 'Camada:',
    position: 'Posicao:',
    length: 'Comprimento:',
    vertices: 'Vertices:',
    text: 'Texto:',
    selectedGuideTitle: 'Guia Selecionada',
    orientation: 'Orientacao:',
    vertical: 'Vertical',
    horizontal: 'Horizontal',
    guidePosition: 'Posicao:',
    guideState: 'Estado:',
    locked: 'Travada',
    unlocked: 'Livre',
    unlockButton: 'Destravar',
    lockButton: 'Travar',
    removeButton: 'Remover',
    clearButton: 'Desmarcar'
  },
  view: {
    showGrid: 'Mostrar Grid',
    showCursorCoordinates: 'Coordenadas no Cursor',
    showGuides: 'Mostrar Guias',
    enableGridSnap: 'Snap ao Grid',
    enableObjectSnap: 'Snap a Objetos',
    gridStep: 'Passo Grid:',
    buildGridInfo: ({ gridSnapSize, measurementUnitShortLabel, majorGridStepLabel }) => `Grid atual: ${gridSnapSize} ${measurementUnitShortLabel}. Linha forte a cada ${majorGridStepLabel}. Em desenhos novos, a area-base evita o salto de escala e estabiliza o cursor.`,
    layerCount: 'Camadas:',
    activeLayer: 'Camada ativa:',
    noneActiveLayer: 'Nenhuma',
    textEntityCount: 'Textos:',
    weldTolerance: 'Tol. Weld:',
    weldGap: 'Gap:',
    weldStatus: 'Status:',
    weldWaiting: 'Aguardando',
    weldReady: 'Pronto',
    weldFailure: 'Falha',
    mode: 'Modo:',
      shortcut: 'Atalho:',
      noShortcut: 'Sem atalho direto',
    targetLayer: 'Camada destino:',
    geometryLayer: 'Camada geometria:',
    annotationLayer: 'Camada cotas:',
    snaps: 'Snaps:',
    snapFree: 'Livre',
    buildSnapsValue: ({ enableObjectSnap, enableGridSnap, gridSnapSize }) => (
      enableObjectSnap && enableGridSnap ? `Objeto + Grid ${gridSnapSize}` : enableObjectSnap ? 'Objeto' : enableGridSnap ? `Grid ${gridSnapSize}` : 'Livre'
    ),
    closeOnFinish: 'Fechar ao concluir',
    preset: 'Preset:',
    buildCustomPresetNotice: ({ selectedTextToolPresetLabel, textPresetDeviationLabels }) => `Personalizado em relacao ao preset ${selectedTextToolPresetLabel}: ${textPresetDeviationLabels.join(', ')}.`,
    actions: 'Acoes:',
    restorePreset: 'Restaurar preset',
    content: 'Conteudo:',
    textPlaceholder: 'Texto',
    height: 'Altura:',
    rotation: 'Rotacao:',
    alignment: 'Alinhamento:',
    alignmentLeft: 'Esquerda',
    alignmentCenter: 'Centro',
    alignmentRight: 'Direita',
    verticalAlignment: 'Ancoragem:',
    verticalBaseline: 'Linha Base',
    verticalMiddle: 'Meio',
    verticalTop: 'Topo',
    textInAnnotation: 'Texto em anotacao',
    textLayer: 'Camada textos:',
    activePreset: 'Preset ativo:',
    textTarget: 'Destino texto:',
    zoom: 'Zoom:'
  },
  layers: {
    selectLayerTitle: ({ layerName }) => `Selecionar camada ${layerName}`,
    activateLayerTitle: ({ layerName }) => `Definir camada ativa ${layerName}`,
    visibilityHeader: 'Vis.',
    activeHeader: 'Ativa',
    visibleLayerLabel: ({ layerName }) => `Ocultar camada ${layerName}`,
    hiddenLayerLabel: ({ layerName }) => `Mostrar camada ${layerName}`,
      selectionTargetLabel: 'Mover selecao para:',
      moveSelectionButton: 'Mover selecao',
      moveSelectionDisabled: 'Selecione entidades para mover entre camadas.',
    entitiesSuffix: ''
  },
  info: {
    flowTitle: 'Fluxo atual',
    selectionTitle: 'Selecao atual',
    summaryTitle: 'Resumo tecnico',
    helpTitle: 'Ajuda visual',
    currentStage: 'Etapa:',
    nextStep: 'Proximo passo:',
    confrontations: 'Confrontacoes:',
    canvasSelection: 'Canvas:',
    partialSelection: 'Parcial:',
    manualReview: 'Revisao manual:',
    mode: 'Modo:',
    scope: 'Escopo:',
    lastGenerated: 'Ultimo resumo:',
      helpDescription: 'Use Totais ou Parciais em Operacoes. A ajuda completa fica no menu superior.',
  }
};

export const CadEditorRightSidebar: React.FC<CadEditorRightSidebarProps> = ({
  rightPanelWidth,
  minRightPanelWidth,
  maxRightPanelWidth,
  rightPanelState,
  activeToolId,
  activeToolLabel,
  activeToolShortcutLabel,
  drawingLineColor,
  drawingFillColor,
  paintFillEnabled,
  selectedEntities,
  openedDocumentName,
  openedDocumentSizeLabel,
  fileExtensionLabel,
  measurementUnitLabel,
  measurementUnitShortLabel,
  workspaceSizeLabel,
  selectionEntityLabel,
  selectionLayerLabel,
  selectionPositionLabel,
  selectionLength,
  selectionVertexCount,
  selectionTextLabel,
  selectedGuide,
  showGrid,
  showCursorCoordinates,
  guidesVisible,
  enableGridSnap,
  enableObjectSnap,
  gridSnapSize,
  majorGridStepLabel,
  layerCount,
  textEntityCount,
  weldTolerance,
  weldGap,
  weldCanApply,
  weldReason,
  activeLayerName,
  activeLayerSummaryName,
  annotationLayerName,
  textAnnotationLayerName,
  textUsesAnnotationLayer,
  closePointToPointShape,
  layerSummaries,
  hiddenLayerNames,
  activeTextToolPresetId,
  activeTextToolPresetLabel,
  customTextToolPresetId,
  customTextToolPresetLabel,
  textToolPresets,
  hasCustomTextPreset,
  textPresetDeviationLabels,
  selectedTextToolPresetLabel,
  drawingTextValue,
  drawingTextHeight,
  drawingTextRotation,
  drawingTextAlignment,
  drawingTextVerticalAlignment,
  textFieldModifiedMap,
  drawingToolHint,
  layerPlaceholderIds,
  editorInfoMessage,
  flowSummary,
  selectionSummary,
  technicalSummaryModeInfo,
  texts,
  onRightPanelResizeStart,
  onResetRightPanelWidth,
  onRightPanelResizeKeyDown,
  onToggleRightPanel,
  onDrawingLineColorChange,
  onDrawingFillColorChange,
  onPaintFillEnabledChange,
  onApplySelectedEntityColors,
  onClearSelectedEntityFill,
  onToggleGuideLocked,
  onRemoveGuideById,
  onClearSelectedGuide,
  onShowGridChange,
  onShowCursorCoordinatesChange,
  onGuidesVisibleChange,
  onEnableGridSnapChange,
  onEnableObjectSnapChange,
  onGridSnapSizeChange,
  onWeldToleranceChange,
  onActiveLayerChange,
  onMoveSelectedEntitiesToActiveLayer,
  canMoveActiveLayerUp,
  canMoveActiveLayerDown,
  onMoveActiveLayerUp,
  onMoveActiveLayerDown,
  onLayerVisibilityChange,
  onCreateLayer,
  onDeleteLayer,
  onAnnotationLayerChange,
  onClosePointToPointShapeChange,
  onApplyTextToolPreset,
  onRestoreSelectedTextToolPreset,
  onDrawingTextValueChange,
  onDrawingTextHeightChange,
  onDrawingTextRotationChange,
  onDrawingTextAlignmentChange,
  onDrawingTextVerticalAlignmentChange,
  onTextUsesAnnotationLayerChange,
  onTextAnnotationLayerNameChange
}) => {
  const resolvedTexts = texts ?? DEFAULT_RIGHT_SIDEBAR_TEXTS;

  return (
  <aside
    className="cad-editor-right"
    style={{ width: `${rightPanelWidth}px`, minWidth: `${rightPanelWidth}px` }}
  >
    <button
      type="button"
      className="cad-editor-right-resize-handle"
      onMouseDown={onRightPanelResizeStart}
      onDoubleClick={onResetRightPanelWidth}
      onKeyDown={onRightPanelResizeKeyDown}
      aria-label={resolvedTexts.resizeHandleAriaLabel}
      aria-valuemin={minRightPanelWidth}
      aria-valuemax={maxRightPanelWidth}
      aria-valuenow={Math.round(rightPanelWidth)}
      aria-valuetext={`${Math.round(rightPanelWidth)} pixels`}
      title={resolvedTexts.resizeHandleTitle}
    />
    <details className="cad-editor-side-panel" open={rightPanelState.info}>
      <summary
        className="cad-editor-side-panel-title"
        onClick={(event) => {
          event.preventDefault();
          onToggleRightPanel('info');
        }}
      >
        {resolvedTexts.panelTitles.info}
      </summary>
      <div className="cad-editor-side-panel-body">
        <div className="cad-editor-info-block">
          <strong>{resolvedTexts.info.flowTitle}</strong>
          <span>{flowSummary.stage}: {flowSummary.detail}</span>
          <span>{resolvedTexts.info.nextStep} {flowSummary.nextStep}</span>
        </div>
        <div className="cad-editor-info-block">
          <strong>{resolvedTexts.info.selectionTitle}</strong>
          <span>{resolvedTexts.info.partialSelection} {selectionSummary.manualLotsSummary}</span>
          <span>{resolvedTexts.info.confrontations} {flowSummary.confrontationSummary}</span>
        </div>
        <div className="cad-editor-info-block">
          <strong>{resolvedTexts.info.summaryTitle}</strong>
          <span>{resolvedTexts.info.mode} {technicalSummaryModeInfo.modeLabel}</span>
          <span>{resolvedTexts.info.scope} {technicalSummaryModeInfo.scopeLabel}</span>
          <span>{resolvedTexts.info.lastGenerated} {technicalSummaryModeInfo.lastGeneratedSummary}</span>
        </div>
        <div className="cad-editor-info-details">
          {resolvedTexts.info.helpDescription}
        </div>
        <div className="cad-editor-info-details">
          {editorInfoMessage}
        </div>
      </div>
    </details>
    <details className="cad-editor-side-panel" open={rightPanelState.colors}>
      <summary
        className="cad-editor-side-panel-title"
        onClick={(event) => {
          event.preventDefault();
          onToggleRightPanel('colors');
        }}
      >
        {resolvedTexts.panelTitles.colors}
      </summary>
      <div className="cad-editor-side-panel-body">
        <label className="cad-editor-field">
          <span>{resolvedTexts.colors.line}</span>
          <div className="cad-editor-color-field">
            <input
              type="color"
              className="cad-editor-color-input"
              value={drawingLineColor}
              onChange={(event) => onDrawingLineColorChange(event.target.value)}
              aria-label={resolvedTexts.colors.lineColorAriaLabel}
            />
            <input className="cad-editor-side-input" value={drawingLineColor.toUpperCase()} readOnly />
          </div>
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.colors.fill}</span>
          <div className="cad-editor-color-field">
            <input
              type="color"
              className="cad-editor-color-input"
              value={drawingFillColor}
              onChange={(event) => onDrawingFillColorChange(event.target.value)}
              aria-label={resolvedTexts.colors.fillColorAriaLabel}
            />
            <input className="cad-editor-side-input" value={drawingFillColor.toUpperCase()} readOnly />
          </div>
        </label>
        <label className="cad-editor-check">
          <input
            type="checkbox"
            checked={paintFillEnabled}
            onChange={(event) => onPaintFillEnabledChange(event.target.checked)}
          />
          {resolvedTexts.colors.applyFillWhilePainting}
        </label>
        <div className="cad-editor-guide-actions">
          <button
            type="button"
            className="cad-editor-secondary-button"
            onClick={onApplySelectedEntityColors}
            disabled={selectedEntities.length === 0}
          >
            {resolvedTexts.colors.applyToSelectionButton}
          </button>
          <button
            type="button"
            className="cad-editor-secondary-button"
            onClick={onClearSelectedEntityFill}
            disabled={selectedEntities.length === 0}
          >
            {resolvedTexts.colors.clearFillButton}
          </button>
        </div>
        <div className="cad-editor-info-details">
          {resolvedTexts.colors.details}
        </div>
        {activeToolId === 'extract-start' && (
          <div className="cad-editor-weld-diagnostic cad-editor-weld-diagnostic--ready">
            {resolvedTexts.colors.extractStartActiveNotice}
          </div>
        )}
      </div>
    </details>
    <details className="cad-editor-side-panel" open={rightPanelState.properties}>
      <summary
        className="cad-editor-side-panel-title"
        onClick={(event) => {
          event.preventDefault();
          onToggleRightPanel('properties');
        }}
      >
        {resolvedTexts.panelTitles.properties}
      </summary>
      <div className="cad-editor-side-panel-body">
        <label className="cad-editor-field">
          <span>{resolvedTexts.properties.file}</span>
          <input className="cad-editor-side-input" value={openedDocumentName || resolvedTexts.properties.none} readOnly />
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.properties.format}</span>
          <input className="cad-editor-side-input" value={fileExtensionLabel} readOnly />
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.properties.size}</span>
          <input className="cad-editor-side-input" value={openedDocumentSizeLabel} readOnly />
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.properties.unit}</span>
          <input className="cad-editor-side-input" value={measurementUnitLabel} readOnly />
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.properties.workspaceBase}</span>
          <input className="cad-editor-side-input" value={workspaceSizeLabel} readOnly />
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.properties.entity}</span>
          <input className="cad-editor-side-input" value={selectionEntityLabel} readOnly />
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.properties.layer}</span>
          <input className="cad-editor-side-input" value={selectionLayerLabel} readOnly />
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.properties.position}</span>
          <input className="cad-editor-side-input" value={selectionPositionLabel} readOnly />
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.properties.length}</span>
          <input className="cad-editor-side-input" value={typeof selectionLength === 'number' ? selectionLength.toFixed(3) : 'N/A'} readOnly />
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.properties.vertices}</span>
          <input className="cad-editor-side-input" value={typeof selectionVertexCount === 'number' ? String(selectionVertexCount) : 'N/A'} readOnly />
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.properties.text}</span>
          <input className="cad-editor-side-input" value={selectionTextLabel} readOnly />
        </label>
        {selectedGuide ? (
          <div className="cad-editor-guide-card cad-editor-guide-card--selected">
            <div className="cad-editor-guide-card-header">{resolvedTexts.properties.selectedGuideTitle}</div>
            <label className="cad-editor-field">
              <span>{resolvedTexts.properties.orientation}</span>
              <input
                className="cad-editor-side-input"
                value={selectedGuide.orientation === 'vertical' ? resolvedTexts.properties.vertical : resolvedTexts.properties.horizontal}
                readOnly
              />
            </label>
            <label className="cad-editor-field">
              <span>{resolvedTexts.properties.guidePosition}</span>
              <input className="cad-editor-side-input" value={selectedGuide.position.toFixed(3)} readOnly />
            </label>
            <label className="cad-editor-field">
              <span>{resolvedTexts.properties.guideState}</span>
              <input className="cad-editor-side-input" value={selectedGuide.locked ? resolvedTexts.properties.locked : resolvedTexts.properties.unlocked} readOnly />
            </label>
            <div className="cad-editor-guide-actions">
              <button
                type="button"
                className="cad-editor-secondary-button"
                onClick={() => onToggleGuideLocked(selectedGuide.id)}
              >
                {selectedGuide.locked ? resolvedTexts.properties.unlockButton : resolvedTexts.properties.lockButton}
              </button>
              <button
                type="button"
                className="cad-editor-secondary-button"
                disabled={selectedGuide.locked}
                onClick={() => onRemoveGuideById(selectedGuide.id)}
              >
                {resolvedTexts.properties.removeButton}
              </button>
              <button
                type="button"
                className="cad-editor-secondary-button"
                onClick={onClearSelectedGuide}
              >
                {resolvedTexts.properties.clearButton}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </details>
    <details className="cad-editor-side-panel" open={rightPanelState.view}>
      <summary
        className="cad-editor-side-panel-title"
        onClick={(event) => {
          event.preventDefault();
          onToggleRightPanel('view');
        }}
      >
        {resolvedTexts.panelTitles.view}
      </summary>
      <div className="cad-editor-side-panel-body">
        <label className="cad-editor-check">
          <input type="checkbox" checked={showGrid} onChange={(event) => onShowGridChange(event.target.checked)} />
          {resolvedTexts.view.showGrid}
        </label>
        <label className="cad-editor-check">
          <input type="checkbox" checked={showCursorCoordinates} onChange={(event) => onShowCursorCoordinatesChange(event.target.checked)} />
          {resolvedTexts.view.showCursorCoordinates}
        </label>
        <label className="cad-editor-check">
          <input type="checkbox" checked={guidesVisible} onChange={(event) => onGuidesVisibleChange(event.target.checked)} />
          {resolvedTexts.view.showGuides}
        </label>
        <label className="cad-editor-check">
          <input type="checkbox" checked={enableGridSnap} onChange={(event) => onEnableGridSnapChange(event.target.checked)} />
          {resolvedTexts.view.enableGridSnap}
        </label>
        <label className="cad-editor-check">
          <input type="checkbox" checked={enableObjectSnap} onChange={(event) => onEnableObjectSnapChange(event.target.checked)} />
          {resolvedTexts.view.enableObjectSnap}
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.view.gridStep}</span>
          <input
            className="cad-editor-side-input"
            type="number"
            min="0.1"
            step="0.5"
            value={gridSnapSize}
            onChange={(event) => {
              const nextValue = Number.parseFloat(event.target.value);
              if (Number.isFinite(nextValue) && nextValue > 0) {
                onGridSnapSizeChange(nextValue);
              }
            }}
            disabled={!enableGridSnap}
          />
        </label>
        <div className="cad-editor-info-details">
          {resolvedTexts.view.buildGridInfo({
            gridSnapSize,
            measurementUnitShortLabel,
            majorGridStepLabel
          })}
        </div>
        <label className="cad-editor-field">
          <span>{resolvedTexts.view.layerCount}</span>
          <input className="cad-editor-side-input" value={String(layerCount)} readOnly />
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.view.activeLayer}</span>
          <input className="cad-editor-side-input" value={activeLayerSummaryName || resolvedTexts.view.noneActiveLayer} readOnly />
        </label>
        <label className="cad-editor-field">
          <span>{resolvedTexts.view.textEntityCount}</span>
          <input className="cad-editor-side-input" value={String(textEntityCount)} readOnly />
        </label>
        {activeToolId === 'join' && (
          <>
            <label className="cad-editor-field">
              <span>{resolvedTexts.view.weldTolerance}</span>
              <input
                className="cad-editor-side-input"
                type="number"
                min="0.01"
                step="0.05"
                value={weldTolerance.toFixed(2)}
                onChange={(event) => {
                  const nextValue = Number.parseFloat(event.target.value);
                  if (Number.isFinite(nextValue) && nextValue > 0) {
                    onWeldToleranceChange(nextValue);
                  }
                }}
              />
            </label>
            <label className="cad-editor-field">
              <span>{resolvedTexts.view.weldGap}</span>
              <input className="cad-editor-side-input" value={typeof weldGap === 'number' ? weldGap.toFixed(3) : 'N/A'} readOnly />
            </label>
            <label className="cad-editor-field">
              <span>{resolvedTexts.view.weldStatus}</span>
              <input
                className="cad-editor-side-input"
                value={selectedEntities.length < 2 ? resolvedTexts.view.weldWaiting : weldCanApply ? resolvedTexts.view.weldReady : resolvedTexts.view.weldFailure}
                readOnly
              />
            </label>
            <div className={`cad-editor-weld-diagnostic ${weldCanApply ? 'cad-editor-weld-diagnostic--ready' : 'cad-editor-weld-diagnostic--error'}`}>
              {weldReason}
            </div>
          </>
        )}
        {['rectangle', 'circle', 'bezier', 'point', 'distance', 'line', 'point-to-point', 'text'].includes(activeToolId) && (
          <>
            <label className="cad-editor-field">
              <span>{resolvedTexts.view.mode}</span>
              <input className="cad-editor-side-input" value={activeToolLabel} readOnly />
            </label>
            <label className="cad-editor-field">
              <span>{resolvedTexts.view.shortcut}</span>
              <input className="cad-editor-side-input" value={activeToolShortcutLabel || resolvedTexts.view.noShortcut} readOnly />
            </label>
            <label className="cad-editor-field">
              <span>{resolvedTexts.view.targetLayer}</span>
              <input
                className="cad-editor-side-input"
                value={activeToolId === 'distance' ? annotationLayerName : activeToolId === 'text' && textUsesAnnotationLayer ? textAnnotationLayerName : (activeLayerSummaryName || activeLayerName)}
                readOnly
              />
            </label>
            <label className="cad-editor-field">
              <span>{resolvedTexts.view.geometryLayer}</span>
              <select className="cad-editor-side-select" value={activeLayerSummaryName || activeLayerName} onChange={(event) => onActiveLayerChange(event.target.value)}>
                {layerSummaries.map((layer) => (
                  <option key={layer.name} value={layer.name}>
                    {layer.name}
                  </option>
                ))}
              </select>
            </label>
            {activeToolId === 'distance' && (
              <label className="cad-editor-field">
                <span>{resolvedTexts.view.annotationLayer}</span>
                <select className="cad-editor-side-select" value={annotationLayerName} onChange={(event) => onAnnotationLayerChange(event.target.value)}>
                  {layerSummaries.map((layer) => (
                    <option key={layer.name} value={layer.name}>
                      {layer.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="cad-editor-field">
              <span>{resolvedTexts.view.snaps}</span>
              <input
                className="cad-editor-side-input"
                value={resolvedTexts.view.buildSnapsValue({
                  enableObjectSnap,
                  enableGridSnap,
                  gridSnapSize
                })}
                readOnly
              />
            </label>
            {activeToolId === 'point-to-point' && (
              <label className="cad-editor-check">
                <input type="checkbox" checked={closePointToPointShape} onChange={(event) => onClosePointToPointShapeChange(event.target.checked)} />
                {resolvedTexts.view.closeOnFinish}
              </label>
            )}
            {activeToolId === 'text' && (
              <>
                <label className="cad-editor-field">
                  <span>{resolvedTexts.view.preset}</span>
                  <select
                    className="cad-editor-side-select"
                    value={activeTextToolPresetId}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (nextValue !== customTextToolPresetId) {
                        onApplyTextToolPreset(nextValue as TextToolPresetDefinition['id']);
                      }
                    }}
                  >
                    {textToolPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                    <option value={customTextToolPresetId}>{customTextToolPresetLabel}</option>
                  </select>
                </label>
                {hasCustomTextPreset && textPresetDeviationLabels.length > 0 && (
                  <div className="cad-editor-weld-diagnostic cad-editor-weld-diagnostic--error">
                    {resolvedTexts.view.buildCustomPresetNotice({
                      selectedTextToolPresetLabel,
                      textPresetDeviationLabels
                    })}
                  </div>
                )}
                {hasCustomTextPreset && textPresetDeviationLabels.length > 0 && (
                  <label className="cad-editor-field">
                    <span>{resolvedTexts.view.actions}</span>
                    <button
                      type="button"
                      className="cad-editor-secondary-button cad-editor-text-preset-restore-button"
                      onClick={onRestoreSelectedTextToolPreset}
                    >
                      {resolvedTexts.view.restorePreset}
                    </button>
                  </label>
                )}
                <label className={`cad-editor-field${textFieldModifiedMap.textValue ? ' cad-editor-field--modified' : ''}`}>
                  <span>{resolvedTexts.view.content}</span>
                  <input
                    className={`cad-editor-side-input${textFieldModifiedMap.textValue ? ' cad-editor-side-input--modified' : ''}`}
                    value={drawingTextValue}
                    onChange={(event) => onDrawingTextValueChange(event.target.value)}
                    placeholder={resolvedTexts.view.textPlaceholder}
                  />
                </label>
                <label className={`cad-editor-field${textFieldModifiedMap.height ? ' cad-editor-field--modified' : ''}`}>
                  <span>{resolvedTexts.view.height}</span>
                  <input
                    className={`cad-editor-side-input${textFieldModifiedMap.height ? ' cad-editor-side-input--modified' : ''}`}
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={drawingTextHeight}
                    onChange={(event) => {
                      const nextValue = Number.parseFloat(event.target.value);
                      if (Number.isFinite(nextValue) && nextValue > 0) {
                        onDrawingTextHeightChange(nextValue);
                      }
                    }}
                  />
                </label>
                <label className={`cad-editor-field${textFieldModifiedMap.rotation ? ' cad-editor-field--modified' : ''}`}>
                  <span>{resolvedTexts.view.rotation}</span>
                  <input
                    className={`cad-editor-side-input${textFieldModifiedMap.rotation ? ' cad-editor-side-input--modified' : ''}`}
                    type="number"
                    step="5"
                    value={drawingTextRotation}
                    onChange={(event) => {
                      const nextValue = Number.parseFloat(event.target.value);
                      if (Number.isFinite(nextValue)) {
                        onDrawingTextRotationChange(nextValue);
                      }
                    }}
                  />
                </label>
                <label className={`cad-editor-field${textFieldModifiedMap.alignment ? ' cad-editor-field--modified' : ''}`}>
                  <span>{resolvedTexts.view.alignment}</span>
                  <select
                    className={`cad-editor-side-select${textFieldModifiedMap.alignment ? ' cad-editor-side-select--modified' : ''}`}
                    value={drawingTextAlignment}
                    onChange={(event) => onDrawingTextAlignmentChange(event.target.value as DrawingTextAlignment)}
                  >
                    <option value="left">{resolvedTexts.view.alignmentLeft}</option>
                    <option value="center">{resolvedTexts.view.alignmentCenter}</option>
                    <option value="right">{resolvedTexts.view.alignmentRight}</option>
                  </select>
                </label>
                <label className={`cad-editor-field${textFieldModifiedMap.verticalAlignment ? ' cad-editor-field--modified' : ''}`}>
                  <span>{resolvedTexts.view.verticalAlignment}</span>
                  <select
                    className={`cad-editor-side-select${textFieldModifiedMap.verticalAlignment ? ' cad-editor-side-select--modified' : ''}`}
                    value={drawingTextVerticalAlignment}
                    onChange={(event) => onDrawingTextVerticalAlignmentChange(event.target.value as DrawingTextVerticalAlignment)}
                  >
                    <option value="baseline">{resolvedTexts.view.verticalBaseline}</option>
                    <option value="middle">{resolvedTexts.view.verticalMiddle}</option>
                    <option value="top">{resolvedTexts.view.verticalTop}</option>
                  </select>
                </label>
                <label className={`cad-editor-check${textFieldModifiedMap.target ? ' cad-editor-check--modified' : ''}`}>
                  <input type="checkbox" checked={textUsesAnnotationLayer} onChange={(event) => onTextUsesAnnotationLayerChange(event.target.checked)} />
                  {resolvedTexts.view.textInAnnotation}
                </label>
                <label className={`cad-editor-field${textFieldModifiedMap.target ? ' cad-editor-field--modified' : ''}`}>
                  <span>{resolvedTexts.view.textLayer}</span>
                  <select
                    className={`cad-editor-side-select${textFieldModifiedMap.target ? ' cad-editor-side-select--modified' : ''}`}
                    value={textAnnotationLayerName}
                    onChange={(event) => onTextAnnotationLayerNameChange(event.target.value)}
                    disabled={!textUsesAnnotationLayer}
                  >
                    {layerSummaries.map((layer) => (
                      <option key={layer.name} value={layer.name}>
                        {layer.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="cad-editor-field">
                  <span>{resolvedTexts.view.activePreset}</span>
                  <input className="cad-editor-side-input" value={activeTextToolPresetLabel} readOnly />
                </label>
                <label className="cad-editor-field">
                  <span>{resolvedTexts.view.textTarget}</span>
                  <input
                    className="cad-editor-side-input"
                    value={textUsesAnnotationLayer ? textAnnotationLayerName : (activeLayerSummaryName || activeLayerName)}
                    readOnly
                  />
                </label>
              </>
            )}
            {drawingToolHint && (
              <div className="cad-editor-weld-diagnostic cad-editor-weld-diagnostic--ready">
                {drawingToolHint}
              </div>
            )}
          </>
        )}
        <div className="cad-editor-zoom-box">
          <span>{resolvedTexts.view.zoom}</span>
          <div className="cad-editor-zoom-track">
            <div className="cad-editor-zoom-thumb" />
          </div>
          <div className="cad-editor-zoom-scale">
            <span>0,1</span>
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
            <span>7</span>
            <span>8</span>
            <span>9</span>
            <span>10</span>
          </div>
          <span>0.1 - 10</span>
        </div>
      </div>
    </details>
    <details className="cad-editor-side-panel" open={rightPanelState.layers}>
      <summary
        className="cad-editor-side-panel-title"
        onClick={(event) => {
          event.preventDefault();
          onToggleRightPanel('layers');
        }}
      >
        {resolvedTexts.panelTitles.layers}
      </summary>
      <div className="cad-editor-side-panel-body">
        <div className="cad-editor-layer-list">
          <div className="cad-editor-layer-header" aria-hidden="true">
            <span>{resolvedTexts.layers.visibilityHeader}</span>
            <span>{resolvedTexts.layers.activeHeader}</span>
            <span />
            <span />
          </div>
          {layerSummaries.map((layer) => (
            <div
              key={layer.name}
              className={`cad-editor-layer-row ${activeLayerName === layer.name ? 'is-active' : ''}`}
            >
              <input
                type="checkbox"
                checked={!hiddenLayerNames.includes(layer.name)}
                onChange={(event) => onLayerVisibilityChange(layer.name, event.target.checked)}
                aria-label={
                  hiddenLayerNames.includes(layer.name)
                    ? resolvedTexts.layers.hiddenLayerLabel({ layerName: layer.name })
                    : resolvedTexts.layers.visibleLayerLabel({ layerName: layer.name })
                }
                title={
                  hiddenLayerNames.includes(layer.name)
                    ? resolvedTexts.layers.hiddenLayerLabel({ layerName: layer.name })
                    : resolvedTexts.layers.visibleLayerLabel({ layerName: layer.name })
                }
              />
              <input
                type="checkbox"
                checked={activeLayerName === layer.name}
                onChange={() => onActiveLayerChange(layer.name)}
                aria-label={resolvedTexts.layers.activateLayerTitle({ layerName: layer.name })}
                title={resolvedTexts.layers.activateLayerTitle({ layerName: layer.name })}
              />
              <span className={`cad-editor-layer-color ${layer.colorClass}`} />
              <button
                type="button"
                className="cad-editor-layer-select"
                onClick={() => onActiveLayerChange(layer.name)}
                title={resolvedTexts.layers.selectLayerTitle({ layerName: layer.name })}
              >
                <strong>{layer.name}</strong>
                <span>{layer.entityCount || 0}</span>
              </button>
            </div>
          ))}
          {layerPlaceholderIds.map((rowId) => (
            <div key={rowId} className="cad-editor-layer-row cad-editor-layer-row--empty" />
          ))}
        </div>
        <div className="cad-editor-layer-actions">
          <button type="button" className="cad-editor-layer-action" onClick={onCreateLayer} title="Criar camada">+</button>
          <button type="button" className="cad-editor-layer-action" onClick={onDeleteLayer} title="Remover camada ativa">-</button>
          <button
            type="button"
            className="cad-editor-layer-action"
            onClick={onMoveActiveLayerUp}
            disabled={!canMoveActiveLayerUp}
            title={canMoveActiveLayerUp ? 'Mover camada ativa para cima' : 'A camada ativa ja esta no topo'}
          >
            ↑
          </button>
          <button
            type="button"
            className="cad-editor-layer-action"
            onClick={onMoveActiveLayerDown}
            disabled={!canMoveActiveLayerDown}
            title={canMoveActiveLayerDown ? 'Mover camada ativa para baixo' : 'A camada ativa ja esta na base'}
          >
            ↓
          </button>
        </div>
        <div className="cad-editor-layer-transfer">
          <span className="cad-editor-layer-transfer-label">
            {resolvedTexts.layers.selectionTargetLabel} <strong>{activeLayerSummaryName || activeLayerName}</strong>
          </span>
          <button
            type="button"
            className="cad-editor-secondary-button cad-editor-layer-transfer-button"
            onClick={onMoveSelectedEntitiesToActiveLayer}
            disabled={selectedEntities.length === 0}
            title={selectedEntities.length === 0 ? resolvedTexts.layers.moveSelectionDisabled : resolvedTexts.layers.moveSelectionButton}
          >
            {resolvedTexts.layers.moveSelectionButton}
          </button>
        </div>
      </div>
    </details>
  </aside>
  );
};
