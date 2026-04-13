#!/usr/bin/env bash
# restore-backup.sh — CVG-HIS V2 Restore Script
# Restores PostgreSQL, storage, and Redis from a backup.
#
# Usage: ./restore-backup.sh BACKUP_PREFIX [OPTIONS]
#
# Arguments:
#   BACKUP_PREFIX   — Backup timestamp prefix (e.g., cvg-his-v2-20260412-143022)
#                     Use 'latest' to restore the most recent backup.
#
# Options:
#   --backup-dir     — Directory containing backups (default: /var/backups/cvg-his-v2)
#   --skip-storage   — Skip storage restore
#   --skip-redis     — Skip Redis restore
#   --dry-run        — Show what would be done without executing
#   --verify         — Verify backup integrity without restoring
#
# Examples:
#   ./restore-backup.sh cvg-his-v2-20260412-143022
#   ./restore-backup.sh latest --backup-dir /mnt/backups
#   ./restore-backup.sh cvg-his-v2-20260412-143022 --verify
#
# Prerequisites:
#   - PostgreSQL must be running and accessible
#   - Services (API, Worker) should be stopped before restore
#   - Docker daemon must be running
#
# Warning:
#   This script performs destructive operations.
#   Always verify backups before restoring to production.

set -euo pipefail

# ============================================================================
# Defaults
# ============================================================================
BACKUP_PREFIX=""
BACKUP_DIR="/var/backups/cvg-his-v2"
SKIP_STORAGE=false
SKIP_REDIS=false
DRY_RUN=false
VERIFY_ONLY=false

COMPOSE_PROJECT="${COMPOSE_PROJECT:-cvg-his-v2}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-cvg_his_v2}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

PG_VOLUME="${COMPOSE_PROJECT}_cvg_his_v2_postgres_data"
STORAGE_VOLUME="${COMPOSE_PROJECT}_cvg_his_v2_storage"
REDIS_VOLUME="${COMPOSE_PROJECT}_cvg_his_v2_redis_data"

# ============================================================================
# Helpers
# ============================================================================
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

warn() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $*" >&2
}

error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
  exit 1
}

# ============================================================================
# Usage
# ============================================================================
usage() {
  cat <<EOF
Usage: $(basename "$0") BACKUP_PREFIX [OPTIONS]

Restore CVG-HIS V2 from backup.

Arguments:
  BACKUP_PREFIX   Backup timestamp prefix (e.g., cvg-his-v2-20260412-143022)
                   Use 'latest' to restore the most recent backup.

Options:
  --backup-dir DIR   Backup directory (default: /var/backups/cvg-his-v2)
  --skip-storage     Skip storage restore
  --skip-redis       Skip Redis restore
  --dry-run          Show what would be done without executing
  --verify           Verify backup integrity without restoring
  -h, --help         Show this help

Examples:
  $(basename "$0") cvg-his-v2-20260412-143022
  $(basename "$0") latest --backup-dir /mnt/backups
  $(basename "$0") cvg-his-v2-20260412-143022 --verify

Prerequisites:
  - PostgreSQL running and accessible
  - Services stopped before restore (docker compose stop api worker)
  - Docker daemon running
EOF
}

# ============================================================================
# Argument parsing
# ============================================================================
while [[ $# -gt 0 ]]; do
  case $1 in
    --backup-dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --skip-storage)
      SKIP_STORAGE=true
      shift
      ;;
    --skip-redis)
      SKIP_REDIS=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verify)
      VERIFY_ONLY=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      error "Unknown option: $1"
      ;;
    *)
      if [[ -z "${BACKUP_PREFIX}" ]]; then
        BACKUP_PREFIX="$1"
      else
        error "Unexpected argument: $1"
      fi
      shift
      ;;
  esac
done

# ============================================================================
# Validation
# ============================================================================
if [[ -z "${BACKUP_PREFIX}" ]]; then
  usage
  error "BACKUP_PREFIX is required"
fi

# Find the actual backup prefix
if [[ "${BACKUP_PREFIX}" == "latest" ]]; then
  BACKUP_PREFIX=$(find "${BACKUP_DIR}" -name "cvg-his-v2-20*" -maxdepth 1 -type f 2>/dev/null | \
    head -1 | \
    sed 's|/.*/||' | \
    sed 's/-manifest\.json$//' | \
    sed 's/-pg\.dump$//' | \
    sed 's/-storage\.tar\.gz$//' | \
    sed 's/-redis\.rdb$//' | \
    sed 's/-full\.tar\.gz$//' || true)

  if [[ -z "${BACKUP_PREFIX}" ]]; then
    error "No backups found in ${BACKUP_DIR}"
  fi
  log "Using latest backup: ${BACKUP_PREFIX}"
fi

