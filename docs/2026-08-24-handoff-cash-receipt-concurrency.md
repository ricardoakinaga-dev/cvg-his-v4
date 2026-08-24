# Handoff — concorrência de cash receipt — 2026-08-24

## Estado para a próxima sessão

O segundo gate P0 do `CVG-002C6` foi fechado como **GREEN bounded**: duas
instâncias reais da API, PostgreSQL efêmero e duas requisições públicas
concorrentes do tenant A para o mesmo encounter produziram exatamente um
`201` e um `409` de domínio. O tenant B recebeu `404` sem efeitos financeiros,
de auditoria, outbox ou idempotência.

O teste novo é
[`../tests/integration/process/inpatient-cash-receipt-concurrency.test.ts`](../tests/integration/process/inpatient-cash-receipt-concurrency.test.ts).
A evidência completa está em
[`../.agent/artifacts/CVG-002C6-cash-receipt-concurrency-2026-08-24.md`](../.agent/artifacts/CVG-002C6-cash-receipt-concurrency-2026-08-24.md).

Não houve alteração de runtime de produção. O arquivo adicionado somente
exercita o entrypoint real por meio do fixture de processo já existente.

## Evidência principal

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=receipt_concurrency_lead_final \
pnpm exec vitest run tests/integration/process/inpatient-cash-receipt-concurrency.test.ts \
--config vitest.integration.config.ts --reporter=verbose --no-cache \
--no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000

PASS — 1 arquivo, 1 teste, exit 0, 41,02 s
```

A barreira de banco só libera a progressão quando `pg_locks` mostra o mesmo
advisory key com pelo menos um backend `granted`, um `waiting` e dois PIDs da
role da API. A reconciliação SQL exige um único receipt/payment/movement/journal,
duas lines balanceadas em `260`, receivable/account pagos, audit/outbox e
idempotência vencedora; o tenant B tem zero em todos esses grupos.

A revisão independente final retornou **APPROVE**, confiança alta, após rerun
da concorrência (`1/1`, 40,66 s) e da regressão SIGKILL (`1/1`, 60,08 s).

## Limites explícitos

- Os dois processos iniciam sequencialmente porque o bootstrap laboratorial
  atual pode colidir em `laboratory_equipment`; ambos ficam prontos e ativos
  antes da corrida HTTP. Startup simultâneo continua uma lacuna separada.
- A prova usa `NODE_ENV=test` e não promove boot production-like, Helm, worker,
  PIX/webhook, Redis, DR/RPO, RLS/FORCE RLS global, paridade, UX, operações ou
  release.
- O teste novo ainda não está no `test:critical`. A matriz processual do CI é o
  próximo P1; não transformar esta prova focal em aprovação global.

## Retomada

1. Ler este handoff, o artefato, o handoff SIGKILL, `.agent/state.json`,
   `.agent/backlog.json` e os últimos ledgers.
2. Medir e implementar um runner serializado para os testes processuais
   críticos, com banco efêmero por arquivo, timeout e cleanup explícitos.
3. Reexecutar `test:critical` e a suíte processual completa antes de qualquer
   promoção de release.
4. Manter `packages/design-system/tsconfig.vue.tsbuildinfo` fora do stage.
