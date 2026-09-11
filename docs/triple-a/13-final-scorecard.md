# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT CODE CANDIDATE | `055f282db45cf35368ba6f5b24c7870e1c89e118` local; `origin/main` permanece em `533a12a4` até o push seguro; rollback preservado em `fix/state-of-art-ci-assurance` |
| DOCUMENTATION SNAPSHOT | Frescor do gate, identidade declarada do prompt e correções de acessibilidade clínica implementados; CI do candidato local ainda não executado |
| CURRENT SCORE | `34` no gate estrito local de `055f282d`; mínimo 97 |
| CURRENT CRITICAL SCORE | `23` no gate estrito local de `055f282d`; mínimo 95 |
| CURRENT OPEN P0 | `27` no gate estrito local de `055f282d`; o quality bar exige zero |
| CURRENT CI | [#34599938521](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34599938521) no pai `533a12a4`, ainda com E2E SPA e Integration em execução na observação; não transferível |
| CURRENT LOCAL PERFORMANCE | Evidência anterior bounded de PostgreSQL 66/66, runner 11/11 e k6 local 9/9; novos testes focados SPA/design-system passaram; nenhum resultado local substitui CI pinned ou certifica o alvo |
| CURRENT VERDICT | BLOCKED / NOT PROVEN; gate estrito total `34` |

O run #108 do SHA exato `5b036836` permanece histórico e falhou em Unit Tests e Performance; o run #110 do SHA `bd10b7a6` foi supersedido após o guard detectar o hash congelado de billing desatualizado. A identidade foi corrigida em `bb16a47f`, e o run #111 é a validação exata corrente: 15/16 jobs passaram e Performance (k6 SLOs) falhou. Thresholds não foram relaxados. Os contratos locais de database-only restore, Helm production digest, identidade de fonte, integração PostgreSQL, processos críticos, k6 local e a otimização de leitura do billing passaram dentro dos limites registrados, mas não substituem target, autoridade ou score do quality bar. O estado e a cadeia de identidade estão registrados em [15-current-baseline](./15-current-baseline.md), [17-current-execution-evidence](./17-current-execution-evidence.md) e no [EXECUTION_LOG](./EXECUTION_LOG.md).

Histórico anterior preservado em [scorecard-history](./scorecard-history/2026-09-10-before-b85b03ea-13-final-scorecard.md).
