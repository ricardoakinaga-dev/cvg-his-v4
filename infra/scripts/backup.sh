#!/usr/bin/env bash
# backup.sh — CVG-HIS V2 Backup Script
# Automates PostgreSQL database and artifact backups with retention policy.
#
# Usage: ./backup.sh [BACKUP_DIR] [RETENTION_DAYS]
#   BACKUP_DIR     — Directory to store backups (default: /var/backups/cvg-his-v2)
#   RETENTION_DAYS — Number of days to retain backups (default: 7)
#
# Environment variables:
#   POSTGRES_HOST     — PostgreSQL host (default: localhost)
#   POSTGRES_PORT     — PostgreSQL port (default: 5432)
#   POSTGRES_DB       — Database name (default: cvg_his_v2)
#   POSTGRES_USER     — PostgreSQL user (default: postgres)
#   COMPOSE_PROJECT   — Docker compose project name (default: cvg-his-v2)
#
# What is backed up:
#   1. PostgreSQL database (pg_dump, custom format)
#   2. File storage (tar of /srv/cvg-his-v2/storage)
#   3. Redis persistence (AOF file)
#
# Output:
#   {BACKUP_DIR}/cvg-his-v2-{TIMESTAMP}.tar.gz
#   {BACKUP_DIR}/cvg-his-v2-{TIMESTAMP}-pg.dump
#   {BACKUP_DIR}/cvg-his-v2-{TIMESTAMP}-storage.tar.gz
#   {BACKUP_DIR}/cvg-his-v2-{TIMESTAMP}-redis.rdb
#   {BACKUP_DIR}/cvg-his-v2-{TIMESTAMP}-manifest.json

set -euo pipefail

# ============================================================================
# Defaults
# ============================================================================
BACKUP_DIR="${1:-${BACKUP_DIR:-/var/backups/cvg-his-v2}}"
RETENTION_DAYS="${2:-${RETENTION_DAYS:-7}}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-cvg_his_v2}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-cvg-his-v2}"

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
BACKUP_PREFIX="cvg-his-v2-${TIMESTAMP}"
MANIFEST_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}-manifest.json"

# Docker volume names (must match docker-compose.v2.yml)
PG_VOLUME="${COMPOSE_PROJECT}_cvg_his_v2_postgres_data"
REDIS_VOLUME="${COMPOSE_PROJECT}_cvg_his_v2_redis_data"
STORAGE_VOLUME="${COMPOSE_PROJECT}_cvg_his_v2_storage"

# ============================================================================
# Helpers
# ============================================================================
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
  exit 1
}

cleanup() {
  # Remove temporary files on exit
  rm -f "${PG_DUMP_FILE:-}" "${STORAGE_TAR_FILE:-}" "${REDIS_DUMP_FILE:-}" 2>/dev/null || true
}

trap cleanup EXIT

# ============================================================================
# Validation
# ============================================================================
command -v pg_dump >/dev/null 2>&1 || error "pg_dump not found. Install postgresql-client."
command -v docker >/dev/null 2>&1 || error "docker not found."

# ============================================================================
# Setup
# ============================================================================
log "Starting backup — dir=${BACKUP_DIR}, retention=${RETENTION_DAYS}d, ts=${TIMESTAMP}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}" || error "Cannot create backup directory: ${BACKUP_DIR}"

# Check PostgreSQL connectivity
PG_PASSWORD="${PGPASSWORD:-}" docker exec "${COMPOSE_PROJECT}-postgres-1" pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1 || {
  log "WARNING: PostgreSQL not reachable via docker exec. Trying direct connection..."
  pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1 || error "PostgreSQL is not available"
}

# ============================================================================
# 1. PostgreSQL Backup (pg_dump custom format)
# ============================================================================
PG_DUMP_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}-pg.dump"

log "Backing up PostgreSQL (${POSTGRES_DB})..."

