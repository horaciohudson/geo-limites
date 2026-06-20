# Visao Geral

## O que o GeoLimites faz

O GeoLimites e um sistema voltado para organizacao de dados tecnicos de imoveis e apoio a geracao de memoriais descritivos a partir de arquivos e configuracoes operacionais.

No fluxo atual, a diretriz principal da plataforma e:

- o backend atua como fonte da verdade geometrica
- a IA participa como redatora do texto
- quando houver falha de provedor ou limite temporario, o sistema pode usar fallback tecnico deterministico

## Principais blocos funcionais

### Operacao
O operador trabalha com a selecao de imoveis, normas e arquivos tecnicos, visualiza os desenhos e gera ou revisa o memorial no Visualizador.

### Preparacao
O operador complementa o cadastro de imoveis quando necessario, com suporte a rascunhos locais, salvamento da base principal e cadastro de pontos ou estacas de referencia para apoiar o georreferenciamento.

### Configuracao
Perfis com maior responsabilidade gerenciam normas e modelos base em **Normas e Exemplos**, incluindo importacao de PDF e geracao de modelos com apoio de IA. A secao administrativa tambem pode exibir **Pasta de Templates** por compatibilidade operacional.

Para evitar confusao de nomenclatura:

- **Normas e Templates** e a tela operacional usada no fluxo diario para escolher a norma e o modelo da sessao atual
- **Normas e Exemplos** e a tela de configuracao usada para cadastrar, importar e manter normas e modelos base

### Conta e acesso
Cada usuario acompanha suas informacoes de perfil, saldo de creditos, extrato e recargas na area de Conta.

### Administracao
Usuarios administradores configuram dados de empresa (Tenant), SMTP e gerenciam usuarios cadastrados.

## Sequencia recomendada de uso

1. **Entrar no sistema**: O login redireciona diretamente para **Imoveis**, ponto inicial do trabalho.
2. **Conferir os dados do imovel**: Use **Imoveis** e, se necessario, **Cadastrar Imovel** para deixar o cadastro pronto.
3. **Selecionar os arquivos**: Em **Arquivos DXF**, deixe definidos os arquivos que serao usados no trabalho atual.
4. **Definir normas e modelo**: Em **Normas e Templates**, escolha a norma e o modelo que serao usados naquela sessao de geracao.
5. **Abrir o Visualizador**: Visualize o DXF, gere o memorial, revise o texto e exporte o PDF no proprio **Visualizador**.
6. **Revisar a conta** ou configuracoes administrativas, quando necessario.

## Observacoes operacionais recentes

- o cadastro do imovel passou a aceitar varios pontos ou estacas nomeados
- esses pontos podem ser usados para aproximar o desenho de coordenadas reais no backend
- o memorial gerado e consolidado de forma mais previsivel, com fechamento unico
- a exportacao PDF foi ajustada para respeitar cabecalho unico quando o texto ja comeca com `Memorial Descritivo`

## Perfis comuns

### Usuario comum
Acessa o fluxo operacional e sua propria conta.

### Usuario administrador
Tem acesso adicional a configuracoes de empresa, SMTP e usuarios.
