# 770 — Roadmap de Implementação de Testes

**Status:** R0 — ordem de construção baseada em estado real
**Data:** 2026-03-31
**Fonte de verdade:** `docs/705-repository-assessment-for-validation-layer.md`, `docs/710-integration-matrix.md`, `docs/720-critical-business-flows.md`

---

## 1. Visão Geral das Fases

| Fase   | Nome                          | Esforço   | Bloqueada por |
| ------ | ----------------------------- | --------- | ------------- |
| Fase 0 | Levantamento e contratos      | Concluída | —             |
| Fase 1 | Infraestrutura de testes      | Médio     | Fase 0        |
| Fase 2 | Banco e migrations            | Alto      | Fase 1        |
| Fase 3 | Integrações fundacionais      | Alto      | Fase 2        |
| Fase 4 | Fluxos críticos ponta a ponta | Alto      | Fase 3        |
| Fase 5 | Gates e readiness             | Médio     | Fase 4        |

---

## 2. Fase 0 — Levantamento e Contratos

**Status:** CONCLUÍDA

**Objetivo:** Documentar o estado real do repositório e os contratos de integração entre módulos.

**Entradas:** Nenhuma (fase inicial)

**Ações realizadas:**

- Inspeção completa da estrutura do monorepo (apps, packages, infra, docs, tests)
- Análise do backend/API (bootstrap, rotas, middlewares, guards, schemas)
- Análise do banco e migrations (Drizzle vs SQL legado, seeds, FKs, constraints)
- Análise dos 21 módulos de domínio (responsabilidade, integrações, gaps)
- Análise da estrutura atual de testes (unitários, integração, e2e, fixtures, coverage)

**Entregáveis:**

- `docs/700-test-strategy.md` — estratégia de validação
- `docs/705-repository-assessment-for-validation-layer.md` — diagnóstico técnico
- `docs/710-integration-matrix.md` — matriz de contratos de integração
- `docs/720-critical-business-flows.md` — fluxos críticos de negócio
- `docs/730-test-data-fixtures-and-factories.md` — convenções de dados de teste
- `docs/740-migrations-and-database-validation.md` — validação de banco
- `docs/750-release-gates.md` — gates de qualidade
- `docs/760-hospital-readiness-criteria.md` — critérios de prontidão hospitalar

**Critérios de saída:** Todos os 8 documentos criados e revisados. ✅

---

## 3. Fase 1 — Infraestrutura de Testes

**Objetivo:** Criar a base técnica para execução de testes de integração com banco real.

**Entradas:** Documentos da Fase 0

**Ações concretas:**

### 3.1 Configuração unificada de vitest

- Criar `vitest.config.ts` na raiz do workspace ou em `packages/modules/` compartilhado
- Configurar globals, node environment, coverage (v8)
- Configurar `globalSetup` e `globalTeardown` para banco de teste

### 3.2 Banco de teste isolado

- Criar database `cvg_his_v2_validation` via `docker-compose.dev.yml`
- Script de setup: drop schema public → apply Drizzle migration `0000_` → apply Drizzle seed
- Script de teardown: drop schema public após cada suite
- Variável de ambiente `DATABASE_URL_TEST` apontando para banco de validação

### 3.3 Shared test utilities

- Criar diretório `tests/integration/fixtures/`
- `db-setup.ts` — setup/teardown de banco isolado
- `auth-fixture.ts` — cria user, faz login, retorna principal com accessToken
- `api-client.ts` — wrapper HTTP com auth automática e correlationId
- `cleanup-registry.ts` — registro de entidades criadas para cleanup pós-teste

### 3.4 Factories de entidades

- Criar factories em `tests/integration/fixtures/`:
  - `owner-factory.ts` — cria owner via OwnersService
  - `patient-factory.ts` — cria patient vinculado a owner
  - `encounter-factory.ts` — cria encounter com patient/owner
  - `appointment-factory.ts` — cria appointment + queueEntry
  - `inventory-item-factory.ts` — cria product + stockItem
  - `billing-factory.ts` — cria billing record + items

### 3.5 Correção do E2E baseURL mismatch

- Corrigir `e2e/fixtures/cvg-his.fixture.ts` para usar baseURL do config ativo
- Unificar configuração entre smoke e fluxo specs

**Entregáveis:**

- `vitest.config.ts` compartilhado
- `tests/integration/fixtures/` com db-setup, auth, api-client, cleanup
- Factories para owner, patient, encounter, appointment, inventory, billing
- Banco `cvg_his_v2_validation` operacional via docker-compose
- E2E baseURL corrigido

**Critérios de saída:**

- [ ] `pnpm vitest run` executa sem erro com banco isolado
- [ ] Factories criam entidades via services reais (não insert direto)
- [ ] Cleanup automático após cada suite
- [ ] E2E smoke passa com baseURL correta

**Esforço estimado:** Médio (2-3 sprints)

---

## 4. Fase 2 — Banco e Migrations

**Objetivo:** Validar que o schema Drizzle é a única fonte de verdade e que migrations aplicam corretamente.

**Entradas:** Fase 1 completa

