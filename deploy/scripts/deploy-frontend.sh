#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/Frontend"
TARGET_DIR="/var/www/geolimites/current"

echo "==> Build do frontend"
cd "${FRONTEND_DIR}"
npm ci
npm run build

echo "==> Publicando arquivos em ${TARGET_DIR}"
sudo mkdir -p "${TARGET_DIR}"
sudo rsync -av --delete dist/ "${TARGET_DIR}/"

echo "==> Ajustando permissoes"
sudo chown -R www-data:www-data /var/www/geolimites

echo "Frontend publicado com sucesso."
