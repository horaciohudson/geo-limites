# MVP do Editor Corretivo

## Objetivo

Transformar o visualizador atual do `GeoLimites` em um `editor corretivo minimo`, capaz de:

- evidenciar o erro tecnico no proprio desenho
- abrir um modo de correcao sem sair do fluxo
- aplicar ajustes localizados e auditaveis
- reprocessar o `Resumo Tecnico`
- decidir se o memorial pode seguir com a versao corrigida

Este MVP nao pretende editar o DXF original como um CAD generico.

## Decisao Central

O MVP deve editar um `snapshot tecnico corrigido`, derivado da leitura atual do arquivo, e nao tentar:

- sobrescrever o DXF original logo na primeira entrega
- replicar comandos amplos de CAD
- suportar qualquer operacao vetorial fora do fluxo `DXF -> Resumo Tecnico -> Memorial`

## Problema que o MVP resolve

Hoje o fluxo consegue:

- carregar o DXF
- detectar vertices, segmentos, textos e lotes reconhecidos
- gerar `Resumo Tecnico`

Mas ele ainda nao oferece um passo operacional entre:

1. detectar o problema
2. corrigir o problema
3. revalidar o resultado

O MVP fecha exatamente esse intervalo.

## Escopo da Primeira Onda

O primeiro objetivo nao e "fazer um CAD".

O primeiro objetivo e entregar o fluxo:

`Visualizador -> Corrigir -> Salvar snapshot -> Revalidar resumo`

com foco em problemas localizados e geometricamente claros.

## UX Proposta

### Entrada no modo corretivo

O usuario entra no modo corretivo por um CTA visivel no `Viewer`, por exemplo:

- `Corrigir arquivo`
- `Corrigir lote`
- `Resolver bloqueantes`

Esse CTA deve aparecer quando houver:

- `PENDENTE`
- `APROVADO_COM_RESSALVAS` com aviso forte
- lote com geometria suspeita

### Layout da tela

O layout inicial pode continuar dentro da mesma pagina do `Viewer`, com tres areas:

1. barra superior
   - arquivo ativo
   - modo atual: `Visualizar` ou `Corrigir`
   - botoes `Salvar snapshot`, `Revalidar`, `Descartar`

2. canvas central
   - desenho atual
   - vertices, segmentos e textos selecionaveis
   - destaque visual do problema

3. painel lateral direito
   - lista de problemas detectados
   - ferramenta ativa
   - historico local da correcao em andamento
   - resumo do que mudou

## Estados Minimos do Frontend

O MVP deve nascer com um conjunto pequeno de estados adicionais ao `ViewerDXF` atual:

- `viewerMode`
  - `view`
  - `correct`

- `selectedIssueId`
  - qual erro tecnico esta em foco

- `selectedLotId`
  - qual lote esta sendo corrigido

- `correctiveSnapshot`
  - copia editavel da geometria reconhecida

- `draftOperations`
  - lista de operacoes aplicadas pelo usuario

- `activeTool`
  - `inspect`
  - `join-endpoints`
  - `move-vertex`
  - `close-gap-guided`

- `revalidationResult`
  - resultado do novo `Resumo Tecnico`

- `hasUnsavedChanges`
  - indica se houve alteracao ainda nao salva

## Modelo de Correcao

Na primeira entrega, o frontend nao precisa editar o DXF bruto.

Ele pode trabalhar sobre um modelo tecnico reduzido:

- `vertices`
- `segments`
- `texts`
- `detectedPolygons`
- `annotations`
- `referencePoints`

Cada correcao deve gerar uma operacao explicita, por exemplo:

- `MOVE_VERTEX`
- `JOIN_ENDPOINTS`
- `CREATE_CLOSING_SEGMENT`
- `REASSOCIATE_TEXT_TO_SEGMENT`

Isso permite:

- reabrir a versao corrigida
- auditar o que mudou
- comparar antes e depois

## Ferramentas da Primeira Onda

### 1. Inspecao de abertura

Funcao:

