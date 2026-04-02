# P001 — Master Implementation Plan — CVG-HIS-V2 Enterprise

> **Versão:** 1.0.0  
> **Data:** 2026-03-30  
> **Autor:** OneClaw 🦞  
> **Status:** Aprovado para execução  
> **Referências:** COMPARATIVE_REPORT.md, SUMMARY.md

---

## 1. Sumário Executivo

### 1.1 Visão
Transformar o CVG-HIS-V2 de um sistema com ~60-70% de cobertura real em um **ERP veterinário enterprise 100% funcional**, alinhado à documentação existente e pronto para produção.

### 1.2 Estado Atual
| Indicador | Valor |
|-----------|-------|
| Módulos documentados | 9 (Tutores, Pacientes, Atendimentos, Prontuário, Prescrições, Exames, Internação, Exec. Prescrição, Alta) |
| Módulos implementados | 7 de 9 (faltam: `discharges`, `prescription-executions`) |
| Migrations existentes | 5 de 20+ planejadas |
| Testes unitários | ~18 (meta: 52+) |
| Testes E2E | 4 |
| Repositories database | 11 de 18 módulos |
| Páginas frontend | 23 de 25 planejadas |
| API endpoints | ~67 |

### 1.3 Estado Alvo
- 9 módulos 100% implementados com service + repository (in-memory + database) + testes
- 20+ migrations SQL idempotentes
- 52+ testes unitários + 8+ testes E2E
- Todos os módulos com database repository
- Frontend completo com todas as páginas
- Hardening enterprise aplicado
- Score de prontidão: **90+/100**

### 1.4 Escopo Total
| Fase | Sprints | Tarefas Estimadas | Duração Estimada |
|------|---------|-------------------|------------------|
| F01 — Fundação de Banco | 2 | 12 | 1 semana |
| F02 — Módulo Discharges | 2 | 10 | 1 semana |
| F03 — Módulo Prescription-Executions | 2 | 10 | 1 semana |
| F04 — Database Repositories | 3 | 15 | 1.5 semanas |
| F05 — Testes e Cobertura | 3 | 18 | 1.5 semanas |
| F06 — Hardening Enterprise | 2 | 12 | 1 semana |
| F07 — Frontend Completo | 2 | 10 | 1 semana |
| F08 — Consolidação e Deploy | 2 | 8 | 1 semana |
| **Total** | **18** | **95** | **~9 semanas** |

---

## 2. Princípios e Regras

### 2.1 Arquitetura
- **Repository Pattern obrigatório**: cada módulo tem `InMemory*Repository` + `Database*Repository`
- **Estrutura de módulo**: `src/index.ts` (service + interfaces) + `src/repositories/` (implementações)
- **Contracts centralizados** em `packages/shared/contracts/src/index.ts`
- **Migrations idempotentes** em `packages/shared/database/src/migrations/`
- **Serviço não acessa banco diretamente** — sempre via repository

### 2.2 Código
- TypeScript estrito (`strict: true`)
- Nenhum `any` em código novo
- Validação de entrada em toda rota HTTP
- Erros padronizados via `packages/shared/errors`
- Logging estruturado via `packages/shared/logging`

### 2.3 Testes
- **Todo módulo novo** tem mínimo: 1 teste de service + 1 teste de repository
- **Todo bug corrigido** tem teste de regressão
- Framework: Vitest
- E2E: Playwright
- Comando de validação: `pnpm test`

### 2.4 Segurança
- Auth via HMAC (`AUTH_SECRET`)
- RBAC enforcement em toda rota
- Audit logging em toda escrita
- Dados sensíveis nunca em logs

---

## 3. Fases de Implementação

---

### F01 — Fundação de Banco de Dados

**Objetivo:** Consolidar sistema de migrations, criar migrations 006-012, eliminar duplicação packages/db vs packages/shared/database.

#### Sprint SP01 — Auditoria e Limpeza

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T001 | Auditoria do schema Drizzle | Ler `packages/db/migrations/0000_vengeful_pet_avengers.sql` (890 linhas) e identificar tabelas/colunas que não existem em `001_initial_schema.sql` | M | Lista completa de diferenças documentada |
| T002 | Mapear colunas faltantes | Comparar colunas de cada tabela entre Drizzle e SQL manual. Documentar gaps (ex: `clinical_alerts` em patients, `chiefComplaint` em encounters) | M | Tabela comparativa em docs |
| T003 | Decidir estratégia de consolidação | Escolher: (A) migrar tudo para Drizzle, ou (B) expandir SQL manual. Recomendado: (B) SQL manual conforme ADR-005 | S | Decisão documentada em ADR |
| T004 | Remover `packages/db` do workspace | Após confirmar que API não usa, remover de `pnpm-workspace.yaml` ou marcar como deprecated | S | Build passa sem packages/db |

