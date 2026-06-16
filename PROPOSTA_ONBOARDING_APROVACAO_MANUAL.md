# Proposta - Onboarding com Aprovacao Manual e Notificacoes

## Objetivo

Criar um fluxo claro para novos clientes SaaS do GeoLimites em que:

- o cliente faz o cadastro normalmente
- confirma o e-mail
- entra em uma fila de analise
- o responsavel administrativo recebe aviso
- o cliente so e liberado depois da avaliacao manual

Essa proposta evita misturar o problema real com uma solucao superficial do tipo "mais uma aba Administrador com dados pessoais".

O foco correto e:

- contato de notificacao
- estado de onboarding
- fila de analise
- aprovacao manual auditavel

---

## Diagnostico do que ja existe no sistema

O projeto ja possui uma base muito boa para esse fluxo:

### Backend ja existente

- cadastro de usuario em `AuthService.register()`
- envio e confirmacao de e-mail em `AuthService.verifyEmail()`
- entidade operacional por tenant em `TenantOperationalControl`
- estados de onboarding em `TenantOnboardingStatus`
- painel admin para aprovar tenant, confirmar pagamento e liberar acesso
- bloqueio operacional para tenants nao liberados em `TenantOperationalAccessService`

### Estados ja existentes

Hoje o enum `TenantOnboardingStatus` ja possui:

- `DRAFT`
- `PENDING_DATA`
- `PENDING_APPROVAL`
- `PENDING_FIRST_PAYMENT`
- `READY_FOR_RELEASE`
- `ACTIVE`
- `SUSPENDED`

Ou seja:

- a ideia de aprovacao manual nao precisa nascer do zero
- ela precisa ser refinada e ficar visivel no fluxo

---

## Critica objetiva da ideia inicial

A ideia original foi:

- criar dentro de `Administracao` uma nova aba `Administrador`
- guardar dados pessoais do responsavel
- mandar e-mail quando o cliente retornar o e-mail de confirmacao

Problemas dessa abordagem:

1. confunde contato de notificacao com cadastro pessoal do administrador
2. nao deixa claro o estado do cliente entre "confirmou e-mail" e "foi liberado"
3. pode gerar duplicidade de disparos
4. nao cria uma fila operacional clara para acompanhamento
5. nao deixa auditoria suficiente de quem aprovou, quando e por qual motivo

Conclusao:

- a necessidade e valida
- o nome e o desenho funcional da solucao devem ser melhores

---

## Proposta funcional recomendada

Em vez de criar uma aba `Administrador`, criar uma aba nova em:

- `Administracao > Onboarding`

ou, se preferir um nome ainda mais direto:

- `Administracao > Notificacoes e Liberacao`

Minha recomendacao principal:

- usar `Onboarding`

Porque esse nome comporta:

- quem recebe notificacao
- status do novo cliente
- analise previa
- aprovacao
- liberacao final

---

## Estrutura da nova aba

### Secao 1 - Contato responsavel

Objetivo:
- definir quem recebe o aviso quando um novo cliente concluir uma etapa importante do cadastro

Campos sugeridos:

- nome do responsavel
- e-mail principal
- e-mail alternativo opcional
- telefone
- WhatsApp
- cargo ou funcao

Observacao:

- endereco completo nao parece necessario para este caso
- guardar apenas os dados realmente uteis para contato e operacao

---

### Secao 2 - Regras de notificacao

Objetivo:
- controlar quando o sistema deve avisar o responsavel

Opcoes sugeridas:

- notificar quando novo cadastro for criado
- notificar quando e-mail for confirmado
- notificar quando tenant entrar em `PENDING_APPROVAL`
- reenviar lembrete se continuar pendente por X horas ou dias

Minha recomendacao:

- o disparo principal deve acontecer quando o cliente confirmar o e-mail e entrar em `PENDING_APPROVAL`

Isso e melhor do que notificar no simples cadastro porque:

- evita ruido de conta criada e nunca confirmada
- sinaliza interesse mais real
- coincide com a hora certa da pesquisa previa

---

### Secao 3 - Politica de liberacao

Objetivo:
- deixar explicito se o cliente sera liberado automaticamente ou manualmente

Campos sugeridos:

- modo de liberacao:
  - automatica
  - manual
- exigir aprovacao administrativa
- exigir pagamento confirmado antes da liberacao
- texto interno de orientacao para o processo de analise

Minha recomendacao:

