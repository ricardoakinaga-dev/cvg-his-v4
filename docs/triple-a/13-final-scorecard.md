# Triple-A — Current Scorecard

| Campo              | Estado                                                                                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CURRENT SNAPSHOT   | candidato funcional `cef206bf4600c3fdb1dbf428ef37e407abaf4996`; identidade canônica em `CURRENT_CANDIDATE_IDENTITY.json`; registro P0 candidate-bound; importador do evidence graph com validação de envelope, frescor, ancestralidade, ambiente e digest; nenhum envelope local é promovido a PASS; históricos não são transferidos |
| MAIN / ORIGIN      | `origin/main@cef206bf4600c3fdb1dbf428ef37e407abaf4996`; o commit publicado implementa verificação criptográfica WebAuthn/FIDO2 e configuração autoritativa de RP/origens, sem force-push |
| CURRENT CI         | [CI #35300563062](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35300563062) está `in_progress` no SHA exato; [State of Art Closure #35300563044](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35300563044) terminou `success`, mas não substitui os gates externos |
| LOCAL STRICT GATE  | R05-010 e SQL local `PASS`; release/Triple-A continuam `NOT_PROVEN`, `claim=NOT PROVEN`, `publication_allowed=false` |
| FROZEN QUALITY BAR | mínimo `97`, crítico `95`, máximo `0` P0                                                                                                                                                                                                                  |
| LOCAL VALIDATION   | Migration-source PASS; integração efêmera `105/105` arquivos e `933/933` testes; WebAuthn FIDO2 `14/14`, configuração `47/47`, MFA `66/66`, rotas nativas `47/47` e typechecks MFA/API PASS; a validação local não prova CI exato, target, recovery, UAT, attestation ou autoridade |
| VERIFIED TARGET    | `NOT PROVEN`                                                                                                                                                                                                                                              |
| CURRENT VERDICT    | **BLOCKED / NOT PROVEN**; o CI exato está em execução e target, recovery, UAT, attestation, governança e autoridade externa continuam sem prova |

O snapshot corrente preserva a régua congelada e reancora o manifesto crítico
na revisão 79. O registro P0 adiciona deduplicação, dependências, classificação
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
| Decisão            | Reancorar o snapshot no candidato `5998287d3865`, registrar a leitura O(1) do token de ACL com versionamento monotônico transacional e aguardar CI terminal vinculado, mantendo `BLOCKED` sem relaxar SLOs ou provas externas. |
| Implementação      | Fixtures k6 tenant-safe, companions obrigatórios de evidência, override explícito fail-closed, contexto JWT somente para roteamento antes da guarda autoritativa e invalidation token de ACL candidate-bound. |
| Arquivos alterados | `benchmarks/k6/*`, `scripts/generate-triple-a-evidence-package.*`, `tests/unit/infra/performance-gate-contract.test.ts`, `.github/workflows/ci.yml`, docs correntes. |
| Testes             | Gate local completo, API `619/619`, integração PostgreSQL `16/16`, typecheck/API build, seed idempotente, k6 local `9/9`, visual local `29/29`, suíte crítica local validada. |
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
