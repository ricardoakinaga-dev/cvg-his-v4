# 633 - Fase Paralela Scheduling Queue Validacao

## Objetivo

Fechar o maior risco de restart do fluxo assistencial: a fila operacional de `scheduling`.

## O que foi implementado

- `SchedulingService` passou a hidratar e persistir `queue entries` via `SchedulingRepository`.
- `checkIn`, `callQueueEntry`, `attachEncounter`, `transitionQueueForEncounter` e `completeQueueEntry` agora persistem o estado da fila quando ha repositório.
- `DatabaseSchedulingRepository` passou a cobrir appointments e `scheduling_queue_entries`.
- Foi criada a migration [`017_create_scheduling_queue_entries.sql`](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/migrations/017_create_scheduling_queue_entries.sql) para sustentar a fila em banco.
- Foi criado o schema [`schedulingQueue.ts`](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/packages/db/src/schema/schedulingQueue.ts) para manter a trilha de persistencia coerente com `packages/db`.
- O teste operacional da API em [`runtime.test.ts`](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/apps/api/src/runtime.test.ts) passou a acompanhar o fluxo assincrono da queue persistida.

## Arquivos alterados

- [`index.ts`](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/packages/modules/scheduling/src/index.ts)
- [`database-scheduling.repository.ts`](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/packages/modules/scheduling/src/repositories/database-scheduling.repository.ts)
- [`scheduling.test.ts`](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/packages/modules/scheduling/src/scheduling.test.ts)
- [`runtime.test.ts`](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/apps/api/src/runtime.test.ts)
- [`schedulingQueue.ts`](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/packages/db/src/schema/schedulingQueue.ts)
- [`index.ts`](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/packages/db/src/schema/index.ts)
- [`017_create_scheduling_queue_entries.sql`](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/migrations/017_create_scheduling_queue_entries.sql)
- [`504-modulo-scheduling.md`](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/504-modulo-scheduling.md)
- [`510-matriz-fluxos-criticos-enterprise.md`](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/510-matriz-fluxos-criticos-enterprise.md)

## Como a queue passou a persistir

- `hydrateFromDatabase()` carrega appointments e queue entries do repositório.
- `checkIn()` cria a queue entry persistida e, se houver appointment vinculado, tambem persiste o `status=checked_in` do agendamento.
- `callQueueEntry()`, `attachEncounter()`, `transitionQueueForEncounter()` e `completeQueueEntry()` atualizam a mesma entry persistida.
- A ordenacao operacional continua canonica: prioridade primeiro, depois `checkedInAt`.

## Testes executados

- `pnpm --filter @cvg-his-v2/module-scheduling test`
- `pnpm --filter @cvg-his-v2/api test`
- `pnpm typecheck`
- `pnpm build`

## Resultado esperado desta frente

- Restart com banco deixa de perder a fila operacional.
- O fluxo `appointment -> check-in -> queue -> encounter` passa a ter historia coerente em memoria e em persistencia.
- A maturidade assistencial sobe porque a recepcao e a chamada operacional deixam de depender de processo vivo.

## Bloqueios remanescentes

1. Falta endurecer cancelamento de appointments.
2. Falta validacao de conflito de horario na agenda.
3. A fila ainda pode evoluir para uma maquina de estados mais explicita.
4. Ambientes antigos precisam aplicar a migration `017` antes de depender da queue persistida em producao.
