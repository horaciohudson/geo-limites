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

## Opcao recomendada

Depois de instalar as dependencias do MkDocs uma vez na VPS, use o script do repositorio:

```bash
cd /opt/geolimites/repo
chmod +x deploy/scripts/deploy-help.sh
./deploy/scripts/deploy-help.sh
```

Esse script:

- roda o build com `mkdocs build --strict`
- publica em `/var/www/geolimites-ajuda`
- sincroniza com `rsync --delete`
- ajusta a propriedade para `www-data:www-data`

## Estrategia de publicacao

Uma abordagem simples e segura e usar o Nginx do host para servir o diretorio estatico gerado.

Exemplo de destino final no servidor:

```bash
/var/www/geolimites-ajuda
```

## Exemplo de copia manual

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

O host de referencia ja deixa HTML com cache curto e os arquivos versionados em `assets/` com cache mais longo. Isso reduz o risco de o navegador continuar mostrando a navegacao antiga logo depois de um deploy.

Exemplo de ativacao:

```bash
sudo cp /opt/geolimites/repo/deploy/nginx/geolimites-ajuda-host.conf /etc/nginx/sites-available/geolimites-ajuda.conf
sudo ln -s /etc/nginx/sites-available/geolimites-ajuda.conf /etc/nginx/sites-enabled/geolimites-ajuda.conf
sudo nginx -t
sudo systemctl reload nginx
```

## SSL

Depois de ativar o host no Nginx e apontar o DNS, emitir o certificado com Certbot.

```bash
sudo certbot --nginx -d ajuda.geolimites.com.br
```

Importante:

- o arquivo `deploy/nginx/geolimites-ajuda-host.conf` e um template base HTTP
- ao copiar esse arquivo novamente por cima de `/etc/nginx/sites-available/geolimites-ajuda.conf`, a parte HTTPS aplicada pelo Certbot pode ser sobrescrita
- se isso acontecer, o navegador pode mostrar erro como `ERR_CERT_COMMON_NAME_INVALID`
- depois de atualizar o host ativo com `cp`, rode novamente `sudo certbot --nginx -d ajuda.geolimites.com.br`

## Validacao rapida

```bash
curl -I http://ajuda.geolimites.com.br
curl -I https://ajuda.geolimites.com.br
```

Se o navegador ainda insistir em mostrar a versao antiga logo apos o deploy, validar primeiro com `Ctrl + F5` ou em aba anonima. Se a recarga forcada mostrar o conteudo novo, o deploy esta correto e o problema residual e cache do navegador.

## Atualizacao futura do host

Se precisar atualizar o host Nginx da ajuda depois que o SSL ja estiver funcionando:

```bash
sudo cp /opt/geolimites/repo-manual/deploy/nginx/geolimites-ajuda-host.conf /etc/nginx/sites-available/geolimites-ajuda.conf
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d ajuda.geolimites.com.br
```
