# Handoff Para Nova Task

Este arquivo resume o estado atual do projeto para continuidade em uma nova task, sem depender do historico completo da conversa.

## 1. Situacao geral

O projeto foi bastante evoluido localmente, mas essas alteracoes ainda nao foram enviadas ao GitHub.

Ponto importante:

- o repositorio local contem muitas mudancas pendentes
- a VPS conseguiu clonar o repositorio via SSH normalmente
- a VPS recebeu uma versao antiga do projeto, porque o remoto ainda nao foi atualizado
- por isso os scripts novos de deploy nao existem no clone da VPS neste momento

## 2. O que ja foi feito localmente

### Backend

Foram preparados ajustes para deploy e endurecimento de producao, incluindo:

- CORS configuravel por ambiente
- `APP_FRONTEND_URL`, `PUBLIC_APP_URL` e `CORS_ALLOWED_ORIGIN_PATTERNS`
- `server.forward-headers-strategy=framework`
- logging mais enxuto para producao
- storage parametrizado para DXF e templates
- Swagger ajustado para URL publica
- remocao de `@CrossOrigin("*")` onde isso conflitaria com a politica centralizada
- documentacao de ambiente e deploy atualizada

### Frontend

Foi concluida uma limpeza grande de TypeScript e contratos de componentes:

- o `npm run build` do frontend agora fecha com sucesso
- erros antigos de `Input`, `Button`, imports type-only, handlers e estados nao usados foram corrigidos
- o fluxo de `Memorial` foi religado de forma funcional para carregamento de arquivos/DXF
- warnings de `dynamic import` redundante foram eliminados
- restou apenas warning nao bloqueante de chunk grande do Vite

### Deploy

Foi criado e refinado o material de deploy:

- `deploy/README_VPS.md`
- `deploy/nginx/geolimites.conf`
- `deploy/systemd/geolimites-backend.service`
- `deploy/scripts/deploy-frontend.sh`
- `deploy/scripts/deploy-backend.sh`

## 3. Validacao local ja feita

### Backend

Ja houve validacao de empacotamento local do backend com sucesso.

### Frontend

O frontend builda localmente com:

```bash
cd Frontend
npm run build
```

Estado atual:

- build concluido com sucesso
- sem erro TypeScript bloqueante
- apenas warning de chunk grande do Vite

## 4. Estado atual do Git

No momento desta anotacao:

- o remoto `origin` esta configurado para `git@github.com:horaciohudson/memorial-pro.git`
- o branch local esta em `main`
- existem muitas alteracoes locais ainda nao commitadas/pushadas

Conclusao:

- o GitHub ainda nao contem todas as mudancas feitas nesta sessao
- a VPS nao deve ser tratada como espelho fiel do que esta no workspace local

## 5. O que aconteceu na VPS

Foi registrado o seguinte fluxo:

1. a VPS conseguiu clonar o repositorio via SSH normalmente
2. o clone foi criado em `/opt/geolimites/repo`
3. em seguida foi tentado executar:

```bash
chmod +x deploy/scripts/*.sh
./deploy/scripts/deploy-frontend.sh
./deploy/scripts/deploy-backend.sh
```

4. esses comandos falharam porque a pasta `deploy/scripts` nao existia no clone atual da VPS

Causa real:

- o repositrio remoto clonado ainda nao tinha recebido os scripts criados localmente

Isto nao indica problema de:

- SSH com GitHub
- rede da VPS
- clone do repositorio
- Nginx
- systemd
- Java
- PostgreSQL

O problema ocorreu antes dessas etapas, por desencontro entre workspace local e remoto.

## 6. Arquivos importantes para a proxima task

### Repasse tecnico e deploy

- `deploy/README_VPS.md`
- `deploy/nginx/geolimites.conf`
- `deploy/systemd/geolimites-backend.service`
- `deploy/scripts/deploy-frontend.sh`
- `deploy/scripts/deploy-backend.sh`
- `Backend/logs/logs.md`

### Backend importante

- `Backend/src/main/resources/application.properties`
- `Backend/src/main/resources/application-dev.properties`
- `Backend/src/main/java/com/momorialPro/CadMemorial/security/SecurityConfig.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/config/SwaggerConfig.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/config/AuthFlowProperties.java`
- `Backend/.env.example`
- `Backend/README-ENV.md`

### Frontend importante

- `Frontend/src/services/api.ts`
- `Frontend/vite.config.ts`
- `Frontend/.env.production.example`
- `Frontend/.env.development.example`
- `Frontend/src/pages/Memorial.tsx`
- `Frontend/src/pages/Report.tsx`
- `Frontend/src/components/ViewerDXF.tsx`
- `Frontend/src/utils/dxfParser.ts`

## 7. O que falta fazer depois

Quando a nova task retomar, a trilha recomendada e:

1. revisar rapidamente o estado do `git status`
2. decidir se vai consolidar tudo em um ou mais commits
3. atualizar o GitHub com `commit` e `push`
4. na VPS, rodar `git pull`
5. aplicar o fluxo de deploy usando os scripts ou o fluxo manual do `README_VPS.md`
6. validar:
   - frontend no dominio
   - backend via `/api`
   - Swagger
   - arquivos DXF
   - templates
   - e-mails de verificacao

