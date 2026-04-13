#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.v2}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.v2.yml}"
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/var/backups/cvg-his-v2}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_DB_SERVICE="${BACKUP_DB_SERVICE:-postgres}"
BACKUP_STORAGE_SERVICE="${BACKUP_STORAGE_SERVICE:-cvg-his-v2-api}"
BACKUP_INCLUDE_STORAGE="${BACKUP_INCLUDE_STORAGE:-true}"
BACKUP_NAME_PREFIX="${BACKUP_NAME_PREFIX:-backup}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_BASE_DIR/${BACKUP_NAME_PREFIX}-${TIMESTAMP}"

docker_compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

log() {
  printf '[backup-v2] %s\n' "$*"
}

die() {
  printf '[backup-v2] ERROR: %s\n' "$*" >&2
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

ensure_numeric() {
  [[ "$1" =~ ^[0-9]+$ ]] || die "expected numeric value, got: $1"
}

ensure_prereqs() {
  require_cmd docker
  require_cmd tar
  require_cmd sha256sum
  require_cmd awk
  require_cmd find
  require_cmd sed
  load_env_file
  require_env POSTGRES_PASSWORD
  ensure_numeric "$BACKUP_RETENTION_DAYS"
}

validate_compose() {
  [[ -f "$COMPOSE_FILE" ]] || die "compose file not found: $COMPOSE_FILE"
  docker_compose config >/dev/null
}

service_container_id() {
  local service="$1"
  docker_compose ps -q "$service" 2>/dev/null || true
}

require_running_service() {
  local service="$1"
  local container_id
  container_id="$(service_container_id "$service")"
  [[ -n "$container_id" ]] || die "service container not found: $service"

  local status
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
  [[ "$status" == "healthy" || "$status" == "running" ]] || die "service not ready: $service (status=$status)"
}

prepare_backup_dir() {
  mkdir -p "$BACKUP_DIR/database" "$BACKUP_DIR/storage" "$BACKUP_DIR/meta"
  log "backup dir: $BACKUP_DIR"
}

capture_metadata() {
  log "capturing compose and runtime metadata"
  docker_compose ps > "$BACKUP_DIR/meta/compose-ps.txt"
  docker_compose config --services > "$BACKUP_DIR/meta/compose-services.txt"
  docker volume ls > "$BACKUP_DIR/meta/docker-volume-ls.txt"
  cp "$COMPOSE_FILE" "$BACKUP_DIR/meta/docker-compose.v2.yml"
  awk -F= '/^[A-Za-z_][A-Za-z0-9_]*=/{print $1"=[REDACTED]"}' "$ENV_FILE" > "$BACKUP_DIR/meta/env.keys.txt"
}

dump_database() {
  require_running_service "$BACKUP_DB_SERVICE"
  local db_name="${POSTGRES_DB:-cvg_his_v2}"
  local db_user="${POSTGRES_USER:-postgres}"
  local dump_file="$BACKUP_DIR/database/${db_name}.dump"
  local globals_file="$BACKUP_DIR/database/postgres-globals.sql"

  log "creating logical backup for database: $db_name"
  docker_compose exec -T "$BACKUP_DB_SERVICE" sh -lc \
    'PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-cvg_his_v2}" --format=custom --compress=9' \
    > "$dump_file"
  [[ -s "$dump_file" ]] || die "database dump is empty: $dump_file"

  log "capturing postgres globals"
  docker_compose exec -T "$BACKUP_DB_SERVICE" sh -lc \
    'PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dumpall -U "${POSTGRES_USER:-postgres}" --globals-only' \
    > "$globals_file"
  [[ -s "$globals_file" ]] || die "globals dump is empty: $globals_file"

  printf 'database=%s\nuser=%s\nformat=pg_dump_custom\n' "$db_name" "$db_user" > "$BACKUP_DIR/database/backup.info"
}

backup_storage() {
  if [[ "$BACKUP_INCLUDE_STORAGE" != "true" ]]; then
    log "BACKUP_INCLUDE_STORAGE=false; skipping storage backup"
    return
  fi

  require_running_service "$BACKUP_STORAGE_SERVICE"

  local archive_file="$BACKUP_DIR/storage/file-storage.tar.gz"
  local listing_file="$BACKUP_DIR/storage/file-storage.contents.txt"

  log "creating archive for mounted attachment storage"
  docker_compose exec -T "$BACKUP_STORAGE_SERVICE" sh -lc \
    'storage_path="${FILE_STORAGE_PATH:-/srv/cvg-his-v2/storage}"; test -d "$storage_path" && tar -C "$storage_path" -czf - .' \
    > "$archive_file"
  [[ -s "$archive_file" ]] || die "storage archive is empty: $archive_file"

  docker_compose exec -T "$BACKUP_STORAGE_SERVICE" sh -lc \
    'storage_path="${FILE_STORAGE_PATH:-/srv/cvg-his-v2/storage}"; find "$storage_path" -maxdepth 5 -type f | sed "s#^$storage_path/##" | sort' \
    > "$listing_file" || true
}

write_manifest() {
  local storage_enabled="$BACKUP_INCLUDE_STORAGE"
  local db_file
  db_file="$(basename "$BACKUP_DIR"/database/*.dump)"

  cat > "$BACKUP_DIR/meta/manifest.json" <<EOF
{
  "createdAt": "$TIMESTAMP",
  "backupDir": "$BACKUP_DIR",
  "composeFile": "$COMPOSE_FILE",
  "envFile": "$ENV_FILE",
  "databaseService": "$BACKUP_DB_SERVICE",
  "storageService": "$BACKUP_STORAGE_SERVICE",
  "databaseDump": "database/$db_file",
  "globalsDump": "database/postgres-globals.sql",
  "storageIncluded": $([[ "$storage_enabled" == "true" ]] && printf 'true' || printf 'false'),
  "retentionDays": $BACKUP_RETENTION_DAYS
}
EOF

  cat > "$BACKUP_DIR/meta/restore-hints.txt" <<EOF
Restore prep hints for this backup bundle:

1. Restore Postgres roles/globals first:
   psql < database/postgres-globals.sql

2. Restore logical database dump:
   pg_restore --clean --if-exists --no-owner --no-privileges -d TARGET_DATABASE database/$db_file

3. Restore attachment storage:
   tar -C TARGET_STORAGE_PATH -xzf storage/file-storage.tar.gz

4. Validate application health after restore:
   curl http://127.0.0.1:3003/health
   curl http://127.0.0.1:3003/ready
EOF
}

write_checksums() {
  log "writing SHA256 checksums"
  (
    cd "$BACKUP_DIR"
    find database storage meta -type f -print0 | sort -z | xargs -0 sha256sum
  ) > "$BACKUP_DIR/SHA256SUMS"
}

prune_old_backups() {
  log "applying retention policy: ${BACKUP_RETENTION_DAYS} day(s)"
  mkdir -p "$BACKUP_BASE_DIR"
  find "$BACKUP_BASE_DIR" \
    -mindepth 1 \
    -maxdepth 1 \
    -type d \
    -name "${BACKUP_NAME_PREFIX}-*" \
    -mtime +"$BACKUP_RETENTION_DAYS" \
    -print \
    -exec rm -rf {} +
}

print_summary() {
  cat <<EOF

Backup V2 complete.

Backup dir:
  $BACKUP_DIR

Artifacts:
  $BACKUP_DIR/database
  $BACKUP_DIR/storage
  $BACKUP_DIR/meta
  $BACKUP_DIR/SHA256SUMS

Key files:
  $(find "$BACKUP_DIR/database" -maxdepth 1 -type f | sort)
  $(find "$BACKUP_DIR/storage" -maxdepth 1 -type f | sort)

Next validation step:
  docker run --rm -v "$BACKUP_DIR:/backup" postgres:16-alpine pg_restore -l /backup/database/*.dump
EOF
}

main() {
  ensure_prereqs
  validate_compose
  prepare_backup_dir
  capture_metadata
  dump_database
  backup_storage
  write_manifest
  write_checksums
  prune_old_backups
  print_summary
}

main "$@"
