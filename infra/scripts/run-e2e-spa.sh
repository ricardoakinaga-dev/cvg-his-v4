#!/usr/bin/env bash
#
# Run SPA E2E tests with a reproducible Docker-based environment.
#
# Usage:
#   ./infra/scripts/run-e2e-spa.sh            # full run (build + test + cleanup)
#   ./infra/scripts/run-e2e-spa.sh --no-cleanup  # keep containers running after tests
#   E2E_PLAYWRIGHT_TARGET=e2e/spa/access-role-matrix-db.spec.ts ./infra/scripts/run-e2e-spa.sh
#                                                # run one deterministic target
#
# Prerequisites:
#   - Docker + Docker Compose
#   - Node.js 22+ with pnpm
#   - Playwright browsers installed (npx playwright install)
#
# What it does:
#   1. Starts PostgreSQL + Redis + API via docker-compose.e2e.yml
#   2. Waits for API health
#   3. Applies DB schema + seed
#   4. Runs Playwright SPA E2E tests (auto-starts SPA dev server)
#   5. Cleans up containers (unless --no-cleanup)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.e2e.yml"
COMPOSE_PROJECT_NAME="cvg-his-v2-e2e"
COMPOSE_NETWORK_NAME="${COMPOSE_PROJECT_NAME}_default"
CLEANUP=true
PLAYWRIGHT_TARGET_ARGS=()
DATABASE_URL_E2E="postgres://postgres:postgres@localhost:5434/cvg_his_e2e"
E2E_ADMIN_EMAIL="${E2E_ADMIN_EMAIL:-admin@cvg-his.local}"
E2E_ADMIN_USERNAME="${E2E_ADMIN_USERNAME:-${E2E_ADMIN_EMAIL%@*}}"
E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-seed_admin}"
E2E_RECEPTION_EMAIL="${E2E_RECEPTION_EMAIL:-reception@cvg-his.local}"
E2E_RECEPTION_USERNAME="${E2E_RECEPTION_USERNAME:-reception}"
E2E_RECEPTION_PASSWORD="${E2E_RECEPTION_PASSWORD:-seed_reception}"
E2E_SECOND_ADMIN_EMAIL="${E2E_SECOND_ADMIN_EMAIL:-admin-b@cvg-his.local}"
E2E_SECOND_ADMIN_USERNAME="${E2E_SECOND_ADMIN_USERNAME:-admin_b}"
E2E_SECOND_ADMIN_PASSWORD="${E2E_SECOND_ADMIN_PASSWORD:-seed_admin_b}"
E2E_SECOND_TENANT_SLUG="${E2E_SECOND_TENANT_SLUG:-e2e-secondary}"
E2E_SECOND_ACCOUNT_SLUG="${E2E_SECOND_ACCOUNT_SLUG:-e2e-secondary}"
E2E_SECOND_UNIT_CODE="${E2E_SECOND_UNIT_CODE:-hq}"
API_E2E_PORT=3111
SPA_E2E_PORT=3112
LOCK_FILE="${TMPDIR:-/tmp}/cvg-his-v2-e2e.lock"
LOCK_WAIT_SECONDS="${E2E_LOCK_WAIT_SECONDS:-1800}"

exec 9>"$LOCK_FILE"
if ! flock -w "$LOCK_WAIT_SECONDS" 9; then
  echo "❌ Timed out waiting for E2E lock: $LOCK_FILE"
  exit 1
fi

cleanup_local_e2e_processes() {
  if command -v pkill >/dev/null 2>&1; then
    pkill -f 'playwright test --config playwright-spa.config.ts' >/dev/null 2>&1 || true
    pkill -f 'serve-spa-e2e.mjs' >/dev/null 2>&1 || true
  fi

  for port in "$API_E2E_PORT" "$SPA_E2E_PORT"; do
    if command -v lsof >/dev/null 2>&1; then
      for pid in $(lsof -ti "tcp:${port}" || true); do
        kill -TERM "$pid" >/dev/null 2>&1 || true
      done
    fi
  done

  for _ in $(seq 1 10); do
    local port_busy=false
    for port in "$API_E2E_PORT" "$SPA_E2E_PORT"; do
      if command -v lsof >/dev/null 2>&1 && lsof -ti "tcp:${port}" >/dev/null 2>&1; then
        port_busy=true
        break
      fi
    done

    if [ "$port_busy" = false ]; then
      return
    fi

    sleep 1
  done

  for port in "$API_E2E_PORT" "$SPA_E2E_PORT"; do
    if command -v lsof >/dev/null 2>&1; then
      for pid in $(lsof -ti "tcp:${port}" || true); do
        kill -KILL "$pid" >/dev/null 2>&1 || true
      done
    fi
  done
}

