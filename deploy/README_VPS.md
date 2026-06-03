# Deploy VPS GeoLimites

Guia de referencia para publicar o projeto em uma VPS Linux com dominio `www.geolimites.com.br`, Nginx na frente e backend Spring Boot em `127.0.0.1:9010`.

Premissas:

- VPS Linux com `git`, `curl`, `rsync`, `nginx`, `certbot`, Node.js 20+, Java 17 e PostgreSQL instalados
- chave SSH do GitHub ja configurada no usuario da VPS
- banco `geo_limites_db` ja criado no PostgreSQL

## Estrutura sugerida na VPS

```text
/opt/geolimites/
  repo/
    Backend/
    Frontend/
    deploy/
  backend/
    app.jar
    .env
    logs/
    uploads/
      dxf/
    templates/
/var/www/geolimites/current/
  index.html
  assets/
```

## 1. Clonar o projeto via SSH

Use a chave SSH ja configurada no GitHub para o usuario `geo-limites`.

```bash
sudo mkdir -p /opt/geolimites
sudo mkdir -p /opt/geolimites/backend
sudo mkdir -p /var/www/geolimites/current

sudo chown -R $USER:$USER /opt/geolimites
sudo chown -R $USER:$USER /var/www/geolimites

git clone git@github.com:horaciohudson/memorial-pro.git /opt/geolimites/repo
cd /opt/geolimites/repo
chmod +x deploy/scripts/*.sh
```

## 2. Backend

### 2.1 Arquivo `.env`

Use `Backend/.env.example` como base e ajuste no servidor:

```dotenv
DB_URL=jdbc:postgresql://localhost:5432/geo_limites_db
DB_USERNAME=postgres
DB_PASSWORD=altere-aqui

JWT_SECRET=gere-uma-chave-com-pelo-menos-64-caracteres

APP_FRONTEND_URL=https://www.geolimites.com.br
CORS_ALLOWED_ORIGIN_PATTERNS=https://www.geolimites.com.br,https://geolimites.com.br
PUBLIC_APP_URL=https://www.geolimites.com.br

MAIL_ENABLED=true
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=nao-responda@geolimites.com.br
MAIL_PASSWORD=altere-aqui
MAIL_PROTOCOL=smtp
MAIL_AUTH=true
MAIL_TLS=false
MAIL_SSL=true
MAIL_FROM_ADDRESS=nao-responda@geolimites.com.br
MAIL_FROM_NAME=Geo Limites

ANTHROPIC_API_KEY=altere-aqui
CLAUDE_MODEL=claude-3-haiku-20240307
CLAUDE_MAX_TOKENS=8192
CLAUDE_CHUNK_DELAY=10000

BOOTSTRAP_ADMIN_ENABLED=false
BOOTSTRAP_ADMIN_USERNAME=admin@geolimites.com.br
BOOTSTRAP_ADMIN_PASSWORD=altere-aqui
BOOTSTRAP_ADMIN_FULL_NAME=Administrador GeoLimites

DXF_STORAGE_DIR=/opt/geolimites/backend/uploads/dxf
TEMPLATES_STORAGE_DIR=/opt/geolimites/backend/templates
```

Salve esse arquivo em:

```bash
/opt/geolimites/backend/.env
```

### 2.2 Build e publicacao do backend

Opcao manual:

```bash
cd /opt/geolimites/repo/Backend
./mvnw clean package -DskipTests
sudo cp target/*.jar /opt/geolimites/backend/app.jar
```

Opcao recomendada:

```bash
cd /opt/geolimites/repo
./deploy/scripts/deploy-backend.sh
```

Diretorios persistentes esperados:

```bash
mkdir -p /opt/geolimites/backend/logs
mkdir -p /opt/geolimites/backend/uploads/dxf
mkdir -p /opt/geolimites/backend/templates
```

### 2.3 Service `systemd`

Copie `deploy/systemd/geolimites-backend.service` para:

```bash
/etc/systemd/system/geolimites-backend.service
```

Depois:

```bash
sudo systemctl daemon-reload
sudo systemctl enable geolimites-backend
sudo systemctl restart geolimites-backend
sudo systemctl status geolimites-backend --no-pager
```

Logs:

```bash
journalctl -u geolimites-backend -f
```

## 3. Frontend

### 3.1 Variaveis do build

Use `Frontend/.env.production.example` como base:

```dotenv
VITE_API_BASE_URL=/api
```

### 3.2 Build e publicacao do frontend

Opcao manual:

```bash
cd /opt/geolimites/repo/Frontend
npm ci
npm run build
rsync -av --delete dist/ /var/www/geolimites/current/
```

Opcao recomendada:

```bash
cd /opt/geolimites/repo
./deploy/scripts/deploy-frontend.sh
```

## 4. Nginx

Copie `deploy/nginx/geolimites.conf` para:

```bash
/etc/nginx/sites-available/geolimites.conf
```

Ative:

```bash
sudo ln -s /etc/nginx/sites-available/geolimites.conf /etc/nginx/sites-enabled/geolimites.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Depois gere o SSL:

```bash
sudo certbot --nginx -d geolimites.com.br -d www.geolimites.com.br
```

## 5. Checklist de publicacao

- `https://www.geolimites.com.br` abre o frontend
- `https://www.geolimites.com.br/api/auth/login` responde via Nginx
- `https://www.geolimites.com.br/swagger-ui/index.html` abre o Swagger
- e-mails de verificacao apontam para `https://www.geolimites.com.br/verify-email`
- upload DXF grava em `/opt/geolimites/backend/uploads/dxf`
- templates gravam em `/opt/geolimites/backend/templates`

## 6. Atualizacao futura

Fluxo seguro de atualizacao:

```bash
cd /opt/geolimites/repo
git pull

./deploy/scripts/deploy-frontend.sh
./deploy/scripts/deploy-backend.sh
```

## 7. Comandos rapidos de verificacao

```bash
sudo systemctl status geolimites-backend --no-pager
sudo journalctl -u geolimites-backend -n 100 --no-pager
sudo nginx -t
curl -I https://www.geolimites.com.br
curl -I https://www.geolimites.com.br/api/auth/login
```
