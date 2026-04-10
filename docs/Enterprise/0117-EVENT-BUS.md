# EVENT BUS ARCHITECTURE — Requisitos Redis/Kafka
**Data:** 09/04/2026
**Status:** PENDENTE — Aguardando infraestrutura

---

## ESTADO ATUAL

### Outbox Pattern (Database)

O módulo `event-bus` atual implementa o **Outbox Pattern** com armazenamento em banco de dados:

| Componente | Status | Descrição |
|-----------|--------|-----------|
| `DatabaseOutboxRepository` | ✅ | Armazenamento em PostgreSQL |
| `EventBusService` | ✅ | Publish/Process de eventos |
| Worker Integration | ✅ | Tick processing |
| Retry Logic | ✅ | Max 3 attempts |

### Limitações do Database Outbox

| Aspecto | Limitação |
|---------|----------|
| Latência | Depends on DB write speed |
| Throughput | limited by connection pool |
| Fan-out | Difícil sem replicação |
| Event replay | Não suportado nativamente |

---

## PROVIDERS SUPORTADOS

### 1. Redis Streams (Recomendado para Microserviços)

| Aspecto | Detalhes |
|---------|----------|
| Throughput | ~100k events/sec |
| Latência | ~1-5ms |
| Replay | ✅ Via Stream groups |
| Fan-out | ✅ Pub/Sub |
| Operacional | Moderado |

```bash
# Environment
EVENT_BUS_PROVIDER=redis
REDIS_URL=redis://localhost:6379
REDIS_STREAM_KEY=cvg:events
```

### 2. Apache Kafka (Recomendado para Event Sourcing)

| Aspecto | Detalhes |
|---------|----------|
| Throughput | ~1M events/sec |
| Latência | ~5-20ms |
| Replay | ✅ Desde qualquer offset |
| Fan-out | ✅ Topics |
| Operacional | Alto |

```bash
# Environment
EVENT_BUS_PROVIDER=kafka
KAFKA_BROKERS=kafka:9092
KAFKA_TOPIC=cvg-events
```

---

## ARQUITETURA PROPOSTA

### Interface Abstrata

```typescript
interface EventBusProvider {
  publish(event: OutboxEvent): Promise<void>;
  subscribe(handler: EventHandler): Promise<void>;
  replay(fromOffset?: string): Promise<void>;
}
```

### Implementações

```
packages/modules/event-bus/src/
├── index.ts                    # Exports
├── outbox.interface.ts        # OutboxRepository interface
├── database-outbox.repository.ts # Current (database)
├── redis-outbox.repository.ts   # NEW: Redis implementation
├── kafka-outbox.repository.ts   # NEW: Kafka implementation
├── event-bus.service.ts       # Service
└── adapters/
    ├── redis.adapter.ts
    └── kafka.adapter.ts
```

---

## DECISÃO NECESSÁRIA

| Pergunta | Opções |
|----------|--------|
| Provider preferido? | Redis Streams / Kafka |
| Event replay necessário? | Sim → Kafka, Não → Redis |
| Infraestrutura disponível? | Sim → implementar, Não → aguardar |

---

## PRÓXIMOS PASSOS

1. [ ] Decidir provider (Redis vs Kafka)
2. [ ] Confirmar infraestrutura disponível
3. [ ] Implementar EventBusProvider interface
4. [ ] Criar adapter do provider
5. [ ] Migrar DatabaseOutboxRepository se necessário

---

*Documento criado em 09/04/2026*
