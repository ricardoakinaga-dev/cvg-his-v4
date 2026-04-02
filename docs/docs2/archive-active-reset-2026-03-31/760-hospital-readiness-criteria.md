# 760 — Critérios de Prontidão Hospitalar

**Status:** R0 — contrato de readiness
**Data:** 2026-03-31
**Faixa:** 700-790
**Fonte de verdade:** `docs/705-repository-assessment-for-validation-layer.md`, `docs/710-integration-matrix.md`, `docs/720-critical-business-flows.md`, `docs/750-release-gates.md`

---

## 1. Propósito

Definir "pronto para uso hospitalar" em critérios objetivos e verificáveis para o CVG-HIS-V2. Este documento é um contrato entre a equipe de desenvolvimento e os operadores do sistema. Não há interpretação subjetiva: cada critério é PASS ou FAIL.

---

## 2. Definição de "Pronto para Uso Hospitalar"

O CVG-HIS-V2 está pronto para uso hospitalar quando **todos** os critérios dos 6 eixos abaixo estão PASS e **nenhum** item impeditivo absoluto está ativo.

Um sistema "pronto para uso hospitalar" deve:

1. Sobreviver a restarts sem perda de dados (persistência DB em todos os módulos)
2. Controlar acesso de forma determinística (RBAC consistente, sem dual systems)
3. Rastrear toda operação clínica (audit trail em banco)
4. Manter integridade referencial (FKs, constraints, sem dados órfãos)
5. Executar todos os fluxos críticos ponta a ponta (FLUXO-01 a FLUXO-12)
6. Ser reproduzível (CI pipeline, migrations determinísticas, seed funcional)

---

## 3. Eixos de Prontidão

### 3.1 Eixo Estrutural

| #    | Critério                        | Condição de PASS                                                        | Status Atual                                                                                                                                                     |
| ---- | ------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E-01 | Schema único de verdade         | Apenas `packages/db/migrations/` como fonte de schema                   | **FAIL** — dual track: Drizzle (1 arquivo) + SQL legado (16 arquivos em `packages/shared/database/src/migrations/`)                                              |
| E-02 | Migration aplica em banco limpo | `tsx packages/db/src/migrate.ts` em DB vazio, exit 0, sem warnings      | **FAIL** — não validado automaticamente                                                                                                                          |
| E-03 | Seed funcional                  | `tsx packages/db/src/seed.ts` popula roles, permissions, users sem erro | **FAIL** — SHA-256 para senhas (incompatível com scrypt do UsersService); role codes em português (`vet`, `enfermagem`, `recepcao`) não batem com access-control |
| E-04 | seed.sql corrigido ou eliminado | `psql -f infra/scripts/seed.sql` sem erro OU arquivo removido           | **FAIL** — referencia `inventory_items`, `medical_records`, `owner_patient_links` (tabelas inexistentes no schema Drizzle)                                       |
| E-05 | 34 tabelas do schema presentes  | Após migration, todas as tabelas existem no banco                       | **PASS** — `0000_vengeful_pet_avengers.sql` define 34 tabelas                                                                                                    |
| E-06 | 28 ENUMs aplicados              | Todos os tipos ENUM do schema estão no banco                            | **PASS** — schema inclui 28 ENUMs                                                                                                                                |

### 3.2 Eixo Segurança/Acesso

| #    | Critério                      | Condição de PASS                                                                      | Status Atual                                                                                                                                                                                                                 |
| ---- | ----------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-01 | RBAC unificado                | Um único sistema de roles/permissões; seed e access-control usam os mesmos role codes | **FAIL** — dual RBAC: `packages/rbac/` (4 roles: `admin`, `vet`, `enfermagem`, `recepcao`) vs `packages/modules/access-control/` (7 roles: `admin`, `reception`, `nurse`, `veterinarian`, `finance`, `inventory`, `auditor`) |
| S-02 | Matriz 7×32 validada          | 7 roles × 32 permissions testadas automatizadamente                                   | **FAIL** — dual RBAC impede validação                                                                                                                                                                                        |
| S-03 | Password hashing consistente  | Seed e UsersService usam o mesmo algoritmo                                            | **FAIL** — seed usa SHA-256; UsersService usa scrypt com salt `'cvg-his-v2-seed-v1'`                                                                                                                                         |
| S-04 | Session management funcional  | AccessToken + refreshToken com expiração; refresh renova corretamente                 | **PASS** — implementado em AuthService com `DatabaseSessionRepository`                                                                                                                                                       |
| S-05 | User inativo bloqueado        | `actor.status !== "active"` lança ForbiddenError em todas as rotas protegidas         | **PASS** — AccessControlService.assertAuthorized() verifica                                                                                                                                                                  |
| S-06 | Login verifica status do user | Tentativa de login de user inativo é rejeitada no AuthService                         | **FAIL** — login não verifica status explicitamente; proteção vem apenas do assertAuthorized nas rotas                                                                                                                       |
| S-07 | Auth token HMAC seguro        | Tokens gerados com `node:crypto` HMAC                                                 | **PASS** — implementado em `server.ts`                                                                                                                                                                                       |

