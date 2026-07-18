[OPEN] Debug Session: mixed-partial-lot-shift

## Sintoma
- Em `Total`, o resumo acusa erro nos lotes 1 e 2.
- Em `Total + Parciais`, após salvar parcial de 1 e 2, o resumo passa a acusar 1, 3 e 4.
- Evidência anterior indica deslocamento da sequência: os antigos lotes 1 e 2 reaparecem como 3 e 4.

## Hipóteses
- A: o backend renumera os lotes após ler as parciais substitutas.
- B: as parciais salvas já chegam com geometria errada no frontend.
- C: o payload misto envia lotes automáticos e parciais ao mesmo tempo, sem substituir.
- D: `detectedLotNumbers`/`lotCount` ainda influencia a ordem final no modo misto.
- E: `technicalSummaryLotNumberHint` é lido, mas perdido em etapa posterior.

## Plano de evidência
- Instrumentar frontend no salvamento das parciais e na geração do payload do resumo.
- Instrumentar backend na leitura das entidades e no casamento do `technicalSummaryLotNumberHint`.
- Comparar logs do modo `Total` vs `Total + Parciais`.

## Estado
- Sessão aberta. Aguardando coleta de evidências `pre-fix`.