**Entrega D001:** Documento de auditoria de schema + decisão ADR

**Checkpoint CP01:**
- [ ] Tabela comparativa completa (Drizzle vs SQL manual)
- [ ] ADR de consolidação aprovado
- [ ] `pnpm test` passa
- [ ] `pnpm build` passa

---

#### Sprint SP02 — Migrations 006-012

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T005 | Migration 006 — Expansão Owners | Adicionar colunas: `full_name`, `document_type`, `contacts_json`, `address_json`, `financial_responsible`, `source`, `status` | M | Tabela owners com schema expandido |
| T006 | Migration 007 — Expansão Patients | Adicionar colunas: `species`, `breed`, `sex`, `weight_kg`, `is_neutered`, `microchip`, `clinical_alerts_json`, `color` | M | Tabela patients com schema expandido |
| T007 | Migration 008 — Expansão Encounters | Adicionar colunas: `chief_complaint`, `encounter_type`, `priority`, `origin`, `clinical_snapshot_json` | M | Tabela encounters com schema expandido |
| T008 | Migration 009 — Hardening Encounters | Adicionar constraints: `encounter_type` CHECK, `priority` CHECK, FK para patients, NOT NULL em campos essenciais | S | Constraints aplicadas sem erro |
| T009 | Migration 010 — Discharges | Criar tabela `discharges` com: id, encounter_id (FK), discharge_type, outcome, clinical_summary, continuity_instructions, follow_up_date, discharged_by, discharged_at | M | Tabela criada e testada |
| T010 | Migration 011 — Expansão Inpatient | Adicionar colunas: `admission_type`, `estimated_discharge`, `actual_discharge`, `bed_id` (FK) | S | Schema inpatient_stays expandido |
| T011 | Migration 012 — Prescription Executions | Criar tabelas: `prescription_executions` (id, clinical_entry_id, patient_id, encounter_id, medication_name, dosage, route, scheduled_at, status) e `administration_events` (id, execution_id, event_type, administered_by, administered_at, notes, vitals_snapshot_json) | M | Tabelas criadas e testadas |
| T012 | Migration 013 — Versionamento | Adicionar coluna `version` (INTEGER DEFAULT 1) em: patients, encounters, medical_records, inpatient_stays, discharges, prescription_executions | M | Colunas adicionadas |

**Entrega D002:** Migrations 006-013 criadas, testadas, aplicadas

**Checkpoint CP02:**
- [ ] Todas as migrations aplicam sem erro em banco limpo
- [ ] Sequência 001→013 funciona idempotentemente
- [ ] `pnpm test` passa
- [ ] Schema resultante tem todas as colunas documentadas

---

### F02 — Módulo Discharges (Alta/Desfecho Clínico)

**Objetivo:** Criar módulo completo de alta/desfecho clínico conforme docs/87 a docs/96.

#### Sprint SP03 — Domain e Backend

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T013 | Criar estrutura do módulo | `packages/modules/discharges/` com package.json, tsconfig.json, src/index.ts, src/repositories/ | S | Diretório criado e compilável |
| T014 | Definir interfaces | `DischargeService`, `DischargeRepository` com métodos: create, getById, listByEncounter, update | S | Interfaces em src/index.ts |
| T015 | Implementar InMemoryDischargeRepository | CRUD em Map, listByEncounter, validação de duplicidade por encounter | M | Repository funcional |
| T016 | Implementar DatabaseDischargeRepository | CRUD em PostgreSQL, queries parametrizadas, listByEncounter com JOIN | M | Repository funcional com DB real |
| T017 | Implementar DischargesService | Lógica: validação de encounter exists, bloqueio de duplicidade, integração com medical-records para timeline, permissões discharges.read/discharge.manage | M | Service funcional |
| T018 | Criar rotas API | `GET /discharges`, `POST /discharges`, `GET /discharges/:id`, `GET /discharges?encounterId=`, `PATCH /discharges/:id` | M | Rotas respondendo corretamente |
| T019 | Registrar no access-control | Adicionar permissões `discharges.read`, `discharges.manage` nos profiles admin, veterinarian, nurse | S | Permissões funcionando |

