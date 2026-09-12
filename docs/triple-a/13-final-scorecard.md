# Triple-A — Current Scorecard

| Campo              | Estado                                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CURRENT SNAPSHOT   | candidato de código/documentação `56a18736d7870033c11fb263f68fba98c4b739fc`                                                                                                                                                                                                                                                                            |
| MAIN / ORIGIN      | `HEAD == main == origin/main`; rollback preservado, sem force-push                                                                                                                                                                                                                                                                                     |
| CURRENT CI         | [#143](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34678150409) pertence ao pai `82ff6eec` e terminou `failure` somente em Performance/k6; [#144](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34680215070) falhou no `Repository Guards` do pai documental `da5dd244`; não há ainda prova CI exata para `56a18736` |
| LOCAL STRICT GATE  | `BLOCKED`, score `55`, critical `57`, open P0 `15`, `publication_allowed=false`, executado no pai `82ff6eec`                                                                                                                                                                                                                                           |
| FROZEN QUALITY BAR | mínimo `97`, crítico `95`, máximo `0` P0                                                                                                                                                                                                                                                                                                               |
| LOCAL VALIDATION   | checks/build/testes executados; contratos `33/33`, Node `8/8`, seed `2/2`, k6 descartável `9/9` SLOs, critical `615 + 11` PASS; target externo ausente                                                                                                                                                                                                 |
| VERIFIED TARGET    | `NOT PROVEN`                                                                                                                                                                                                                                                                                                                                           |
| CURRENT VERDICT    | **BLOCKED / NOT PROVEN**                                                                                                                                                                                                                                                                                                                               |

O score não é uma média permissiva: os gates externos ausentes e o CI remoto do
novo SHA continuam bloqueando a certificação. Os thresholds não foram relaxados
e o pacote local permanece fail-closed.

Não são emitidos `main green`, release produtivo ou `TRIPLE-A VERIFIED`.
Limitações operacionais, humanas, de target e de governança estão detalhadas
em [`17-current-execution-evidence.md`](./17-current-execution-evidence.md).

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Problema           | Resumir qualidade por domínio sem esconder P0 ou converter ausência em PASS.                                                                                         |
| Estado anterior    | Scorecards anteriores apontavam para SHAs e CIs já superados.                                                                                                        |
| Decisão            | Recalcular o candidato `56a18736`; manter `BLOCKED` porque não há CI exata verde e as provas externas continuam ausentes.                                            |
| Implementação      | Fixtures k6 tenant-safe, companions obrigatórios de evidência e override explícito fail-closed.                                                                      |
| Arquivos alterados | `benchmarks/k6/*`, `scripts/generate-triple-a-evidence-package.*`, `tests/unit/infra/performance-gate-contract.test.ts`, `.github/workflows/ci.yml`, docs correntes. |
| Testes             | Gate local completo, Vitest `33/33`, Node `8/8`, seed idempotente `2/2`, k6 local `9/9`, suíte crítica `615 + 11`.                                                   |
| Evidências         | `55/57/15`, `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` local bloqueado, critical local `615 + 11` e k6 descartável vinculado ao banco local.                 |
| Riscos residuais   | Nenhum score autoriza release enquanto houver P0, SLO falho ou target sem prova.                                                                                     |
