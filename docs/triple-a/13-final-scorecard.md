# Triple-A — Current Scorecard

| Campo              | Estado                                                                                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CURRENT SNAPSHOT   | candidato de código `9b77215290d3ea6d506d558ae211e567debe161a` (hardening conjunto de logging, workflow e tenant); snapshot documental anterior `0d475dee358eab9621e5497db9929b7010ed09eb`                                                                                                                                           |
| MAIN / ORIGIN      | `HEAD == main == origin/main`; rollback preservado, sem force-push                                                                                                                                                                                        |
| CURRENT CI         | [CI #155](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34695557227) pertence ao commit documental anterior e não é promovido; a nova execução vinculada ao snapshot `a258b3ce` está pendente. |
| LOCAL STRICT GATE  | `BLOCKED`, score `55`, critical `57`, open P0 `15`, `publication_allowed=false`, executado no HEAD documental `c1059e6c`                                                                                                                                  |
| FROZEN QUALITY BAR | mínimo `97`, crítico `95`, máximo `0` P0                                                                                                                                                                                                                  |
| LOCAL VALIDATION   | Vitest de contrato `5/5`, docs/diff/Prettier PASS, seed `2/2`, k6 descartável `9/9` SLOs sob 2 CPUs com `GOMAXPROCS=1`; target externo ausente                                                                                                            |
| VERIFIED TARGET    | `NOT PROVEN`                                                                                                                                                                                                                                              |
| CURRENT VERDICT    | **BLOCKED / NOT PROVEN**                                                                                                                                                                                                                                  |

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
| Decisão            | Reancorar o snapshot no candidato de código `a258b3ce`, registrar o hardening de logging e aguardar CI terminal vinculado, mantendo `BLOCKED` sem relaxar SLOs ou provas externas.                    |
| Implementação      | Fixtures k6 tenant-safe, companions obrigatórios de evidência e override explícito fail-closed.                                                                      |
| Arquivos alterados | `benchmarks/k6/*`, `scripts/generate-triple-a-evidence-package.*`, `tests/unit/infra/performance-gate-contract.test.ts`, `.github/workflows/ci.yml`, docs correntes. |
| Testes             | Gate local completo, Vitest focado `38/38`, Node `8/8`, seed idempotente `2/2`, k6 local `9/9`, suíte crítica `615 + 11`.                                            |
| Evidências         | `55/57/15`, `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` local bloqueado, critical local `615 + 11` e k6 descartável vinculado ao banco local.                 |
| Riscos residuais   | Nenhum score autoriza release enquanto houver P0, SLO falho ou target sem prova.                                                                                     |
