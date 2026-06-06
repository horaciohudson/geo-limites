# Empresa, SMTP e Usuarios

## Quem acessa essa area

A entrada `Administracao` aparece para usuarios com perfil administrativo.

## Estrutura atual da tela

A area administrativa esta organizada em tres blocos principais:

- Empresa
- SMTP
- Usuarios

## Empresa

A aba `Empresa` concentra dados institucionais do tenant, incluindo nome, plano e status operacional.

## SMTP

A aba `SMTP` serve para configurar o envio de e-mails do sistema. Isso impacta fluxos como verificacao de conta, comunicacao e testes operacionais.

## Usuarios

A aba `Usuarios` permite acompanhar a base de acessos, incluindo criacao, edicao, redefinicao de senha e filtros de acompanhamento.

## Cuidados administrativos

- Alterar configuracoes de SMTP com validacao previa.
- Revisar o status dos usuarios antes de atuar em casos de acesso.
- Evitar criar administradores sem necessidade real.
- Registrar internamente alteracoes criticas de ambiente.

## Indicadores observados na tela

O frontend calcula contagens como:

- usuarios confirmados
- usuarios ativos
- usuarios pendentes
- usuarios administradores

Esses indicadores ajudam na leitura rapida da situacao operacional do tenant.
