# Handoff — cash receipt SIGKILL/restart/replay — 2026-08-24

## Estado para a próxima sessão

O próximo gate P0 do `CVG-002C6` foi executado como uma prova bounded GREEN.
O teste inicia o entrypoint real da API em um processo filho, usa PostgreSQL
efêmero com roles `LOGIN NOSUPERUSER NOBYPASSRLS`, prepara a jornada pública
`admission → handoff/ack → inventory consumption → daily billing → discharge →
close → cash receipt` e envia `SIGKILL` enquanto a transação de recebimento está
pausada no banco.

Não houve correção de runtime de produção nesta fatia. Foram adicionados apenas
o launcher de teste e a prova processual:

- `apps/api/test-fixtures/api-process.ts` — delega ao entrypoint real sob
  `API_PROCESS_FIXTURE=1` e `NODE_ENV=test`;
- `tests/integration/process/inpatient-cash-receipt-sigkill.test.ts` — failpoint
  PostgreSQL, rollback, restart, replay, conflito divergente e tenant boundary;
- `.agent/artifacts/CVG-002C6-cash-receipt-sigkill-2026-08-24.md` — evidência
  RED/GREEN, limites e revisão independente.

Implementação publicada no commit
`7aeb81d4081e84080fc6cf83759a193dd04a27dd`, já reconciliado com
`origin/agent/sync-v4-full-program`.

## Evidência reproduzida

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=receipt_kill_green6 \
pnpm exec vitest run tests/integration/process/inpatient-cash-receipt-sigkill.test.ts \
  --config vitest.integration.config.ts --reporter=verbose --no-cache \
  --no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000

PASS — 1 arquivo, 1 teste, 60,95 s
```

Também houve uma rerun independente em `receipt_kill_green5` com 1/1 PASS em
81,96 s. Prettier e ESLint focados passaram. A revisão independente foi
`APPROVE bounded`, sem CRITICAL/HIGH.

## O que a prova garante

Após o `SIGKILL`, a consulta SQL exige zero receipt, payment, cash movement,
journal entry/lines, audit, outbox, idempotency, receivable e financial account;
o billing permanece `open`. Depois do restart, a mesma chave produz exatamente
um grafo completo, billing `settled`, receivable/account pagos e journal
balanceado em `260`. Payload divergente retorna `409 IDEMPOTENCY_CONFLICT`; o
bearer do tenant B recebe `404` ao apontar para o encounter/register de A.

O teste confirma PID distinto no restart e remove o trigger somente depois de
matar o processo em cleanup. A chave de idempotência persistida pelo dispatcher
é `POST /encounters/{encounterId}/cash-receipts`.

## Limites e próxima ação

Este é um gate bounded, não uma aprovação do ERP nem de produção. O processo usa
`NODE_ENV=test`; o boot production-like, Helm render, worker delivery,
PIX/webhooks, RLS/FORCE RLS global, DR/RPO, paridade Vetus, SPA/WCAG, operações e
release continuam `IN_PROGRESS/PARTIAL`.

Na retomada:

1. Ler este handoff, o artefato, `.agent/state.json`, `.agent/backlog.json` e
   `.agent/verification.jsonl` antes de editar.
2. Em runner autorizado com Helm, executar `helm lint`/`helm template` para
   dev/staging/prod e provisionar os Secrets de `WORKER_ACCOUNT_IDS` sem gravar
   IDs no Git.
3. Expandir a matriz de failpoints admission→receipt (discharge/close/receipt),
   concorrência e takeover; depois atacar PIX PostgreSQL/RLS e webhook
   retry/DLQ/lease fencing.
4. Manter o cache do usuário
   `packages/design-system/tsconfig.vue.tsbuildinfo` fora do stage.