# Define backup files
PG_DUMP_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}-pg.dump"
STORAGE_TAR_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}-storage.tar.gz"
REDIS_DUMP_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}-redis.rdb"
MANIFEST_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}-manifest.json"

# Check backup files exist
log "Checking backup files..."
MISSING_FILES=0

if [[ ! -f "${PG_DUMP_FILE}" ]]; then
  warn "PostgreSQL dump not found: ${PG_DUMP_FILE}"
  MISSING_FILES=$((MISSING_FILES + 1))
fi

if [[ ! -f "${MANIFEST_FILE}" ]]; then
  warn "Manifest not found: ${MANIFEST_FILE}"
else
  log "Manifest found: ${MANIFEST_FILE}"
  log "Backup details:"
  grep -E '"(timestamp|database|retentionDays|createdAt)"' "${MANIFEST_FILE}" | sed 's/^/  /' 2>/dev/null || true
fi

# ============================================================================
# Pre-restore checks
# ============================================================================
if [[ "${VERIFY_ONLY}" == "true" ]]; then
  log "=== VERIFY MODE — No changes will be made ==="
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  log "=== DRY RUN — No changes will be made ==="
fi

# Check for running services
RUNNING_SERVICES=$(docker compose -p "${COMPOSE_PROJECT}" ps --services --filter "status=running" 2>/dev/null | wc -l || echo "0")
if [[ "${RUNNING_SERVICES}" -gt 0 && "${DRY_RUN}" == "false" && "${VERIFY_ONLY}" == "false" ]]; then
  warn "Services are still running.建议先停止服务: docker compose -p ${COMPOSE_PROJECT} stop api worker"
  warn "Continuing anyway..."
fi

# Verify PostgreSQL is accessible
log "Verifying PostgreSQL..."
if pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
  log "  PostgreSQL is ready"
else
  error "PostgreSQL is not accessible at ${POSTGRES_HOST}:${POSTGRES_PORT}"
fi

# ============================================================================
# Verify backup integrity
# ============================================================================
log "Verifying backup integrity..."

if [[ -f "${PG_DUMP_FILE}" ]]; then
  log "  Verifying PostgreSQL dump format..."
  if pg_restore "${PG_DUMP_FILE}" --list 2>/dev/null | head -5 | grep -q "TOC"; then
    log "    PostgreSQL dump is valid (custom format)"
  else
    # Try to verify as plain text
    if file "${PG_DUMP_FILE}" | grep -q "ASCII"; then
      log "    PostgreSQL dump appears valid (plain text format)"
    else
      warn "    Could not verify PostgreSQL dump format. Restore may still work."
    fi
  fi

  PG_DUMP_SIZE=$(du -h "${PG_DUMP_FILE}" | cut -f1)
  log "    Size: ${PG_DUMP_SIZE}"
else
  MISSING_FILES=$((MISSING_FILES + 1))
fi

if [[ -f "${STORAGE_TAR_FILE}" ]]; then
  log "  Verifying storage archive..."
  if tar -tzf "${STORAGE_TAR_FILE}" >/dev/null 2>&1; then
    log "    Storage archive is valid"
    STORAGE_SIZE=$(du -h "${STORAGE_TAR_FILE}" | cut -f1)
    log "    Size: ${STORAGE_SIZE}"
  else
    warn "    Storage archive may be corrupted"
  fi
fi

if [[ -f "${REDIS_DUMP_FILE}" ]]; then
  log "  Verifying Redis dump..."
  REDIS_SIZE=$(du -h "${REDIS_DUMP_FILE}" | cut -f1)
  log "    Size: ${REDIS_SIZE}"
fi

if [[ "${MISSING_FILES}" -gt 0 ]]; then
  warn "Missing ${MISSING_FILES} backup file(s)"
fi

if [[ "${VERIFY_ONLY}" == "true" ]]; then
  log "=== Verification complete ==="
  exit 0
fi

# ============================================================================
# Restore
# ============================================================================
if [[ "${DRY_RUN}" == "true" ]]; then
  log "=== DRY RUN COMPLETE — No changes were made ==="
  log "Would restore:"
  [[ -f "${PG_DUMP_FILE}" ]] && log "  - PostgreSQL: ${PG_DUMP_FILE}"
  [[ -f "${STORAGE_TAR_FILE}" && "${SKIP_STORAGE}" == "false" ]] && log "  - Storage: ${STORAGE_TAR_FILE}"
  [[ -f "${REDIS_DUMP_FILE}" && "${SKIP_REDIS}" == "false" ]] && log "  - Redis: ${REDIS_DUMP_FILE}"
  exit 0
fi

log "=== Starting Restore ==="

