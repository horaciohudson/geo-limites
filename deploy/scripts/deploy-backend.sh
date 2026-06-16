#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/Backend"
RUNTIME_DIR="/opt/geolimites/backend"

echo "==> Build do backend"
cd "${BACKEND_DIR}"
./mvnw clean package -DskipTests

JAR_PATH="$(ls -t target/*.jar | grep -v '\.jar\.original$' | head -n 1)"
if [[ -z "${JAR_PATH}" ]]; then
  echo "Nenhum arquivo JAR encontrado em target/."
  exit 1
fi

echo "==> Preparando diretorios de runtime"
sudo mkdir -p "${RUNTIME_DIR}/logs"
sudo mkdir -p "${RUNTIME_DIR}/uploads/dxf"
sudo mkdir -p "${RUNTIME_DIR}/templates"

echo "==> Publicando ${JAR_PATH}"
sudo cp "${JAR_PATH}" "${RUNTIME_DIR}/app.jar"
sudo chown -R www-data:www-data "${RUNTIME_DIR}"

echo "==> Reiniciando servico"
sudo systemctl daemon-reload
sudo systemctl enable geolimites-backend
sudo systemctl restart geolimites-backend
sudo systemctl status geolimites-backend --no-pager

echo "Backend publicado com sucesso."
