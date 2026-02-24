#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.dev.yml"
ENV_FILE="$ROOT_DIR/.env"

cd "$ROOT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT_DIR/.env.example" "$ENV_FILE"
  echo "[dev-up] .env ausente. Copiado de .env.example em $ENV_FILE."
  echo "[dev-up] Revise segredos (JWT_SECRET/JWT_*) e rode novamente."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

WEB_PORT="${WEB_PORT:-3001}"
API_PORT="${PORT:-3000}"
HEALTH_PORT="${HEALTH_PORT:-3100}"
QUEUE_PREFIX="${QUEUE_PREFIX:-cvg-his}"
HIS_API_INTERNAL_URL="${HIS_API_INTERNAL_URL:-http://127.0.0.1:3000}"
NEXT_PUBLIC_HIS_API_BASE_URL="${NEXT_PUBLIC_HIS_API_BASE_URL:-/api/proxy}"

if [[ -z "${DATABASE_URL:-}" || -z "${REDIS_URL:-}" ]]; then
  echo "[dev-up] DATABASE_URL e REDIS_URL são obrigatórias no .env raiz."
  exit 1
fi

if [[ -z "${JWT_SECRET:-}" || -z "${JWT_ISSUER:-}" || -z "${JWT_AUDIENCE:-}" ]]; then
  echo "[dev-up] JWT_SECRET, JWT_ISSUER e JWT_AUDIENCE são obrigatórias no .env raiz."
  exit 1
fi

wait_for_service() {
  local service="$1"
  local timeout_seconds=60
  local container_id
  local started_at
  local now
  local health

  container_id="$(docker compose -f "$COMPOSE_FILE" ps -q "$service")"
  if [[ -z "$container_id" ]]; then
    echo "[dev-up] Container do serviço '$service' não encontrado."
    return 1
  fi

  started_at="$(date +%s)"
  while true; do
    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"
    if [[ "$health" == "healthy" || "$health" == "running" ]]; then
      return 0
    fi

    now="$(date +%s)"
    if (( now - started_at > timeout_seconds )); then
      echo "[dev-up] Timeout aguardando '$service' ficar saudável."
      return 1
    fi
    sleep 1
  done
}

cleanup() {
  kill "${API_PID:-}" "${WORKER_PID:-}" "${WEB_PID:-}" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "[dev-up] Subindo postgres e redis..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis

wait_for_service postgres
wait_for_service redis

echo "[dev-up] Subindo his-api (:${API_PORT})..."
PORT="$API_PORT" \
corepack pnpm --filter @cvg-his/his-api exec node --import tsx src/index.ts &
API_PID=$!

echo "[dev-up] Subindo his-worker (:${HEALTH_PORT})..."
DATABASE_URL="$DATABASE_URL" \
REDIS_URL="$REDIS_URL" \
QUEUE_PREFIX="$QUEUE_PREFIX" \
HEALTH_PORT="$HEALTH_PORT" \
corepack pnpm --filter @cvg-his/his-worker exec node --import tsx src/index.ts &
WORKER_PID=$!

echo "[dev-up] Subindo his-web (:${WEB_PORT})..."
PORT="$WEB_PORT" \
HIS_API_INTERNAL_URL="$HIS_API_INTERNAL_URL" \
NEXT_PUBLIC_HIS_API_BASE_URL="$NEXT_PUBLIC_HIS_API_BASE_URL" \
corepack pnpm --filter @cvg-his/his-web dev &
WEB_PID=$!

echo "[dev-up] Serviços iniciados. Ctrl+C encerra api/worker/web."
wait -n "$API_PID" "$WORKER_PID" "$WEB_PID"