force_cleanup_resources() {
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true

  for container_name in \
    "${COMPOSE_PROJECT_NAME}-postgres-e2e-1" \
    "${COMPOSE_PROJECT_NAME}-redis-e2e-1" \
    "${COMPOSE_PROJECT_NAME}-api-e2e-1" \
    "${COMPOSE_PROJECT_NAME}-spa-e2e-1"; do
    docker rm -f "$container_name" >/dev/null 2>&1 || true
  done

  docker network rm "$COMPOSE_NETWORK_NAME" >/dev/null 2>&1 || true

  for _ in $(seq 1 15); do
    if ! docker ps -a --format '{{.Names}}' | rg -q "^${COMPOSE_PROJECT_NAME}-" \
      && ! docker network ls --format '{{.Name}}' | rg -q "^${COMPOSE_NETWORK_NAME}$"; then
      break
    fi
    sleep 1
  done
}

if [[ "${1:-}" == "--no-cleanup" ]]; then
  CLEANUP=false
fi

if [[ -n "${E2E_PLAYWRIGHT_TARGET:-}" ]]; then
  PLAYWRIGHT_TARGET_ARGS=("$E2E_PLAYWRIGHT_TARGET")
fi

cleanup() {
  if [ "$CLEANUP" = true ]; then
    echo ""
    echo "🧹 Cleaning up E2E environment..."
    force_cleanup_resources
    cleanup_local_e2e_processes
  else
    echo ""
    echo "ℹ️  --no-cleanup: containers left running"
    echo "   To stop: docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE down -v --remove-orphans"
  fi
}

trap cleanup EXIT

echo "🚀 Starting E2E environment..."

# 1. Start infrastructure
echo "   🧽 Cleaning previous E2E stack..."
force_cleanup_resources
cleanup_local_e2e_processes

echo "   📦 Starting PostgreSQL + Redis..."
docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" up -d --build postgres-e2e redis-e2e

# 2. Wait for PostgreSQL health before schema/seed
echo "   ⏳ Waiting for PostgreSQL health..."
MAX_RETRIES=60
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" exec -T postgres-e2e \
    pg_isready -U postgres -d cvg_his_e2e >/dev/null 2>&1; then
    echo "   ✅ PostgreSQL is healthy"
    break
  fi
  RETRY=$((RETRY + 1))
  sleep 2
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "   ❌ PostgreSQL did not become healthy in time"
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" logs postgres-e2e
  exit 1
fi

echo "   ⏳ Waiting for PostgreSQL host connection..."
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if DATABASE_URL="$DATABASE_URL_E2E" node -e '
    const { Client } = require("pg")
    const client = new Client({ connectionString: process.env.DATABASE_URL })
    client
      .connect()
      .then(() => client.end())
      .then(() => process.exit(0))
      .catch(async () => {
        try {
          await client.end()
        } catch {}
        process.exit(1)
      })
  ' >/dev/null 2>&1; then
    echo "   ✅ PostgreSQL host port is reachable"
    break
  fi
  RETRY=$((RETRY + 1))
  sleep 2
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "   ❌ PostgreSQL host port did not become reachable in time"
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" logs postgres-e2e
  exit 1
fi

# 3. Build database and API scripts once so migrate/seed/restart checks can run
# from emitted JS. The release gate may already have built them, but this script
# is intentionally self-contained when invoked directly.
echo "   🧱 Building access catalog, database and API scripts..."
pnpm --filter @cvg-his-v2/rbac build >/dev/null
pnpm --filter @cvg-his-v2/module-access-control build >/dev/null
pnpm --filter @cvg-his/db build >/dev/null
pnpm --filter @cvg-his-v2/api build >/dev/null
pnpm --filter @cvg-his-v2/spa build >/dev/null

# 4. Apply DB schema before API startup so cache-hydrated runtime sees seeded users.
# Retry briefly because PostgreSQL can report healthy before it is fully ready for reset/migrate work.
echo "   🗄️  Applying DB schema..."
DB_SETUP_RETRIES=3
DB_SETUP_ATTEMPT=1
while [ $DB_SETUP_ATTEMPT -le $DB_SETUP_RETRIES ]; do
  if DATABASE_URL="$DATABASE_URL_E2E" node "$ROOT_DIR/infra/scripts/prepare-test-db.mjs"; then
    break
  fi

  if [ $DB_SETUP_ATTEMPT -eq $DB_SETUP_RETRIES ]; then
    echo "   ❌ Failed to prepare E2E database after ${DB_SETUP_RETRIES} attempts"
    exit 1
  fi

  echo "   ⚠️  DB schema preparation failed on attempt ${DB_SETUP_ATTEMPT}/${DB_SETUP_RETRIES}; retrying..."
  DB_SETUP_ATTEMPT=$((DB_SETUP_ATTEMPT + 1))
  sleep 2
