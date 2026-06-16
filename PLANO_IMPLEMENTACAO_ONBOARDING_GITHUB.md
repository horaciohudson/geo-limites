# Plano de Implementacao - Onboarding com Aprovacao Manual

## Objetivo

Transformar a proposta de onboarding com aprovacao manual em um recorte pequeno, implementavel e facil de publicar no GitHub sem misturar outras frentes do workspace.

Este plano foi escrito para facilitar:

- abertura de issue
- criacao de branch
- execucao em etapas
- revisao de PR
- publicacao sem contaminar o commit com mudancas paralelas

---

## Escopo minimo recomendado

Primeira entrega util:

1. criar configuracao administrativa de contato e notificacao de onboarding
2. mover o tenant para `PENDING_APPROVAL` quando o usuario confirmar o e-mail
3. disparar e-mail para o responsavel configurado
4. criar nova aba `Onboarding` no admin
5. listar clientes aguardando analise
6. permitir aprovar e liberar
7. ajustar a mensagem mostrada ao cliente apos confirmacao do e-mail

Esse recorte ja entrega valor de negocio real e reaproveita a estrutura atual do sistema.

---

## Fora do escopo desta primeira entrega

Para evitar crescimento desnecessario da task, deixar fora por enquanto:

- dashboard completo de SLA
- lembretes automáticos recorrentes
- rejeicao detalhada com workflow complexo
- historico completo de timeline
- notificacao por WhatsApp
- segmentacao avancada de varios revisores
- motor de regras comercial

---

## Branch sugerida

Nome sugerido:

```bash
feat/onboarding-manual-approval
```

Se quiser deixar ainda mais explicito:

```bash
feat/admin-onboarding-notifications
```

---

## Issue sugerida

Titulo sugerido:

`feat: implementar onboarding com aprovacao manual e notificacao administrativa`

Descricao curta sugerida:

```md
## Objetivo
Criar um fluxo de onboarding em que o cliente confirma o e-mail, entra em fila de analise e o responsavel administrativo recebe aviso para aprovar e liberar o acesso operacional.

## Entrega minima
- configuracao de contato responsavel
- disparo de e-mail ao confirmar e-mail
- tenant movido para PENDING_APPROVAL
- nova aba Onboarding no admin
- fila simples de analise com aprovar/liberar
- ajuste da mensagem do cliente apos confirmacao
```

---

## PR sugerido

Titulo sugerido:

`feat: add manual onboarding approval flow`

Descricao curta sugerida:

```md
## O que muda
- adiciona configuracao administrativa para notificacoes de onboarding
- move tenant para PENDING_APPROVAL apos verificacao de e-mail
- envia e-mail ao responsavel configurado
- cria aba Onboarding no painel administrativo
- exibe fila simples de clientes aguardando analise
- ajusta mensagem ao cliente apos confirmacao de e-mail

## Fora do escopo
- lembretes automaticos
- workflow completo de rejeicao
- dashboard de SLA
```

---

## Recorte tecnico por camada

## 1. Banco de dados

### Nova tabela sugerida

Criar migration para uma tabela de configuracao de notificacao de onboarding.

Nome sugerido:

- `tab_onboarding_notification_settings`

Campos sugeridos:

- `onboarding_notification_settings_id`
- `responsible_name`
- `responsible_email`
- `alternate_email`
- `phone`
- `whatsapp`
- `manual_approval_enabled`
- `notify_on_signup_created`
- `notify_on_email_verified`
- `notify_on_pending_approval`
- `active`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

### Ajuste em tabela existente

Expandir `tab_tenant_operational_control` com os campos minimos:

- `email_verified_at`
- `pending_approval_at`
- `customer_research_notes`

Opcional nesta fase:

- `assigned_reviewer`

### Arquivos provaveis

- `Backend/src/main/resources/db/migration/V12__onboarding_notification_settings.sql`
- `Backend/src/main/resources/db/migration/V13__tenant_onboarding_manual_review_fields.sql`

Observacao:

- se a sequencia de migrations local ja estiver maior, ajustar o numero real antes de criar o arquivo

---

## 2. Backend

### Entidades e repositórios

Arquivos novos sugeridos:

- `Backend/src/main/java/com/momorialPro/CadMemorial/model/OnboardingNotificationSettings.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/repository/OnboardingNotificationSettingsRepository.java`

### DTOs

Arquivos novos sugeridos:

- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/admin/OnboardingNotificationSettingsDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/admin/UpdateOnboardingNotificationSettingsRequest.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/admin/OnboardingQueueItemDTO.java`

### Services

Arquivos novos sugeridos:

- `Backend/src/main/java/com/momorialPro/CadMemorial/service/OnboardingNotificationSettingsService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/OnboardingNotificationService.java`

Arquivos a alterar:

- `Backend/src/main/java/com/momorialPro/CadMemorial/service/AuthService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/TenantAdministrationService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/AccountEmailService.java`

### Controllers

Opcoes:

- criar um controller novo so para onboarding admin
- ou expandir o controller de tenants operacionais

Minha recomendacao:

- criar controller novo, porque a semantica fica mais limpa

Arquivo sugerido:

- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/OnboardingAdministrationController.java`

### Endpoints minimos

Configuracao:

- `GET /api/admin/onboarding/settings`
- `PATCH /api/admin/onboarding/settings`

Fila:

- `GET /api/admin/onboarding/queue`
- `PATCH /api/admin/onboarding/queue/{tenantId}/approve`
- `PATCH /api/admin/onboarding/queue/{tenantId}/release`
- `PATCH /api/admin/onboarding/queue/{tenantId}/notes`

### Regra central

Ao executar `AuthService.verifyEmail()`:

1. marcar usuario como verificado
2. atualizar `TenantOperationalControl`:
   - `onboardingStatus = PENDING_APPROVAL`
   - `emailVerifiedAt = now`
   - `pendingApprovalAt = now`
3. acionar `OnboardingNotificationService`

### Regras de seguranca

- endpoints admin protegidos com `hasRole('ADMIN')`
- evitar reenvio duplicado do mesmo evento
- se o tenant ja estiver `ACTIVE`, nao regressar estado automaticamente

---

## 3. Frontend

### Services

Arquivo novo sugerido:

- `Frontend/src/services/onboardingAdminService.ts`

### Tela administrativa

Arquivo a alterar:

- `Frontend/src/pages/AdminSettings.tsx`

Mudancas:

- adicionar tab `onboarding`
- incluir card de configuracao do responsavel
- incluir card da fila de onboarding
- incluir acoes de aprovar, anotar e liberar

### Tipos

Arquivo novo sugerido:

- `Frontend/src/types/onboarding.ts`

### Mensagem de verificacao

Arquivo a alterar:

- `Frontend/src/pages/VerifyEmail.tsx`

Mensagem sugerida:

- "Seu e-mail foi confirmado com sucesso. Seu cadastro agora esta em analise e algumas areas permanecem bloqueadas ate a liberacao da equipe."

### Opcional de primeira fase

Se quiser mostrar o estado ao proprio cliente:

- `Frontend/src/pages/MyAccount.tsx`

Mas isso pode ficar para a segunda fase.

---

## 4. E-mails

### E-mail para o responsavel

Assunto:

- `Novo cliente aguardando analise no GeoLimites`

Conteudo minimo:

- empresa
- nome do responsavel
- e-mail
- data de confirmacao
- link para o painel admin

### E-mail para o cliente

Nesta primeira fase, pode ser suficiente apenas mudar a mensagem na tela apos confirmacao.

Se quiser evoluir:

- disparar e-mail de "cadastro em analise"
- disparar e-mail de "acesso liberado"

---

## Arquivos provavelmente tocados

### Backend - novos

- `Backend/src/main/java/com/momorialPro/CadMemorial/model/OnboardingNotificationSettings.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/repository/OnboardingNotificationSettingsRepository.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/admin/OnboardingNotificationSettingsDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/admin/UpdateOnboardingNotificationSettingsRequest.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/admin/OnboardingQueueItemDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/OnboardingNotificationSettingsService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/OnboardingNotificationService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/OnboardingAdministrationController.java`
- `Backend/src/main/resources/db/migration/V12__onboarding_notification_settings.sql`
- `Backend/src/main/resources/db/migration/V13__tenant_onboarding_manual_review_fields.sql`

### Backend - alterados

- `Backend/src/main/java/com/momorialPro/CadMemorial/service/AuthService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/TenantAdministrationService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/model/TenantOperationalControl.java`

### Frontend - novos

- `Frontend/src/services/onboardingAdminService.ts`
- `Frontend/src/types/onboarding.ts`

### Frontend - alterados

- `Frontend/src/pages/AdminSettings.tsx`
- `Frontend/src/pages/VerifyEmail.tsx`
- `Frontend/src/styles/AdminSettings.css`

---

## Ordem de implementacao recomendada

### Etapa 1 - persistencia

- criar migrations
- criar entidade e repositorio
- expandir `TenantOperationalControl`

### Etapa 2 - backend de configuracao

- criar DTOs
- criar service de settings
- criar endpoints `GET/PATCH` de configuracao

### Etapa 3 - backend do evento

- alterar `verifyEmail()`
- mover tenant para `PENDING_APPROVAL`
- disparar notificacao