### 3.3 Eixo Operacional

| #    | Critério                                | Condição de PASS                                                    | Status Atual                                                                         |
| ---- | --------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| O-01 | Todos os 21 módulos com persistência DB | Cada module service recebe repositório DB injetado no constructor   | **FAIL** — 4 módulos sem DB injection: billing, inventory, scheduling, users         |
| O-02 | Staff com CRUD                          | StaffService tem operações create/update/delete com repositório DB  | **FAIL** — StaffService é seed-only: 7 registros hardcoded, sem repository, sem CRUD |
| O-03 | FLUXO-01 executável ponta a ponta       | User criado → login → RBAC funciona → rotas bloqueadas corretamente | **FAIL** — UsersService sem DB; dual RBAC                                            |
| O-04 | FLUXO-02 executável ponta a ponta       | Veterinário criado → aparece na agenda → appointment criado         | **FAIL** — Staff seed-only; SchedulingService sem DB                                 |
| O-05 | FLUXO-03 executável ponta a ponta       | Owner → Patient → Appointment criados e persistidos                 | **FAIL** — SchedulingService sem DB                                                  |
| O-06 | FLUXO-04 executável ponta a ponta       | Check-in → Encounter criado com queueEntryId                        | **PASS** — implementado com DB                                                       |
| O-07 | FLUXO-05 executável ponta a ponta       | Triage → Clinical entry → Billing items persistidos                 | **FAIL** — BillingService sem DB                                                     |
| O-08 | FLUXO-06 executável ponta a ponta       | Consumo reduz estoque → notificação criada                          | **FAIL** — InventoryService sem DB                                                   |
| O-09 | FLUXO-07 executável ponta a ponta       | Role alterado → nova sessão reflete permissões                      | **FAIL** — UsersService sem DB                                                       |
| O-10 | FLUXO-08 executável ponta a ponta       | User inativado → bloqueado em todas as rotas                        | **FAIL** — UsersService sem DB; login não verifica status                            |
| O-11 | FLUXO-09 a FLUXO-12 executáveis         | Internação, Exames, Cirurgia, Prescrição                            | **PARCIAL** — FLUXO-09 e FLUXO-10 cobertos por E2E; FLUXO-11 e FLUXO-12 sem E2E      |
| O-12 | Dados sobrevivem a restart da API       | Após `kill` + `start` da API, todos os dados persistem              | **FAIL** — billing, inventory, scheduling, users perdem dados                        |

### 3.4 Eixo Rastreabilidade

| #    | Critério                               | Condição de PASS                                                                        | Status Atual                                                                                                                                          |
| ---- | -------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-01 | Audit event em toda operação protegida | Cada handler com `requirePrincipal` chama `appendAudit()`                               | **PASS** — implementado em `server.ts`                                                                                                                |
| R-02 | correlationId em cada audit event      | correlationId presente em todos os audit events                                         | **PASS** — incluído no appendAudit                                                                                                                    |
| R-03 | Audit persistido em banco              | `DatabaseAuditRepository` como fonte de verdade                                         | **PASS** — injetado no AuditService                                                                                                                   |
| R-04 | Dual audit consolidado                 | Um único pacote de audit; `packages/audit/` e `packages/modules/audit/` unificados      | **FAIL** — `packages/audit/` (DB direto, não consumido pela API) coexiste com `packages/modules/audit/` (in-memory + optional DB, consumido pela API) |
| R-05 | Audit queryable                        | Eventos podem ser listados/filtrados por actorId, accountId, module, action, date range | **PASS** — AuditService tem list/seed                                                                                                                 |

### 3.5 Eixo Consistência de Dados

