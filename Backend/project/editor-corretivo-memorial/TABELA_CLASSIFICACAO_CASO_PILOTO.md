# Tabela de Classificacao - Caso Piloto

## Objetivo

Registrar de forma objetiva como o GeoLimites deve tratar o DXF piloto de `25 lotes com 5 lotes abertos`.

Esta tabela existe para responder, lote por lote:

- qual e o problema real
- se a causa parece simples ou estrutural
- se vale corrigir dentro do GeoLimites
- qual ferramenta seria necessaria
- quando o caso deve continuar no AutoCAD

## Regra de Decisao

### Corrigir no GeoLimites

O lote entra nesta categoria quando:

- a abertura e pequena e localizada
- a intencao geometrica do lote esta clara
- o ajuste pode ser feito com uma ferramenta simples
- a correcao e mais rapida que sair do sistema

### Continuar no AutoCAD

O lote entra nesta categoria quando:

- ha redesenho amplo do contorno
- a intencao geometrica e ambigua
- faltam muitas entidades
- existe risco alto de o sistema "inventar" a geometria correta

## Tipos de Problema Esperados

| Tipo de problema | Sinal tecnico | Normalmente corrigivel no GeoLimites? | Ferramenta minima |
| --- | --- | --- | --- |
| Ponta quase coincidente | Vertices finais muito proximos, mas sem fechamento | Sim | Unir pontas / fechar poligono |
| Segmento curto deslocado | Um lado existe, mas esta fora da tolerancia | Sim | Mover vertice / unir segmento |
| Segmento faltante unico | O contorno esta quase completo e falta apenas um fechamento obvio | Sim, com cautela | Fechar poligono guiado |
| Varios segmentos incoerentes | O lote nao tem contorno confiavel | Nao | AutoCAD |
| Lote com forma ambigua | Mais de uma interpretacao possivel | Nao | AutoCAD |
| Erro de layer ou classificacao | Geometria existe, mas foi lida de modo errado | Sim | Corrigir camada semantica |

## Planilha de Homologacao

Preencher esta tabela assim que o resumo tecnico identificar exatamente quais sao os 5 lotes abertos.

| Lote | Tipo de abertura | Causa provavel | Corrigivel no GeoLimites? | Ferramenta necessaria | Deve continuar no AutoCAD? | Observacao |
| --- | --- | --- | --- | --- | --- | --- |
| A confirmar 1 | A confirmar | A confirmar | A confirmar | A confirmar | A confirmar | Preencher apos primeira leitura tecnica |
| A confirmar 2 | A confirmar | A confirmar | A confirmar | A confirmar | A confirmar | Preencher apos primeira leitura tecnica |
| A confirmar 3 | A confirmar | A confirmar | A confirmar | A confirmar | A confirmar | Preencher apos primeira leitura tecnica |
| A confirmar 4 | A confirmar | A confirmar | A confirmar | A confirmar | A confirmar | Preencher apos primeira leitura tecnica |
| A confirmar 5 | A confirmar | A confirmar | A confirmar | A confirmar | A confirmar | Preencher apos primeira leitura tecnica |

## Resultado Esperado da Fase 0

Ao final do preenchimento desta tabela, precisamos ter:

- uma lista clara dos 5 lotes problemáticos
- a separacao entre correcoes de baixo atrito e casos que devem continuar no AutoCAD
- a lista exata das primeiras ferramentas do editor corretivo
- um criterio concreto para dizer se o projeto vale a pena

## Decisao de Escopo

O editor corretivo so deve nascer para resolver os tipos de problema que aparecerem nesta tabela como:

- frequentes
- localizados
- de baixo risco
- mais rapidos que a correcao externa

Se a maioria dos 5 casos cair em `AutoCAD`, isso indica que o editor corretivo deve permanecer menor e mais focado.
