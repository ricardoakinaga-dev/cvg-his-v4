# Arquitetura do CVG-HIS

> **Última Atualização:** 2026-02-24
> **Versão:** 0.1.0

---

## Visão Geral

O CVG-HIS é um sistema de informação hospitalar veterinário construído com arquitetura de monorepo, utilizando TypeScript strict mode em toda a codebase.

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTES                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Browser   │  │   Mobile    │  │   Integrações/APIs      │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      his-web (Next.js)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  App Router │  │  React Query│  │   API Client (tipado)   │  │
│  │  (SSR/SSG)  │  │  (Cache)    │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      his-api (Fastify)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Routes    │──│  Services   │──│     Repositories        │  │
│  │  (Zod Val)  │  │  (Business) │  │     (Drizzle ORM)       │  │
│  └─────────────┘  └─────────────┘  └───────────┬─────────────┘  │
│  ┌─────────────┐  ┌─────────────┐              │                │
│  │    Auth     │  │    RBAC     │              │                │
│  │   (JWT)     │  │ (Permissões)│              │                │
│  └─────────────┘  └─────────────┘              │                │
└─────────────────────────────────────────────────┼───────────────┘
          │                                       │
          │         ┌─────────────────────────────┘
          │         │
          ▼         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                               │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │     PostgreSQL      │  │           Redis                 │   │
│  │  (Dados Relacionais)│  │  (Cache, Filas, Sessões)       │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      his-worker (BullMQ)                        │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │   Queue Consumers   │  │        Cron Jobs               │   │
│  │  • handover-build   │  │  • medication-overdue-scan     │   │
│  │  • protocol-publish │  │                                │   │
│  │  • system           │  │                                │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Estrutura do Monorepo

```
cvg-his/
├── apps/
│   ├── his-api/              # API REST
│   │   ├── src/
│   │   │   ├── index.ts      # Bootstrap
│   │   │   ├── server.ts     # Fastify config
│   │   │   ├── routes/       # Rotas públicas
│   │   │   ├── modules/      # Módulos de negócio
│   │   │   ├── lib/          # Utilitários
│   │   │   ├── middlewares/  # Middlewares
│   │   │   └── plugins/      # Fastify plugins
│   │   └── Dockerfile
│   │
│   ├── his-web/              # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/          # App Router pages
│   │   │   ├── components/   # Componentes React
│   │   │   ├── features/     # Features organizadas
│   │   │   ├── lib/          # Utilitários e API client
│   │   │   └── config/       # Configurações
│   │   └── Dockerfile
│   │
│   └── his-worker/           # Worker assíncrono
│       ├── src/
│       │   ├── index.ts      # Bootstrap
│       │   ├── workers/      # Processadores de jobs
│       │   ├── queues/       # Definições de filas
│       │   └── lib/          # Utilitários
│       └── Dockerfile
│
├── packages/
│   ├── db/                   # Schema e migrações
│   │   ├── src/
│   │   │   ├── schema/       # Drizzle schema
│   │   │   ├── connection.ts # Pool de conexões
│   │   │   └── seed.ts       # Dados iniciais
│   │   └── migrations/       # SQL migrations
│   │
│   ├── domain/               # Lógica de domínio
│   │   └── src/
│   │       ├── medication.ts # Schemas de medicação
│   │       ├── patient.ts    # Schemas de paciente
│   │       └── errors.ts     # Erros de domínio
│   │
│   ├── rbac/                 # Controle de acesso
│   │   └── src/
│   │       ├── permissions.ts # Permissões canônicas
│   │       └── index.ts       # Helpers RBAC
│   │
│   ├── contracts/            # Contratos compartilhados
│   │   └── src/
│   │       ├── patients.ts   # Contratos de paciente
│   │       └── owners.ts     # Contratos de tutor
│   │
│   ├── audit/                # Sistema de auditoria
│   │   └── src/
│   │       ├── audit.ts      # Registro de eventos
│   │       └── diff.ts       # Diff de alterações
│   │
│   └── config/               # Configurações
│       └── src/
│           └── index.ts      # Config canônica
│
└── docs/                     # Documentação
```

## Padrões Arquiteturais

### 1. Repository Pattern

Cada módulo segue o padrão Repository para acesso a dados:

```typescript
// repo.ts
export function createMedicationOrdersRepo(db: DbClient) {
  return {
    findById(accountId: string, orderId: string) { ... },
    list(params: ListParams) { ... },
    create(data: CreateData) { ... },
    updateById(params: UpdateParams) { ... },
    stopById(params: StopParams) { ... }
  };
}
```

