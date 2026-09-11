# Evidência de execução corrente — State of Art

Observado em `2026-09-11` no checkout `0abdf651fbb2433163b8d94fcaa6e59cd5199f8d`.
`HEAD` e `origin/main` coincidem; o código funcional deste snapshot é o candidato
`bb16a47f` e as alterações posteriores são apenas controles/documentação de assurance.

## PostgreSQL de integração

| Campo | Resultado |
| --- | --- |
| Comando | `REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=stateofart_db_<timestamp> DATABASE_URL=<admin-url>/cvg_his_v2_test_stateofart DATABASE_URL_TEST=<same> pnpm exec vitest run tests/integration/database tests/integration/setup tests/integration/foundational.test.ts --config vitest.integration.config.ts --reporter=verbose --no-file-parallelism` |
| Resultado | **PASS local** — 66 arquivos e 615 testes passaram; exit 0; duração 183,78 s |
| Ambiente | PostgreSQL local descartável, migrations e seed reais; o banco efêmero foi removido no teardown |
| Escopo | RLS/tenant, workflow clínico, auditoria append-only, billing/financeiro, leases/fencing, migrations, invariantes e cenários fundacionais |

Esta execução é evidência local vinculada ao SHA corrente. Ela não substitui CI
Ubuntu/Node 22, ambiente alvo, branch governance ou autorização de release.

## Runner de processos críticos

| Campo | Resultado |
| --- | --- |
| Comando | `REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 DATABASE_URL=<admin-url>/cvg_his_v2_test_stateofart DATABASE_URL_TEST=<same> REDIS_SERVER_BIN=/tmp/opencode/redis-src/src/redis-server REDIS_CLI_BIN=/tmp/opencode/redis-src/src/redis-cli pnpm test:critical:process` |
| Resultado | **PASS local** — 11/11 cenários foram executados como não-skipped e o runner terminou com `Completed 11 process test(s) serially` |
| Escopo | Setup distribuído, laboratório, SIGKILL/reclaim, fencing, restart, child process, concorrência de caixa, settlement PIX, worker entrypoint, webhook delivery e workflow task |
| Ambiente | PostgreSQL efêmero por cenário e Redis local pinned 8.10.1; cada banco foi limpo pelo runner |

O primeiro ensaio sem os caminhos Redis disponíveis foi corretamente bloqueado
por ambiente; nenhum skip foi promovido a PASS. O segundo ensaio forneceu os
binários explicitamente e executou todos os cenários.

## Perfil k6 operacional

| Métrica | P95 observado | P99 observado | Alvo |
| --- | ---: | ---: | ---: |
| API | 33,99 ms | 46,03 ms | < 200 / < 500 ms |
| Query | 36 ms | 58 ms | < 150 ms |
| Billing | 41 ms | 52 ms | < 250 ms |
| Inventory | 38,46 ms | 49,95 ms | < 200 ms |
| Write | 43 ms | 54 ms | < 300 ms |
| Auth | 16,50 ms | 16,50 ms | < 300 ms |
| Disponibilidade | 100% | — | >= 99,5% |

Comando: `/tmp/k6-v0.55.0 run benchmarks/k6/api-benchmark.js`, com
`TARGET=http://127.0.0.1:3101`, `LOAD_PROFILE=operational-minimum-v1`, pool
PostgreSQL `60/8`, banco e tenant descartáveis. O perfil completou 4.226
iterações, 60 VUs e **9/9 SLOs**; o banco foi removido e a API foi encerrada.

Este resultado explica que a implementação passa o perfil em um ambiente local
isolado, mas não substitui o CI pinned: o CI exato do candidato funcional,
run [#34593912427](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34593912427),
permanece `failure` porque somente `Performance (k6 SLOs)` falhou. O relatório
remoto não é reclassificado a partir desta execução local e nenhum threshold foi
alterado.

## Limitações de fechamento

O gate permanece **BLOCKED / NOT PROVEN**. Continuam sem prova no mesmo boundary
do release: run remoto verde, logs autenticados do job de performance, branch
protection/required checks, target deploy/rollback, restore/RPO/RTO, soak 24/72h,
attestation de imagem, UAT humano e autoridade de release.
