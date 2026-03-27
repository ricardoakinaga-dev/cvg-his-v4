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
  load_env_file
  require_env POSTGRES_PASSWORD
  require_env AUTH_SECRET
}

validate_compose() {
  log "validating docker compose file"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null
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

apply_v2_schema() {
  if [[ "${APPLY_SCHEMA:-true}" != "true" ]]; then
    log "APPLY_SCHEMA=false; skipping schema application"
    return
  fi

  local db_url="postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB:-cvg_his_v2}"
  require_cmd psql

  log "applying V2 schema and migrations"
  psql "$db_url" -f packages/shared/database/src/migrations/001_initial_schema.sql
  psql "$db_url" -f packages/shared/database/src/migrations/002_entry_revisions.sql
  psql "$db_url" -f packages/shared/database/src/migrations/003_advanced_care_persistence.sql
  psql "$db_url" -f packages/shared/database/src/migrations/004_clinical_entry_governance.sql
}

build_and_start_v2() {
  log "building and starting V2 stack"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
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
  log "validating API /health"
  wait_for_http "${API_HEALTH_URL:-http://127.0.0.1:3001/health}" 200 || die "API health check failed"

  log "validating API /ready"
  wait_for_http "${API_READY_URL:-http://127.0.0.1:3001/ready}" 200 || die "API readiness check failed"

  log "validating Web root"
  local web_code
  web_code="$(curl -s -o /dev/null -w '%{http_code}' "${WEB_URL:-http://127.0.0.1:3000/}" || true)"
  [[ "$web_code" == "200" ]] || die "web root returned unexpected status: $web_code"

  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps > "$BACKUP_DIR/v2-compose-ps.txt"
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
  cat <<EOF

Cutover V2 complete.

Backup dir:
  $BACKUP_DIR

Compose:
  $COMPOSE_FILE

Env file:
  $ENV_FILE

Next checks:
  curl http://127.0.0.1:3001/health
  curl http://127.0.0.1:3001/ready
  curl -I http://127.0.0.1:3000/

Optional:
  ENABLE_CADDY_SWITCH=true CADDYFILE_TARGET=/etc/caddy/Caddyfile $0
EOF
}

main() {
  ensure_prereqs
  validate_compose
  prepare_backup_dir
  snapshot_legacy_state
  build_and_start_v2
  apply_v2_schema
  validate_v2_stack
  switch_caddy_if_enabled
  stop_legacy_if_requested
  print_summary
}

main "$@"