### 2. Service Layer

A camada de serviço encapsula regras de negócio:

```typescript
// service.ts
export function createMedicationOrdersService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createMedicationOrdersRepo(context.db);
  
  return {
    async create(input: MedicationOrderCreateDto) {
      // Validações de negócio
      // Chamadas ao repository
      // Registro de auditoria
    }
  };
}
```

### 3. Dependency Injection

Serviços recebem dependências para facilitar testes:

```typescript
// Em produção
const service = createMedicationOrdersService({ db, requestContext });

// Em testes
const service = createMedicationOrdersService(
  { db: mockDb, requestContext: mockContext },
  { repo: mockRepo, appendAudit: mockAudit }
);
```

### 4. Plugin Architecture (Fastify)

Funcionalidades são registradas como plugins:

```typescript
// server.ts
await app.register(envPlugin);
await app.register(requestContextPlugin);
await app.register(dbPlugin);
await app.register(redisPlugin);
await app.register(apiRoutes);
```

## Fluxo de Requisição

```
Request → CORS → RequestId → RequestContext → Route Handler
                                                        ↓
                                                    Validation (Zod)
                                                        ↓
                                                    Permission Check
                                                        ↓
                                                    Service Layer
                                                        ↓
                                                    Repository Layer
                                                        ↓
                                                    Database
                                                        ↓
                                                    Audit Log
                                                        ↓
Response ←─────────────────────────────────────────────┘
```

## Multi-Tenancy

O sistema implementa isolamento de dados por `account_id`:

### Nível de Banco de Dados
- Todas as tabelas têm coluna `account_id`
- Índices em `account_id` para performance
- Foreign keys com `ON DELETE CASCADE`

### Nível de Aplicação
- `TenantGuardrail` valida contexto de tenant
- Repositories sempre filtram por `account_id`
- Testes de cross-tenant access

```typescript
// tenantGuardrail.ts
export function requireAccountId(request: FastifyRequest): string {
  const actor = request.requestContext.actor;
  if (!actor?.accountId) {
    throw new MissingTenantContextError();
  }
  return actor.accountId;
}
```

## Sistema de Permissões (RBAC)

### Estrutura
- **Roles**: admin, vet, enfermagem, recepcao
- **Permissions**: 80+ permissões granulares
- **Wildcard**: `*` para super-admin

### Verificação no Backend
```typescript
app.get('/admin/users', {
  preHandler: requirePermission('admin.usuarios.read')
}, handler);
```

### Verificação no Frontend
```typescript
const canDelete = usePermission('patient.delete');
return <button disabled={!canDelete}>Excluir</button>;
```

## Processamento Assíncrono

### Filas BullMQ

| Fila | Job | Propósito |
|------|-----|-----------|
| system | ping | Health check |
| handover-build | build | Gerar PDF de passagem |
| medication-overdue | scan | Detectar medicamentos atrasados |
| protocol-publish | publish | Publicar protocolos |

### Leader Election

Para ambientes com múltiplos workers:

```typescript
const isLeader = await acquireOrRenewLeaderLock({
  redis,
  key: 'cron:medication-overdue-scan:leader',
  owner: `worker-${process.pid}`,
  ttlMs: 180000
});

if (!isLeader) {
  return; // Outro worker é o líder
}
```

## Segurança

### Autenticação
- JWT com HS256
- Expiração: 8 horas
- Validação de issuer e audience

### Autorização
- RBAC com permissões granulares
- Middleware de verificação
- Contexto de usuário em cada requisição

### Validação
- Zod schemas em todos os endpoints
- Mensagens em português
- Sanitização automática

## Decisões Arquiteturais

### ADR-001: Monorepo com pnpm
**Status**: Aceito
**Contexto**: Necessidade de compartilhar código entre apps
**Decisão**: Usar pnpm workspaces para monorepo
**Consequências**: Versioning unificado, builds mais simples

### ADR-002: Drizzle ORM
**Status**: Aceito
**Contexto**: Necessidade de ORM type-safe
**Decisão**: Usar Drizzle em vez de Prisma
**Consequências**: SQL mais explícito, bundles menores

### ADR-003: Zod para Validação
**Status**: Aceito
**Contexto**: Validação de dados em runtime
**Decisão**: Usar Zod em toda a aplicação
**Consequências**: Type inference, mensagens customizadas

### ADR-004: Next.js App Router
**Status**: Aceito
**Contexto**: Frontend moderno com SSR
**Decisão**: Usar Next.js 14+ com App Router
**Consequências**: Server Components, streaming

---

*Documentação atualizada em 2026-02-24*
