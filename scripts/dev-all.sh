#!/usr/bin/env zsh

set -euo pipefail
set -m

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_PID=""
WEB_PID=""

terminate_group() {
  local pid="$1"

  if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true

  for _ in {1..20}; do
    if ! kill -0 "$pid" 2>/dev/null; then
      return
    fi
    sleep 0.2
  done

  kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
}

cleanup() {
  terminate_group "$API_PID"
  terminate_group "$WEB_PID"
}

trap cleanup EXIT INT TERM

"$ROOT_DIR/scripts/dev-api.sh" &
API_PID=$!

sleep 2

"$ROOT_DIR/scripts/dev-web.sh" &
WEB_PID=$!

while true; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    wait "$API_PID" || true
    exit 1
  fi

  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    wait "$WEB_PID" || true
    exit 1
  fi

  sleep 1
done
