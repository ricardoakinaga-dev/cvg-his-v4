#!/usr/bin/env bash
#
# Run SPA E2E tests with a reproducible Docker-based environment.
#
# Usage:
#   ./infra/scripts/run-e2e-spa.sh            # full run (build + test + cleanup)
#   ./infra/scripts/run-e2e-spa.sh --no-cleanup  # keep containers running after tests
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
CLEANUP=true

if [[ "${1:-}" == "--no-cleanup" ]]; then
  CLEANUP=false
fi

cleanup() {
  if [ "$CLEANUP" = true ]; then
    echo ""
    echo "🧹 Cleaning up E2E environment..."
    docker compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
  else
    echo ""
    echo "ℹ️  --no-cleanup: containers left running"
    echo "   To stop: docker compose -f $COMPOSE_FILE down -v"
  fi
}

trap cleanup EXIT

echo "🚀 Starting E2E environment..."

# 1. Start infrastructure
echo "   📦 Starting PostgreSQL + Redis + API..."
docker compose -f "$COMPOSE_FILE" up -d --build

# 2. Wait for API health
echo "   ⏳ Waiting for API health..."
MAX_RETRIES=60
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if curl -fsS http://localhost:3001/health >/dev/null 2>&1; then
    echo "   ✅ API is healthy"
    break
  fi
  RETRY=$((RETRY + 1))
  sleep 2
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "   ❌ API did not become healthy in time"
  docker compose -f "$COMPOSE_FILE" logs api-e2e
  exit 1
fi

# 3. Apply DB schema + seed
echo "   🗄️  Applying DB schema and seed..."
DATABASE_URL="postgres://postgres:postgres@localhost:5434/cvg_his_e2e" \
  node "$ROOT_DIR/infra/scripts/prepare-test-db.mjs" 2>/dev/null || {
    echo "   ⚠️  prepare-test-db.mjs failed, trying alternative..."
    # Fallback: run the bootstrap script
    node "$ROOT_DIR/infra/scripts/test-critical-bootstrap.mjs" 2>/dev/null || {
      echo "   ⚠️  DB setup scripts failed. Tests may fail if DB is not seeded."
      echo "   ℹ️  If you have a seeded DB already, tests may still pass."
    }
  }

# 4. Run E2E tests
echo ""
echo "🧪 Running SPA E2E tests..."
echo ""

cd "$ROOT_DIR"
E2E_AUTH_TOKEN="" \
E2E_ADMIN_EMAIL="admin@cvg.local" \
E2E_ADMIN_PASSWORD="Admin123!" \
API_URL="http://localhost:3001" \
SPA_URL="http://localhost:3002" \
  npx playwright test --config playwright-spa.config.ts

echo ""
echo "✅ E2E tests completed"
