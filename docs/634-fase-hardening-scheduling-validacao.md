# 634 — Fase Hardening Scheduling + Validação

**Data:** 2026-04-02
**Tipo:** Hardening enterprise do módulo `scheduling`
**Status:** Concluída

## Contexto

A queue operacional do scheduling já havia sido persistida (fase 633). Esta frente focou em endurecer o módulo para nível enterprise, adicionando cancelamento de appointments, validação de conflito de horário, state machine para transições da queue e cobertura de testes.

## O Que Foi Implementado

### SH1 — Cancelamento de Appointment

**Novo método:** `SchedulingService.cancelAppointment(appointmentId, reason?)`

**Regras adotadas:**

- Apenas appointments nos status `scheduled` ou `checked_in` podem ser cancelados
- Appointments `completed` ou já `cancelled` rejeitam cancelamento com `ConflictError`
- Cancelamento persiste via repository quando disponível
- Rota API: `POST /appointments/:id/cancel` com body opcional `{ reason: string }`
- Audit trail registra `cancel_appointment` com severidade `high`

**Arquivos alterados:**

- `packages/modules/scheduling/src/index.ts` — método `cancelAppointment`
- `apps/api/src/server.ts` — rota `POST /appointments/:id/cancel`

### SH2 — Validação de Conflito de Horário

**Mudança:** A validação de conflito evoluiu de "mesmo segundo exato" para "janela de 30 minutos".

**Regras adotadas:**

- Novo appointment para o mesmo paciente dentro de 30 minutos de um appointment existente (não cancelled/completed) gera `ConflictError`
- Appointments para pacientes diferentes no mesmo horário são permitidos
- A janela de 30 minutos é hardcoded como constante simples (`conflictWindowMs = 30 * 60 * 1000`)
- Mensagem de erro inclui o horário conflitante para debugging

**Limite documentado:** A validação é por paciente, não por profissional ou recurso. Isso é coerente com o modelo atual do sistema que não atribui profissionais a appointments no momento da criação.

**Arquivo alterado:**

- `packages/modules/scheduling/src/index.ts` — `createAppointment` com validação por janela

### SH3 — Endurecimento de Transições da Queue

**State machine implementada:**

| Status Atual  | Transições Permitidas                   |
| ------------- | --------------------------------------- |
| `waiting`     | `called`, `cancelled`                   |
| `called`      | `in_triage`, `cancelled`                |
| `in_triage`   | `in_care`, `observation`, `cancelled`   |
| `in_care`     | `observation`, `completed`, `cancelled` |
| `observation` | `in_care`, `completed`, `cancelled`     |
| `completed`   | (nenhuma)                               |
| `cancelled`   | (nenhuma)                               |

**Métodos endurecidos:**

- `callQueueEntry` — valida se `called` é transição permitida
- `attachEncounter` — valida se `in_triage` é transição permitida
- `transitionQueueForEncounter` — valida qualquer transição contra a state machine
- `completeQueueEntry` — delega para `transitionQueueEntry('completed')` com validação
- `transitionQueueEntry` — novo método genérico com validação de state machine

Todas as transições inválidas lançam `ValidationError` com contexto (`from`, `to`, `allowed`).

**Arquivo alterado:**

- `packages/modules/scheduling/src/index.ts` — constante `QUEUE_TRANSITIONS` + validação em todos os métodos

### SH4 — Testes

**Scheduling module** (`scheduling.test.ts`): 26 testes (de 8 originais)

Novos testes adicionados:

- `rejects appointments within 30-minute window for same patient`
- `allows appointments outside 30-minute window for same patient`
- `allows appointments for different patients at same time`
- `cancels a scheduled appointment successfully`
- `cancels a checked_in appointment successfully`
- `rejects cancellation of completed appointment`
- `rejects cancellation of already cancelled appointment`
- `persists cancelled appointment when repository is injected`
- `rejects cancelled appointment from being re-check-in`
- `allows valid queue transitions: waiting -> called -> in_triage -> in_care -> observation -> completed`
- `allows waiting -> cancelled transition`
- `allows called -> cancelled transition`
- `blocks invalid transition: completed -> waiting`
- `blocks invalid transition: cancelled -> waiting`
- `blocks invalid transition: waiting -> in_care (skip)`
- `blocks calling an already completed entry`
- `blocks attaching encounter to a completed entry`
- `persists queue transition to cancelled when repository is injected`

