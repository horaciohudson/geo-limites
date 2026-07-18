# Roadmap

## Fase 0 - Fundacao do Projeto

Objetivo: abrir a frente do Editor CAD com identidade propria dentro do GeoLimites.

- criar o projeto `editor-cad-studio`
- registrar a decisao de manter o Visualizador como referencia
- definir o Editor CAD como novo eixo de evolucao tecnica
- separar claramente viewer, editor e pipeline documental

Entregaveis:

- pasta do projeto criada
- escopo inicial documentado
- backlog inicial priorizado

## Fase 1 - Mapeamento do Reaproveitamento do Studio

Objetivo: identificar quais partes do Studio entram primeiro no GeoLimites.

- mapear canvas, interacoes e organizacao de ferramentas
- mapear selecao, snap, join e edicao de polyline
- mapear camadas editaveis e modelo interno
- identificar dependencias tecnicas que precisam ser adaptadas

Entregaveis:

- inventario de componentes e motores reaproveitaveis
- lista de adaptacoes necessarias
- proposta de arquitetura de integracao

## Fase 2 - Casca Inicial do Editor CAD

Objetivo: criar a primeira presenca visivel do Editor CAD dentro do sistema.

- adicionar rota propria do editor
- adicionar item de menu `Editor CAD` ao lado de `Visualizador`
- montar pagina inicial com canvas e contexto operacional
- manter o Visualizador intacto para pesquisa

Entregaveis:

- menu `Editor CAD`
- rota dedicada
- tela inicial do editor integrada ao GeoLimites

## Fase 3 - Entrada e Saida DXF

Objetivo: tornar o editor util com arquivos reais.

- definir estrategia de importacao DXF para o novo modulo
- confirmar o reaproveitamento do exportador DXF ja existente no Studio
- tratar entidades obrigatorias do primeiro ciclo
- padronizar o DXF como formato oficial do fluxo

Entregaveis:

- importacao DXF minima funcional
- exportacao DXF integrada ao editor
- subconjunto inicial de entidades suportadas

## Fase 4 - Ferramentas CAD Prioritarias

Objetivo: disponibilizar no GeoLimites as ferramentas de maior valor ja maduras no Studio.

- selecao de entidade e segmento
- snap
- join
- abrir e fechar contorno
- editar polyline
- manipular camadas editaveis

Entregaveis:

- primeiro pacote de ferramentas ativas
- fluxo minimo de correcao de desenho
- interacao consistente com o canvas

## Fase 5 - Ponte com Resumo Tecnico

Objetivo: religar o pipeline documental ao novo editor.

- usar o DXF corrigido como base do resumo tecnico
- manter rastreabilidade entre original e corrigido
- definir quando o resumo usa o arquivo original ou a versao editada
- preparar o acoplamento futuro com memorial

Entregaveis:

- contrato entre Editor CAD e Resumo Tecnico
- criterio de escolha da versao ativa
- base para reintroduzir o memorial no novo fluxo
