# 750 — Critérios de Gate de Release

**Status:** R0 — contrato de qualidade
**Data:** 2026-03-31
**Faixa:** 700-790
**Fonte de verdade:** `docs/705-repository-assessment-for-validation-layer.md`, `docs/710-integration-matrix.md`, `docs/720-critical-business-flows.md`

---

## 1. Propósito

Este documento define os gates objetivos que o CVG-HIS-V2 deve satisfazer para:

1. Aceitar merge em `main`
2. Publicar um release candidato
3. Entrar em ambiente de homologação
4. Entrar em produção assistida

Cada gate é binário: **PASS** ou **FAIL**. Não há interpretação subjetiva.

---

## 2. Hierarquia de Gates

| Nível | Gate                    | Consequência de FAIL                       |
| ----- | ----------------------- | ------------------------------------------ |
| G1    | Merge Gate              | Bloqueia merge em `main`                   |
| G2    | Release Gate            | Bloqueia geração de release candidate      |
| G3    | Homologação Gate        | Bloqueia deploy em ambiente de homologação |
| G4    | Produção Assistida Gate | Bloqueia deploy em produção assistida      |

Um gate de nível superior implica todos os inferiores. Para entrar em homologação (G3), G1+G2+G3 devem estar PASS. Para produção assistida (G4), todos os quatro devem estar PASS.

---

## 3. G1 — Merge Gate

Bloqueia merge em `main`. Qualquer FAIL impede o merge.

### 3.1 Testes Obrigatórios

| Critério                          | Condição de PASS                                                        | Status Atual                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Todos os testes unitários passam  | `pnpm test` exit code 0                                                 | **FAIL** — 4 módulos sem DB injection retornam resultados inconsistentes                       |
| Testes de API passam              | `pnpm --filter @cvg-his-v2/api test:all` exit code 0                    | **FAIL** — `db-persistence.test.ts` depende de `prepare-test-db.mjs` que usa schema SQL legado |
| Testes E2E smoke passam           | `pnpm test:smoke` exit code 0                                           | **FAIL** — baseURL mismatch (fixture `:3000` vs smoke `:4001`)                                 |
| Sem regressão em módulos críticos | auth, encounters, patients, owners, medical-records — 0 testes falhando | **PASS** — testes unitários existem para todos                                                 |

### 3.2 Migrations

| Critério                                         | Condição de PASS                                              | Status Atual                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Migration Drizzle aplica em banco limpo sem erro | `tsx packages/db/src/migrate.ts` em DB vazio, exit 0          | **FAIL** — não validado automaticamente                                                                             |
| Track único de migration                         | Apenas `packages/db/migrations/` existe como fonte de verdade | **FAIL** — dual track: Drizzle (1 arquivo) + SQL legado (16 arquivos em `packages/shared/database/src/migrations/`) |
| `seed.sql` não referencia tabelas inexistentes   | `psql -f infra/scripts/seed.sql` sem erro                     | **FAIL** — referencia `inventory_items`, `medical_records`, `owner_patient_links` que não existem no schema Drizzle |
| Seed Drizzle executa sem erro                    | `tsx packages/db/src/seed.ts` exit 0                          | **FAIL** — usa SHA-256 para hashing de senhas (incompatível com scrypt do UsersService)                             |

### 3.3 Integração Fundacional

| Contrato                     | Condição de PASS                                                | Status Atual                                                                                                                                                                                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| user → auth → RBAC           | User criado com role X recebe exatamente as permissões de X     | **FAIL** — dual RBAC: `packages/rbac/` tem 4 roles (`admin`, `vet`, `enfermagem`, `recepcao`) e `packages/modules/access-control/` tem 7 roles (`admin`, `reception`, `nurse`, `veterinarian`, `finance`, `inventory`, `auditor`). Seed Drizzle popula com os codes do rbac; AuthService usa access-control. |
| owner → patient → scheduling | Patient criado com owner_id aparece selecionável em agendamento | **PASS** — OwnersService e PatientsService com DB injection; SchedulingService valida via getOrThrow                                                                                                                                                                                                         |
| encounter → billing          | Encounter aberto aceita billing items                           | **FAIL** — BillingService usa Maps em memória; `DatabaseBillingRepository` exportado mas não injetado                                                                                                                                                                                                        |

### 3.4 RBAC

