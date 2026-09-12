# Triple-A — 05 Workflow Engine

**Status:** IMPLEMENTED LOCALLY / POSTGRES TARGET OPEN

## Problema e decisão

Tasks, reminders, acknowledgments e escalations devem ter uma superfície
transversal e auditável. O control plane de workflow foi mantido no monólito
modular, sem criar um serviço paralelo.

## Implementação

- `packages/modules/workflows` contém tipos, repositório e transições.
- `apps/api/src/routes/workflow-task-routes.ts` expõe a API autorizada.
- `apps/worker/src/workflow-task-runner.ts` processa leases e retries.
- `apps/spa/src/pages/clinical/WorkflowTasksPage.vue` expõe a fila operacional.
- Migrations `0166`–`0169` registram tarefas, permissões e governança de eventos.

## Verificação e risco

Contratos, schema, RLS estático, testes de módulo/API e build passam. A prova
PostgreSQL efêmera do workflow, fencing entre processos, replay em target e
aceite hospitalar permanecem `NOT PROVEN`.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Problema           | Centralizar tarefas, reminders, acknowledgment e escalation com auditoria.                                                        |
| Estado anterior    | Lógica estava distribuída entre módulos e ainda não havia prova PostgreSQL externa.                                               |
| Decisão            | Control plane transversal dentro do modular monolith.                                                                             |
| Implementação      | Módulo, API, worker, SPA e migrations de workflow/event governance.                                                               |
| Arquivos alterados | `packages/modules/workflows`, `apps/api/src/routes/workflow-task-routes.ts`, `apps/spa/src/pages/clinical/WorkflowTasksPage.vue`. |
| Testes             | Schema, contratos, módulo/API, RLS estático e build.                                                                              |
| Evidências         | CI #135 e verificações locais do candidato.                                                                                       |
| Riscos residuais   | PostgreSQL efêmero, fencing/replay em target e UAT.                                                                               |