**Entrega D003:** Módulo discharges backend completo

#### Sprint SP04 — Testes e Frontend

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T020 | Testes unitários discharges | Testar: create, getById, listByEncounter, duplicate-block, update. Mínimo 5 testes | M | 5+ testes passando |
| T021 | Página frontend discharges | `apps/web/src/pages/discharges.ts` — listagem, formulário de criação, detail com resumo clínico | M | Página funcional no browser |
| T022 | Adicionar na sidebar | Incluir link "Altas" no grupo Assistencial da navegação | S | Link visível e navegável |

**Entrega D004:** Módulo discharges 100% completo (backend + testes + frontend)

**Checkpoint CP03:**
- [ ] 5+ testes passando para discharges
- [ ] API routes respondendo (GET/POST/PATCH)
- [ ] Frontend page renderiza e navega
- [ ] Permissões RBAC funcionando
- [ ] `pnpm test` global passa

---

### F03 — Módulo Prescription-Executions (Enfermagem)

**Objetivo:** Criar módulo completo de execução de prescrição conforme docs/82 a docs/86.

#### Sprint SP05 — Domain e Backend

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T023 | Criar estrutura do módulo | `packages/modules/prescription-executions/` com package.json, tsconfig.json, src/index.ts, src/repositories/ | S | Diretório criado e compilável |
| T024 | Definir interfaces | `PrescriptionExecutionService`, `PrescriptionExecutionRepository` com métodos: create, getById, listByEncounter, listByPatient, execute, logEvent | S | Interfaces em src/index.ts |
| T025 | Implementar InMemoryPrescriptionExecutionRepository | CRUD em Map, listByEncounter, listByPatient, listByStatus | M | Repository funcional |
| T026 | Implementar DatabasePrescriptionExecutionRepository | CRUD em PostgreSQL com JOINs em administration_events | M | Repository funcional com DB real |
| T027 | Implementar PrescriptionExecutionService | Lógica: validação de status transitions (pending→administered, pending→not-administered, pending→suspended, suspended→cancelled), double-check workflow, vitals snapshot | M | Service funcional |
| T028 | Criar rotas API | `GET /prescription-executions`, `POST /prescription-executions`, `GET /prescription-executions/:id`, `POST /prescription-executions/:id/execute`, `POST /prescription-executions/:id/log` | M | Rotas respondendo corretamente |
| T029 | Registrar no access-control | Adicionar permissões `prescription-executions.read`, `prescription-executions.manage` nos profiles admin, nurse, veterinarian | S | Permissões funcionando |

**Entrega D005:** Módulo prescription-executions backend completo

#### Sprint SP06 — Testes e Frontend

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T030 | Testes unitários prescription-executions | Testar: create, execute (administered/not-administered), status transitions, log event, vitals snapshot. Mínimo 6 testes | M | 6+ testes passando |
| T031 | Página frontend prescription-executions | `apps/web/src/pages/prescription-executions.ts` — listagem por paciente, ação de administrar/não-administrar, log de eventos | M | Página funcional no browser |
| T032 | Adicionar na sidebar | Incluir link "Execução Prescrição" no grupo Assistencial da navegação | S | Link visível e navegável |

**Entrega D006:** Módulo prescription-executions 100% completo

**Checkpoint CP04:**
- [ ] 6+ testes passando para prescription-executions
- [ ] API routes respondendo com transições de status corretas
- [ ] Frontend page renderiza e funcional
- [ ] Permissões RBAC funcionando
- [ ] `pnpm test` global passa

---

### F04 — Database Repositories para Módulos In-Memory

**Objetivo:** Criar database repositories para módulos que só têm in-memory: billing, inventory, triage, scheduling, staff, users, access-control.

#### Sprint SP07 — Repositories Parte 1

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T033 | DatabaseBillingRepository | Implementar CRUD + queries (listByEncounter, listByStatus) em PostgreSQL. Schema já existe em 001. | M | Repository funcional |
| T034 | DatabaseInventoryRepository | Implementar CRUD + queries (listItems, listConsumptions) em PostgreSQL. Schema já existe em 001. | M | Repository funcional |
| T035 | DatabaseSchedulingRepository | Criar migration para tabela `appointments` se não existir. Implementar CRUD + queue operations. | M | Repository funcional |
| T036 | DatabaseTriageRepository | Criar migration para tabela `triage_records` se não existir. Implementar CRUD + listByEncounter. | M | Repository funcional |

