# Triple-A — Current Scorecard

| Campo              | Estado                                                                                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CURRENT SNAPSHOT   | candidato funcional/controlador `f09e79fd275b942b3d9dcd087105faf54403a058`; identidade canônica em `CURRENT_CANDIDATE_IDENTITY.json`; históricos não são transferidos |
| MAIN / ORIGIN      | `HEAD/main@6b7c1cec`; `origin/main@6b7c1cec`; descendente documental do candidato funcional, rollback preservado, sem force-push |
| CURRENT CI         | [CI #178](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35056933106) `failure` no `main@6b7c1cec`; coverage crítico/geral, unidade, k6, visual e SPA E2E falharam |
| LOCAL STRICT GATE  | último artefato estrito `BLOCKED`, score `51`, critical `49`, open P0 `18`, `claim=NOT PROVEN`, `publication_allowed=false`, executado no candidato anterior `358e546e`; não promovido para `f09e79fd` |
| FROZEN QUALITY BAR | mínimo `97`, crítico `95`, máximo `0` P0                                                                                                                                                                                                                  |
| LOCAL VALIDATION   | Typecheck/lint PASS; contratos focados `46/46`; identity/graph `3/3`; E2E SPA Docker `424/424` PASS no `HEAD`, zero skipped, evidência SHA-bound válida; cobertura anterior `2.661` testes abaixo do limiar; target externo ausente |
| VERIFIED TARGET    | `NOT PROVEN`                                                                                                                                                                                                                                              |
| CURRENT VERDICT    | **BLOCKED / NOT PROVEN**                                                                                                                                                                                                                                  |

O score não é uma média permissiva: os gates externos ausentes e as falhas do CI
remoto vinculadas ao reancoramento continuam bloqueando a certificação. Os thresholds não foram relaxados
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

## Atualização do candidato funcional — 2026-09-16T03:01:37Z

O candidato `358e546e` mantém a provisão isolada do runtime crítico de coverage
e alinha o guard de backup/restore ao formato atual do roadmap (`R6`) e backlog
(`PROD-037`), preservando compatibilidade com o formato histórico (`M4`/`AAA-037`).
O contrato CI `19/19`, o check de backup/restore `4/4`, o manifesto crítico
`16/16` e o refresh `9/9` passaram localmente; o gate estrito permanece
`BLOCKED / NOT PROVEN`.

O CI #175 confirmou os guards de repositório, contratos de API, unidade,
integração e contrato Windows, mas terminou com falha em coverage crítico,
coverage geral, Performance/k6, Visual Regression e E2E SPA. A evidência remota
é registrada sem transferir aprovação histórica.
