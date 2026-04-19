# EVENT BUS — Catálogo de Eventos e Arquitetura Operacional

**Data:** 10/04/2026
**Status:** OPERACIONAL — BLOCO 3 E3-01 em execução

---

## 1. Estado Atual

O módulo `event-bus` implementa o **Outbox Pattern** com armazenamento em banco de dados PostgreSQL.

| Componente | Status | Descrição |
|-----------|--------|-----------|
| `OutboxRepository` interface | ✅ | Contrato de persistência de eventos |
| `DatabaseOutboxRepository` | ✅ | Armazenamento em PostgreSQL (`outbox_events`) |
| `EventBusService` | ✅ | Publish e processamento de eventos |
| `processPending()` | ✅ | Poll-based worker tick |
| Retry Logic | ✅ | Max 3 attempts com backoff exponencial |
| `getDeadLetterEvents()` | ✅ | Consulta de eventos no DLQ via `findFailed()` |
| Dead Letter | ✅ | Marcado como `status='failed'`, consultável via `getDeadLetterEvents()` |

---

## 2. Eventos Catalogados

Os seguintes eventos são publicados pelo runtime via `EventBusService` ou `WebhooksService.dispatch()`:

### Paciente

| Evento | Módulo | Payload Principal | Status |
|--------|--------|-------------------|--------|
| `patient.created` | patients | `id`, `accountId`, `name`, `species`, `primaryOwnerId` | ✅ Emitido |
| `patient.updated` | patients | `id`, `accountId` | ⚠️ Não emitido ainda |

### Agendamento

| Evento | Módulo | Payload Principal | Status |
|--------|--------|-------------------|--------|
| `appointment.scheduled` | scheduling | `id`, `accountId`, `patientId`, `ownerId`, `scheduledAt`, `visitType`, `reason`, `status` | ✅ Emitido |
| `appointment.status_changed` | scheduling | `id`, `accountId`, `patientId`, `ownerId`, `previousStatus`, `newStatus`, `reason`, `updatedAt` | ✅ Emitido |
| `appointment.cancelled` | scheduling | `id`, `accountId`, `reason` | ⚠️ Não emitido ainda |

### Atendimento

| Evento | Módulo | Payload Principal | Status |
|--------|--------|-------------------|--------|
| `encounter.created` | encounters | `id`, `accountId`, `patientId`, `ownerId`, `status`, `visitType`, `origin`, `reason`, `openedAt`, `createdByUserId` | ✅ Emitido |
| `encounter.status_changed` | encounters | `id`, `accountId`, `patientId`, `previousStatus`, `newStatus`, `updatedAt` | ✅ Emitido |
| `encounter.started` | encounters | `id`, `accountId`, `patientId` | ⚠️ Nãoemitido ainda |
| `encounter.closed` | encounters | `id`, `accountId`, `patientId` | ⚠️ Nãoemitido ainda |

### Faturamento

| Evento | Módulo | Payload Principal | Status |
|--------|--------|-------------------|--------|
| `billing.record.created` | billing | `id`, `accountId`, `encounterId`, `patientId`, `ownerId`, `status`, `createdAt` | ✅ Emitido |
| `billing.status_changed` | billing | `recordId`, `encounterId`, `patientId`, `ownerId`, `previousStatus`, `newStatus`, `subtotalAmount`, `currency`, `updatedAt` | ✅ Emitido |
| `receivable.paid` | billing | `recordId`, `amount`, `paidAt` | ⚠️ Nãoemitido ainda |
| `payment.pix.intent.created` | billing | `accountId`, `intentId`, `billingRecordId`, `amount`, `currency`, `provider`, `status`, `expiresAt` | ✅ Emitido |
| `payment.pix.confirmed` | billing | `accountId`, `intentId`, `billingRecordId`, `providerConfirmationId`, `status`, `completedAt` | ✅ Emitido + handler→settled |

### Internação

| Evento | Módulo | Payload Principal | Status |
|--------|--------|-------------------|--------|
| `inpatient.admitted` | inpatient | `id`, `accountId`, `patientId`, `encounterId`, `bedId`, `sectorId` | ⚠️ Nãoemitido ainda |
| `inpatient.discharged` | inpatient | `id`, `accountId`, `patientId`, `dischargedAt` | ⚠️ Nãoemitido ainda |

### Notificações

| Evento | Módulo | Payload Principal | Status |
|--------|--------|-------------------|--------|
| `notification.sent` | notifications | `id`, `accountId`, `category`, `title`, `message`, `channel`, `sentAt` | ✅ Emitido |

