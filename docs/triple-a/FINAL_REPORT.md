# CVG-HIS V4 — Current Assurance Report

**Candidate funcional avaliado:** `main@a3354f021d7046ad345f5aad89d16ab0ef9c1be3`

**Verdict:** **BLOCKED / NOT PROVEN**

## Executive Summary

O candidato preserva o modular monolith e recebeu controles incrementais de
workflow/worker, jornadas clínicas canônicas, observabilidade, supply chain,
diagnóstico de performance, readiness fail-closed, fixtures k6 determinísticas
e fechamento fail-closed do pacote de evidência. O gate local completo ficou
`BLOCKED` (`55/57/15`); o CI #143 do candidato pai `82ff6eec` terminou `failure`
somente em Performance/k6, com os outros 15 jobs, incluindo E2E SPA, aprovados.
O CI #144 do pai documental `da5dd244` falhou em `Repository Guards` porque o
checkout raso ocultou a ancestralidade do snapshot; o candidato atual corrige
esse checkout. O [CI #146](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34682262401)
no `main@697c6efa` terminou `failure` no passo de API E2E clínico canônico; a
suíte SPA, Performance/k6 e demais jobs passaram. O candidato `a3354f02`
isola o banco/API da prova canônica; ainda não há aprovação remota do novo SHA.

## Atualização terminal — isolamento da prova clínica

O CI #146 falhou no passo de API E2E canônico depois de a suíte SPA passar. A
reprodução local com PostgreSQL real passou as duas jornadas. O workflow agora
prepara `cvg_his_e2e_canonical` e executa a API canônica em `3113`, separada do
banco mutável da suíte SPA. O contrato CI passou `18/18`; essa correção ainda
precisa de um CI remoto exato. O veredito permanece **BLOCKED / NOT PROVEN**.

## Scorecard

| Área                 | Estado atual                 | Evidência                                                                                                                                                       |
| -------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture         | BOUNDED PASS                 | guards e contratos locais                                                                                                                                       |
| Security             | PARTIAL                      | SAST, secrets, dependency audit e testes locais                                                                                                                 |
| Testing              | LOCAL PASS                   | suíte workspace, critical e E2E clínico                                                                                                                         |
| Clinical Safety      | PARTIAL                      | matriz, invariantes e jornadas canônicas                                                                                                                        |
| Worker               | LOCAL PASS / target aberto   | retries, lease, fencing e DLQ                                                                                                                                   |
| CI/CD                | BLOQUEADO NO SHA ATUAL       | CI #146 falhou no passo de API E2E clínico canônico; a suíte SPA, Performance/k6 e demais jobs passaram. O isolamento está no candidato atual e aguarda novo CI |
| Observability        | LOCAL PASS / target aberto   | métricas, traces e diagnósticos                                                                                                                                 |
| Recovery             | BLOCKED                      | Docker impediu restore drill real                                                                                                                               |
| Frontend             | BOUNDED PASS                 | E2E/visual/a11y no CI                                                                                                                                           |
| Database             | PARTIAL                      | testes locais; RLS target não provado                                                                                                                           |
| Supply Chain         | PARTIAL                      | pins/guards locais; attestations abertas                                                                                                                        |
| Production Readiness | NOT PROVEN                   | deploy, target, UAT e autoridade ausentes                                                                                                                       |
| Overall              | `55`, critical `57`, `15 P0` | gate estrito local no pai `82ff6eec` com checks, build e testes                                                                                                 |

## P0 Findings

Permanecem abertos: RLS/runtime target, workflow PostgreSQL externo, crash
recovery do worker, auditoria externa, backup/restore, deploy/rollback,
attestation, soak, UAT e autoridade de go/no-go.

## Remaining Risks

O k6 local no banco descartável passou `9/9` SLOs sem alteração de threshold
(API p95 `27,54 ms`, p99 `40,30 ms`, erros `0%`, disponibilidade `100%`). Essa
prova é local e não substitui o CI remoto, o target ou um envelope externo. O
Docker daemon indisponível ainda impede o drill real de recuperação nesta
estação.

## Release Recommendation

**BLOCKED**. O claim `TRIPLE-A VERIFIED` continua proibido até que todos os
gates da régua congelada sejam satisfeitos no mesmo candidato e com evidência
externa verificável.