**Entrega D007:** 4 novos database repositories

#### Sprint SP08 — Repositories Parte 2

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T037 | DatabaseStaffRepository | Criar migration para tabela `staff` se não existir (pode ser derivada de `users`). Implementar CRUD. | M | Repository funcional |
| T038 | DatabaseUsersRepository | Verificar se tabela `users` existe (verificar schema Drizzle vs SQL). Implementar CRUD em PostgreSQL. | M | Repository funcional |
| T039 | DatabaseAccessControlRepository | Criar migration para tabelas `roles`, `permissions`, `role_permissions`. Implementar CRUD. | M | Repository funcional |
| T040 | DatabaseSurgeryRepository | Verificar/criar repository database para surgery_cases (schema existe em 001). Limpar padrão híbrido Map+DB. | M | Repository consistente |

**Entrega D008:** 4 novos database repositories + surgery limpo

#### Sprint SP09 — Integração e Testes

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T041 | Wiring de repositories | Atualizar composition root em apps/api para usar Database*Repository quando DATABASE_URL existe | M | API usa DB repositories em produção |
| T042 | Testes para novos repositories | Mínimo 1 teste por repository novo (8 testes) | M | 8+ testes passando |
| T043 | Teste de integração DB | Teste que roda migrations + cria + lê + atualiza em banco real | M | Teste de integração passando |

**Entrega D009:** Todos os módulos com database repositories e testes

**Checkpoint CP05:**
- [ ] 18/18 módulos têm database repository
- [ ] 8+ novos testes passando
- [ ] Composition root usa DB repositories quando DATABASE_URL existe
- [ ] `pnpm test` global passa

---

### F05 — Testes e Cobertura

**Objetivo:** Alcançar 52+ testes unitários e cobertura de 80%+ nos módulos core.

#### Sprint SP10 — Testes de Módulos Sem Cobertura

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T044 | Testes owners | Testar: create, update, getById, list, contacts handling. Mínimo 5 testes | M | 5+ testes passando |
| T045 | Testes patients | Testar: create, update, getById, list, clinical alerts. Mínimo 5 testes | M | 5+ testes passando |
| T046 | Testes access-control | Testar: addPermission, removePermission, listPermissions, role management. Mínimo 4 testes | M | 4+ testes passando |
| T047 | Testes audit | Testar: logEvent, listEvents, filterByDate, filterByActor. Mínimo 4 testes | M | 4+ testes passando |

**Entrega D010:** 18+ novos testes para módulos sem cobertura

#### Sprint SP11 — Testes de Fluxos e Edge Cases

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T048 | Testes scheduling | Testar: create appointment, check-in, call queue. Mínimo 4 testes | M | 4+ testes passando |
| T049 | Testes staff | Testar: create, getById, list. Mínimo 3 testes | M | 3+ testes passando |
| T050 | Testes triage | Testar: create, list, priority handling. Mínimo 3 testes | M | 3+ testes passando |
| T051 | Testes users | Testar: create, update, getById, list. Mínimo 4 testes | M | 4+ testes passando |

**Entrega D011:** 14+ novos testes completando cobertura de todos os módulos

#### Sprint SP12 — E2E e Suite Ampla

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T052 | E2E — Fluxo Discharges | Playwright: criar atendimento → prontuário → alta → verificar timeline | M | Teste E2E passando |
| T053 | E2E — Fluxo Prescription Executions | Playwright: criar prescrição → executar → verificar log | M | Teste E2E passando |
| T054 | E2E — Fluxo Completo (admissão→alta) | Playwright: tutor → paciente → atendimento → prontuário → prescrição → execução → alta | L | Teste E2E passando |
| T055 | Estabilizar suite ampla | Rodar `pnpm test` completo, corrigir falhas, garantir 52+ testes | M | 52/52 testes passando |

**Entrega D012:** Suite ampla 52/52 + 6+ testes E2E

**Checkpoint CP06:**
- [ ] 52+ testes unitários passando
- [ ] 6+ testes E2E passando
- [ ] Todos os 9 módulos com testes
- [ ] `pnpm test` sem falhas
- [ ] Relatório de cobertura gerado

