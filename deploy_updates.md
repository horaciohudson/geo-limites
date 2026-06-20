# Notas de Atualização para Deploy (VPS)

As alteracoes abaixo refletem o comportamento realmente implementado e validado no frontend para o fluxo de templates.

## 1. Salvamento local de templates no frontend
- O fluxo de geracao e importacao de templates foi ajustado para salvar o arquivo JSON no computador do usuario pelo navegador.
- Quando o navegador suporta a API `showSaveFilePicker`, o usuario escolhe diretamente o destino do arquivo no momento da acao.
- Quando essa API nao estiver disponivel, o sistema faz fallback para download tradicional do arquivo JSON.
- Nesse fluxo, o template gerado nao depende mais de gravacao de arquivo fisico no servidor para ser utilizado pelo usuario.

## 2. Remocao da antiga configuracao de pasta de templates
- A antiga ideia de configurar previamente uma "Pasta de Templates" deixou de ser necessaria.
- O item de menu que levava para a pagina dedicada de configuracao de templates foi removido da navegacao principal.
- A rota antiga `/configure-templates` foi mantida apenas como compatibilidade e agora redireciona para `/manage-standards`.
- Com isso, o usuario passa a escolher o local do arquivo no momento do salvamento, sem depender de uma pasta cadastrada antes.

## 3. Ajustes de interface no fluxo de templates
- A tela `Normas e Exemplos` concentra o fluxo ativo de normas e modelos base.
- Durante upload, importacao ou geracao via IA, os botoes ficam desabilitados e a interface exibe feedback visual de processamento.
- As mensagens da tela foram ajustadas para deixar claro que o salvamento agora acontece no frontend, nao em uma pasta interna do backend.

## 4. Persistencia operacional atual
- Os templates manipulados nesse fluxo continuam sendo mantidos no navegador para apoio operacional do usuario.
- A tela ainda consegue listar templates ja existentes vindos do backend, quando houver registros anteriores.
- Ou seja: o novo fluxo de criacao/importacao salva localmente no frontend, mas a interface ainda preserva compatibilidade com dados historicos existentes.

## 5. Observacoes importantes para deploy
- Esta nota descreve apenas o que ja esta efetivamente alinhado ao comportamento implementado.
- Nao inclui promessas de refatoracao estetica futura nem correcoes que ainda nao estejam materializadas no codigo.
- Antes do commit final, o ideal e validar no ambiente local a navegacao, a remocao do menu antigo e o salvamento local dos templates.

---
**Uso sugerido:**
Este arquivo pode servir como base para a mensagem de commit, descricao de PR ou checklist de deploy, desde que as validacoes finais tenham sido concluídas na linha segura antes do envio para a VPS.
