# Stage Desktop 0.1.1

## Objetivo

Separar um commit focado na atualizacao da distribuicao do `GeoLimites Desktop` para a versao `0.1.1`.

## Escopo esperado deste pacote

Entram neste stage:

- `Frontend/platforms/electron-shell/package.json`
- `Frontend/platforms/electron-shell/package-lock.json`
- `Frontend/docs/sigeve-electron-desktop/ENTREGA_WINDOWS_0.1.1.md`
- `Frontend/docs/sigeve-electron-desktop/PUBLICACAO_WINDOWS_0.1.1.md`
- `Frontend/docs/sigeve-electron-desktop/STAGE_DESKTOP_0.1.1.md`
- `Frontend/docs/sigeve-electron-desktop/RELEASE_GITHUB_WINDOWS_0.1.1.md`
- `Frontend/docs/sigeve-electron-desktop/README.md`
- `deploy/RELEASE_PREP_GITHUB_VPS.md`
- `deploy/STAGE_RELEASE_GITHUB_VPS.md`

## O que nao deve entrar por engano

Revisar com cuidado antes do commit para nao puxar:

- artefatos de `release/`
- mudancas funcionais do backend
- memoriais e arquivos de teste
- docs soltas e notas locais fora da frente desktop

## Revisao final do stage

```bash
git diff --cached --name-only
git diff --cached --stat
```
