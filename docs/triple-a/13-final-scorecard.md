# Triple-A — Current Scorecard

| Campo | Estado |
| --- | --- |
| CURRENT CODE CANDIDATE | "main@5a079ceca57b246e17ecb0214ed1e2b9e9e23500"; branch de origem preservada em `fix/state-of-art-ci-assurance` para rollback |
| DOCUMENTATION SNAPSHOT | Reconciliação do CI terminal do candidato funcional; o commit desta atualização é metadata-only |
| CURRENT SCORE | 56 no gate diagnóstico pós-fix; BLOCKED / NOT PROVEN |
| CURRENT CRITICAL SCORE | 32 no gate diagnóstico pós-fix; abaixo do mínimo 95 |
| CURRENT OPEN P0 | 15 no gate diagnóstico pós-fix; provas externas permanecem ausentes |
| CURRENT CI | [#34577711985](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34577711985): 15/16 jobs aprovados; somente Performance (k6 SLOs) falhou |
| CURRENT LOCAL PERFORMANCE | Reprodução local do perfil operacional passou 9/9 SLOs; o CI pinned falhou e o resultado local não é transferido |
| CURRENT VERDICT | BLOCKED / NOT PROVEN |

O run #101 atual falhou somente em performance; thresholds não foram relaxados. O runner local passou os três cenários PostgreSQL, e a suíte workspace completa passou, mas nenhuma dessas provas substitui target, autoridade ou o score do quality bar. O novo envelope de provenance acompanha o artefato k6. O estado e a cadeia de identidade estão registrados em [15-current-baseline](./15-current-baseline.md) e no [EXECUTION_LOG](./EXECUTION_LOG.md).

Histórico anterior preservado em [scorecard-history](./scorecard-history/2026-09-10-before-b85b03ea-13-final-scorecard.md).