### Ordem de Serviço / Produtos

| Evento | Módulo | Payload Principal | Status |
|--------|--------|-------------------|--------|
| `stock.moved` | inventory | `itemId`, `fromSector`, `toSector`, `quantity` | ⚠️ Nãoemitido ainda |
| `stock.low` | inventory | `itemId`, `currentStock`, `minimumStock` | ⚠️ Nãoemitido ainda |

---

## 3. Arquitetura de Publicação

### Interface Abstrata (OutboxRepository)

```typescript
interface OutboxRepository {
  create(event: OutboxEvent): Promise<void>;
  update(event: OutboxEvent): Promise<void>;
  findById(id: string): Promise<OutboxEvent | null>;
  findPending(limit: number): Promise<readonly OutboxEvent[]>;
  findFailed(limit: number): Promise<readonly OutboxEvent[]>;
  findByCorrelationId(correlationId: CorrelationId): Promise<readonly OutboxEvent[]>;
}
```

### Implementações Disponíveis

| Implementação | Status | Infraestrutura |
|---------------|--------|----------------|
| `DatabaseOutboxRepository` | ✅ Disponível | PostgreSQL (`outbox_events`) |
| `RedisOutboxRepository` | 📋 Planejado | Redis Streams |

### EventHandler Interface (para subscribers)

```typescript
interface EventHandler {
  (event: OutboxEvent): Promise<void>;
}
```

---

## 4. Fluxo de Eventos

```
Service Callback
    │
    ▼
EventBusService.publish()
    │
    ▼
OutboxRepository.create()  ← outbox_events table
    │
    ▼
EventBusWorker.tick() → processPending()
    │
    ├──[para cada evento]──▶ EventBusService.processPending()
    │                            │
    │                            ├── PaymentsEventHandlers.handle()
    │                            │      → payment.pix.intent.created → log
    │                            │      → payment.pix.confirmed → billing.settleByRecordId()
    │                            │
    │                            ├── BillingEventHandlers.handle()
    │                            │      → billing.record.created → placeholder
    │                            │      → billing.status_changed → placeholder
    │                            │
    │                            └── WebhooksEventHandlers.handle()
    │                                   → dispatch() para webhooks registrados
    │
    ├──[OK]──▶ status='completed'
    │
    └──[FAIL + retry]──▶ retry with backoff (max 3)
            │
            └──[max reached]──▶ status='failed' (DLQ manual)
```

### Consumer Registry — API Runtime

O consumo assíncrono é organizado por domínio via `ConsumerRegistry` (`apps/api/src/consumers/index.ts`):

```typescript
// Runtime wiring — ConsumerRegistry classe com add() + registerAll()
const registry = new ConsumerRegistry();
registry.add('payments', new PaymentsEventHandlers({ billing }));
registry.add('billing', new BillingEventHandlers({ billing }));
registry.add('webhooks', new WebhooksEventHandlers({ webhooks }));
registry.registerAll(eventBus);
```

**Contrato mínimo (`DomainConsumer`):**
```typescript
interface DomainConsumer {
  readonly name: string;        // identificador único (logs, diagnóstico, detecção de duplicatas)
  readonly handlers: EventHandler; // passado para eventBus.subscribe()
}
```

| Consumer | Arquivo | Eventos processados |
|----------|---------|-------------------|
| `PaymentsEventHandlers` | `apps/api/src/consumers/payments.consumer.ts` | `payment.pix.intent.created`, `payment.pix.confirmed` |
| `BillingEventHandlers` | `apps/api/src/consumers/billing.consumer.ts` | `billing.record.created`, `billing.status_changed` |
| `WebhooksEventHandlers` | `apps/api/src/consumers/webhooks.consumer.ts` | `patient.created`, `appointment.scheduled`, `appointment.status_changed`, `encounter.created`, `encounter.status_changed`, `billing.record.created`, `billing.status_changed`, `notification.sent` |

**Nota:** `payment.pix.confirmed` pertence ao dominio payments — `PaymentsEventHandlers` é o consumer oficial que coordena a liquidacao do billing via `billing.settleByRecordId()`. O dispatch de webhooks era feito sincronamente nas callbacks de domínio (duplicando entregas). Agora é tratado exclusivamente pelo `WebhooksEventHandlers` via outbox, eliminando duplicação.

---

## 4.1 Onboarding de Novos Consumers

Para adicionar um novo dominio consumidor assincrono, siga este checklist:

