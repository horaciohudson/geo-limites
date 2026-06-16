# SAAS Operacao, Admin e Onboarding

## Objetivo

Criar uma trilha curta e pratica para transformar o GeoLimites em uma operacao SAAS utilizavel na internet, com foco em:

- cadastro de usuarios por tenant
- confirmacao de e-mail
- configuracao SMTP
- area administrativa
- publicacao inicial para homologacao com escritorio parceiro

Este documento complementa `SAAS_MULTITENANCY.md` com a camada operacional que faltava para colocar o sistema em uso controlado fora do ambiente local.

## Motivacao

O backend ja avancou em:

- tenant foundation
- tenant-aware login
- bootstrap inicial
- banco por migrations

Mas ainda faltam capacidades para operacao real:

- cadastro autonomo de usuario
- verificacao de e-mail
- recuperacao de senha
- administracao de usuarios e tenants
- configuracao SMTP por interface administrativa
- onboarding minimo para uso externo

Sem isso, cada novo teste externo depende de banco, bootstrap ou ajuste manual de ambiente.

## Escopo desta continuidade

### 1. Cadastro e identidade

- cadastro tenant-aware
- usuario com `email`
- status de verificacao do e-mail
- confirmacao por token
- reenvio de confirmacao
- recuperacao e redefinicao de senha

### 2. Operacao administrativa

- area admin global
- area admin do tenant
- gestao de usuarios
- gestao de tenants
- ativacao, bloqueio e reconciliacao de acesso

### 3. Comunicacao do sistema

- configuracao SMTP global
- identidade de envio por tenant
- teste de envio
- templates de e-mail

### 4. Homologacao externa

- configuracao local igual a VPS
- uso de SMTP real da Hostinger
- URL de frontend/backend por ambiente
- checklist para liberar escritorio parceiro

## Perfis administrativos

### Super Admin

Responsavel pela plataforma como um todo.

Pode:

- criar e editar tenants
- configurar SMTP global
- visualizar tenants e usuarios de toda a plataforma
- ativar ou bloquear tenant
- reenviar confirmacao de e-mail
- resetar senha administrativa
- consultar logs operacionais globais

### Admin do Tenant

Responsavel pela operacao de um tenant especifico.

Pode:

- criar usuarios do proprio tenant
- ativar ou inativar usuarios
- reenviar confirmacao de e-mail
- redefinir senha de usuarios do tenant
- configurar nome do remetente, reply-to e templates do tenant

Nao pode:

- acessar outros tenants
- alterar SMTP global da plataforma
- promover a si mesmo para super admin

## Modulos da primeira versao admin

### Admin 01 - Dashboard basico

- total de tenants
- total de usuarios
- usuarios pendentes de verificacao
- tenants ativos e bloqueados
- ultimas falhas de autenticacao

### Admin 02 - Tenants

- criar tenant
- editar `code`, `slug`, `name`, `plan_code`
- alterar `status`
- definir tenant padrao quando aplicavel

### Admin 03 - Usuarios

- criar usuario
- vincular ao tenant
- ativar, inativar e bloquear
- reenviar verificacao
- resetar senha
- promover para admin do tenant

### Admin 04 - SMTP

- host
- porta
- usuario
- senha mascarada
- TLS/SSL
- remetente padrao
- nome do remetente
- reply-to
- botao de teste

### Admin 05 - Templates de e-mail

- confirmacao de conta
- reenvio de verificacao
- recuperacao de senha
- notificacoes operacionais futuras

## Estrategia de implantacao

### Etapa A - Fundacao de identidade

- adicionar `email` ao usuario
- adicionar `is_verified`
- adicionar token de verificacao
- bloquear login de usuario nao verificado
- permitir `auto verify` por ambiente de homologacao

### Etapa B - Comunicacao real

- integrar SMTP com credenciais reais da Hostinger
- criar servico de envio
- implementar templates minimos
- expor endpoint de teste de envio para admin global

### Etapa C - Admin minimo

- listar usuarios
- criar usuario
- bloquear e ativar
- reenviar verificacao
- listar tenants
- editar status do tenant

### Etapa D - Homologacao assistida

- publicar na internet
- entregar tenant e credenciais ao escritorio
- acompanhar primeiros logins
- validar confirmacao de e-mail e recuperacao de senha

## Configuracao SMTP no admin

Regra recomendada:

- SMTP sensivel fica sob controle do super admin
- tenant admin configura apenas identidade de envio e templates

Configuracoes minimas da plataforma:

- `mail.enabled`
- `mail.host`
- `mail.port`
- `mail.username`
- `mail.password`
- `mail.protocol`
- `mail.tls`
- `mail.ssl`
- `mail.from.address`
- `mail.from.name`
- `app.frontend-url`

Configuracoes por tenant:

- nome do remetente
- reply-to
- assinatura
- templates customizaveis

## Modo de teste local igual VPS

O sistema deve permitir rodar localmente com a mesma logica da internet:

- SMTP real da Hostinger
- variaveis de ambiente reais
- links montados a partir de `app.frontend-url`
- `AUTH_AUTO_VERIFY_USERS=false` em teste real

Isso permite validar localmente:

- envio de e-mail
- token de confirmacao
- fluxo de ativacao
- recuperacao de senha

## Criterios de aceite desta frente

- usuario pode se cadastrar com `tenantCode`, `email`, nome e senha
- usuario recebe confirmacao de e-mail ou e auto-verificado apenas quando o ambiente permitir
- login falha para usuario nao verificado
- admin do tenant consegue listar e gerenciar usuarios do proprio tenant
- super admin consegue configurar SMTP e testar envio
- sistema pode ser publicado para homologacao externa sem depender de bootstrap manual para cada novo usuario

## Ordem recomendada de execucao

1. cadastro tenant-aware com email
2. confirmacao de e-mail
3. recuperacao de senha
4. SMTP real
5. admin minimo de usuarios
6. admin de tenants
7. dashboard e auditoria

## Relacao com o projeto SAAS

Este documento depende diretamente de:

- `SAAS_MULTITENANCY.md`
- `DATABASE_MIGRATIONS.md`
- `ROADMAP.md`
- `BACKLOG.md`

Ele representa a proxima camada de maturidade:

- sair da fundacao tecnica
- entrar em operacao administravel
- preparar homologacao real com usuarios externos
