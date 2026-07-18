# Debug Session: lot-removal-inverted
- **Status**: [OPEN]
- **Issue**: A exclusao de lotes no modo `Exclusao` remove os lotes nao selecionados e preserva os lotes marcados.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-lot-removal-inverted.ndjson

## Reproduction Steps
1. Abrir um desenho no editor CAD.
2. Mudar `Operacao nos lotes` para `Exclusao`.
3. Marcar os lotes `1`, `2` e `3` com `Alt + Select`.
4. Clicar em `Remover Lote`.
5. Observar que os lotes selecionados permanecem e outros lotes sao removidos.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | O poligono confirmado pelo `Alt + Select` esta vindo maior ou invertido em relacao ao lote pretendido. | High | Med | Rejected |
| B | O conjunto `selectedLotSelectionsForRemovalExperiment` esta usando selecoes antigas ou diferentes das marcadas no modo `Exclusao`. | Med | Low | Confirmed |
| C | A regra `doesEntityIntersectSelectedLots(...)` continua classificando entidades externas como pertencentes aos lotes selecionados. | High | Low | Partial |
| D | A reconstrucao do `DXFData` apos a filtragem esta mantendo os alvos e descartando o restante por um efeito de serializacao. | Low | Med | Rejected |
| E | As entidades de texto/rotulo de lote estao contaminando a deteccao e deslocando a remocao para lotes vizinhos. | Med | Med | Partial |

## Log Evidence
- Os logs de confirmacao do `Alt + Select` mostram os tres lotes corretos: `1`, `2` e `3`.
- Na decisao de remocao, o editor chegou com `lotNumbers: [1..25 quase completos]` e `lotSelections` contendo muitos lotes antigos (`16`, `22`, `17`, `18`, ... , `1`, `2`, `3`).
- Isso confirma que o modo `Exclusao` estava herdando selecoes acumuladas do viewer/editor em vez de usar apenas a marcacao atual.

## Verification Conclusion
- Correcao minima aplicada: ao entrar em `Exclusao`, limpar a selecao acumulada do viewer/editor e iniciar uma nova sessao de marcacao.
