import type { EntityPreviewTransform } from '@/graphics-engine/components/viewer-dxf/selectionTransformUtils';

export const GEO_LIMITES_CAD_EDITOR_TEXTS = {
  initialEditorNotice: 'Editor CAD independente pronto.',
  leftSidebarTitle: 'Modelagem Base',
  topBarBackButtonLabel: 'Voltar',
  topBarDocumentLabel: 'Documento:',
  emptyStateTitle: 'Editor CAD',
  emptyStateSubtitle: 'Nenhum arquivo aberto.',
  emptyStateHint: 'Use o menu "Arquivos" para criar um novo desenho ou abrir um arquivo local.',
  textPlacementPointNotice: 'Clique no canvas para escolher o ponto do texto.',
  settingsDialog: {
    title: 'Configurador do Editor CAD',
    closeButtonLabel: 'Fechar',
    measurementUnitLabel: 'Unidade:',
    workspaceBaseLabel: 'Area base:',
    workspaceHelpText: 'A area-base define o envelope minimo do viewport para desenhos novos. Isso impede que a grade fique gigante e que o canvas reescale brutalmente a cada entidade pequena criada.'
  },
  shortcutsDialog: {
    title: 'Atalhos do Editor CAD',
    closeButtonLabel: 'Fechar',
    helperText: 'Use estes atalhos com foco no editor. Em navegadores, algumas combinacoes reservadas podem ser interceptadas.',
    sections: [
      {
        title: 'Arquivo',
        items: [
          { keys: 'Alt+N', description: 'Novo desenho' },
          { keys: 'Ctrl+O', description: 'Abrir arquivo' },
          { keys: 'Ctrl+S', description: 'Salvar' },
          { keys: 'Ctrl+Shift+S', description: 'Salvar Como' },
          { keys: 'Ctrl+W', description: 'Fechar documento atual' }
        ]
      },
      {
        title: 'Edicao',
        items: [
          { keys: 'Ctrl+Z', description: 'Undo' },
          { keys: 'Ctrl+Y', description: 'Redo' },
          { keys: 'Delete / Backspace', description: 'Remover selecao' },
          { keys: 'Esc', description: 'Limpar selecao ou fechar a ajuda' }
        ]
      },
      {
        title: 'Ferramentas',
        items: [
          { keys: 'V', description: 'Selecionar' },
          { keys: 'H', description: 'Pan' },
          { keys: 'Z', description: 'Zoom' },
          { keys: 'J', description: 'Weld' },
          { keys: 'M', description: 'Mirror' },
          { keys: 'R', description: 'Rotate' },
          { keys: 'O', description: 'Offset' },
          { keys: 'E', description: 'Extend' },
          { keys: 'T', description: 'Trim' }
        ]
      },
      {
        title: 'Viewport e ajuda',
        items: [
          { keys: 'F', description: 'Fit no desenho' },
          { keys: '+ / =', description: 'Zoom in' },
          { keys: '-', description: 'Zoom out' },
          { keys: '0', description: 'Reset viewport' },
          { keys: 'F1 / ?', description: 'Abrir ajuda de atalhos' }
        ]
      }
    ]
  },
  textDialog: {
    title: 'Inserir Texto',
    closeButtonLabel: 'Fechar',
    contentLabel: 'Conteudo:',
    placeholder: 'Texto',
    defaultTextValue: 'Texto',
    buildDetailsText: ({
      pointLabel,
      targetLayerLabel
    }: {
      pointLabel?: string | null;
      targetLayerLabel: string;
    }) => `Texto sera aplicado no ponto selecionado${pointLabel ? ` (${pointLabel})` : ''}. Camada atual: ${targetLayerLabel}.`,
    buildInsertedNotice: ({
      layerName,
      pointLabel
    }: {
      layerName: string;
      pointLabel: string;
    }) => `Texto inserido na camada ${layerName} em ${pointLabel}.`,
    cancelButtonLabel: 'Cancelar',
    applyButtonLabel: 'Aplicar'
  },
  layerDialog: {
    title: 'Nova Camada',
    closeButtonLabel: 'Fechar',
    contentLabel: 'Nome:',
    placeholder: 'CAMADA_NOVA',
    helperText: 'Digite o nome da nova camada. As letras sao convertidas para MAIUSCULAS durante a digitacao.',
    duplicateLayerNotice: ({ layerName }: { layerName: string }) => `A camada ${layerName} ja existe.`,
    cancelButtonLabel: 'Cancelar',
    applyButtonLabel: 'Criar'
  },
  statusBar: {
    toolLabel: 'Ferramenta:',
    shortcutLabel: 'Atalho:',
    noShortcut: 'Sem atalho',
    layerLabel: 'Camada:',
    measurementUnitLabel: 'Unidade:'
  },
  uiActions: {
    showGridEnabled: 'Grade visual ativada no canvas.',
    showGridDisabled: 'Grade visual ocultada no canvas.',
    cursorCoordinatesEnabled: 'Coordenadas do cursor ativadas no canvas.',
    cursorCoordinatesDisabled: 'Coordenadas do cursor ocultadas no canvas.',
    guidesVisibleEnabled: 'Guias visiveis e aptas ao snap.',
    guidesVisibleDisabled: 'Guias ocultadas e snap em guias desativado.',
    buildGridSnapNotice: ({ checked, gridSnapSize }: { checked: boolean; gridSnapSize: number }) => (
      checked ? `Snap ao Grid ativado (${gridSnapSize}).` : 'Snap ao Grid desativado.'
    ),
    buildObjectSnapNotice: ({ checked }: { checked: boolean }) => (
      checked ? 'Snap a Objetos ativado.' : 'Snap a Objetos desativado.'
    ),
    buildActiveLayerNotice: ({ layerName }: { layerName: string }) => `Camada geometrica ativa ajustada para ${layerName}.`,
    buildAnnotationLayerNotice: ({ layerName }: { layerName: string }) => `Camada de anotacao ajustada para ${layerName}.`,
    buildPointToPointCloseNotice: ({ checked }: { checked: boolean }) => (
      checked
        ? 'Ponto a Ponto configurado para fechar o contorno ao concluir.'
        : 'Ponto a Ponto configurado para manter a polilinha aberta.'
    ),
    buildTextAlignmentNotice: ({ value }: { value: string }) => `Alinhamento do texto ajustado para ${value}.`,
    buildTextVerticalAlignmentNotice: ({ value }: { value: string }) => `Ancoragem vertical do texto ajustada para ${value}.`,
    buildTextUsesAnnotationLayerNotice: ({
      checked,
      textAnnotationLayerName,
      activeLayerName
    }: {
      checked: boolean;
      textAnnotationLayerName: string;
      activeLayerName: string;
    }) => (
      checked
        ? `Texto configurado para usar a camada tecnica ${textAnnotationLayerName}.`
        : `Texto configurado para usar a camada ativa ${activeLayerName}.`
    ),
    buildTextAnnotationLayerNotice: ({ layerName }: { layerName: string }) => `Camada de textos tecnicos ajustada para ${layerName}.`
  },
  stateSync: {
    defaultActiveLayerName: 'GEOMETRIA',
    buildGridSnapActiveNotice: ({
      gridSnapSize,
      measurementUnitShortLabel
    }: {
      gridSnapSize: number;
      measurementUnitShortLabel: string;
    }) => `Snap ao Grid ativo em ${gridSnapSize} ${measurementUnitShortLabel}.`,
    buildNewDocumentStabilizedNotice: ({
      workspaceSizeLabel,
      measurementUnitLabel
    }: {
      workspaceSizeLabel: string;
      measurementUnitLabel: string;
    }) => `Novo desenho estabilizado em ${workspaceSizeLabel} com unidade ${measurementUnitLabel.toLowerCase()}.`
  },
  chromeViewModel: {
    noFileCommandValue: 'Sem arquivo',
    buildStatusDocumentLabel: ({ openedDocumentName }: { openedDocumentName: string | null }) => (
      openedDocumentName ? `DXF aberto: ${openedDocumentName}` : 'Editor CAD carregado sem DXF aberto.'
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
  },
  documentController: {
    closeOpenedFileNotice: 'Arquivo fechado no Editor CAD.',
    buildNewDocumentNotice: ({
      measurementUnitLabel,
      workspaceSizeLabel
    }: {
      measurementUnitLabel: string;
      workspaceSizeLabel: string;
    }) => `Novo desenho iniciado em ${measurementUnitLabel.toLowerCase()} com area-base de ${workspaceSizeLabel}.`,
    buildApplyMeasurementUnitNotice: ({
      unitLabel,
      workspaceSize,
      gridSnapSize,
      majorGridStep,
      shortLabel
    }: {
      unitLabel: string;
      workspaceSize: number;
      gridSnapSize: number;
      majorGridStep: number;
      shortLabel: string;
    }) => `Configuracao aplicada: ${unitLabel} | area-base ${workspaceSize} ${shortLabel} | grid ${gridSnapSize} ${shortLabel} | linha forte ${majorGridStep} ${shortLabel}.`,
    exportRequiresDocumentNotice: 'Abra um DXF antes de exportar o desenho editado.',
    buildExportSuccessNotice: ({ exportFileName }: { exportFileName: string }) => `DXF editado exportado com sucesso: ${exportFileName}.`,
    exportErrorNotice: 'Nao foi possivel exportar o DXF editado.',
    buildOpenSuccessNotice: ({ fileName }: { fileName: string }) => `Arquivo aberto no editor: ${fileName}.`,
    openErrorNotice: 'Nao foi possivel abrir o DXF selecionado.'
  },
  rightSidebar: {
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
      buildGridInfo: ({
        gridSnapSize,
        measurementUnitShortLabel,
        majorGridStepLabel
      }: {
        gridSnapSize: number;
        measurementUnitShortLabel: string;
        majorGridStepLabel: string;
      }) => `Grid atual: ${gridSnapSize} ${measurementUnitShortLabel}. Linha forte a cada ${majorGridStepLabel}. Em desenhos novos, a area-base evita o salto de escala e estabiliza o cursor.`,
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
      buildSnapsValue: ({
        enableObjectSnap,
        enableGridSnap,
        gridSnapSize
      }: {
        enableObjectSnap: boolean;
        enableGridSnap: boolean;
        gridSnapSize: number;
      }) => (
        enableObjectSnap && enableGridSnap ? `Objeto + Grid ${gridSnapSize}` : enableObjectSnap ? 'Objeto' : enableGridSnap ? `Grid ${gridSnapSize}` : 'Livre'
      ),
      closeOnFinish: 'Fechar ao concluir',
      preset: 'Preset:',
      buildCustomPresetNotice: ({
        selectedTextToolPresetLabel,
        textPresetDeviationLabels
      }: {
        selectedTextToolPresetLabel: string;
        textPresetDeviationLabels: string[];
      }) => `Personalizado em relacao ao preset ${selectedTextToolPresetLabel}: ${textPresetDeviationLabels.join(', ')}.`,
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
      selectLayerTitle: ({ layerName }: { layerName: string }) => `Selecionar camada ${layerName}`,
      activateLayerTitle: ({ layerName }: { layerName: string }) => `Definir camada ativa ${layerName}`,
      visibilityHeader: 'Vis.',
      activeHeader: 'Ativa',
      visibleLayerLabel: ({ layerName }: { layerName: string }) => `Ocultar camada ${layerName}`,
      hiddenLayerLabel: ({ layerName }: { layerName: string }) => `Mostrar camada ${layerName}`,
      selectionTargetLabel: 'Mover selecao para:',
      moveSelectionButton: 'Mover selecao',
      moveSelectionDisabled: 'Selecione entidades para mover entre camadas.',
      entitiesSuffix: ''
    },
    info: {
      totalEntities: 'Total de entidades',
      geometricEntities: 'Entidades geometricas',
      editorConfiguration: 'Configuracao do editor:',
      mainTypes: 'Tipos principais:',
      none: 'Nenhum',
      activeLayer: 'Camada ativa:',
      activeLayerDefault: 'GEOMETRIA',
      activeLayerTypes: 'Tipos na camada ativa:',
      selection: 'Selecao:',
      noSelection: 'Nenhuma',
      clipboard: 'Clipboard:',
      emptyClipboard: 'Vazio'
    }
  },
  viewer: {
    defaultTextValue: 'Texto',
    defaultAnnotationLayerName: 'LOTES',
    defaultTextAnnotationLayerName: 'LOTES',
    pointToPointPanel: {
      distanceLabel: 'Distancia',
      distancePlaceholder: '0.000',
      angleLabel: 'Angulo',
      anglePlaceholder: '0.0',
      keyboardHint: 'D distancia | A angulo | Shift+Tab volta | Enter aplica'
    },
    selectSegmentsBeforeCheckNotice: 'Selecione um ou mais segmentos antes de verificar.',
    buildContourClosedNotice: ({ segmentCount }: { segmentCount: number }) => `Contorno fechado ✅ (${segmentCount} segmento(s))`,
    buildContourOpenNotice: ({
      openNodeCount,
      closestGapDistance
    }: {
      openNodeCount: number;
      closestGapDistance: number | null;
    }) => `Contorno aberto ❌ (${openNodeCount} ponta(s) solta(s)).${closestGapDistance !== null ? ` Gap ~${closestGapDistance.toFixed(3)}` : ''}`,
    buildBridgeCreatedNotice: ({ distance }: { distance: number }) => `Ponte criada para fechar (distancia ${distance.toFixed(3)}).`,
    invalidContourNotice: 'Contorno invalido (ramificacoes ou cruzamentos).',
    selectSegmentsBeforeCloseNotice: 'Selecione segmentos do contorno antes de fechar.',
    alreadyClosedNotice: 'Ja esta fechado ✅',
    buildAutoCloseFailureNotice: ({ openNodeCount }: { openNodeCount: number }) => `Nao foi possivel fechar automaticamente (pontas soltas: ${openNodeCount}).`,
    cancelEmbeddedDrawingNotice: 'Rascunho de desenho cancelado.',
    buildPointToPointCreatedNotice: ({
      isClosed,
      vertexCount,
      layerName
    }: {
      isClosed: boolean;
      vertexCount: number;
      layerName: string;
    }) => `${isClosed ? 'Contorno fechado' : 'Polilinha'} criado com ${vertexCount} vertices na camada ${layerName}.`,
    pointToPointClosedAtFirstVertexNotice: 'Contorno fechado ao retornar ao primeiro vertice.',
    buildPointCreatedNotice: ({ point }: { point: { x: number; y: number } }) => `Ponto criado em X ${point.x.toFixed(3)} / Y ${point.y.toFixed(3)}.`,
    buildTextInsertedNotice: ({
      layerName,
      height,
      rotation,
      alignment,
      verticalAlignment
    }: {
      layerName: string;
      height: number;
      rotation: number;
      alignment: string;
      verticalAlignment: string;
    }) => `Texto inserido na camada ${layerName} com altura ${height.toFixed(2)}, rotacao ${rotation.toFixed(1)}°, alinhamento ${alignment} e ancoragem ${verticalAlignment}.`,
    buildDistanceCreatedNotice: ({ distance, layerName }: { distance: number; layerName: string }) => `Cota criada: ${distance.toFixed(3)} na camada ${layerName}.`,
    buildLineCreatedNotice: ({ layerName }: { layerName: string }) => `Linha criada na camada ${layerName}.`,
    buildCircleCreatedNotice: ({ layerName }: { layerName: string }) => `Circulo criado na camada ${layerName}.`,
    buildRectangleCreatedNotice: ({ layerName }: { layerName: string }) => `Retangulo criado na camada ${layerName}.`,
    buildBezierCreatedNotice: ({ layerName }: { layerName: string }) => `Curva Bezier criada na camada ${layerName}.`,
    buildTextPreviewLabel: ({
      textValue,
      defaultTextValue,
      height,
      rotation,
      alignment,
      verticalAlignment
    }: {
      textValue: string;
      defaultTextValue: string;
      height: number;
      rotation: number;
      alignment: string;
      verticalAlignment: string;
    }) => `Texto em curso: ${textValue.trim() || defaultTextValue} | h=${height.toFixed(2)} | rot=${rotation.toFixed(1)}° | alin=${alignment} | anc=${verticalAlignment}`,
    mirrorSelectOneNotice: 'Espelhar: selecione uma entidade.',
    mirrorSelectOnlyOneNotice: 'Espelhar: selecione apenas uma entidade.',
    mirrorReadyNotice: 'Espelhar: preview pronto. Clique confirma ou Enter aplica.',
    joinSelectTwoNotice: 'Unir: selecione duas ou mais entidades para aplicar o weld.',
    buildJoinInvalidNotice: ({ weldReason }: { weldReason: string }) => `Unir: ${weldReason || 'ajuste a selecao para aplicar o weld.'}`,
    joinReadyNotice: 'Unir: preview pronto. Clique no canvas ou Enter aplica.',
    editNodesSelectNotice: 'Editar Nos: selecione uma Linha ou Polilinha aberta.',
    editNodesUnsupportedNotice: 'Editar Nos: suporte atual para Linha e Polilinha aberta.',
    editNodesDragNotice: 'Editar Nos: arraste uma extremidade para reposicionar ou encostar em outra ponta.',
    buildEditNodesSnappedNotice: ({ distance }: { distance: number }) => `Editar Nos: snap travado | dist ${distance.toFixed(3)} | solte para aplicar`,
    buildEditNodesMovingNotice: ({ distance }: { distance: number }) => `Editar Nos: movendo extremidade | dist ${distance.toFixed(3)} | solte para aplicar`
  },
  viewerHeader: {
    buildCorrectiveToolLabel: (tool: 'inspect' | 'move-vertex' | 'join-endpoints' | 'close-gap-guided') => {
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
    },
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
    buildZoomLabel: ({ zoom }: { zoom: number }) => `Zoom: ${zoom.toFixed(2)}x`,
    autoFitHint: 'Desenho ajustado automaticamente ao canvas'
  },
  viewerRenderer: {
    segmentPointTitle: 'Ponto do trecho',
    buildSegmentPointLabel: ({
      x,
      y
    }: {
      x: number;
      y: number;
    }) => `E: ${x.toFixed(3)} N: ${y.toFixed(3)}`,
    confrontationTextTitle: 'Texto de confrontacao',
    buildGeoreferenceLabel: ({
      georeferencedX,
      georeferencedY
    }: {
      georeferencedX: number;
      georeferencedY: number;
    }) => `Georref.: E ${georeferencedX.toFixed(3)} | N ${georeferencedY.toFixed(3)}`,
    buildOriginalPointLabel: ({
      originalX,
      originalY
    }: {
      originalX: number;
      originalY: number;
    }) => `Original: X ${originalX.toFixed(3)} | Y ${originalY.toFixed(3)}`,
    referenceSourceLabel: 'Fonte: ponto reconhecido no DXF e no cadastro',
    buildHoverEastNorthLabel: ({ x, y }: { x: number; y: number }) => `E: ${x.toFixed(3)} | N: ${y.toFixed(3)}`,
    buildEntityStatsLabel: ({ entityCount, drawnCount }: { entityCount: number; drawnCount: number }) => `Entidades: ${entityCount} | Desenhadas: ${drawnCount}`,
    buildScaleLabel: ({ scale, zoom }: { scale: number; zoom: number }) => `Escala: ${scale.toFixed(2)}x | Zoom: ${zoom.toFixed(2)}x`,
    buildSizeLabel: ({ width, height }: { width: number; height: number }) => `Tamanho: ${width.toFixed(1)} x ${height.toFixed(1)}`,
    emptyCanvasLabel: 'Canvas pronto para novo desenho',
    buildGeoreferencedStatusLabel: ({
      matchedPoints,
      averageResidualMeters
    }: {
      matchedPoints: number;
      averageResidualMeters: number;
    }) => `Georreferenciado: ${matchedPoints} pontos | Residuo medio ${averageResidualMeters.toFixed(3)} m`
    ,
    buildCorrectiveLotBadgeTitle: ({ lotNumber }: { lotNumber: number | string }) => `Lote ${lotNumber}`,
    buildCorrectiveLotBadgeSummary: ({
      issueCount,
      severity
    }: {
      issueCount: number;
      severity: string | null;
    }) => `${issueCount} pend. • ${severity === 'BLOQUEANTE' ? 'bloq.' : 'aviso'}`,
    buildCorrectiveLotMissingTitle: ({ lotNumber }: { lotNumber: number | string }) => `Lote ${lotNumber} nao foi localizado no canvas`,
    correctiveLotMissingDescription: 'O resumo tecnico cita o lote, mas a extracao atual nao o materializou.',
    buildVertexGapLabel: ({ distance }: { distance: number }) => `Lacuna vert.: ${distance.toFixed(2)}`,
    buildSegmentGapLabel: ({ distance }: { distance: number }) => `Arestas prox.: ${distance.toFixed(2)}`,
    buildRecentlyCorrectedLotLabel: ({ lotNumber }: { lotNumber: number | string }) => `Lote ${lotNumber} corrigido agora`
  },
  commandNotices: {
    undoUnavailable: 'Nao ha operacoes para desfazer.',
    redoUnavailable: 'Nao ha operacoes para refazer.',
    undoApplied: 'Undo aplicado no Editor CAD.',
    redoApplied: 'Redo aplicado no Editor CAD.',
    zoomInApplied: 'Zoom aumentado.',
    zoomOutApplied: 'Zoom reduzido.',
    fitApplied: 'Desenho ajustado ao canvas.',
    resetApplied: 'Viewport resetado.',
    helpShortcuts:
      'Atalhos: Alt+N novo desenho, Ctrl+O abrir, Ctrl+S salvar, Ctrl+W fechar, Ctrl+Z undo, Ctrl+Y redo, Delete remover, Esc limpar, V selecionar, H pan, Z zoom, J weld, M mirror, R rotate, O offset, E extend, T trim, F fit, + zoom in, - zoom out, 0 reset, F1 ou ? ajuda.',
    helpAbout: 'Editor CAD independente em construcao, com foco em fluxo proprio de abertura DXF e comandos de viewport.'
  },
  commandPresentation: {
    buildMenuActionsByMenu: ({
      openedDocument,
      currentEditorDataAvailable,
      canUndo,
      canRedo,
      weldCanApply,
      selectedEntityCount,
      canGroupSelection,
      canUngroupSelection
    }: {
      openedDocument: { name: string } | null;
      currentEditorDataAvailable: boolean;
      canUndo: boolean;
      canRedo: boolean;
      weldCanApply: boolean;
      selectedEntityCount: number;
      canGroupSelection: boolean;
      canUngroupSelection: boolean;
    }) => ({
      file: [
        { id: 'file-new', label: 'Novo' },
        { id: 'file-open', label: 'Abrir...', disabled: false },
        { id: 'file-save-dxf', label: 'Salvar', disabled: !openedDocument || !currentEditorDataAvailable },
        { id: 'file-save-as-dxf', label: 'Salvar Como...', disabled: !openedDocument || !currentEditorDataAvailable },
        { id: 'file-close', label: 'Fechar', disabled: !openedDocument }
      ],
      edit: [
        { id: 'edit-undo', label: 'Undo', disabled: !canUndo },
        { id: 'edit-redo', label: 'Redo', disabled: !canRedo },
        { id: 'edit-group', label: 'Agrupar', disabled: !canGroupSelection },
        { id: 'edit-ungroup', label: 'Desagrupar', disabled: !canUngroupSelection }
      ],
      view: [
        { id: 'view-zoom-in', label: 'Aumentar Zoom', disabled: !openedDocument },
        { id: 'view-zoom-out', label: 'Reduzir Zoom', disabled: !openedDocument },
        { id: 'view-fit', label: 'Ajustar ao Canvas', disabled: !openedDocument },
        { id: 'view-reset', label: 'Resetar Viewport', disabled: !openedDocument }
      ],
      tools: [
        { id: 'tool-select', label: 'Selecionar' },
        { id: 'tool-pan', label: 'Mover (Pan)' },
        { id: 'tool-zoom', label: 'Zoom' },
        { id: 'tool-join', label: 'Unir (Weld)' },
        { id: 'tool-join-apply', label: 'Aplicar Weld', disabled: !weldCanApply },
        { id: 'tool-mirror', label: 'Espelhar' },
        { id: 'tool-rotate', label: 'Rotacionar' },
        { id: 'tool-scale', label: 'Escalar' },
        { id: 'tool-offset', label: 'Offset' },
        { id: 'tool-extend', label: 'Estender' },
        { id: 'tool-trim', label: 'Aparar' },
        { id: 'tool-mirror-apply', label: 'Aplicar Espelhar', disabled: selectedEntityCount !== 1 }
      ],
      help: [
        { id: 'help-shortcuts', label: 'Atalhos Basicos' },
        { id: 'help-about', label: 'Sobre o Editor CAD' }
      ],
      config: [
        { id: 'config-open', label: 'Configuracoes do Sistema...' }
      ]
    })
  },
  viewerController: {
    clearSelectedEntitiesNotice: 'Selecao de entidades limpa.',
    buildSelectionChangeNotice: ({
      primaryEntity,
      selectedEntitiesCount
    }: {
      primaryEntity: { type: string; layer: string } | null;
      selectedEntitiesCount: number;
    }) => (
      primaryEntity
        ? selectedEntitiesCount > 1
          ? `${selectedEntitiesCount} entidades selecionadas.`
          : `Entidade selecionada: ${primaryEntity.type} na camada ${primaryEntity.layer}.`
        : 'Nenhuma entidade selecionada.'
    ),
    translateSelectionErrorNotice: 'Nao foi possivel mover a selecao atual.',
    buildTranslateSelectionNotice: ({
      entityType,
      selectedEntitiesCount,
      deltaX,
      deltaY
    }: {
      entityType: string;
      selectedEntitiesCount: number;
      deltaX: number;
      deltaY: number;
    }) => `${selectedEntitiesCount > 1 ? `${selectedEntitiesCount} entidades movidas` : `Entidade ${entityType} movida`} em X ${deltaX.toFixed(3)} / Y ${deltaY.toFixed(3)}.`,
    copySelectionErrorNotice: 'Nao foi possivel copiar a selecao atual.',
    buildCopySelectionNotice: ({
      entityType,
      selectedEntitiesCount,
      deltaX,
      deltaY
    }: {
      entityType: string;
      selectedEntitiesCount: number;
      deltaX: number;
      deltaY: number;
    }) => `${selectedEntitiesCount > 1 ? `${selectedEntitiesCount} entidades copiadas` : `Entidade ${entityType} copiada`} em X ${deltaX.toFixed(3)} / Y ${deltaY.toFixed(3)}.`,
    transformSelectionErrorNotice: 'Nao foi possivel transformar a selecao atual.',
    buildTransformSelectionNotice: ({
      entityType,
      selectedEntitiesCount,
      previewTransform
    }: {
      entityType: string;
      selectedEntitiesCount: number;
      previewTransform: EntityPreviewTransform;
    }) => (
      previewTransform.mode === 'rotate'
        ? `${selectedEntitiesCount > 1 ? `${selectedEntitiesCount} entidades rotacionadas` : `Entidade ${entityType} rotacionada`} em ${previewTransform.rotationDegrees.toFixed(1)}°.`
        : previewTransform.mode === 'scale'
          ? `${selectedEntitiesCount > 1 ? `${selectedEntitiesCount} entidades redimensionadas` : `Entidade ${entityType} redimensionada`} com escala X ${previewTransform.scaleX.toFixed(3)} / Y ${previewTransform.scaleY.toFixed(3)}.`
          : `${selectedEntitiesCount > 1 ? `${selectedEntitiesCount} entidades transformadas` : `Entidade ${entityType} transformada`}.`
    ),
    buildOffsetSelectionNotice: ({
      entityType,
      distance
    }: {
      entityType: string;
      distance: number;
    }) => `Offset aplicado em ${Math.abs(distance).toFixed(3)} para ${entityType}.`,
    editNodeSelectionErrorNotice: 'Nao foi possivel editar o no selecionado.',
    buildEditNodeSelectionNotice: ({
      role,
      targetPoint,
      snappedToEntityId
    }: {
      role: 'start' | 'end';
      targetPoint: { x: number; y: number };
      snappedToEntityId?: string | null;
    }) => (
      snappedToEntityId
        ? `No ${role === 'start' ? 'inicial' : 'final'} ajustado e aproximado de outra extremidade.`
        : `No ${role === 'start' ? 'inicial' : 'final'} atualizado em X ${targetPoint.x.toFixed(3)} / Y ${targetPoint.y.toFixed(3)}.`
    ),
    extendSelectionErrorNotice: 'Nao foi possivel estender a entidade selecionada.',
    buildExtendSelectionNotice: ({
      role,
      vertexIndex,
      targetPoint
    }: {
      role: 'start' | 'end';
      vertexIndex?: number;
      targetPoint: { x: number; y: number };
    }) => (
      typeof vertexIndex === 'number'
        ? `Estender aplicado no vertice ${vertexIndex + 1} em X ${targetPoint.x.toFixed(3)} / Y ${targetPoint.y.toFixed(3)}.`
        : `Estender aplicado no no ${role === 'start' ? 'inicial' : 'final'} em X ${targetPoint.x.toFixed(3)} / Y ${targetPoint.y.toFixed(3)}.`
    ),
    trimSelectionErrorNotice: 'Nao foi possivel aparar a entidade selecionada.',
    buildTrimSelectionNotice: ({
      sourceEntityType,
      segmentIndex,
      splitPoint
    }: {
      sourceEntityType: string;
      segmentIndex: number;
      splitPoint: { x: number; y: number };
    }) => {
      const targetLabel = sourceEntityType === 'ARC'
        ? 'no arco'
        : sourceEntityType === 'CIRCLE'
          ? 'no circulo'
          : `no segmento ${segmentIndex + 1}`;
      return `Aparar aplicado ${targetLabel} em X ${splitPoint.x.toFixed(3)} / Y ${splitPoint.y.toFixed(3)}.`;
    },
    drawRequiresDocumentNotice: 'Inicie um novo desenho ou abra um DXF antes de desenhar.',
    drawCompletedNotice: 'Operacao concluida.',
    buildEntitiesDrawnNotice: ({
      entityCount,
      mode
    }: {
      entityCount: number;
      mode: string;
    }) => `${entityCount} entidade(s) criada(s) com a ferramenta ${mode}.`
  },
  modifyController: {
    mirrorRequiresSingleSelectionNotice: 'Selecione apenas uma entidade antes de aplicar Espelhar.',
    mirrorEntityNotFoundNotice: 'Nao foi possivel localizar a entidade selecionada para espelhar.',
    buildMirrorAppliedNotice: ({ entityType }: { entityType: string }) => `Entidade ${entityType} espelhada no proprio eixo vertical.`,
    weldRequiresDocumentNotice: 'Abra um DXF antes de aplicar Weld.',
    buildWeldBuildChainErrorNotice: ({ weldTolerance }: { weldTolerance: number }) => (
      `Nao foi possivel montar a cadeia de Weld com tolerancia de ${weldTolerance.toFixed(2)}.`
    ),
    buildWeldAppliedNotice: ({
      mergedCount,
      vertexCount,
      gap
    }: {
      mergedCount: number;
      vertexCount: number;
      gap: number;
    }) => `Weld aplicado para ${mergedCount} entidades. Polilinha resultante com ${vertexCount} vertices e gap total ${gap.toFixed(3)}.`
  },
  entityActions: {
    paintSelectionRequiredNotice: 'Selecione ao menos uma entidade para pintar.',
    buildApplySelectedEntityColorsNotice: ({
      selectedEntitiesCount,
      entityType
    }: {
      selectedEntitiesCount: number;
      entityType: string;
    }) => (
      selectedEntitiesCount > 1
        ? `${selectedEntitiesCount} entidades atualizadas com a pintura atual.`
        : `Entidade ${entityType} atualizada com a pintura atual.`
    ),
    clearFillSelectionRequiredNotice: 'Selecione ao menos uma entidade para limpar o preenchimento.',
    buildClearSelectedEntityFillNotice: ({
      selectedEntitiesCount,
      entityType
    }: {
      selectedEntitiesCount: number;
      entityType: string;
    }) => (
      selectedEntitiesCount > 1
        ? `Preenchimento removido de ${selectedEntitiesCount} entidades.`
        : `Preenchimento removido da entidade ${entityType}.`
    ),
    removeSelectionErrorNotice: 'Nao foi possivel remover a selecao atual.',
    buildRemoveSelectedEntitiesNotice: ({
      removedCount,
      entityType
    }: {
      removedCount: number;
      entityType: string;
    }) => (
      removedCount > 1
        ? `${removedCount} entidades removidas.`
        : `Entidade ${entityType} removida.`
    ),
    duplicateSelectionErrorNotice: 'Nao foi possivel duplicar a selecao atual.',
    buildDuplicateSelectedEntitiesNotice: ({
      duplicatedEntitiesCount,
      entityType,
      duplicateOffset
    }: {
      duplicatedEntitiesCount: number;
      entityType: string;
      duplicateOffset: number;
    }) => (
      duplicatedEntitiesCount > 1
        ? `${duplicatedEntitiesCount} entidades duplicadas com deslocamento ${duplicateOffset.toFixed(3)}.`
        : `Entidade ${entityType} duplicada com deslocamento ${duplicateOffset.toFixed(3)}.`
    ),
    copySelectionErrorNotice: 'Nao foi possivel copiar a selecao atual.',
    buildCopySelectedEntitiesNotice: ({
      copiedEntitiesCount,
      entityType
    }: {
      copiedEntitiesCount: number;
      entityType: string;
    }) => (
      copiedEntitiesCount > 1
        ? `${copiedEntitiesCount} entidades copiadas para a area de transferencia do editor.`
        : `Entidade ${entityType} copiada para a area de transferencia do editor.`
    ),
    cutSelectionErrorNotice: 'Nao foi possivel recortar a selecao atual.',
    buildCutSelectedEntitiesNotice: ({
      cutCount,
      entityType
    }: {
      cutCount: number;
      entityType: string;
    }) => (
      cutCount > 1
        ? `${cutCount} entidades recortadas para a area de transferencia do editor.`
        : `Entidade ${entityType} recortada para a area de transferencia do editor.`
    ),
    bringToFrontUnavailableNotice: 'A selecao ja esta na frente da pilha visual.',
    buildBringToFrontNotice: ({
      selectedEntitiesCount,
      entityType
    }: {
      selectedEntitiesCount: number;
      entityType: string;
    }) => (
      selectedEntitiesCount > 1
        ? `${selectedEntitiesCount} entidades trazidas para frente.`
        : `Entidade ${entityType} trazida para frente.`
    ),
    bringForwardUnavailableNotice: 'A selecao ja esta no nivel mais alto possivel.',
    buildBringForwardNotice: ({
      selectedEntitiesCount,
      entityType
    }: {
      selectedEntitiesCount: number;
      entityType: string;
    }) => (
      selectedEntitiesCount > 1
        ? `${selectedEntitiesCount} entidades avancadas um nivel na pilha visual.`
        : `Entidade ${entityType} avancada um nivel na pilha visual.`
    ),
    sendToBackUnavailableNotice: 'A selecao ja esta atras na pilha visual.',
    buildSendToBackNotice: ({
      selectedEntitiesCount,
      entityType
    }: {
      selectedEntitiesCount: number;
      entityType: string;
    }) => (
      selectedEntitiesCount > 1
        ? `${selectedEntitiesCount} entidades enviadas para tras.`
        : `Entidade ${entityType} enviada para tras.`
    ),
    sendBackwardUnavailableNotice: 'A selecao ja esta no nivel mais baixo possivel.',
    buildSendBackwardNotice: ({
      selectedEntitiesCount,
      entityType
    }: {
      selectedEntitiesCount: number;
      entityType: string;
    }) => (
      selectedEntitiesCount > 1
        ? `${selectedEntitiesCount} entidades recuadas um nivel na pilha visual.`
        : `Entidade ${entityType} recuada um nivel na pilha visual.`
    ),
    buildPasteCopiedEntitiesNotice: ({
      pastedEntitiesCount,
      pasteOffset
    }: {
      pastedEntitiesCount: number;
      pasteOffset: number;
    }) => (
      pastedEntitiesCount > 1
        ? `${pastedEntitiesCount} entidades coladas com deslocamento ${pasteOffset.toFixed(3)}.`
        : `Entidade colada com deslocamento ${pasteOffset.toFixed(3)}.`
    ),
    groupSelectionRequiredNotice: 'Selecione ao menos duas entidades para agrupar.',
    buildGroupSelectedEntitiesNotice: ({ groupedEntitiesCount }: { groupedEntitiesCount: number }) => (
      groupedEntitiesCount > 1
        ? `${groupedEntitiesCount} entidades agrupadas.`
        : 'Entidade agrupada.'
    ),
    ungroupSelectionRequiredNotice: 'Selecione ao menos uma entidade agrupada para desagrupar.',
    buildUngroupSelectedEntitiesNotice: ({ ungroupedEntitiesCount }: { ungroupedEntitiesCount: number }) => (
      ungroupedEntitiesCount > 1
        ? `${ungroupedEntitiesCount} entidades desagrupadas.`
        : 'Entidade desagrupada.'
    )
  },
  guideController: {
    buildGuideToggleLockedNotice: ({
      orientation,
      locked
    }: {
      orientation: 'vertical' | 'horizontal';
      locked: boolean;
    }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} ${locked ? 'travada' : 'destravada'}.`,
    buildGuideLockedToRemoveNotice: ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} travada. Destrave para remover.`,
    clearSelectedGuideNotice: 'Guia desmarcada.',
    buildGuideLockedNotice: ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} travada.`,
    buildGuideSelectedNotice: ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} selecionada.`,
    buildEntityContextMenuNotice: ({
      nearestEntityType,
      selectedEntitiesCount,
      selectedEntityType
    }: {
      nearestEntityType: string | null;
      selectedEntitiesCount: number;
      selectedEntityType: string | null;
    }) => (
      nearestEntityType
        ? `Menu contextual da entidade ${nearestEntityType} aberto.`
        : selectedEntitiesCount > 1
          ? `Menu contextual de ${selectedEntitiesCount} entidades aberto.`
          : `Menu contextual da entidade ${selectedEntityType || 'selecionada'} aberto.`
    ),
    buildGuideContextMenuNotice: ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => `Menu contextual da guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} aberto.`,
    horizontalGuideLockedToMoveNotice: 'Guia horizontal travada. Destrave para mover.',
    verticalGuideLockedToMoveNotice: 'Guia vertical travada. Destrave para mover.',
    buildGuideRemovedNotice: ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} removida.`,
    buildGuideCreationCancelledNotice: ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => `Criacao da guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} cancelada.`,
    buildGuideRepositionedNotice: ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} reposicionada.`,
    buildGuideCreatedNotice: ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} criada.`
  },
  textToolController: {
    buildApplyTextToolPresetNotice: ({
      presetLabel,
      targetLayerLabel
    }: {
      presetLabel: string;
      targetLayerLabel: string;
    }) => `Preset de texto aplicado: ${presetLabel} na camada ${targetLayerLabel}.`,
    buildRestoreSelectedTextToolPresetNotice: ({ presetLabel }: { presetLabel: string }) => `Preset de texto restaurado: ${presetLabel}.`
  },
  layoutController: {
    resetRulerOriginNotice: 'Zero da regua restaurado para a origem do desenho.'
  },
  keyboardShortcuts: {
    clearSelectedGuideNotice: 'Guia desmarcada.',
    buildGuideLockedToRemoveNotice: ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} travada. Destrave para remover.`,
    buildGuideRemovedNotice: ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} removida.`,
    clearSelectedEntitiesNotice: 'Selecao de entidades limpa.'
  },
  toolController: {
    defaultActiveToolLabel: 'Selecionar',
    buildActivateToolNotice: ({ toolLabel }: { toolLabel: string }) => `Ferramenta ativa: ${toolLabel}.`,
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
    }: {
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
      drawingTextAlignment: string;
      drawingTextVerticalAlignment: string;
      annotationLayerName: string;
      weldReason: string;
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
        case 'trim':
          return `Selecione uma Linha, Polilinha aberta ou Arco, aproxime o cursor da ponta, vertice ou segmento que deseja aparar e clique para confirmar. Enter aplica o preview atual ate a primeira interseccao no segmento ou no percurso do arco com Linha, Polilinha, Circulo ou Arco.${snapSummary}`;
        case 'mirror':
          return `Selecione uma entidade para ver o preview do espelhamento. Clique confirma ou Enter aplica no eixo vertical da propria selecao.${snapSummary}`;
        case 'join':
          return `Selecione duas ou mais entidades para unir. O preview do weld aparece no canvas; clique confirma ou Enter aplica. ${weldReason}${snapSummary}`;
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
    }: {
      openedDocumentName: string | null;
      activeToolLabel: string;
      selectedEntitiesCount: number;
      activeToolId: string;
      weldReason: string;
    }) => (
      openedDocumentName
        ? `Arquivo aberto no editor: ${openedDocumentName}. Ferramenta ativa: ${activeToolLabel}. Selecao atual: ${selectedEntitiesCount || 0} entidade(s). ${activeToolId === 'join' ? weldReason : ''}`.trim()
        : `Editor CAD independente carregado sem arquivo. Use o menu Arquivos para criar um novo desenho ou abrir um arquivo local. Ferramenta ativa: ${activeToolLabel}.`
    )
  }
} as const;
