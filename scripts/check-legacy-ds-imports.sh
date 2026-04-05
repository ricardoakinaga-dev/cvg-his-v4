#!/usr/bin/env bash
# Guardrail: prevents legacy design-system internal imports from reappearing.
# Legacy pattern: @cvg-his-v2/design-system/src/vue/...
# Public pattern:  @cvg-his-v2/design-system/vue/...

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PATTERN='@cvg-his-v2/design-system/src/vue/'

FOUND=$(grep -rl "$PATTERN" "$ROOT/apps/spa/src" --include="*.vue" --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null || true)

if [ -n "$FOUND" ]; then
  echo "ERROR: Legacy design-system imports detected:"
  echo "$FOUND"
  echo ""
  echo "Replace '$PATTERN'"
  echo "with      '@cvg-his-v2/design-system/vue/'"
  exit 1
fi

echo "OK: No legacy design-system imports found."
exit 0