---

### F06 — Hardening Enterprise

**Objetivo:** Aplicar hardening transversal conforme docs/90-hardening-global.md.

#### Sprint SP13 — Hardening de Dados

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T056 | Migration 014 — Constraints Seguras | Adicionar NOT NULL em campos essenciais (species, sex, chief_complaint, encounter_type). Adicionar CHECK constraints. Adicionar FK constraints faltantes. | M | Constraints aplicadas |
| T057 | Migration 015 — Índices | Criar índices para queries frequentes: owners(account_id), patients(owner_id), encounters(patient_id), clinical_entries(encounter_id), discharges(encounter_id) | M | Índices criados |
| T058 | Remover cache in-memory dos services | Substituir qualquer cache Map/LRU por queries ao repository. Services devem ser stateless. | M | Services sem estado em memória |
| T059 | Versionamento otimista | Adicionar expectedVersion em: patients, encounters, inpatient, discharges, prescription-executions (medical-records já tem) | M | Versionamento funcionando |

**Entrega D013:** Hardening de dados aplicado

#### Sprint SP14 — Hardening de API e Segurança

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T060 | Padronizar lifecycle endpoints | Todos os módulos com status têm endpoint de transition com validação de estado | M | Transições padronizadas |
| T061 | Auditoria em toda escrita | Verificar que todo POST/PATCH/DELETE gera audit_event | M | Audit trail completo |
| T062 | Validação de entrada | Adicionar validação Zod/Joi em todas as rotas de escrita | M | Validação em todas rotas |
| T063 | Error handling padronizado | Todos os erros retornam formato padrão: { error: { code, message, details? } } | M | Formato consistente |
| T064 | Rate limiting básico | Adicionar rate limiting nas rotas de auth (login, refresh) | S | Rate limiting funcionando |
| T065 | CORS e headers de segurança | Configurar CORS, Helmet headers, CSP básico | S | Headers configurados |

**Entrega D014:** Hardening de API e segurança aplicado

**Checkpoint CP07:**
- [ ] Todas as constraints aplicadas sem erro
- [ ] Versionamento otimista em 5+ entidades
- [ ] Validação de entrada em todas rotas de escrita
- [ ] Audit logging em toda escrita
- [ ] `pnpm test` passa
- [ ] `pnpm build` passa
- [ ] Nenhum `any` em código novo

---

### F07 — Frontend Completo

**Objetivo:** Implementar páginas faltantes e integrar rotas backend ao frontend.

#### Sprint SP15 — Páginas Novas e Integração

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T066 | Página Discharges | Implementar listagem, formulário de criação, detail com resumo clínico, integração com API | M | Página funcional |
| T067 | Página Prescription-Executions | Implementar listagem por paciente, ação de administrar, log de eventos | M | Página funcional |
| T068 | Wire PATCH /owners/:id | Implementar formulário de edição de owners no frontend | M | Edição funcional |
| T069 | Wire PATCH /patients/:id | Implementar formulário de edição de patients no frontend | M | Edição funcional |
| T070 | Wire PATCH /users/:id | Implementar formulário de edição de users no frontend | M | Edição funcional |

**Entrega D015:** 5 páginas novas/integradas

#### Sprint SP16 — Navbar e UX

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T071 | Remover título da sidebar | Aplicar plano docs/905 — remover branding excessivo do topo | S | Sidebar limpa |
| T072 | Implementar responsividade mobile | Overlay, fechamento por clique fora, Escape, scroll lock | M | Mobile funcional |
| T073 | Remover layout legado | Deletar `apps/web/src/pages/layout.ts` paralelo, consolidar em `index.ts` | S | Apenas um layout |
| T074 | Atualizar sidebar com novos links | Adicionar "Altas" e "Execução Prescrição" na sidebar | S | Links presentes |

**Entrega D016:** Navbar e UX melhorados

**Checkpoint CP08:**
- [ ] 25 páginas frontend funcionais
- [ ] Sidebar sem layout legado paralelo
- [ ] Responsividade mobile funcionando
- [ ] Todos os links da sidebar levam a páginas funcionais
- [ ] Smoke test E2E passa

---

### F08 — Consolidação, Deploy e Go-Live

**Objetivo:** Consolidação final, documentação atualizada, deploy preparado.

