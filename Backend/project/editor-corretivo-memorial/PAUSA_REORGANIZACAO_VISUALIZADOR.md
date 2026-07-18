# Handoff da Reorganizacao do Visualizador

Data: 2026-06-25

## Direcao Consolidada

O projeto nao foi convertido em um CAD generico.

A direcao consolidada ficou assim:

- manter o `Viewer` como visualizador tecnico com editor corretivo minimo
- preservar o pipeline `DXF -> Resumo Tecnico -> Memorial`
- deixar `Resumo Tecnico` e `Memorial` em pagina ou aba dedicada
- manter o `Viewer` principal focado em inspecao, navegacao e correcao guiada

## Estado Atual do Frontend

O `Viewer` foi reorganizado e hoje funciona como shell de composicao.

O fluxo corretivo continua disponivel com:

- modo `view` e `correct`
- leitura do `technicalSummaryJson` para gerar pendencias corretivas
- foco por lote e selecao de issue
- historico `undo/redo`
- rascunho de correcoes
- persistencia e reabertura de snapshot corretivo
- inspecao do lote em foco com medicoes geometricas
- sugestao automatica de correcao
- aplicacao da sugestao no canvas

## Arquitetura Atual

### Pagina principal

- `Frontend/src/pages/Viewer.tsx`
  - ficou responsavel principalmente por:
  - compor hooks de estado
  - derivar estado atual do fluxo corretivo
  - ligar callbacks entre pagina, painel e canvas
  - renderizar layouts e pagina dedicada de documento

### Hooks extraidos

- `Frontend/src/hooks/useViewerFileSelection.ts`
  - bootstrap de arquivos do viewer
  - selecao persistida
  - resolucao do arquivo atual

- `Frontend/src/hooks/useViewerPropertyDetails.ts`
  - carregamento de `propertyDetails`

- `Frontend/src/hooks/useDocumentGenerationState.ts`
  - estado e progresso de geracao

- `Frontend/src/hooks/useDocumentGenerationActions.ts`
  - geracao de memorial e resumo tecnico

- `Frontend/src/hooks/useViewerDocumentRequest.ts`
  - persistencia e bootstrap da rota dedicada de documento

- `Frontend/src/hooks/useCorrectiveSnapshots.ts`
  - snapshots corretivos
  - historico
  - comandos de sugestao
  - inspeção por lote

### Componentes extraidos do Viewer

- `Frontend/src/components/ViewerHeader.tsx`
- `Frontend/src/components/DocumentProcessingOverlay.tsx`
- `Frontend/src/components/CorrectivePanel.tsx`
- `Frontend/src/components/ViewerSingleFileLayout.tsx`
- `Frontend/src/components/ViewerMultiFileLayout.tsx`
- `Frontend/src/components/GeneratedDocumentPanel.tsx`
- `Frontend/src/components/DocumentWorkspaceShell.tsx`

### Utilitarios consolidados

- `Frontend/src/utils/memorialDocument.ts`
- `Frontend/src/utils/memorialPayload.ts`
- `Frontend/src/utils/documentExport.ts`
- `Frontend/src/utils/viewerCorrective.ts`

O arquivo `viewerCorrective.ts` agora concentra:

- `ViewerMode`
- `CorrectiveTool`
- `SuggestionConfidence`
- `CorrectiveIssueView`
- parsing do resumo tecnico para issues corretivas
- labels e textos auxiliares do modo corretivo

## Rotas e Experiencia

- `Viewer` principal:
  - inspeção do DXF
  - foco corretivo
  - abertura de documentos em nova aba

- `ViewerDocument`:
  - experiencia dedicada para `Resumo Tecnico` e `Memorial`
  - shell proprio para leitura e retorno ao visualizador

## Caso Piloto

Continuar usando como arquivo de referencia:

- `TESTE AGENTE_DBL TERRA NOBRE_2.dxf`

## Validacao Ja Feita

Durante a reorganizacao, cada etapa principal foi validada com:

- diagnosticos do TypeScript
- `npm run build` no frontend

Estado atual validado:

- build do frontend concluindo com sucesso
- permanece apenas o aviso conhecido do Vite sobre chunks grandes

## Proximo Passo Natural

Depois desta reorganizacao, o proximo passo mais coerente e retomar a evolucao do editor corretivo, priorizando:

- refinamento visual do painel corretivo
- destaque visual da correcao automatica aplicada
- possivel aplicacao em lote das sugestoes
- pequenos refinamentos finais no `Viewer` apenas se agregarem clareza real