| #    | Critério                                              | Condição de PASS                                                   | Status Atual                                                                                                             |
| ---- | ----------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| C-01 | FKs aplicam sem erro                                  | Todas as foreign keys do schema Drizzle válidas                    | **PASS** — schema define FKs com ON DELETE/UPDATE                                                                        |
| C-02 | Sem dados órfãos                                      | Seed e operações não violam FKs                                    | **FAIL** — seed.sql referencia tabelas inexistentes                                                                      |
| C-03 | Constraints CHECK funcionam                           | ENUMs e CHECKs rejeitam dados inválidos                            | **PASS** — 28 ENUMs + CHECKs no schema                                                                                   |
| C-04 | Indexes presentes                                     | Indexes declarados no schema existem após migration                | **PASS** — schema inclui indexes                                                                                         |
| C-05 | Validação de entidades referenciadas                  | Módulos validam existência de entidades antes de criar referências | **FAIL** — discharges não valida encounterId; prescription-executions não valida clinicalEntryId, patientId, encounterId |
| C-06 | Patient/Owner ativo validado em scheduling/encounters | Tentativa de agendar/atender com patient/owner inativo é rejeitada | **FAIL** — apenas existência via getOrThrow é validada, não status ativo                                                 |

### 3.6 Eixo Estabilidade de Release

| #    | Critério                   | Condição de PASS                                                | Status Atual                                                                     |
| ---- | -------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| T-01 | CI pipeline automatizado   | Pipeline executa testes em cada push/PR                         | **FAIL** — nenhum pipeline configurado                                           |
| T-02 | Testes unitários passam    | `pnpm test` exit 0                                              | **FAIL** — 4 módulos sem DB injection comprometem resultados                     |
| T-03 | Testes de API passam       | `pnpm --filter @cvg-his-v2/api test:all` exit 0                 | **FAIL** — `prepare-test-db.mjs` usa schema SQL legado                           |
| T-04 | Testes E2E smoke passam    | `pnpm test:smoke` exit 0                                        | **FAIL** — baseURL mismatch                                                      |
| T-05 | Coverage configurado       | vitest.config.ts com v8 coverage em todos os módulos            | **FAIL** — 20 módulos sem vitest.config.ts                                       |
| T-06 | Banco isolado de validação | Testes de integração rodam em banco dedicado, não compartilhado | **FAIL** — `prepare-test-db.mjs` dropa e recria schema, mas usa track SQL legado |
| T-07 | Shared test utilities      | Factories/fixtures compartilhadas entre módulos                 | **FAIL** — cada módulo constrói grafo de serviços do zero                        |

---

## 4. Checklist Objetivo

Copiar e preencher para cada avaliação de readiness.

### 4.1 Estrutural

| Item                               | PASS | FAIL | N/A | Observação |
| ---------------------------------- | ---- | ---- | --- | ---------- |
| E-01: Schema único (Drizzle)       | ☐    | ☐    | ☐   |            |
| E-02: Migration em banco limpo     | ☐    | ☐    | ☐   |            |
| E-03: Seed funcional (scrypt)      | ☐    | ☐    | ☐   |            |
| E-04: seed.sql corrigido/eliminado | ☐    | ☐    | ☐   |            |
| E-05: 34 tabelas presentes         | ☐    | ☐    | ☐   |            |
| E-06: 28 ENUMs aplicados           | ☐    | ☐    | ☐   |            |

### 4.2 Segurança/Acesso

| Item                               | PASS | FAIL | N/A | Observação |
| ---------------------------------- | ---- | ---- | --- | ---------- |
| S-01: RBAC unificado               | ☐    | ☐    | ☐   |            |
| S-02: Matriz 7×32 validada         | ☐    | ☐    | ☐   |            |
| S-03: Password hashing consistente | ☐    | ☐    | ☐   |            |
| S-04: Session management           | ☐    | ☐    | ☐   |            |
| S-05: User inativo bloqueado       | ☐    | ☐    | ☐   |            |
| S-06: Login verifica status        | ☐    | ☐    | ☐   |            |
| S-07: Auth token HMAC              | ☐    | ☐    | ☐   |            |

### 4.3 Operacional

