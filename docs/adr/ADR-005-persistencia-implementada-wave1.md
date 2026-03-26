# ADR-005 - Persistencia Implementada (Wave 1)

**Data**: 2026-03-25
**Status**: Implementado
**Contexto**: Implementacao da fundacao de persistencia para nucleo funcional do V2

---

## O Que Foi Implementado

### 1. Bootstrap e Configuracao

**Arquivos:**

- `apps/api/src/bootstrap.ts` - Inicializacao de servicos
- `apps/api/src/app-state.ts` - Estado global da aplicacao
- `packages/shared/database/src/` - Schemas e client

**Funcionalidades:**

- `bootstrapServices()` - Inicializa conexao com banco
- `shutdownServices()` - Fecha conexao gracefully
- `getDatabaseUrl()` - Le DATABASE_URL do ambiente
- `isDatabaseConfigured()` - Verifica se banco esta configurado

### 2. Healthcheck Endurecido

**Arquivo:** `apps/api/src/health.ts`

**Funcionalidades:**

- Healthcheck agora reporta estado real do banco
- `ok: false` quando banco nao esta saudavel
- Detalhe do erro quando banco falha
- Fallback para "not-configured" quando DATABASE_URL ausente

**Endpoint:** `GET /health`

```json
{
  "ok": true,
  "service": "cvg-his-v2-api",
  "version": "0.1.0",
  "environment": "development",
  "timestamp": "2026-03-25T...",
  "correlationId": "...",
  "dependencies": {
    "database": {
      "state": "healthy",
      "detail": "Database connection healthy"
    }
  }
}
```

### 3. Schemas de Domínio

**Arquivo:** `packages/shared/database/src/schemas/index.ts`

Schemas Drizzle para todos os agregados:

| Tabela                 | Uso              |
| ---------------------- | ---------------- |
| sessions               | Auth             |
| audit_events           | Auditoria        |
| owners                 | Cadastro         |
| patients               | Cadastro         |
| owner_patient_links    | Vinculos         |
| encounters             | Atendimento      |
| encounter_timeline     | Timeline         |
| medical_records        | Prontuario       |
| clinical_entries       | Entries          |
| clinical_timeline      | Timeline clinica |
| attachments            | Anexos           |
| appointments           | Agenda           |
| billing_records        | Cobranca         |
| billing_items          | Itens            |
| inventory_items        | Estoque          |
| inventory_consumptions | Consumo          |
| notifications          | Notificacoes     |
| notification_jobs      | Jobs             |
| inpatient_stays        | Internacao       |
| inpatient_progress     | Evolucao         |
| surgery_cases          | Cirurgia         |
| diagnostic_orders      | Diagnosticos     |

---

## Variaveis de Ambiente

| Variavel     | Descricao                 | Obrigatorio           |
| ------------ | ------------------------- | --------------------- |
| DATABASE_URL | URL de conexao PostgreSQL | Nao (skip se ausente) |
| REDIS_URL    | URL de conexao Redis      | Nao                   |

---

## Logica de Startup

```
1. Load config from env
2. Bootstrap services (async)
   - If DATABASE_URL: connect to PostgreSQL
   - Else: skip database initialization
3. Set app state with bootstrap results
4. Start HTTP server
5. Log startup with database status
```

---

## Fluxo de Shutdown

```
1. Receive SIGTERM/SIGINT
2. Close database connection
3. Exit gracefully
```

---

## Proximos Passos

### AUD-008-02 (Parcialmente Implementado)

O bootstrap e schemas estao prontos. Falta:

- Conectar services aos repositories
- Migrar Map/array para queries reais
- Adicionar migrations versionadas

### AUD-008-03 (Concluido)

Implementado:

- Script `infra/scripts/bootstrap-local.mjs` que sobe postgres/redis via docker-compose
- `validateDependencies()` em bootstrap.ts para validacao de dependencias
- `connectWithRetry()` com retries configuraveis
- `health.ts` implementa 3 estados (healthy, unhealthy, in-memory-fallback)
- `health.test.ts` cobre 6 cenarios de teste

---

## Testes

- Healthcheck retorna 200 mesmo sem banco (com state: "not-configured")
- Healthcheck retorna ok: false quando banco falha
- Bootstrap registra logs apropriados

---

## Dependencias

- Postgres: para conexao com banco
- (Redis ainda nao integrado)
