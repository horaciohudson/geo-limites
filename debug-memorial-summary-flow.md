# Debug Session: memorial-summary-flow [OPEN]

## Sintoma
- A geracao do memorial falha com a mensagem:
- `Nao foi possivel concluir a geracao deste memorial agora. Revise a norma, o template e o Resumo Tecnico aplicados e tente novamente.`

## Contexto observado
- A configuracao em `Operacao > Configurar Memorial` permanece correta apos reabrir a tela.
- O usuario informa que norma, template e resumo tecnico estao aplicados normalmente.
- O fluxo esperado agora deve depender de `norma + template + resumo tecnico`, sem dependencia real de DXF carregado.

## Hipoteses
1. O request final nao esta enviando `standardId` ou metadados de template validos.
2. O backend recebe `technicalSummaryJson`, mas falha ao interpretar esse JSON especifico.
3. A resolucao do template aplicado no backend esta lancando excecao.
4. `propertyId` ou `documentSummaryJson` chega inconsistente e quebra a preparacao do memorial.
5. Algum campo de cabecalho do request (`projectName`, `fileName` ou equivalente) chega vazio ou inadequado no fluxo soberano.

## Plano de evidencia
- Instrumentar o frontend no ponto de disparo da geracao para registrar o payload efetivo.
- Instrumentar o backend na entrada do endpoint e no catch da geracao para identificar a excecao real.
- Comparar o que foi aplicado em tela com o que realmente trafega no request.

## Status
- Aberto.
- Aguardando instrumentacao e reproducao com logs.
