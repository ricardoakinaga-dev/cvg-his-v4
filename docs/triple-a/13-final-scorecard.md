# Triple-A — Current Scorecard

| Campo              | Estado                                                                                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CURRENT SNAPSHOT   | candidato `973d70b48827eaf67e0cf529b055046f8c4308fb`; identidade canônica em `CURRENT_CANDIDATE_IDENTITY.json`; registro P0 candidate-bound; Noto Sans e rasterização de texto determinísticos nos gates E2E/visual; orçamento de `server.ts` em `8.335` linhas; evidência SQL legada corrigida; históricos não são transferidos |
| MAIN / ORIGIN      | a `main` remota está publicada via Git Data API sem force-push, com o candidato funcional `836b8b76b957`; `origin/fix/state-of-art-ci-assurance@fe5406c2` é ancestral sem commits funcionais exclusivos, rollback preservado |
| CURRENT CI         | O [CI #238](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35248052991) iniciou no candidato anterior e falhou na cobertura global por um teste Node nativo incluído indevidamente no sweep do Vitest; o candidato corrigido será reavaliado por um novo CI exato |
| LOCAL STRICT GATE  | cobertura global local `PASS` no threshold congelado; release/critical externo continuam `NOT_PROVEN`, `claim=NOT PROVEN`, `publication_allowed=false` |
| FROZEN QUALITY BAR | mínimo `97`, crítico `95`, máximo `0` P0                                                                                                                                                                                                                  |
| LOCAL VALIDATION   | Neste candidato, typecheck e lint do workspace passaram em `68/68` projetos; module-feature-flags passou `10/10` testes, os testes focados da API passaram `19/19` e a cobertura global passou `274/274` arquivos/testes com `82,00%` branches; manifesto revision 71, identidade, registro P0 e complexity de `8.335` linhas foram validados. A cobertura API `618/618`, integração PostgreSQL `16/16`, SQL `34/34`, visual `29/29` e k6 local `9/9` permanecem evidências locais/históricas anteriores; target externo ausente |
| VERIFIED TARGET    | `NOT PROVEN`                                                                                                                                                                                                                                              |
| CURRENT VERDICT    | **BLOCKED / NOT PROVEN**; o CI exato do candidato ainda não está verde, o último run terminal falhou em performance e target, recovery, UAT e autoridade externa continuam sem prova |

O snapshot corrente preserva a régua congelada e reancora o manifesto crítico
na revisão 71. O registro P0 adiciona deduplicação, dependências, classificação
de execução e fechamento candidate-bound ao gate de release. O CI #190 detectou a rejeição de inicializadores V8 legítimos do
Node 22 e a ausência do produtor SQL; os CI #191/#192 confirmaram a correção no
Critical Coverage Gate dos ancestrais. O CI #196 confirmou o Critical Coverage
Gate no snapshot anterior, mas terminou com falhas em E2E SPA, Performance/k6 e
Visual Regression. O candidato `95227098` preserva a remoção da leitura
redundante de sessão introduzida em `15ba86a8`, restaura o fail-closed 503 para
erros genéricos do único carregamento autoritativo e mantém `server.ts` dentro do
orçamento físico congelado; a checagem criptográfica
síncrona só fornece contexto de roteamento, e a guarda final permanece
autoritativa. O CI #198 foi terminalmente reprovado e o #199 falhou no guard de
complexidade; nenhum dos dois é evidência do candidato documental `fa877475`,
que precisa de uma execução exata após a publicação do candidato visual
`a4f2ef67`.

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
| Decisão            | Reancorar o snapshot no candidato `e54a4374`, registrar a correção fail-closed `95227098` e aguardar CI terminal vinculado, mantendo `BLOCKED` sem relaxar SLOs ou provas externas. |
| Implementação      | Fixtures k6 tenant-safe, companions obrigatórios de evidência, override explícito fail-closed e contexto JWT somente para roteamento antes da guarda autoritativa. |
| Arquivos alterados | `benchmarks/k6/*`, `scripts/generate-triple-a-evidence-package.*`, `tests/unit/infra/performance-gate-contract.test.ts`, `.github/workflows/ci.yml`, docs correntes. |
| Testes             | Gate local completo, API `618/618`, integração PostgreSQL `16/16`, typecheck/API build, seed idempotente, k6 local `9/9`, visual local `29/29`, suíte crítica local validada. |
| Evidências         | `55/57/15`, `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` local bloqueado, manifesto revision 56, complexity `8.335` e k6 descartável vinculado ao banco local.                 |
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
