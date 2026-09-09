---
document_status: canonical
document_kind: adr
decision_date: 2026-09-09
owner: Platform + Clinical Safety
---

# ADR-013 — Control plane transversal de workflows clínicos

## Contexto

Pendências clínicas eram representadas por superfícies específicas e não
havia um ciclo de vida comum para vencimento, reconhecimento, retry,
escalonamento e DLQ. Colocar essa lógica em cada módulo aumentaria drift e
criaria caminhos de retry incompatíveis.

## Decisão

Adicionar `packages/modules/workflows` e as tabelas tenant-scoped
`clinical_workflow_tasks`/`clinical_workflow_task_events` ao monólito modular.
O domínio oferece idempotência por conta, fingerprint, estados explícitos,
leases com fencing, backoff limitado, DLQ/replay e escalonamento controlado.
API e SPA expõem uma fila operacional; produtores clínicos criam tarefas sem
assumir a soberania de outros módulos.

O worker só executa tipos cujo handler foi registrado explicitamente. Tarefas
manuais são reconhecidas pela equipe, enquanto tarefas worker futuras deverão
provar idempotência do efeito antes de serem habilitadas.

## Alternativas rejeitadas

- espalhar reminders em `discharges`, `notifications`, `inpatient` e
  `diagnostics` sem uma identidade comum;
- criar microserviço/novo banco para o workflow;
- usar somente memória ou uma tabela de notificações como source of truth;
- deixar o frontend decidir tenant, permissão ou transição.

## Consequências

Positivas: contrato comum, visibilidade operacional, replay auditável,
isolamento de tenant e uma superfície para handover/reminders futuros.

Custos: migration nova, permissões/RLS, necessidade de operar DLQ e de
registrar handlers com testes de efeitos duplicados. A integração atual é
intencionalmente conservadora: a alta produz tarefa manual e não dispara
mensagem externa.

## Verificação

O gate `pnpm validate:clinical-workflow` verifica a presença das fontes,
constraints, RLS e referências compostas. Testes direcionados cobrem a
máquina de estados, concorrência de criação, fencing, retry/DLQ, API e worker.
PostgreSQL real, E2E, carga, restore e aceite clínico continuam evidências
externas necessárias para qualquer certificação.
