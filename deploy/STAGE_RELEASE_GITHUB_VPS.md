# Stage Release GitHub VPS

## Objetivo

Preparar um stage limpo para publicar no GitHub e depois atualizar a VPS com base no repositorio, sem misturar artefatos locais.

## 1. Conferir o estado atual

```bash
git status --short
```

## 2. Stage do pacote principal de produto

Use este bloco como base para o pacote web/backend/desktop:

```bash
git add .gitignore
git add deploy/
git add docker-compose.yml
git add Backend/src/main/java
git add Backend/src/main/resources/db/migration
git add Frontend/package.json Frontend/package-lock.json
git add Frontend/src
git add Frontend/platforms/electron-shell
```

## 3. Remocoes desejadas de artefatos gerados

Se estas remocoes aparecerem no stage, elas fazem sentido para limpar o repositorio:

```bash
git add -u Backend/Memoriais/MemorialComIA.md
git add -u Backend/Memoriais/MemorialComIA_Local.md
git add -u Frontend/memoriais/memorial_IA.md
```

## 4. Itens que merecem revisao manual antes do commit

Verificar se devem entrar ou ficar fora:

- `Backend/Memoriais/MemorialExemplo.md`
- docs soltas na raiz como `debug-*.md`
- `Ideia.md`
- `WORKLOG_*.md`
- `mini-projeto-*.md`
- `PROJETO_*.md`

## 5. Revisao do stage

```bash
git diff --cached --name-only
git diff --cached --stat
```

## 6. Commit sugerido

Mensagem sugerida para o pacote atual:

```bash
git commit -m "feat: prepara release web e desktop do GeoLimites"
```

## 7. Publicacao

Depois do push:

- usar os scripts em `deploy/scripts/`;
- ou seguir o roteiro em `manual/DEPLOY_VPS.md`.

## Observacao

O shell Electron ja possui trilha validada de distribuicao Windows, incluindo:

- instalador `NSIS`
- executavel portatil
- pacote `.zip` portatil

Referencia operacional:

- `Frontend/docs/sigeve-electron-desktop/ENTREGA_WINDOWS_0.1.1.md`
