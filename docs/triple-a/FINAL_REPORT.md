# CVG-HIS V4 — Current Assurance Report

**Candidate funcional avaliado:** `b3b9d38d3b3d0267c1dedcc2e7f9a963a98f3334`
(snapshot documental corrente `f31cc5329e36efff91c10e9b9b3f4c6e93316046`; manifesto crítico revision 51 ancorado em `0812cb49`; a branch de assurance é ancestral sem commits exclusivos; o [CI #191](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35144297381) passou o Critical Coverage Gate, mas o run global terminou com falhas)

**Verdict:** **BLOCKED / NOT PROVEN**

## Executive Summary

O candidato preserva o modular monolith e a reconciliação fail-closed de
proveniência. A paridade de Patient e o CORS credentialado restrito foram
validados. No candidato corrente, os contratos alterados passaram, o produtor SQL
passou com PostgreSQL 16.15 e a conversão V8 do processo aceita somente o par
autenticado de inicializadores; o manifesto crítico está na revisão 51 e o
workflow publica evidência SQL antes do checker. A evidência crítica/Vue foi aceita no
Critical Coverage Gate do CI #191, mas o run global não é verde; não há target, recovery,
attestation, UAT, governança, performance certificada ou autoridade de release.
Nenhum threshold ou baseline visual foi relaxado e não há autorização para declarar `main green`,
release produtivo ou `TRIPLE-A VERIFIED`.

## Atualização corrente — revisão 51 / CI #191

O manifest crítico revision 51 foi reancorado em `0812cb49`, sem mudança de
thresholds, fontes ou aplicabilidade funcional; o snapshot corrente é
`b3b9d38d3b3d0267c1dedcc2e7f9a963a98f3334`. O runner crítico preserva o SQL histórico,
usa PostgreSQL 16 e trata os inicializadores V8 do Node 22 sem fundir identidades.
O produtor SQL agora é executado e publicado antes do checker. Os produtores atuais são identificados na
[`evidência corrente`](./17-current-execution-evidence.md). O [CI #191](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35144297381)
terminou `failure` com `13/17` jobs verdes, mas o Critical Coverage Gate passou
com R05-010, processo crítico, Vue especializado e evidência SQL aceitos. As
falhas remanescentes são Coverage, k6, E2E e Visual. O candidato permanece
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
| Testing              | PARTIAL                      | Critical Coverage remoto passou; Unit/Integration passaram; Coverage geral, E2E e Visual falharam                                       |
| Clinical Safety      | PARTIAL                      | matriz, invariantes e jornadas canônicas                                                                                                |
| Worker               | LOCAL PASS / target aberto   | retries, lease, fencing e DLQ                                                                                                           |
| CI/CD                | BLOQUEADO no SHA atual       | O CI #191 terminou com Critical Coverage PASS, mas falhou em Coverage geral, k6, E2E SPA e Visual Regression                         |
| Observability        | LOCAL PASS / target aberto   | métricas, traces e diagnósticos                                                                                                         |
| Recovery             | BLOCKED                      | Docker impediu restore drill real                                                                                                       |
| Frontend             | PARTIAL / NOT PROVEN         | Vue especializado passou no Critical Coverage; E2E/Visual registraram 29 divergências de snapshot no runner, sem baseline promovido |
| Database             | PARTIAL                      | testes locais; RLS target não provado                                                                                                   |
| Supply Chain         | PARTIAL                      | pins/guards locais; attestations abertas                                                                                                |
| Production Readiness | NOT PROVEN                   | deploy, target, UAT e autoridade ausentes                                                                                               |
| Overall              | `FAIL/BLOCKED`               | Critical Coverage passou no CI #191, mas o run global falhou; target, recovery, UAT, governança e autoridade continuam abertos |

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