- destacar pontas abertas
- mostrar distancia entre extremidades proximas
- indicar se a abertura parece pequena e localizada

Valor:

- torna visivel o problema
- reduz tentativa cega de correcao

### 2. Unir pontas proximas

Funcao:

- selecionar duas extremidades
- unir quando a distancia estiver dentro de tolerancia segura

Regra:

- so habilitar quando a intencao geometrica parecer clara
- registrar a distancia original antes da uniao

Valor:

- resolve casos de snap falho
- ataca diretamente poligonos quase fechados

### 3. Mover vertice

Funcao:

- arrastar um vertice ate um ponto de snap valido
- atualizar segmentos adjacentes

Regra:

- mostrar preview antes de confirmar
- limitar o movimento a um contexto local

Valor:

- resolve deslocamentos pequenos
- reaproveita o snapping ja existente no `ViewerDXF`

### 4. Fechamento guiado

Funcao:

- criar um segmento final entre duas pontas abertas

Regra:

- usar apenas quando faltar um fechamento obvio
- exigir confirmacao do usuario

Valor:

- cobre o caso classico de lote quase fechado

## Ferramentas que ficam fora deste MVP

- trim generico
- offset
- hatch
- edicao livre de layer como CAD generico
- copiar, espelhar, rotacionar em massa
- desenho vetorial aberto para qualquer entidade
- edicao completa de textos com comportamento de CAD

## Reaproveitamento do Viewer atual

O MVP deve aproveitar ao maximo o que ja existe:

- `snapping` de pontos
- hover de vertices
- selecao de poligonos
- selecao de textos
- selecao de trechos
- carga e parse do DXF
- disparo de `Resumo Tecnico`

O ganho esperado e evoluir o `ViewerDXF` para dois modos:

- `modo leitura`
- `modo corretivo`

sem criar uma tela paralela totalmente nova logo de inicio.

## Fluxo Operacional do MVP

1. usuario abre o DXF no `Viewer`
2. sistema gera `Resumo Tecnico`
3. usuario escolhe um lote ou bloqueante
4. usuario clica em `Corrigir`
5. sistema abre o modo corretivo com destaque do problema
6. usuario aplica uma ou mais operacoes
7. sistema salva `snapshot tecnico corrigido`
8. usuario clica em `Revalidar`
9. sistema roda novo `Resumo Tecnico`
10. usuario compara antes e depois

## Estrategia de Implementacao

### Etapa 1 - Casca do modo corretivo

Entregar:

- alternancia `Visualizar` x `Corrigir`
- painel lateral de erros
- destaque do erro selecionado
- modelo local de `draftOperations`

### Etapa 2 - Ferramentas geometricas minimas

Entregar:

- `join-endpoints`
- `move-vertex`
- `close-gap-guided`

### Etapa 3 - Persistencia

Entregar:

- serializacao do `correctiveSnapshot`
- historico minimo de operacoes
- reabertura do snapshot

### Etapa 4 - Revalidacao

Entregar:

- botao `Revalidar`
- comparativo antes/depois
- lista de bloqueantes resolvidos

## Criterio de Sucesso do MVP

O MVP sera considerado valido se conseguir:

- reduzir a necessidade de sair para o AutoCAD em casos simples
- corrigir pelo menos um lote aberto de forma controlada
- reprocessar o `Resumo Tecnico` com melhora objetiva
- manter rastreabilidade da correcao

## Criterio de Rejeicao

O MVP deve ser revisto se:

- a maioria dos casos exigir redesenho amplo
- o usuario gastar mais tempo que no AutoCAD
- a correcao local gerar geometria ambigua
- o sistema esconder erro em vez de torna-lo auditavel

## Primeira Entrega Recomendada

Se for preciso cortar ainda mais o escopo, a primeira entrega deve conter apenas:

- entrada no modo corretivo
- destaque de abertura
- ferramenta `unir pontas proximas`
- ferramenta `mover vertice`
- botao `Revalidar resumo`

Isso ja e suficiente para provar se o `editor corretivo` vale a pena antes de ampliar o escopo.
