#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

BACKUP_REF="${1:-latest}"
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/var/backups/cvg-his-v2}"
RESTORE_DRILL_BASE_DIR="${RESTORE_DRILL_BASE_DIR:-/tmp/cvg-his-v2-restore-drills}"
RESTORE_DRILL_DB_NAME="${RESTORE_DRILL_DB_NAME:-cvg_his_v2_restore_drill}"
KEEP_RUNTIME="${KEEP_RUNTIME:-false}"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_ID="${TIMESTAMP}-$$"
REPORT_DIR=""
BUNDLE_DIR=""
DUMP_FILE=""
GLOBALS_FILE=""
STORAGE_ARCHIVE=""
STORAGE_LISTING=""
MANIFEST_FILE=""
CHECKSUMS_FILE=""
PG_CONTAINER=""
PG_VOLUME=""
RESTORE_USER="restore_admin"
RESTORE_PASSWORD="restore_admin_pw"
PUBLIC_TABLE_COUNT="0"
RESTORED_STORAGE_COUNT="0"

usage() {
  cat <<EOF
Usage: $(basename "$0") [latest|BACKUP_DIR_NAME|/abs/path/to/bundle] [OPTIONS]

Executes a real restore drill for a V2 backup bundle without touching the live stack.

Options:
  --backup-base-dir DIR      Base directory containing backup bundles
  --report-dir DIR           Output directory for drill evidence
  --restore-db-name NAME     Target database name inside the disposable Postgres
  --keep-runtime             Keep disposable Postgres container and volume after the drill
  -h, --help                 Show this help

Environment:
  BACKUP_BASE_DIR            Default base dir for bundles
  RESTORE_DRILL_BASE_DIR     Default base dir for evidence output
  RESTORE_DRILL_DB_NAME      Database restored inside the disposable Postgres
  KEEP_RUNTIME               Keep disposable runtime for manual inspection
EOF
}

log() {
  printf '[restore-drill-v2] %s\n' "$*"
}

die() {
  printf '[restore-drill-v2] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "command not found: $1"
}

cleanup() {
  local exit_code="$1"

  if [[ -n "$PG_CONTAINER" ]]; then
    docker logs "$PG_CONTAINER" > "$REPORT_DIR/postgres-container.log" 2>&1 || true
  fi

  if [[ "$KEEP_RUNTIME" != "true" ]]; then
    [[ -n "$PG_CONTAINER" ]] && docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
    [[ -n "$PG_VOLUME" ]] && docker volume rm -f "$PG_VOLUME" >/dev/null 2>&1 || true
  fi

  exit "$exit_code"
}

on_exit() {
  cleanup "$?"
}

trap on_exit EXIT

parse_args() {
  shift_count=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --)
        shift
        while [[ $# -gt 0 ]]; do
          if [[ $shift_count -eq 0 ]]; then
            BACKUP_REF="$1"
            shift_count=1
            shift
          else
            die "unexpected argument: $1"
          fi
        done
        ;;
      --backup-base-dir)
        BACKUP_BASE_DIR="$2"
        shift 2
        ;;
      --report-dir)
        REPORT_DIR="$2"
        shift 2
        ;;
      --restore-db-name)
        RESTORE_DRILL_DB_NAME="$2"
        shift 2
        ;;
      --keep-runtime)
        KEEP_RUNTIME="true"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        if [[ $shift_count -eq 0 ]]; then
          BACKUP_REF="$1"
          shift_count=1
          shift
        else
          die "unexpected argument: $1"
        fi
        ;;
    esac
  done
}

resolve_bundle_dir() {
  if [[ "$BACKUP_REF" == "latest" ]]; then
    BUNDLE_DIR="$(find "$BACKUP_BASE_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)"
    [[ -n "$BUNDLE_DIR" ]] || die "no backup bundles found in: $BACKUP_BASE_DIR"
  elif [[ -d "$BACKUP_REF" ]]; then
    BUNDLE_DIR="$BACKUP_REF"
  else
    BUNDLE_DIR="$BACKUP_BASE_DIR/$BACKUP_REF"
    [[ -d "$BUNDLE_DIR" ]] || die "backup bundle not found: $BUNDLE_DIR"
  fi

  if [[ -z "$REPORT_DIR" ]]; then
    mkdir -p "$RESTORE_DRILL_BASE_DIR"
    REPORT_DIR="$RESTORE_DRILL_BASE_DIR/$(basename "$BUNDLE_DIR")-restore-drill-$RUN_ID"
  fi
  mkdir -p "$REPORT_DIR"
}

