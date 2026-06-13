# Handoff Para Nova Task

Este arquivo resume o estado atual do projeto `geo-limites` para continuidade em uma nova task, sem depender do historico completo da conversa.

Data de referencia desta anotacao: `2026-06-13`.

## 1. Situacao geral atual

Esta anotacao substitui o handoff antigo de deploy generico. O foco mais recente do trabalho foi:

- estabilizacao do deploy e diagnostico na VPS
- publicacao do backend faltante de configuracoes administrativas
- correcao do cadastro de imovel na nuvem
- implementacao e correcao da troca de senha
- revisao do sistema de custos e creditos
- criacao de configuracao persistente de precificacao de creditos dentro de `Administracao`

Ponto importante:

- o workspace local continua com muitas alteracoes e artefatos de outras frentes
- ha arquivos modificados que nao pertencem apenas a esta frente de creditos
- nao assumir que tudo no `git status` deva entrar no mesmo commit
- evitar revert de mudancas nao relacionadas

## 2. O que foi resolvido antes desta nova fase

### VPS e deploy

Ja foi identificado e contornado ao longo das tasks anteriores:

- frontend antigo na VPS por build/publicacao incompletos
- cache de navegador exigindo `Ctrl + F5` apos deploy
- divergencia entre workspace local e branch publicada
- necessidade de publicacao mais segura usando branch limpa de deploy

Branch remota de deploy usada nesta linha de trabalho:

- `publish/vps-sync-20260612`

### Configuracao da IA

Foi resolvido o erro:

- `No static resource api/admin/settings/api`

Com isso:

- a tabela `tab_api_settings` passou a existir na nuvem
- os endpoints de API settings foram publicados
- a tela administrativa de configuracao da IA voltou a funcionar

Arquivos centrais desta parte:

- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/AdminSettingsController.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/ApiSettingsService.java`
- `Backend/src/main/resources/db/migration/V10__api_provider_settings.sql`

### Cadastro de imovel na nuvem

Foi corrigido o problema da mensagem antecipada em `Proprietarios`, que cobrava dados antes da hora.

Resultado:

- navegacao entre abas sem cobranca antecipada
- mensagem vermelha prematura removida

Arquivos principais:

- `Frontend/src/pages/PropertyRegister.tsx`
- `Frontend/src/components/property/PropertyOwners.tsx`

### Troca de senha

Foi resolvido primeiro localmente e depois na nuvem:

- antes nao existia a rota `/api/auth/change-password`
- depois havia `500` por forma de localizar o usuario atual
- por fim ficou funcional na nuvem

Arquivos principais:

- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/AuthController.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/AuthService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/ChangePasswordRequestDTO.java`

## 3. Fase atual: precificacao persistente de creditos

O pedido mais recente do usuario foi tirar os precos hardcoded e criar uma pagina dentro de `Administracao` para definir os valores oficiais de creditos.

Diagnostico encontrado antes da implementacao:

- havia mais de uma fonte hardcoded de precos no frontend
- o frontend podia enviar `credits` e `amountReais` e isso era tratado como verdade
- os creditos de boas-vindas estavam hardcoded
- a regra de consumo por lote estava hardcoded
- a compra customizada nao estava ancorada numa tabela oficial do backend

## 4. O que foi implementado nesta fase

### Backend

Foi criada a configuracao persistente singleton de precificacao:

- `Backend/src/main/java/com/momorialPro/CadMemorial/model/CreditPricingSettings.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/repository/CreditPricingSettingsRepository.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/CreditPricingSettingsService.java`
- `Backend/src/main/resources/db/migration/V11__credit_pricing_settings.sql`

DTOs novos:

- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/CreditPackageDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/CreditPricingSettingsDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/UpdateCreditPackageRequest.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/UpdateCreditPricingSettingsRequest.java`

Endpoints novos:

- `GET /api/admin/settings/credits`
- `PATCH /api/admin/settings/credits`
- `GET /api/credits/settings`

Arquivos principais:

- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/AdminSettingsController.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/CreditController.java`

### Backend adaptado para usar a tabela oficial

Foram adaptados:

- `CreditService` para usar `welcomeCredits` persistido
- calculo oficial de consumo por faixa de lotes
- compra por pacote oficial via `packageId`
- compra customizada validando `customPricePerCredit` oficial

Arquivo central:

- `Backend/src/main/java/com/momorialPro/CadMemorial/service/CreditService.java`

