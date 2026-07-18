# Debug Session: alt-select-click

Status: OPEN

## Sintoma

- `Select + Alt` mostra cursor, bolinhas e snap.
- O clique ainda nao confirma os pontos do recorte parcial.

## Hipoteses

1. O `mousedown` com `Alt` chega ao canvas, mas e consumido por outro handler antes de confirmar o ponto.
2. `appendPartialScopePolygonPoint(...)` esta sendo chamado, mas sai cedo por causa de estado invalido.
3. O `draftPoint` do clique difere do snap visual e nao entra como ponto valido.
4. O viewer limpa ou reescreve o estado do recorte logo apos o clique.

## Plano

1. Instrumentar entrada do clique `Alt`.
2. Instrumentar decisao dentro de `appendPartialScopePolygonPoint(...)`.
3. Reproduzir no editor.
4. Confirmar ou refutar hipoteses por evidencias.
5. Corrigir minimamente so depois da evidencia.