**Runtime tests** (`runtime.test.ts`): 4 novos testes de integração

- `scheduling hardening: cancel appointment, time conflict, and queue transitions`
- `scheduling hardening: rejects double cancellation`
- `scheduling hardening: time conflict blocks overlapping appointments`
- `scheduling hardening: queue transitions enforce state machine`

**Fix em teste existente:**

- `operational flow supports appointment, queue, encounter lifecycle` — removida chamada redundante a `transitionQueueForEncounter(queueEntry.id, 'in_triage')` após `attachEncounter` que já faz essa transição

### SH5 — Relatório (este documento)

## Arquivos Alterados

| Arquivo                                              | Mudança                                                                                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/modules/scheduling/src/index.ts`           | `cancelAppointment`, `transitionQueueEntry`, state machine `QUEUE_TRANSITIONS`, validação de janela de 30 min, endurecimento de `callQueueEntry`, `attachEncounter`, `transitionQueueForEncounter`, `completeQueueEntry` |
| `packages/modules/scheduling/src/scheduling.test.ts` | +18 novos testes (26 total)                                                                                                                                                                                              |
| `apps/api/src/server.ts`                             | Rota `POST /appointments/:id/cancel`                                                                                                                                                                                     |
| `apps/api/src/runtime.test.ts`                       | +4 testes de integração, fix no teste operacional existente                                                                                                                                                              |

## Regras Adotadas

### Cancelamento

- Cancelável: `scheduled`, `checked_in`
- Não-cancelável: `completed`, `cancelled`
- Persistência: sim, via repository
- API: `POST /appointments/:id/cancel` com `{ reason? }`

### Conflito de Horário

- Janela: 30 minutos
- Escopo: por paciente
- Permite: pacientes diferentes no mesmo horário
- Rejeita: mesmo paciente dentro da janela

### Transições da Queue

- State machine explícita com 7 estados
- Todas as transições validadas
- `completed` e `cancelled` são terminais
- `cancelled` é permitida de qualquer estado ativo

## Testes Executados

```
pnpm --filter @cvg-his-v2/module-scheduling test  → 26/26 pass
pnpm --filter @cvg-his-v2/api test                → 30/30 pass
pnpm --filter @cvg-his-v2/module-scheduling build → OK
pnpm --filter @cvg-his-v2/api build               → OK
```

## Impacto na Maturidade do Scheduling

| Dimensão             | Antes                         | Depois                                 |
| -------------------- | ----------------------------- | -------------------------------------- |
| Cancelamento         | Inexistente                   | Implementado com regras e persistência |
| Conflito de horário  | Segundo exato                 | Janela de 30 minutos                   |
| Transições da queue  | Permissivas (qualquer status) | State machine com validação            |
| Testes unitários     | 8                             | 26                                     |
| Testes de integração | 0 específicos                 | 4 dedicados                            |
| API surface          | GET/POST appointments, queue  | + POST /appointments/:id/cancel        |

## Bloqueios Remanescentes

1. **Validação por profissional/recurso:** O sistema ainda não modela alocação de profissionais em appointments. Quando isso existir, a validação de conflito deve ser expandida.
2. **Duração do appointment:** O campo `duration` existe no schema do banco mas não é usado na validação de conflito. A janela de 30 minutos é uma simplificação segura.
3. **Migração 017:** A tabela `scheduling_queue_entries` precisa estar deployada em todos os ambientes para persistência completa.
4. **E2E coverage:** Testes E2E do fluxo completo de scheduling ainda podem ser expandidos.

## Decisões Técnicas

- **State machine simples:** Optou-se por um `Record<status, status[]>` inline em vez de um framework de state machine. Suficiente para o domínio atual e fácil de manter.
- **Janela de 30 minutos:** Valor hardcoded mas explícito. Pode ser extraído para configuração quando o sistema suportar durations variáveis.
- **`transitionQueueEntry` como método genérico:** Criado para permitir qualquer transição validada, enquanto `transitionQueueForEncounter` mantém compatibilidade com o código existente.
- **Cancelamento de `checked_in`:** Permitido porque um paciente pode desistir após chegar. O appointment fica `cancelled` e não pode ser reutilizado.
