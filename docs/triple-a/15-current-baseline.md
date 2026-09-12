# Baseline corrente — State of Art

Observado em `2026-09-12T02:53:43Z`, no candidato funcional
`1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`. Este arquivo é uma fotografia do
estado corrente; históricos anteriores não substituem evidência do candidato.

| Campo           | Evidência atual                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| current_sha     | `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689` (candidato funcional)                                                                                                          |
| main_sha        | `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689` (`HEAD == origin/main` na captura)                                                                                             |
| worktree        | Limpo na captura; artefatos de release permanecem ignorados                                                                                                               |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push                                                                                                           |
| ci_run          | [#137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200), `success`; 16/16 jobs verdes                                                           |
| ci_failure      | Nenhum job obrigatório falhou; E2E SPA/usabilidade, integração e Performance/k6 concluíram com sucesso                                                                    |
| overall_score   | `54` no gate estrito local com checks e build executados                                                                                                                  |
| critical_score  | `54` no gate estrito local                                                                                                                                                |
| open_p0         | `16` no gate estrito local                                                                                                                                                |
| local_gate      | `pnpm release:triple-a`: `BLOCKED`, `claim=NOT PROVEN`, `publication_allowed=false`                                                                                       |
| implemented     | Diagnósticos k6, breakdown por endpoint, guards de supply chain, workflow/worker, timelines, RLS estático, políticas operacionais e documentação requerida                |
| verified_local  | `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, secret scan, docs, supply chain e backup estático: PASS; E2E clínico `2/2`; critical `66/615`; processo `11/11` |
| verified_remote | CI #137: segurança, build, unit, integration, visual, contratos, Windows, E2E e performance: PASS                                                                         |
| verified_target | `NOT PROVEN`                                                                                                                                                              |
| blocked         | Restore/DR real por Docker indisponível; target, attestation, deploy/rollback, UAT, branch governance e autoridade humana                                                 |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95 ou zero P0                                                                                                    |

## Decisão

O candidato é tecnicamente reversível e a `main` está sincronizada, mas a
política Green Main exige todos os checks obrigatórios verdes no mesmo SHA. O
CI #135 falhou apenas em Performance/k6; por isso este baseline não declara
`main green`, release ou `TRIPLE-A VERIFIED`.

O prompt byte a byte está em [`MASTER_PROMPT.md`](./MASTER_PROMPT.md), com
SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
A régua congelada está em [`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json).