**1. Criar o arquivo do consumer:**
```
apps/api/src/consumers/<domain>.consumer.ts
```

**2. Implementar a classe seguindo o contrato `DomainConsumer`:**

```typescript
import type { EventHandler, OutboxEvent } from '@cvg-his-v2/module-event-bus';

export class XxxEventHandlers {
  readonly name = 'xxx';

  constructor(options: XxxConsumerOptions) {
    // store dependencies
  }

  /** Invocado pelo eventBus para cada evento processado. */
  async handle(event: OutboxEvent): Promise<void> {
    switch (event.eventType) {
      case 'xxx.event.a':
        await this.#doSomething(event);
        break;
      default:
        break; // eventos desconhecidos: ignorar
    }
  }

  /** EventHandler — passado para eventBus.subscribe(). */
  get handlers(): EventHandler {
    return async (event: OutboxEvent) => this.handle(event);
  }
}
```

**3. Registrar no `ConsumerRegistry` (`runtime.ts`):**

```typescript
import { ConsumerRegistry } from './consumers/index.js';
import { XxxEventHandlers } from './consumers/xxx.consumer.js';

const registry = new ConsumerRegistry();
registry.add('payments', new PaymentsEventHandlers({ billing }));
registry.add('billing', new BillingEventHandlers({ billing }));
registry.add('webhooks', new WebhooksEventHandlers({ webhooks }));
registry.add('xxx', new XxxEventHandlers({ /* deps */ })); // nova linha
registry.registerAll(eventBus);
```

**4. Regra de ordenacao:**
- Se o novo consumer depende de efeitos de outro (ex: settlement antes de webhook), verifique a ordem de `add()`.
- Ordem atual: `payments` → `billing` → `webhooks`.

**Contrato do handler:**
- Erros devem ser propagados (nao silenciar excecoes).
- Eventos desconhecidos devem ser ignorados (default: break).
- O handler e chamado APOS o evento ser marcado como processado.

**5. Testes obrigatorios:**
```typescript
// apps/api/src/consumers/xxx.consumer.test.ts
test('XxxEventHandlers handles xxx.event.a correctly', async () => { ... });
test('XxxEventHandlers ignores unknown event types', async () => { ... });
```

---

## 5. Rotas de Integração

### Publicação via API (Internal)

```
POST /internal/events/publish
Body: { eventType, moduleName, correlationId, payload }
→ EventBusService.publish()
```

### Consulta de Eventos por Correlation ID

```
GET /internal/events/:correlationId
→ EventBusService.getEventsByCorrelationId()

### Inspeção de Evento Individual

```
GET /internal/events/:eventId
→ EventBusService.getEvent(eventId) — retorna evento individual por ID
```

### Dead Letter Queue — Inspeção e Reprocessamento

```
GET /internal/events/dlq?limit=N
→ EventBusService.getDeadLetterEvents(limit) — lista eventos com status='failed'

POST /internal/events/:eventId/reprocess
→ EventBusService.reprocessEvent(eventId) — reaqueua evento do DLQ para reprocessamento
```

---

## 6. Provider Redis Streams (Roadmap)

Quando Redis estiver disponível:

```bash
EVENT_BUS_PROVIDER=redis
REDIS_URL=redis://localhost:6379
REDIS_STREAM_KEY=cvg:events
```

Benefícios: ~100k events/sec, fan-out pub/sub, event replay via stream groups.

---

## 7. Lacunas e Próximos Passos

| Lacuna | Prioridade | Status |
|--------|------------|--------|
| `RedisOutboxRepository` | Média | Aguardando infraestrutura Redis |
| Event replay via Kafka | Baixa | Fora do escopo atual |
| DLQ automática (fila separada) | Média | ✅ Implementado via `status='failed'` + `getDeadLetterEvents()` + `POST /internal/events/:eventId/reprocess` |
| 30+ eventos catalogados | Alta | 8 de ~30 eventosEmitidos; restante planejado |
| Event schema registry | Baixa | Tipos TypeScript como contrato |
| Consumer registry explícito por domínio | Alta | ✅ Implementado com `BillingEventHandlers` + `WebhooksEventHandlers` via `eventBus.subscribe()`; dispatch síncrono removido |

---

## 8. Testes

```bash
pnpm --filter @cvg-his-v2/module-event-bus test
# 14/14 tests PASS (inclui retry, DLQ, subscribe, getDeadLetterEvents, reprocessEvent, getPendingEvents, countEvents)
```

---

*Documento atualizado em 10/04/2026 — BLOCO 3 E3-01*
