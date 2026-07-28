# Publicacao Windows 0.1.1

## Objetivo

Fechar a entrega do `GeoLimites Desktop` atualizada para download pelo usuario final.

## Artefato principal

Publicar como arquivo principal:

- `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-Setup-0.1.1-x64.exe`

## Artefato secundario

Manter como alternativa tecnica:

- `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-Portable-0.1.1-x64.exe`

## Pacote opcional

Se fizer sentido disponibilizar tambem a pasta compactada:

- `Frontend/platforms/electron-shell/release/GeoLimites-Desktop-0.1.1-win-x64-portable.zip`

## Checklist de publicacao

1. confirmar que o arquivo principal enviado e o `Setup`
2. anexar o `Portable` apenas como opcao secundaria
3. copiar para o canal de distribuicao escolhido
4. incluir a versao `0.1.1` no nome exibido ao usuario
5. anexar ou registrar os hashes SHA-256
6. testar o download do link final pelo menos uma vez

## Hashes SHA-256

- `GeoLimites-Desktop-Setup-0.1.1-x64.exe`
  - `32BECA2D2B3699022173D6148BBB09850B25E53E5641F68499EFD6E059258842`
- `GeoLimites-Desktop-Portable-0.1.1-x64.exe`
  - `B26728611906468065B18975B1199E0694607F814CDE8B01F05E585F4EC4E370`
- `GeoLimites-Desktop-0.1.1-win-x64-portable.zip`
  - `04FE734497D4396E88238FED11D9D8E05E556383B25424725158E1BD8EC3A6EF`

## Texto curto sugerido para entrega ao usuario

```text
GeoLimites Desktop 0.1.1

Arquivo principal para instalacao:
- GeoLimites-Desktop-Setup-0.1.1-x64.exe

Opcao alternativa sem instalacao:
- GeoLimites-Desktop-Portable-0.1.1-x64.exe
```
