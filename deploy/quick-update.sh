#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="${SERVICE_NAME:-ai-image-processing}"
APP_USER="${APP_USER:-aiapp}"
VENV_DIR="${VENV_DIR:-$APP_DIR/.venv}"

echo "[update] app dir: $APP_DIR"

cd "$APP_DIR"

systemctl stop "$SERVICE_NAME" 2>/dev/null || true

if [ -d ".git" ]; then
    git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
    git pull --ff-only
fi

python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"
python -m pip install --upgrade pip
pip install -r backend/requirements.txt

cd frontend
if [ -f package-lock.json ]; then
    npm ci
else
    npm install
fi
npm run build
cd "$APP_DIR"

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

systemctl start "$SERVICE_NAME"
systemctl --no-pager --lines=20 status "$SERVICE_NAME"

echo "[update] done"