- manter `liberacao manual` como padrao para ambientes comerciais iniciais

---

### Secao 4 - Fila de onboarding

Objetivo:
- dar ao admin uma lista clara de quem esta aguardando acao

Colunas sugeridas:

- empresa
- responsavel
- e-mail
- telefone/WhatsApp
- data do cadastro
- data da confirmacao de e-mail
- status atual
- observacoes
- acoes

Acoes sugeridas:

- marcar como em analise
- aprovar
- rejeitar
- confirmar pagamento
- liberar acesso
- reenviar e-mail
- adicionar observacao

---

## Novo fluxo de estados recomendado

### Fluxo do cliente

1. `DRAFT`
2. `PENDING_EMAIL_VERIFICATION`
3. `PENDING_APPROVAL`
4. `PENDING_FIRST_PAYMENT` ou `READY_FOR_RELEASE`
5. `ACTIVE`

### Observacao importante

Hoje nao existe explicitamente `PENDING_EMAIL_VERIFICATION` no enum.

Entao ha dois caminhos:

#### Caminho A - mais simples

Reaproveitar os estados atuais:

- cadastro criado -> `DRAFT`
- e-mail confirmado -> `PENDING_APPROVAL`
- aprovado + aguardando pagamento -> `PENDING_FIRST_PAYMENT`
- pronto para liberar -> `READY_FOR_RELEASE`
- liberado -> `ACTIVE`

#### Caminho B - mais claro

Adicionar um novo estado:

- `PENDING_EMAIL_VERIFICATION`

Minha recomendacao:

- usar o Caminho B

Porque melhora muito a leitura operacional e a auditoria.

---

## Gatilho ideal de notificacao

### Evento recomendado

Quando o usuario clicar no link de confirmacao e o backend concluir `verifyEmail()`, o sistema deve:

1. marcar o usuario como verificado
2. atualizar o `TenantOperationalControl` para `PENDING_APPROVAL`
3. registrar data de entrada em analise
4. enviar e-mail para o responsavel configurado
5. criar ou atualizar uma fila visivel no admin

### Por que esse e o melhor gatilho

- evita notificar quem nunca confirmou e-mail
- representa um interesse real do cliente
- encaixa exatamente no momento em que a pesquisa previa precisa começar

---

## Proposta de novos dados persistidos

### Nova configuracao por tenant ou configuracao global

Criar uma entidade/configuracao para notificacao de onboarding.

Nome sugerido:

- `OnboardingNotificationSettings`

Campos sugeridos:

- id
- responsibleName
- responsibleEmail
- alternateEmail
- phone
- whatsapp
- manualApprovalEnabled
- notifyOnSignupCreated
- notifyOnEmailVerified
- notifyOnPendingApproval
- reminderAfterHours
- active

### Complementos em `TenantOperationalControl`

Campos adicionais recomendados:

- `emailVerifiedAt`
- `pendingApprovalAt`
- `approvalDecision`
- `approvalDecisionReason`
- `customerResearchNotes`
- `assignedReviewer`
- `rejectedAt`
- `rejectedBy`

Se quiser simplificar na primeira fase:

- `emailVerifiedAt`
- `pendingApprovalAt`
- `customerResearchNotes`

ja ajudam bastante.

---

## Backend - alteracoes recomendadas

### 1. Ajustar verificacao de e-mail

Ponto atual:

- `AuthService.verifyEmail()`

Nova responsabilidade depois de confirmar o e-mail:

- mover tenant para `PENDING_APPROVAL`
- gravar timestamp de confirmacao
- disparar notificacao ao responsavel

### 2. Criar servico de notificacao de onboarding

Nome sugerido:

- `OnboardingNotificationService`

Responsabilidades:

- decidir se deve enviar e-mail
- montar assunto e corpo da mensagem
- evitar duplicidade
- centralizar templates

### 3. Criar configuracao administrativa

Endpoints sugeridos:

- `GET /api/admin/onboarding/settings`
- `PATCH /api/admin/onboarding/settings`

### 4. Criar fila administrativa

Endpoints sugeridos:

- `GET /api/admin/onboarding/queue`
- `GET /api/admin/onboarding/queue/{tenantId}`
- `PATCH /api/admin/onboarding/queue/{tenantId}/analysis`
- `PATCH /api/admin/onboarding/queue/{tenantId}/approve`
- `PATCH /api/admin/onboarding/queue/{tenantId}/reject`
- `PATCH /api/admin/onboarding/queue/{tenantId}/release`

