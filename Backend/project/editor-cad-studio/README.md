# Projeto Editor CAD Studio

## Objetivo

Criar uma nova frente de evolucao do GeoLimites baseada no Editor CAD do Studio, preservando o Visualizador atual apenas como referencia de pesquisa.

Esta frente parte de uma decisao de produto clara:

- o sistema precisa assumir que o problema e CAD
- o editor principal deve nascer a partir do Studio, que ja possui ferramentas maduras
- o DXF sera o formato padrao de intercambio tecnico
- o fluxo de Resumo Tecnico e Memorial passara a consumir o desenho corrigido pelo editor

## Contexto

O caminho centrado apenas no Visualizador evoluiu bem para analise, mas ficou fragil para lidar com casos reais de:

- lotes abertos
- blocos e atributos
- textos tecnicos ambiguos
- gaps geometricos pequenos
- selecao e correcao orientadas por entidade

Ao mesmo tempo, o Studio ja possui uma base forte de edicao CAD, com ferramentas e interacoes maduras.

## Tese do Projeto

Em vez de continuar expandindo heuristicas no Visualizador, o GeoLimites passa a abrir uma nova frente:

`DXF -> Editor CAD Studio -> DXF corrigido -> Resumo Tecnico -> Memorial`

O Visualizador continua existindo no sistema, mas nao e mais o lugar principal para resolver problemas geometricos profundos.

## Escopo Inicial

Esta frente pretende:

- criar um novo modulo `Editor CAD` no GeoLimites
- reaproveitar a experiencia e os conceitos do Studio
- manter o canvas e as interacoes em linha com o Studio
- portar gradualmente ferramentas ja maduras, sem foco inicial em modelagem de roupa
- preparar a entrada e saida em DXF como base tecnica do fluxo

## O Que Este Projeto Ja Tem no Studio

Segundo a decisao atual, o Studio ja oferece uma base importante:

- selecao
- snap
- fechar e abrir contornos
- join
- edicao de polyline
- camadas editaveis
- exportacao DXF

Portanto, o problema principal desta nova frente nao e construir um CAD do zero, e sim integrar e adaptar essa base para o dominio do GeoLimites.

## Foco Tecnico Inicial

As prioridades tecnicas desta frente sao:

- estruturar o modulo `Editor CAD` no GeoLimites
- mapear o que sera reaproveitado do Studio
- fortalecer importacao DXF no novo editor
- manter o Visualizador como referencia e area de comparacao
- preparar futura integracao do Editor CAD ao menu principal ao lado do Visualizador

## Fora de Escopo Inicial

- Não apagar o Visualizador atual
- migrar imediatamente o fluxo inteiro de memorial
- tratar modelagem de roupa no primeiro ciclo
- suportar DWG como formato nativo
- reconstruir todas as ferramentas do Studio antes de provar o fluxo minimo

## Definicao Inicial de Sucesso

Esta frente estara bem encaminhada quando:

- existir um projeto separado e claro para o `Editor CAD`
- o sistema tiver um menu dedicado `Editor CAD` ao lado de `Visualizador`
- o canvas inicial do editor refletir a experiencia base do Studio
- o editor abrir DXF com consistencia suficiente para inspecao e edicao
- o GeoLimites puder evoluir o fluxo tecnico sem misturar responsabilidades entre viewer e CAD

## Estrutura Deste Projeto

- `README.md`: visao geral, recorte e tese
- `ROADMAP.md`: fases de implantacao
- `BACKLOG.md`: backlog inicial priorizado
