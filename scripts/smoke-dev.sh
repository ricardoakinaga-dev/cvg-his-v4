#!/bin/bash
# scripts/smoke-dev.sh
# Ping the dev server backend directly and through the proxy

echo "🚀 Iniciando Smoke Tests (Modo DEV)"

# Ping Backend Direto
echo "1. Backend (his-api) Direto..."
curl -s -f "http://localhost:3000/ping" > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Backend responde"
else
  echo "❌ Backend FALHOU. O his-api está rodando?"
  exit 1
fi

# Ping Proxy Frontend
echo "2. Frontend Proxy (his-web)..."
curl -s -f "http://localhost:3001/api/backend/ping" > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Proxy responde"
else
  echo "❌ Proxy FALHOU. O his-web está rodando?"
  exit 1
fi

echo "🎉 Tudo verde!"
