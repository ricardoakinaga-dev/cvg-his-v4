# Triple-A — Current Scorecard

## Consolidação atual — 2026-09-18

| Campo | Estado |
| --- | --- |
| CURRENT SNAPSHOT | `17b584bb6f0288b47d9c89a62fc2246387809f51` |
| CURRENT VERDICT | **BLOCKED / NOT PROVEN** para certificação Triplo AAA |
| MAIN / ORIGIN | Candidato descendente de `97d22de0`; publicação e CI remoto pendentes neste registro |
| LOCAL VALIDATION | Unitário crítico 2965/2965; API nativa 679/679; k6 9/9, query p95 79ms |

A revisão de todas as branches confirmou que os deltas úteis já estavam na
main canônica. O candidato corrige os testes de fallback OpenAPI e de assinatura
WebAuthn, cobre erros/filtros reais e reutiliza a serialização do documento
OpenAPI. Build, tipos, lint, segredos, 2.965 testes unitários críticos, 679 testes
nativos da API e os nove SLOs do perfil local de 60 VUs passaram. A confirmação
sem profiler mediu query p95 de 79ms, abaixo de 150ms. A cobertura global de
82,01% foi coletada antes da otimização; o CI exato repetirá os gates completos.

[Relatório atual, decisões por branch e limitações](./29-main-unification-20260918.md).
Manifesto crítico revision82; escopo, thresholds e workload preservados.
O último CI inspecionado é o [35311529944](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35311529944),
que pertence à baseline97d22de0 e falhou em cobertura global/crítica e performance.
O resultado remoto do novo candidato ainda não existe no momento deste registro.

Target, UAT, recuperação operacional, attestations e autoridade de release
continuam sem prova suficiente; não há declaração de certificação Triplo AAA.

## Registro histórico anterior

As seções abaixo preservam observações de candidatos anteriores. Referências a
“corrente”, “mais recente” ou “PASS” nessas seções valem para suas datas e SHAs;
o relatório acima é a fotografia atual.

| Campo              | Estado                                                                                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CURRENT SNAPSHOT   | candidato funcional `0a2eba022fac4b1100138e1ad17cab87f8d049c8`; identidade canônica em `CURRENT_CANDIDATE_IDENTITY.json`; nenhum envelope local é promovido a PASS |
| MAIN / ORIGIN      | fast-forward de `origin/main` para o candidato integrado `0a2eba022fac4b1100138e1ad17cab87f8d049c8`, com pai publicado `e011cfd2e47a8a8290b26b5c6328750d71586c95`; sem force-push |
| CURRENT CI         | [CI #282](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35306907606) é o terminal mais recente e terminou `failure`: `Critical Coverage Gate` e `Performance (k6 SLOs)` falharam; o CI do candidato integrado ficará pendente após o push |
| LOCAL STRICT GATE  | R05-010 e SQL local `PASS`; release/Triple-A continuam `NOT_PROVEN`, `claim=NOT PROVEN`, `publication_allowed=false` |
| FROZEN QUALITY BAR | mínimo `97`, crítico `95`, máximo `0` P0                                                                                                                                                                                                                  |
| LOCAL VALIDATION   | Build, DB `36/36`, auth `72/72`, API `620/620`, reexport `17/17`, SQL evidence `6/6`, identidade/P0/docs/prompt e manifesto revision 81 PASS; a validação local não prova CI exato, target, recovery, UAT, attestation ou autoridade |
| VERIFIED TARGET    | `NOT PROVEN`                                                                                                                                                                                                                                              |
| CURRENT VERDICT    | **BLOCKED / NOT PROVEN**; o CI exato terminou com dois gates rejeitados e target, recovery, UAT, attestation, governança e autoridade externa continuam sem prova |

O snapshot corrente preserva a régua congelada e reancora o manifesto crítico
na revisão 81. O registro P0 adiciona deduplicação, dependências, classificação
de execução e fechamento candidate-bound ao gate de release. A reconciliação de
branches incorporou somente os deltas auth/health/teste comprovados; a migração
alternativa de ACL e evidências reancoradas obsoletas ficaram fora. O CI #190 detectou a rejeição de inicializadores V8 legítimos do
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
A observação terminal anterior está preservada em
[`25-remote-ci-35304185255.md`](./25-remote-ci-35304185255.md). A evidência
current do CI #282 está em
[`26-remote-ci-35306907606.md`](./26-remote-ci-35306907606.md), e a matriz
visual local cross-browser em
[`27-local-visual-matrix-20260918.md`](./27-local-visual-matrix-20260918.md).

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
