import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  DrawingTextAlignment,
  DrawingTextVerticalAlignment
} from '@/graphics-engine/components/viewer-dxf/types';
import type { CadDockSection, CadToolDefinition } from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

export interface UseCadEditorToolControllerParams {
  tools: ReadonlyArray<CadToolDefinition>;
  activeToolId: string;
  activeLayerName: string;
  activeLayerSummaryName: string | null;
  annotationLayerName: string;
  textAnnotationLayerName: string;
  textUsesAnnotationLayer: boolean;
  activeTextToolPresetLabel: string;
  drawingTextHeight: number;
  drawingTextRotation: number;
  drawingTextAlignment: DrawingTextAlignment;
  drawingTextVerticalAlignment: DrawingTextVerticalAlignment;
  closePointToPointShape: boolean;
  enableGridSnap: boolean;
  enableObjectSnap: boolean;
  gridSnapSize: number;
  openedDocumentName: string | null;
  selectedEntitiesCount: number;
  weldReason: string;
  openLeftPanel: (panelId: CadDockSection) => void;
  setActiveDock: Dispatch<SetStateAction<CadDockSection>>;
  setActiveToolId: Dispatch<SetStateAction<string>>;
  setEditorNotice: Dispatch<SetStateAction<string>>;
  messages?: {
    defaultActiveToolLabel: string;
    buildActivateToolNotice: (params: { toolLabel: string }) => string;
    buildDrawingToolHint: (params: {
      activeToolId: string;
      snapSummary: string;
      closePointToPointShape: boolean;
      activeTextToolPresetLabel: string;
      textUsesAnnotationLayer: boolean;
      textAnnotationLayerName: string;
      activeLayerSummaryName: string | null;
      activeLayerName: string;
      drawingTextHeight: number;
      drawingTextRotation: number;
      drawingTextAlignment: DrawingTextAlignment;
      drawingTextVerticalAlignment: DrawingTextVerticalAlignment;
      annotationLayerName: string;
      weldReason: string;
    }) => string | null;
    buildEditorInfoMessage: (params: {
      openedDocumentName: string | null;
      activeToolLabel: string;
      selectedEntitiesCount: number;
      activeToolId: string;
      weldReason: string;
    }) => string;
  };
}

