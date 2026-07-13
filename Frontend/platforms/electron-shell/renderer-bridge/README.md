# Renderer Bridge

## Papel

Esta pasta deve concentrar os contratos e adaptadores que ligam a UI React ao shell desktop.

## Responsabilidades Futuras

- definir interfaces para `file-system`
- definir interfaces para `window-management`
- definir interfaces para `desktop-menu`
- adaptar APIs expostas pelo preload para consumo da aplicacao

## Regra

A `React Base` deve conversar com abstrações desta camada, e nao diretamente com Electron.
