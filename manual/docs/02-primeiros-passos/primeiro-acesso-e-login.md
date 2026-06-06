# Primeiro Acesso e Login

## Rotas publicas observadas no sistema

O frontend possui rotas publicas para:

- Login
- Cadastro
- Verificacao de e-mail
- Reenvio de verificacao

## Primeiro acesso

No primeiro acesso, o usuario normalmente segue este fluxo:

1. Recebe ou cria as credenciais.
2. Faz login na tela inicial.
3. Caso exigido, confirma o e-mail.
4. Entra no sistema e e redirecionado para a area de `Imoveis`.

## O que aparece apos entrar

Quando autenticado, o usuario passa a ver:

- barra superior com identificacao do usuario
- menu lateral com as secoes principais
- conteudo central conforme a tela escolhida

## Boas praticas iniciais

- Confirmar se o nome exibido no topo esta correto.
- Verificar se o acesso e de usuario comum ou administrador.
- Conferir se a conta ja possui o perfil atualizado.

## Quando o login nao funciona

Verifique, nesta ordem:

1. E-mail e senha digitados.
2. Confirmacao de e-mail, se o ambiente exigir verificacao.
3. Tenant correto, quando aplicavel.
4. Se a conta esta ativa.

## Atalho funcional

Hoje a rota raiz do sistema redireciona para `Imoveis`, entao essa tende a ser a tela inicial de trabalho apos a autenticacao.