# ============================================================================
# 1. Restore PostgreSQL
# ============================================================================
if [[ -f "${PG_DUMP_FILE}" ]]; then
  log "Restoring PostgreSQL (${POSTGRES_DB})..."

  # Check if DB exists
  if PGPASSWORD="${PGPASSWORD:-}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'" 2>/dev/null | grep -q "1"; then
    log "  Database ${POSTGRES_DB} exists. Restoring..."
    # Drop existing connections and restore
    PGPASSWORD="${PGPASSWORD:-}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB}' AND pid <> pg_backend_pid()" 2>/dev/null || true
    PGPASSWORD="${PGPASSWORD:-}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\"" 2>/dev/null || true
  fi

  # Create database
  PGPASSWORD="${PGPASSWORD:-}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE \"${POSTGRES_DB}\"" 2>/dev/null || true

  # Restore
  PGPASSWORD="${PGPASSWORD:-}" pg_restore -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --exit-on-error "${PG_DUMP_FILE}" || {
    error "PostgreSQL restore failed"
  }

  log "  PostgreSQL restore complete"
else
  warn "Skipping PostgreSQL restore (no dump file)"
fi

# ============================================================================
# 2. Restore Storage
# ============================================================================
if [[ "${SKIP_STORAGE}" == "true" ]]; then
  log "Skipping storage restore (--skip-storage)"
elif [[ -f "${STORAGE_TAR_FILE}" ]]; then
  log "Restoring file storage..."

  # Try via API container
  if docker ps --format '{{.Names}}' | grep -q "${COMPOSE_PROJECT}-api-1"; then
    docker exec "${COMPOSE_PROJECT}-api-1" sh -c "rm -rf /srv/cvg-his-v2/storage/*" 2>/dev/null || true
    docker exec -i "${COMPOSE_PROJECT}-api-1" tar -xzf - -C /srv/cvg-his-v2/storage/ < "${STORAGE_TAR_FILE}" || {
      warn "Storage restore via container failed"
    }
    log "  Storage restore complete"
  else
    warn "API container not running. Storage restore skipped."
    warn "  To restore storage manually: docker run --rm -v ${STORAGE_VOLUME}:/data -v ${BACKUP_DIR}:/backup ubuntu tar -xzf /backup/${BACKUP_PREFIX}-storage.tar.gz -C /data"
  fi
else
  warn "Skipping storage restore (no archive found)"
fi

# ============================================================================
# 3. Restore Redis
# ============================================================================
if [[ "${SKIP_REDIS}" == "true" ]]; then
  log "Skipping Redis restore (--skip-redis)"
elif [[ -f "${REDIS_DUMP_FILE}" ]]; then
  log "Restoring Redis..."

  if docker exec "${COMPOSE_PROJECT}-redis-1" redis-cli ping >/dev/null 2>&1; then
    # Stop Redis to ensure clean restore
    docker exec "${COMPOSE_PROJECT}-redis-1" redis-cli SHUTDOWN NOSAVE 2>/dev/null || true
    sleep 1

    # Copy RDB file
    docker cp "${REDIS_DUMP_FILE}" "${COMPOSE_PROJECT}-redis-1:/data/dump.rdb" 2>/dev/null || {
      warn "Redis restore via docker cp failed"
    }

    # Also try AOF if available
    if [[ -f "${REDIS_DUMP_FILE}.aof" ]]; then
      docker cp "${REDIS_DUMP_FILE}.aof" "${COMPOSE_PROJECT}-redis-1:/data/appendonly.aof" 2>/dev/null || true
    fi

    # Restart Redis
    docker restart "${COMPOSE_PROJECT}-redis-1" >/dev/null 2>&1 || true
    sleep 2

    if docker exec "${COMPOSE_PROJECT}-redis-1" redis-cli ping >/dev/null 2>&1; then
      log "  Redis restore complete"
    else
      warn "Redis may not have started correctly"
    fi
  else
    warn "Redis not accessible. Skipping."
  fi
else
  warn "Skipping Redis restore (no dump found)"
fi

# ============================================================================
# Post-restore validation
# ============================================================================
log "Post-restore validation..."

if pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
  TABLE_COUNT=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'" 2>/dev/null | xargs || echo "unknown")
  log "  PostgreSQL: OK (${TABLE_COUNT} tables)"
else
  warn "PostgreSQL: may not be fully restored"
fi

# ============================================================================
# Summary
# ============================================================================
log "=== Restore Complete ==="
echo ""
echo "=== Restore Summary ==="
echo "  Backup:     ${BACKUP_PREFIX}"
echo "  Backup Dir: ${BACKUP_DIR}"
echo "  PostgreSQL:  ${PG_DUMP_FILE:-(skipped)}"
echo "  Storage:    ${STORAGE_TAR_FILE:-(skipped)}"
echo "  Redis:      ${REDIS_DUMP_FILE:-(skipped)}"
echo ""
echo "Next steps:"
echo "  1. Verify application functionality"
echo "  2. Restart services: docker compose -p ${COMPOSE_PROJECT} start"
echo "  3. Check health: curl http://localhost:3001/health"
echo "==================="
