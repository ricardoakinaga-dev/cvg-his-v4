# CVG-HIS V4 — Current Assurance Report

**Candidate funcional avaliado:** `main@f24b90a8a50839b6a8853d66ef8ab4b7754092e0`
(pins imutáveis de deployment, envelope de eventos versionado, crosswalk normativo e hardening de logging, workflow e tenant; o candidato anterior é `f2e2da4cab80917d7c6bea0ddf1e55d58eb6821c` e o snapshot documental
anterior é `0d475dee358eab9621e5497db9929b7010ed09eb`)

**Verdict:** **BLOCKED / NOT PROVEN**

## Executive Summary

O candidato preserva o modular monolith, adiciona redaction recursiva de chaves
sensíveis, mensagens, erros estruturados, objetos aninhados e referências
circulares, protege transições de worker e verifica o contexto de tenant no banco. O pacote compartilhado passou `16/16` testes locais. O gate estrito
histórico ficou `BLOCKED` (`55/57/15`) e as provas externas de target, recovery,
attestation, UAT, governança, performance e autoridade de release continuam
abertas. O [CI #155](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34695557227) pertence ao commit documental anterior e não é
promovido como prova; esta reconciliação deve gerar uma nova execução vinculada
ao SHA `f24b90a8`. Nenhum threshold foi relaxado e não há autorização para declarar
`main green`, release produtivo ou `TRIPLE-A VERIFIED`.

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
| CI/CD                | BLOQUEADO no SHA atual       | CI #153 no descendente documental terminou `failure` somente em Performance/k6 com `15/16` jobs verdes; #147 confirmou historicamente outro candidato com `16/16` |
| Observability        | LOCAL PASS / target aberto   | métricas, traces e diagnósticos                                                                                                         |
| Recovery             | BLOCKED                      | Docker impediu restore drill real                                                                                                       |
| Frontend             | BOUNDED PASS                 | E2E/visual/a11y no CI                                                                                                                   |
| Database             | PARTIAL                      | testes locais; RLS target não provado                                                                                                   |
| Supply Chain         | PARTIAL                      | pins/guards locais; attestations abertas                                                                                                |
| Production Readiness | NOT PROVEN                   | deploy, target, UAT e autoridade ausentes                                                                                               |
| Overall              | `55`, critical `57`, `15 P0` | gate estrito local no HEAD documental `c1059e6c` com checks, build e testes                                                             |

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