| Critério                                                  | Condição de PASS                                                                                                  | Status Atual                                                                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Matriz 7 roles × 32 permissions validada                  | Cada role tem exatamente as permissões definidas no catálogo de AccessControlService; teste automatizado confirma | **FAIL** — dual RBAC não reconciliado; seed popula 4 roles com codes diferentes dos 7 esperados pelo AccessControlService |
| Role codes consistentes entre seed, access-control e auth | `admin`, `reception`, `nurse`, `veterinarian`, `finance`, `inventory`, `auditor` em todos os pontos               | **FAIL** — seed Drizzle usa `vet`, `enfermagem`, `recepcao`                                                               |
| ForbiddenError para acesso sem permissão                  | `requirePrincipal` + `assertAuthorized` bloqueiam rotas sem permissão                                             | **PASS** — implementado em `server.ts`                                                                                    |
| User inativo bloqueado                                    | `actor.status !== "active"` lança ForbiddenError                                                                  | **PASS** — implementado em AccessControlService                                                                           |

### 3.5 Auditoria

| Critério                                                  | Condição de PASS                                                                                                                    | Status Atual                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Toda rota protegida por requirePrincipal gera audit event | Cada handler protegido chama `appendAudit()` com actorId, accountId, module, action, entityType, entityId, riskLevel, correlationId | **PASS** — implementado em `server.ts`        |
| AuditService com repositório DB injetado                  | Eventos persistem em banco, não apenas em memória                                                                                   | **PASS** — `DatabaseAuditRepository` injetado |

### 3.6 Banco de Dados

| Critério                   | Condição de PASS                                            | Status Atual                                                  |
| -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| FKs validadas              | Todas as foreign keys do schema Drizzle aplicam sem erro    | **PASS** — schema `0000_vengeful_pet_avengers.sql` define FKs |
| Indexes presentes          | Indexes declarados no schema estão presentes após migration | **PASS** — schema inclui indexes                              |
| Constraints CHECK aplicam  | Constraints de validação (ENUMs, CHECKs) funcionam          | **PASS** — 28 ENUMs + CHECKs no schema                        |
| Sem dados órfãos após seed | Seed não viola FKs                                          | **FAIL** — seed.sql referencia tabelas inexistentes           |

---

## 4. G2 — Release Gate

Bloqueia geração de release candidate. Requer G1 PASS + critérios adicionais.

### 4.1 Fluxos Críticos com Cobertura

Todos os fluxos FLUXO-01 a FLUXO-08 devem ter cobertura de teste automatizado (unitário + integração ou E2E).

| Fluxo                                           | Módulo(s)                                    | Cobertura Mínima            | Status Atual                                                             |
| ----------------------------------------------- | -------------------------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| FLUXO-01: Cadastro e habilitação do usuário     | users, auth, access-control, staff           | Unitário + API              | **FAIL** — UsersService sem DB persistence; staff seed-only              |
| FLUXO-02: Veterinário e elegibilidade em agenda | users, staff, scheduling                     | Unitário + API              | **FAIL** — Staff sem CRUD; SchedulingService sem DB                      |
| FLUXO-03: Tutor + Paciente + Marcação           | owners, patients, scheduling                 | Unitário + E2E UI + E2E API | **PASS** — coberto por smoke.spec.ts e fluxo-principal.spec.ts           |
| FLUXO-04: Agendamento → Atendimento             | scheduling, encounters                       | Unitário + API + E2E API    | **PASS** — coberto por fluxo-principal.spec.ts                           |
| FLUXO-05: Atendimento → Clínico → Faturamento   | encounters, triage, medical-records, billing | Unitário + API              | **FAIL** — BillingService sem DB persistence                             |
| FLUXO-06: Atendimento → Consumo → Estoque       | encounters, inventory, notifications         | Unitário + API              | **FAIL** — InventoryService sem DB persistence                           |
| FLUXO-07: Alteração de permissão                | users, access-control, auth                  | Unitário + API              | **FAIL** — UsersService sem DB persistence                               |
| FLUXO-08: Inativação e bloqueio                 | users, access-control, auth                  | Unitário + API              | **FAIL** — UsersService sem DB; login não verifica status explicitamente |

### 4.2 Módulos com Persistência DB

Todos os 21 módulos devem ter repositório DB injetado no service.

| Módulo                  | DB Injection            | Status         |
| ----------------------- | ----------------------- | -------------- |
| access-control          | N/A (catálogo estático) | OK             |
| attachments             | Sim                     | OK             |
| audit                   | Sim                     | OK             |
| auth                    | Sim                     | OK             |
| **billing**             | **NÃO**                 | **BLOQUEANTE** |
| diagnostics             | Sim                     | OK             |
| discharges              | Sim                     | OK             |
| encounters              | Sim                     | OK             |
| inpatient               | Sim                     | OK             |
| **inventory**           | **NÃO**                 | **BLOQUEANTE** |
| medical-records         | Sim (4 repos)           | OK             |
| notifications           | Sim                     | OK             |
| owners                  | Sim                     | OK             |
| patients                | Sim                     | OK             |
| prescription-executions | Sim                     | OK             |
| **scheduling**          | **NÃO**                 | **BLOQUEANTE** |
| staff                   | Nenhum repo             | **BLOQUEANTE** |
| surgery                 | Sim                     | OK             |
| triage                  | Sim                     | OK             |
| **users**               | **NÃO**                 | **BLOQUEANTE** |

