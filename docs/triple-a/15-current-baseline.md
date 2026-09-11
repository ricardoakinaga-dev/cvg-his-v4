# Baseline corrente — State of Art

Observado em `2026-09-11T22:12:14Z`. Este snapshot acompanha o commit de código
`68600d6a55dcf18bd04c28ff3ee7528cc686efdb`; a documentação de reconciliação é
publicada como evidência vinculada a esse candidato.

| Campo | Evidência atual |
| --- | --- |
| current_sha | `68600d6a55dcf18bd04c28ff3ee7528cc686efdb` — código candidato avaliado |
| code_parent_sha | `55ff8a5250d20f2dbd26c4572095599be485fb69` |
| main_sha | `68600d6a55dcf18bd04c28ff3ee7528cc686efdb` no momento da validação; a documentação é um commit de evidência posterior |
| worktree | Limpo após a publicação desta reconciliação; artefatos locais permanecem ignorados |
| rollback | `origin/fix/state-of-art-ci-assurance` preservada em `fe5406c2`; nenhum force-push |
| ci_run | [#129](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34650926250), `failure`, SHA exato, 15/16 jobs aprovados |
| ci_failures | [Performance](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34650926250/job/103435372609); Windows, E2E SPA, Integration, Unit, Visual e API Contract passaram; artefato reconciliado em `critic-performance-assurance-20260911.md` |
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

O CI #129 aprovou Unit, Integration, E2E SPA, Visual, contratos, segurança,
typecheck, lint, build e o contrato Windows. Performance falhou nos passos do
benchmark/SLO; as métricas detalhadas exigem credencial. Nenhuma causa
determinística de código foi comprovada e nenhuma threshold foi alterada. O CI
#128 do snapshot anterior permanece histórico.

O prompt preservado e seu hash estão em
[MASTER_PROMPT.md](./MASTER_PROMPT.md), SHA-256
`95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`. A régua
congelada permanece em [QUALITY_BAR_V1.json](./QUALITY_BAR_V1.json).
