# Triple-A — 06 Worker Reliability

**Status:** IMPLEMENTED LOCALLY / LIVE EVIDENCE OPEN

O runner de jobs passou a isolar falha por conta/job e continuar o tick com as demais contas. O control plane de tarefas clínicas adiciona idempotência, claim por tenant, lease com fencing por token/owner/versão, heartbeat, backoff limitado e DLQ/replay. API e worker compartilham o mesmo contrato de prontidão do schema antes de servir ou reivindicar tarefas. A especificação está em [`CLINICAL_WORKFLOW_TASK_CONTROL_PLANE.md`](../operations/CLINICAL_WORKFLOW_TASK_CONTROL_PLANE.md), e os testes do worker/módulo passaram no escopo local (runner: 4; módulo: 8).

Não foram executados live DB/queue, soak, timeout de job pendurado, lease fencing entre processos ou prova de DLQ em ambiente alvo. Tarefas sem handler continuam falhando fechado; isso é contenção verificável, não entrega externa comprovada.
