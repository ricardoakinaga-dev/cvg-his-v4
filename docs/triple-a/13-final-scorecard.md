# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT CODE CANDIDATE | "main@4ca6e79364d892444dc29d9f2b1a2004300b6ab6"; branch de origem preservada em `fix/state-of-art-ci-assurance` para rollback |
| DOCUMENTATION SNAPSHOT | Esta reconciliação registra o CI terminal do SHA atual e a evidência local fail-closed |
| CURRENT SCORE | 72 no gate local estrito; BLOCKED / NOT PROVEN |
| CURRENT CRITICAL SCORE | 60 no gate local estrito; abaixo do mínimo 95 |
| CURRENT OPEN P0 | 14 no gate local estrito; provas externas permanecem ausentes |
| CURRENT CI | [#34560856450](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34560856450): 15/16 jobs aprovados; somente Performance (k6 SLOs) falhou |
| CURRENT LOCAL PERFORMANCE | 4/9 SLOs no runner local; erros HTTP 0% e disponibilidade 100%; não substitui CI ou ambiente alvo |
| CURRENT VERDICT | BLOCKED / NOT PROVEN |

O run [34551458338](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34551458338) foi verde em checkout anterior e permanece explicitamente histórico. O run atual falhou somente em performance; os thresholds não foram relaxados. O merge, a origem e a cadeia de identidade estão registrados em [15-current-baseline](./15-current-baseline.md) e no [EXECUTION_LOG](./EXECUTION_LOG.md).

Histórico anterior preservado em [scorecard-history](./scorecard-history/2026-09-10-before-b85b03ea-13-final-scorecard.md).
