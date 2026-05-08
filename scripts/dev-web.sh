#!/usr/bin/env zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

export WEB_PORT="${WEB_PORT:-${PORT:-3000}}"
export PORT="$WEB_PORT"
export API_PORT="${API_PORT:-8080}"
export API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:${API_PORT}}"
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-$API_BASE_URL}"
export WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:${WEB_PORT}}"

cd "$ROOT_DIR/apps/web"
exec pnpm dev
