# CVG-002C2 — recibo de caixa HTTP na fronteira de UoW

## Escopo

Esta fatia fecha a prova pública de `POST /encounters/:encounterId/cash-receipts`
até PostgreSQL. Ela não certifica a jornada clínica completa de admissão até
recebimento, nem SPA, paridade Vetus, WCAG, provedores, operações alvo ou
release.

## RED → GREEN

O RED de rota foi adicionado em
`apps/api/src/routes/encounter-cash-receipt-routes.test.ts`: o POST executava o
comando diretamente, sem chamar o `runCommand` injetado. A execução inicial
falhou com `runnerCalls 0 !== 1`.

Durante o GREEN, a integração HTTP real também encontrou uma falha de
serialização na fronteira de idempotência: `response-buffer.snapshot()` emitia
`statusMessage: undefined`, que o canonicalizador JSON rejeitava. O RED em
`apps/api/src/helpers/response-buffer.test.ts` capturou esse caso (`statusMessage`
precisava ser omitido), e o snapshot agora só inclui o campo quando definido.

Implementação final:

- `EncounterCashReceiptRouteHandlers` aceita `runCommand?: TenantCommandRunner`;
- o servidor injeta `runTenantCommand` na rota;
- o POST normaliza o `Idempotency-Key`, passa a operação
  `encounter.cash-receipt.create` e um payload JSON-safe ao runner, mantendo o
  comando financeiro dentro da fronteira de tenant;
- quando a rota é chamada isoladamente por testes legados, o fallback direto
  continua disponível para os mocks que não fornecem runner;
- o wrapper global de mutações HTTP continua sendo a autoridade da UoW e da
  idempotência por operação HTTP; o runner da rota passa por essa UoW já ativa
  sem abrir uma transação aninhada.

## Evidência executável

Commit de implementação: `3e278c8` (`fix: wire cash receipts through tenant commands`).

```text
pnpm exec tsx --test apps/api/src/routes/encounter-cash-receipt-routes.test.ts
  8/8
pnpm exec tsx --test apps/api/src/helpers/response-buffer.test.ts
  2/2
rota + response-buffer combinados
  10/10
pnpm exec vitest run tests/unit/http-command-helpers.test.ts --reporter=verbose
  6/6
REQUIRE_TEST_DB=1 TEST_DB_SUFFIX=cash_receipt_command_regression \
  pnpm exec vitest run tests/integration/database/encounter-cash-receipt-command.test.ts \
  --config vitest.integration.config.ts --reporter=verbose
  8/8
REQUIRE_TEST_DB=1 TEST_DB_SUFFIX=cash_receipt_http_postgres \
  pnpm exec vitest run tests/integration/database/encounter-cash-receipt-http-postgres.test.ts \
  --config vitest.integration.config.ts --reporter=verbose
  1/1
pnpm --filter @cvg-his-v2/api run typecheck
  PASS
git diff --check
  PASS
```

O teste PostgreSQL cria um tenant/conta/usuário descartáveis, autentica pelo
endpoint publicado, executa primeiro POST, replay do mesmo idempotency key e
conflito com payload divergente. A consulta final confirmou exatamente um
recibo, pagamento, movimento de caixa, lançamento contábil, auditoria,
outbox e linha de idempotência concluída, com o billing `settled`. O banco
efêmero é removido pelo teardown global; não há limpeza destrutiva de tabelas
append-only no teste.

## Revisão independente e limites

A crítica independente posterior classificou a fatia como **APPROVE**, sem P0
ou P1. Ela confirmou a injeção do runner, a composição do servidor, o wrapper
global de UoW/idempotência, a passagem segura do runner aninhado e a prova
HTTP/PostgreSQL de commit/replay/conflito.

Permanece um **P2**: a nova prova HTTP ainda não contém um segundo tenant com
token próprio tentando ler ou criar recibo sobre o encounter do primeiro. A
camada RLS/repository já possui prova de isolamento, mas a matriz HTTP A/B deve
ser adicionada no próximo incremento da jornada.

## Estado honesto

`CVG-002C2`, `CVG-002B2B`, `CVG-002` e o ERP permanecem
`IN_PROGRESS/PARTIAL`. Esta evidência não promove produção, provider,
paridade Vetus, WCAG, failover Redis entre processos, cobertura global,
operações alvo ou release. O próximo trabalho continua sendo a jornada
admissão → handoff/permanência → estoque → alta → billing → recebimento/
ledger/auditoria/outbox, com replay, concorrência, dois tenants e RLS.

## Atualização — matriz HTTP cross-tenant (23/08/2026, 07:20 BRT)

O P2 da crítica independente foi fechado no commit
`0e0163c` (`test: prove cash receipt tenant isolation`). A integração agora
semeia um segundo tenant/usuário, autentica um segundo token e exerce:

- `GET /encounters/:encounterId/cash-receipts` do tenant A usando o token B,
  retornando `404 CASH_RECEIPT_NOT_FOUND`;
- `POST /encounters/:encounterId/cash-receipts` do encounter A usando o token
  B e headers do tenant B, retornando `404 BILLING_RECORD_NOT_FOUND`;
- consulta SQL confirmando zero recibos e zero linha de idempotência persistida
  para o tenant B.

Evidência fresca:

```text
REQUIRE_TEST_DB=1 TEST_DB_SUFFIX=cash_receipt_http_cross_tenant \
  pnpm exec vitest run tests/integration/database/encounter-cash-receipt-http-postgres.test.ts \
  --config vitest.integration.config.ts --reporter=verbose
  2/2
rota + response-buffer: 10/10
API typecheck: PASS
git diff --check: PASS
```

O `HTTP_OPERATION` consultado no SQL é a operação da UoW externa
(`POST /encounters/.../cash-receipts`); a operação semântica aninhada
`encounter.cash-receipt.create` passa em modo pass-through quando a transação
HTTP já está ativa. Os erros `404` registrados no log são respostas esperadas
da prova de isolamento, não falhas do teste.

Com isso, a fronteira HTTP de recibo tem prova de commit, replay, conflito e
isolamento entre tenants. Permanecem fora deste slice a jornada clínica
completa, Redis failover entre processos, providers, SPA/B2c, paridade Vetus,
WCAG, operações alvo, cobertura global e release.
