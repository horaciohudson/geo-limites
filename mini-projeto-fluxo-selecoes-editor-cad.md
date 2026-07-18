# Mini Projeto: Organizar o Fluxo de Selecoes no Editor CAD

## Objetivo
Fazer o fluxo de selecoes do Editor CAD obedecer uma ordem operacional clara e previsivel, sem misturar escopo territorial, escopo parcial de lotes e selecoes de confrontacao.

O objetivo desta frente e garantir que o sistema funcione assim:

1. a selecao `Primaria` sempre referencia o terreno;
2. quando o usuario trabalhar com todos os lotes, as selecoes seguintes serao de logradouros e confrontacoes;
3. quando o usuario trabalhar com apenas alguns lotes, a ordem obrigatoria sera:
   - `Primaria`;
   - selecao por pontos amarelos e fechamento em segmentos laranja;
   - selecoes roxas de ruas e confrontacoes.

## Problema atual
Hoje o editor ainda mistura conceitos diferentes no mesmo fluxo:

- a referencia territorial primaria;
- o recorte de apenas alguns lotes;
- a marcacao manual de revisao;
- a selecao de textos e segmentos de confrontacao.

Isso cria sintomas como:

- abertura visual poluida quando um estado compartilhado e reaproveitado;
- dificuldade para entender em que etapa o usuario esta;
- risco de as selecoes roxas valerem para o desenho inteiro mesmo quando o escopo deveria estar limitado a poucos lotes;
- pouca separacao entre "escopo do resumo" e "detalhamento das confrontacoes".

## Regra operacional canonica

### Fluxo A: Terreno + todos os lotes
1. `Primaria`: define o terreno de referencia.
2. `Logradouros`: usuario seleciona ruas/logradouros relevantes.
3. `Confrontacoes`: usuario seleciona textos e trechos roxos.
4. `Resumo Tecnico`: usa o terreno inteiro e as confrontacoes selecionadas.

### Fluxo B: Terreno + apenas alguns lotes
1. `Primaria`: define o terreno de referencia.
2. `Escopo parcial`: usuario marca os vertices amarelos e fecha o contorno do lote em laranja.
3. `Confrontacoes`: somente depois do escopo parcial confirmado entram as selecoes roxas.
4. `Resumo Tecnico`: usa apenas os lotes confirmados no escopo parcial e suas confrontacoes.

## Principio de implementacao
Cada etapa precisa ter estado proprio, sem reaproveitar o mesmo estado visual para significados diferentes.

Em especial:

- `Primaria` nao pode depender de estados de confrontacao;
- o `laranja` nao pode reutilizar estados usados pelo corretivo;
- o `roxo` nao deve nascer antes de existir um contexto valido de operacao;
- o resumo deve ler o fluxo confirmado, nao apenas o ultimo hover ou estados soltos do canvas.

## Estados funcionais propostos

### 1. Escopo territorial
Representa a selecao primaria do terreno.

**Responsabilidade**
- dizer qual e a base territorial da operacao;
- habilitar os proximos passos;
- continuar sendo obrigatorio em qualquer modo.

### 2. Escopo parcial de lotes
Representa os lotes escolhidos manualmente por pontos amarelos + fechamento laranja.

**Responsabilidade**
- existir apenas no fluxo de poucos lotes;
- alimentar `selectedLotNumbers` e a confirmacao de poligonos;
- limitar o que pode receber confrontacoes roxas.

### 3. Escopo de confrontacao
Representa ruas, textos e segmentos roxos.

**Responsabilidade**
- funcionar depois do escopo correto estar definido;
- no fluxo de todos os lotes, operar sobre o terreno inteiro;
- no fluxo parcial, operar apenas dentro dos lotes confirmados.

### 4. Revisao manual
Representa lotes marcados por `Alt+Clique`.

**Responsabilidade**
- continuar separado do escopo parcial;
- servir para inspeção e destaque de problema;
- nao interferir no fluxo laranja de poucos lotes.

## Frentes de trabalho

