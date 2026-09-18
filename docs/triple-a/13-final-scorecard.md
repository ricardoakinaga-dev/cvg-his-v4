# Triple-A — Current Scorecard

## Consolidação atual — 2026-09-18

| Campo | Estado |
| --- | --- |
| CURRENT SNAPSHOT | `96e9a2c46bad4d40be468261fab277f8463190ec` |
| CURRENT VERDICT | **BLOCKED / NOT PROVEN** para certificação Triplo AAA |
| MAIN / ORIGIN | Somente main; nova fonte descendente de `6e724d07`; CI final pendente |
| LOCAL VALIDATION | Global 2932/82,03%; API nativa 679/679; k6 9/9, query p95 29ms |

A consolidação Git está concluída: somente main permanece localmente e no
GitHub, com histórico anterior em bundle verificado. O runtime da aplicação
segue a fonte `d8d8b821`; os reparos de OpenAPI, WebAuthn, auditoria e métricas
preservam ordem, retenção, persistência e controles de acesso.

O [CI 35349067677](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35349067677)
do predecessor `0d0ea920` aprovou performance **9/9 SLOs, query p95 137ms**,
cobertura global **2.932 testes/82,03% de branches**, build, controles do
repositório, tipos, lint, segurança, unitários, contratos da API, Windows,
regressão visual, E2E e cobertura crítica. Integração teve 618 asserções aprovadas,
mas uma exceção
PostgreSQL57P01 no encerramento de um banco privado reprovou o job.

O candidato atual corrige apenas os fixtures de bootstrap/instalação que
encerravam conexões à força antes do fechamento real. Os dois arquivos passaram
18/18 testes com PostgreSQL real. Uma revisão independente reproduziu e corrigiu
um problema de cleanup na nova regressão; confirmou isolamento, propagação de
erros e espera por desconexão sem exceções órfãs. A validação local anterior do
mesmo runtime passou API nativa679/679 e benchmark de quatro CPUs9/9/query29ms;
essas evidências locais não substituem o CI final.

[Relatório atual, decisões por branch e limitações](./29-main-unification-20260918.md).
Manifesto crítico revision84, ancorado no candidato acima e registrando o novo
helper de execução dos testes. Os 555 caminhos de fonte, os thresholds e o
workload permanecem inalterados. Ambas as identidades serão novamente validadas
sobre o commit documental concluído antes do push; o CI final será observado
após a publicação. Target, UAT, recuperação operacional, attestations e
autoridade de release continuam sem prova suficiente; não há certificação AAA.

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
