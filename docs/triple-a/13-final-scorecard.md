# Triple-A — Current Scorecard

| Campo              | Estado                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| CURRENT SNAPSHOT   | `c7336ac0f6a909c10d07797c36814f0b321c6d5c`                                                                                          |
| MAIN / ORIGIN      | Coincidem; fast-forward/reversível; sem force-push                                                                                  |
| CURRENT CI         | [#135](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34663821242): `failure`; 15/16 jobs verdes; Performance falhou |
| LOCAL STRICT GATE  | `BLOCKED`, score `50`, critical `46`, open P0 `19`, `publication_allowed=false`                                                     |
| FROZEN QUALITY BAR | mínimo `97`, crítico `95`, máximo `0` P0                                                                                            |
| LOCAL VALIDATION   | testes, lint, typecheck, build, security/docs/supply chain e backup estático: PASS; E2E clínico `2/2`                               |
| VERIFIED TARGET    | `NOT PROVEN`                                                                                                                        |
| CURRENT VERDICT    | **BLOCKED / NOT PROVEN**                                                                                                            |

O score não é uma média permissiva: os gates externos ausentes e a falha de
Performance continuam bloqueando a certificação. O diagnóstico k6 foi
adicionado para atribuir a próxima falha sem relaxar os thresholds.

Não são emitidos `main green`, release produtivo ou `TRIPLE-A VERIFIED`.
Limitações operacionais, humanas, de target e de governança estão detalhadas
em [`17-current-execution-evidence.md`](./17-current-execution-evidence.md).

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Problema           | Resumir qualidade por domínio sem esconder P0 ou converter ausência em PASS.                               |
| Estado anterior    | Scorecards anteriores apontavam para SHAs e CIs já superados.                                              |
| Decisão            | Recalcular e publicar somente o snapshot `c7336ac0`; manter `BLOCKED`.                                     |
| Implementação      | Gate strict, scorecard current, execution evidence e pacote de envelopes.                                  |
| Arquivos alterados | `scripts/run-triple-a-release-gate.mjs`, `scripts/generate-triple-a-evidence-package.mjs`, docs correntes. |
| Testes             | Gate local, docs, testes workspace e contratos de evidência.                                               |
| Evidências         | `50/46/19`, CI #135 e `artifacts/triple-a/index.json` local.                                               |
| Riscos residuais   | Nenhum score autoriza release enquanto houver P0, SLO falho ou target sem prova.                           |