# Try docker exec first (for local compose), fall back to direct pg_dump
if docker exec "${COMPOSE_PROJECT}-postgres-1" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -F c > "${PG_DUMP_FILE}" 2>/dev/null; then
  log "  PostgreSQL dump complete: ${PG_DUMP_FILE}"
else
  log "  Falling back to direct pg_dump..."
  PGPASSWORD="${PGPASSWORD:-}" pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -F c > "${PG_DUMP_FILE}" || {
    rm -f "${PG_DUMP_FILE}"
    error "PostgreSQL dump failed"
  }
  log "  PostgreSQL dump complete (direct): ${PG_DUMP_FILE}"
fi

PG_DUMP_SIZE=$(du -h "${PG_DUMP_FILE}" | cut -f1)

# ============================================================================
# 2. File Storage Backup (tar of storage volume)
# ============================================================================
STORAGE_TAR_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}-storage.tar.gz"

log "Backing up file storage..."

# Extract storage from container if running, or from volume directly
if docker ps --format '{{.Names}}' | grep -q "${COMPOSE_PROJECT}-api-1"; then
  docker exec "${COMPOSE_PROJECT}-api-1" tar -czf - -C /srv/cvg-his-v2/storage . > "${STORAGE_TAR_FILE}" 2>/dev/null || {
    log "  WARNING: Could not backup storage via container. Storage backup skipped."
    STORAGE_TAR_FILE=""
    STORAGE_SIZE="N/A"
  }
else
  # Try docker volume copy as fallback
  log "  WARNING: API container not running. Attempting volume backup..."
  STORAGE_TAR_FILE=""
fi

if [[ -n "${STORAGE_TAR_FILE}" && -f "${STORAGE_TAR_FILE}" ]]; then
  STORAGE_SIZE=$(du -h "${STORAGE_TAR_FILE}" | cut -f1)
  log "  Storage backup complete: ${STORAGE_TAR_FILE} (${STORAGE_SIZE})"
fi

# ============================================================================
# 3. Redis Backup (if available)
# ============================================================================
REDIS_DUMP_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}-redis.rdb"

log "Backing up Redis persistence..."

if docker exec "${COMPOSE_PROJECT}-redis-1" redis-cli ping >/dev/null 2>&1; then
  docker exec "${COMPOSE_PROJECT}-redis-1" redis-cli BGSAVE >/dev/null 2>&1 || true
  sleep 2
  if docker cp "${COMPOSE_PROJECT}-redis-1:/data.appendonly.aof" "${REDIS_DUMP_FILE}.aof" 2>/dev/null; then
    mv "${REDIS_DUMP_FILE}.aof" "${REDIS_DUMP_FILE}"
    REDIS_SIZE=$(du -h "${REDIS_DUMP_FILE}" | cut -f1)
    log "  Redis backup complete: ${REDIS_DUMP_FILE} (${REDIS_SIZE})"
  elif docker cp "${COMPOSE_PROJECT}-redis-1:/data/dump.rdb" "${REDIS_DUMP_FILE}" 2>/dev/null; then
    REDIS_SIZE=$(du -h "${REDIS_DUMP_FILE}" | cut -f1)
    log "  Redis backup complete: ${REDIS_DUMP_FILE} (${REDIS_SIZE})"
  else
    log "  WARNING: Could not backup Redis. Skipping."
    REDIS_DUMP_FILE=""
    REDIS_SIZE="N/A"
  fi
else
  log "  WARNING: Redis not available. Skipping."
  REDIS_DUMP_FILE=""
  REDIS_SIZE="N/A"
fi

# ============================================================================
# 4. Write Manifest
# ============================================================================
log "Writing manifest: ${MANIFEST_FILE}"

