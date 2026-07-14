# Publicacao Windows 0.1.0

## Objetivo

Fechar a entrega do `GeoLimites Desktop` para download pelo usuario final, usando os artefatos validados nesta rodada.

## Artefato principal

Publicar como arquivo principal:

- `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-Setup-0.1.0-x64.exe`

Justificativa:

- fluxo mais familiar para o usuario final
- cria atalhos de instalacao
- reduz atrito de uso inicial

## Artefato secundario

Manter como alternativa tecnica:

- `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-Portable-0.1.0-x64.exe`

Uso sugerido:

- suporte
- contingencia
- teste rapido sem instalacao

## Pacote opcional

Se fizer sentido disponibilizar tambem a pasta compactada:

- `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-0.1.0-win-x64-portable.zip`

## Checklist de publicacao

1. confirmar que o arquivo principal enviado e o `Setup`
2. anexar o `Portable` apenas como opcao secundaria
3. copiar para o canal de distribuicao escolhido:
   - drive
   - storage
   - pagina de download
   - release privada
4. incluir a versao `0.1.0` no nome exibido ao usuario
5. anexar ou registrar os hashes SHA-256
6. testar o download do link final pelo menos uma vez

## Hashes SHA-256

- `GeoLimites-Desktop-Setup-0.1.0-x64.exe`
  - `D4CC8E308B55FB42657776CF518A779F3117606ED2C24B9684B282C021CDC7BC`
- `GeoLimites-Desktop-Portable-0.1.0-x64.exe`
  - `6CE834AD6CC4A2E64A6B78693DEB66EB8A55D735E7335CDDB74461A6EC1D8A26`
- `GeoLimites-Desktop-0.1.0-win-x64-portable.zip`
  - `E2F66407173EB262560F437FCF47EC197A17148A9173894E62F1C233CACC6F75`

## Texto curto sugerido para entrega ao usuario

```text
GeoLimites Desktop 0.1.0

Arquivo principal para instalacao:
- GeoLimites-Desktop-Setup-0.1.0-x64.exe

Opcao alternativa sem instalacao:
- GeoLimites-Desktop-Portable-0.1.0-x64.exe
```

## Fechamento desta frente

Depois da publicacao do link final, esta frente pode ser considerada encerrada e a retomada volta para a task funcional anterior do produto.
