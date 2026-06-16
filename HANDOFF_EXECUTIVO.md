# Handoff Executivo

Projeto: `geo-limites`

Leia tambem:

- `HANDOFF_NOVA_TASK.md`
- `Backend/BranchPublicada.md`

## Resumo curto

- a branch operacional/publicada mais importante e `publish/vps-sync-20260612`
- a branch aberta localmente agora tambem esta em `publish/vps-sync-20260612`
- o GitHub tem divergencia entre `main` e `publish/vps-sync-20260612`
- a `main` local tambem diverge da `main` do GitHub
- existem muitas alteracoes locais nao commitadas e tambem arquivos temporarios
- nao assumir que a `main` seja a referencia mais segura para deploy
- nao usar `git add .`, `git clean`, `reset` ou merge amplo sem revisao

## Tres frentes ativas

### 1. Sidebar

- houve mudanca de nomes e posicoes no menu lateral
- hoje existe inconsistencia:
  - `Normas e Templates`
  - `Normas e Exemplos`
  - `Pasta de Templates`
- arquivo principal:
  - `Frontend/src/components/Sidebar.tsx`

### 2. Backend de configuracao da IA

- ja existe configuracao administrativa para provedores em:
  - `GET /api/admin/settings/api`
  - `PATCH /api/admin/settings/api`
- arquivos principais:
  - `Backend/src/main/java/com/momorialPro/CadMemorial/controller/AdminSettingsController.java`
  - `Backend/src/main/java/com/momorialPro/CadMemorial/service/ApiSettingsService.java`
  - `Backend/src/main/java/com/momorialPro/CadMemorial/dto/ApiSettingsDTO.java`
  - `Backend/src/main/java/com/momorialPro/CadMemorial/dto/UpdateApiSettingsRequest.java`
- atencao:
  - o fluxo de templates ainda parece parcialmente fixo em implementacao antiga
  - arquivo sensivel:
    - `Backend/src/main/java/com/momorialPro/CadMemorial/service/TemplateService.java`

### 3. Normas, Templates e Exemplos

- a nomenclatura mudou parcialmente, mas ainda nao foi consolidada
- a tela `ManageStandards` ainda usa texto antigo
- o manual ainda fala em `Templates e Normas`
- arquivos principais:
  - `Frontend/src/pages/ManageStandards.tsx`
  - `Frontend/src/pages/ConfigureTemplates.tsx`
  - `manual/mkdocs.yml`
  - `manual/docs/index.md`
  - `manual/docs/05-modelos-e-normas/modelos-documentais-e-normas.md`

## Cuidados imediatos

- tratar alteracoes inesperadas como possivelmente vindas do usuario, do Trae ou do Antigravity
- antes de qualquer publicacao, revisar o `git status` e o recorte de arquivos
- se a task for de deploy, comparar primeiro o que esta:
  - so no local
  - so no GitHub
  - e ainda nao aplicado na VPS

## Proximo passo recomendado

- escolher 1 frente por vez:
  - consolidar nomes/menus/ajuda
  - ou consolidar backend de IA para respeitar configuracao administrativa
- so depois preparar commit e publicacao com recorte pequeno e explicito
