# Electron Shell

## Visao

Esta pasta contem a casca desktop do ecossistema Sigeve para executar o frontend React dentro de um shell Electron.

Ela deve concentrar apenas o que for especifico de desktop, sem contaminar:

- `src/graphics-engine`
- `src/app`
- regras de negocio do backend

## Objetivo

Servir como ponto de entrada do aplicativo Electron para o GeoLimites e oferecer bridge segura para:

- abrir arquivos
- salvar arquivos com dialogo nativo
- selecionar pastas
- controlar a janela
- obter a URL base do backend

## Estrutura

- `main/`: processo principal do Electron
- `preload/`: ponte segura entre shell e renderer
- `renderer-bridge/`: contratos e adaptadores consumidos pela UI React

## Execucao Local

1. Suba o backend em `http://localhost:9010`
2. Suba o frontend Vite em `http://localhost:3004`
3. No shell Electron, rode:

```bash
npm install
npm run start
```

## Build Desktop Local

Para validar o renderer sem depender do Vite:

1. No frontend principal, rode o fluxo completo:

```bash
npm run desktop:smoke
```

Esse comando:

- gera o build desktop do frontend;
- aponta o Electron para `Frontend/dist/index.html`;
- abre o shell local sem depender de `http://localhost:3004`.

Se quiser rodar em duas etapas, use:

```bash
npm run build:desktop
npm --prefix platforms/electron-shell run start:local-build
```

Quando o shell estiver empacotado, ele tenta carregar automaticamente `Frontend/dist/index.html` se `SIGEVE_FRONTEND_URL` nao for informado.

## Variaveis Opcionais

- `SIGEVE_FRONTEND_URL`
  Usa outra URL do frontend em vez de `http://localhost:3004`
- `SIGEVE_BACKEND_BASE_URL`
  Usa outra URL do backend em vez de `http://localhost:9010`

## Arquivos Base

- `package.json`: manifesto isolado do mini projeto Electron
- `tsconfig.json`: compilacao dedicada do shell
- `main/index.ts`: bootstrap da janela, IPC e dialogos nativos
- `preload/index.ts`: ponto de entrada da ponte segura
- `renderer-bridge/contracts.ts`: contratos consumidos pela UI
- `renderer-bridge/index.ts`: bridge fallback para cenarios sem Electron

## Regra Arquitetural

O shell desktop deve conhecer a aplicacao.

A aplicacao nao deve depender diretamente de APIs nativas do Electron.
