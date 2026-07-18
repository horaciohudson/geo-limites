[OPEN] viewer-skewed-canvas

# Debug Session: viewer-skewed-canvas

## Sintoma
- O desenho no viewer continua torto apos as correcoes de layout/canvas.
- O usuario relatou deformacao visual persistente mesmo apos ajustes de altura e sincronizacao do canvas.

## Comportamento Esperado
- O desenho deve permanecer proporcional.
- Pontos destacados e geometria devem manter a mesma forma visual.

## Hipoteses Iniciais
1. A associacao `texto -> vertice` esta escolhendo vertices errados para os pontos de amarracao.
2. O frontend esta aplicando uma transformacao diferente da usada no backend.
3. Ainda existe mistura de referenciais no canvas em um ponto especifico da renderizacao.
4. As ancoras extraidas do DXF nao representam os pontos geometricos corretos.
5. O problema percebido vem da combinacao entre transformacao georreferenciada e escala automatica.

## Plano
1. Instrumentar frontend para registrar:
- pontos matched;
- parametros da transformacao;
- bounds originais e transformados;
- proporcao do canvas renderizado;
- amostra de vertices antes/depois da transformacao.
2. Reproduzir no viewer.
3. Comparar evidencias com o calculo do backend.
4. Aplicar correcao minima baseada em evidencia.

## Status
- Sessao iniciada.
- Instrumentacao inicial coletada.

## Evidencias Coletadas
- Log `A` mostrou `matchedCount = 2` usando apenas `P1` e `P55`.
- Log `A` mostrou transformacao com:
- `rotationDegrees = 0.000791`
- `scale = 0.999925352`
- `translateX = 553388.104`
- `translateY = 9542822.449`
- `averageResidualMeters = 0`
- Log `B` mostrou `drawingWidth = 104.491` e `drawingHeight = 105.443`, sem indicio de achatamento do canvas.
- O frontend e o backend usam a mesma formula de transformacao: rotacao + escala unica + translacao.

## Analise Parcial
- A hipotese de distorcao puramente visual do canvas perdeu forca.
- O residual zero nao prova qualidade do ajuste porque com exatamente 2 pontos a transformacao encaixa esses 2 pontos por construcao.
- O desalinhamento visual do desenho inteiro e compativel com limitacao estrutural do modelo atual:
- usando apenas 2 pontos e uma transformacao de similaridade, o sistema nao consegue medir nem corrigir deformacoes internas do desenho.
- Ainda existe risco secundario de `P1` e `P55` estarem associados a vertices locais nao ideais, mas a evidencia principal aponta primeiro para insuficiencia do modelo/quantidade de pontos.
