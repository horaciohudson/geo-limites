#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MANUAL_DIR="${REPO_ROOT}/manual"
TARGET_DIR="/var/www/geolimites-ajuda"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  echo "Python nao encontrado: ${PYTHON_BIN}"
  exit 1
fi

if ! "${PYTHON_BIN}" -m mkdocs --version >/dev/null 2>&1; then
  echo "MkDocs nao encontrado para ${PYTHON_BIN}."
  echo "Instale antes com:"
  echo "  ${PYTHON_BIN} -m pip install mkdocs mkdocs-material pymdown-extensions"
  exit 1
fi

echo "==> Build do manual"
cd "${MANUAL_DIR}"
"${PYTHON_BIN}" -m mkdocs build --strict

echo "==> Publicando arquivos em ${TARGET_DIR}"
sudo mkdir -p "${TARGET_DIR}"
sudo rsync -av --delete site/ "${TARGET_DIR}/"

echo "==> Ajustando permissoes"
sudo chown -R www-data:www-data "${TARGET_DIR}"

echo "Manual publicado com sucesso."
