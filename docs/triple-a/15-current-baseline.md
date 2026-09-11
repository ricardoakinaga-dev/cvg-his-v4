# Baseline corrente — State of Art

Observado em `2026-09-11T23:33:28Z`. Este snapshot acompanha o commit documental
`6fe76696240925ad550d05cd38a14a5239f50abc`; o gate local equivalente foi executado em
`3054d6388becd9a262b2cd45fadbabc086c1ed75` e o código funcional avaliado permanece
`68600d6a55dcf18bd04c28ff3ee7528cc686efdb`.

| Campo | Evidência atual |
| --- | --- |
| current_sha | `6fe76696240925ad550d05cd38a14a5239f50abc` — documentação corrente; gate equivalente em `3054d638`, código funcional avaliado em `68600d6a` |
| code_parent_sha | `55ff8a5250d20f2dbd26c4572095599be485fb69` |
| main_sha | `6fe76696240925ad550d05cd38a14a5239f50abc`; contém a documentação corrente e o código funcional `68600d6a` |
| worktree | Limpo no checkout de evidência; esta atualização é documental; artefatos locais permanecem ignorados |
| rollback | `origin/fix/state-of-art-ci-assurance` preservada em `fe5406c2`; nenhum force-push |
| ci_run | [#131](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34656290327), `success`, `16/16` jobs verdes no SHA documental; #130 e #129 permanecem históricos |
| ci_failures | [Performance #129](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34650926250/job/103435372609) e [Performance #130](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34653388064/job/103443316221); os demais checks publicados passaram; artefato reconciliado em `critic-performance-assurance-20260911.md` |
| local_gate | `TRIPLE_A_RUN_TESTS=1 pnpm release:triple-a` — `BLOCKED`, score `55`, critical `57`, open P0 `15`, `publication_allowed=false` |
| quality_bar_assessment | `31/33/7` (score/critical/open P0) no quality bar congelado; o gate superior continua bloqueado |
| local_checks | Docs, namespaces, migration source, OpenAPI, RLS estático, deploy surface, Helm estático, supply-chain pins, dependency policy, clinical workflow schema, secrets, complexity, typecheck, lint e build: PASS |
| local_tests | `pnpm test` PASS; `pnpm test:critical` `66/615`; processos críticos `11/11`; E2E clínico canônico `2/2` em PostgreSQL/Redis local |
| verified_target | NOT PROVEN |
| decision | **BLOCKED / NOT PROVEN**; não emitir `main green` nem `TRIPLE-A VERIFIED` |

O gate estrito executou as verificações locais e escreveu o artefato ignorado
`artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json`. Os checks locais passaram,
mas o manifesto de release e a evidência de segurança não estão vinculados a
um pacote de publicação completo, e as provas externas obrigatórias continuam
ausentes. Os 15 P0 abertos continuam incluindo manifest/security evidence, CI remoto verde,
backup/restore, envelopes críticos/E2E/workflow/RLS/worker/auditoria, UAT,
attestation, branch protection e autoridade de release; as execuções locais não
foram promovidas como evidência externa.

O CI #129 aprovou Unit, Integration, E2E SPA, Visual, contratos, segurança,
typecheck, lint, build e o contrato Windows. Performance falhou nos passos do
benchmark/SLO; as métricas detalhadas exigem credencial. O CI #130, disparado pela reconciliação documental anterior, repetiu o
padrão de falha somente em Performance. O CI #131 do SHA documental atual
terminou `success` com `16/16` jobs verdes, incluindo Performance, Integration,
E2E SPA, Unit, Visual, API Contract e Windows. Nenhuma threshold foi alterada,
evidência de SHA anterior não foi transferida e o CI #128 permanece histórico.

O prompt preservado e seu hash estão em
[MASTER_PROMPT.md](./MASTER_PROMPT.md), SHA-256
`95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`. A régua
congelada permanece em [QUALITY_BAR_V1.json](./QUALITY_BAR_V1.json).
