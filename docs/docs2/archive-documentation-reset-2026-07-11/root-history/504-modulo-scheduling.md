# 504 — Módulo Scheduling

## Objetivo

Gerenciar agendamentos e fila operacional de atendimento com persistência real de appointments e queue entries, validação de conflito por janela de 30 minutos, cancelamento controlado e state machine para transições da fila.

## Superfície funcional real

- `listAppointments(accountId?)` — lista appointments ordenados por `scheduledAt`.
- `createAppointment(accountId, payload)` — cria appointment validando patient, owner e conflito de horário (janela de 30 min) para o mesmo paciente.
- `cancelAppointment(appointmentId, reason?)` — cancela appointment nos status `scheduled` ou `checked_in`. Rejeita `completed` e já `cancelled`.
- `getQueue(accountId?)` — lista fila operacional ordenada por prioridade e hora de check-in.
- `checkIn(accountId, payload)` — cria queue entry persistente e atualiza appointment vinculado quando existir.
- `callQueueEntry(queueEntryId)` — marca queue entry como `called` (valida state machine).
- `attachEncounter(queueEntryId, encounterId)` — vincula encounter e move para `in_triage` (valida state machine).
- `transitionQueueForEncounter(queueEntryId, nextStatus)` — transição controlada da fila com validação de state machine.
- `transitionQueueEntry(queueEntryId, nextStatus)` — transição genérica com validação de state machine.
- `completeQueueEntry(queueEntryId)` — conclui a queue entry (delega para `transitionQueueEntry`).
- `getAppointmentOrThrow(appointmentId)` — busca appointment por ID.
- `getQueueEntryOrThrow(queueEntryId)` — busca queue entry por ID.
- `hydrateFromDatabase(accountId?)` — reidrata appointments e queue entries do repositório.

## Situação de persistência

- `appointments` continuam no repositório do módulo.
- `scheduling_queue_entries` sustenta a fila operacional persistida.
- `DatabaseSchedulingRepository` persiste appointments e queue entries.
- O runtime injeta o repositório quando o banco está disponível e reidrata appointments + queue no startup.

## Situação de testes

- `packages/modules/scheduling/src/scheduling.test.ts` — 26 testes cobrindo:
  - criação de appointment
  - conflito de horário por janela de 30 min
  - cancelamento válido e inválido
  - check-in com appointment vinculado
  - ordenação da fila
  - transições válidas e inválidas da queue
  - hydrate de appointments e queue entries
  - persistência via repositório stub
- `apps/api/src/runtime.test.ts` — 4 testes de integração dedicados ao hardening
- `apps/api/src/server.test.ts` — cobre queue lifecycle via HTTP e conflito de appointment via API

## State machine da queue

| Status        | Transições Permitidas                   |
| ------------- | --------------------------------------- |
| `waiting`     | `called`, `cancelled`                   |
| `called`      | `in_triage`, `cancelled`                |
| `in_triage`   | `in_care`, `observation`, `cancelled`   |
| `in_care`     | `observation`, `completed`, `cancelled` |
| `observation` | `in_care`, `completed`, `cancelled`     |
| `completed`   | (nenhuma)                               |
| `cancelled`   | (nenhuma)                               |

## API

- `GET /appointments` — lista appointments
- `POST /appointments` — cria appointment
- `POST /appointments/:id/cancel` — cancela appointment
- `GET /queue` — lista fila
- `POST /queue/check-in` — check-in
- `POST /queue/:id/call` — chama entry da fila

## Riscos residuais

- Validação de conflito é por paciente, não por profissional ou recurso (coerente com o modelo atual).
- Campo `duration` existe no schema mas não é usado na validação (janela de 30 min é simplificação segura).

## Documentos relacionados

- `634-fase-hardening-scheduling-validacao.md` — relatório detalhado da frente de hardening
