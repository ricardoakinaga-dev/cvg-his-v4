# CVG-002C6 — SIGKILL de recebimento em dinheiro (2026-08-24)

## Gate

**GREEN bounded / não promover produção.** A prova executa a jornada pública
`admission → handoff/ack → inventory consumption → daily billing → discharge
→ close → cash receipt` contra PostgreSQL efêmero e mata o processo filho da
API durante o comando de recebimento.

O processo filho executa o entrypoint real `apps/api/src/index.ts` via o
launcher exclusivamente de teste `apps/api/test-fixtures/api-process.ts`, com
uma role LOGIN `NOSUPERUSER NOBYPASSRLS`. A role do teste é reconciliada antes
do boot; ela não recebe privilégios de superusuário ou bypass de RLS.

## RED

O novo cenário foi primeiro executado contra o entrypoint em `NODE_ENV=staging`.
O boot falhou fechado com `Unsafe PostgreSQL runtime role`: a inspeção de role
production-like depende de `POSTGRES_API_USER` no processo e não aceita a role
aleatória do fixture sem a configuração correspondente. Esse é um limite do
harness de startup, já coberto pelo gate dedicado de bootstrap production-like;
o cenário de domínio foi então mantido em `NODE_ENV=test`, sem diminuir a role
PostgreSQL restrita.

Durante a implementação do RED, também foram corrigidas duas expectativas do
harness, sem alterar código de produção: `/health` publica `persistenceMode`
na raiz do payload e o dispatcher persiste a idempotência do receipt com a
operação HTTP canônica `POST /encounters/:id/cash-receipts`.

## GREEN e mecanismo do failpoint

O teste cria dinamicamente, apenas no banco descartável, um trigger `AFTER
INSERT` em `encounter_cash_receipts`. O trigger toma
`pg_advisory_lock(hashtextextended('cvg-cash-receipt-pause', 0))` e pausa. O
teste observa esse lock em `pg_locks`/`pg_stat_activity`, envia `SIGKILL` ao PID
que possui o servidor HTTP e só então remove o trigger. Isso evita depender de
`NOTIFY`, que somente seria entregue no commit.

Antes do restart, o teste exige ausência de residue para o request key:

- receipt, receivable payment, cash movement, journal entry e suas duas lines;
- audit event, outbox event e idempotency request;
- receivable/account liquidados.

O billing continua `open`. Após reiniciar a API e repetir a mesma key, o teste
exige um único receipt/payment/movement/journal/outbox/audit, duas journal
lines balanceadas em `260`, billing liquidado e idempotência completed. Um
payload divergente retorna `409 IDEMPOTENCY_CONFLICT`; bearer do tenant B
recebe `404` e não cria efeito adicional.

## Evidência fresca

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=receipt_kill_green6 \
pnpm exec vitest run tests/integration/process/inpatient-cash-receipt-sigkill.test.ts \
  --config vitest.integration.config.ts --reporter=verbose --no-cache \
  --no-file-parallelism

PASS — 1 arquivo, 1 teste, 60.95s
```

Uma rerun independente no banco descartável `cvg_his_v2_test_receipt_kill_green5`
também passou 1/1 em 81,96 s. A revisão read-only retornou **APPROVE bounded**
sem CRITICAL/HIGH; o teste foi endurecido com PID distinto no restart, cleanup
que mata o processo antes de remover o trigger e contagens explícitas de
`encounter_receivables`/`encounter_financial_accounts`.

## Limites

- É um único failpoint de receipt; não certifica a matriz por escrita de
  admission, handoff, inventory, daily billing, discharge ou close.
- O processo é o entrypoint real, mas usa `NODE_ENV=test`; o fail-closed
  production-like possui prova separada e não é reprovado por este cenário.
- Não cobre worker delivery/takeover, provider PIX/webhook, Redis, Helm, RLS
  global/FORCE RLS, SPA, paridade, operações ou release.
- O teste ainda é focal e não foi incluído em `test:critical`; o boot
  production-like e o render Helm permanecem gates separados e não são
  promovidos por esta evidência.
