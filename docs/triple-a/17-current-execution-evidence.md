# Evidência de execução corrente — State of Art

## Candidato funcional observado em 2026-09-12T05:15:00Z

- SHA de código: `5b0f1b0905bbf472a78626dd61e126361f6b7435`.
- O commit está em `main` local e pronto para fast-forward; na captura
  `origin/main` ainda apontava para `cd296260aabe33a0664ab9edbf6be60419e79c27`.
- Rollback preservado em `origin/fix/state-of-art-ci-assurance@fe5406c2`; nenhum
  force-push foi usado.

## Validações locais

| Escopo                 | Resultado                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate estrito           | `BLOCKED`, score `55`, critical `57`, open P0 `15`, claim `NOT PROVEN`, `publication_allowed=false`                                                |
| Workspace              | `TRIPLE_A_RUN_TESTS=1 pnpm release:triple-a` executou checks, build e suíte workspace; decisão permaneceu bloqueada                               |
| Contratos direcionados | Vitest `33/33`; Node `8/8`; typecheck, lint, Prettier e `git diff --check`: PASS                                                                    |
| Fixtures k6            | `pnpm benchmark:k6:seed` repetido `2/2` no PostgreSQL descartável, sem reassignment entre tenants                                                    |
| Performance local      | k6 `operational-minimum-v1`, 60 VUs, `4.303` iterações, `9/9` SLOs; API p95 `27,54 ms`, p99 `40,30 ms`, erros `0%`, disponibilidade `100%`       |
| Supply/artefatos       | Diretório de resultados versionado com `.gitkeep`; relatório gerado localmente foi descartado; nenhum PASS externo foi inventado                    |

Esses resultados são bounded ao ambiente local. A execução k6 usou um banco
descartável local e não é promovida para target, UAT, branch protection ou
autoridade de release.

## CI remoto do mesmo SHA

Não havia run remoto do SHA `5b0f1b09` na captura. O [CI
#140](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34672193141),
vinculado ao SHA documental anterior, terminou `failure` com `15/16` jobs
verdes: os checks funcionais passaram e somente Performance/k6 falhou em
`Run k6 benchmark`/`Check SLO results`. O [CI
#137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200)
foi o último run integralmente verde, mas está vinculado a SHA anterior e não é
transferido. Nenhum threshold foi relaxado.

## Recovery e target

`pnpm ops:backup:check` valida contratos estáticos. Os drills reais fixture e
representative não iniciaram porque o Docker daemon recusou o socket; não há
evidência de restore, corrupção, migration mismatch, RPO/RTO, deploy,
rollback, attestation, soak ou alert delivery em target. O k6 local aprovado
não substitui a execução remota nem uma certificação de target.

## Decisão

O envelope ignorado `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` do SHA
`5b0f1b09` é `BLOCKED / NOT PROVEN` (`55/57/15`), e o pacote local
`artifacts/triple-a/index.json` também permanece `BLOCKED`. A ausência de uma
prova externa permanece ausência; não é convertida em PASS pelo k6 local ou
por um CI verde de outro SHA.
