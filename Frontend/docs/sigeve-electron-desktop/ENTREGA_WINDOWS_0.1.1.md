# Entrega Windows 0.1.1

## Status

Rodada destinada a empacotar o estado atual do sistema depois das evolucoes posteriores ao instalador `0.1.0`.

Os artefatos abaixo devem refletir o frontend e o shell Electron atualizados.

## Artefatos para distribuicao

### Instalador Windows

- arquivo:
  - `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-Setup-0.1.1-x64.exe`
- uso recomendado:
  - distribuicao principal para usuario final
  - cria experiencia de instalacao mais familiar

### Executavel portatil

- arquivo:
  - `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-Portable-0.1.1-x64.exe`
- uso recomendado:
  - suporte tecnico
  - testes rapidos
  - cenarios sem instalacao formal

### Pacote zip portatil legado

- arquivo:
  - `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-0.1.1-win-x64-portable.zip`
- uso recomendado:
  - distribuicao alternativa quando for desejavel entregar a pasta completa compactada

## Hashes SHA-256

- `GeoLimites-Desktop-Setup-0.1.1-x64.exe`
  - `32BECA2D2B3699022173D6148BBB09850B25E53E5641F68499EFD6E059258842`
- `GeoLimites-Desktop-Portable-0.1.1-x64.exe`
  - `B26728611906468065B18975B1199E0694607F814CDE8B01F05E585F4EC4E370`
- `GeoLimites-Desktop-0.1.1-win-x64-portable.zip`
  - `04FE734497D4396E88238FED11D9D8E05E556383B25424725158E1BD8EC3A6EF`

## Comandos usados na geracao

Executados a partir de `Frontend/`:

```bash
npm run build:desktop
npm run desktop:dist
npm --prefix platforms/electron-shell run installer:win
```

## Validacoes desta rodada

- `npm run build:desktop` em `Frontend`
- `npm --prefix platforms/electron-shell run check`
- `npm run desktop:dist`
- `npm --prefix platforms/electron-shell run installer:win`
- validacao manual de abertura do app empacotado

## Observacao tecnica desta rodada

- o `Setup` e o `Portable` foram gerados com sucesso pelo `electron-builder`
- a trilha antiga `npm run desktop:dist` falhou com `EPERM` no rename interno do `electron-packager`
- para nao bloquear a entrega, o arquivo `GeoLimites-Desktop-0.1.1-win-x64-portable.zip` foi gerado a partir da pasta `release/win-unpacked`

## Recomendacao de entrega

Para a entrega principal ao usuario final, priorizar:

1. `GeoLimites-Desktop-Setup-0.1.1-x64.exe`
2. manter `GeoLimites-Desktop-Portable-0.1.1-x64.exe` como fallback tecnico