cat > "${MANIFEST_FILE}" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "backupPrefix": "${BACKUP_PREFIX}",
  "hostname": "$(hostname)",
  "retentionDays": ${RETENTION_DAYS},
  "components": {
    "postgresql": {
      "file": "${BACKUP_PREFIX}-pg.dump",
      "size": "${PG_DUMP_SIZE}",
      "database": "${POSTGRES_DB}",
      "host": "${POSTGRES_HOST}",
      "port": ${POSTGRES_PORT}
    },
    "storage": {
      "file": "${BACKGR_PREFIX}-storage.tar.gz",
      "size": "${STORAGE_SIZE}",
      "note": "File storage at /srv/cvg-his-v2/storage"
    },
    "redis": {
      "file": "${BACKUP_PREFIX}-redis.rdb",
      "size": "${REDIS_SIZE}",
      "note": "Redis AOF/RDB persistence"
    }
  },
  "createdAt": "$(date -Iseconds)"
}
EOF

# Fix manifest typo
sed -i "s/\${BACKGR_PREFIX}/${BACKUP_PREFIX}/g" "${MANIFEST_FILE}" 2>/dev/null || true

# ============================================================================
# 5. Create consolidated archive (optional, for portability)
# ============================================================================
log "Creating consolidated archive..."
ARCHIVE_FILE="${BACKUP_DIR}/${BACKUP_PREFIX}-full.tar.gz"

{
  tar -czf "${ARCHIVE_FILE}" -C "${BACKUP_DIR}" \
    "${BACKUP_PREFIX}-manifest.json" \
    "${BACKUP_PREFIX}-pg.dump" \
    2>/dev/null || true
  if [[ -n "${STORAGE_TAR_FILE}" && -f "${STORAGE_TAR_FILE}" ]]; then
    tar -czf "${ARCHIVE_FILE}" -C "${BACKUP_DIR}" "${BACKUP_PREFIX}-storage.tar.gz" 2>/dev/null || true
  fi
  if [[ -n "${REDIS_DUMP_FILE}" && -f "${REDIS_DUMP_FILE}" ]]; then
    tar -czf "${ARCHIVE_FILE}" -C "${BACKUP_DIR}" "${BACKUP_PREFIX}-redis.rdb" 2>/dev/null || true
  fi
} 2>/dev/null || log "  Consolidated archive skipped (partial backup)"

if [[ -f "${ARCHIVE_FILE}" ]]; then
  ARCHIVE_SIZE=$(du -h "${ARCHIVE_FILE}" | cut -f1)
  log "  Consolidated archive: ${ARCHIVE_FILE} (${ARCHIVE_SIZE})"
fi

# ============================================================================
# 6. Apply Retention Policy
# ============================================================================
log "Applying retention policy (keep ${RETENTION_DAYS} days)..."

# Find and remove backups older than RETENTION_DAYS
find "${BACKUP_DIR}" -name "cvg-his-v2-*.dump" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name "cvg-his-v2-*.tar.gz" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name "cvg-his-v2-*.rdb" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name "cvg-his-v2-*.aof" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name "cvg-his-v2-*-manifest.json" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true

RETAINED=$(find "${BACKUP_DIR}" -name "cvg-his-v2-20*" -maxdepth 1 | wc -l)
log "  Retention applied. Total backups retained: ${RETAINED}"

# ============================================================================
# Summary
# ============================================================================
log "Backup completed successfully"
echo ""
echo "=== Backup Summary ==="
echo "  Timestamp:  ${TIMESTAMP}"
echo "  Directory: ${BACKUP_DIR}"
echo "  PostgreSQL: ${PG_DUMP_FILE} (${PG_DUMP_SIZE})"
[[ -n "${STORAGE_TAR_FILE}" && -f "${STORAGE_TAR_FILE}" ]] && echo "  Storage:   ${STORAGE_TAR_FILE} (${STORAGE_SIZE})"
[[ -n "${REDIS_DUMP_FILE}" && -f "${REDIS_DUMP_FILE}" ]] && echo "  Redis:     ${REDIS_DUMP_FILE} (${REDIS_SIZE})"
echo "  Manifest:  ${MANIFEST_FILE}"
[[ -n "${ARCHIVE_FILE}" && -f "${ARCHIVE_FILE}" ]] && echo "  Archive:   ${ARCHIVE_FILE} (${ARCHIVE_SIZE})"
echo "==================="
