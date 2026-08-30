#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

BACKUP_REF="${1:-latest}"
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/var/backups/cvg-his-v2}"
RESTORE_DRILL_BASE_DIR="${RESTORE_DRILL_BASE_DIR:-/tmp/cvg-his-v2-restore-drills}"
RESTORE_DRILL_DB_NAME="${RESTORE_DRILL_DB_NAME:-cvg_his_v2_restore_drill}"
KEEP_RUNTIME="${KEEP_RUNTIME:-false}"

generate_restore_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
  fi
}

timestamp_ms() {
  date +%s%3N
}

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_ID="${TIMESTAMP}-$$"
DRILL_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DRILL_STARTED_EPOCH_MS="$(timestamp_ms)"
DRILL_COMPLETED_AT=""
DRILL_ELAPSED_MS="0"
DRILL_ELAPSED_SECONDS="0"
CHECKSUM_VALIDATION_MS="0"
RUNTIME_STARTUP_MS="0"
DATABASE_RESTORE_MS="0"
REPRESENTATIVE_VALIDATION_MS="0"
STORAGE_RESTORE_MS="0"
REPORT_DIR=""
BUNDLE_DIR=""
DUMP_FILE=""
GLOBALS_FILE=""
STORAGE_ARCHIVE=""
STORAGE_LISTING=""
STORAGE_RESTORE_WORKSPACE=""
MANIFEST_FILE=""
CHECKSUMS_FILE=""
PG_CONTAINER=""
PG_VOLUME=""
RESTORE_USER="restore_admin"
RESTORE_PASSWORD="${RESTORE_PASSWORD:-$(generate_restore_password)}"
PUBLIC_TABLE_COUNT="0"
RESTORED_STORAGE_COUNT="0"
RESTORE_DRILL_PROFILE="minimal"
REPRESENTATIVE_ASSERTION_COUNT="0"
REPRESENTATIVE_CHECK_STATUS="skipped"
REPRESENTATIVE_ACCOUNT_ID="11111111-1111-4111-8111-111111111111"
REPRESENTATIVE_RUNTIME_ROLE="restore_probe"
REPRESENTATIVE_RUNTIME_ROLE_STATUS="skipped"

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
  RESTORE_FIXTURE_PROFILE    Profile used when creating local fixture evidence
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

  if [[ -n "$STORAGE_RESTORE_WORKSPACE" && -d "$STORAGE_RESTORE_WORKSPACE" && ! -L "$STORAGE_RESTORE_WORKSPACE" ]]; then
    rm -rf -- "$STORAGE_RESTORE_WORKSPACE"
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
  require_cmd mktemp
  require_cmd sed
  [[ "$RESTORE_DRILL_DB_NAME" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] || die "invalid restore database name: $RESTORE_DRILL_DB_NAME"
}

validate_bundle() {
  local phase_started_at phase_finished_at
  phase_started_at="$(timestamp_ms)"
  DUMP_FILE="$(find "$BUNDLE_DIR/database" -maxdepth 1 -type f -name '*.dump' | sort | head -1)"
  GLOBALS_FILE="$BUNDLE_DIR/database/postgres-globals.sql"
  STORAGE_ARCHIVE="$BUNDLE_DIR/storage/file-storage.tar.gz"
  STORAGE_LISTING="$BUNDLE_DIR/storage/file-storage.contents.txt"
  MANIFEST_FILE="$BUNDLE_DIR/meta/manifest.json"
  CHECKSUMS_FILE="$BUNDLE_DIR/SHA256SUMS"

  RESTORE_DRILL_PROFILE="$(sed -n 's/^profile=//p' "$BUNDLE_DIR/database/backup.info" | head -1)"
  RESTORE_DRILL_PROFILE="${RESTORE_DRILL_PROFILE:-minimal}"
  case "$RESTORE_DRILL_PROFILE" in
    minimal|representative) ;;
    *) die "unsupported restore drill profile in bundle metadata: $RESTORE_DRILL_PROFILE" ;;
  esac

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

  phase_finished_at="$(timestamp_ms)"
  CHECKSUM_VALIDATION_MS=$((phase_finished_at - phase_started_at))
}

