#!/usr/bin/env bash

set -Eeuo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    echo "Run as root"
    exit 1
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="${SERVICE_NAME:-ai-image-processing}"
APP_USER="${APP_USER:-aiapp}"
SERVER_NAME="${SERVER_NAME:-_}"

echo "[install] app dir: $APP_DIR"

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y git curl ca-certificates nginx python3 python3-venv python3-pip

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -Eq '^v(2[0-9]|[3-9][0-9])\.'; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
    useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

sed \
    -e "s|__APP_DIR__|$APP_DIR|g" \
    -e "s|__APP_USER__|$APP_USER|g" \
    "$APP_DIR/deploy/ai-image-processing.service" \
    > "/etc/systemd/system/$SERVICE_NAME.service"

sed \
    -e "s|__SERVER_NAME__|$SERVER_NAME|g" \
    "$APP_DIR/deploy/nginx-ai-image-processing.conf" \
    > "/etc/nginx/sites-available/$SERVICE_NAME"

ln -sf "/etc/nginx/sites-available/$SERVICE_NAME" "/etc/nginx/sites-enabled/$SERVICE_NAME"
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl daemon-reload
systemctl enable nginx
systemctl enable "$SERVICE_NAME"
systemctl restart nginx

bash "$APP_DIR/deploy/quick-update.sh"

echo "[install] done"
