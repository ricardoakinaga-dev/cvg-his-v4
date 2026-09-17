# CVG-HIS V4 — Current Assurance Report

**Candidate funcional avaliado:** `8babc6f769533ffd33ba32afed5933695d49b326`
(snapshot candidato com a correção fail-closed no commit `db154b7a`, sobre a otimização `15ba86a8`; manifesto crítico revision 54; a branch de assurance é ancestral sem commits exclusivos; a cobertura global local passou `273/273` arquivos e `2907/2907` testes com `82,00%` branches; API `618/618`, integração PostgreSQL `16/16`, k6 local `9/9` SLOs e visual local `29/29` também passaram; o CI #198 anterior terminou `failure` e não é transferido)

**Verdict:** **BLOCKED / NOT PROVEN**

## Executive Summary

O candidato preserva o modular monolith e a reconciliação fail-closed de
proveniência. A paridade de Patient e o CORS credentialado restrito foram
validados. No candidato corrente, os contratos alterados passaram, o produtor SQL
passou com PostgreSQL 16.15 e a conversão V8 do processo aceita somente o par
autenticado de inicializadores; o manifesto crítico está na revisão 54 e o
workflow publica evidência SQL antes do checker. A evidência crítica/Vue foi aceita no
Critical Coverage Gate do #196 anterior, mas E2E SPA, Performance/k6 e Visual Regression falharam; não há target, recovery,
attestation, UAT, governança, performance certificada ou autoridade de release.
Nenhum threshold ou baseline visual foi relaxado e não há autorização para declarar `main green`,
release produtivo ou `TRIPLE-A VERIFIED`.

## Validação local do candidato atual

A cobertura global passou `273` arquivos e `2.907` testes: `87,46%` statements,
`82,00%` branches, `89,32%` functions e `88,91%` lines. Lint, typecheck,
`git diff --check` e os 17 arquivos de contrato adicionados/alterados também
passaram. Isso é evidência local; não substitui CI terminal, target, recovery,
UAT, attestation ou autoridade de release. O Auth focado passou `54/54`, o
k6 local limitado a quatro CPUs passou `9/9` SLOs e a suíte visual local passou
`29/29`; isso não substitui CI terminal, target, recovery, UAT, attestation ou
autoridade de release.

## Atualização corrente — revisão 54 / snapshot `8babc6f7`

O manifest crítico revision 54 foi reancorado no commit de correção fail-closed, sem mudança de
thresholds, fontes ou aplicabilidade funcional; o snapshot corrente é
`8babc6f769533ffd33ba32afed5933695d49b326`, com implementação funcional em
`db154b7afb43f63e644d1b56ea3fb98cbdc13522`, sobre `15ba86a883a4283c5bf86c5825bf7d9a6ca5d089`. O runner crítico preserva o SQL histórico,
usa PostgreSQL 16 e trata os inicializadores V8 do Node 22 sem fundir identidades.
O produtor SQL agora é executado e publicado antes do checker. Os produtores atuais são identificados na
[`evidência corrente`](./17-current-execution-evidence.md). Os CI #191/#192
terminaram `failure` com `13/17` jobs verdes nos ancestrais, mas o Critical
Coverage Gate passou com R05-010, processo crítico, Vue especializado e
evidência SQL aceitos. A correção do teste ML e a reconciliação do inventário Vitest
inauguraram o candidato anterior. O candidato atual elimina a leitura redundante
de sessão antes da resolução de tenant, usando o JWT apenas como contexto de
roteamento e mantendo a guarda final autoritativa; a correção `db154b7a` mapeia
erros genéricos do carregamento autoritativo para 503 e ajusta o teste de
revogação para a única leitura final. O CI #198 anterior terminou `failure` e não
é transferido; o novo CI exato aguarda execução. O candidato permanece
**BLOCKED / NOT PROVEN**.

O CI #198 terminou `failure`: Repository Guards encontrou identidade stale, o
shard de integração ainda esperava a antiga segunda leitura, Critical Coverage
falhou após o relatório incompleto, E2E SPA registrou `395` passados e `29`
screenshots/usabilidade falhos, Visual Regression registrou `29` divergências e
Performance passou `8/9` SLOs por inventory p95 `227,28ms` contra `200ms`. A
correção funcional foi validada localmente, não relaxa nenhum guard, threshold ou
baseline.

## Atualização terminal — isolamento da prova clínica

O CI #146 falhou no passo de API E2E canônico depois de a suíte SPA passar. A
reprodução local com PostgreSQL real passou as duas jornadas. O workflow agora
prepara `cvg_his_e2e_canonical` e executa a API canônica em `3113`, separada do
banco mutável da suíte SPA. O contrato CI passou `18/18`; o CI #147 confirmou
essa correção em `8s`. O #148 falhou nos SLOs remotos de k6, sem alteração de
threshold. O veredito geral permanece **BLOCKED / NOT PROVEN** por performance
remota e pelos gates externos de target e release.

## Scorecard

| Área                 | Estado atual                 | Evidência                                                                                                                               |
| -------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture         | BOUNDED PASS                 | guards e contratos locais                                                                                                               |
| Security             | PARTIAL                      | SAST, secrets, dependency audit e testes locais                                                                                         |
| Testing              | PARTIAL                      | API `618/618` e integração `16/16` locais passaram; o CI #198 falhou em `29` screenshots/usabilidade, embora registrasse `395` E2E passados |
| Clinical Safety      | PARTIAL                      | matriz, invariantes e jornadas canônicas                                                                                                |
| Worker               | LOCAL PASS / target aberto   | retries, lease, fencing e DLQ                                                                                                           |
| CI/CD                | BLOQUEADO no SHA atual       | #198 terminou `failure` em Repository Guards, Critical Coverage, E2E SPA, Visual Regression e Performance; o novo snapshot aguarda execução |
| Observability        | LOCAL PASS / target aberto   | métricas, traces e diagnósticos                                                                                                         |
| Recovery             | BLOCKED                      | Docker impediu restore drill real                                                                                                       |
| Frontend             | LOCAL PASS / REMOTE PENDING  | Suíte visual local `29/29`; o runner remoto anterior registrou 29 divergências, sem baseline promovido |
| Database             | PARTIAL                      | testes locais; RLS target não provado                                                                                                   |
| Supply Chain         | PARTIAL                      | pins/guards locais; attestations abertas                                                                                                |
| Production Readiness | NOT PROVEN                   | deploy, target, UAT e autoridade ausentes                                                                                               |
| Overall              | `FAIL/BLOCKED`               | CI #198 não foi aprovado; target, recovery, UAT, governança e autoridade continuam abertos |

## P0 Findings

Permanecem abertos: RLS/runtime target, workflow PostgreSQL externo, crash
recovery do worker, auditoria externa, backup/restore, deploy/rollback,
attestation, soak, UAT e autoridade de go/no-go.

## Remaining Risks

O k6 local no banco descartável, com a API limitada a quatro CPUs, passou `9/9`
SLOs sem alteração de threshold: API p95 `124,89 ms`, p99 `190,66 ms`, query
p95 `138 ms`, auth p95 `36,56 ms`, erros HTTP `0%` e disponibilidade `100%`.
Essa prova é local e não substitui o CI remoto, o target ou um envelope externo.
O Docker daemon indisponível ainda impede o drill real de recuperação nesta
estação.

## Release Recommendation

**BLOCKED**. O claim `TRIPLE-A VERIFIED` continua proibido até que todos os
gates da régua congelada sejam satisfeitos no mesmo candidato e com evidência
externa verificável.