| Item                           | PASS | FAIL | N/A | Observação |
| ------------------------------ | ---- | ---- | --- | ---------- |
| O-01: 21 módulos com DB        | ☐    | ☐    | ☐   |            |
| O-02: Staff com CRUD           | ☐    | ☐    | ☐   |            |
| O-03: FLUXO-01                 | ☐    | ☐    | ☐   |            |
| O-04: FLUXO-02                 | ☐    | ☐    | ☐   |            |
| O-05: FLUXO-03                 | ☐    | ☐    | ☐   |            |
| O-06: FLUXO-04                 | ☐    | ☐    | ☐   |            |
| O-07: FLUXO-05                 | ☐    | ☐    | ☐   |            |
| O-08: FLUXO-06                 | ☐    | ☐    | ☐   |            |
| O-09: FLUXO-07                 | ☐    | ☐    | ☐   |            |
| O-10: FLUXO-08                 | ☐    | ☐    | ☐   |            |
| O-11: FLUXO-09 a FLUXO-12      | ☐    | ☐    | ☐   |            |
| O-12: Dados sobrevivem restart | ☐    | ☐    | ☐   |            |

### 4.4 Rastreabilidade

| Item                         | PASS | FAIL | N/A | Observação |
| ---------------------------- | ---- | ---- | --- | ---------- |
| R-01: Audit em toda operação | ☐    | ☐    | ☐   |            |
| R-02: correlationId          | ☐    | ☐    | ☐   |            |
| R-03: Audit em banco         | ☐    | ☐    | ☐   |            |
| R-04: Dual audit consolidado | ☐    | ☐    | ☐   |            |
| R-05: Audit queryable        | ☐    | ☐    | ☐   |            |

### 4.5 Consistência de Dados

| Item                               | PASS | FAIL | N/A | Observação |
| ---------------------------------- | ---- | ---- | --- | ---------- |
| C-01: FKs válidas                  | ☐    | ☐    | ☐   |            |
| C-02: Sem dados órfãos             | ☐    | ☐    | ☐   |            |
| C-03: Constraints CHECK            | ☐    | ☐    | ☐   |            |
| C-04: Indexes presentes            | ☐    | ☐    | ☐   |            |
| C-05: Validação de referências     | ☐    | ☐    | ☐   |            |
| C-06: Patient/Owner ativo validado | ☐    | ☐    | ☐   |            |

### 4.6 Estabilidade de Release

| Item                        | PASS | FAIL | N/A | Observação |
| --------------------------- | ---- | ---- | --- | ---------- |
| T-01: CI pipeline           | ☐    | ☐    | ☐   |            |
| T-02: Testes unitários      | ☐    | ☐    | ☐   |            |
| T-03: Testes de API         | ☐    | ☐    | ☐   |            |
| T-04: Testes E2E smoke      | ☐    | ☐    | ☐   |            |
| T-05: Coverage configurado  | ☐    | ☐    | ☐   |            |
| T-06: Banco isolado         | ☐    | ☐    | ☐   |            |
| T-07: Shared test utilities | ☐    | ☐    | ☐   |            |

---

## 5. Itens Impeditivos Absolutos

Estes itens **impedem** a declaração de prontidão hospitalar. Nenhum pode estar ativo.

| ID     | Item                              | Impacto                                                                              | Módulo(s)                  | Resolução Requerida                                                                 |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------ | -------------------------- | ----------------------------------------------------------------------------------- |
| IMP-01 | Billing sem persistência DB       | Dados de faturamento perdidos em restart; impacto financeiro direto                  | billing                    | Injetar `DatabaseBillingRepository` no `BillingService` constructor                 |
| IMP-02 | Inventory sem persistência DB     | Controle de estoque perdido em restart; risco de segurança do paciente (medicamento) | inventory                  | Injetar `DatabaseInventoryRepository` no `InventoryService` constructor             |
| IMP-03 | Scheduling sem persistência DB    | Agendamentos perdidos em restart; operação clínica interrompida                      | scheduling                 | Injetar `DatabaseSchedulingRepository` no `SchedulingService` constructor           |
| IMP-04 | Users sem persistência DB         | Usuários perdidos em restart; sistema inacessível                                    | users                      | Injetar `DatabaseUsersRepository` no `UsersService` constructor                     |
| IMP-05 | Dual RBAC não reconciliado        | Autorização imprevisível; roles do seed não batem com access-control                 | rbac, access-control, auth | Unificar em um sistema (recomendado: access-control com 7 roles); atualizar seed.ts |
| IMP-06 | Dual migration tracks             | Schema de testes diverge de produção; bugs não detectados                            | db                         | Eliminar track SQL legado ou migrar para Drizzle                                    |
| IMP-07 | seed.sql com tabelas inexistentes | Seed falha; ambiente não inicializável                                               | db/infra                   | Corrigir para tabelas Drizzle ou eliminar arquivo                                   |
| IMP-08 | SHA-256 no seed de senha          | Senhas do seed incompatíveis com scrypt do UsersService; login falha                 | db/seed                    | Usar scrypt com salt `'cvg-his-v2-seed-v1'`                                         |
| IMP-09 | Staff sem CRUD                    | Sem gerenciamento de profissionais; auth depende de seed hardcoded                   | staff                      | Criar `StaffRepository` com operações CRUD                                          |

