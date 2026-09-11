# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT CODE CANDIDATE | "main@fe5406c23c515585629060e0dc01b91f2d113d65" após merge fast-forward; branch de origem preservada para rollback |
| DOCUMENTATION SNAPSHOT | Esta reconciliação é um commit documental posterior; o SHA final do branch deve receber CI novo antes do release |
| CURRENT SCORE | NOT PROVEN — o gate estrito não autoriza release |
| CURRENT CRITICAL SCORE | NOT PROVEN |
| CURRENT OPEN P0 | NOT PROVEN — envelope de release atual não foi gerado |
| CURRENT CI | [#34556230892](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34556230892): 15/16 jobs aprovados; somente Performance (k6 SLOs) falhou |
| CURRENT LOCAL PERFORMANCE | 9/9 SLOs em PostgreSQL/Redis efêmeros locais; não substitui CI ou ambiente alvo |
| CURRENT VERDICT | BLOCKED / NOT PROVEN |

O run [34551458338](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34551458338) foi verde em checkout anterior e permanece explicitamente histórico. O relatório remoto atual aponta variância de contenção; os thresholds não foram relaxados. O merge, a origem e a cadeia de identidade estão registrados em [15-current-baseline](./15-current-baseline.md) e no [EXECUTION_LOG](./EXECUTION_LOG.md).

Histórico anterior preservado em [scorecard-history](./scorecard-history/2026-09-10-before-b85b03ea-13-final-scorecard.md).
