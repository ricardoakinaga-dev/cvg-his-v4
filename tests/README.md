# CVG-HIS-V2 — Camada de Testes

## Visão Final da Estrutura

```
tests/
├── setup/
│   ├── env.ts              # Variáveis de ambiente de teste
│   └── global-setup.ts     # Bootstrap global (reset DB + migrate + seed)
├── db/
│   ├── db-admin.ts         # Conexão admin + reset do banco de teste
│   ├── db-schema.ts        # Apply migration Drizzle + seed + truncate
│   └── db-integrity.ts     # Verificação de integridade do schema
├── helpers/
│   ├── db-helpers.ts       # uuid, queryOne, queryMany, insertOne, CleanupRegistry
│   └── assertions.ts       # assertAuditEventGenerated, assertPatientSelectable, etc.
├── factories/
│   ├── unit-factory.ts     # createUnit, ensureDefaultAccount
│   ├── role-factory.ts     # createRole, createPermission, assignPermissionToRole
│   ├── user-factory.ts     # createUser, createAdminUser, createVeterinarianUser, etc.
│   ├── owner-factory.ts    # createOwner
│   ├── patient-factory.ts  # createPatient
│   ├── encounter-factory.ts # createEncounter
│   ├── appointment-factory.ts # createAppointment
│   └── inventory-factory.ts   # createProduct, createStockItem
├── fixtures/
│   └── hospital-fixture.ts # createHospitalBase, createSecurityBase
├── integration/
│   ├── database/
│   │   ├── migration.test.ts   # Tables, enums, enum values (89 testes)
│   │   ├── fk.test.ts          # FK existence + enforcement (42 testes)
│   │   └── integrity.test.ts   # NOT NULL, UNIQUE, CHECK, indexes (20 testes)
│   ├── db-schema.test.ts   # Validação de schema (tables, enums, FKs)
│   ├── factories.test.ts   # Testes de factories, fixtures e assertions
│   └── foundational.test.ts # ICT-001 a ICT-010 — integrações fundacionais (11 testes)
├── contracts/              # (placeholder) Testes de contrato API
├── e2e/                    # (placeholder) Bridge integração ↔ browser
└── reports/
    ├── phase-2-db-validation-report.md            # Validação de banco (151 testes)
    ├── phase-3-foundational-integration-report.md # Integração fundacional (11 testes)
    ├── phase-4-critical-flows-report.md           # Fluxos críticos E2E (8 flows)
    ├── foundational-integration-gaps.md           # Gaps de integração Fase 3
    └── final-system-validation-report.md          # Relatório final consolidado

e2e/
└── tests/
    ├── fluxo-principal.spec.ts       # Tutor → Paciente → Agendamento → Atendimento
    ├── fluxo-internacao.spec.ts      # Admitir → Prescrever → Alta
    ├── fluxo-exames.spec.ts          # Exame → Resultado → Prontuário
    └── fluxos-criticos.spec.ts       # 8 fluxos críticos Phase 4 (e2e API)
```

## Ordem Recomendada de Execução

### 1. Iniciar banco de teste

```bash
pnpm test:db:start
```

### 2. Rodar suíte crítica (DB + integrações fundacionais)

```bash
DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5433/cvg_his_v2_test \
DATABASE_URL=postgres://postgres:postgres@localhost:5433/cvg_his_v2_test \
pnpm test:critical
```

Cobre: migrations, FKs, constraints, RBAC, owner/patient, scheduling, encounters, audit, billing, inventory.

### 3. Rodar fluxos críticos E2E (requer API rodando)

```bash
pnpm test:e2e
```

Cobre: 8 flows ponta a ponta via API real (user creation, vet eligibility, scheduling, encounter chain, audit trail, billing, inventory, inactivation).

### 4. Rodar tudo (crítico + E2E)

```bash
pnpm test:all
```

### 5. Parar banco de teste

```bash
pnpm test:db:stop
```

## Mapa de Scripts

| Script             | O que executa                                                | Dependências                  |
| ------------------ | ------------------------------------------------------------ | ----------------------------- |
| `test:db:start`    | Sobe PostgreSQL 16 em porta 5433                             | Docker                        |
| `test:db`          | Validação estrutural do banco (migrations, FKs, constraints) | Banco rodando                 |
| `test:integration` | Todas as integrações (DB + fundacionais + factories)         | Banco rodando                 |
| `test:critical`    | Suíte crítica: DB (151) + fundacionais (11) = 162 testes     | Banco rodando                 |
| `test:e2e`         | 8 fluxos críticos via Playwright API context                 | API rodando em localhost:3000 |
| `test:all`         | test:critical + test:e2e                                     | Banco + API rodando           |
| `test:db:stop`     | Derruba PostgreSQL de teste                                  | —                             |

## Interpretação dos Relatórios

| Relatório                                    | Conteúdo                                                  | Quando consultar                              |
| -------------------------------------------- | --------------------------------------------------------- | --------------------------------------------- |
| `phase-2-db-validation-report.md`            | Validação de migrations, tabelas, enums, FKs, constraints | Para verificar integridade do schema          |
| `phase-3-foundational-integration-report.md` | Integrações entre módulos centrais (ICT-001 a ICT-010)    | Para verificar comunicação entre módulos      |
| `phase-4-critical-flows-report.md`           | 8 fluxos críticos E2E com gaps e workarounds              | Para verificar fluxos ponta a ponta           |
| `foundational-integration-gaps.md`           | Gaps de API signatures e integrações ausentes             | Para entender correções necessárias no código |
| `final-system-validation-report.md`          | Relatório consolidado com decisão de readiness            | Para decisão de avanço de fase                |

## Limitações Atuais

1. **Dual RBAC**: Seed usa `vet/enfermagem/recepcao`; AccessControlService usa `veterinarian/nurse/reception`. Testes funcionam com AccessControlService codes.
2. **4 módulos sem persistência DB**: BillingService, InventoryService, SchedulingService, UsersService usam Maps em memória. Dados perdidos em restart.
3. **Migration não idempotente**: `CREATE TYPE` sem `IF NOT EXISTS`. globalSetup faz drop+recreate do banco a cada run.
4. **Sem CI pipeline**: Validação depende de execução manual.
5. **Sem cobertura configurada**: Não há métrica de coverage para módulos ou API.

## Resultado Consolidado

| Fase                               | Testes  | Passaram | Falharam | Status |
| ---------------------------------- | ------- | -------- | -------- | ------ |
| Phase 2 — DB Validation            | 151     | 151      | 0        | ✅     |
| Phase 3 — Foundational Integration | 11      | 11       | 0        | ✅     |
| Phase 4 — Critical Flows E2E       | 8       | 8        | 0        | ✅     |
| **Total**                          | **170** | **170**  | **0**    | **✅** |

**Decisão:** Aprovado para continuação interna. Não apto para homologação ou produção (ver `final-system-validation-report.md`).
