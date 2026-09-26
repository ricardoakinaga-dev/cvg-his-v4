# Triple-A — Current Scorecard

## Scorecard local do candidato — 2026-09-21

| Campo | Estado |
| --- | --- |
| CURRENT SNAPSHOT | `e26fe603741ff066402bd36e8be535d267b34bfc` — rebind de 26/09/2026 para o candidato da rodada 2; nenhuma evidência de execução foi refeita neste SHA (status BLOCKED / NOT PROVEN). As evidências registradas pertencem a `d9a16cf45898` — mapeamento em `evidence/sha-remap-20260926.json` |
| CURRENT VERDICT | LOCAL_COMPLETE / EXTERNAL_BLOCKED; Triplo AAA BLOCKED / NOT PROVEN |
| SCORE | 72/100 (entrada 53/100; delta +19) |
| P0 | 11 abertos; nenhum aceite externo presumido |

Gates locais: catálogo do worker limitado a 1.000 contas por processo; supply-chain 17/17, dependências, segredos, segurança,
backup/restore documental, upload/observabilidade, Helm 3.15.4, qualidade,
PostgreSQL crítico 623/623, 11/11 processos, SPA E2E 424/424 e imagens
production-shaped passam no candidato. CI/release externo, registry/attestation,
target, UAT e autoridade continuam `NOT_PROVEN`.

O registro mantém **11 P0 abertos** e a certificação permanece **BLOCKED / NOT
PROVEN** por CI exato, target, recuperação, UAT e autoridade.

Detalhes, hashes e limites: [evidência local](evidence/local-candidate-51982f48.json), [remediação dos P0](30-p0-remediation-20260918.md) e [avaliação por critério](evidence/p0-remediation-20260918.json). **Certificação Triplo AAA: BLOCKED / NOT PROVEN.**

---

## Fotografia histórica — consolidação anterior de 2026-09-18

| Campo | Estado |
| --- | --- |
| CURRENT SNAPSHOT | `51391915eb165a9b99e33682d0ab557f6263cb2a` |
| CURRENT VERDICT | **BLOCKED / NOT PROVEN** para certificação Triplo AAA |
| MAIN / ORIGIN | Somente main; nova fonte descendente de `47ba9c54`; CI final pendente |
| LOCAL VALIDATION | Contratos6/6; equivalência63/63; k6 local9/9, query p9520ms |

A consolidação Git está concluída: somente main permanece localmente e no
GitHub, com histórico anterior em bundle verificado. O runtime da aplicação
permanece na fonte `d8d8b821`; a mudança atual corrige a execução do benchmark.

O [CI 35352873670](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35352873670)
do predecessor `47ba9c54` terminou com **16/17 jobs aprovados**, incluindo
cobertura crítica, global **2.932 testes/82,03% de branches**, **619 testes de
integração**, E2E, visual, API, Windows, build, tipos, lint e segurança.
Performance falhou: query p95 **184,8ms**, API p95 **207,65ms**, contra150/200ms.
A correção do encerramento de fixtures PostgreSQL foi confirmada no CI.

O candidato usa `response.json()` nativo do k6 para interpretar o corpo completo
do OpenAPI, mantendo o mesmo predicado, pedidos, dados, estágios e limites.
O teste nativo de equivalência passou **63/63 verificações**; os contratos
passaram **6/6**. A crítica independente aprovou a preservação do instrumento e
verificou propagação de falhas, encerramento e fingerprints sem alterações.

A reprodução anterior de quatro CPUs usava `GOMAXPROCS=4`; o CI usa1. Na nova
comparação controlada, ambos os casos usam quatro CPUs, `GOMAXPROCS=1`, seed
novo e profiler de180s: query p95 **102→20ms**, API **102,79→17,77ms**,
**3.421→4.516 iterações**, CPU do gerador **116,86→66,06s**. Ambos passaram9/9
localmente; esses resultados explicam o custo removido, sem provar o CI remoto.
A configuração do gerador agora consta na proveniência antes/depois. O CI final
exato e sem profiler permanece pendente na publicação deste registro.

[Relatório atual, decisões por branch e limitações](./29-main-unification-20260918.md).
Manifesto crítico revision85, ancorado no candidato acima, com os quatro novos
inputs de execução registrados. Os555 caminhos de fonte e thresholds não
mudaram. Target, UAT, recuperação, attestations e autoridade de release
continuam sem prova suficiente; não há certificação AAA.

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
