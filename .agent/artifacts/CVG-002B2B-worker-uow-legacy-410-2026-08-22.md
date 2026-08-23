# CVG-002B2B — checkpoint worker UoW, retry/redrive e barreira legada

**Data:** 22 de agosto de 2026, 23:06 BRT
**Branch:** `agent/sync-v4-full-program`
**Base documental anterior:** `8eb3506`
**Estado:** implementação local verificada em fatias limitadas; `CVG-002B2B` permanece `IN_PROGRESS/PARTIAL`.

Este artefato registra o incremento executável que deve ser retomado pela próxima sessão. Ele não promove o ERP, o B2b completo ou qualquer provider para produção.

## Implementação

- `runInTenantTransactionContext` foi adicionado ao shared database. O helper valida conta/ator/correlation, reutiliza o mesmo `beginTenantTransaction`, `DatabaseTransactionScope`, client protegido e `AsyncLocalStorage` canônicos, e não consulta nem grava `idempotency_requests`.
- `DatabasePixProviderEventDeliveryRepository` removeu a cópia local de inbox/outbox/audit e usa o contexto shared na mesma conexão/transação para executar B1 e o CAS final `applied`.
- A resolução do principal permanece somente leitura: `account_service_principals` e colunas de identidade não secretas de `users`; nenhum `FOR UPDATE` foi reintroduzido.
- O consumer classifica explicitamente como retryable códigos transitórios de PostgreSQL (`40001`, `40P01`, conexões/lock contention) e transporte (`ECONNRESET`, `ETIMEDOUT`, `EAI_AGAIN`, `UND_ERR_*` permitidos), inclusive `cause` limitado. Integridade/divergência e erros desconhecidos continuam fail-closed/terminal.
- `redrive` é uma ação explícita do operador: só aceita `reconciliation_required`, reinicia tentativas de forma bounded, limpa lease/erro, agenda novo claim e grava `pix_settlement_redrive` em `audit_events` na mesma transação. A repetição após sair do estado terminal é no-op.
- A role worker foi exercitada de fato com `SET ROLE`: a query de resolução do principal retorna apenas as colunas permitidas sob `app.current_account_id`, enquanto `password_hash` é negado.
- `/payments/pix/intents/:intentId/confirm` continua autenticando API key, mas retorna `410 LEGACY_PIX_CONFIRMATION_DISABLED` antes do gateway e antes de `payment.pix.confirmed` quando `pix_transactions.payment_attempt_id` está preenchido. PIX direto/legado sem esse vínculo conserva o caminho anterior. O OpenAPI foi alinhado.

## Evidência fresca

| Escopo | Resultado |
| --- | ---: |
| shared context unit | 3/3 |
| worker package (runner/bootstrap/account/scheduled/consumer) | 48/48 |
| PostgreSQL worker consumer | 5/5 — claim/takeover, retry, stale fence, redrive auditado e contexto canonical |
| runtime ACL/RLS | 8/8 — 7 unit + 1 integração, incluindo query real sob role worker |
| API route focused | 3/3, incluindo 410 sem gateway/evento |
| PIX repository unit | 5/5 |
| OpenAPI | 335 paths / 386 schemas; structural validation PASS |
| API/worker/shared typecheck-lint-build | PASS |
| `git diff --check` | PASS |

Comandos principais:

```bash
node --test packages/shared/database/dist/tenant-transaction-context.test.js
pnpm --filter @cvg-his-v2/worker test
pnpm exec vitest run tests/integration/database/pix-provider-settlement-consumer.test.ts \
  --config vitest.integration.config.ts --reporter=verbose
pnpm exec vitest run tests/integration/rls/runtime-role-sensitive-acl.test.ts \
  --config vitest.integration.config.ts --reporter=verbose
NODE_ENV=test pnpm --filter @cvg-his-v2/api exec node --test dist/routes/payments-routes.test.js
pnpm exec vitest run tests/unit/api/pix-transaction-repository-database.test.ts \
  --config vitest.unit.config.ts --reporter=verbose
pnpm validate:openapi
```

## Limites preservados

- A prova de takeover usa lease expirado em PostgreSQL; ainda falta um cenário de processo morto/restart real após cada checkpoint de B1 e uma matriz completa multi-pool/multi-worker.
- `redrive` é um primitive interno auditado, não um endpoint de operação nem um DLQ completo com observabilidade/runbook.
- O código usa somente `local-pix` sintético; provider real, credenciais, homologação fiscal, deploy e go-live exigem autorização humana.
- B2c/SPA/E2E, estoque/laboratório/internação ponta a ponta, paridade Vetus (`11/11 + 3/3`), WCAG, performance e certificação operacional continuam fora deste checkpoint.
- O cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo` continua deliberadamente fora do commit.

## Retomada

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

Próximo gap local: completar restart/crash e observabilidade do worker, ampliar a barreira legada para a integração HTTP/PostgreSQL, executar regressões B1/B2a/ingress/HTTP completas e só então reavaliar o gate `VERIFIED`. Não declarar o objetivo amplo do ERP concluído.