validate_storage_archive() {
  local entries_file="$REPORT_DIR/storage-archive.entries.txt"
  local verbose_file="$REPORT_DIR/storage-archive.verbose.txt"
  local entry listing_line entry_type

  tar -tzf "$STORAGE_ARCHIVE" > "$entries_file"
  while IFS= read -r entry || [[ -n "$entry" ]]; do
    [[ -n "$entry" ]] || die "storage archive contains an empty entry"
    if [[ "$entry" == *$'\t'* || "$entry" == *$'\r'* || "$entry" == *$'\n'* ]]; then
      die "storage archive contains control characters in entry: $entry"
    fi
    case "$entry" in
      /*|..|../*|*/..|*/../*|*\\*)
        die "storage archive entry escapes the restore workspace: $entry"
        ;;
    esac
  done < "$entries_file"

  tar -tvzf "$STORAGE_ARCHIVE" > "$verbose_file"
  while IFS= read -r listing_line || [[ -n "$listing_line" ]]; do
    entry_type="${listing_line:0:1}"
    case "$entry_type" in
      -|d) ;;
      *) die "storage archive contains unsupported entry type: $entry_type" ;;
    esac
  done < "$verbose_file"
}

start_disposable_postgres() {
  local phase_started_at phase_finished_at
  phase_started_at="$(timestamp_ms)"
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

  local stable_connections=0
  local stable_attempt=0
  until [[ "$stable_connections" -ge 3 ]]; do
    stable_attempt=$((stable_attempt + 1))
    [[ "$stable_attempt" -lt 60 ]] || die "disposable postgres did not reach stable readiness in time"
    if docker exec "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$RESTORE_USER" -d postgres -At -c 'SELECT 1' >/dev/null 2>&1; then
      stable_connections=$((stable_connections + 1))
    else
      stable_connections=0
    fi
    [[ "$stable_connections" -ge 3 ]] || sleep 1
  done

  phase_finished_at="$(timestamp_ms)"
  RUNTIME_STARTUP_MS=$((phase_finished_at - phase_started_at))
}

restore_globals() {
  log "restoring globals into disposable postgres"
  docker exec "$PG_CONTAINER" sh -lc \
    'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -f /backup/database/postgres-globals.sql' \
    > "$REPORT_DIR/globals-restore.log" 2>&1
}

restore_database() {
  local dump_basename phase_started_at phase_finished_at
  phase_started_at="$(timestamp_ms)"
  dump_basename="$(basename "$DUMP_FILE")"

  log "restoring logical dump into database: $RESTORE_DRILL_DB_NAME"
  docker exec "$PG_CONTAINER" dropdb --if-exists -U "$RESTORE_USER" "$RESTORE_DRILL_DB_NAME" \
    > "$REPORT_DIR/db-drop.log" 2>&1 || true
  docker exec "$PG_CONTAINER" createdb -U "$RESTORE_USER" "$RESTORE_DRILL_DB_NAME" \
    > "$REPORT_DIR/db-create.log" 2>&1

  docker exec "$PG_CONTAINER" pg_restore -v -U "$RESTORE_USER" -d "$RESTORE_DRILL_DB_NAME" \
    --clean --if-exists --no-owner --no-privileges "/backup/database/$dump_basename" \
    > "$REPORT_DIR/db-restore.log" 2>&1

  PUBLIC_TABLE_COUNT="$(docker exec "$PG_CONTAINER" psql -q -v ON_ERROR_STOP=1 -U "$RESTORE_USER" \
    -d "$RESTORE_DRILL_DB_NAME" -At -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'" \
    | tr -d '\r')"
  [[ "$PUBLIC_TABLE_COUNT" =~ ^[0-9]+$ ]] || die "invalid public table count after restore: $PUBLIC_TABLE_COUNT"
  [[ "$PUBLIC_TABLE_COUNT" -gt 0 ]] || die "restore produced zero public tables"

  docker exec "$PG_CONTAINER" psql -q -v ON_ERROR_STOP=1 -U "$RESTORE_USER" -d "$RESTORE_DRILL_DB_NAME" \
    -At -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name" \
    > "$REPORT_DIR/restored-public-tables.txt"

  docker exec "$PG_CONTAINER" psql -q -v ON_ERROR_STOP=1 -U "$RESTORE_USER" -d "$RESTORE_DRILL_DB_NAME" \
    -At -F "," -c "SELECT 'public_tables', COUNT(*) FROM pg_tables WHERE schemaname='public' UNION ALL SELECT 'drizzle_migrations_table', CASE WHEN to_regclass('public.drizzle_migrations') IS NOT NULL OR to_regclass('public.__drizzle_migrations') IS NOT NULL THEN 1 ELSE 0 END" \
    > "$REPORT_DIR/restored-db-metrics.csv"

  docker exec "$PG_CONTAINER" psql -q -v ON_ERROR_STOP=1 -U "$RESTORE_USER" -d "$RESTORE_DRILL_DB_NAME" \
    -c "DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$REPRESENTATIVE_RUNTIME_ROLE') THEN
    EXECUTE 'CREATE ROLE $REPRESENTATIVE_RUNTIME_ROLE NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS';
  END IF;
END
\$\$;
ALTER ROLE $REPRESENTATIVE_RUNTIME_ROLE NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA public, app TO $REPRESENTATIVE_RUNTIME_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO $REPRESENTATIVE_RUNTIME_ROLE;
GRANT EXECUTE ON FUNCTION app.current_account_id() TO $REPRESENTATIVE_RUNTIME_ROLE;" \
    > "$REPORT_DIR/runtime-probe-role.log" 2>&1

  phase_finished_at="$(timestamp_ms)"
  DATABASE_RESTORE_MS=$((phase_finished_at - phase_started_at))
}

validate_representative_restore() {
  local phase_started_at phase_finished_at metrics_file
  phase_started_at="$(timestamp_ms)"
  metrics_file="$REPORT_DIR/representative-integrity.csv"

  if [[ "$RESTORE_DRILL_PROFILE" != "representative" ]]; then
    printf 'profile,%s\n' "$RESTORE_DRILL_PROFILE" > "$metrics_file"
    return
  fi

  log "validating representative clinical-financial graph under tenant context"
  docker exec "$PG_CONTAINER" psql -q -v ON_ERROR_STOP=1 -U "$RESTORE_USER" -d "$RESTORE_DRILL_DB_NAME" \
    -At -F "," -c "SELECT rolsuper::text, rolbypassrls::text FROM pg_roles WHERE rolname = '$REPRESENTATIVE_RUNTIME_ROLE'" \
    > "$REPORT_DIR/representative-role.csv"
  local runtime_role_status
  runtime_role_status="$(tr -d '\r' < "$REPORT_DIR/representative-role.csv")"
  [[ "$runtime_role_status" == "false,false" ]] || die "representative runtime role is not a restricted NOBYPASSRLS role: $runtime_role_status"
  REPRESENTATIVE_RUNTIME_ROLE_STATUS="passed"

  docker exec -i "$PG_CONTAINER" psql -q -v ON_ERROR_STOP=1 -U "$RESTORE_USER" -d "$RESTORE_DRILL_DB_NAME" -At -F "," > "$metrics_file" <<SQL
SET ROLE $REPRESENTATIVE_RUNTIME_ROLE;
DO \$\$
BEGIN
  PERFORM set_config('app.current_account_id', '$REPRESENTATIVE_ACCOUNT_ID', false);
END
\$\$;
SELECT 'accounts', COUNT(*), 1 FROM accounts WHERE id = '$REPRESENTATIVE_ACCOUNT_ID'
UNION ALL SELECT 'owners', COUNT(*), 1 FROM owners WHERE id = '33333333-3333-4333-8333-333333333333'
UNION ALL SELECT 'patients', COUNT(*), 1 FROM patients WHERE id = '44444444-4444-4444-8444-444444444444'
UNION ALL SELECT 'encounters', COUNT(*), 1 FROM encounters WHERE id = '55555555-5555-4555-8555-555555555555'
UNION ALL SELECT 'inpatient_stays', COUNT(*), 1 FROM inpatient_stays WHERE id = '66666666-6666-4666-8666-666666666666'
UNION ALL SELECT 'inpatient_progress', COUNT(*), 1 FROM inpatient_progress WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
UNION ALL SELECT 'clinical_notes', COUNT(*), 1 FROM clinical_notes WHERE id = '88888888-8888-4888-8888-888888888888'
UNION ALL SELECT 'billing_records', COUNT(*), 1 FROM billing_records WHERE id = 'restore-drill-billing-001'
UNION ALL SELECT 'billing_items', COUNT(*), 1 FROM billing_items WHERE id = 'restore-drill-billing-item-001'
UNION ALL SELECT 'inventory_items', COUNT(*), 1 FROM inventory_items WHERE id = 'inventory-restore-001'
UNION ALL SELECT 'inventory_consumptions', COUNT(*), 1 FROM inventory_consumptions WHERE id = 'inventory-consumption-restore-001'
UNION ALL SELECT 'encounter_financial_accounts', COUNT(*), 1 FROM encounter_financial_accounts WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
UNION ALL SELECT 'encounter_receivables', COUNT(*), 1 FROM encounter_receivables WHERE id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
UNION ALL SELECT 'financial_journal_entries', COUNT(*), 1 FROM financial_journal_entries WHERE id = '12121212-1212-4121-8121-121212121212'
UNION ALL SELECT 'financial_journal_lines', COUNT(*), 2 FROM financial_journal_lines WHERE entry_id = '12121212-1212-4121-8121-121212121212'
UNION ALL SELECT 'outbox_events', COUNT(*), 1 FROM outbox_events WHERE id = 'restore-drill-outbox-001'
UNION ALL SELECT 'audit_events', COUNT(*), 1 FROM audit_events WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
UNION ALL SELECT 'documents', COUNT(*), 1 FROM documents WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
UNION ALL SELECT 'encounter_documents', COUNT(*), 1 FROM encounter_documents WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
SQL

  while IFS=',' read -r entity count expected; do
    [[ -n "$entity" ]] || continue
    [[ "$count" == "$expected" ]] || die "representative restore assertion failed for $entity: expected $expected, got $count"
    REPRESENTATIVE_ASSERTION_COUNT=$((REPRESENTATIVE_ASSERTION_COUNT + 1))
  done < "$metrics_file"

  [[ "$REPRESENTATIVE_ASSERTION_COUNT" -eq 19 ]] || die "representative restore assertion count mismatch: $REPRESENTATIVE_ASSERTION_COUNT"
  REPRESENTATIVE_CHECK_STATUS="passed"
  phase_finished_at="$(timestamp_ms)"
  REPRESENTATIVE_VALIDATION_MS=$((phase_finished_at - phase_started_at))
}

restore_storage() {
  local phase_started_at phase_finished_at
  local requested_storage_dir="$REPORT_DIR/storage-restored"
  local restored_storage_dir
  local unsafe_entry multiply_linked_entry
  phase_started_at="$(timestamp_ms)"
  if [[ -e "$requested_storage_dir" || -L "$requested_storage_dir" ]]; then
    die "restore destination already exists or is a symlink: $requested_storage_dir"
  fi
  STORAGE_RESTORE_WORKSPACE="$(mktemp -d "${TMPDIR:-/tmp}/cvg-his-v2-restore-storage.XXXXXX")"
  chmod 700 "$STORAGE_RESTORE_WORKSPACE"
  restored_storage_dir="$STORAGE_RESTORE_WORKSPACE"

  log "restoring storage archive into drill workspace"
  tar --extract --gzip --file="$STORAGE_ARCHIVE" --directory="$restored_storage_dir" \
    --no-same-owner --no-same-permissions --no-overwrite-dir --keep-directory-symlink

  unsafe_entry="$(find "$restored_storage_dir" -xdev \
    \( -type l -o -type b -o -type c -o -type p -o -type s \) -print -quit)"
  [[ -z "$unsafe_entry" ]] || die "restored storage contains an unsafe filesystem entry: $unsafe_entry"
  multiply_linked_entry="$(find "$restored_storage_dir" -xdev -type f -links +1 -print -quit)"
  [[ -z "$multiply_linked_entry" ]] || die "restored storage contains a hard-linked file: $multiply_linked_entry"

  (
    cd "$restored_storage_dir"
    find . -type f | sed 's#^\./##' | sort
  ) > "$REPORT_DIR/restored-storage.contents.txt"

  sort "$STORAGE_LISTING" > "$REPORT_DIR/expected-storage.contents.txt"
  if ! diff -u "$REPORT_DIR/expected-storage.contents.txt" "$REPORT_DIR/restored-storage.contents.txt" > "$REPORT_DIR/storage-contents.diff"; then
    die "restored storage contents do not match the bundle listing"
  fi

  RESTORED_STORAGE_COUNT="$(wc -l < "$REPORT_DIR/restored-storage.contents.txt" | tr -d ' ')"
  phase_finished_at="$(timestamp_ms)"
  STORAGE_RESTORE_MS=$((phase_finished_at - phase_started_at))
}

write_report() {
  local report_text="$REPORT_DIR/restore-drill-report.txt"
  local report_json="$REPORT_DIR/restore-drill-report.json"
  DRILL_COMPLETED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  DRILL_ELAPSED_MS=$(( $(timestamp_ms) - DRILL_STARTED_EPOCH_MS ))
  DRILL_ELAPSED_SECONDS=$((DRILL_ELAPSED_MS / 1000))

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

Timing:
  started at: $DRILL_STARTED_AT
  completed at: $DRILL_COMPLETED_AT
  elapsed milliseconds: $DRILL_ELAPSED_MS
  checksum validation milliseconds: $CHECKSUM_VALIDATION_MS
  runtime startup milliseconds: $RUNTIME_STARTUP_MS
  database restore milliseconds: $DATABASE_RESTORE_MS
  representative validation milliseconds: $REPRESENTATIVE_VALIDATION_MS
  storage restore milliseconds: $STORAGE_RESTORE_MS

Representative graph:
  profile: $RESTORE_DRILL_PROFILE
  integrity check: $REPRESENTATIVE_CHECK_STATUS
  assertions passed: $REPRESENTATIVE_ASSERTION_COUNT

Key evidence files:
  $REPORT_DIR/checksums.txt
  $REPORT_DIR/dump-toc.txt
  $REPORT_DIR/globals-restore.log
  $REPORT_DIR/db-restore.log
  $REPORT_DIR/restored-public-tables.txt
  $REPORT_DIR/restored-db-metrics.csv
  $REPORT_DIR/representative-integrity.csv
  $REPORT_DIR/representative-role.csv
  $REPORT_DIR/storage-archive.entries.txt
  $REPORT_DIR/storage-archive.verbose.txt
  $REPORT_DIR/restored-storage.contents.txt
EOF

  cat > "$report_json" <<EOF
{
  "runId": "$RUN_ID",
  "startedAt": "$DRILL_STARTED_AT",
  "completedAt": "$DRILL_COMPLETED_AT",
  "elapsedMs": $DRILL_ELAPSED_MS,
  "elapsedSeconds": $DRILL_ELAPSED_SECONDS,
  "phaseDurationsMs": {
    "checksumValidation": $CHECKSUM_VALIDATION_MS,
    "runtimeStartup": $RUNTIME_STARTUP_MS,
    "databaseRestore": $DATABASE_RESTORE_MS,
    "representativeValidation": $REPRESENTATIVE_VALIDATION_MS,
    "storageRestore": $STORAGE_RESTORE_MS
  },
  "backupBundle": "$BUNDLE_DIR",
  "reportDir": "$REPORT_DIR",
  "databaseDump": "$DUMP_FILE",
  "globalsDump": "$GLOBALS_FILE",
  "storageArchive": "$STORAGE_ARCHIVE",
  "restoreDatabase": "$RESTORE_DRILL_DB_NAME",
  "restoreProfile": "$RESTORE_DRILL_PROFILE",
  "representativeRuntimeRole": "$REPRESENTATIVE_RUNTIME_ROLE",
  "representativeRuntimeRoleRls": "$REPRESENTATIVE_RUNTIME_ROLE_STATUS",
  "publicTablesRestored": $PUBLIC_TABLE_COUNT,
  "restoredStorageFiles": $RESTORED_STORAGE_COUNT,
  "representativeAssertionsPassed": $REPRESENTATIVE_ASSERTION_COUNT,
  "representativeIntegrity": "$REPRESENTATIVE_CHECK_STATUS",
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
  validate_storage_archive
  start_disposable_postgres
  restore_globals
  restore_database
  validate_representative_restore
  restore_storage
  write_report
}

main "$@"