validate_prereqs() {
  require_cmd docker
  require_cmd tar
  require_cmd sha256sum
  require_cmd diff
  require_cmd find
  require_cmd sed
}

validate_bundle() {
  DUMP_FILE="$(find "$BUNDLE_DIR/database" -maxdepth 1 -type f -name '*.dump' | sort | head -1)"
  GLOBALS_FILE="$BUNDLE_DIR/database/postgres-globals.sql"
  STORAGE_ARCHIVE="$BUNDLE_DIR/storage/file-storage.tar.gz"
  STORAGE_LISTING="$BUNDLE_DIR/storage/file-storage.contents.txt"
  MANIFEST_FILE="$BUNDLE_DIR/meta/manifest.json"
  CHECKSUMS_FILE="$BUNDLE_DIR/SHA256SUMS"

  [[ -n "$DUMP_FILE" && -f "$DUMP_FILE" ]] || die "database dump not found inside bundle: $BUNDLE_DIR"
  [[ -f "$GLOBALS_FILE" ]] || die "globals dump not found: $GLOBALS_FILE"
  [[ -f "$MANIFEST_FILE" ]] || die "manifest not found: $MANIFEST_FILE"
  [[ -f "$CHECKSUMS_FILE" ]] || die "checksums file not found: $CHECKSUMS_FILE"
  [[ -f "$STORAGE_ARCHIVE" ]] || die "storage archive not found: $STORAGE_ARCHIVE"
  [[ -f "$STORAGE_LISTING" ]] || die "storage listing not found: $STORAGE_LISTING"

  log "verifying backup checksums"
  (
    cd "$BUNDLE_DIR"
    sha256sum -c SHA256SUMS
  ) | tee "$REPORT_DIR/checksums.txt"

  docker run --rm -v "$BUNDLE_DIR:/backup:ro" postgres:16-alpine \
    pg_restore -l "/backup/database/$(basename "$DUMP_FILE")" \
    > "$REPORT_DIR/dump-toc.txt"
}

start_disposable_postgres() {
  PG_CONTAINER="cvg-his-v2-restore-drill-${RUN_ID,,}"
  PG_VOLUME="${PG_CONTAINER}-pgdata"

  log "starting disposable postgres runtime: $PG_CONTAINER"
  docker volume create "$PG_VOLUME" >/dev/null
  docker run -d --rm \
    --name "$PG_CONTAINER" \
    -e POSTGRES_USER="$RESTORE_USER" \
    -e POSTGRES_PASSWORD="$RESTORE_PASSWORD" \
    -e POSTGRES_DB=postgres \
    -v "$PG_VOLUME:/var/lib/postgresql/data" \
    -v "$BUNDLE_DIR:/backup:ro" \
    postgres:16-alpine >/dev/null

  local attempt=0
  until docker exec "$PG_CONTAINER" pg_isready -U "$RESTORE_USER" -d postgres >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [[ "$attempt" -ge 60 ]]; then
      die "disposable postgres did not become ready in time"
    fi
    sleep 1
  done
}

restore_globals() {
  log "restoring globals into disposable postgres"
  docker exec "$PG_CONTAINER" sh -lc \
    'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -f /backup/database/postgres-globals.sql' \
    > "$REPORT_DIR/globals-restore.log" 2>&1
}

