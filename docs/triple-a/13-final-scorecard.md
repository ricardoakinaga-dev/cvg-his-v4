# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT CODE CANDIDATE | funcional `bb16a47f`; `main`/`origin/main` sincronizados no snapshot corrente de assurance; branch de origem preservada em `fix/state-of-art-ci-assurance` para rollback |
| DOCUMENTATION SNAPSHOT | CI terminal do candidato funcional após atualização do hash congelado de billing; resultados históricos permanecem vinculados aos SHAs originais |
| CURRENT SCORE | não recalculado; BLOCKED / NOT PROVEN (o score histórico 56/32/15 não é transferido) |
| CURRENT CRITICAL SCORE | não recalculado; quality bar congelado exige mínimo 95 |
| CURRENT OPEN P0 | não recalculado; provas externas permanecem ausentes |
| CURRENT CI | [#34593912427](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34593912427): `failure`; 15/16 jobs passaram e Performance (k6 SLOs) falhou |
| CURRENT LOCAL PERFORMANCE | Reprodução local e contratos operacionais são limitados; nenhum resultado local substitui o CI pinned ou certifica o alvo |
| CURRENT VERDICT | BLOCKED / NOT PROVEN |

O run #108 do SHA exato `5b036836` permanece histórico e falhou em Unit Tests e Performance; o run #110 do SHA `bd10b7a6` foi supersedido após o guard detectar o hash congelado de billing desatualizado. A identidade foi corrigida em `bb16a47f`, e o run #111 é a validação exata corrente: 15/16 jobs passaram e Performance (k6 SLOs) falhou. Thresholds não foram relaxados. Os contratos locais de database-only restore, Helm production digest, identidade de fonte e a otimização de leitura do billing passaram dentro dos limites registrados, mas não substituem target, autoridade ou score do quality bar. O estado e a cadeia de identidade estão registrados em [15-current-baseline](./15-current-baseline.md) e no [EXECUTION_LOG](./EXECUTION_LOG.md).

Histórico anterior preservado em [scorecard-history](./scorecard-history/2026-09-10-before-b85b03ea-13-final-scorecard.md).
