# CVG-HIS V4 — Current Assurance Report

**Candidate funcional avaliado:** `33c178c0b87ad708c4ac66366bbbfed2cfb798f2`
(manifesto crítico revision 52 ancorado no commit de reconciliação do inventário; a branch de assurance é ancestral sem commits exclusivos; a cobertura global local passou `273/273` arquivos e `2907/2907` testes com `82,00%` branches; o CI #196 passou o Critical Coverage Gate, mas terminou com falhas em E2E SPA, Performance/k6 e Visual Regression)

**Verdict:** **BLOCKED / NOT PROVEN**

## Executive Summary

O candidato preserva o modular monolith e a reconciliação fail-closed de
proveniência. A paridade de Patient e o CORS credentialado restrito foram
validados. No candidato corrente, os contratos alterados passaram, o produtor SQL
passou com PostgreSQL 16.15 e a conversão V8 do processo aceita somente o par
autenticado de inicializadores; o manifesto crítico está na revisão 52 e o
workflow publica evidência SQL antes do checker. A evidência crítica/Vue foi aceita no
Critical Coverage Gate do #196, mas E2E SPA, Performance/k6 e Visual Regression falharam; não há target, recovery,
attestation, UAT, governança, performance certificada ou autoridade de release.
Nenhum threshold ou baseline visual foi relaxado e não há autorização para declarar `main green`,
release produtivo ou `TRIPLE-A VERIFIED`.

## Validação local do candidato atual

A cobertura global passou `273` arquivos e `2.907` testes: `87,46%` statements,
`82,00%` branches, `89,32%` functions e `88,91%` lines. Lint, typecheck,
`git diff --check` e os 17 arquivos de contrato adicionados/alterados também
passaram. Isso é evidência local; não substitui CI terminal, target, recovery,
UAT, attestation ou autoridade de release.

## Atualização corrente — revisão 52 / CI #196

O manifest crítico revision 52 foi reancorado no commit de reconciliação do inventário, sem mudança de
thresholds, fontes ou aplicabilidade funcional; o snapshot corrente é
`33c178c0b87ad708c4ac66366bbbfed2cfb798f2`. O runner crítico preserva o SQL histórico,
usa PostgreSQL 16 e trata os inicializadores V8 do Node 22 sem fundir identidades.
O produtor SQL agora é executado e publicado antes do checker. Os produtores atuais são identificados na
[`evidência corrente`](./17-current-execution-evidence.md). Os CI #191/#192
terminaram `failure` com `13/17` jobs verdes nos ancestrais, mas o Critical
Coverage Gate passou com R05-010, processo crítico, Vue especializado e
evidência SQL aceitos. A correção do teste ML e a reconciliação do inventário Vitest inauguram o candidato atual. O
CI #196 passou o Critical Coverage Gate, mas falhou em E2E SPA, Performance/k6
e Visual Regression; o candidato permanece
**BLOCKED / NOT PROVEN**.

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
| Testing              | PARTIAL                      | Unit/Integration passaram no #196; E2E SPA falhou em 29 screenshots e na evidência de usabilidade |
| Clinical Safety      | PARTIAL                      | matriz, invariantes e jornadas canônicas                                                                                                |
| Worker               | LOCAL PASS / target aberto   | retries, lease, fencing e DLQ                                                                                                           |
| CI/CD                | BLOQUEADO no SHA atual       | #196 passou Critical Coverage, mas falhou em Performance/k6, E2E SPA e Visual Regression |
| Observability        | LOCAL PASS / target aberto   | métricas, traces e diagnósticos                                                                                                         |
| Recovery             | BLOCKED                      | Docker impediu restore drill real                                                                                                       |
| Frontend             | PARTIAL / NOT PROVEN         | Vue especializado passou nos ancestrais; E2E/Visual registraram 29 divergências de snapshot no runner, sem baseline promovido |
| Database             | PARTIAL                      | testes locais; RLS target não provado                                                                                                   |
| Supply Chain         | PARTIAL                      | pins/guards locais; attestations abertas                                                                                                |
| Production Readiness | NOT PROVEN                   | deploy, target, UAT e autoridade ausentes                                                                                               |
| Overall              | `FAIL/BLOCKED`               | CI #196 não foi integralmente aprovado; target, recovery, UAT, governança e autoridade continuam abertos |

## P0 Findings

Permanecem abertos: RLS/runtime target, workflow PostgreSQL externo, crash
recovery do worker, auditoria externa, backup/restore, deploy/rollback,
attestation, soak, UAT e autoridade de go/no-go.

## Remaining Risks

O k6 local no banco descartável passou `9/9` SLOs sem alteração de threshold
(API p95 `27,54 ms`, p99 `40,30 ms`, erros `0%`, disponibilidade `100%`). A
reprodução equivalente ao watcher de diagnóstico de 5 s com `GOMAXPROCS=1`
também passou `9/9` (API p95 `94,29 ms`, p99 `136,61 ms`, query p95 `107 ms`,
44 amostras). Essa prova é local e não substitui o CI remoto, o target ou um
envelope externo. O Docker daemon indisponível ainda impede o drill real de
recuperação nesta estação.

## Release Recommendation

**BLOCKED**. O claim `TRIPLE-A VERIFIED` continua proibido até que todos os
gates da régua congelada sejam satisfeitos no mesmo candidato e com evidência
externa verificável.