**Ações concretas:**

### 4.1 Unificação do migration track

- Eliminar uso de `packages/shared/database/src/migrations/` (SQL legado) nos testes
- Atualizar `infra/scripts/prepare-test-db.mjs` para usar Drizzle migration `0000_`
- Validar que `packages/db/migrations/0000_vengeful_pet_avengers.sql` aplica em banco limpo

### 4.2 Validação de schema

- Teste que aplica migration em banco limpo e verifica:
  - 34 tabelas criadas
  - 28 ENUM types criados
  - Todas as FKs presentes
  - Todos os índices únicos presentes
  - CHECK constraints ativas

### 4.3 Correção do seed

- Corrigir `packages/db/src/seed.ts`:
  - Usar bcrypt/argon2 ao invés de SHA-256 para senha do admin
  - Alinhar role codes com AccessControlService (admin, reception, nurse, veterinarian, finance, inventory, auditor)
  - Alinhar permission keys com AccessControlService (32 perms)
- Eliminar ou atualizar `infra/scripts/seed.sql` para não referenciar tabelas inexistentes

### 4.4 Validação de compatibilidade domain↔banco

- Verificar que enum `encounter_status` no banco corresponde aos status em EncountersService
- Verificar que enum `appointment_status` corresponde aos status em SchedulingService
- Verificar que todas as colunas NOT NULL no schema têm validação nos services

**Entregáveis:**

- Migration Drizzle aplicada com sucesso em banco limpo
- Seed Drizzle corrigido com role codes e permission codes alinhados
- `prepare-test-db.mjs` usando track Drizzle
- Testes de validação de schema passando
- `seed.sql` eliminado ou corrigido

**Critérios de saída:**

- [ ] Migration aplica em banco limpo sem erro
- [ ] Seed popula roles com codes compatíveis com AccessControlService
- [ ] Seed popula permissions com keys compatíveis com AccessControlService
- [ ] Teste de schema valida 34 tabelas, 28 ENUMs, FKs, índices
- [ ] Nenhum teste usa SQL legado

**Esforço estimado:** Alto (3-4 sprints) — requer correção de seed e eliminação de dual track

---

## 5. Fase 3 — Integrações Fundacionais

**Objetivo:** Validar os contratos de integração entre módulos que são pré-requisito para todos os fluxos.

**Entradas:** Fase 2 completa

**Ações concretas:**

### 5.1 ICT-001: User → Auth → RBAC

- Criar user com role `veterinarian`
- Fazer login
- Verificar que AccessProfile contém permissões corretas
- Verificar que rotas permitidas retornam 200
- Verificar que rotas bloqueadas retornam 403

### 5.2 ICT-002: Owner → Patient → Scheduling

- Criar owner
- Criar patient vinculado ao owner
- Verificar que patient aparece em busca
- Criar appointment com patient
- Verificar que appointment aparece na lista

### 5.3 ICT-003: Scheduling → Encounter

- Criar appointment + check-in
- Abrir encounter com queueEntryId
- Verificar que encounter tem queueEntryId populado
- Verificar que timeline registra queue_checked_in

### 5.4 ICT-004: Encounter → Audit Trail

- Executar operação protegida
- Verificar que audit event foi registrado
- Verificar correlationId no audit event
- Verificar actorId, module, action, entityType, entityId

### 5.5 ICT-005: Encounter → Billing (com gap documentado)

- Abrir encounter
- Criar billing item
- Verificar que billing item aparece na lista
- Documentar que dados são perdidos em restart (gap de persistência)

### 5.6 ICT-006: Encounter → Inventory (com gap documentado)

- Criar inventory item com quantidade conhecida
- Registrar consumo vinculado ao encounter
- Verificar que onHandQuantity foi reduzida
- Verificar que notificação é criada se nível mínimo atingido
- Documentar que dados são perdidos em restart (gap de persistência)

**Entregáveis:**

- 6 testes de integração fundacional (ICT-001 a ICT-006)
- Documentação de gaps de persistência em billing, inventory, scheduling, users
- Relatório de execução com evidências

**Critérios de saída:**

- [ ] ICT-001 a ICT-006 passam com banco real
- [ ] Gaps de persistência documentados com evidência
- [ ] Audit events verificados para todas as operações

**Esforço estimado:** Alto (3-4 sprints)

---

## 6. Fase 4 — Fluxos Críticos Ponta a Ponta

**Objetivo:** Validar os 12 fluxos críticos definidos no doc 720.

**Entradas:** Fase 3 completa

**Ações concretas:**

### 6.1 FLUXO-01: Cadastro e habilitação operacional do usuário

- Teste de integração API-level
- Cobre: users, auth, access-control, staff

### 6.2 FLUXO-02: Veterinário e elegibilidade em agenda

- Teste de integração API-level
- Cobre: users, staff, scheduling
- Gap documentado: staff seed-only

### 6.3 FLUXO-03: Tutor + Paciente + Marcação de consulta

- Teste de integração API-level + E2E UI
- Cobre: owners, patients, scheduling

### 6.4 FLUXO-04: Agendamento → Atendimento

