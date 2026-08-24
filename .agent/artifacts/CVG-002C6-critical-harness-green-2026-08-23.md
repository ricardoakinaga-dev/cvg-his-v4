# CVG-002C6 — critical harness green e isolamento de fixture (23/08/2026)

## Escopo

Fechar a falha de contaminação que aparecia somente quando a suíte integral
executava `encounter-cash-receipts.test.ts` antes de
`pix-service-principals.test.ts`. A correção é exclusivamente de isolamento do
teste: o contrato de produção, as FKs e a migration de principals permanecem
inalterados.

## Causa reproduzida

O cenário `rechecks later artifact changes while allowing a legitimate drawer
close` fazia `COMMIT` entre etapas e, no `finally`, executava
`SET session_replication_role = replica` para apagar somente `accounts`. Isso
burlava as FKs e deixava `users` órfãos. A menor sequência

```text
tests/integration/database/encounter-cash-receipts.test.ts
tests/integration/database/pix-service-principals.test.ts
```

reproduziu a violação `users_account_id_accounts_id_fk` no backfill de
principals em banco descartável novo.

## Correção publicada

O teste agora mantém uma única transação do fixture ao fim do cenário, usa
savepoints antes de cada mutação que deve falhar e faz `ROLLBACK` final. O
`session_replication_role` foi removido. Assim, toda a árvore do fixture é
descartada pelo rollback normal, sem apagar órfãos e sem alterar constraints de
produção. Commit de implementação: `76d94a3` (`fix: isolate encounter cash
receipt fixtures`).

## Evidência focal

Comando executado em banco PostgreSQL descartável:

```bash
REQUIRE_TEST_DB=1 pnpm exec vitest run \
  tests/integration/database/encounter-cash-receipts.test.ts \
  tests/integration/database/pix-service-principals.test.ts \
  --config vitest.integration.config.ts --reporter=verbose \
  --no-cache --no-file-parallelism \
  --hookTimeout=120000 --teardownTimeout=120000
```

Resultado: banco `cvg_his_v2_test_3758655_3758680`, migrations `0000–0123`,
schema com 172 tabelas/43 enums/456 FKs, **2 arquivos e 30/30 testes**, exit 0,
49,04 s. O cenário de cash passou 25/25 e o backfill PIX passou 5/5 no mesmo
processo.

## Evidência integral

Comando Lead:

```bash
REQUIRE_TEST_DB=1 pnpm exec vitest run \
  tests/integration/database tests/integration/setup \
  tests/integration/foundational.test.ts \
  --config vitest.integration.config.ts --reporter=dot \
  --no-cache --no-file-parallelism \
  --hookTimeout=120000 --teardownTimeout=120000
```

Resultado: banco `cvg_his_v2_test_3787255_3787283`, migrations `0000–0123`,
schema com 172 tabelas/43 enums/456 FKs, **28/28 arquivos e 387/387 testes**,
exit 0, duração 669,60 s (11m09,60s). O teardown do ambiente descartável foi
concluído.

## Crítica independente

Crítico independente classificou o patch como **ACCEPT**. Confirmou que os
savepoints recuperam a transação após erros esperados, que o rollback final
remove os pais e dependentes sem bypass, e que a cadeia de FKs/constraints de
0108–0123 continua sendo exercitada. O risco residual apontado é de cobertura:
este cenário específico não faz `COMMIT` válido do fixture; a validação de
commit real deve ser uma melhoria posterior, não uma alteração das constraints.

## Limites e próxima retomada

Este artefato fecha somente o harness crítico e o isolamento do fixture. O ERP,
Quality Bar, CVG-002/CVG-002C6 e gates de produção/release continuam
`IN_PROGRESS/PARTIAL`. Permanecem abertos: fixture de domínio em child process
com SIGKILL/takeover, failpoints/restart completos, PIX PostgreSQL/RLS,
webhook HTTP retry/DLQ/lease fencing, isolamento restrito de billing/financial/
webhook, hidratação cross-instance, RLS/FORCE RLS global, Redis/provider, SPA,
paridade Vetus, WCAG, cobertura, operações, deploy/restore e release.