## 8. Sequencia recomendada para a proxima task

### Fase 1: sincronizar o remoto

- verificar cuidadosamente o que entra no commit
- registrar um commit de handoff/deploy
- fazer push para `origin/main`

### Fase 2: atualizar a VPS

```bash
cd /opt/geolimites/repo
git pull
chmod +x deploy/scripts/*.sh
```

Depois:

```bash
./deploy/scripts/deploy-frontend.sh
./deploy/scripts/deploy-backend.sh
```

### Fase 3: validar em producao

- abrir `https://www.geolimites.com.br`
- testar `https://www.geolimites.com.br/api/auth/login`
- abrir `https://www.geolimites.com.br/swagger-ui/index.html`
- verificar logs do backend:

```bash
sudo journalctl -u geolimites-backend -f
```

## 9. Observacao importante

Foi combinado explicitamente que o Git **ainda nao sera atualizado agora**. Portanto:

- nao assumir que a VPS ja pode usar os scripts novos
- nao assumir que o remoto reflita o estado local
- usar este arquivo como base para abrir a nova task

## 10. Resumo executivo

Resumo curto do ponto atual:

- o projeto local esta bem mais avancado que o GitHub
- o frontend builda localmente
- o backend ja foi preparado para producao
- o pacote de deploy foi criado
- a VPS clonou o repositrio com sucesso
- a publicacao ainda nao prosseguiu porque o remoto nao contem as alteracoes locais

## 11. Retomada antes de novas mudancas

Este bloco foi adicionado para preservar o contexto imediatamente antes de novas alteracoes locais que podem dificultar a retomada posterior.

### Estado validado nesta retomada

- o frontend foi validado novamente com `npm run build` e o build fechou com sucesso
- o backend foi validado novamente com `./mvnw clean package -DskipTests` e o empacotamento fechou com sucesso
- no frontend restou apenas o warning nao bloqueante de chunk grande do Vite
- portanto o workspace atual esta tecnicamente publicavel no estado validado nesta retomada

### Fotografia do Git nesta retomada

Na verificacao feita nesta retomada, o workspace local estava com volume alto de alteracoes pendentes:

- `157` arquivos modificados
- `14` arquivos deletados
- `1` arquivo renomeado
- `46` arquivos nao rastreados
- total aproximado de `218` entradas no `git status --porcelain`

Conclusao pratica:

- antes de publicar, sera importante separar bem o que entra no primeiro commit
- o maior risco imediato nao e build quebrado, e sim misturar mudancas demais no mesmo commit

### Ponto importante descoberto agora

O arquivo abaixo foi citado antes como importante para a proxima task, mas nesta retomada ele nao foi encontrado no workspace:

- `Backend/logs/logs.md`

Se ele for relevante, verificar depois se:

- foi removido intencionalmente
- foi movido para outro local
- ou apenas nao precisa mais constar neste handoff

### Recorte sugerido para o primeiro commit

Se a retomada futura quiser sincronizar primeiro apenas o basico de handoff e deploy, o recorte mais seguro e com foco nestes arquivos:

- `HANDOFF_NOVA_TASK.md`
- `deploy/README_VPS.md`
- `deploy/nginx/geolimites.conf`
- `deploy/systemd/geolimites-backend.service`
- `deploy/scripts/deploy-frontend.sh`
- `deploy/scripts/deploy-backend.sh`
- `Backend/.env.example`
- `Backend/README-ENV.md`
- `Backend/src/main/resources/application.properties`
- `Backend/src/main/resources/application-dev.properties`
- `Backend/src/main/java/com/momorialPro/CadMemorial/config/SwaggerConfig.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/security/SecurityConfig.java`
- `Frontend/.env.production.example`
- `Frontend/.env.development.example`
- `Frontend/vite.config.ts`
- `Frontend/src/services/api.ts`

### O que evitar misturar nesse primeiro commit

Foi identificado um bloco muito maior de alteracoes que provavelmente vale revisar separadamente antes de publicar:

- mudancas amplas de backend em `controller`, `service`, `model` e `repository`
- novas frentes de configuracao e fluxo de conta/e-mail/admin
- grande volume de alteracoes em paginas e componentes do frontend
- remocoes de testes do backend
- remocoes e substituicoes de componentes/servicos antigos do frontend

Motivo:

- o workspace completo builda hoje
- mas um commit parcial mal recortado pode subir apenas partes acopladas e deixar o repositorio remoto em estado confuso

### Observacao de acoplamento descoberta nesta retomada

As classes novas de configuracao abaixo nao estao isoladas:

- `Backend/src/main/java/com/momorialPro/CadMemorial/config/AuthFlowProperties.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/config/BootstrapAdminProperties.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/config/MailSettingsProperties.java`

Elas ja aparecem consumidas por servicos e inicializacao. Portanto:

- evitar tentar publicar apenas pedacos desse bloco sem revisar o conjunto relacionado

### Melhor proximo passo quando voltar

Ao retomar a task depois das novas mudancas locais, seguir esta ordem:

1. reler este arquivo
2. rodar `git status --short --branch`
3. comparar o estado novo com esta fotografia
4. decidir se ainda faz sentido manter o primeiro commit apenas com handoff/deploy
5. somente depois preparar `git add`, `commit` e `push`
