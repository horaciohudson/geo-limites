# Empresa, SMTP e Usuarios

## Quem acessa essa area

A entrada `Administracao` aparece para usuarios com perfil administrativo.

## Estrutura da tela

A area administrativa esta organizada em tres blocos principais:

- Empresa
- SMTP
- Usuarios

## Empresa

A aba `Empresa` concentra dados institucionais do tenant, incluindo nome, plano e status operacional.

## SMTP

A aba `SMTP` serve para configurar o envio de e-mails do sistema. Isso impacta fluxos como verificacao de conta, comunicacao e testes operacionais.

## Usuarios

A aba `Usuarios` permite acompanhar a base global de acessos do sistema, incluindo criacao, edicao, redefinicao de senha, reenvio de verificacao e filtros de consulta.

## Escopo da administracao de usuarios

No fluxo atual, a listagem exibida em `Usuarios` considera usuarios globais do sistema.

Isso significa que a tela pode ser usada para:

- localizar usuarios de diferentes tenants
- editar dados de acesso
- redefinir senha
- reenviar verificacao de e-mail
- aplicar filtros operacionais para localizar contas

## Operacoes comuns em Usuarios

As acoes mais usuais nesta aba sao:

- criar um novo usuario
- editar nome, login, e-mail, perfil e status
- inativar ou reativar acesso
- redefinir senha administrativa
- reenviar o e-mail de confirmacao quando necessario

## Cuidados ao atuar nessa aba

Como o escopo e global, vale conferir antes de salvar:

- se o usuario correto foi selecionado
- a qual tenant a conta pertence
- se a alteracao e realmente administrativa e nao operacional
- se o perfil administrativo deve ser mantido

## Cuidados administrativos

- Alterar configuracoes de SMTP com validacao previa.
- Revisar o status dos usuarios antes de atuar em casos de acesso.
- Evitar criar administradores sem necessidade real.
- Registrar internamente alteracoes criticas de ambiente.

## Indicadores da tela

O frontend calcula contagens como:

- usuarios confirmados
- usuarios ativos
- usuarios pendentes
- usuarios administradores

Esses indicadores ajudam na leitura rapida da situacao operacional da base de usuarios exibida na tela.
