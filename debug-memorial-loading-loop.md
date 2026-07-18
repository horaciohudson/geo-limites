# Debug Session: memorial-loading-loop
- **Status**: [OPEN]
- **Issue**: Tela `Operacao > Memorial > Memorial` entra em loop exibindo carregamento ligado a arquivo/base tecnica.
- **Debug Server**: pending startup
- **Log File**: .dbg/trae-debug-log-memorial-loading-loop.ndjson

## Reproduction Steps
1. Abrir `Operacao > Memorial > Memorial`.
2. Observar a tela permanecer em carregamento relacionado a arquivo/base tecnica.
3. Confirmar se a pagina re-renderiza/recarrega continuamente.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | O `useEffect` de carga em `Memorial.tsx` reexecuta continuamente por dependencia instavel de `selectedFiles`. | High | Low | Pending |
| B | `setSelectedProperty` dentro da resolucao dos arquivos preferenciais dispara uma cadeia de atualizacao que volta ao `loadFilesAndDXF`. | High | Medium | Pending |
| C | A tela alterna entre estado vazio e base tecnica encontrada, mantendo `isLoading` ou reabrindo o ciclo de carga. | Medium | Medium | Pending |
| D | A navegacao para `Memorial` sem arquivo previo deixa a pagina num caminho de recarga por falta de base tecnica consolidada. | Medium | Low | Pending |
| E | Algum contexto (`FileContext`/`OperationContext`) recria referencias a cada render e reativa o efeito mesmo sem mudanca real de dados. | Medium | Medium | Pending |

## Log Evidence
- A instrumentacao de rede foi inserida em `Memorial.tsx`, mas a coleta nao se materializou em arquivo NDJSON nesta sessao.
- Evidencia observacional confirmada pelo usuario: ao abrir `Operacao > Memorial > Memorial`, a tela permanecia em ciclo de carregamento ligado a arquivo/base tecnica antes de qualquer acao de gerar.
- Inspecao do codigo mostrou que a pagina executava `loadFilesAndDXF()` automaticamente em `useEffect` na abertura, resolvendo propriedade/arquivos/DXF imediatamente e sustentando o loading da tela.
- Evidencia adicional nesta iteracao: o texto exato `Carregando arquivo...` existe em `Viewer.tsx`, nao em `Memorial.tsx`.
- Evidencia adicional nesta iteracao: o botao `Memorial` em `Frontend/src/components/Sidebar.tsx` ainda executava `navigate('/viewer'...)`, abrindo o visualizador em vez da rota `/memorial`.
- Evidencia adicional nesta iteracao: ao gerar o memorial, o usuario passou a receber `Nenhum dado DXF valido encontrado nos arquivos selecionados`.
- Evidencia adicional nesta iteracao: em `Frontend/src/pages/Memorial.tsx`, o ramo `preferredPropertyFiles.length > 0` preenchia apenas `loadedFiles`, mas nao baixava nem executava `parseDXF()` para montar `loadedDxfData`.
- Evidencia adicional nesta iteracao: ao clicar em `Gerar Memorial`, o temporizador iniciava, mas o fluxo nao seguia como antes e terminava sem memorial visivel.
- Evidencia adicional nesta iteracao: `Frontend/src/pages/Memorial.tsx` estava usando `useAsyncMemorial`, enquanto o fluxo estavel do sistema usa `useDocumentGenerationState` + `useDocumentGenerationActions`.
- Evidencia adicional nesta iteracao: o fluxo `useAsyncMemorial`/`polling-memorial.ts` montava um payload paralelo baseado em `entities`, sem depender do `technicalSummaryJson` e do `documentSummaryJson` soberanos.

## Verification Conclusion
- Ajuste aplicado: a carga de arquivos/DXF foi removida da abertura automatica da pagina e passou a ocorrer apenas dentro de `generateMemorial()`, quando o usuario efetivamente solicita a geracao.
- Resultado esperado no pos-fix: a tela `Memorial` deve abrir estavel, sem loop de `Carregando...`; a carga da base tecnica agora ocorre apenas ao clicar em gerar.
- Ajuste adicional aplicado: o item `Memorial` do menu lateral agora navega diretamente para `/memorial`, removendo o desvio indevido para `Viewer`.
- Ajuste adicional aplicado: quando a base tecnica vem do imovel ativo (`preferredPropertyFiles`), a tela agora tambem baixa e interpreta os DXFs correspondentes antes de validar a geracao.
- Ajuste adicional aplicado: a pagina `Memorial` agora chama o mesmo nucleo de geracao do fluxo estavel, reutilizando a resolucao de `technicalSummaryJson`, `documentSummaryJson`, norma e template, em vez do pipeline paralelo de polling simulado.
