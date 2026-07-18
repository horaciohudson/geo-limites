# [OPEN] Debug Session: primary-save-clear

## Sintoma
- Ao clicar em `Salvar Primarias`, o sistema nao avisa claramente que salvou.
- A selecao marcada no canvas nao e limpa apos o clique.

## Escopo
- Editor CAD embarcado
- Fluxo de selecao por segmentos / confrontacoes
- Salvamento de primarias no `CadEditorBase`

## Hipoteses Iniciais
1. O handler `handleSavePrimaryBoundaryInEditor()` nao esta sendo executado no clique real do botao.
2. O handler executa e salva, mas a mensagem visual do `setEditorNotice()` nao esta chegando ou esta sendo sobrescrita logo em seguida.
3. O gatilho `clearConfrontationSelectionNonce` chega ao `ViewerDXF`, mas o efeito de limpeza nao dispara.
4. O efeito de limpeza dispara, mas o viewer repopula a selecao internamente imediatamente apos limpar.
5. A selecao visivel que o usuario percebe nao esta em `segmentAnnotations`, e sim em outro estado visual que nao esta sendo limpo.

## Evidencias
- Evidencia do usuario: existem duas selecoes roxas no fluxo de confrontacoes.
- `Shift`: selecao roxa clara dos logradouros/textos.
- `Shift + Ctrl`: selecao roxa escura dos trechos/anotacoes de segmento.
- Ambas compoem o fluxo de confrontacoes e precisam ser limpas apos `Salvar Primarias`.
- Evidencia runtime confirmada no log `trae-debug-log-primary-save-clear.ndjson`:
  - o clique entra no handler de salvar;
  - o botao tem acao;
  - o salvamento estava sendo rejeitado por validacao com a mensagem:
    - `Os trechos primarios precisam formar um contorno fechado continuo antes de salvar.`
- Leitura do renderer confirmou:
  - `selectedConfrontationTexts` desenha a selecao clara.
  - `segmentAnnotations` desenha a selecao escura.
  - Tambem ha estado interno de segmentos selecionados (`selectedSegmentIds`) que pode sustentar destaque residual.

## Proximo Passo
- Expor a validacao real no proprio botao `Salvar Primarias`, para que o estado invalido apareca antes do clique.
- Manter a limpeza completa das duas selecoes apenas no caminho de sucesso do salvamento.
