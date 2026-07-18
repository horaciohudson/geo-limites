# Debug Session: viewer-height-fit

## Status
- [OPEN] Investigando por que o aumento de altura do `viewer` nao aparece visualmente.

## Sintoma
- O `canvas` ganha largura, mas a altura visual quase nao cresce.
- Quando o desenho e ampliado para preencher as laterais, ele perde area na altura.
- O comportamento parece depender do ajuste automatico do desenho, nao apenas do CSS.

## Hipoteses
- H1. O wrapper visual cresce, mas o `canvas` interno continua com outra altura efetiva.
- H2. Alguma regra CSS duplicada/intermediaria ainda limita a altura real do container pai.
- H3. O algoritmo de `fit` usa a menor dimensao disponivel e o ganho vertical acaba neutralizado.
- H4. Existe uma restricao residual como `aspect-ratio`, `max-height` ou tamanho herdado em um container acima.

## Plano
- Instrumentar apenas logs no `ViewerDXF` para capturar:
- altura/largura do wrapper e do `canvas`;
- bounds reais do desenho;
- escala base calculada por eixo;
- dimensoes usadas no `fit`.
- Reproduzir no `viewer`.
- Determinar por evidencia se o problema e CSS, tamanho do `canvas` ou algoritmo de ajuste.

## Evidencias
- O container real do `canvas` esta com `1363 x 815` px e o `canvas` interno usa exatamente o mesmo tamanho.
- `computedHeight` e `computedMinHeight` do wrapper tambem estao em torno de `815px`.
- Portanto, o aumento de altura foi aplicado e o problema nao esta no backend nem na falta de altura real do `canvas`.
- O `fit` automatico registrou:
- `drawingWidth = 104.498`
- `drawingHeight = 105.450`
- `scaleX = 12.260767`
- `scaleY = 7.265081`
- `limitingAxis = height`

## Conclusao Parcial
- H1 foi rejeitada: o wrapper e o `canvas` estao com a mesma altura real.
- H2 perdeu forca: nao ha evidencia de `max-height` residual vencendo o layout.
- H3 foi confirmada: o algoritmo de ajuste esta limitado pela altura.
- O bounding box usado no `fit` esta praticamente quadrado, o que combina com a inclusao da tabela de coordenadas e demais anotacoes no calculo de bounds.
- Por isso, mesmo aumentando a largura do `viewer`, o desenho principal dos lotes nao cresce como esperado.

## Proximo Passo Recomendado
- Ajustar o auto-fit para usar prioritariamente a geometria do desenho principal (`LINE`, `POLYLINE`, `LWPOLYLINE`) e ignorar textos/tabela de coordenadas no calculo de bounds.
- Opcionalmente, manter um modo alternativo `fit completo` para quem quiser ver o desenho inteiro com tabela e anotacoes.