#### Sprint SP17 — Consolidação

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T075 | Remover packages/domain | Deletar pacote legacy, remover de workspace, corrigir imports | M | Build passa sem domain |
| T076 | Remover packages/ui vazio | Deletar pacote vazio ou implementar mínimo | S | Pacote resolvido |
| T077 | Atualizar contratos | Adicionar exports de discharges e prescription-executions em packages/shared/contracts | S | Contratos atualizados |
| T078 | Atualizar documentação | Atualizar SUMMARY.md, docs de módulos, relatórios de auditoria para refletir estado real | M | Docs alinhadas com código |

**Entrega D017:** Projeto consolidado

#### Sprint SP18 — Deploy e Go-Live

| ID | Tarefa | Descrição | Esforço | Critério de Aceite |
|----|--------|-----------|---------|-------------------|
| T079 | Atualizar docker-compose.v2.yml | Adicionar variáveis de ambiente novas, verificar healthchecks | S | Docker sobe corretamente |
| T080 | Script de seed | Criar script de seed com dados de exemplo (admin user, roles, permissions, sample data) | M | Seed popula banco corretamente |
| T081 | Teste de deploy end-to-end | Subir stack completa: PostgreSQL + Redis + API + Web + Worker. Rodar migrations. Testar fluxo completo. | M | Deploy funcional |
| T082 | Relatório final de prontidão | Gerar matriz de prontidão atualizada com notas reais | M | Score 90+/100 |

**Entrega D018:** Sistema pronto para produção

**Checkpoint CP09 (Final):**
- [ ] 52+ testes unitários passando
- [ ] 6+ testes E2E passando
- [ ] 25 páginas frontend funcionais
- [ ] 18/18 módulos com database repository
- [ ] 13 migrations aplicando corretamente
- [ ] Docker stack funcional end-to-end
- [ ] Documentação atualizada
- [ ] Score de prontidão 90+/100
- [ ] `pnpm test` passa
- [ ] `pnpm build` passa
- [ ] `pnpm typecheck` passa

---

## 4. Módulos Novos — Specs Detalhadas

### 4.1 Módulo Discharges

**Diretório:** `packages/modules/discharges/`

**Domínio:**
- **Discharge** = encerramento formal de caso clínico
- **Tipos:** ambulatorial, internação, transferência, óbito
- **Campos:** id, encounter_id, discharge_type, outcome, clinical_summary, continuity_instructions, follow_up_date, follow_up_notes, discharged_by, discharged_at, version, created_at, updated_at

**Schema (Migration 010):**
```sql
CREATE TABLE IF NOT EXISTS discharges (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL REFERENCES encounters(id),
  discharge_type TEXT NOT NULL CHECK (discharge_type IN ('ambulatory','inpatient','transfer','death')),
  outcome TEXT,
  clinical_summary TEXT,
  continuity_instructions TEXT,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  follow_up_notes TEXT,
  discharged_by TEXT NOT NULL,
  discharged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(encounter_id)
);
```

**Service Interface:**
```typescript
interface DischargeService {
  create(input: CreateDischargeInput): Promise<Discharge>;
  getById(id: string): Promise<Discharge>;
  getByEncounterId(encounterId: string): Promise<Discharge | null>;
  list(params: ListDischargesParams): Promise<Discharge[]>;
  update(id: string, input: UpdateDischargeInput, expectedVersion: number): Promise<Discharge>;
}
```

**Permissões:** `discharges.read`, `discharges.manage`

**Rotas API:**
- `GET /discharges` — listagem com filtros
- `POST /discharges` — criação
- `GET /discharges/:id` — detail
- `GET /discharges?encounterId=` — por atendimento
- `PATCH /discharges/:id` — atualização

---

### 4.2 Módulo Prescription-Executions

**Diretório:** `packages/modules/prescription-executions/`

**Domínio:**
- **PrescriptionExecution** = registro de administração de item prescrito
- **Status:** pending, administered, not-administered, suspended, cancelled
- **AdministrationEvent** = log de cada ação sobre a execução

