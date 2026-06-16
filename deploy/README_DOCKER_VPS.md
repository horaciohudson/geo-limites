# Deploy Docker VPS GeoLimites

Guia objetivo para subir o GeoLimites em uma VPS nova usando Docker Compose, com foco em portabilidade, superficie de ataque reduzida e migracao simples para outro servidor.

## Arquitetura

- `postgres`: banco de dados PostgreSQL em container, sem exposicao publica
- `backend`: aplicacao Spring Boot
- `frontend`: build do Vite servido por Nginx, publicado apenas localmente no host
- volumes Docker para banco, logs, DXF e templates
- SSL terminado no Nginx do host com Certbot

## Pre-requisitos na VPS

- Ubuntu LTS atualizado
- chave SSH administrativa da VPS configurada
- chave SSH da propria VPS cadastrada no GitHub
- firewall liberando pelo menos `22`, `80` e, se necessario depois, `443`

## 0. Instalar Docker e Compose

Sequencia recomendada no Ubuntu:

```bash
apt update
apt install -y ca-certificates curl gnupg nginx certbot python3-certbot-nginx

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl restart docker
docker --version
docker compose version
```

## 1. Clonar o projeto

```bash
mkdir -p /opt/geolimites
cd /opt/geolimites
git clone git@github.com:horaciohudson/geo-limites.git repo
cd /opt/geolimites/repo
```

## 2. Preparar variaveis de ambiente

Use o arquivo `.env.docker.example` como base e gere um arquivo real na raiz do projeto:

```bash
cp .env.docker.example .env.docker
```

Pontos importantes:

- `POSTGRES_PASSWORD` deve ser forte
- `JWT_SECRET` deve ter pelo menos 64 caracteres
- `APP_FRONTEND_URL`, `PUBLIC_APP_URL` e `CORS_ALLOWED_ORIGIN_PATTERNS` devem apontar para o dominio final
- se quiser subir sem SMTP no primeiro momento, mantenha `MAIL_ENABLED=false`
- se quiser subir sem verificacao por e-mail no primeiro momento, mantenha `AUTH_AUTO_VERIFY_USERS=true`

## 3. Subir a stack

```bash
cd /opt/geolimites/repo
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d
```

## 4. Validar containers

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs backend --tail=100
docker compose --env-file .env.docker logs frontend --tail=100
docker compose --env-file .env.docker logs postgres --tail=100
```

## 5. Validar aplicacao

Com a stack no ar, o frontend fica publicado apenas em `127.0.0.1:${FRONTEND_PORT}` no host.

Exemplos de teste:

```bash
curl -I http://127.0.0.1:${FRONTEND_PORT:-8080}
curl -I http://127.0.0.1:${FRONTEND_PORT:-8080}/api/auth/login
curl -I http://127.0.0.1:${FRONTEND_PORT:-8080}/swagger-ui/index.html
```

## 6. Persistencia

O `docker-compose.yml` ja cria volumes para:

- banco de dados
- logs do backend
- uploads DXF
- templates

Esses dados sobrevivem a `docker compose down`, desde que os volumes nao sejam removidos explicitamente.

## 7. Decisao de seguranca adotada

Padrao adotado para este projeto:

- SSL e proxy reverso no Nginx do host
- PostgreSQL em container, mas sem `ports:` publicados
- acesso ao banco apenas pela rede Docker ou por tunel SSH local

Motivos:

- mantem a superficie publica menor
- simplifica migracao para outra VPS
- preserva portabilidade da stack completa
- evita expor o banco diretamente para a internet
- facilita backup por volume e dump logico

## 8. Atualizacao futura

Fluxo seguro:

```bash
cd /opt/geolimites/repo
git pull
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d
```

## 9. Migracao para nova VPS

Com esse modelo, o processo fica reduzido a:

1. instalar Docker e Compose
2. clonar o repositorio
3. copiar ou recriar `.env.docker`
4. restaurar volumes ou backups do banco/arquivos
5. executar `docker compose up -d`

## 10. SSL e dominio

Opcao adotada neste guia por seguranca:

- o container do frontend fica acessivel apenas em `127.0.0.1:${FRONTEND_PORT}`
- o Nginx do host publica `80` e `443`
- o Certbot roda no host
- o PostgreSQL nao publica porta para a internet

Fluxo recomendado no host:

- instalar `nginx` e `certbot`
- copiar `deploy/nginx/geolimites-docker-host.conf` para o host
- configurar `server_name` para `geolimites.com.br` e `www.geolimites.com.br`
- manter o proxy apontando para `http://127.0.0.1:${FRONTEND_PORT}`
- emitir SSL com `certbot --nginx`

Esse modelo e mais seguro do que expor o container diretamente em `80/443`, porque:

- concentra TLS e headers de seguranca no host
- reduz a exposicao direta da stack Docker
- facilita endurecimento do firewall
- mantem o PostgreSQL isolado apenas na rede Docker

Exemplo de ativacao do Nginx no host:

```bash
cp /opt/geolimites/repo/deploy/nginx/geolimites-docker-host.conf /etc/nginx/sites-available/geolimites.conf
ln -sf /etc/nginx/sites-available/geolimites.conf /etc/nginx/sites-enabled/geolimites.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
certbot --nginx -d geolimites.com.br -d www.geolimites.com.br
```

## 11. Acesso ao banco via tunel SSH

Se quiser conectar pelo DBeaver sem expor o PostgreSQL publicamente, abra um tunel SSH local:

```bash
ssh -L 15432:127.0.0.1:5432 geolimites-vps -N
```

Depois conecte no DBeaver em:

- host `127.0.0.1`
- porta `15432`
- database `geo_limites_db`
- usuario `postgres`
- senha `POSTGRES_PASSWORD`
