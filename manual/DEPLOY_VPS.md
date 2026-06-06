# Publicacao do Manual na VPS

## Objetivo

Publicar o manual do GeoLimites em `ajuda.geolimites.com.br` usando o build estatico gerado pelo MkDocs.

## Build local ou na VPS

```bash
cd /opt/geolimites/repo/manual
pip install mkdocs mkdocs-material pymdown-extensions
mkdocs build --strict
```

O conteudo final sera gerado em `manual/site/`.

## Estrategia de publicacao

Uma abordagem simples e segura e usar o Nginx do host para servir o diretorio estatico gerado.

Exemplo de destino final no servidor:

```bash
/var/www/geolimites-ajuda
```

## Exemplo de copia

```bash
rm -rf /var/www/geolimites-ajuda
mkdir -p /var/www/geolimites-ajuda
cp -R /opt/geolimites/repo/manual/site/* /var/www/geolimites-ajuda/
```

## DNS

Criar um registro para o subdominio:

- `A ajuda -> IP da VPS`

## Nginx

Usar o arquivo de exemplo em `deploy/nginx/geolimites-ajuda-host.conf` e ajustar o `server_name` se necessario.

## SSL

Depois de ativar o host no Nginx e apontar o DNS, emitir o certificado com Certbot.