### 4.3 Testes Mínimos por Módulo Crítico

| Módulo          | Testes Mínimos                                                                 | Tipo                 | Status Atual                                        |
| --------------- | ------------------------------------------------------------------------------ | -------------------- | --------------------------------------------------- |
| auth            | Login com senha correta/errada, refresh, logout, sessão expirada, user inativo | Unitário + API       | ~10 testes unitários + cobertura em runtime.test.ts |
| encounters      | Open, transition (todos os status), close, com/sem queueEntryId                | Unitário + API + E2E | ~10 unitários + runtime.test.ts + smoke             |
| patients        | CRUD, validação de owner, busca por query                                      | Unitário + E2E       | ~5 unitários + smoke                                |
| owners          | CRUD, busca por query, isolamento por accountId                                | Unitário + E2E       | ~5 unitários + smoke                                |
| medical-records | Ensure record, create entry, update entry (versioning), archive, timeline      | Unitário + API       | ~15 unitários + db-persistence.test.ts              |

### 4.4 Cobertura de Testes

| Critério                                                                                      | Condição de PASS                 | Status Atual                                          |
| --------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------- |
| Módulos críticos (auth, encounters, patients, owners, medical-records) com ≥ 80% de cobertura | Medido por v8 coverage no Vitest | **FAIL** — sem configuração de coverage em 20 módulos |
| Módulos não-críticos com ≥ 60% de cobertura                                                   | Medido por v8 coverage no Vitest | **FAIL** — sem configuração de coverage               |
| API com ≥ 70% de cobertura nas rotas protegidas                                               | Medido por c8/nyc                | **FAIL** — sem configuração de coverage               |

---

## 5. G3 — Homologação Gate

Requer G1 + G2 PASS + critérios adicionais.

### 5.1 Ambiente de Homologação

| Critério                             | Condição de PASS                                      |
| ------------------------------------ | ----------------------------------------------------- |
| PostgreSQL 16 disponível e acessível | Conexão estabelecida, schema migrado                  |
| Redis 7 disponível e acessível       | Conexão estabelecida                                  |
| API respondendo health check         | `GET /health` retorna 200 com status ok               |
| Frontend compilado e servido         | Next.js build sem erro, acessível via Caddy           |
| Worker rodando                       | Processo ativo, consumindo filas                      |
| Seed executado com dados de teste    | Roles, permissions, users, owners, patients populados |
| Banco isolado para homologação       | Schema dedicado, não compartilhado com produção       |
| Dual RBAC reconciliado               | Um único sistema de roles/permissões ativo            |
| Dual migration track eliminado       | Apenas Drizzle como runner de migration               |
| seed.sql corrigido ou eliminado      | Não referencia tabelas inexistentes                   |

### 5.2 Fluxos de Homologação

Todos os FLUXO-01 a FLUXO-08 devem ser executáveis ponta a ponta no ambiente de homologação, com persistência DB confirmada (dados sobrevivem a restart da API).

| Fluxo    | Persistência Confirmada             | Status                       |
| -------- | ----------------------------------- | ---------------------------- |
| FLUXO-01 | UsersService com DB injection       | Pendente                     |
| FLUXO-02 | Staff com CRUD + Scheduling com DB  | Pendente                     |
| FLUXO-03 | Owners, Patients, Scheduling com DB | Pendente (Scheduling sem DB) |
| FLUXO-04 | Scheduling, Encounters com DB       | Pendente (Scheduling sem DB) |
| FLUXO-05 | Billing com DB                      | Pendente                     |
| FLUXO-06 | Inventory com DB                    | Pendente                     |
| FLUXO-07 | Users com DB                        | Pendente                     |
| FLUXO-08 | Users com DB                        | Pendente                     |

---

## 6. G4 — Produção Assistida Gate

Requer G1 + G2 + G3 PASS + critérios adicionais.

### 6.1 Critérios de Produção Assistida