- Teste de integração API-level + E2E
- Cobre: scheduling, encounters

### 6.5 FLUXO-05: Atendimento → Lançamento clínico → Faturamento

- Teste de integração API-level
- Cobre: encounters, triage, medical-records, billing
- Gap documentado: billing sem persistência DB

### 6.6 FLUXO-06: Atendimento → Consumo → Estoque

- Teste de integração API-level
- Cobre: encounters, inventory, notifications
- Gap documentado: inventory sem persistência DB

### 6.7 FLUXO-07: Alteração de permissão

- Teste de integração API-level
- Cobre: users, access-control, auth

### 6.8 FLUXO-08: Inativação e bloqueio

- Teste de integração API-level
- Cobre: users, access-control, auth

### 6.9 FLUXO-09: Internação completa

- Teste E2E API-level (estender `fluxo-internacao.spec.ts`)
- Cobre: encounters, inpatient, medical-records, discharges

### 6.10 FLUXO-10: Exames diagnósticos

- Teste E2E API-level (estender `fluxo-exames.spec.ts`)
- Cobre: encounters, diagnostics, medical-records

### 6.11 FLUXO-11: Cirurgia

- Teste de integração API-level (novo)
- Cobre: encounters, surgery, medical-records

### 6.12 FLUXO-12: Prescrição e execução

- Teste de integração API-level (novo)
- Cobre: medical-records, prescription-executions
- Gap documentado: sem validação de entidades referenciadas

**Entregáveis:**

- 12 testes de fluxo (6 integração API, 2 E2E existentes estendidos, 4 novos)
- Relatório de execução com evidências por fluxo
- Documentação de gaps por fluxo

**Critérios de saída:**

- [ ] 12 fluxos validados com banco real
- [ ] Gaps documentados com evidência
- [ ] E2E estendidos para billing, cirurgia, prescrição

**Esforço estimado:** Alto (4-5 sprints)

---

## 7. Fase 5 — Gates e Readiness

**Objetivo:** Implementar os gates de qualidade e critérios de prontidão hospitalar.

**Entradas:** Fase 4 completa

**Ações concretas:**

### 7.1 Implementação dos release gates (doc 750)

- Gate G1 (merge): testes de integração passando, migration válida, sem dual RBAC
- Gate G2 (release): fluxos críticos cobertos, módulos com persistência DB
- Gate G3 (homologação): ambiente com dados realistas, todos os gates G1+G2
- Gate G4 (produção assistida): estabilidade comprovada, audit trail funcional

### 7.2 Implementação dos hospital readiness criteria (doc 760)

- Checklist de 6 eixos: estrutural, segurança, operacional, rastreabilidade, consistência, estabilidade
- Matriz de severidade SEV-1 a SEV-4
- Relatório de prontidão automatizado

### 7.3 CI Pipeline

- Criar `.github/workflows/validation.yml` ou equivalente
- Steps: lint → typecheck → test:unit → test:integration (com banco) → test:e2e
- Banco de teste via Docker Compose no CI
- Report de cobertura publicado

### 7.4 Relatório de validação final (doc 790)

- Template de relatório preenchido com resultados da Fase 4
- Decisão final baseada nos gates

**Entregáveis:**

- Release gates implementados e automatizados
- Hospital readiness checklist operacional
- CI pipeline configurado
- Relatório de validação final preenchido

**Critérios de saída:**

- [ ] Gates G1-G4 definidos e automatizados
- [ ] Readiness checklist com todos os 6 eixos avaliados
- [ ] CI pipeline executa toda a suíte automaticamente
- [ ] Relatório de validação final com decisão documentada

**Esforço estimado:** Médio (2-3 sprints)

---

## 8. Dependências entre Fases

```
Fase 0 (docs)
  └── Fase 1 (infra: vitest, banco, factories)
        └── Fase 2 (banco: migration, seed, schema)
              └── Fase 3 (integrações fundacionais: ICT-001 a ICT-006)
                    └── Fase 4 (fluxos críticos: FLUXO-01 a FLUXO-12)
                          └── Fase 5 (gates, readiness, CI)
```

Nenhuma fase pode ser iniciada sem a anterior completa. A Fase 2 é a mais arriscada porque requer correção do seed e eliminação do dual migration track — mudanças que afetam todos os testes subsequentes.

---

## 9. Riscos por Fase

| Fase   | Risco Principal                                      | Mitigação                                                          |
| ------ | ---------------------------------------------------- | ------------------------------------------------------------------ |
| Fase 1 | Vitest config conflita com configs existentes        | Usar workspace config, não sobrescrever por módulo                 |
| Fase 2 | Seed corrigido quebra testes existentes              | Manter compatibilidade com role codes antigos durante transição    |
| Fase 3 | 4 módulos sem persistência DB invalidam testes       | Documentar gaps, testar com in-memory, planejar correção posterior |
| Fase 4 | Fluxos complexos com muitos módulos têm setup frágil | Usar factories compostas, não setup manual                         |
| Fase 5 | CI sem infraestrutura de banco                       | Usar PostgreSQL no container do CI runner                          |
