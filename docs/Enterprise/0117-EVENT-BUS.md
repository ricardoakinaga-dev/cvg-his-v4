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
| Retry Logic | ✅ | Max 3 attempts com backoff |
| Dead Letter | ⚠️ | Marcado como `failed`, sem fila separada |

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
    ├──[OK]──▶ WebhooksService.dispatch()
    │               │
    │               ▼
    │           HTTP POST to registered webhook URLs
    │
    └──[FAIL + retry]──▶ retry with backoff (max 3)
            │
            └──[max reached]──▶ status='failed' (DLQ manual)
```

---

## 5. Rotas de Integração

### Publicação via API (Internal)

```
POST /internal/events/publish
Body: { eventType, moduleName, correlationId, payload }
→ EventBusService.publish()
```

### Consulta de Eventos

```
GET /internal/events/:correlationId
→ EventBusService.getEventsByCorrelationId()
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
| DLQ automática (fila separada) | Média | Marcado como `failed`, sem requeue automático |
| 30+ eventos catalogados | Alta | 8 de ~30 eventosEmitidos; restante planejado |
| Event schema registry | Baixa | Tipos TypeScript como contrato |

---

## 8. Testes

```bash
pnpm --filter @cvg-his-v2/module-event-bus test
# 5/5 tests PASS
```

---

*Documento atualizado em 10/04/2026 — BLOCO 3 E3-01*
