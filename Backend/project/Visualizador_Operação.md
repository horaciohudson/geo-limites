Visualizar

- O que faz: coloca o visualizador em modo de inspeção (sem ferramentas corretivas ativas).
- Efeito prático:
  - Esconde o painel corretivo (porque ele só é mostrado quando viewerMode === 'correct' ).
  - Mantém o DXF carregado e navegável normalmente.
- Onde está no código:
  - Botão chama onSelectViewMode em ViewerHeader.tsx
  - Handler faz setViewerMode('view') em Viewer.tsx
Corrigir Arquivo

- O que faz: ativa o “modo corretivo mínimo” no canvas e mostra o painel de pendências para guiar a correção.
- Quando fica habilitado: só habilita quando existe um Resumo Técnico carregado com pendências (bloqueantes/avisos). Isso é controlado por hasCorrectiveMode .
  - Na prática: gere/abra o Resumo Técnico (na aba dedicada) e, com as pendências carregadas, o botão habilita.
- Efeito prático:
  - Muda viewerMode para 'correct' , o ViewerDXF passa a desenhar foco/realces e aceitar as ferramentas (mover vértice / unir pontas / fechar lacuna).
  - Mostra o painel corretivo.
- Onde está no código:
  - Botão e disabled={!hasCorrectiveMode} em ViewerHeader.tsx
  - Handler faz setViewerMode('correct') somente se hasCorrectiveMode em Viewer.tsx
  - hasCorrectiveMode é derivado de generatedDocumentKind === 'resumo-tecnico' e correctiveIssues.length > 0 em Viewer.tsx
Reabrir Último Snapshot

- O que faz: busca no backend o último snapshot corretivo salvo do imóvel (propriedade) e reabre o estado no canvas.
- Efeito prático:
  - Faz GET /properties/{propertyId}/memorial-base/latest-corrective .
  - Valida se o snapshot tem fileId e geometria.
  - Se o snapshot for de outro arquivo, troca o arquivo ativo na sessão.
  - Injeta o dxfData do snapshot + referencePoints no estado corretivo e força o modo 'correct' .
  - Se o snapshot trouxe technicalSummaryJson , ele também restaura o Resumo Técnico e habilita o modo corretivo.
- Onde está no código:
  - Botão chama onReopenLatestSnapshot em ViewerHeader.tsx
  - Handler em Viewer.tsx
  - Implementação completa (fetch, validações, troca de arquivo, restauração e switch para correct) em useCorrectiveSnapshots.ts
Se você quiser, eu também explico o “fluxo ideal” de uso (gerar Resumo Técnico → entrar em Corrigir Arquivo → aplicar sugestão/ajustes → salvar snapshot → reabrir depois).