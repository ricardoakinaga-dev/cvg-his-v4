# CVG-HIS V4 — Current Assurance Report

**Candidate funcional avaliado:** `d13c5a44a91cedde687a9f5acedce80a5b56a047`
(candidato corrente; manifesto crítico revision 49 ancorado em `dae7bae9`; a branch de assurance é ancestral sem commits exclusivos; o [CI #188](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35130610217) rejeitou o guard documental por snapshot stale e não é promovido)

**Verdict:** **BLOCKED / NOT PROVEN**

## Executive Summary

O candidato preserva o modular monolith e a reconciliação fail-closed de
proveniência. A paridade de Patient e o CORS credentialado restrito foram
validados. No candidato corrente, unit passou `260/260` arquivos e `2824/2824`
testes, o manifesto crítico está na revisão 49 e o workflow instala Chromium
para a coleta especializada. A evidência crítica/Vue e o CI terminal ainda são
`NOT PROVEN`; não há target, recovery,
attestation, UAT, governança, performance certificada ou autoridade de release.
Nenhum threshold foi relaxado e não há autorização para declarar `main green`,
release produtivo ou `TRIPLE-A VERIFIED`.

## Atualização corrente — revisão 49

O manifest crítico revision 49 foi reancorado em `dae7bae9`, sem mudança de
thresholds, fontes ou aplicabilidade funcional; o snapshot corrente é
`d13c5a44a91cedde687a9f5acedce80a5b56a047`. Os produtores atuais são identificados na
[`evidência corrente`](./17-current-execution-evidence.md). O gate consolidado
aguarda a recoleta dos cinco shards e SQL contra o manifesto atual; a evidência
Vue especializada e a cobertura crítica do candidato ainda não têm prova
terminal aceita. O candidato permanece
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
| Testing              | LOCAL PASS                   | suíte workspace, critical e E2E clínico                                                                                                 |
| Clinical Safety      | PARTIAL                      | matriz, invariantes e jornadas canônicas                                                                                                |
| Worker               | LOCAL PASS / target aberto   | retries, lease, fencing e DLQ                                                                                                           |
| CI/CD                | BLOQUEADO no SHA atual       | Não há CI remoto terminal para `53bbee80`; o CI #178 de outro SHA falhou em coverage crítico/geral, unit, k6, visual e E2E SPA |
| Observability        | LOCAL PASS / target aberto   | métricas, traces e diagnósticos                                                                                                         |
| Recovery             | BLOCKED                      | Docker impediu restore drill real                                                                                                       |
| Frontend             | PARTIAL / NOT PROVEN         | Vue especializado não tem evidência aceita current; o renderer Chromium falha com controles nativos de data e 25 fontes permanecem abertas |
| Database             | PARTIAL                      | testes locais; RLS target não provado                                                                                                   |
| Supply Chain         | PARTIAL                      | pins/guards locais; attestations abertas                                                                                                |
| Production Readiness | NOT PROVEN                   | deploy, target, UAT e autoridade ausentes                                                                                               |
| Overall              | `FAIL/BLOCKED`               | gate R05-010 current no manifest 48; cobertura abaixo da régua, 25 aplicabilidades Vue abertas e gates externos ausentes |

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