---

## 6. Itens Toleráveis Temporariamente

Estes itens **não impedem** a declaração de prontidão, mas devem ser resolvidos em sprint subsequente.

| ID     | Item                                                        | Risco                                                                      | Prazo Sugerido |
| ------ | ----------------------------------------------------------- | -------------------------------------------------------------------------- | -------------- |
| TOL-01 | Cobertura de testes abaixo de 80% em módulos não-críticos   | Bugs não detectados em módulos secundários                                 | 2 sprints      |
| TOL-02 | Sem vitest.config.ts em 20 módulos                          | Sem métricas de coverage; configuração inconsistente                       | 1 sprint       |
| TOL-03 | E2E fixture baseURL mismatch                                | Smoke tests falham sem motivo real                                         | 1 sprint       |
| TOL-04 | Sem shared test utilities                                   | Duplicação de setup; manutenção custosa                                    | 2 sprints      |
| TOL-05 | Triage imutável                                             | Sem método update; pode limitar fluxos clínicos                            | 3 sprints      |
| TOL-06 | Prescription-executions sem validação de entidades          | Execução pode referenciar entidades inexistentes                           | 1 sprint       |
| TOL-07 | Discharges sem validação de encounter                       | Alta pode ser criada para encounter inexistente                            | 1 sprint       |
| TOL-08 | Login não verifica status do user                           | User inativo pode obter token novo (protegido apenas por assertAuthorized) | 1 sprint       |
| TOL-09 | Patient/Owner inativo não validado em scheduling/encounters | Agendamento/atendimento com entidades inativas                             | 2 sprints      |
| TOL-10 | FLUXO-11 (Cirurgia) sem E2E                                 | Fluxo cirúrgico sem validação ponta a ponta                                | 2 sprints      |
| TOL-11 | FLUXO-12 (Prescrição) sem E2E                               | Fluxo de medicação sem validação ponta a ponta                             | 2 sprints      |
| TOL-12 | Dual audit packages                                         | Confusão sobre qual pacote é fonte de verdade                              | 3 sprints      |
| TOL-13 | Worker não inspecionado                                     | Estado real desconhecido; pode falhar silenciosamente                      | 1 sprint       |

---

## 7. Matriz de Severidade

| Severidade          | Definição                                                                           | Exemplos Reais do CVG-HIS-V2                                                                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SEV-1** — Crítico | Dados perdidos, acesso indevido, sistema inacessível, risco à segurança do paciente | IMP-01: Billing sem DB — faturamento perdido em restart<br>IMP-02: Inventory sem DB — estoque perdido, risco de medicação<br>IMP-05: Dual RBAC — autorização imprevisível, acesso indevido possível<br>IMP-04: Users sem DB — sistema inacessível após restart   |
| **SEV-2** — Alto    | Fluxo clínico bloqueado, dados inconsistentes, operação degradada                   | IMP-03: Scheduling sem DB — agendamentos perdidos<br>IMP-09: Staff sem CRUD — sem gerenciamento de profissionais<br>IMP-06: Dual migrations — testes não refletem produção<br>C-05: Prescription-executions sem validação — referências a entidades inexistentes |
| **SEV-3** — Médio   | Funcionalidade limitada, risco controlado, workaround disponível                    | IMP-08: SHA-256 no seed — login de seed falha<br>TOL-08: Login não verifica status — proteção parcial via assertAuthorized<br>TOL-07: Discharges sem validação — alta para encounter inexistente<br>TOL-09: Patient/Owner inativo não validado em scheduling     |
| **SEV-4** — Baixo   | Qualidade de código, manutenibilidade, cobertura de testes                          | TOL-01: Cobertura abaixo de meta em módulos não-críticos<br>TOL-02: Sem vitest.config em 20 módulos<br>TOL-04: Sem shared test utilities<br>TOL-10/11: FLUXO-11/12 sem E2E                                                                                       |

