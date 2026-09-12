# Triple-A — 04 Worker Reliability

**Status:** IMPLEMENTED LOCALLY / LIVE EVIDENCE OPEN

Este documento é a entrada canônica exigida pelo prompt; a especificação
detalhada permanece em [`06-worker-reliability.md`](./06-worker-reliability.md)
e [`docs/operations/CLINICAL_WORKFLOW_TASK_CONTROL_PLANE.md`](../operations/CLINICAL_WORKFLOW_TASK_CONTROL_PLANE.md).

O worker possui envelope tenant-scoped, idempotência, lease/fencing,
heartbeat, backoff limitado, DLQ e replay autorizado. Os testes unitários e
de módulo passam, mas crash recovery entre processos, fila real, soak e
observabilidade de backlog no target não foram comprovados.

`pnpm test`, `pnpm typecheck` e `pnpm build` passaram no candidato
`c7336ac0f6a909c10d07797c36814f0b321c6d5c`. O estado de release permanece
`NOT PROVEN` até evidência externa reproduzível.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Problema           | Evitar duplicidade, perda e retry ilimitado em tarefas assíncronas.                                |
| Estado anterior    | Runner e control plane tinham cobertura local, sem envelope de runtime alvo.                       |
| Decisão            | Usar leases/fencing/DLQ fail-closed no monólito modular.                                           |
| Implementação      | Envelope tenant-scoped, idempotência, heartbeat, backoff e replay autorizado.                      |
| Arquivos alterados | `packages/modules/workflows`, `apps/worker/src/workflow-task-runner.ts`, migrations `0166`–`0169`. |
| Testes             | Suíte workspace, processos `11/11` e testes do módulo/runner.                                      |
| Evidências         | Testes locais vinculados ao SHA `c7336ac0`.                                                        |
| Riscos residuais   | Crash recovery entre processos, fila real, soak e backlog no target.                               |

## Atualização do candidato funcional — 2026-09-12T02:53:43Z

A implementação foi avaliada no SHA funcional `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`. O [CI #137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200) terminou verde com 16/16 jobs, mas o gate local estrito permaneceu `BLOCKED`, score `54`, critical `54`, `16` P0 e claim `NOT PROVEN`. O pacote `artifacts/triple-a` continua fail-closed; provas de target, autoridade humana, UAT e produção só serão promovidas com envelopes vinculados e verificáveis.
