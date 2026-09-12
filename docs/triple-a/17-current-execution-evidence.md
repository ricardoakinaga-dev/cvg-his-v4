# Evidência de execução corrente — State of Art

## Candidato funcional observado em 2026-09-12T11:43:00Z

- SHA de código e documentação: `553078be60c963ffb7cab5c45c130912e5e299b8` (código/workflow); documentação corrente em commits documentais posteriores.
- `HEAD`, `main` e `origin/main` coincidem; rollback preservado em
  `origin/fix/state-of-art-ci-assurance@fe5406c2`.
- Nenhum force-push foi usado.

## Validações locais

| Escopo                 | Resultado                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate estrito           | `BLOCKED`, score `55`, critical `57`, open P0 `15`, claim `NOT PROVEN`, `publication_allowed=false`, no HEAD documental `c1059e6c`                                                                                                                                                                                                                                            |
| Workspace              | `TRIPLE_A_RUN_TESTS=1 pnpm release:triple-a` executou checks, build e suíte workspace no HEAD `c1059e6c`; decisão permaneceu bloqueada                                                                                                                                                                                                                                        |
| Contratos direcionados | CI contract `18/18`; Vitest `38/38`; Node `8/8`; typecheck, lint, Prettier e `git diff --check`: PASS                                                                                                                                                                                                                                                                         |
| Fixtures k6            | `pnpm benchmark:k6:seed` repetido `2/2` no PostgreSQL descartável, sem reassignment entre tenants                                                                                                                                                                                                                                                                             |
| Performance local      | k6 `operational-minimum-v1`, 60 VUs, `3.001` iterações, `9/9` SLOs; API p95 `124,84 ms`, p99 `166,49 ms`, query p95 `143 ms`, erros `0%`, disponibilidade `100%`, API/PostgreSQL/Redis em 2 CPUs e k6 `GOMAXPROCS=1`; reprodução equivalente ao watcher de 5 s passou `3.371` iterações e `9/9` (`p95 94,29 ms`, `p99 136,61 ms`, query `107 ms`, 44 amostras de diagnóstico) |
| Suíte crítica local    | `615/615` testes PostgreSQL e `11/11` suítes de processo com relatórios completos; Redis local descartável configurado explicitamente                                                                                                                                                                                                                                         |
| Supply/artefatos       | Diretório de resultados versionado com `.gitkeep`; relatório gerado localmente foi descartado; nenhum PASS externo foi inventado                                                                                                                                                                                                                                              |

Esses resultados são bounded ao ambiente local. A execução k6 usou um banco
descartável local e não é promovida para target, UAT, branch protection ou
autoridade de release.

## CI remoto do mesmo SHA

O [CI #143](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34678150409)
é o run do candidato funcional pai `82ff6eec` e terminou `failure` com `15/16`
jobs verdes: E2E SPA, integração, segurança, build, visual e demais checks
passaram; somente Performance/k6 falhou em `Run k6 benchmark`/`Check SLO results`.
Esse resultado não é transferido para `553078be`; nenhum threshold foi relaxado.
O CI #144 do pai documental `da5dd244` falhou em `Repository Guards` porque o
checkout raso impediu validar a ancestralidade do snapshot. O candidato atual
passa a solicitar `fetch-depth: 0`; a correção foi exercitada no CI seguinte.
O [CI #145](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34680830958)
no `main@66a605be` confirmou a correção do guard e terminou com 15/16 jobs
verdes; E2E, integração e os demais checks passaram, mas Performance/k6 falhou.
O SLO remoto permanece sem prova de aprovação.
O [CI #146](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34682262401),
no descendente documental `697c6efa`, terminou `failure`: a suíte SPA passou,
mas `Run canonical clinical API E2E` falhou. O candidato `a3354f02` prepara
`cvg_his_e2e_canonical` e sobe a API em `3113`, separando a prova clínica do
banco mutável da suíte SPA. O [CI #147](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34684079972),
no SHA exato publicado `8273ecb5`, confirmou a correção: `16/16` jobs verdes,
SPA E2E verde e `Run canonical clinical API E2E` concluído com sucesso em
`8s`, além de Performance/k6, integração, unidade, visual, guards e segurança.
O [CI #148](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34685632858),
no descendente documental `f9cc660a`, manteve E2E SPA, API clínica canônica,
integração, unidade, visual e demais checks verdes, mas falhou no job
Performance/k6: `Run k6 benchmark` exit `99` e `Check SLO results` exit `1`.
Esse resultado não transfere falha para o código/workflow de `a3354f02`, que
permanece confirmado pelo #147; ele mantém o snapshot atual `BLOCKED` até uma
execução k6 terminal verde.

O [CI #149](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34687849607),
no SHA `553078be`, terminou `failure` em `Validate repository source contracts`:
o guard detectou que os documentos correntes ainda declaravam `a3354f02` depois
da alteração do workflow/contrato. Os jobs Typecheck, SAST, Secret Scan,
Dependency Audit, Coverage e OpenAPI passaram; nenhum resultado parcial é
promovido. A reconciliação foi publicada no descendente `4b49c4ef`.

O [CI #151](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34690210769),
no SHA `fecb70ca`, terminou `failure` somente em `Performance (k6 SLOs)`:
`15/16` jobs passaram, incluindo Repository Guards, Integration, E2E SPA e
Visual Regression. O benchmark terminou com exit `99` e o parser com exit `1`;
o job remoto publicou o artefato `performance-k6-report` com digest
`sha256:84b09a10162af819504fe8e269a84d498f1927aee9189af553ff3f8086390afa`.
As métricas detalhadas não estão disponíveis sem credencial. A mudança
`GOMAXPROCS=1` e o watcher de diagnóstico passaram na reprodução local, mas a
evidência hospedada continua falha. Runs anteriores do mesmo código/workflow
alternaram entre verde e falha em runners diferentes; nenhum threshold foi
relaxado.

## Recovery e target

`pnpm ops:backup:check` valida contratos estáticos. Os drills reais fixture e
representative não iniciaram porque o Docker daemon recusou o socket; não há
evidência de restore, corrupção, migration mismatch, RPO/RTO, deploy,
rollback, attestation, soak ou alert delivery em target. O k6 local aprovado
não substitui a execução remota nem uma certificação de target.

## Decisão

O envelope ignorado `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` do HEAD
`c1059e6c` é `BLOCKED / NOT PROVEN` (`55/57/15`); a execução completa passou
checks e suíte workspace, mas não substitui as provas externas ausentes. O pacote local
`artifacts/triple-a/index.json` também permanece `BLOCKED`. A ausência de uma
prova externa permanece ausência; não é convertida em PASS pelo k6 local ou
por um CI verde de outro SHA.