const DEFAULT_TOOL_CONTROLLER_MESSAGES: NonNullable<UseCadEditorToolControllerParams['messages']> = {
  defaultActiveToolLabel: 'Selecionar',
  buildActivateToolNotice: ({ toolLabel }) => `Ferramenta ativa: ${toolLabel}.`,
  buildDrawingToolHint: ({
    activeToolId,
    snapSummary,
    closePointToPointShape,
    activeTextToolPresetLabel,
    textUsesAnnotationLayer,
    textAnnotationLayerName,
    activeLayerSummaryName,
    activeLayerName,
    drawingTextHeight,
    drawingTextRotation,
    drawingTextAlignment,
    drawingTextVerticalAlignment,
    annotationLayerName,
    weldReason
  }) => {
    switch (activeToolId) {
      case 'point':
        return `Clique no canvas para criar um ponto.${snapSummary}`;
      case 'line':
        return `Clique no ponto inicial e depois no ponto final.${snapSummary}`;
      case 'point-to-point':
        return `Clique para adicionar vertices. Distancia e angulo podem ser ajustados no painel tecnico; Enter aplica o trecho atual e clique direito finaliza. Use Esc para cancelar.${closePointToPointShape ? ' Fechamento automatico ativo ao concluir ou ao voltar ao primeiro vertice.' : ''}${snapSummary}`;
      case 'rectangle':
        return `Clique no primeiro canto e depois no canto oposto.${snapSummary}`;
      case 'circle':
        return `Clique no centro e depois em um ponto do raio.${snapSummary}`;
      case 'bezier':
        return `Clique no ponto inicial, no ponto de controle e por fim no ponto final.${snapSummary}`;
      case 'text':
        return `Preset ${activeTextToolPresetLabel}. Clique no ponto desejado para abrir o dialogo e confirmar o conteudo do texto na camada ${textUsesAnnotationLayer ? textAnnotationLayerName : (activeLayerSummaryName || activeLayerName)} com altura ${drawingTextHeight.toFixed(2)}, rotacao ${drawingTextRotation.toFixed(1)}°, alinhamento ${drawingTextAlignment} e ancoragem ${drawingTextVerticalAlignment}.${snapSummary}`;
      case 'distance':
        return `Clique em dois pontos para medir a distancia. A cota sera gravada na camada ${annotationLayerName}.${snapSummary}`;
      case 'move':
        return `Selecione a entidade, clique no ponto base e depois no ponto destino. Enter confirma o preview atual e Esc cancela.${snapSummary}`;
      case 'copy':
        return `Selecione a entidade, clique no ponto base e depois no ponto destino para gerar a copia. Enter confirma o preview atual e Esc cancela.${snapSummary}`;
      case 'rotate':
        return `Selecione a entidade e arraste sobre ela para rotacionar. Shift trava o angulo em passos tecnicos, Esc cancela e solte o mouse para confirmar.${snapSummary}`;
      case 'scale':
        return `Selecione a entidade e arraste pelas alcas para escalar. Shift mantem proporcao, Esc cancela e solte o mouse para confirmar.${snapSummary}`;
      case 'offset':
        return `Selecione uma Linha, Circulo ou Polilinha, mova o cursor para definir a distancia do offset e clique para confirmar. Enter aplica o preview atual.${snapSummary}`;
      case 'extend':
        return `Selecione uma Linha, Polilinha aberta ou Arco, aproxime o cursor da extremidade, vertice ou segmento que deseja alongar e clique para confirmar. Enter aplica o preview atual ate a primeira interseccao encontrada com Linha, Polilinha, Circulo ou Arco.${snapSummary}`;
      case 'knife':
        return `Selecione uma Linha, Polilinha aberta ou Arco, aproxime o cursor da ponta, vertice ou segmento que deseja cortar e clique para confirmar. Enter aplica o preview atual ate a primeira interseccao no segmento ou no percurso do arco com Linha, Polilinha, Circulo ou Arco.${snapSummary}`;
      case 'edit-nodes':
        return `Selecione uma Linha ou Polilinha aberta e arraste qualquer no visivel para reposicionar o vertice. Esc cancela o arrasto atual.${snapSummary}`;
      case 'edit-curve':
        return `Selecione uma curva do editor e arraste uma das duas alcas para remodelar o tracado. Esc cancela o arrasto atual.${snapSummary}`;
      case 'mirror':
        return `Selecione uma entidade para ver o preview do espelhamento. Clique confirma ou Enter aplica no eixo vertical da propria selecao.${snapSummary}`;
      case 'join':
        return `Clique na primeira entidade e depois na segunda. Fora do modo de selecao multipla, o weld tenta aplicar no segundo clique; com selecao multipla ativa, clique no vazio, numa entidade ja selecionada ou pressione Enter para aplicar. ${weldReason}${snapSummary}`;
      default:
        return null;
    }
  },
  buildEditorInfoMessage: ({
    openedDocumentName,
    activeToolLabel,
    selectedEntitiesCount,
    activeToolId,
    weldReason
  }) => (
    openedDocumentName
      ? `Arquivo aberto no editor: ${openedDocumentName}. Ferramenta ativa: ${activeToolLabel}. Selecao atual: ${selectedEntitiesCount || 0} entidade(s). ${activeToolId === 'join' ? weldReason : ''}`.trim()
      : `Editor CAD independente carregado sem arquivo. Use o menu Arquivos para criar um novo desenho ou abrir um arquivo local. Ferramenta ativa: ${activeToolLabel}.`
  )
};

const CAD_EDITOR_TOOL_SHORTCUT_LABELS: Readonly<Record<string, string>> = {
  select: 'V',
  pan: 'H',
  zoom: 'Z',
  join: 'J',
  mirror: 'M',
  'edit-nodes': 'N',
  'edit-curve': 'C',
  rotate: 'R',
  offset: 'O',
  extend: 'E',
  knife: 'T',
  trim: 'T'
};

