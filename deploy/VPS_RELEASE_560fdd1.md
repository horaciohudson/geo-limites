# VPS Release 560fdd1

## Snapshot publicado

- branch: `publish-vps-sync-20260619-memorial-landmarks`
- commit: `560fdd1`
- mensagem: `feat: prepara release web e desktop do GeoLimites`

## Modo recomendado na VPS atual

Reaproveitar a infraestrutura existente da VPS:

- Nginx
- SSL
- banco
- volumes
- servico systemd do backend

## 1. Atualizar o repositorio na VPS

```bash
cd /opt/geolimites/repo
git fetch origin
git checkout publish-vps-sync-20260619-memorial-landmarks
git pull --ff-only origin publish-vps-sync-20260619-memorial-landmarks
git rev-parse --short HEAD
```

O esperado no final e:

```bash
560fdd1
```

## 2. Publicar backend

O script existente:

- compila com Maven Wrapper;
- copia o jar para `/opt/geolimites/backend/app.jar`;
- reinicia `geolimites-backend`.

```bash
cd /opt/geolimites/repo
chmod +x deploy/scripts/deploy-backend.sh
./deploy/scripts/deploy-backend.sh
```

## 3. Validar backend

```bash
sudo systemctl status geolimites-backend --no-pager
journalctl -u geolimites-backend -n 200 --no-pager
```

## 4. Publicar frontend web

O script existente:

- roda `npm ci`
- roda `npm run build`
- publica `Frontend/dist` em `/var/www/geolimites/current`

```bash
cd /opt/geolimites/repo
chmod +x deploy/scripts/deploy-frontend.sh
./deploy/scripts/deploy-frontend.sh
```

## 5. Validar frontend

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I http://127.0.0.1
```

## 6. Validacao funcional minima

Checar no navegador:

- login
- listagem de imoveis
- abertura do Viewer
- abertura do Editor CAD
- geracao de Resumo
- geracao de Memorial

## Alternativa Docker

Se a VPS estiver usando o fluxo Docker em vez do host com scripts:

```bash
cd /opt/geolimites/repo
docker compose pull
docker compose build --no-cache backend frontend
docker compose up -d
docker compose ps
```

## Observacao

O desktop Electron foi publicado no GitHub dentro deste snapshot, mas o instalador ainda nao foi empacotado. A VPS cobre apenas o release web/backend.
