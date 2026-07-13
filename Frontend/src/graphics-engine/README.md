# Graphics Engine

Este diretorio e a fronteira canonicamente reaproveitavel do motor grafico.

## Objetivo

- isolar o motor CAD/2D do restante do produto `GeoLimites`
- permitir reaproveitamento gradual no futuro SaaS do `Sigeve Studio`
- reduzir acoplamento entre UI de negocio e motor de desenho

## Regra de ouro

Tudo que for parte do motor grafico deve passar a nascer aqui ou ser exposto por esta camada.

## API publica atual

- `@/graphics-engine/components/viewer-dxf`
- `@/graphics-engine`
- `@/graphics-engine/shared/*`
- `@/graphics-engine/adapters/geolimites/GeoLimitesCadEditor`
- `@/graphics-engine/adapters/geolimites/GeoLimitesViewerDXF`

## Estrutura atual

- `components/`: viewer, canvas, overlays, selecao e renderer
- `pages/`: shell do editor CAD, paineis, comandos e hooks de orquestracao
- `shared/`: contratos e utilitarios-base reaproveitaveis do motor
- `adapters/geolimites/`: ponte atual para servicos do `GeoLimites`

## Fronteira desejada

- `components/`: viewer, canvas, overlays, selecao, snapping, renderer
- `pages/`: shells de editor, paineis, comandos e hooks de orquestracao
- `shared/`: tipos, contratos e adaptadores neutros de dominio
- `adapters/`: pontos de integracao com produtos como `GeoLimites` e `Sigeve Studio`

## O que ja foi separado

