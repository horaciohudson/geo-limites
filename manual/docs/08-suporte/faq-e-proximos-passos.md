# FAQ e Proximos Passos

## Perguntas frequentes iniciais

### Qual e a primeira tela de trabalho apos o login?
Normalmente a pagina **Imoveis** (`/properties`), pois a rota principal redireciona para essa area.

### O que preciso para gerar um memorial?
Na pratica, voce precisa de quatro pontos preparados: imovel selecionado, arquivo tecnico DXF selecionado, norma definida e modelo base adequado para a geracao. A definicao operacional de norma e modelo acontece em **Normas e Templates**, e a geracao final acontece no **Visualizador**.

### Onde o memorial e revisado e exportado?
No fluxo atual, a revisao do texto, a copia do conteudo e a exportacao em PDF acontecem dentro do **Visualizador**.

### Onde ficam as configuracoes de normas e modelos base?
Na tela **Normas e Exemplos** (`/manage-standards`), dentro da secao **Configuracao**.

### Qual e a diferenca entre Normas e Templates e Normas e Exemplos?
`Normas e Templates` e a tela operacional onde o usuario escolhe a norma e o modelo da sessao atual. `Normas e Exemplos` e a tela administrativa onde a equipe cadastra, importa e mantem a base documental disponivel para o restante do sistema.

### Ainda existe configuracao de Pasta de Templates?
Sim. No comportamento atual da tela de configuracao, a `Pasta de Templates` ainda precisa estar configurada para importar ou gerar modelos base com gravacao em disco. O sistema tenta salvar no banco e em disco primeiro, deixando navegador e `localStorage` como apoio ou fallback.

### Todo usuario ve a area Administracao?
Nao. Ela e reservada a usuarios com permissao administrativa.

### A aba Usuarios mostra apenas contas do tenant atual?
Nao no fluxo administrativo atual. A listagem de `Usuarios` opera sobre a base global de usuarios do sistema, permitindo localizar e administrar contas de diferentes tenants quando o perfil tem permissao para isso.

### Onde ficam os dados pessoais e operacionais do usuario?
Na area **Conta**.

## Proximos passos recomendados para este manual

1. Adicionar capturas de tela reais do fluxo atual.
2. Documentar com mais detalhe a selecao de norma e modelo em **Normas e Templates**.
3. Expandir o capitulo do **Visualizador** com exemplos de geracao, copia e exportacao do memorial.
4. Incluir um passo a passo da `Pasta de Templates` e do fluxo real de gravacao de modelos base.
5. Criar um guia administrativo com SMTP, usuarios e perfis de acesso.
6. Revisar periodicamente rotas legadas citadas por compatibilidade na ajuda contextual.

## Publicacao em subdominio proprio

A recomendacao atual permanece publicar o HTML gerado em `ajuda.geolimites.com.br`, mantendo o sistema principal separado do site de documentacao.

## Relacao com a ajuda contextual

O detalhamento do atalho `Shift+F1` e do mapeamento por rota esta em [Ajuda Contextual e Atalho de Teclado](ajuda-contextual-e-f1.md).
