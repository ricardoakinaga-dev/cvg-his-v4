# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT CODE CANDIDATE | "main@04864a54cdb02b5d2c1fa5e6291804d66ea4721a"; branch de origem preservada em `fix/state-of-art-ci-assurance` para rollback |
| DOCUMENTATION SNAPSHOT | Reconciliação do CI terminal do candidato; score local é diagnóstico com build/testes completos fora da coleta |
| CURRENT SCORE | 65 no gate diagnóstico; BLOCKED / NOT PROVEN |
| CURRENT CRITICAL SCORE | 49 no gate diagnóstico; abaixo do mínimo 95 |
| CURRENT OPEN P0 | 19 no gate diagnóstico; provas externas permanecem ausentes |
| CURRENT CI | [#34567116409](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34567116409): 15/16 jobs aprovados; somente Performance (k6 SLOs) falhou |
| CURRENT LOCAL PERFORMANCE | O k6 local histórico 4/9 não é transferido; o runner PostgreSQL local passou 3/3 |
| CURRENT VERDICT | BLOCKED / NOT PROVEN |

O run [34563112372](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34563112372) e o score 72/60/14 anteriores permanecem históricos de outro SHA. O run atual falhou somente em performance; thresholds não foram relaxados. O runner local novo passou os três cenários PostgreSQL, mas não substitui target, autoridade ou o score do quality bar. O estado e a cadeia de identidade estão registrados em [15-current-baseline](./15-current-baseline.md) e no [EXECUTION_LOG](./EXECUTION_LOG.md).

Histórico anterior preservado em [scorecard-history](./scorecard-history/2026-09-10-before-b85b03ea-13-final-scorecard.md).
