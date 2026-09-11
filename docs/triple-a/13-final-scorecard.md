# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT CODE CANDIDATE | funcional `5b036836bf71bc3a6c62bd151a2b19f235d3e2fc`; `main`/`origin/main` sincronizados no snapshot documental metadata-only; branch de origem preservada em `fix/state-of-art-ci-assurance` para rollback |
| DOCUMENTATION SNAPSHOT | Reconciliação do CI terminal do candidato funcional; qualquer commit desta atualização é metadata-only e não recebe a evidência funcional |
| CURRENT SCORE | não recalculado; BLOCKED / NOT PROVEN (o score histórico 56/32/15 não é transferido) |
| CURRENT CRITICAL SCORE | não recalculado; quality bar congelado exige mínimo 95 |
| CURRENT OPEN P0 | não recalculado; provas externas permanecem ausentes |
| CURRENT CI | [#34587238104](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34587238104): 14/16 jobs aprovados; Unit Tests e Performance (k6 SLOs) falharam |
| CURRENT LOCAL PERFORMANCE | Reprodução local e contratos operacionais são limitados; nenhum resultado local substitui o CI pinned ou certifica o alvo |
| CURRENT VERDICT | BLOCKED / NOT PROVEN |

O run #108 do SHA exato `5b036836` falhou em Unit Tests e Performance; thresholds não foram relaxados. Integration, E2E SPA, Visual, Windows e API Contract passaram. Os contratos locais de database-only restore e Helm production digest passaram, mas não substituem target, autoridade ou o score do quality bar. O estado e a cadeia de identidade estão registrados em [15-current-baseline](./15-current-baseline.md) e no [EXECUTION_LOG](./EXECUTION_LOG.md).

Histórico anterior preservado em [scorecard-history](./scorecard-history/2026-09-10-before-b85b03ea-13-final-scorecard.md).
