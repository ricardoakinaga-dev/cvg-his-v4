# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT CODE CANDIDATE | funcional `bb16a47f`; `main`/`origin/main` sincronizados no snapshot corrente de assurance; branch de origem preservada em `fix/state-of-art-ci-assurance` para rollback |
| DOCUMENTATION SNAPSHOT | CI terminal do candidato funcional após atualização do hash congelado de billing; resultados históricos permanecem vinculados aos SHAs originais |
| CURRENT SCORE | `33` no gate estrito do snapshot `0abdf651`; mínimo 97 |
| CURRENT CRITICAL SCORE | `20` no gate estrito do snapshot `0abdf651`; mínimo 95 |
| CURRENT OPEN P0 | `28` no gate estrito do snapshot `0abdf651`; o quality bar exige zero |
| CURRENT CI | [#34593912427](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34593912427): `failure`; 15/16 jobs passaram e Performance (k6 SLOs) falhou |
| CURRENT LOCAL PERFORMANCE | PostgreSQL descartável 66/66 e runner crítico 11/11 passaram; k6 local 9/9 SLOs passou; nenhum resultado local substitui o CI pinned ou certifica o alvo |
| CURRENT VERDICT | BLOCKED / NOT PROVEN; gate estrito total `33` |

O run #108 do SHA exato `5b036836` permanece histórico e falhou em Unit Tests e Performance; o run #110 do SHA `bd10b7a6` foi supersedido após o guard detectar o hash congelado de billing desatualizado. A identidade foi corrigida em `bb16a47f`, e o run #111 é a validação exata corrente: 15/16 jobs passaram e Performance (k6 SLOs) falhou. Thresholds não foram relaxados. Os contratos locais de database-only restore, Helm production digest, identidade de fonte, integração PostgreSQL, processos críticos, k6 local e a otimização de leitura do billing passaram dentro dos limites registrados, mas não substituem target, autoridade ou score do quality bar. O estado e a cadeia de identidade estão registrados em [15-current-baseline](./15-current-baseline.md), [17-current-execution-evidence](./17-current-execution-evidence.md) e no [EXECUTION_LOG](./EXECUTION_LOG.md).

Histórico anterior preservado em [scorecard-history](./scorecard-history/2026-09-10-before-b85b03ea-13-final-scorecard.md).