### Frente 1: Introduzir um modo operacional explicito de selecao
**Objetivo**
Criar uma camada de estado que diga em que fluxo o editor esta:

- `primaria_only`
- `full_lot_scope`
- `partial_lot_scope`
- `frontage_selection`

**Arquivos principais**
- [ViewerDXF.tsx](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/components/ViewerDXF.tsx)
- [useViewerCanvasInteractions.ts](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/components/viewer-dxf/useViewerCanvasInteractions.ts)
- [CadEditorBase.tsx](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/pages/cad-editor/CadEditorBase.tsx)

**Mudancas desejadas**
- criar um estado canonico do fluxo de selecao;
- impedir interacoes fora de ordem;
- expor mensagens operacionais claras no editor.

**Criterio de aceite**
- o editor sabe informar em que etapa esta;
- nao e mais possivel misturar laranja e roxo sem passar pela ordem correta.

**Status atual**
- Concluida no frontend.
- O editor passou a bloquear interacoes fora de ordem.
- O viewer embutido agora mostra o estado operacional atual no topo do canvas.

### Frente 2: Separar o escopo parcial dos demais estados do canvas
**Objetivo**
Criar um estado dedicado para os lotes escolhidos por pontos amarelos + fechamento laranja.

**Arquivos principais**
- [ViewerDXF.tsx](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/components/ViewerDXF.tsx)
- [useViewerCanvasInteractions.ts](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/components/viewer-dxf/useViewerCanvasInteractions.ts)
- [useViewerCanvasRenderer.ts](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/components/viewer-dxf/useViewerCanvasRenderer.ts)
- [useGeoLimitesCorrectiveExecution.ts](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/adapters/geolimites/useGeoLimitesCorrectiveExecution.ts)

**Mudancas desejadas**
- nao reutilizar `selectedPolygons` como cor ou estado de fluxo;
- criar um estado dedicado para o escopo parcial;
- desenhar o laranja apenas quando houver contorno parcial confirmado.

**Criterio de aceite**
- o arquivo abre limpo;
- o laranja aparece apenas no fluxo parcial;
- o corretivo nao interfere no escopo parcial.

**Status atual**
- Concluida no frontend.
- O arquivo voltou a abrir limpo.
- O escopo parcial ganhou estado proprio e o laranja ficou reservado ao contorno confirmado.

### Frente 3: Amarrar as selecoes roxas ao escopo ativo
**Objetivo**
Garantir que as selecoes roxas respeitem o contexto:

- terreno inteiro, no fluxo total;
- apenas lotes selecionados, no fluxo parcial.

**Arquivos principais**
- [useViewerCanvasInteractions.ts](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/components/viewer-dxf/useViewerCanvasInteractions.ts)
- [lotSelectionUtils.ts](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/components/viewer-dxf/lotSelectionUtils.ts)
- [useGeoLimitesSelectionSummary.ts](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/adapters/geolimites/useGeoLimitesSelectionSummary.ts)

**Mudancas desejadas**
- bloquear selecao roxa enquanto o escopo parcial estiver incompleto;
- limitar textos e segmentos roxos aos lotes confirmados quando houver recorte parcial;
- preservar o comportamento atual no fluxo de todos os lotes.

**Criterio de aceite**
- o roxo nao nasce antes do laranja no fluxo parcial;
- o roxo nao contamina lotes fora do recorte manual.

**Status atual**
- Concluida no frontend.
- O roxo fica bloqueado enquanto o contorno parcial estiver aberto.
- No fluxo parcial, textos e trechos roxos passam a respeitar o recorte confirmado.

### Frente 4: Fazer o resumo consumir o fluxo confirmado
**Objetivo**
Garantir que o resumo tecnico use exatamente a operacao concluida pelo usuario.

**Arquivos principais**
- [CadEditorBase.tsx](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/pages/cad-editor/CadEditorBase.tsx)
- [GeoLimitesCadEditor.tsx](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/adapters/geolimites/GeoLimitesCadEditor.tsx)
- [MemorialRequestDTO.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/dto/MemorialRequestDTO.java)
- [MemorialApiController.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/controller/MemorialApiController.java)
- [MemorialApiService.java](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialApiService.java)

