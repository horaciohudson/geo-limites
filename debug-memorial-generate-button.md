# Debug Session: memorial-generate-button

Status: [OPEN]

## Sintoma
- O botao da pagina `Memorial` deve gerar o memorial.
- No estado atual, o usuario relata que o botao nao esta funcionando.
- Ajuste visual solicitado junto: trocar o rotulo para `Gerar Memorial`.

## Hipoteses
1. A validacao de configuracao bloqueia a execucao antes da geracao.
2. O arquivo-fonte do resumo tecnico nao esta sendo resolvido.
3. A chamada de geracao dispara, mas falha antes de atualizar a UI.
4. Algum estado local limpa ou sobrescreve o retorno logo apos o clique.

## Evidencias Pendentes
- Evento de clique do botao
- Resultado da validacao inicial
- Resultado da resolucao do arquivo-fonte
- Entrada e saida da chamada `generateStableMemorial`

## Proximo Passo
- Adicionar instrumentacao minima no fluxo do clique e na tentativa de geracao.
