# Release Prep GitHub VPS

## Objetivo

Fechar um pacote de publicacao limpo para:

- subir o codigo ao GitHub;
- publicar web/backend na VPS existente;
- manter o desktop em trilha separada de empacotamento.

## O que ja foi validado

- frontend desktop com build local via `npm run build:desktop`;
- shell Electron abre o app local via `npm run desktop:smoke`;
- estrutura de deploy web/VPS ja existe em `deploy/`, `docker-compose.yml` e `manual/DEPLOY_VPS.md`.

## O que foi tratado para nao poluir o release

O `.gitignore` passou a ignorar artefatos locais e saidas geradas, incluindo:

- `.dbg/`
- `Frontend/.dbg/`
- `Frontend/.tmp/`
- `Backend/cp.txt`
- `Backend/mvn-output.txt`
- `Backend/Memoriais/ResumoTecnico*.md`
- `Backend/Memoriais/Template.md`
- `Backend/Memoriais/MemorialComIA*.md`
- `Frontend/memoriais/memorial_IA.md`

## Pacote principal de release

Entram naturalmente no pacote GitHub/VPS:

- backend Spring em `Backend/src/main/java/...`
- migrations em `Backend/src/main/resources/db/migration/`
- frontend React em `Frontend/src/...`
- shell desktop em `Frontend/platforms/electron-shell/`
- configuracoes de deploy em `deploy/`
- `docker-compose.yml`

## Itens para revisar antes do commit

Separar com cuidado o que nao precisa entrar agora:

- docs de debug no raiz (`debug-*.md`);
- notas locais (`Ideia.md`, `WORKLOG_*.md`, `mini-projeto-*.md`);
- memoriais e resumos gerados manualmente;
- qualquer arquivo temporario fora do codigo do produto.

## Publicacao na VPS

Referencias ja existentes:

- `deploy/scripts/deploy-backend.sh`
- `deploy/scripts/deploy-frontend.sh`
- `deploy/nginx/geolimites.conf`
- `manual/DEPLOY_VPS.md`

Recomendacao:

1. fechar commit limpo no GitHub;
2. atualizar o codigo na VPS a partir desse commit;
3. reaproveitar Nginx, dominio, SSL, volumes e banco ja existentes;
4. executar deploy do backend e frontend pelos scripts versionados.

## Desktop

O desktop ja esta validado para distribuicao Windows.

Artefatos validados:

- `GeoLimites-Desktop-Setup-0.1.1-x64.exe`
- `GeoLimites-Desktop-Portable-0.1.1-x64.exe`
- `GeoLimites-Desktop-0.1.1-win-x64-portable.zip`

Comandos principais desta trilha:

- `npm run build:desktop`
- `npm run desktop:dist`
- `npm --prefix platforms/electron-shell run installer:win`

Referencia operacional:

- `Frontend/docs/sigeve-electron-desktop/ENTREGA_WINDOWS_0.1.1.md`