**Mudancas desejadas**
- manter `selectedLotNumbers` como verdade do fluxo parcial;
- enviar confrontacoes somente do escopo confirmado;
- nao usar selecoes roxas soltas como se fossem globais quando houver recorte parcial.

**Criterio de aceite**
- no fluxo parcial, o resumo sai apenas com os lotes escolhidos;
- no fluxo total, o resumo continua aceitando confrontacoes globais sem perder cobertura.

**Status atual**
- Concluida no fluxo atual.
- O resumo tecnico continua usando `selectedLotNumbers` como verdade do recorte parcial.
- O dialogo e o painel tecnico agora exibem explicitamente se a geracao veio de fluxo total ou parcial.

### Frente 5: Dar retorno operacional claro para o usuario
**Objetivo**
Deixar o proprio editor explicito sobre a etapa atual.

**Arquivos principais**
- [ViewerHeaderPanel.tsx](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/components/viewer-dxf/ViewerHeaderPanel.tsx)
- [ViewerDXF.tsx](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/components/ViewerDXF.tsx)
- [CadEditorTechnicalSummaryDialog.tsx](file:///c:/Desenvolvimento/GeoLimites/Sistema/geo-limites/Frontend/src/graphics-engine/pages/cad-editor/CadEditorTechnicalSummaryDialog.tsx)

**Mudancas desejadas**
- mostrar status curto da etapa atual;
- indicar quando falta confirmar o escopo parcial;
- avisar quando o roxo ainda nao esta habilitado;
- resumir se a operacao esta em modo total ou parcial.

**Criterio de aceite**
- o usuario entende a ordem sem precisar adivinhar;
- erros de operacao por sequencia errada caem visivelmente.

**Status atual**
- Concluida no frontend.
- O viewer embutido mostra a etapa atual.
- O dialogo do resumo mostra o escopo da geracao.
- O painel tecnico por lote preserva esse mesmo contexto.

## Ordem sugerida de execucao
1. Introduzir o modo operacional explicito.
2. Separar o estado do escopo parcial.
3. Travar o roxo ao escopo ativo.
4. Conectar o resumo ao fluxo confirmado.
5. Melhorar o retorno visual e textual da etapa.

## Entregaveis
- fluxo canonico de selecao documentado no codigo;
- estado separado para `Primaria`, `escopo parcial` e `confrontacoes`;
- resumo tecnico obedecendo o fluxo total ou parcial;
- mensagens operacionais claras no editor.

## Progresso consolidado
- [x] regra operacional refletida no comportamento do viewer;
- [x] bloqueio de acoes fora de ordem;
- [x] escopo parcial separado do corretivo e do restante do canvas;
- [x] confrontacoes roxas respeitando o recorte parcial;
- [x] resumo tecnico, dialogo e painel exibindo o escopo total/parcial.

## Checklist de aceite
- [x] a operacao sempre comeca pela `Primaria`;
- [x] o fluxo total permite logradouros e confrontacoes apos a `Primaria`;
- [x] o fluxo parcial exige pontos amarelos + fechamento laranja antes do roxo;
- [x] o roxo no fluxo parcial fica limitado aos lotes confirmados;
- [x] o viewer abre limpo, sem preenchimentos indevidos;
- [x] o resumo respeita exatamente o escopo confirmado pelo usuario.

## Proxima execucao recomendada
Com a espinha principal concluida, a proxima execucao recomendada e fazer validacao guiada de uso real no editor:

1. testar fluxo total completo com `Primaria -> ruas -> confrontacoes -> resumo`;
2. testar fluxo parcial completo com `Primaria -> amarelos/laranja -> roxos -> resumo`;
3. revisar textos operacionais finos e pequenos ajustes de UX que aparecerem nesse teste;
4. depois disso, se necessario, endurecer regras estruturais no backend para lotes fora do padrao.