---

## 8. Regras de Decisão

### 8.1 Declaração de Prontidão

O CVG-HIS-V2 é declarado **pronto para uso hospitalar** quando:

1. **Todos os 9 itens impeditivos (IMP-01 a IMP-09) estão resolvidos**
2. **Todos os 6 eixos têm ≥ 80% de critérios PASS**
3. **Nenhum SEV-1 ou SEV-2 ativo**
4. **FLUXO-01 a FLUXO-08 executáveis ponta a ponta com persistência DB confirmada**
5. **Checklist das seções 4.1 a 4.6 preenchido com ≥ 80% PASS em cada eixo**

### 8.2 Prontidão Condicional (Produção Assistida)

O CVG-HIS-V2 pode operar em **produção assistida** (com supervisão humana adicional) quando:

1. **IMP-01 a IMP-04 resolvidos** (os 4 módulos com DB injection)
2. **IMP-05 resolvido** (dual RBAC reconciliado)
3. **IMP-08 resolvido** (password hashing consistente)
4. **FLUXO-01 a FLUXO-08 executáveis** (mesmo que parcialmente)
5. **Nenhum SEV-1 ativo**
6. **SEV-2 ativos têm plano de resolução em ≤ 1 sprint**

### 8.3 Não Pronto

O CVG-HIS-V2 **não está pronto** para qualquer uso operacional quando:

1. **Qualquer SEV-1 ativo** (dados perdidos, acesso indevido, sistema inacessível)
2. **IMP-01 a IMP-04 ativos** (qualquer dos 4 módulos sem persistência DB)
3. **IMP-05 ativo** (dual RBAC não reconciliado)
4. **FLUXO-01 ou FLUXO-03 não executáveis** (auth ou cadastro de tutor/paciente bloqueados)

---

## 9. Estado Atual Consolidado

| Eixo                    | Critérios | PASS   | FAIL   | %       | Status         |
| ----------------------- | --------- | ------ | ------ | ------- | -------------- |
| Estrutural              | 6         | 2      | 4      | 33%     | **NÃO PRONTO** |
| Segurança/Acesso        | 7         | 3      | 4      | 43%     | **NÃO PRONTO** |
| Operacional             | 12        | 1      | 11     | 8%      | **NÃO PRONTO** |
| Rastreabilidade         | 5         | 4      | 1      | 80%     | **PRONTO**     |
| Consistência de Dados   | 6         | 4      | 2      | 67%     | **NÃO PRONTO** |
| Estabilidade de Release | 7         | 0      | 7      | 0%      | **NÃO PRONTO** |
| **Total**               | **43**    | **14** | **29** | **33%** | **NÃO PRONTO** |

**Impeditivos ativos:** 9 de 9
**SEV-1 ativos:** 4
**SEV-2 ativos:** 3
**SEV-3 ativos:** 4
**SEV-4 ativos:** 4

**Decisão:** CVG-HIS-V2 **NÃO ESTÁ PRONTO** para uso hospitalar.

---

## 10. Ordem de Resolução Recomendada

Para alcançar prontidão hospitalar na menor quantidade de sprints:

| Sprint   | Ações                                                                                                         | Impeditivos Resolvidos         |
| -------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Sprint 1 | Unificar migration track (eliminar SQL legado); corrigir seed.sql; corrigir password hashing no seed (scrypt) | IMP-06, IMP-07, IMP-08         |
| Sprint 2 | Reconciliar RBAC (unificar em access-control 7 roles); atualizar seed.ts                                      | IMP-05                         |
| Sprint 3 | Injetar DB em billing, inventory, scheduling, users                                                           | IMP-01, IMP-02, IMP-03, IMP-04 |
| Sprint 4 | Criar StaffRepository com CRUD; validar entidades em discharges e prescription-executions                     | IMP-09, TOL-06, TOL-07         |
| Sprint 5 | Configurar CI pipeline; vitest.config compartilhado; coverage; shared test utilities; corrigir E2E baseURL    | T-01 a T-07                    |
| Sprint 6 | E2E para FLUXO-11 e FLUXO-12; consolidar dual audit; validar patient/owner ativo em scheduling/encounters     | TOL-10, TOL-11, TOL-12, TOL-09 |

**Estimativa:** 6 sprints para prontidão hospitalar completa, assumindo 1 desenvolvedor dedicado.