### Frontend administrativo

Foi criada a nova aba `Creditos` dentro de `Administracao` com:

- regras gerais
- creditos de boas-vindas
- custo por faixa de lotes
- preco avulso por credito
- edicao dos pacotes publicados

Arquivos principais:

- `Frontend/src/pages/AdminSettings.tsx`
- `Frontend/src/services/adminSettings.ts`

### Frontend de compra e exibicao

Foi adaptado para ler a tabela oficial do backend:

- `Frontend/src/components/financial/CreditPurchaseForm.tsx`
- `Frontend/src/services/creditService.ts`
- `Frontend/src/types/credit.ts`

Tambem foram alinhados os textos de regra operacional exibidos ao usuario, para nao ficarem mais fixos:

- `Frontend/src/components/financial/CreditBalance.tsx`
- `Frontend/src/pages/Financial.tsx`
- `Frontend/src/pages/MyAccount.tsx`

## 5. Regra de cobranca atual

O sistema nao cobra por quantidade de caracteres.

O calculo encontrado hoje e:

- baseado em quantidade estimada de lotes
- com faixas configuraveis em `Administracao`
- usando:
  - `singleLotCreditCost`
  - `smallProjectMaxLots`
  - `smallProjectCreditCost`
  - `largeProjectCreditCost`

Arquivos de referencia:

- `Backend/src/main/java/com/momorialPro/CadMemorial/service/CreditService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialCreditIntegrationService.java`

Observacao importante:

- a formula de cobranca esta pronta
- mas o consumo automatico no fluxo principal ainda aparece desabilitado na integracao de memorial

Arquivo que mostra isso:

- `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialAiServiceWithCredits.java`

## 6. O que foi validado agora

Nesta retomada recente foi validado:

### Backend

Comando executado com sucesso:

```bash
cd Backend
.\mvnw.cmd -q -DskipTests compile
```

### Frontend

Comando executado com sucesso:

```bash
cd Frontend
npm run build
```

Estado atual do frontend:

- build concluido com sucesso
- sem erro TypeScript bloqueante
- apenas warning nao bloqueante de chunk grande do Vite

Tambem foram consultados diagnosticos da IDE nos arquivos alterados, sem erros nos arquivos fechados nesta fase.

## 7. Arquivos mais importantes para a proxima task

### Backend de creditos

- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/AdminSettingsController.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/CreditController.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/CreditPricingSettingsService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/CreditService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialCreditIntegrationService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/MemorialAiServiceWithCredits.java`
- `Backend/src/main/resources/db/migration/V11__credit_pricing_settings.sql`

### Frontend de administracao e compra

- `Frontend/src/pages/AdminSettings.tsx`
- `Frontend/src/services/adminSettings.ts`
- `Frontend/src/components/financial/CreditPurchaseForm.tsx`
- `Frontend/src/components/financial/CreditBalance.tsx`
- `Frontend/src/pages/Financial.tsx`
- `Frontend/src/pages/MyAccount.tsx`
- `Frontend/src/services/creditService.ts`
- `Frontend/src/types/credit.ts`

### Logs e referencia de nuvem

- `Backend/logs/logs.md`

## 8. Pendencias reais para a proxima task

As pendencias mais importantes agora sao:

1. decidir o recorte de commit desta fase de creditos sem misturar alteracoes antigas nao relacionadas
2. publicar para a branch de deploy `publish/vps-sync-20260612`
3. atualizar a VPS
4. validar a criacao da tabela `tab_credit_pricing_settings` na nuvem
5. validar a nova aba `Creditos` em `Administracao`
6. validar a tela de compra lendo a tabela oficial do backend
7. decidir se ja sera religado o desconto real no fluxo do memorial

## 9. Pontos de atencao importantes

### Git e workspace

- o repositrio esta sujo com muitas alteracoes nao relacionadas entre si
- nao assumir que um `git add .` e seguro
- revisar com cuidado o recorte do commit
- nao reverter mudancas do usuario sem necessidade

### Publicacao

- a branch de deploy usada nesta frente nao e o `main`, e sim `publish/vps-sync-20260612`
- o ideal e continuar usando publicacao limpa/recortada

### Creditos em producao

Mesmo com a configuracao pronta, ainda restam dois pontos sensiveis:

- o fluxo de compra ainda tem partes de simulacao de confirmacao
- o consumo automatico no memorial ainda nao esta religado no fluxo principal

Isto significa:

- a tabela administrativa de precos esta pronta
- a fonte oficial de preco esta pronta
- mas a blindagem final de producao da cobranca ainda merece uma task propria

## 10. Sequencia recomendada para a proxima task

Ao retomar:

1. reler este arquivo
2. rodar `git status --short --branch`
3. separar somente o bloco de creditos/publicacao desejado
4. confirmar quais arquivos entram no commit
5. commitar e enviar para `publish/vps-sync-20260612`
6. na VPS, fazer `git pull` da branch publicada
7. rebuildar backend/frontend
8. validar:
   - `Administracao > Creditos`
   - `GET /api/admin/settings/credits`
   - `GET /api/credits/settings`
   - criacao da tabela `tab_credit_pricing_settings`
   - compra de creditos usando pacote oficial
   - compra customizada usando preco oficial

## 11. Resumo executivo

Resumo curto e atualizado do ponto atual:

- a fase de IA administrativa foi resolvida
- o problema de troca de senha foi resolvido local e nuvem
- o problema de validacao antecipada em `Proprietarios` foi resolvido
- a nova configuracao persistente de creditos foi implementada
- a aba `Creditos` em `Administracao` foi criada
- backend e frontend passaram na validacao local
- a publicacao final desta fase ainda nao foi feita
- o maior cuidado agora e publicar sem misturar alteracoes paralelas do workspace

## 12. Recorte sugerido para o proximo commit

Se a proxima task quiser publicar apenas esta fase de configuracao persistente de creditos, o recorte mais seguro e:

### Backend: incluir

- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/AdminSettingsController.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/CreditController.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/CreditService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/CreditPricingSettingsService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/CreditPurchaseRequestDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/CreditPackageDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/CreditPricingSettingsDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/UpdateCreditPackageRequest.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/UpdateCreditPricingSettingsRequest.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/model/CreditPricingSettings.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/repository/CreditPricingSettingsRepository.java`
- `Backend/src/main/resources/db/migration/V11__credit_pricing_settings.sql`

### Frontend: incluir

- `Frontend/src/pages/AdminSettings.tsx`
- `Frontend/src/services/adminSettings.ts`
- `Frontend/src/components/financial/CreditPurchaseForm.tsx`
- `Frontend/src/components/financial/CreditBalance.tsx`
- `Frontend/src/pages/Financial.tsx`
- `Frontend/src/pages/MyAccount.tsx`
- `Frontend/src/services/creditService.ts`
- `Frontend/src/types/credit.ts`

### Handoff: incluir

- `HANDOFF_NOVA_TASK.md`

### Nao incluir neste commit focado em creditos

- `Backend/src/main/java/com/momorialPro/CadMemorial/controller/AuthController.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/service/AuthService.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/ChangePasswordRequestDTO.java`
- `Frontend/src/pages/PropertyRegister.tsx`
- `Frontend/src/components/property/PropertyOwners.tsx`
- arquivos de DXF, geometria, templates, viewer e reformas visuais
- `.trae-publish-temp/`
- `Backend/DXF/`
- `Backend/Memoriais/`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/PolygonRequestDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/PolygonResultDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/VectorDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/dto/VertexDTO.java`
- `Backend/src/main/java/com/momorialPro/CadMemorial/util/GeometryCalculator.java`
- `Frontend/src/utils/geometry.ts`
- `Frontend/src/utils/polygonExtraction.ts`
- `HANDOFF_REFORMA_VISUAL.md`

### Motivo do recorte

- o bloco acima fecha a funcionalidade de precificacao persistente de creditos de ponta a ponta
- backend e frontend desse recorte ja passaram em validacao local
- incluir outros arquivos agora aumenta o risco de publicar mudancas paralelas sem relacao direta com creditos

## 13. Sequencia exata de git add sugerida

Se a proxima task quiser preparar somente o commit da fase de creditos, usar um staging explicito, arquivo por arquivo.

### Comando sugerido

Executar na raiz do repositorio:

```bash
git add -- \
  HANDOFF_NOVA_TASK.md \
  Backend/src/main/java/com/momorialPro/CadMemorial/controller/AdminSettingsController.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/controller/CreditController.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/service/CreditService.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/service/CreditPricingSettingsService.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/dto/CreditPurchaseRequestDTO.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/dto/CreditPackageDTO.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/dto/CreditPricingSettingsDTO.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/dto/UpdateCreditPackageRequest.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/dto/UpdateCreditPricingSettingsRequest.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/model/CreditPricingSettings.java \
  Backend/src/main/java/com/momorialPro/CadMemorial/repository/CreditPricingSettingsRepository.java \
  Backend/src/main/resources/db/migration/V11__credit_pricing_settings.sql \
  Frontend/src/pages/AdminSettings.tsx \
  Frontend/src/services/adminSettings.ts \
  Frontend/src/components/financial/CreditPurchaseForm.tsx \
  Frontend/src/components/financial/CreditBalance.tsx \
  Frontend/src/pages/Financial.tsx \
  Frontend/src/pages/MyAccount.tsx \
  Frontend/src/services/creditService.ts \
  Frontend/src/types/credit.ts
