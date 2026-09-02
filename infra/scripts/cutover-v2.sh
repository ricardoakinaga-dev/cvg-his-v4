#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.v2}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.v2.yml}"
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/var/backups/cvg-his-v2-cutover}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_BASE_DIR/$TIMESTAMP"

LEGACY_CONTAINERS_DEFAULT=(
  cvg-his-api
  cvg-his-web
  cvg-his-worker
  cvg-his-postgres
  cvg-his-redis
  cvg-his-v2-cvg-his-api-1
  cvg-his-v2-cvg-his-web-1
  cvg-his-v2-cvg-his-worker-1
  cvg-his-v2-postgres-1
  cvg-his-v2-redis-1
)

docker_compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

log() {
  printf '[cutover-v2] %s\n' "$*"
}

die() {
  printf '[cutover-v2] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "command not found: $1"
}

load_env_file() {
  [[ -f "$ENV_FILE" ]] || die "env file not found: $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

require_env() {
  local key="$1"
  [[ -n "${!key:-}" ]] || die "required env missing: $key"
}

ensure_prereqs() {
  require_cmd docker
  require_cmd curl
  require_cmd awk
  require_cmd date
  require_cmd tee
  require_cmd node
  load_env_file
  node "$ROOT_DIR/infra/scripts/check-cutover-readiness.mjs"
  require_env POSTGRES_PASSWORD
  require_env AUTH_SECRET
  require_env NODE_ENV
  if [[ "${NODE_ENV}" != "production" && "${NODE_ENV}" != "staging" && "${NODE_ENV}" != "prod" && "${NODE_ENV}" != "stage" ]]; then
    if [[ "${ALLOW_NON_PRODUCTION_CUTOVER:-false}" != "true" ]]; then
      die "NODE_ENV must be production-like for cutover. Current: ${NODE_ENV}. Set ALLOW_NON_PRODUCTION_CUTOVER=true only for exceptional rehearsals."
    fi
    log "ALLOW_NON_PRODUCTION_CUTOVER=true; proceeding with non-production NODE_ENV=${NODE_ENV}"
  fi
  if [[ "${POSTGRES_PASSWORD}" == "troque-esta-senha" ]]; then
    die "POSTGRES_PASSWORD is still using the placeholder value"
  fi
  if [[ "${AUTH_SECRET}" == "troque-por-um-segredo-forte-com-32-ou-mais-caracteres" ]]; then
    die "AUTH_SECRET is still using the placeholder value"
  fi
}

validate_compose() {
  log "validating docker compose file"
  docker_compose config >/dev/null
}

prepare_backup_dir() {
  mkdir -p "$BACKUP_DIR"
  log "backup dir: $BACKUP_DIR"
}

snapshot_legacy_state() {
  log "capturing current docker state"
  docker ps -a > "$BACKUP_DIR/docker-ps.txt" || true

  local containers=()
  if [[ -n "${LEGACY_CONTAINERS:-}" ]]; then
    # shellcheck disable=SC2206
    containers=(${LEGACY_CONTAINERS})
  else
    containers=("${LEGACY_CONTAINERS_DEFAULT[@]}")
  fi

  for name in "${containers[@]}"; do
    if docker inspect "$name" >/dev/null 2>&1; then
      docker inspect "$name" > "$BACKUP_DIR/${name}.inspect.json" || true
      docker logs --tail=200 "$name" > "$BACKUP_DIR/${name}.logs.txt" 2>&1 || true
    fi
  done

  if [[ -n "${LEGACY_DB_URL:-}" ]]; then
    require_cmd pg_dump
    log "dumping legacy database"
    pg_dump "$LEGACY_DB_URL" > "$BACKUP_DIR/legacy-db.sql"
  else
    log "LEGACY_DB_URL not provided; skipping database dump"
  fi
}

capture_cutover_readiness() {
  log "capturing machine-readable cutover readiness evidence"
  node "$ROOT_DIR/infra/scripts/check-cutover-readiness.mjs" --json > "$BACKUP_DIR/cutover-readiness.json"
}

stop_previous_v2_stack() {
  log "stopping previous V2 stack"
  docker_compose down --remove-orphans || true
}

build_v2_images() {
  log "building V2 images with explicit service list"
  docker_compose build --no-cache cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
}

wait_for_service_health() {
  local service="$1"
  local attempts="${2:-60}"
  local sleep_s="${3:-2}"

  for _ in $(seq 1 "$attempts"); do
    local container_id
    container_id="$(docker_compose ps -q "$service" 2>/dev/null || true)"
    if [[ -n "$container_id" ]]; then
      local status
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
      if [[ "$status" == "healthy" ]]; then
        return 0
      fi
    fi
    sleep "$sleep_s"
  done

  return 1
}

start_dependencies() {
  log "starting postgres and redis first"
  docker_compose up -d postgres redis

  log "waiting for postgres healthcheck"
  wait_for_service_health postgres 60 2 || die "postgres did not become healthy"

  log "waiting for redis healthcheck"
  wait_for_service_health redis 60 2 || die "redis did not become healthy"
}

apply_v2_schema() {
  if [[ "${APPLY_SCHEMA:-true}" != "true" ]]; then
    log "APPLY_SCHEMA=false; skipping schema application"
    return
  fi

  local db_url="postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB:-cvg_his_v2}"
  require_cmd npx

  log "applying V2 schema via Drizzle migration"
  DATABASE_URL="$db_url" npx tsx packages/db/src/migrate.ts
  log "Drizzle migration applied successfully"

  # Migration 0113 creates API-key capability functions after the runtime-role
  # init hook. Reconcile immediately so the API login role has the explicit
  # EXECUTE grants before any application container starts.
  DATABASE_URL="$db_url" \
    POSTGRES_API_USER="${POSTGRES_API_USER:-cvg_api}" \
    POSTGRES_WORKER_USER="${POSTGRES_WORKER_USER:-cvg_worker}" \
    npx tsx packages/db/src/reconcile-runtime-roles.ts
  log "Runtime PostgreSQL roles reconciled successfully"

  if [[ -n "${ADMIN_EMAIL:-}" && -n "${ADMIN_PASSWORD:-}" ]]; then
    log "running Drizzle seed with admin user"
    DATABASE_URL="$db_url" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" npx tsx packages/db/src/seed.ts
    log "Drizzle seed applied successfully"
  else
    log "ADMIN_EMAIL/ADMIN_PASSWORD not provided; skipping admin seed"
  fi
}

start_v2_applications() {
  log "starting V2 application services"
  docker_compose up -d cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa

  log "waiting for API service"
  wait_for_service_health cvg-his-v2-api 60 2 || die "api service did not become healthy"

  log "waiting for SPA service"
  wait_for_service_health cvg-his-v2-spa 60 2 || die "spa service did not become healthy"

  log "waiting for Worker service"
  wait_for_service_health cvg-his-v2-worker 60 2 || die "worker service did not become healthy"
}

wait_for_http() {
  local url="$1"
  local expected="${2:-200}"
  local attempts="${3:-60}"
  local sleep_s="${4:-2}"

  for _ in $(seq 1 "$attempts"); do
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
    if [[ "$code" == "$expected" ]]; then
      return 0
    fi
    sleep "$sleep_s"
  done

  return 1
}

validate_v2_stack() {
  log "validating API /health (external port 3003)"
  wait_for_http "${API_HEALTH_URL:-http://127.0.0.1:3003/health}" 200 || die "API health check failed"

  log "validating API /ready (external port 3003)"
  wait_for_http "${API_READY_URL:-http://127.0.0.1:3003/ready}" 200 || die "API readiness check failed"

  log "validating API /metrics (external port 3003)"
  wait_for_http "${API_METRICS_URL:-http://127.0.0.1:3003/metrics}" 200 || die "API metrics check failed"

  log "validating SPA root (external port 3002)"
  local spa_code
  spa_code="$(curl -s -o /dev/null -w '%{http_code}' "${SPA_URL:-http://127.0.0.1:3002/}" || true)"
  [[ "$spa_code" == "200" ]] || die "spa root returned unexpected status: $spa_code"

  if [[ -n "${WORKER_HEALTH_URL:-}" ]]; then
    log "validating Worker health at custom URL"
    wait_for_http "$WORKER_HEALTH_URL" 200 30 2 || die "worker health check failed at custom URL"
  else
    log "worker HTTP readiness is enforced by the Compose healthcheck on the internal port"
  fi

  docker_compose ps > "$BACKUP_DIR/v2-compose-ps.txt"
  docker_compose logs --tail=200 cvg-his-v2-api > "$BACKUP_DIR/v2-api.logs.txt" 2>&1 || true
  docker_compose logs --tail=200 cvg-his-v2-worker > "$BACKUP_DIR/v2-worker.logs.txt" 2>&1 || true
  docker_compose logs --tail=200 cvg-his-v2-spa > "$BACKUP_DIR/v2-spa.logs.txt" 2>&1 || true
}

switch_caddy_if_enabled() {
  if [[ "${ENABLE_CADDY_SWITCH:-false}" != "true" ]]; then
    log "ENABLE_CADDY_SWITCH=false; skipping proxy cutover"
    return
  fi

  require_cmd caddy
  [[ -n "${CADDYFILE_TARGET:-}" ]] || die "CADDYFILE_TARGET is required when ENABLE_CADDY_SWITCH=true"

  local caddy_source="${CADDYFILE_SOURCE:-$ROOT_DIR/infra/docker/Caddyfile.v2}"
  [[ -f "$caddy_source" ]] || die "Caddy source file not found: $caddy_source"

  cp "$caddy_source" "$CADDYFILE_TARGET"
  caddy validate --config "$CADDYFILE_TARGET"
  systemctl reload caddy
  log "Caddy reloaded with V2 config"
}

stop_legacy_if_requested() {
  if [[ "${STOP_LEGACY_AFTER_SUCCESS:-false}" != "true" ]]; then
    log "STOP_LEGACY_AFTER_SUCCESS=false; keeping legacy stack running"
    return
  fi

  local containers=()
  if [[ -n "${LEGACY_CONTAINERS_TO_STOP:-}" ]]; then
    # shellcheck disable=SC2206
    containers=(${LEGACY_CONTAINERS_TO_STOP})
  else
    containers=(cvg-his-api cvg-his-web cvg-his-worker)
  fi

  for name in "${containers[@]}"; do
    if docker inspect "$name" >/dev/null 2>&1; then
      log "stopping legacy container: $name"
      docker stop "$name" >/dev/null || true
    fi
  done
}

print_summary() {
  cat > "$BACKUP_DIR/cutover-report.json" <<EOF
{
  "completedAt": "$TIMESTAMP",
  "backupDir": "$BACKUP_DIR",
  "composeFile": "$COMPOSE_FILE",
  "envFile": "$ENV_FILE",
  "apiHealthUrl": "${API_HEALTH_URL:-http://127.0.0.1:3003/health}",
  "apiReadyUrl": "${API_READY_URL:-http://127.0.0.1:3003/ready}",
  "apiMetricsUrl": "${API_METRICS_URL:-http://127.0.0.1:3003/metrics}",
  "spaUrl": "${SPA_URL:-http://127.0.0.1:3002/}",
  "workerHealthUrl": "${WORKER_HEALTH_URL:-}",
  "caddySwitchEnabled": $([[ "${ENABLE_CADDY_SWITCH:-false}" == "true" ]] && printf 'true' || printf 'false'),
  "legacyStoppedAfterSuccess": $([[ "${STOP_LEGACY_AFTER_SUCCESS:-false}" == "true" ]] && printf 'true' || printf 'false'),
  "readinessEvidence": "$BACKUP_DIR/cutover-readiness.json",
  "apiLogs": "$BACKUP_DIR/v2-api.logs.txt",
  "workerLogs": "$BACKUP_DIR/v2-worker.logs.txt",
  "spaLogs": "$BACKUP_DIR/v2-spa.logs.txt"
}
EOF

  cat <<EOF

Cutover V2 complete.

Backup dir:
  $BACKUP_DIR

Compose:
  $COMPOSE_FILE

Env file:
  $ENV_FILE

  Validated endpoints:
    curl http://127.0.0.1:3003/health
    curl http://127.0.0.1:3003/ready
    curl http://127.0.0.1:3003/metrics
    curl -I http://127.0.0.1:3002/

Worker:
  validated via docker compose ps and logs
  set WORKER_HEALTH_URL if you explicitly expose a worker HTTP port

Rollback:
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down
  # Restore legacy containers from backup: $BACKUP_DIR

Evidence:
  $BACKUP_DIR/cutover-readiness.json
  $BACKUP_DIR/cutover-report.json

Optional:
  ENABLE_CADDY_SWITCH=true CADDYFILE_TARGET=/etc/caddy/Caddyfile $0
EOF
}

main() {
  ensure_prereqs
  validate_compose
  prepare_backup_dir
  capture_cutover_readiness
  snapshot_legacy_state
  stop_previous_v2_stack
  build_v2_images
  start_dependencies
  apply_v2_schema
  start_v2_applications
  validate_v2_stack
  switch_caddy_if_enabled
  stop_legacy_if_requested
  print_summary
}

main "$@"