### Etapa 4 - backend da fila

- criar DTO da fila
- criar endpoint da fila
- criar endpoints de aprovar e liberar

### Etapa 5 - frontend admin

- criar service frontend
- adicionar tab `Onboarding`
- montar formulario de configuracao
- montar lista de fila

### Etapa 6 - frontend cliente

- ajustar mensagem em `VerifyEmail.tsx`

### Etapa 7 - validacao

- compile do backend
- build do frontend
- teste manual do fluxo completo

---

## Validacao minima

### Cenário 1 - cadastro

1. criar nova conta
2. confirmar que tenant nasce bloqueado
3. confirmar que o usuario nao acessa a operacao liberada antes da aprovacao

### Cenário 2 - verificacao de e-mail

1. clicar no link de verificacao
2. conferir que o usuario foi verificado
3. conferir que o tenant foi para `PENDING_APPROVAL`
4. conferir que o admin recebeu notificacao

### Cenário 3 - painel admin

1. abrir `Administracao > Onboarding`
2. ver o tenant na fila
3. aprovar
4. liberar acesso
5. validar se o tenant passa a operar normalmente

### Cenário 4 - UX do cliente

1. apos verificar e-mail, conferir a mensagem correta
2. entrar com login
3. validar que areas operacionais continuam bloqueadas ate liberacao

---

## Comandos de validacao local

### Backend

```bash
cd Backend
.\mvnw.cmd -q -DskipTests compile
```

### Frontend

```bash
cd Frontend
npm run build
```

---

## Recorte de commit sugerido

Como o workspace esta contaminado por outras frentes, o ideal e nao misturar onboarding com alteracoes antigas.

### Commit 1 - banco e backend base

Mensagem sugerida:

```bash
feat: add onboarding notification settings backend
```

### Commit 2 - fluxo de verificacao e fila admin

Mensagem sugerida:

```bash
feat: trigger manual onboarding approval after email verification
```

### Commit 3 - frontend admin e mensagem do cliente

Mensagem sugerida:

```bash
feat: add onboarding admin tab and pending approval messaging
```

Se quiser manter tudo em um unico PR, ainda assim vale estruturar os commits internamente dessa forma.

---

## Staging seguro sugerido

Quando chegar na hora de commitar, evitar `git add .`

Usar staging explicito, por exemplo:

```bash
git add -- \
  Backend/src/main/java/com/momorialPro/CadMemorial/model/OnboardingNotificationSettings.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/repository/OnboardingNotificationSettingsRepository.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/service/OnboardingNotificationSettingsService.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/service/OnboardingNotificationService.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/service/AuthService.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/model/TenantOperationalControl.java \
  Backend/src/main/resources/db/migration/V12__onboarding_notification_settings.sql \
  Backend/src/main/resources/db/migration/V13__tenant_onboarding_manual_review_fields.sql \
  Backend/src/main/java/com/momorialPro/CadMemorial/controller/OnboardingAdministrationController.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/dto/admin/OnboardingNotificationSettingsDTO.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/dto/admin/UpdateOnboardingNotificationSettingsRequest.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/dto/admin/OnboardingQueueItemDTO.java \
  Frontend/src/services/onboardingAdminService.ts \
  Frontend/src/types/onboarding.ts \
  Frontend/src/pages/AdminSettings.tsx \
  Frontend/src/pages/VerifyEmail.tsx \
  Frontend/src/styles/AdminSettings.css \
  PROPOSTA_ONBOARDING_APROVACAO_MANUAL.md \
  PLANO_IMPLEMENTACAO_ONBOARDING_GITHUB.md
```

Depois conferir:

```bash
git diff --cached --name-status
```

---

## Cuidado especial

Antes de comecar a codar, revisar estas frentes para nao misturar:

- mudancas de manual
- ajustes de templates
- creditos
- autenticacao antiga
- arquivos temporarios e logs

Ou seja:

- manter o onboarding isolado
- usar staging arquivo por arquivo
- validar backend e frontend antes do commit

---

## Melhor ponto de partida pratico

Se for executar agora, a melhor primeira etapa de codigo e:

1. criar migrations
2. criar entidade/configuracao `OnboardingNotificationSettings`
3. expandir `TenantOperationalControl`
4. criar endpoint admin de configuracao

Isso abre a base para o restante sem ainda mexer no fluxo do cliente.

---

## Proximo passo recomendado

Implementar primeiro o bloco:

- banco
- modelo
- repositorio
- DTOs de settings
- endpoint `GET/PATCH /api/admin/onboarding/settings`

Esse recorte e pequeno, independente e ja deixa a base pronta para a puxada seguinte no GitHub.