**Schema (Migration 012):**
```sql
CREATE TABLE IF NOT EXISTS prescription_executions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  clinical_entry_id TEXT NOT NULL REFERENCES clinical_entries(id),
  patient_id TEXT NOT NULL REFERENCES patients(id),
  encounter_id TEXT NOT NULL REFERENCES encounters(id),
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  route TEXT,
  frequency TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','administered','not-administered','suspended','cancelled')),
  administered_by TEXT,
  administered_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS administration_events (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES prescription_executions(id),
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  vitals_snapshot_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Service Interface:**
```typescript
interface PrescriptionExecutionService {
  create(input: CreateExecutionInput): Promise<PrescriptionExecution>;
  getById(id: string): Promise<PrescriptionExecution>;
  listByEncounter(encounterId: string): Promise<PrescriptionExecution[]>;
  listByPatient(patientId: string): Promise<PrescriptionExecution[]>;
  execute(id: string, input: ExecuteInput): Promise<PrescriptionExecution>;
  logEvent(id: string, input: LogEventInput): Promise<AdministrationEvent>;
}
```

**Transições válidas:**
- pending → administered
- pending → not-administered
- pending → suspended
- suspended → pending
- suspended → cancelled
- *(administered e not-administered são finais)*

**Permissões:** `prescription-executions.read`, `prescription-executions.manage`

**Rotas API:**
- `GET /prescription-executions` — listagem
- `POST /prescription-executions` — criação
- `GET /prescription-executions/:id` — detail com events
- `POST /prescription-executions/:id/execute` — administrar/não-administrar
- `POST /prescription-executions/:id/log` — registrar evento

---

## 5. Checklist Mestre

### F01 — Fundação de Banco
- [ ] CP01 — Auditoria de schema completa
- [ ] CP02 — Migrations 006-013 criadas e aplicadas

### F02 — Módulo Discharges
- [ ] CP03 — Backend + testes + frontend completos

### F03 — Módulo Prescription-Executions
- [ ] CP04 — Backend + testes + frontend completos

### F04 — Database Repositories
- [ ] CP05 — 18/18 módulos com database repository

### F05 — Testes e Cobertura
- [ ] CP06 — 52+ testes unitários + 6+ E2E

### F06 — Hardening Enterprise
- [ ] CP07 — Constraints, versionamento, validação, auditoria

### F07 — Frontend Completo
- [ ] CP08 — 25 páginas, navbar limpa, responsiva

### F08 — Consolidação e Deploy
- [ ] CP09 — Deploy E2E funcional, score 90+/100

---

## 6. Template de Relatório Parcial

A cada checkpoint, gerar relatório neste formato:

```markdown
# Relatório Parcial — [CHECKPOINT_ID]

> Data: YYYY-MM-DD
> Fase: [Fase Nome]
> Sprint: [Sprint Nome]

## Tarefas Concluídas
| ID | Tarefa | Status | Notas |
|----|--------|--------|-------|
| T001 | ... | ✅/❌ | ... |

## Testes
- Total: X/Y passando
- Novos: N
- Falhando: [lista]

## Cobertura
- Módulos com testes: X/9
- Linhas cobertas: XX%

## Issues Encontradas
1. [descrição]

## Próximos Passos
1. [ação]

