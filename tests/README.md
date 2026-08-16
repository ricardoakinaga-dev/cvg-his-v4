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

Se houver sessão interrompida ou ruído de `vitest` órfão, limpe antes:

```bash
pnpm test:runner:clean
```

### 2. Rodar suíte crítica (DB + integrações fundacionais)

```bash
pnpm test:critical
```

Cobre: migrations, FKs, constraints, RBAC, owner/patient, scheduling, encounters, audit, billing, inventory.

Por padrão, o setup usa banco efêmero por execução quando `DATABASE_URL_TEST` não é informado.
`pnpm test:critical:bootstrap` já faz limpeza prévia de processos órfãos e bancos efêmeros sem conexões.

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
| `test:critical`    | Suíte crítica: 14 arquivos e 220 testes                     | Banco rodando                 |
| `test:runner:clean`| Mata `vitest` órfão e remove bancos efêmeros sem conexões    | PostgreSQL local opcional     |
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

1. **E2E visual depende do runtime do navegador**: os gates locais cobertos nesta rodada passaram — SPA funcional não visual 26/26, responsivo 4/4, visual 12/12 e mobile visual 1/1 — com snapshots canônicos reconciliados. A confirmação em CI/staging com navegador suportado continua necessária como evidência externa de release.
2. **Evidência operacional externa pendente**: o repositório não consegue produzir sozinho URL de workflow GitHub, relatório de restore real e evidência do deploy-alvo; esses artefatos permanecem pré-requisitos de produção.
3. **Validação de papel runtime depende do ambiente**: `pnpm validate:database-role` exige uma URL administrativa e uma URL de runtime configuradas; o script e o teste de contrato estão cobertos localmente.

## Resultado Consolidado

| Fase                               | Testes  | Passaram | Falharam | Status |
| ---------------------------------- | ------- | -------- | -------- | ------ |
| Phase 2 — DB Validation            | histórico | histórico | 0        | ✅     |
| Phase 3 — Foundational Integration | histórico | histórico | 0        | ✅     |
| Phase 4 — Critical Flows E2E       | histórico | histórico | 0        | ✅     |
| **Gate crítico atual**             | **220**   | **220**   | **0**    | **✅** |

**Decisão:** o gate crítico local está aprovado; a decisão de homologação/produção depende do relatório atual em `docs/2026-08-15-relatorio-auditoria-e-correcoes.md` e das evidências externas pendentes.
