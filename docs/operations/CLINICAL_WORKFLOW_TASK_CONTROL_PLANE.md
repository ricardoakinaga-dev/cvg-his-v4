---
document_status: canonical
document_kind: operations-runbook
effective_date: 2026-09-09
owner: Clinical Safety + Platform
---

# Controle transversal de tarefas clínicas

Este documento descreve o control plane durável introduzido para pendências,
retornos e lembretes assistenciais. Ele é uma infraestrutura transversal do
monólito modular; cada módulo continua soberano sobre seus fatos clínicos.

## Contrato de domínio

Uma `clinical_workflow_task` contém apenas a referência operacional necessária
para encaminhar o trabalho: `accountId`, tipo, prioridade, vencimento, dono,
`patientId`/`encounterId` opcionais, chave de idempotência, correlação,
tentativas e estado de execução. Narrativa clínica completa, tokens e payloads
de integração não devem ser duplicados em `metadata`.

O fluxo de uma tarefa é:

```text
Módulo clínico -> Task durável -> fila manual ou worker
                         |              |
                   reconhecimento   lease/fencing
                         |              |
                  conclusão/cancelamento -> auditoria/eventos
                         |
                 atraso -> escalonamento -> DLQ/replay revisado
```

`executionMode=manual` aparece na fila assistencial e nunca é reivindicado pelo
worker. `executionMode=worker` só pode ser executado por um handler
explicitamente registrado; tipo desconhecido falha fechado e segue a política
de retry/DLQ. Essa separação impede que uma tarefa clínica manual seja
processada como efeito externo por engano.

## Estados e transições

| Estado | Entrada | Saídas válidas | Regra operacional |
|---|---|---|---|
| `pending` | criação ou replay | `processing`, `acknowledged`, `completed`, `cancelled` | idempotência por conta + chave |
| `processing` | claim do worker | `completed`, `retrying`, `dlq` | lease, owner e versão devem coincidir |
| `retrying` | falha transitória | `processing`, `acknowledged`, `completed`, `cancelled` | backoff limitado; nunca retry infinito |
| `acknowledged` | reconhecimento humano | `completed`, `cancelled` | ator e timestamp preservados |
| `completed` | execução/conclusão | — | terminal; não reabrir por mutação silenciosa |
| `cancelled` | cancelamento com motivo | — | terminal; motivo obrigatório |
| `dlq` | orçamento de tentativas esgotado | `pending` por replay | replay exige permissão separada e auditoria |

O serviço aplica limites de lote (1–100 no runner, até 200 na API), máximo de
50 tentativas, backoff exponencial limitado a 60 segundos e escalonamento no
máximo uma vez por hora para a mesma tarefa. Timestamps são normalizados para
ISO; datas sem fuso recebidas pela API são rejeitadas, exceto o adaptador de
alta que converte explicitamente a data civil de retorno para 09:00 UTC.

## Integridade e isolamento

- A chave única `(account_id, idempotency_key)` e o fingerprint rejeitam
  reutilização da chave com payload diferente. Correlação volátil não entra no
  fingerprint, portanto um retry legítimo não cria conflito artificial.
- As referências de paciente e atendimento usam foreign keys compostas com a
  conta. A API, o repositório e o PostgreSQL aplicam a conta; as duas tabelas
  têm RLS habilitado e forçado com `app.current_account_id()`.
- Cada consulta do repositório PostgreSQL usa contexto de tenant explícito.
  Nunca confiar em `patientId`, `encounterId` ou `accountId` vindo somente da
  interface.
- O worker incrementa a versão do lease e grava owner/token/expiração. Um
  heartbeat renova o lease enquanto o handler está em execução; se a renovação
  falhar, a conclusão é bloqueada. Uma conclusão, retry ou DLQ só é aceita se
  token, owner, versão, conta e estado ainda corresponderem ao claim. Cada
  mutação também incrementa `revision` e usa comparação otimista; worker
  atrasado não pode finalizar o claim de outro worker nem sobrescrever uma
  mutação humana concorrente.
- Se o worker morrer durante a última tentativa, a recuperação de lease move a
  tarefa para `dlq` com evento explícito, em vez de deixá-la presa em
  `processing`.
