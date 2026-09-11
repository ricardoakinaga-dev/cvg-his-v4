# Baseline corrente — State of Art

Observado em `2026-09-11T19:39:53Z`. Este snapshot está vinculado ao SHA
`b77539c9891eef89cbbe8160bf6e30a0fb369d48`; resultados de outros commits não
são transferidos para este candidato.

| Campo | Evidência atual |
| --- | --- |
| current_sha | `b77539c9891eef89cbbe8160bf6e30a0fb369d48` |
| main_sha | `b77539c9891eef89cbbe8160bf6e30a0fb369d48` — `main` e `origin/main` coincidem |
| worktree | Limpo após a execução do gate; artefatos locais permanecem ignorados |
| rollback | `origin/fix/state-of-art-ci-assurance` preservada em `fe5406c2`; nenhum force-push |
| ci_run | [#126](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34635843119), `failure`, SHA exato, 14/16 jobs aprovados |
| ci_failures | [Performance](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34635843119/job/103387572819) e [Critical Process Runner Windows](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34635843119/job/103387572845); logs detalhados exigem acesso autenticado |
| local_gate | `pnpm release:triple-a` — `BLOCKED`, score `54`, critical `54`, open P0 `16`, `publication_allowed=false` |
| quality_bar_assessment | `31/33/7` (score/critical/open P0) no quality bar congelado; o gate superior continua bloqueado |
| local_checks | Docs, namespaces, migration source, OpenAPI, RLS estático, deploy surface, Helm estático, supply-chain pins, dependency policy, clinical workflow schema, secrets, complexity, typecheck, lint e build: PASS |
| local_tests | `pnpm test:coverage`: 2.525 passados, 1 skipped; cobertura total 82,44% statements/lines, 82,29% branches, 85,14% functions; E2E clínico combinado `2/2`; SPA focada `32/32` |
| verified_target | NOT PROVEN |
| decision | **BLOCKED / NOT PROVEN**; não emitir `main green` nem `TRIPLE-A VERIFIED` |

O gate estrito executou as verificações locais e escreveu o artefato ignorado
`artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json`. Os checks locais passaram,
mas o manifesto de release e a evidência de segurança não estão vinculados a
um pacote de publicação completo, e as provas externas obrigatórias continuam
ausentes. Os 16 P0 abertos incluem CI remoto verde, testes críticos,
workflow PostgreSQL, RLS runtime, crash recovery, E2E clínico, integridade de
auditoria, UAT, attestation, branch protection e autoridade de release.

O CI #126 aprovou Unit, Integration, E2E SPA, Visual, contratos, segurança,
typecheck, lint e build. A falha de Performance reproduz o padrão de runs
anteriores, mas a causa não foi inferida sem logs autenticados. A falha Windows
é uma regressão observada no runner nativo e não foi mascarada por alteração
do contrato.

O prompt preservado e seu hash estão em
[MASTER_PROMPT.md](./MASTER_PROMPT.md), SHA-256
`95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`. A régua
congelada permanece em [QUALITY_BAR_V1.json](./QUALITY_BAR_V1.json).
