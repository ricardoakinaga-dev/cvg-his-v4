# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT CODE CANDIDATE | HEAD `83d01e9c60c3027b6068aa1d10a50f7f5c585296`; código funcional `59a63087`; `main`/`origin/main` sincronizados; rollback preservado |
| DOCUMENTATION SNAPSHOT | Frescor do gate, identidade declarada do prompt e correções de acessibilidade clínica implementados; CI do HEAD falhou somente em Performance |
| CURRENT SCORE | `34` no gate estrito local de `83d01e9c`; mínimo 97 |
| CURRENT CRITICAL SCORE | `23` no gate estrito local de `83d01e9c`; mínimo 95 |
| CURRENT OPEN P0 | `27` no gate estrito local de `83d01e9c`; o quality bar exige zero |
| CURRENT CI | [#34606095261](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34606095261): `failure`, 15/16 jobs; Performance (k6 SLOs) falhou |
| CURRENT LOCAL PERFORMANCE | Evidência bounded de PostgreSQL 66/66, runner 11/11 e k6 local 9/9; testes focados SPA/design-system passaram; nenhum resultado local substitui CI pinned ou certifica o alvo |
| CURRENT VERDICT | BLOCKED / NOT PROVEN; gate estrito total `34`, CI do HEAD vermelho |

O run #108 do SHA exato `5b036836` permanece histórico e falhou em Unit Tests e Performance; o run #110 do SHA `bd10b7a6` foi supersedido após o guard detectar o hash congelado de billing desatualizado. A identidade foi corrigida em `bb16a47f`, e o run #111 é a validação exata corrente: 15/16 jobs passaram e Performance (k6 SLOs) falhou. Thresholds não foram relaxados. Os contratos locais de database-only restore, Helm production digest, identidade de fonte, integração PostgreSQL, processos críticos, k6 local e a otimização de leitura do billing passaram dentro dos limites registrados, mas não substituem target, autoridade ou score do quality bar. O estado e a cadeia de identidade estão registrados em [15-current-baseline](./15-current-baseline.md), [17-current-execution-evidence](./17-current-execution-evidence.md) e no [EXECUTION_LOG](./EXECUTION_LOG.md).

Histórico anterior preservado em [scorecard-history](./scorecard-history/2026-09-10-before-b85b03ea-13-final-scorecard.md).