| Critério                                                           | Condição de PASS                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| Todos os 12 fluxos (FLUXO-01 a FLUXO-12) executáveis ponta a ponta | Sem falha em sequência completa                        |
| CI pipeline automatizado                                           | Pipeline executa G1 + G2 em cada push/PR               |
| Rollback definido                                                  | Procedimento de rollback documentado e testado         |
| Monitoramento ativo                                                | Health checks, logs estruturados, alertas configurados |
| Audit trail persistido em banco                                    | Eventos de auditoria em PostgreSQL, não em memória     |
| Sem dados em memória como fonte de verdade                         | Todos os 21 módulos com DB injection confirmada        |
| Password hashing compatível                                        | Seed e UsersService usam o mesmo algoritmo (scrypt)    |
| Dual audit consolidado                                             | Um único pacote de audit como fonte de verdade         |

---

## 7. Classificação de Resultados

### 7.1 BLOCKER (bloqueia merge/release)

| Categoria                            | Exemplos Reais do CVG-HIS-V2                         |
| ------------------------------------ | ---------------------------------------------------- |
| Testes de integração falhando        | `db-persistence.test.ts` falha por schema divergente |
| Migration quebrada                   | seed.sql referencia tabelas inexistentes             |
| Dual RBAC não resolvido              | 4 roles no seed vs 7 roles no AccessControlService   |
| Módulo crítico sem persistência DB   | billing, inventory, scheduling, users                |
| Fluxo crítico sem cobertura de teste | FLUXO-01, FLUXO-05, FLUXO-07, FLUXO-08               |
| Matriz RBAC não validada             | Role codes incompatíveis entre seed e access-control |
| Auditoria não persistida em banco    | Dual audit packages não consolidados                 |

### 7.2 WARNING (não bloqueia, mas deve ser resolvido)

| Categoria                                          | Exemplos Reais do CVG-HIS-V2                          |
| -------------------------------------------------- | ----------------------------------------------------- |
| Cobertura abaixo de 80% em módulo não-crítico      | notifications, attachments, staff                     |
| Sem vitest.config.ts em módulos                    | 20 módulos sem configuração explícita                 |
| E2E fixture baseURL mismatch                       | Fixture `:3000` vs smoke `:4001`                      |
| Sem shared test utilities                          | Cada módulo constrói grafo de serviços do zero        |
| Triage imutável                                    | Sem método update                                     |
| Prescription-executions sem validação de entidades | clinicalEntryId, patientId, encounterId não validados |
| Discharges sem validação de encounter              | encounterId não validado contra existência            |
| Login não verifica status do user                  | Apenas assertAuthorized protege, não o login em si    |

### 7.3 INFO (observação, sem ação imediata)

| Categoria                                   | Exemplos Reais do CVG-HIS-V2 |
| ------------------------------------------- | ---------------------------- |
| Worker não inspecionado em profundidade     | Estado real desconhecido     |
| Frontend web além do dist/ não inspecionado | Código fonte não auditado    |
| Performance dos testes com banco real       | Não medido                   |
| Events package mínimo (2 tipos)             | Apenas ClinicalNote\* events |

---

## 8. Resumo de Status Atual dos Gates

| Gate                    | Status   | BLOCKERs Ativos                                                                                   |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| G1 — Merge              | **FAIL** | Dual RBAC, dual migrations, seed.sql quebrado, 4 módulos sem DB, E2E baseURL mismatch             |
| G2 — Release            | **FAIL** | 4 módulos sem DB persistence, FLUXO-01/02/05/06/07/08 sem cobertura completa, sem coverage config |
| G3 — Homologação        | **FAIL** | G1 + G2 fail, ambiente não provisionado, seed SHA-256 incompatível                                |
| G4 — Produção Assistida | **FAIL** | G1+G2+G3 fail, sem CI pipeline, dual audit não consolidado                                        |

---

## 9. Pré-requisitos para Reavaliação

Os gates só podem ser reavaliados após a resolução dos seguintes blockers:

1. **Unificar migration track** — eliminar SQL legado ou migrar para Drizzle; testes devem usar `0000_vengeful_pet_avengers.sql`
2. **Reconciliar RBAC** — escolher um sistema (recomendado: `packages/modules/access-control/` com 7 roles) e atualizar seed.ts
3. **Corrigir seed.sql** — eliminar ou atualizar para tabelas Drizzle (`stock_items`, não `inventory_items`; sem `medical_records`; sem `owner_patient_links`)
4. **Injetar DB nos 4 módulos** — billing, inventory, scheduling, users devem receber repositório DB no constructor
5. **Resolver staff** — criar StaffRepository com CRUD ou eliminar dependência de staff no auth flow
6. **Corrigir password hashing no seed** — usar scrypt compatível com UsersService, não SHA-256
7. **Corrigir E2E baseURL** — alinhar fixture com smoke config
8. **Adicionar coverage config** — vitest.config.ts compartilhado com v8 coverage
