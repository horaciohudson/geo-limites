# Manual do GeoLimites

Este diretorio contem o projeto do manual do usuario do GeoLimites em formato MkDocs.

## Objetivo

Publicar a ajuda do sistema em um site proprio, como `ajuda.geolimites.com.br`, mantendo o conteudo versionado junto com o codigo-fonte principal.

## Estrutura

- `mkdocs.yml`: configuracao do site
- `docs/`: paginas em Markdown

## Pre-requisitos locais

- Python 3.11+
- `pip`

## Instalacao das dependencias

```bash
pip install mkdocs mkdocs-material pymdown-extensions
```

## Execucao local

```bash
cd manual
mkdocs serve
```

O servidor local normalmente ficara em `http://127.0.0.1:8000`.

## Build estatico

```bash
cd manual
mkdocs build --strict
```

O HTML gerado ficara em `manual/site/`.