## Decisões Tomadas
1. [decisão + rationale]
```

---

## 7. Matriz de Progresso

| Fase | Sprint | Tarefas | Status | % |
|------|--------|---------|--------|---|
| F01 | SP01 | T001-T004 | ⬜ Pendente | 0% |
| F01 | SP02 | T005-T012 | ⬜ Pendente | 0% |
| F02 | SP03 | T013-T019 | ⬜ Pendente | 0% |
| F02 | SP04 | T020-T022 | ⬜ Pendente | 0% |
| F03 | SP05 | T023-T029 | ⬜ Pendente | 0% |
| F03 | SP06 | T030-T032 | ⬜ Pendente | 0% |
| F04 | SP07 | T033-T036 | ⬜ Pendente | 0% |
| F04 | SP08 | T037-T040 | ⬜ Pendente | 0% |
| F04 | SP09 | T041-T043 | ⬜ Pendente | 0% |
| F05 | SP10 | T044-T047 | ⬜ Pendente | 0% |
| F05 | SP11 | T048-T051 | ⬜ Pendente | 0% |
| F05 | SP12 | T052-T055 | ⬜ Pendente | 0% |
| F06 | SP13 | T056-T059 | ⬜ Pendente | 0% |
| F06 | SP14 | T060-T065 | ⬜ Pendente | 0% |
| F07 | SP15 | T066-T070 | ⬜ Pendente | 0% |
| F07 | SP16 | T071-T074 | ⬜ Pendente | 0% |
| F08 | SP17 | T075-T078 | ⬜ Pendente | 0% |
| F08 | SP18 | T079-T082 | ⬜ Pendente | 0% |

---

## 8. Glossário

| Termo | Definição |
|-------|-----------|
| HIS | Hospital Information System |
| RBAC | Role-Based Access Control |
| ADR | Architecture Decision Record |
| CRUD | Create, Read, Update, Delete |
| FK | Foreign Key |
| SPA | Single Page Application |
| ORM | Object-Relational Mapping |
| E2E | End-to-End |
| SPC | Serviços, Pacientes, Controles (backlog category) |
| ENT | Enterprise (backlog category) |
| CP | Checkpoint de Validação |
| T | Tarefa |
| D | Deliverable (Entrega) |
| SP | Sprint |

---

## 9. Anexos

### 9.1 Módulos Existentes (18)

| Módulo | Database Repo | Testes | Status |
|--------|:---:|:---:|--------|
| access-control | ❌ | ❌ | Ativo |
| attachments | ✅ | ✅ | Ativo |
| audit | ✅ | ✅ | Ativo |
| auth | ✅ | ✅ | Ativo |
| billing | ❌ | ✅ | Ativo |
| diagnostics | ✅ | ✅ | Aprovado c/ ressalvas |
| encounters | ✅ | ✅ | Aprovado c/ ressalvas |
| inpatient | ✅ | ✅ | Aprovado c/ ressalvas |
| inventory | ❌ | ✅ | Ativo |
| medical-records | ✅ | ✅ | Aprovado |
| notifications | ✅ | ✅ | Ativo |
| owners | ✅ | ❌ | Aprovado c/ ressalvas |
| patients | ✅ | ❌ | Aprovado c/ ressalvas |
| scheduling | ❌ | ❌ | Ativo |
| staff | ❌ | ❌ | Ativo |
| surgery | ✅ | ✅ | Ativo |
| triage | ❌ | ❌ | Ativo |
| users | ❌ | ❌ | Ativo |

### 9.2 Módulos a Criar (2)

| Módulo | Migration | Database Repo | Testes |
|--------|:---:|:---:|:---:|
| discharges | 010 | T016 | T020 |
| prescription-executions | 012 | T026 | T030 |

### 9.3 Migrations Planejadas

| # | Nome | Descrição | Sprint |
|---|------|-----------|--------|
| 001 | initial_schema | Schema inicial (22 tabelas) | ✅ Existente |
| 002 | entry_revisions | Tabela entry_revisions | ✅ Existente |
| 003 | advanced_care_persistence | Inpatient progress, surgery | ✅ Existente |
| 004 | clinical_entry_governance | archived_at, archived_by | ✅ Existente |
| 005 | sectors_beds | Setores e leitos | ✅ Existente |
| 006 | expand_owners | Schema expandido owners | SP02 |
| 007 | expand_patients | Schema expandido patients | SP02 |
| 008 | expand_encounters | Schema expandido encounters | SP02 |
| 009 | hardening_encounters | Constraints encounters | SP02 |
| 010 | create_discharges | Tabela discharges | SP02 |
| 011 | expand_inpatient | Schema expandido inpatient | SP02 |
| 012 | create_prescription_executions | Tabelas exec. prescrição | SP02 |
| 013 | add_versioning | Colunas version | SP02 |
| 014 | constraints_seguras | NOT NULL, CHECK, FK | SP13 |
| 015 | indices_performance | Índices para queries | SP13 |

### 9.4 API Endpoints Planejados (Novos)

| Método | Rota | Módulo | Sprint |
|--------|------|--------|--------|
| GET | /discharges | discharges | SP03 |
| POST | /discharges | discharges | SP03 |
| GET | /discharges/:id | discharges | SP03 |
| PATCH | /discharges/:id | discharges | SP03 |
| GET | /prescription-executions | prescription-executions | SP05 |
| POST | /prescription-executions | prescription-executions | SP05 |
| GET | /prescription-executions/:id | prescription-executions | SP05 |
| POST | /prescription-executions/:id/execute | prescription-executions | SP05 |
| POST | /prescription-executions/:id/log | prescription-executions | SP05 |

---

*Documento gerado em 2026-03-30. Atualizar matriz de progresso a cada checkpoint concluído.*