- o `graphics-engine` virou o source of truth do CAD
- os wrappers legados de `src/pages/cad-editor/*` foram removidos apos a consolidacao no `graphics-engine`
- os wrappers legados de `src/components/viewer-dxf/*` foram removidos apos a consolidacao no `graphics-engine`
- imports internos do motor para DXF, geometria, exportacao e tipos corretivos passaram a usar `shared`
- o carregamento HTTP de DXF ficou isolado em `adapters/geolimites/dxfTransport.ts`
- tipos de landmarks e do modo corretivo do viewer agora ficaram centralizados em contratos neutros de `shared`
- os dados derivados e callbacks do modo corretivo/georreferenciamento do viewer foram agrupados em `adapters/geolimites/useGeoLimitesViewerIntegration.ts`
- o historico e a execucao das correcoes do modo corretivo foram agrupados em `adapters/geolimites/useGeoLimitesCorrectiveExecution.ts`
- a deteccao e a filtragem de lotes a partir do DXF foram agrupadas em `adapters/geolimites/useGeoLimitesLotDetection.ts`
- a composicao da selecao confirmada e o disparo do resumo tecnico foram agrupados em `adapters/geolimites/useGeoLimitesSelectionSummary.ts`
- o shell inicial do `CadEditor` para boot, persistencia e navegacao foi agrupado em `adapters/geolimites/useGeoLimitesCadEditorShell.ts`
- a fronteira de documento e arquivo do `CadEditor` foi agrupada em `adapters/geolimites/useGeoLimitesCadEditorDocumentController.ts`
- a composicao de chrome e apresentacao de comandos do `CadEditor` foi agrupada em `adapters/geolimites/useGeoLimitesCadEditorChrome.ts`
- os textos de host e o controller de comandos do `CadEditor` passaram a ser expostos por `adapters/geolimites/cadEditorHostTexts.ts` e `adapters/geolimites/useGeoLimitesCadEditorCommandController.ts`
- os hints e textos operacionais do `useCadEditorToolController` passaram a ser compostos por `adapters/geolimites/useGeoLimitesCadEditorToolController.ts`
- a apresentacao de menus, titulo lateral e estado vazio do `CadEditor` passou a ser injetada pelo adapter `GeoLimites`
- mensagens de documento, labels do configurador, status do chrome e parte dos labels do painel direito do `CadEditor` passaram a ser compostos pelo adapter `GeoLimites`
- o `TextDialog`, o `StatusBar` e os paineis `view/layers/info` do `RightSidebar` agora consomem textos vindos do adapter `GeoLimites`
- notices de `useCadEditorUiActionController` e mensagens operacionais do desenho embutido em `ViewerDXF`/`useViewerCanvasInteractions` passaram a ser compostos pelo adapter `GeoLimites`
- `useCadEditorStateSync`, `ViewerHeaderPanel` e os textos principais de HUD do `useViewerCanvasRenderer` agora tambem consomem composicao textual do adapter `GeoLimites`
- os fallbacks genericos dos hooks/componentes base foram consolidados em defaults locais e o painel flutuante `point-to-point` mais os badges corretivos do renderer passaram a usar o catalogo textual do adapter `GeoLimites`
- `CadEditorRightSidebar`, `CadEditorTextDialog` e os defaults/notices restantes de `useViewerCanvasInteractions` passaram a usar `resolvedTexts`/`resolvedMessages`, reduzindo ainda mais os fallbacks inline espalhados no motor
- `CadEditorStatusBar`, `CadEditorSettingsDialog`, `useCadEditorDocumentController` e `useCadEditorChromeViewModel` agora seguem o mesmo padrao com defaults locais resolvidos, mantendo o adapter `GeoLimites` como composicao principal de host
- `useCadEditorToolController`, `useCadEditorViewerController` e `useCadEditorCommandPresentation` agora tambem usam defaults locais resolvidos, enquanto o `CadEditor` passou a consumir `useGeoLimitesCadEditorViewerController.ts` como borda explicita de host para notices operacionais do viewer
- `useCadEditorModifyController` e `useCadEditorEntityActions` agora tambem expõem defaults locais resolvidos, enquanto o `CadEditor` consome `useGeoLimitesCadEditorModifyController.ts` e `useGeoLimitesCadEditorEntityActions.ts` para mirror, weld, clipboard e ordenacao visual
- `useCadEditorGuideController`, `useCadEditorTextToolController`, `useCadEditorLayoutController` e `useCadEditorKeyboardShortcuts` agora tambem seguem o padrao de defaults locais resolvidos, com composicao de notices feita pelo adapter `GeoLimites` via wrappers dedicados do shell
- o `ViewerDXF` base deixou de importar hooks e defaults de runtime do `GeoLimites` diretamente; agora essas dependencias entram por um contrato de host e pelo wrapper `adapters/geolimites/GeoLimitesViewerDXF.tsx`, que passou a ser a porta publica usada por `Viewer`, `GeoLimitesCadEditor` e pela compatibilidade do barrel `src/graphics-engine/index.ts`
- o shell do editor passou a ter um componente base agnostico em `pages/cad-editor/CadEditorBase.tsx`, enquanto a composicao de host atual foi movida para `adapters/geolimites/GeoLimitesCadEditor.tsx`
- o barrel `src/graphics-engine/index.ts` deixou de expor um editor/viewer concretos do `GeoLimites` como API principal; agora ele publica `CadEditorBase`, `ViewerDXF` e os contratos de host do motor
- os contratos de viewer/corretivo (`PropertyLandmarkView`, historico/sugestao corretiva, inspeção e snapshot restaurado) sairam do adapter e foram promovidos para `shared/viewer-corrective.ts`
- `Viewer.tsx` passou a consumir `CorrectiveDraftOperation` diretamente de `shared/viewer-corrective.ts`, o barrel `adapters/geolimites/index.ts` deixou de expor contratos-base e o arquivo legado `viewerTypes.ts` foi removido; com isso, os imports remanescentes do adapter no codigo ativo ficaram restritos a composicao de host
- o contrato de host do `ViewerDXF` (`ViewerDXFHostAdapter`, tipos auxiliares e defaults locais) saiu do componente base e foi movido para `components/viewer-dxf/hostAdapter.ts`, enquanto `GeoLimitesViewerDXF.tsx` passou a consumir esse modulo neutro diretamente
- o bloco corretivo de `ViewerDXFProps` saiu de `components/viewer-dxf/types.ts` e foi isolado em `components/viewer-dxf/correctiveProps.ts`, reduzindo a mistura entre props-base do engine e integracao corretiva do host
- os shapes de selecao, confronto, referencia e georreferenciamento do viewer sairam de `components/viewer-dxf/types.ts` e foram agrupados em `components/viewer-dxf/viewerState.ts`, deixando `types.ts` mais focado em contratos-base do componente
- os contratos auxiliares de viewport, overlays, snap guides e payloads de desenho/texto sairam de `components/viewer-dxf/types.ts` e foram agrupados em `components/viewer-dxf/viewerContracts.ts`; junto com isso, `DXFVertex` e `DXFEntityProperties` deixaram de ser duplicados no viewer e passaram a vir de `shared/dxf`

## Estrategia de migracao

1. parar de importar wrappers de compatibilidade de `src/pages` e `src/components` nos pontos de entrada do app
2. usar `src/graphics-engine` como API publica do motor e `adapters/*` como composicao explicita de host
3. migrar implementacoes internas aos poucos, removendo duplicacoes
4. deixar regras de negocio especificas de produto fora do motor

## O que nao deve entrar aqui

- fluxo de memorial
- creditos
- cadastro de imoveis
- integracoes especificas do `GeoLimites`

## Proxima etapa recomendada

- considerar encerrada a limpeza principal das entradas publicas do motor e revisar se ainda vale manter wrappers de compatibilidade fora de `graphics-engine`
- revisar os proximos contratos de `components/viewer-dxf/types.ts` que ainda podem sair para modulos dedicados, agora que `hostAdapter.ts`, `correctiveProps.ts`, `viewerState.ts` e `viewerContracts.ts` isolaram quase toda a superficie auxiliar do viewer
- criar `adapters/studio/` quando a bancada do SaaS iniciar
- migrar utilitarios puramente geometricos para implementacao nativa do motor, deixando `shared` sem ponte para `src/utils`
