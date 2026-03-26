# ADR-004 Stack de Persistencia do V2

**Data**: 2026-03-25
**Status**: Aprovado
**Contexto**: Definir stack canonico de persistencia para o nucleo funcional do V2

---

## Decisao

O V2 adotara a seguinte stack de persistencia:

| Componente       | Tecnologia             | Justificativa                                      |
| ---------------- | ---------------------- | -------------------------------------------------- |
| Banco relacional | PostgreSQL             | Robustez para dados transacionais, suporte a JSONB |
| ORM              | Drizzle                | Type-safe, leve, migracoes versionadas             |
| Fila/Cache       | Redis                  | Performance para sessoes, cache, filas             |
| Storage          | S3-compatible (futuro) | Anexos e artefatos binarios                        |

---

## Padrao Arquitetural

### Repository Pattern

Cada modulo expoe um repository que abstrai a persistencia:

```
Modulo -> Repository -> Database
```

- Modulos NAO acessam banco diretamente
- Repositories implementam interface publica do modulo
- Database Schema reflete Agregados do DDD

### Onda 1 - Modulos Prioritarios

| Modulo     | Repository          | Schema                         |
| ---------- | ------------------- | ------------------------------ |
| auth       | SessionRepository   | sessions                       |
| audit      | AuditRepository     | audit_events                   |
| owners     | OwnerRepository     | owners                         |
| patients   | PatientRepository   | patients, owner_patient_links  |
| encounters | EncounterRepository | encounters, encounter_timeline |

### Onda 2 - Modulos Secundarios

| Modulo          | Repository              | Schema                                               |
| --------------- | ----------------------- | ---------------------------------------------------- |
| medical-records | MedicalRecordRepository | medical_records, clinical_entries, clinical_timeline |
| attachments     | AttachmentRepository    | attachments                                          |
| scheduling      | AppointmentRepository   | appointments                                         |
| billing         | BillingRepository       | billing_records, billing_items                       |
| inventory       | InventoryRepository     | inventory_items, inventory_consumptions              |
| notifications   | NotificationRepository  | notifications, notification_jobs                     |

### Onda 3 - Modulos Avancados

| Modulo      | Repository           | Schema                              |
| ----------- | -------------------- | ----------------------------------- |
| inpatient   | InpatientRepository  | inpatient_stays, inpatient_progress |
| surgery     | SurgeryRepository    | surgery_cases                       |
| diagnostics | DiagnosticRepository | diagnostic_orders                   |

---

## Estrutura de Diretórios

```
packages/
  shared/
    database/
      src/
        index.ts           # Exports
        client.ts         # DB Client singleton
        migrations/       # Drizzle migrations
        schemas/         # Schema definitions
  modules/
    auth/
      src/
        repositories/
          session.repository.ts
    audit/
      src/
        repositories/
          audit.repository.ts
```

---

## Configuração de Ambiente

```bash
# .env.local
DATABASE_URL=postgresql://user:pass@localhost:5432/cvg_his_v2
REDIS_URL=redis://localhost:6379
```

---

## Healthcheck

O healthcheck da API deve validar:

1. Conexao com PostgreSQL
2. Conexao com Redis
3. Migrations aplicadas

---

## Migração de Estado Atual

O estado em memória atual (Maps/arrays) sera migrado via:

1. Scripts de seed que populam o banco
2. Testes de integracao que validam a persistencia
3. Bootstrap local que inicializa o banco para dev

---

## Consequencias

### Positivas

- Nucleo funcional sobrevive a restart
- Sessoes e audit trail persistidos
- Readiness para staging e producao
- Padronizacao de acesso a dados

### Negativas

- Requer infraestrutura (Postgres + Redis)
- Modulos precisam ser refatorados para usar repositories
- Migrations precisam ser versionadas e testadas

---

## Data de Implementacao

Onda 1 deve estar implementada ate Gate 1 do backlog.

---

## Revisao

Esta decisao deve ser revisada se:

- Requisitos de escala indicarem necessidade de banco NoSQL
- Custo de Postgres for proibitivo em produção
- Necessidade de multi-tenancy demandar arquitetura diferente