done

echo "   🌱 Applying canonical DB seed..."
SEED_RETRIES=3
SEED_ATTEMPT=1
while [ $SEED_ATTEMPT -le $SEED_RETRIES ]; do
  if DATABASE_URL="$DATABASE_URL_E2E" \
    ADMIN_EMAIL="$E2E_ADMIN_EMAIL" \
    ADMIN_USERNAME="$E2E_ADMIN_USERNAME" \
    ADMIN_PASSWORD="$E2E_ADMIN_PASSWORD" \
    RECEPTION_EMAIL="$E2E_RECEPTION_EMAIL" \
    RECEPTION_USERNAME="$E2E_RECEPTION_USERNAME" \
    RECEPTION_PASSWORD="$E2E_RECEPTION_PASSWORD" \
    SECOND_ADMIN_EMAIL="$E2E_SECOND_ADMIN_EMAIL" \
    SECOND_ADMIN_USERNAME="$E2E_SECOND_ADMIN_USERNAME" \
    SECOND_ADMIN_PASSWORD="$E2E_SECOND_ADMIN_PASSWORD" \
    SECOND_TENANT_SLUG="$E2E_SECOND_TENANT_SLUG" \
    SECOND_ACCOUNT_SLUG="$E2E_SECOND_ACCOUNT_SLUG" \
    SECOND_UNIT_CODE="$E2E_SECOND_UNIT_CODE" \
      node "$ROOT_DIR/packages/db/dist/seed.js"; then
    break
  fi

  if [ $SEED_ATTEMPT -eq $SEED_RETRIES ]; then
    echo "   ❌ Failed to seed E2E database after ${SEED_RETRIES} attempts"
    exit 1
  fi

  echo "   ⚠️  DB seed failed on attempt ${SEED_ATTEMPT}/${SEED_RETRIES}; retrying..."
  SEED_ATTEMPT=$((SEED_ATTEMPT + 1))
  sleep 2
done

echo "   🔁 Verifying canonical PostgreSQL runtime after connection restart..."
DATABASE_URL="$DATABASE_URL_E2E" \
CANONICAL_DB_TEST_USERNAME="$E2E_ADMIN_USERNAME" \
CANONICAL_DB_TEST_PASSWORD="$E2E_ADMIN_PASSWORD" \
  node "$ROOT_DIR/apps/api/dist/canonical-db-runtime.test.js"

# Ensure Playwright does not reuse stale local API/SPA processes from prior runs.
echo "   🧽 Clearing stale local API/SPA ports..."
fuser -k 3111/tcp 3112/tcp >/dev/null 2>&1 || true

# 5. Run E2E tests against Docker-backed infra and locally served API + SPA.
# The release gate already builds the workspace before this step, so rebuilding
# app images here only adds a redundant bottleneck.
echo ""
echo "🧪 Running SPA E2E tests..."
echo ""

cd "$ROOT_DIR"
E2E_AUTH_TOKEN="" \
E2E_ADMIN_USERNAME="$E2E_ADMIN_USERNAME" \
E2E_ADMIN_EMAIL="$E2E_ADMIN_EMAIL" \
E2E_ADMIN_PASSWORD="$E2E_ADMIN_PASSWORD" \
E2E_SECOND_ADMIN_USERNAME="$E2E_SECOND_ADMIN_USERNAME" \
E2E_SECOND_ADMIN_EMAIL="$E2E_SECOND_ADMIN_EMAIL" \
E2E_SECOND_ADMIN_PASSWORD="$E2E_SECOND_ADMIN_PASSWORD" \
E2E_DATABASE_URL="$DATABASE_URL_E2E" \
E2E_REDIS_URL="redis://127.0.0.1:6381" \
E2E_DATABASE_MODE="1" \
API_DISABLE_INCOMPATIBLE_DB_REPOS="0" \
AUTH_RATE_LIMIT_MAX_REQUESTS="200" \
  API_URL="http://localhost:${API_E2E_PORT}" \
SPA_URL="http://localhost:${SPA_E2E_PORT}" \
  npx playwright test --config playwright-spa.config.ts "${PLAYWRIGHT_TARGET_ARGS[@]}"

echo ""
echo "✅ E2E tests completed"
