# Entrega Windows 0.1.0

## Status

Validacao manual concluida com sucesso em `2026-07-14`.

Os dois formatos de distribuicao foram testados pelo usuario:

- instalador `NSIS`
- executavel portatil

Resultado consolidado:

- o instalador funciona corretamente
- o executavel portatil funciona corretamente
- a distribuicao desktop ja pode seguir para entrega ao usuario final

## Artefatos para distribuicao

### Instalador Windows

- arquivo:
  - `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-Setup-0.1.0-x64.exe`
- uso recomendado:
  - distribuicao principal para usuario final
  - cria experiencia de instalacao mais familiar

### Executavel portatil

- arquivo:
  - `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-Portable-0.1.0-x64.exe`
- uso recomendado:
  - suporte tecnico
  - testes rapidos
  - cenarios sem instalacao formal

### Pacote zip portatil legado

- arquivo:
  - `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-0.1.0-win-x64-portable.zip`
- uso recomendado:
  - distribuicao alternativa quando for desejavel entregar a pasta completa compactada

## Hashes SHA-256

- `GeoLimites-Desktop-Setup-0.1.0-x64.exe`
  - `D4CC8E308B55FB42657776CF518A779F3117606ED2C24B9684B282C021CDC7BC`
- `GeoLimites-Desktop-Portable-0.1.0-x64.exe`
  - `6CE834AD6CC4A2E64A6B78693DEB66EB8A55D735E7335CDDB74461A6EC1D8A26`
- `GeoLimites-Desktop-0.1.0-win-x64-portable.zip`
  - `E2F66407173EB262560F437FCF47EC197A17148A9173894E62F1C233CACC6F75`

## Comandos usados na geracao

Executados a partir de `Frontend/`:

```bash
npm run build:desktop
npm run desktop:dist
npm --prefix platforms/electron-shell run installer:win
```

## Validacoes fechadas nesta rodada

- `npm run lint` em `Frontend`
- `npm run check` em `Frontend/platforms/electron-shell`
- `npm run dist:win` em `Frontend/platforms/electron-shell`
- geracao do instalador `NSIS`
- geracao do executavel portatil do `electron-builder`
- teste manual do usuario no instalador
- teste manual do usuario no executavel portatil

## Observacao tecnica importante

Foi necessario separar o nome dos artefatos `nsis` e `portable` no `electron-builder`, porque os dois alvos estavam escrevendo no mesmo nome final de arquivo.

Configuracao consolidada:

- `GeoLimites-Desktop-Setup-${version}-${arch}.${ext}`
- `GeoLimites-Desktop-Portable-${version}-${arch}.${ext}`

## Recomendacao de entrega

Para a entrega principal ao usuario final, priorizar:

1. `GeoLimites-Desktop-Setup-0.1.0-x64.exe`
2. manter `GeoLimites-Desktop-Portable-0.1.0-x64.exe` como fallback tecnico

## Proximo passo operacional

1. disponibilizar o `Setup` no canal de download escolhido
2. manter o `Portable` como opcao secundaria
3. voltar a proxima task funcional do produto depois que a entrega desktop estiver publicada
