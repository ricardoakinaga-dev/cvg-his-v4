# Baseline corrente — State of Art

Observado em `2026-09-12T05:15:00Z`, no candidato de código
`5b0f1b0905bbf472a78626dd61e126361f6b7435`. Este arquivo é uma fotografia do
estado corrente; históricos anteriores não substituem evidência do candidato.

| Campo           | Evidência atual                                                                                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| current_sha     | `5b0f1b0905bbf472a78626dd61e126361f6b7435` (correções de fixtures k6 e fechamento de evidência)                                                                                                                   |
| main_sha        | Candidato local pronto para fast-forward; `origin/main` ainda estava em `cd296260aabe33a0664ab9edbf6be60419e79c27` na captura                                          |
| worktree        | Limpo após o commit de código; artefatos de release permanecem ignorados                                                                                                                                        |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push                                                                                                                                                |
| ci_run          | Nenhum run remoto do novo SHA na captura; o [CI #140](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34672193141) anterior ficou `failure` somente em Performance/k6                                  |
| ci_failure      | O candidato novo ainda exige CI remoto exato; o último run integralmente verde é o [#137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200), em SHA anterior                          |
| overall_score   | `55` no gate estrito local com checks, build e suíte de testes executados                                                                                                                                        |
| critical_score  | `57` no gate estrito local                                                                                                                                                                                        |
| open_p0         | `15` no gate estrito local                                                                                                                                                                                        |
| local_gate      | `TRIPLE_A_RUN_TESTS=1 pnpm release:triple-a`: `BLOCKED`, `claim=NOT PROVEN`, `publication_allowed=false`                                                                                                         |
| implemented     | Fixtures k6 determinísticas e tenant-safe; evidência com companions obrigatórios e override explícito fail-closed; readiness, supply chain, workflow/worker, RLS estático e documentação do prompt             |
| verified_local  | Testes focados `33/33`; testes Node de evidência/diagnóstico `8/8`; typecheck, lint, Prettier e diff: PASS; seed idempotente `2/2`; k6 local descartável `9/9` SLOs                               |
| verified_remote | `NOT PROVEN` para o novo SHA; CI #140 anterior: `15/16` jobs verdes, Performance/k6 falhou                                                                                                                       |
| verified_target | `NOT PROVEN`                                                                                                                                                                                                     |
| blocked         | CI remoto novo, restore/DR real por Docker indisponível; target, attestation, deploy/rollback, UAT, branch governance e autoridade humana permanecem abertos                                                      |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95 ou zero P0                                                                                                                                            |

## Decisão

O candidato é tecnicamente reversível e será publicado por fast-forward, sem
force-push. A política Green Main exige todos os checks obrigatórios verdes no
mesmo SHA; ainda não há run remoto para `5b0f1b09`. Por isso este baseline não
declara `main green`, release ou `TRIPLE-A VERIFIED`.

O prompt byte a byte está em [`MASTER_PROMPT.md`](./MASTER_PROMPT.md), com
SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
A régua congelada está em [`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json).
