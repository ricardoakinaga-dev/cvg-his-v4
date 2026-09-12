# Baseline corrente — State of Art

Observado em `2026-09-12T01:40:26Z`, no candidato `c7336ac0f6a909c10d07797c36814f0b321c6d5c`.
Este arquivo é uma fotografia do estado corrente; históricos anteriores não
substituem evidência do SHA atual.

| Campo           | Evidência atual                                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| current_sha     | `c7336ac0f6a909c10d07797c36814f0b321c6d5c`                                                                                                                                  |
| main_sha        | `c7336ac0f6a909c10d07797c36814f0b321c6d5c` (`HEAD == origin/main`)                                                                                                          |
| worktree        | Limpo na captura; artefatos de release permanecem ignorados                                                                                                                 |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push                                                                                                             |
| ci_run          | [#135](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34663821242), `failure`; 15/16 jobs verdes                                                             |
| ci_failure      | [Performance/k6](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34663821242/job/103473632130); os demais jobs, inclusive E2E clínico, concluíram com sucesso |
| overall_score   | `50` no gate estrito local                                                                                                                                                  |
| critical_score  | `46` no gate estrito local                                                                                                                                                  |
| open_p0         | `19` no gate estrito local                                                                                                                                                  |
| local_gate      | `TRIPLE_A_RUN_BUILD=0 pnpm release:triple-a`: `BLOCKED`, `claim=NOT PROVEN`, `publication_allowed=false`                                                                    |
| implemented     | Diagnósticos k6, breakdown por endpoint, guards de supply chain, workflow/worker, timelines, RLS estático, políticas operacionais e documentação requerida                  |
| verified_local  | `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, secret scan, docs, supply chain e backup estático: PASS; E2E clínico `2/2`; critical `66/615`; processo `11/11`   |
| verified_remote | CI #135: segurança, build, unit, integration, visual, contratos, Windows e E2E: PASS; performance SLO: FAIL                                                                 |
| verified_target | `NOT PROVEN`                                                                                                                                                                |
| blocked         | Performance SLO remoto; restore/DR real por Docker indisponível; target, attestation, deploy/rollback, UAT e autoridade humana                                              |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95 ou zero P0                                                                                                      |

## Decisão

O candidato é tecnicamente reversível e a `main` está sincronizada, mas a
política Green Main exige todos os checks obrigatórios verdes no mesmo SHA. O
CI #135 falhou apenas em Performance/k6; por isso este baseline não declara
`main green`, release ou `TRIPLE-A VERIFIED`.

O prompt byte a byte está em [`MASTER_PROMPT.md`](./MASTER_PROMPT.md), com
SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
A régua congelada está em [`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json).
