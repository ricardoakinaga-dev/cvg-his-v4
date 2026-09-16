# Triple-A — Current Scorecard

| Campo              | Estado                                                                                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CURRENT SNAPSHOT   | candidato funcional/controlador `cb540acd2f88b835943caa7dfbdd6d5d24422d47`; identidade canônica em `CURRENT_CANDIDATE_IDENTITY.json`; históricos não são transferidos |
| MAIN / ORIGIN      | `HEAD/main@cb540acd`; `origin/main@502da453` até publicação; rollback preservado, sem force-push |
| CURRENT CI         | `NOT_FOUND` para o SHA exato; [CI #35045015515](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35045015515) pertence ao candidato anterior e falhou na provisão APT; não é promovido |
| LOCAL STRICT GATE  | `BLOCKED`, score `52`, critical `51`, open P0 `17`, `claim=NOT PROVEN`, `publication_allowed=false`, com `commitSha=cb540acd` |
| FROZEN QUALITY BAR | mínimo `97`, crítico `95`, máximo `0` P0                                                                                                                                                                                                                  |
| LOCAL VALIDATION   | Typecheck/lint PASS; contratos focados `46/46`; identity/graph `3/3`; E2E clínico browser `4/4`; visual `29/29` PASS e 1 especializado skipped; coverage `2.661` testes abaixo do limiar; target externo ausente |
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
| Decisão            | Reancorar o snapshot no candidato de código `e605597c`, registrar os pins imutáveis e aguardar CI terminal vinculado, mantendo `BLOCKED` sem relaxar SLOs ou provas externas.                    |
| Implementação      | Fixtures k6 tenant-safe, companions obrigatórios de evidência e override explícito fail-closed.                                                                      |
| Arquivos alterados | `benchmarks/k6/*`, `scripts/generate-triple-a-evidence-package.*`, `tests/unit/infra/performance-gate-contract.test.ts`, `.github/workflows/ci.yml`, docs correntes. |
| Testes             | Gate local completo, Vitest focado `38/38`, Node `8/8`, seed idempotente `2/2`, k6 local `9/9`, suíte crítica `615 + 11`.                                            |
| Evidências         | `55/57/15`, `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` local bloqueado, critical local `615 + 11` e k6 descartável vinculado ao banco local.                 |
| Riscos residuais   | Nenhum score autoriza release enquanto houver P0, SLO falho ou target sem prova.                                                                                     |

## Atualização do candidato funcional — 2026-09-16T01:54:02Z

O candidato `cb540acd` endurece a provisão do runtime crítico de coverage: a
resolução APT usa somente os archives oficiais e assinados do Ubuntu 22.04,
sem depender de índices de terceiros do runner. O upload de diagnóstico deixa
de falhar secundariamente quando a provisão aborta. A alteração passou o
contrato CI `19/19`, parse YAML, sintaxe shell e lint local. A nova execução
remota ainda não foi publicada; o veredicto permanece `BLOCKED / NOT PROVEN`.
