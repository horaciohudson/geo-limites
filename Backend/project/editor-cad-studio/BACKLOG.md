# Backlog Inicial

## P0 - Estrutura do Projeto

- criar o mini-projeto `editor-cad-studio` dentro de `Backend/project`
- registrar a decisao de manter o `Visualizador` para pesquisa e comparacao
- definir o `Editor CAD` como novo modulo de evolucao do sistema
- alinhar a nomenclatura entre Studio, GeoLimites e novo editor

## P0 - Reaproveitamento do Studio

- listar os modulos do Studio que entram no primeiro ciclo
- identificar como trazer canvas e interacoes para o GeoLimites
- mapear selecao, snap, join, abrir e fechar contorno
- mapear edicao de polyline e camadas editaveis
- identificar dependencias acopladas a modelagem de roupa que nao entram agora

## P0 - DXF

- mapear o importador DXF atual do Studio
- confirmar o subconjunto minimo de entidades obrigatorias
- definir estrategia para `INSERT`, `BLOCK` e `ATTRIB`
- padronizar o DXF como formato oficial de troca

## P1 - Integracao no GeoLimites

- criar menu `Editor CAD` ao lado de `Visualizador`
- criar rota dedicada para o editor
- carregar o contexto operacional do arquivo tecnico ativo
- manter convivencia temporaria entre viewer e editor

## P1 - Ferramentas Iniciais

- ativar selecao no canvas
- ativar snap
- ativar join
- ativar abrir e fechar contorno
- ativar edicao de polyline
- ativar manipulacao de camadas editaveis

## P1 - Qualidade Tecnica

- definir estrategia de importacao com tolerancia geometrica
- validar lotes abertos e gaps pequenos no editor
- garantir que o DXF exportado preserve a intencao tecnica da edicao
- preparar casos piloto para comparar Studio x Visualizador

## P2 - Ponte com Resumo Tecnico

- definir como o `Resumo Tecnico` passa a consumir o DXF corrigido
- manter versao original e versao editada rastreaveis
- preparar criterio para futura geracao de memorial a partir do editor

## Riscos

- misturar cedo demais o editor com regras do memorial
- tentar portar o Studio inteiro antes de validar o modulo inicial
- reintroduzir complexidade de modelagem de roupa no primeiro ciclo
- subestimar o trabalho de importacao DXF

## Criterio de Priorizacao

Cada novo item deve responder positivamente a pelo menos duas perguntas:

- acelera a entrada do Editor CAD no GeoLimites?
- reaproveita algo maduro que ja existe no Studio?
- reduz dependencia do Visualizador para correcao tecnica?
- melhora a confianca do fluxo baseado em DXF?
