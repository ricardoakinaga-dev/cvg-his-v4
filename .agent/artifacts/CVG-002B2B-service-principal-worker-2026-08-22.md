# CVG-002B2B — principal de serviço, ACL/RLS e consumer PIX

**Data do checkpoint:** 22 de agosto de 2026, 22:38 BRT
**Branch:** `agent/sync-v4-full-program`
**Estado:** implementação local publicada como checkpoint, mas `CVG-002B2B` continua `IN_PROGRESS/PARTIAL`.

Este artefato registra exatamente o que foi implementado depois do checkpoint HTTP/OpenAPI `705052b`. Ele é a referência curta para retomar o trabalho sem reconstruir o contexto. Não é uma declaração de prontidão de produção nem de paridade Vetus.

## Implementado

### Prova HTTP → PostgreSQL

- `tests/integration/pix-provider-webhook-postgres.test.ts` usa um servidor `node:http`, uma conexão HTTP e uma segunda conexão PostgreSQL.
- A resposta `202 {"accepted":true}` só ocorre depois de `pix_provider_events` e `pix_provider_event_deliveries` estarem visíveis na segunda conexão.
- O failpoint `after_receipt_insert` retorna `503` e confirma rollback sem receipt/delivery parcial.
- Evidência: 2/2 testes.

### Principal de serviço PIX e schema

- `packages/db/migrations/0112_pix_service_principals.sql` adiciona `principal_kind` e `interactive_login_enabled` em `users`, faz backfill explícito, aplica `NOT NULL`/defaults/checks e `FORCE ROW LEVEL SECURITY`.
- `account_service_principals` é tenant-local, purpose-scoped (`pix-settlement`), tem FK composta `(account_id,user_id)`, `ON DELETE RESTRICT`, unicidade parcial de mapping ativo e nenhuma criação automática.
- O schema Drizzle está em `packages/db/src/schema/account_service_principals.ts` e exportado pelo índice.
- Evidência: schema unitário 3/3; integração PostgreSQL 5/5, migrations 0000→0112 e 171 tabelas/43 enums/452 FKs.
- Limitação honesta: o teste de backfill não força ainda uma linha legada pré-0112; quando o seed não cria usuários, a asserção de existentes pode ser vacuamente verdadeira.

### Exclusão de principal interativo

- `module-users` persiste/hidrata os metadados e mantém índices de login somente para humanos ativos e interativos.
- `module-auth` revalida o predicado nas fronteiras de login, sessão, refresh, bearer sync e MFA; o repository de sessão também rejeita sessões cujo usuário deixou de satisfazer o predicado.
- `findById`/`findByAccountId` continuam gerais para fluxos administrativos; isso não transforma essas leituras em entradas de autenticação.
- Evidência: novo guard 7/7, users 13/13, auth 30/30 e typecheck de users/auth verdes.
- Limitação: um chamador externo que invoque diretamente o adaptador `SessionRepository.create` ainda pode gravar uma sessão órfã; ela não é legível/rotacionável e o caminho real de criação está protegido pelo `AuthService`.

### ACL/RLS runtime

- API recebe somente as mutações sensíveis necessárias em `users`, `sessions`, MFA e desafios; mapping de principal não é exposto à API.
- Worker recebe `SELECT` no mapping e apenas as colunas não secretas de `users`: `id`, `account_id`, `is_active`, `principal_kind`, `interactive_login_enabled`.
- Reconciler, init shell e ConfigMap Helm revogam o CRUD amplo depois do grant genérico, removem memberships herdadas, aplicam `NOINHERIT` e repetem a matriz em reruns.
- Evidência: unitário 7/7 e integração 1/1; reconciliação dupla, role herdada adversarial, `GRANT SELECT (columns)`, `FORCE RLS` e `sh -n` passaram.
- Correção importante: o consumer não usa `FOR UPDATE` em `users`/mapping, pois o worker é read-only e PostgreSQL exige `UPDATE` para row locks. A resolução do principal é read-only, tenant-local e revalidada dentro da transação; não há privilégio extra concedido para contornar a ACL.

### Claim/fence/backoff e consumer B1

- `apps/worker/src/jobs/pix-provider-event-delivery-repository.ts` implementa claim com `FOR UPDATE SKIP LOCKED`, lease owner/token/version/expiry, CAS de aplicação, terminalização e retry.
- `apps/worker/src/jobs/pix-provider-settlement-consumer.ts` usa somente `ConfirmedPixSettlementCommand`/`DatabaseConfirmedPixSettlementRepository` como executor padrão; capability sintética é explícita e o runtime é default-off.
- Leituras de attempt/PIX anteriores ao B1 são não bloqueantes; o B1 continua dono da ordem authoritative `billing → PIX → attempt`.
- `pending_dispatch` sem `provider_transaction_id` vira `PIX_NOT_CORRELATED` retryable; códigos de principal/correlação são os únicos retryables allowlisted no consumer atual, com backoff 5s exponencial limitado a 900s.
- Evidência: consumer unitário 6/6; worker completo 47/47 (runner, bootstrap, discovery, scheduled e consumer); integração PostgreSQL 3/3 cobrindo claim concorrente, ausência de principal, correlação ausente, `idempotency_requests` inalterado e fence stale; build/lint/typecheck verdes.

## Como retomar

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

Regressões focadas já executadas neste checkpoint:

```bash
REQUIRE_TEST_DB=1 pnpm exec vitest run \
  tests/integration/pix-provider-webhook-postgres.test.ts \
  --config vitest.integration.config.ts --reporter=dot

REQUIRE_TEST_DB=1 pnpm exec vitest run \
  tests/integration/database/pix-service-principals.test.ts \
  tests/integration/database/pix-provider-settlement-consumer.test.ts \
  tests/integration/rls/runtime-role-sensitive-acl.test.ts \
  --config vitest.integration.config.ts --reporter=dot

pnpm exec tsx --test apps/worker/src/jobs/pix-provider-settlement-consumer.test.ts
pnpm --filter @cvg-his-v2/worker test
```

O cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo` permanece fora do escopo e não deve ser revertido, apagado ou staged.

## Gaps obrigatórios antes de `VERIFIED`

1. Extrair um helper/UoW compartilhado do worker, em vez de manter o contexto transacional local duplicado, e provar que nenhum caminho usa `idempotency_requests`.
2. Adicionar teste executando a query real do principal sob a role worker read-only, além da matriz de privilégios já validada.
3. Classificar falhas transitórias de PostgreSQL/transporte com retry policy explícita; hoje erros desconhecidos terminalizam por fail-closed.
4. Provar restart/takeover, lease expiry, concorrência multi-processo, redrive/DLQ, rollback integral e observabilidade sem vazamento de payload/segredo.
5. Implementar a barreira legada `410` e confirmar que nenhum B2 alcança o settlement antigo.
6. Completar jornada clínica-financeira, SPA/E2E, card/estoque, paridade Vetus, WCAG, performance, deploy/restore e homologação de provider real.

## Estado de decisão

- O slice está suficientemente evidenciado para ser salvo e retomado.
- Não promover `CVG-002B2B`, `CVG-002`, `QB-CORE-01`, `QB-PARITY-01` ou prontidão de produção.
- Próxima maior lacuna local: helper transacional compartilhado + role worker real + restart/takeover/410; depois seguir para a jornada clínica-financeira e paridade Vetus.