restore_database() {
  local dump_basename
  dump_basename="$(basename "$DUMP_FILE")"

  log "restoring logical dump into database: $RESTORE_DRILL_DB_NAME"
  docker exec "$PG_CONTAINER" sh -lc \
    'dropdb --if-exists -U "$POSTGRES_USER" "'"$RESTORE_DRILL_DB_NAME"'" >/dev/null 2>&1 || true; createdb -U "$POSTGRES_USER" "'"$RESTORE_DRILL_DB_NAME"'"' \
    > "$REPORT_DIR/db-create.log" 2>&1

  docker exec "$PG_CONTAINER" sh -lc \
    'pg_restore -v -U "$POSTGRES_USER" -d "'"$RESTORE_DRILL_DB_NAME"'" --clean --if-exists --no-owner --no-privileges "/backup/database/'"$dump_basename"'"' \
    > "$REPORT_DIR/db-restore.log" 2>&1

  PUBLIC_TABLE_COUNT="$(docker exec "$PG_CONTAINER" sh -lc \
    'psql -U "$POSTGRES_USER" -d "'"$RESTORE_DRILL_DB_NAME"'" -At -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='\''public'\''"' \
    | tr -d '\r')"
  [[ "$PUBLIC_TABLE_COUNT" =~ ^[0-9]+$ ]] || die "invalid public table count after restore: $PUBLIC_TABLE_COUNT"
  [[ "$PUBLIC_TABLE_COUNT" -gt 0 ]] || die "restore produced zero public tables"

  docker exec "$PG_CONTAINER" sh -lc \
    'psql -U "$POSTGRES_USER" -d "'"$RESTORE_DRILL_DB_NAME"'" -At -c "SELECT table_name FROM information_schema.tables WHERE table_schema='\''public'\'' ORDER BY table_name"' \
    > "$REPORT_DIR/restored-public-tables.txt"

  docker exec "$PG_CONTAINER" sh -lc \
    'psql -U "$POSTGRES_USER" -d "'"$RESTORE_DRILL_DB_NAME"'" -At -F "," -c "SELECT '\''public_tables'\'', COUNT(*) FROM pg_tables WHERE schemaname='\''public'\'' UNION ALL SELECT '\''drizzle_migrations_table'\'', CASE WHEN to_regclass('\''public.__drizzle_migrations'\'') IS NULL THEN 0 ELSE 1 END"' \
    > "$REPORT_DIR/restored-db-metrics.csv"
}

restore_storage() {
  local restored_storage_dir="$REPORT_DIR/storage-restored"
  mkdir -p "$restored_storage_dir"

  log "restoring storage archive into drill workspace"
  tar -xzf "$STORAGE_ARCHIVE" -C "$restored_storage_dir"

  (
    cd "$restored_storage_dir"
    find . -type f | sed 's#^\./##' | sort
  ) > "$REPORT_DIR/restored-storage.contents.txt"

  sort "$STORAGE_LISTING" > "$REPORT_DIR/expected-storage.contents.txt"
  if ! diff -u "$REPORT_DIR/expected-storage.contents.txt" "$REPORT_DIR/restored-storage.contents.txt" > "$REPORT_DIR/storage-contents.diff"; then
    die "restored storage contents do not match the bundle listing"
  fi

  RESTORED_STORAGE_COUNT="$(wc -l < "$REPORT_DIR/restored-storage.contents.txt" | tr -d ' ')"
}

write_report() {
  local report_text="$REPORT_DIR/restore-drill-report.txt"
  local report_json="$REPORT_DIR/restore-drill-report.json"

  cat > "$report_text" <<EOF
Restore Drill V2 complete.

Backup bundle:
  $BUNDLE_DIR

Evidence output:
  $REPORT_DIR

Validated artifacts:
  $CHECKSUMS_FILE
  $DUMP_FILE
  $GLOBALS_FILE
  $STORAGE_ARCHIVE

Database restore:
  disposable container: $PG_CONTAINER
  disposable volume: $PG_VOLUME
  target database: $RESTORE_DRILL_DB_NAME
  public tables restored: $PUBLIC_TABLE_COUNT

Storage restore:
  restored files: $RESTORED_STORAGE_COUNT
  listing diff: $REPORT_DIR/storage-contents.diff

Key evidence files:
  $REPORT_DIR/checksums.txt
  $REPORT_DIR/dump-toc.txt
  $REPORT_DIR/globals-restore.log
  $REPORT_DIR/db-restore.log
  $REPORT_DIR/restored-public-tables.txt
  $REPORT_DIR/restored-db-metrics.csv
  $REPORT_DIR/restored-storage.contents.txt
EOF

  cat > "$report_json" <<EOF
{
  "completedAt": "$TIMESTAMP",
  "backupBundle": "$BUNDLE_DIR",
  "reportDir": "$REPORT_DIR",
  "databaseDump": "$DUMP_FILE",
  "globalsDump": "$GLOBALS_FILE",
  "storageArchive": "$STORAGE_ARCHIVE",
  "restoreDatabase": "$RESTORE_DRILL_DB_NAME",
  "publicTablesRestored": $PUBLIC_TABLE_COUNT,
  "restoredStorageFiles": $RESTORED_STORAGE_COUNT,
  "checksumVerification": "passed",
  "storageListingMatch": true
}
EOF

  cat "$report_text"
}

main() {
  parse_args "$@"
  validate_prereqs
  resolve_bundle_dir
  validate_bundle
  start_disposable_postgres
  restore_globals
  restore_database
  restore_storage
  write_report
}

main "$@"
