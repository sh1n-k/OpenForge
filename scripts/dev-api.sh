#!/usr/bin/env zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

export API_PORT="${API_PORT:-${SERVER_PORT:-8080}}"
export SERVER_PORT="$API_PORT"
export WEB_PORT="${WEB_PORT:-3000}"
export WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:${WEB_PORT}}"

if [[ -z "${JAVA_HOME:-}" ]]; then
  if command -v java >/dev/null 2>&1; then
    export JAVA_HOME="$(dirname "$(dirname "$(command -v java)")")"
  elif [[ -d /opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home ]]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home"
  elif [[ -d /opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home ]]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home"
  fi
fi

export PATH="$JAVA_HOME/bin:$PATH"

cd "$ROOT_DIR/apps/api"
exec ./gradlew --no-daemon bootRun
