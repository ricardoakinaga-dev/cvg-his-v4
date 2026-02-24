#!/usr/bin/env bash
set -euo pipefail

WEB_BASE_URL="${WEB_BASE_URL:-http://localhost:3001}"
TOKEN="${TOKEN:-}"
ACCOUNT_ID="${ACCOUNT_ID:-}"
ROLE="${ROLE:-}"
WARD_ID="${WARD_ID:-}"

if [[ -z "${TOKEN}" || -z "${ACCOUNT_ID}" || -z "${ROLE}" ]]; then
  echo "Usage:"
  echo "  TOKEN=... ACCOUNT_ID=... ROLE=vet WEB_BASE_URL=http://localhost:3001 $0"
  echo "Optional:"
  echo "  WARD_ID=<uuid> (if omitted, script fetches the first ward)"
  exit 1
fi

WEB_BASE_URL="${WEB_BASE_URL%/}"
COMMON_HEADERS=(
  -H "Authorization: Bearer ${TOKEN}"
  -H "x-account-id: ${ACCOUNT_ID}"
  -H "x-role: ${ROLE}"
  -H "Accept: application/json"
)

echo "[1/2] Checking proxy wards endpoint via same-origin route..."
if [[ -z "${WARD_ID}" ]]; then
  WARDS_JSON="$(curl -fsS "${WEB_BASE_URL}/api/proxy/wards?page=1&pageSize=1" "${COMMON_HEADERS[@]}")"
  WARD_ID="$(printf '%s' "${WARDS_JSON}" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{const j=JSON.parse(b);const id=j?.data?.[0]?.id||'';if(!id){process.exit(1);}process.stdout.write(id);});")" || {
    echo "Failed to resolve wardId from /api/proxy/wards response."
    exit 1
  }
fi

echo "wardId=${WARD_ID}"
echo "[2/2] Checking proxy bed map endpoint via same-origin route..."
BEDMAP_JSON="$(curl -fsS "${WEB_BASE_URL}/api/proxy/beds/map?wardId=${WARD_ID}" "${COMMON_HEADERS[@]}")"
echo "${BEDMAP_JSON}" | node -e "let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>{const j=JSON.parse(b);const wards=Array.isArray(j?.wards)?j.wards.length:0;console.log(`OK: bed map response received (wards=${wards}).`);});"

echo "Proxy smoke test passed."
