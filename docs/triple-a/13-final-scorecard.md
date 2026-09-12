# Triple-A — Current Scorecard

| Campo              | Estado                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| CURRENT SNAPSHOT   | candidato funcional `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`                                                  |
| MAIN / ORIGIN      | Coincidem; fast-forward/reversível; sem force-push                                                              |
| CURRENT CI         | [#137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200): `success`; 16/16 jobs verdes |
| LOCAL STRICT GATE  | `BLOCKED`, score `54`, critical `54`, open P0 `16`, `publication_allowed=false`                                 |
| FROZEN QUALITY BAR | mínimo `97`, crítico `95`, máximo `0` P0                                                                        |
| LOCAL VALIDATION   | checks, build, contratos de evidência, readiness fail-closed e E2E clínico `2/2`: PASS; target externo ausente  |
| VERIFIED TARGET    | `NOT PROVEN`                                                                                                    |
| CURRENT VERDICT    | **BLOCKED / NOT PROVEN**                                                                                        |

O score não é uma média permissiva: os gates externos ausentes continuam
bloqueando a certificação, mesmo com o CI #137 verde. Os thresholds não foram
relaxados e o pacote local permanece fail-closed.

Não são emitidos `main green`, release produtivo ou `TRIPLE-A VERIFIED`.
Limitações operacionais, humanas, de target e de governança estão detalhadas
em [`17-current-execution-evidence.md`](./17-current-execution-evidence.md).

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Problema           | Resumir qualidade por domínio sem esconder P0 ou converter ausência em PASS.                               |
| Estado anterior    | Scorecards anteriores apontavam para SHAs e CIs já superados.                                              |
| Decisão            | Recalcular o snapshot funcional `1e0077a3`; manter `BLOCKED` enquanto faltarem provas externas.            |
| Implementação      | Gate strict, scorecard current, execution evidence e pacote de envelopes.                                  |
| Arquivos alterados | `scripts/run-triple-a-release-gate.mjs`, `scripts/generate-triple-a-evidence-package.mjs`, docs correntes. |
| Testes             | Gate local, docs, testes workspace e contratos de evidência.                                               |
| Evidências         | `54/54/16`, CI #137 e `artifacts/triple-a/index.json` local.                                               |
| Riscos residuais   | Nenhum score autoriza release enquanto houver P0, SLO falho ou target sem prova.                           |
