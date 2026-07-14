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

## Executavel Windows

O executavel do usuario final deve ser gerado a partir do frontend principal, porque ele primeiro precisa montar `Frontend/dist` e depois empacotar o shell.

Na pasta `Frontend`, rode:

```bash
npm install
npm --prefix platforms/electron-shell install
npm run desktop:dist
```

Saidas esperadas:

- arquivo zipado pronto para distribuicao em `platforms/electron-shell/release/`
- pasta interna de stage com o app desempacotado em `platforms/electron-shell/release/.portable-stage/`

O empacotamento validado usa `electron-packager` e cache local em `platforms/electron-shell/.cache/`, evitando depender do cache global do Windows.

Se tambem quisermos gerar um instalador Windows e um executavel portatil pelo `electron-builder`, existe a trilha:

```bash
npm --prefix platforms/electron-shell run installer:win
```

Saidas esperadas em `platforms/electron-shell/release/`:

- `GeoLimites-Desktop-Setup-<versao>-x64.exe`: instalador NSIS
- `GeoLimites-Desktop-Portable-<versao>-x64.exe`: executavel portatil gerado pelo electron-builder

Por padrao, o app empacotado aponta para `https://www.geolimites.com.br` como backend. Se precisar gerar um build apontando para outro ambiente, defina `SIGEVE_BACKEND_BASE_URL` antes do empacotamento ou da execucao.

## Variaveis Opcionais

- `SIGEVE_FRONTEND_URL`
  Usa outra URL do frontend em vez de `http://localhost:3004`
- `SIGEVE_BACKEND_BASE_URL`
  Usa outra URL do backend em vez de `https://www.geolimites.com.br`

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
