# CVG-002C6 — concorrência de recebimento em duas APIs (2026-08-24)

## Gate e barra congelada

**GREEN bounded / não promover produção.** Esta rodada fecha apenas a corrida
HTTP do recebimento em duas instâncias reais da API. A barra congelada exigia:

- `QB-REC-RACE-01`: duas requisições públicas do tenant A, com chaves distintas,
  devem retornar exatamente um `201` e um `409` de domínio, sem `500`;
- `QB-REC-RACE-02`: tenant B recebe `404` e deixa zero resíduo financeiro ou
  de idempotência; tenant A deixa um único grafo balanceado;
- `QB-REC-RACE-03`: PostgreSQL efêmero, roles restritas, entrypoint real,
  barreira determinística e cleanup seguro;
- `QB-REC-REG-01`: a prova SIGKILL/restart/replay existente continua verde.

## RED e correção do harness

Antes do arquivo, o caminho não existia:

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=receipt_concurrency_red0 \
pnpm exec vitest run tests/integration/process/inpatient-cash-receipt-concurrency.test.ts \
--config vitest.integration.config.ts --reporter=verbose --no-cache \
--no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000

No test files found, exit 1
```

A primeira versão disparava duas requisições, mas a crítica independente
rejeitou a barreira: observar um único lock concedido não provava que o segundo
backend estivesse aguardando. O harness foi corrigido sem alterar produção:

- trigger dinâmico em `idempotency_requests`, antes do lock de billing;
- `pg_advisory_xact_lock(hashtextextended(...))` com pausa curta;
- consulta agrupada por `(classid, objid, objsubid)` em `pg_locks`, exigindo
  simultaneamente ao menos um lock `granted`, um `waiting` e dois PIDs do
  `apiRole`;
- no-residue do tenant B ampliado para receipts, payments, movements, journal
  entries/lines, receivables, financial accounts, audit, outbox e idempotência.

Uma execução adversarial com o trigger antigo em `encounter_cash_receipts`
falhou na nova asserção (`API processes did not contend on the same receipt
concurrency advisory lock`, exit 1), demonstrando que a barreira distingue o
caso não concorrente.

## Evidência GREEN

Execução do Lead em banco descartável novo:

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=receipt_concurrency_lead_final \
pnpm exec vitest run tests/integration/process/inpatient-cash-receipt-concurrency.test.ts \
--config vitest.integration.config.ts --reporter=verbose --no-cache \
--no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000

PASS — 1 arquivo, 1 teste, exit 0, 41.02s
```

Reruns adicionais do Builder passaram em `receipt_concurrency_barrier_green1`
(`1/1`, 45,35 s), `barrier_green2` (`1/1`, 45,42 s) e `barrier_green3`
(`1/1`, 40,61 s). O isolamento final passou em
`receipt_concurrency_isolation_green1` (`1/1`, 40,45 s).

As asserções observadas incluem:

- dois PIDs reais da API, ambos prontos e ativos durante a corrida;
- respostas exatamente `[201, 409]`, com código de conflito de domínio;
- um receipt/payment/cash movement/journal entry, duas lines balanceadas,
  audit, outbox, receivable e financial account liquidados no tenant A;
- débito e crédito iguais a `260`;
- tenant B `404` e zero dos dez grupos de efeitos verificados;
- cleanup de processos, trigger, função, roles e banco efêmero.

Regressão independente do SIGKILL existente:

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=receipt_concurrency_regression \
pnpm exec vitest run tests/integration/process/inpatient-cash-receipt-sigkill.test.ts \
--config vitest.integration.config.ts --reporter=verbose --no-cache \
--no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000

PASS — 1 arquivo, 1 teste, exit 0, 61.96s
```

Checks complementares: Prettier, ESLint focado, `pnpm security:secrets`,
`pnpm typecheck` (70/70 projetos scoped) e `git diff --check` passaram.

## Crítica independente

Uma crítica read-only nova, após a correção da barreira e do oráculo B, retornou
**APPROVE** com confiança alta. Ela confirmou os quatro critérios congelados e
reexecutou a concorrência (`1/1`, exit 0, 40,66 s) e o SIGKILL (`1/1`, exit 0,
60,08 s) em bancos efêmeros distintos.

## Limites e próxima ação

- Os processos são iniciados sequencialmente porque o bootstrap laboratorial
  atual pode colidir em `laboratory_equipment`; ambos ficam prontos antes da
  corrida HTTP. Isso é uma lacuna de inicialização horizontal, não uma
  aprovação de startup simultâneo.
- A prova usa `NODE_ENV=test`; não cobre boot production-like, Helm render,
  worker delivery, PIX/webhook, Redis, DR/RPO, RLS/FORCE RLS global, paridade,
  UX, operações, coverage ou release.
- O novo teste ainda não está incluído em `test:critical`; promover a matriz
  processual ao CI é o próximo P1, depois de medir serialização, timeout e
  isolamento de banco.

Nenhuma alteração de runtime de produção foi necessária nesta rodada.
