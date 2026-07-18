# Debug Session: cad-context-delete

Status: OPEN

## Sintoma
- Clique direito no canvas do CAD nao funciona como esperado.
- Acao de deletar entidades tambem nao funciona.

## Esperado
- Clique direito sobre entidade deve abrir menu contextual funcional.
- `Delete`/`Backspace` deve remover a selecao atual.

## Hipoteses Iniciais
1. O clique direito nao esta encontrando a entidade sob o cursor no fluxo do `CadEditor`.
2. A selecao visual existe no `ViewerDXF`, mas nao esta sincronizando corretamente para o estado `selectedEntities` do `CadEditor`.
3. O menu contextual abre e fecha imediatamente por algum efeito global de fechamento.
4. O atalho `Delete` dispara, mas `removeSelectedEntities()` recebe selecao vazia ou inconsistente.
5. O fluxo do canvas embutido esta consumindo eventos e impedindo a sequencia correta entre selecao, menu e remocao.

## Plano
- Instrumentar os pontos de clique direito, sincronizacao de selecao e delete.
- Reproduzir o fluxo e coletar logs.
- Confirmar ou rejeitar as hipoteses com evidencias.
- Aplicar a menor correcao possivel.
