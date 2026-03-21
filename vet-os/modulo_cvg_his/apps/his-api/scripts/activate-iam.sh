#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/../../.."; pwd)}"
LOG_DIR="$REPO_ROOT/logs/activation-iam"
LOG="$LOG_DIR/activation-iam.log"
REPORT="$REPO_ROOT/memory/activation-iam-report-$(date +%Y-%m-%d).md"
PRECHECK_LOG="$LOG_DIR/preflight-$(date +%H%M%S).log"
ACTIVATION_STATUS="PENDING"
ACTIVATION_NOTE="Script iniciado."

mkdir -p "$LOG_DIR"
mkdir -p "$REPO_ROOT/memory"
exec > >(tee -a "$LOG") 2>&1

write_report() {
cat > "$REPORT" <<MD
# Relatório de Ativação IAM - Fase 11

Data: $(date -u)
Status: $ACTIVATION_STATUS
Admin inicial: ${ADMIN_EMAIL:-<nao-informado>}
Checklist curto: docs/iam/11-checklist-operacional-ativacao-iam.md
Checklist completo: docs/iam/10-rollout-checklist.md

Preflight:
- executado via \`corepack pnpm iam:preflight\`
- log: $PRECHECK_LOG

Etapas aplicadas:
- migração do banco (\`db:migrate\`) executada somente apos preflight aprovado
- seed do admin (\`db:seed\`) exige \`ADMIN_EMAIL\` e \`ADMIN_PASSWORD\` explicitos
- sem defaults inseguros para bootstrap
- sem subida automática de serviços

Resumo:
- $ACTIVATION_NOTE

Próximos passos recomendados:
- iniciar frontend/backend se ainda não estiverem rodando;
- validar login com o admin inicial;
- executar \`corepack pnpm iam:smoke\` com sessão autenticada;
- registrar evidências usando \`docs/operacional/IAM_ACTIVATION_REPORT_TEMPLATE.md\`.

Observação: o script não inicia serviços automaticamente; ele apenas aplica preflight, migrate e seed com logging controlado.
MD
}

trap write_report EXIT

echo "[${UTC_NOW:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}] IAM Activation Script started"

ENV_FILE="$REPO_ROOT/.env";
if [ -f "$ENV_FILE" ]; then
  echo "Carregando variáveis de ambiente de $ENV_FILE";
  set -a; . "$ENV_FILE"; set +a
fi

echo "### Preflight IAM ###";
if ! corepack pnpm iam:preflight | tee "$PRECHECK_LOG"; then
  echo "Preflight falhou. Corrija as variáveis obrigatórias antes de continuar.";
  ACTIVATION_STATUS="BLOCKED_PRECHECK"
  ACTIVATION_NOTE="Preflight bloqueou a ativação por env ausente ou inválida."
  exit 1
fi

if [ -z "${ADMIN_EMAIL:-}" ]; then
  echo "ADMIN_EMAIL não definida. Abortei para evitar bootstrap inseguro.";
  ACTIVATION_STATUS="BLOCKED_ADMIN_EMAIL"
  ACTIVATION_NOTE="ADMIN_EMAIL ausente."
  exit 1
fi

if [ -z "${ADMIN_PASSWORD:-}" ]; then
  echo "ADMIN_PASSWORD não definida. Abortei para evitar bootstrap inseguro.";
  ACTIVATION_STATUS="BLOCKED_ADMIN_PASSWORD"
  ACTIVATION_NOTE="ADMIN_PASSWORD ausente."
  exit 1
fi

if ! node --import tsx --eval "import { validateAdminBootstrapEnv } from './apps/his-api/src/lib/iamOps.ts'; const issues = validateAdminBootstrapEnv(process.env); if (issues.length > 0) { for (const issue of issues) { console.error(issue.message); if (issue.hint) console.error('acao: ' + issue.hint); } process.exit(1); }"; then
  echo "Credenciais de bootstrap inválidas. Abortei antes do seed.";
  ACTIVATION_STATUS="BLOCKED_ADMIN_CREDENTIALS"
  ACTIVATION_NOTE="ADMIN_EMAIL ou ADMIN_PASSWORD inválidos para bootstrap."
  exit 1
fi

echo "### Migração do Banco (db:migrate) ###";
corepack pnpm db:migrate || { echo "Migration falhou"; ACTIVATION_STATUS="FAILED_MIGRATE"; ACTIVATION_NOTE="db:migrate falhou."; exit 1; }

echo "### Seed Admin ($ADMIN_EMAIL) ###";
ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" corepack pnpm db:seed || { echo "Seed falhou"; ACTIVATION_STATUS="FAILED_SEED"; ACTIVATION_NOTE="db:seed falhou."; exit 1; }

ACTIVATION_STATUS="APPLIED"
ACTIVATION_NOTE="Preflight, migration e seed concluídos com sucesso."

echo "### Validações recomendadas ###";
echo "1) Acesse ${IAM_SMOKE_BASE_URL:-http://localhost:3001}/login e faça login com $ADMIN_EMAIL.";
echo "2) Após login, rode corepack pnpm iam:smoke com IAM_SMOKE_COOKIE, IAM_SMOKE_BEARER_TOKEN ou IAM_SMOKE_AUTH_HEADER.";
echo "3) Confirme /auth/me com accountId/roles/permissions/sessionId.";
echo "4) Verifique /api/proxy/admin/iam/users e /roles com sessão autenticada.";
echo "5) Registre as evidências usando docs/operacional/IAM_ACTIVATION_REPORT_TEMPLATE.md.";

 echo "IAM Activation report gerado em: $REPORT";
 echo "[DONE]"