### 5. Registrar auditoria

Cada acao administrativa deveria registrar:

- ator
- tenant
- acao executada
- data/hora
- observacao

O projeto ja possui `AuditLogService`, entao vale reaproveitar essa base.

---

## Frontend - alteracoes recomendadas

### 1. Nova aba em `AdminSettings`

Tab nova:

- `onboarding`

Sugestao de label:

- `Onboarding`

Eyebrow:

- `Liberacao manual`

### 2. Conteudo da aba

Bloco A:
- configuracao do contato responsavel

Bloco B:
- regras de notificacao

Bloco C:
- fila de clientes aguardando analise

Bloco D:
- historico simples da acao selecionada

### 3. Melhorar leitura da aba `Empresas (Tenants)`

A aba atual de empresas ja tem:

- aprovar
- confirmar pagamento
- liberar

Mas ainda esta muito operacional e pouco orientada ao onboarding.

Minha recomendacao:

- manter `Empresas (Tenants)` como visao geral
- usar `Onboarding` como fila de trabalho do admin

---

## Mudanca recomendada na UX do cliente

Hoje, depois da confirmacao de e-mail, a mensagem tende a dizer que ele ja pode fazer login.

Para o novo fluxo manual, isso pode ficar incorreto.

Ajuste recomendado em `VerifyEmail.tsx` e backend:

Mensagem nova:

- "Seu e-mail foi confirmado com sucesso. Seu cadastro agora esta em analise e voce recebera a liberacao assim que a equipe concluir a validacao."

Se quiser manter login liberado mas operacao bloqueada:

- "Seu e-mail foi confirmado com sucesso. Voce ja pode entrar no sistema, mas algumas areas permanecerao bloqueadas ate a conclusao da analise do cadastro."

Minha recomendacao:

- permitir login
- bloquear operacao

Porque:

- reduz friccao
- permite que o cliente veja a estrutura da conta
- combina com o bloqueio operacional que ja existe

---

## E-mail sugerido ao responsavel

Assunto:

- `Novo cliente aguardando analise no GeoLimites`

Corpo sugerido:

"O cliente abaixo confirmou o e-mail e entrou em fila de aprovacao:

- Empresa: {tenantName}
- Responsavel: {userFullName}
- E-mail: {userEmail}
- Data da confirmacao: {emailVerifiedAt}

Acesse o painel administrativo para registrar a analise e concluir a liberacao."

Opcional:

- incluir link direto para a fila de onboarding

---

## E-mail sugerido ao cliente

Quando entrar em analise:

- "Seu cadastro foi confirmado e esta em analise pela equipe GeoLimites. Em breve voce recebera a liberacao para comecar a operacao."

Quando aprovado:

- "Seu cadastro foi aprovado. Seu acesso operacional ao GeoLimites foi liberado."

Quando rejeitado ou pendente de contato:

- "Seu cadastro precisa de validacao adicional. Nossa equipe entrara em contato para concluir a analise."

---

## Faseamento sugerido

### Fase 1 - valor rapido

- criar configuracao de contato responsavel
- disparar e-mail quando o cliente confirmar e-mail
- mover tenant para `PENDING_APPROVAL`
- mostrar fila simples no admin

### Fase 2 - operacao melhor

- adicionar observacoes de analise
- mostrar timestamps e responsavel pela acao
- permitir rejeitar ou marcar em analise

### Fase 3 - robustez comercial

- lembretes automaticos
- historico de onboarding
- filtros e dashboard
- SLA de resposta

---

## Recomendacao final

Implementar como:

- `Administracao > Onboarding`

e nao como:

- `Administracao > Administrador`

Porque isso:

- nomeia melhor o processo
- reaproveita a arquitetura atual
- encaixa com os estados operacionais que ja existem
- deixa a auditoria mais clara
- prepara o sistema para crescer sem remendos

---

## Recorte minimo recomendado para implementacao

Se o objetivo for entregar uma primeira versao enxuta, o menor recorte util seria:

1. nova configuracao `OnboardingNotificationSettings`
2. nova aba `Onboarding` no admin
3. trigger em `verifyEmail()` para mudar tenant para `PENDING_APPROVAL`
4. envio de e-mail ao responsavel configurado
5. tela de fila com botao `Aprovar` e `Liberar`
6. ajuste da mensagem para o cliente apos confirmar e-mail

Esse recorte ja entrega valor real sem exigir uma reforma grande no sistema.