- Eventos de ciclo de vida são append-only e carregam ator opcional,
  `correlationId`, `causationId`, timestamp e payload operacional redigido.

## Surface pública

| Método | Permissão | Uso |
|---|---|---|
| `GET /workflow-tasks` | `workflow-tasks.read` | fila limitada por status/tipo/paciente/atendimento |
| `GET /workflow-tasks/:id` | `workflow-tasks.read` | detalhe sem fingerprint ou segredo de lease |
| `GET /workflow-tasks/:id/events` | `workflow-tasks.read` | trilha de ciclo de vida; `limit` limitado a 200 |
| `POST /workflow-tasks` | `workflow-tasks.manage` | criação idempotente |
| `POST .../acknowledge`, `.../complete`, `.../cancel` | `workflow-tasks.manage` | comandos humanos |
| `POST .../replay` | `workflow-tasks.replay` | redrive revisado de DLQ |

Toda mutação HTTP aguarda a escrita de auditoria. A projeção pública não
expõe fingerprint, token, owner ou versão de lease. O frontend mantém estados
de carregamento/erro, limpa a fila quando a leitura falha, explicita tarefas
vencidas também para leitores de tela, usa uma chave de replay estável por
revisão e mantém a seleção de contexto; a autorização real continua no
servidor.

## Integrações atuais

A alta que possui `followUpDate` cria uma tarefa manual `clinical.follow_up`
com a mesma conta, paciente e atendimento da alta. A chave
`discharge-follow-up:<dischargeId>` torna o produtor seguro contra retry. O
worker não executa tarefas manuais; a equipe visualiza, reconhece, conclui ou
cancela a pendência em `/workflow-tasks`.

Para registrar um handler worker, o módulo deve fornecer antes:

1. contrato de input versionado e sem PHI desnecessária;
2. efeito externo idempotente pela identidade da tarefa;
3. timeout próprio e classificação de erro transitório/permanente;
4. teste de retry, lease perdido, tenant e DLQ;
5. observabilidade sem `patientId` como label de alta cardinalidade.

O mapa de handlers do entrypoint permanece explícito e vazio até que esses
critérios sejam satisfeitos; isso é uma contenção deliberada, não uma prova de
entrega externa.

## Operação e evidência

Fontes executáveis:

- [`packages/modules/workflows`](../../packages/modules/workflows) — domínio,
  repositórios, idempotência e transições;
- [`apps/api/src/routes/workflow-task-routes.ts`](../../apps/api/src/routes/workflow-task-routes.ts)
  — contrato HTTP e autorização;
- [`apps/worker/src/workflow-task-runner.ts`](../../apps/worker/src/workflow-task-runner.ts)
  — claim, handler, retry e DLQ;
- [`0166_clinical_workflow_tasks.sql`](../../packages/db/migrations/0166_clinical_workflow_tasks.sql)
  — schema, constraints e RLS.
- [`0168_clinical_workflow_event_governance.sql`](../../packages/db/migrations/0168_clinical_workflow_event_governance.sql)
  — versão e origem obrigatórias para eventos, com constraints append-only.
- [`tests/integration/database/clinical-workflow-postgres.test.ts`](../../tests/integration/database/clinical-workflow-postgres.test.ts)
  — concorrência, RLS, fencing, retry/DLQ/replay e histórico em PostgreSQL.
- [`tests/integration/process/workflow-task-sigkill.test.ts`](../../tests/integration/process/workflow-task-sigkill.test.ts)
  — takeover após SIGKILL e rejeição de fencing stale em processos independentes.

Verificações locais atuais: 8 testes unitários do módulo (incluindo
concorrência, idempotência, backoff, DLQ e fencing), 6 testes HTTP de
alta/workflow, 4 testes do runner (incluindo heartbeat), builds de
API/SPA/worker/db, `validate:clinical-workflow`, `validate:rls` e
`validate:openapi`. API e worker compartilham `checkWorkflowTaskSchemaReadiness`
para exigir as mesmas tabelas, RLS, políticas, trigger, índices e constraints.
Isso prova o contrato local, não substitui
PostgreSQL/RLS real, restart/soak, delivery provider, UAT clínica ou E2E no
ambiente alvo; esses itens permanecem `NOT PROVEN` no release gate.