export const useCadEditorToolController = ({
  tools,
  activeToolId,
  activeLayerName,
  activeLayerSummaryName,
  annotationLayerName,
  textAnnotationLayerName,
  textUsesAnnotationLayer,
  activeTextToolPresetLabel,
  drawingTextHeight,
  drawingTextRotation,
  drawingTextAlignment,
  drawingTextVerticalAlignment,
  closePointToPointShape,
  enableGridSnap,
  enableObjectSnap,
  gridSnapSize,
  openedDocumentName,
  selectedEntitiesCount,
  weldReason,
  openLeftPanel,
  setActiveDock,
  setActiveToolId,
  setEditorNotice,
  messages
}: UseCadEditorToolControllerParams) => {
  const resolvedMessages = messages ?? DEFAULT_TOOL_CONTROLLER_MESSAGES;
  const activeToolLabel = useMemo(
    () => tools.find((tool) => tool.id === activeToolId)?.label || resolvedMessages.defaultActiveToolLabel,
    [activeToolId, resolvedMessages.defaultActiveToolLabel, tools]
  );
  const activeToolShortcutLabel = useMemo(
    () => CAD_EDITOR_TOOL_SHORTCUT_LABELS[activeToolId] || null,
    [activeToolId]
  );

  const activateEditorTool = useCallback((toolId: string, section?: CadDockSection) => {
    const targetTool = tools.find((tool) => tool.id === toolId);
    if (!targetTool) {
      return;
    }

    const targetSection = section || targetTool.section;
    setActiveDock(targetSection);
    openLeftPanel(targetSection);
    setActiveToolId(targetTool.id);
    setEditorNotice(resolvedMessages.buildActivateToolNotice({ toolLabel: targetTool.label }));
  }, [openLeftPanel, resolvedMessages, setActiveDock, setActiveToolId, setEditorNotice, tools]);

  const drawingToolHint = useMemo(() => {
    const snapSummary = enableObjectSnap
      ? (enableGridSnap ? ` Snap objeto+grade (${gridSnapSize}).` : ' Snap a objetos ativo.')
      : (enableGridSnap ? ` Snap na grade (${gridSnapSize}).` : ' Snap livre.');

    const baseHint = resolvedMessages.buildDrawingToolHint({
      activeToolId,
      snapSummary,
      closePointToPointShape,
      activeTextToolPresetLabel,
      textUsesAnnotationLayer,
      textAnnotationLayerName,
      activeLayerSummaryName,
      activeLayerName,
      drawingTextHeight,
      drawingTextRotation,
      drawingTextAlignment,
      drawingTextVerticalAlignment,
      annotationLayerName,
      weldReason
    });

    if (baseHint && activeToolShortcutLabel) {
      return `${baseHint} Atalho: ${activeToolShortcutLabel}. Use F1 para a lista completa.`;
    }

    if (baseHint) {
      return baseHint;
    }

    if (activeToolShortcutLabel) {
      return `Ferramenta ativa com atalho ${activeToolShortcutLabel}. Use F1 para a lista completa.`;
    }

    return null;
  }, [
    activeLayerName,
    activeLayerSummaryName,
    activeToolShortcutLabel,
    activeTextToolPresetLabel,
    activeToolId,
    annotationLayerName,
    closePointToPointShape,
    drawingTextAlignment,
    drawingTextHeight,
    drawingTextRotation,
    drawingTextVerticalAlignment,
    enableGridSnap,
    enableObjectSnap,
    gridSnapSize,
    resolvedMessages,
    textAnnotationLayerName,
    textUsesAnnotationLayer,
    weldReason
  ]);

  const editorInfoMessage = useMemo(() => (
    resolvedMessages.buildEditorInfoMessage({
      openedDocumentName,
      activeToolLabel,
      selectedEntitiesCount,
      activeToolId,
      weldReason
    })
  ), [activeToolId, activeToolLabel, openedDocumentName, resolvedMessages, selectedEntitiesCount, weldReason]);

  return {
    activeToolLabel,
    activeToolShortcutLabel,
    activateEditorTool,
    drawingToolHint,
    editorInfoMessage
  };
};
