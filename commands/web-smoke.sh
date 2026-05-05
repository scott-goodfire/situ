#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
WEB_ROOT="$REPO_ROOT/projects/web"
HOST="127.0.0.1"
PORT=""
LOG_FILE=$(mktemp "${TMPDIR:-/tmp}/almanac-web-smoke.XXXXXX.log")
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$LOG_FILE"
}
trap cleanup EXIT

cd "$WEB_ROOT"

bun run build
bun run serve -- --host "$HOST" --port 0 >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

for _ in {1..80}; do
  if [[ -z "$PORT" ]]; then
    PORT=$(sed -nE "s/.*http:\\/\\/$HOST:([0-9]+)\\/.*/\\1/p" "$LOG_FILE" | tail -n 1)
  fi

  if [[ -n "$PORT" ]] \
    && curl -fsS "http://$HOST:$PORT/" >/dev/null 2>&1 \
    && curl -fsS "http://$HOST:$PORT/api/projects" >/dev/null 2>&1 \
    && curl -fsS "http://$HOST:$PORT/projects/0123456789abcdef" >/dev/null 2>&1; then
    echo "Almanac web smoke passed at http://$HOST:$PORT/"
    exit 0
  fi

  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    echo "Almanac web smoke server exited early:" >&2
    sed -n '1,120p' "$LOG_FILE" >&2
    exit 1
  fi

  sleep 0.25
done

echo "Almanac web smoke timed out waiting for the local web host" >&2
sed -n '1,120p' "$LOG_FILE" >&2
exit 1
