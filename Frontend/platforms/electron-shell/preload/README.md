# Electron Preload

## Papel

Esta pasta deve conter os preload scripts do Electron.

## Responsabilidades Futuras

- expor APIs seguras para o renderer
- isolar IPC
- proteger acesso a recursos nativos
- reduzir superficie de ataque

## Regra

Tudo que sair daqui para a UI deve passar por contratos pequenos, previsiveis e auditaveis.