```

### Conferencia logo depois

Depois do `git add`, conferir exatamente o staging:

```bash
git diff --cached --name-status
```

Esperado:

- apenas arquivos desta fase de creditos
- nenhum arquivo de troca de senha
- nenhum arquivo de `PropertyRegister` ou `PropertyOwners`
- nenhum arquivo de DXF, geometria, viewer ou reforma visual

### Se o staging vier contaminado

Se entrar algo a mais por engano:

```bash
git restore --staged <arquivo>
```

Exemplos:

```bash
git restore --staged Frontend/src/pages/PropertyRegister.tsx
git restore --staged Backend/src/main/java/com/momorialPro/CadMemorial/controller/AuthController.java
```

### Commit sugerido

Se o staging estiver limpo, uma mensagem coerente para esta fase seria:

```bash
git commit -m "feat: add persistent admin credit pricing settings"
```

### Push da branch de deploy

Se a proxima task continuar pela branch de publicacao usada nesta frente, revisar primeiro em qual branch local o commit sera feito e depois publicar para:

```bash
git push origin HEAD:publish/vps-sync-20260612
```

## 14. Bloco sugerido para redeploy na VPS

Depois do `push`, a proxima task pode seguir com um redeploy objetivo na VPS.

### Atualizar a branch publicada

No diretorio do clone da VPS:

```bash
cd /opt/geolimites/repo
git fetch origin
git checkout publish/vps-sync-20260612
git pull origin publish/vps-sync-20260612
```

### Rebuild dos containers

Se o ambiente estiver usando `docker compose` conforme o fluxo ja trabalhado nesta frente:

```bash
docker compose build backend frontend
docker compose up -d backend frontend
```

Se houver necessidade de rebuild completo do ambiente:

```bash
docker compose up -d --build
```

### Validacoes imediatas apos o redeploy

Conferir:

- se o backend subiu sem erro
- se o frontend carregou a versao nova
- se a migration `V11__credit_pricing_settings.sql` foi aplicada
- se os endpoints de creditos responderam

### Validacao funcional minima

Validar no navegador:

- `Administracao > Creditos`
- tela de compra de creditos
- exibicao das regras em `Minha Conta`
- exibicao das regras em `Financeiro`

Validar no backend:

```bash
curl http://localhost:9010/api/credits/settings
curl http://localhost:9010/api/admin/settings/credits
```

Observacao:

- o endpoint administrativo exige autenticacao administrativa; se `curl` anonimo nao servir, validar pela interface autenticada ou por ferramenta autenticada

### Validacao de banco

No PostgreSQL, conferir a existencia da tabela e do registro singleton:

```sql
SELECT * FROM tab_credit_pricing_settings;
```

Esperado:

- tabela existente
- pelo menos o registro com `credit_pricing_id = 1`

### Logs uteis

Se algo falhar, verificar primeiro:

```bash
docker compose logs backend --tail=200
docker compose logs frontend --tail=200
```

Se o ambiente usar servico separado para backend, complementar com:

```bash
sudo journalctl -u geolimites-backend -n 200 --no-pager
```

## 15. Ultima observacao para a retomada

Se a proxima task decidir ir alem do deploy e endurecer a cobranca em producao, o passo seguinte mais natural sera:

- remover a confirmacao simulada de compra
- restringir a confirmacao real a webhook/processo confiavel
- religar o consumo automatico de creditos no fluxo principal de geracao de memorial

Esses pontos ja foram identificados, mas nao fazem parte obrigatoria do primeiro deploy da tabela administrativa de precos.
