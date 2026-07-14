# Stage Desktop 0.1.0

## Objetivo

Separar um commit focado apenas na frente de distribuicao do `GeoLimites Desktop`, sem misturar alteracoes paralelas do memorial, editor CAD, backend ou notas locais.

## Escopo esperado deste pacote

Entram neste stage:

- `Frontend/platforms/electron-shell/package.json`
- `Frontend/platforms/electron-shell/package-lock.json`
- `Frontend/platforms/electron-shell/README.md`
- `Frontend/platforms/electron-shell/main/index.ts`
- `Frontend/platforms/electron-shell/scripts/start-local-build.cjs`
- `Frontend/platforms/electron-shell/scripts/package-portable.cjs`
- `Frontend/platforms/electron-shell/scripts/run-electron-builder.cjs`
- `Frontend/docs/sigeve-electron-desktop/README.md`
- `Frontend/docs/sigeve-electron-desktop/ENTREGA_WINDOWS_0.1.0.md`
- `Frontend/docs/sigeve-electron-desktop/PUBLICACAO_WINDOWS_0.1.0.md`
- `deploy/RELEASE_PREP_GITHUB_VPS.md`
- `deploy/STAGE_RELEASE_GITHUB_VPS.md`

Opcional:

- `HANDOFF_NOVA_TASK.md`

## O que nao deve entrar por engano

Revisar com cuidado antes do commit para nao puxar:

- `Backend/` fora de algo explicitamente ligado ao desktop
- docs soltas na raiz como `debug-*.md`, `WORKLOG_*.md`, `Ideia.md`
- artefatos de `release/`
- arquivos de `.dbg/`
- mudancas funcionais do `Resumo Tecnico`, `Memorial` ou `Editor CAD`

## Comandos sugeridos

Rodar a partir da raiz do repositorio:

```bash
git add Frontend/platforms/electron-shell/package.json
git add Frontend/platforms/electron-shell/package-lock.json
git add Frontend/platforms/electron-shell/README.md
git add Frontend/platforms/electron-shell/main/index.ts
git add Frontend/platforms/electron-shell/scripts/start-local-build.cjs
git add Frontend/platforms/electron-shell/scripts/package-portable.cjs
git add Frontend/platforms/electron-shell/scripts/run-electron-builder.cjs
git add Frontend/docs/sigeve-electron-desktop
git add deploy/RELEASE_PREP_GITHUB_VPS.md
git add deploy/STAGE_RELEASE_GITHUB_VPS.md
git add HANDOFF_NOVA_TASK.md
```

## Revisao final do stage

```bash
git diff --cached --name-only
git diff --cached --stat
```

## Mensagens de commit sugeridas

Opcao 1:

```bash
git commit -m "feat: prepara distribuicao Windows do GeoLimites Desktop"
```

Opcao 2:

```bash
git commit -m "feat: valida setup e empacotamento do GeoLimites Desktop"
```

## Observacao importante

Os artefatos em `Frontend/platforms/electron-shell/release/` estao corretamente ignorados no `.gitignore` e nao devem ser versionados.
