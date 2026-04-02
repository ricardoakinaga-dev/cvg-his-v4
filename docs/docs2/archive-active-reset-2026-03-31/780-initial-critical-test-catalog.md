# 780 — Catálogo de Testes Críticos Iniciais

**Status:** R0 — testes priorizados baseados em estado real
**Data:** 2026-03-31
**Fonte de verdade:** `docs/710-integration-matrix.md`, `docs/720-critical-business-flows.md`, `docs/705-repository-assessment-for-validation-layer.md`

---

## 1. Catálogo Priorizado

### ICT-001 — Usuário criado autentic e opera conforme permissões

| Campo             | Valor                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| **ID**            | ICT-001                                                                                           |
| **Nome**          | User → Auth → RBAC acesso real                                                                    |
| **Objetivo**      | Provar que usuário criado com role X recebe permissões corretas e opera módulos conforme catálogo |
| **Pré-condições** | Banco limpo com migration 0000\_ + seed; AccessControlService com 7 roles e 32 perms              |
| **Tipo**          | Integração API                                                                                    |
| **Módulos**       | users, auth, access-control                                                                       |
| **Criticidade**   | CRÍTICA                                                                                           |

**Passo a passo:**

1. Admin autenticado chama `POST /users` com `{ username: "vet_test", email: "vet@test.com", password: "Test1234!", roleCode: "veterinarian" }`
2. Verificar response 201 com user criado (sem passwordHash)
3. Novo usuário chama `POST /auth/login` com `{ username: "vet_test", password: "Test1234!" }`
4. Verificar response 200 com accessToken e refreshToken
5. Com accessToken, chama `GET /patients` — verificar 200
6. Com accessToken, chama `POST /patients` com payload válido — verificar 201
7. Com accessToken, chama `GET /access-control` — verificar 403 (veterinarian não tem `access.read`)
8. Com accessToken, chama `POST /users` — verificar 403 (veterinarian não tem `users.manage`)

**Resultado esperado:**

- User criado com sucesso
- Login retorna sessão válida
- Rotas com permissão retornam 200/201
- Rotas sem permissão retornam 403
- Audit events registrados para operações permitidas

---

### ICT-002 — Veterinário elegível para agendamento

| Campo             | Valor                                                                               |
| ----------------- | ----------------------------------------------------------------------------------- |
| **ID**            | ICT-002                                                                             |
| **Nome**          | Veterinário → Agenda elegibilidade                                                  |
| **Objetivo**      | Provar que profissional com role veterinarian pode ser referenciado em agendamentos |
| **Pré-condições** | User veterinário criado; Owner e Patient existentes                                 |
| **Tipo**          | Integração API                                                                      |
| **Módulos**       | users, staff, scheduling                                                            |
| **Criticidade**   | ALTA                                                                                |

**Passo a passo:**

1. Admin cria user com `roleCode: "veterinarian"` via `POST /users`
2. Recepcionista autenticada lista staff via `GET /staff` — verificar que staff vinculado ao user aparece
3. Recepcionista cria appointment via `POST /appointments` com `{ patientId, ownerId, startAt, endAt, professionalUserId: <userId> }`
4. Verificar response 201 com appointment criado
5. Recepcionista lista appointments via `GET /appointments` — verificar que appointment aparece com professionalUserId correto

**Resultado esperado:**

- Staff vinculado ao user aparece na lista
- Appointment criado com professionalUserId válido
- Appointment listado corretamente

**Gap conhecido:** StaffService é seed-only. O professionalUserId refere-se a User, não a um Staff com CRUD próprio.

---

### ICT-003 — Tutor e paciente permitem agendamento

| Campo             | Valor                                                                |
| ----------------- | -------------------------------------------------------------------- |
| **ID**            | ICT-003                                                              |
| **Nome**          | Tutor/Paciente → Agendamento                                         |
| **Objetivo**      | Provar que tutor e paciente criados são selecionáveis em agendamento |
| **Pré-condições** | Recepcionista autenticada                                            |
| **Tipo**          | Integração API + E2E                                                 |
| **Módulos**       | owners, patients, scheduling                                         |
| **Criticidade**   | CRÍTICA                                                              |

**Passo a passo:**

1. Recepcionista cria owner via `POST /owners` com `{ fullName: "Maria Silva", document: "12345678900", phoneMain: "11999999999" }`
2. Verificar response 201 com ownerId
3. Recepcionista cria patient via `POST /patients` com `{ name: "Rex", species: "canine", ownerId: <ownerId> }`
4. Verificar response 201 com patientId
5. Recepcionista busca patient via `GET /patients?q=Rex` — verificar que patient aparece
6. Recepcionista busca owner via `GET /owners?q=Maria` — verificar que owner aparece
7. Recepcionista cria appointment via `POST /appointments` com `{ patientId, ownerId, startAt, endAt }`
8. Verificar response 201 com appointment criado
9. Recepcionista lista appointments — verificar que appointment aparece

**Resultado esperado:**

- Owner criado e persistido com DB
- Patient criado e persistido com DB
- Patient e owner encontrados em busca
- Appointment criado (em memória — gap documentado)
- Audit events: `owners/create`, `patients/create`, `scheduling/create_appointment`

---

### ICT-004 — Agendamento com check-in gera atendimento vinculado

| Campo             | Valor                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| **ID**            | ICT-004                                                                            |
| **Nome**          | Agendamento → Atendimento                                                          |
| **Objetivo**      | Provar que check-in em agendamento resulta em encounter com queueEntryId vinculado |
| **Pré-condições** | Owner, Patient, Appointment existentes                                             |
| **Tipo**          | Integração API + E2E                                                               |
| **Módulos**       | scheduling, encounters                                                             |
| **Criticidade**   | ALTA                                                                               |

**Passo a passo:**

1. Recepcionista faz check-in via `POST /queue/check-in` com `{ appointmentId }`
2. Verificar response 201 com queueEntry criada e status `checked_in`
3. Recepcionista abre encounter via `POST /encounters` com `{ patientId, ownerId, reason: "Consulta", queueEntryId: <queueEntryId> }`
4. Verificar response 201 com encounter criado e queueEntryId populado
5. Recepcionista consulta encounter via `GET /encounters/:id` — verificar queueEntryId presente
6. Recepcionista consulta timeline via `GET /encounters/:id/timeline` — verificar evento `queue_checked_in`

**Resultado esperado:**

- QueueEntry criada com status checked_in
- Encounter criado com queueEntryId
- Timeline registra queue_checked_in
- Audit events: `scheduling/check_in`, `encounters/open`

---

### ICT-005 — Atendimento gera audit trail em todas as operações

| Campo             | Valor                                                                   |
| ----------------- | ----------------------------------------------------------------------- |
| **ID**            | ICT-005                                                                 |
| **Nome**          | Atendimento → Audit Trail                                               |
| **Objetivo**      | Provar que cada operação protegida gera audit event com dados completos |
| **Pré-condições** | Veterinário autenticado; Encounter existente em status `in_care`        |
| **Tipo**          | Integração API                                                          |
| **Módulos**       | encounters, medical-records, audit                                      |
| **Criticidade**   | CRÍTICA                                                                 |

**Passo a passo:**

1. Veterinário cria entrada clínica via `POST /medical-records/entries` com `{ encounterId, entryType: "clinical_note", content: "Exame normal" }`
2. Verificar response 201 com entry criado
3. Veterinário consulta audit via `GET /audit/events`
4. Verificar que audit event existe com: actorId = userId do veterinário, module = `medical-records`, action = `create_entry`, entityType = `clinical-entry`, entityId = entryId, riskLevel = `high`
5. Veterinário atualiza entry via `PATCH /medical-records/entries/:id`
6. Verificar response 200 com version incrementada
7. Consultar audit novamente — verificar evento `update_entry` com version atualizada

**Resultado esperado:**

- Audit events criados para cada operação
- correlationId presente em cada evento
- actorId, accountId, module, action, entityType, entityId, riskLevel preenchidos corretamente

---

### ICT-006 — Atendimento gera itens de faturamento

| Campo             | Valor                                                     |
| ----------------- | --------------------------------------------------------- |
| **ID**            | ICT-006                                                   |
| **Nome**          | Atendimento → Faturamento                                 |
| **Objetivo**      | Provar que atendimento aceita criação de itens de billing |
| **Pré-condições** | Veterinário autenticado; Encounter existente              |
| **Tipo**          | Integração API                                            |
| **Módulos**       | encounters, billing                                       |
| **Criticidade**   | ALTA                                                      |

**Passo a passo:**

1. Veterinário cria billing item via `POST /billing/items` com `{ encounterId, itemType: "service", description: "Consulta", quantity: 1, unitPrice: 150 }`
2. Verificar response 201 com billing item criado
3. Verificar que billing record foi criado automaticamente (status draft → open)
4. Veterinário lista items via `GET /billing/items?encounterId=:id` — verificar item na lista
5. Veterinário consulta billing record via `GET /billing?encounterId=:id` — verificar record com status `open`
6. Veterinário cria segundo item — verificar que record existente é reutilizado
7. Veterinário atualiza status via `POST /billing/:encounterId/status` com `{ status: "estimated" }` — verificar 200

**Resultado esperado:**

- Billing item criado com 201
- Billing record criado automaticamente
- Items listados corretamente
- Status transita draft → open → estimated

**Gap conhecido:** BillingService usa Maps em memória. Dados perdidos em restart.

---

### ICT-007 — Consumo clínico reduz estoque e gera notificação

| Campo             | Valor                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| **ID**            | ICT-007                                                                                               |
| **Nome**          | Consumo → Estoque → Notificação                                                                       |
| **Objetivo**      | Provar que consumo reduz estoque e gera notificação de reposição quando nível mínimo atingido         |
| **Pré-condições** | Veterinário autenticado; Encounter existente; InventoryItem com onHandQuantity = 10, reorderLevel = 5 |
| **Tipo**          | Integração API                                                                                        |
| **Módulos**       | encounters, inventory, notifications                                                                  |
| **Criticidade**   | ALTA                                                                                                  |

**Passo a passo:**

1. Veterinário consulta estoque via `GET /inventory/items` — verificar item com onHandQuantity = 10
2. Veterinário registra consumo de 6 unidades via `POST /inventory/consumptions` com `{ encounterId, inventoryItemId, quantity: 6 }`
3. Verificar response 201 com consumption criada
4. Veterinário consulta estoque novamente — verificar onHandQuantity = 4
5. Veterinário consulta notificações via `GET /notifications` — verificar notificação com category `inventory`, severity `high`, title `Reposicao recomendada`
6. Veterinário tenta consumir 5 unidades (mais do que disponível) — verificar ConflictError "Insufficient stock"

**Resultado esperado:**

- onHandQuantity reduzida de 10 para 4
- Notificação de reposição criada automaticamente
- Consumo excessivo bloqueado com ConflictError

**Gap conhecido:** InventoryService usa Maps em memória. Estoque perdido em restart.

---

### ICT-008 — Alteração de role muda permissões de acesso

| Campo             | Valor                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| **ID**            | ICT-008                                                               |
| **Nome**          | Alteração de permissão → Efeito real                                  |
| **Objetivo**      | Provar que alterar role de usuário muda imediatamente suas permissões |
| **Pré-condições** | Admin autenticado; User existente com role `reception`                |
| **Tipo**          | Integração API                                                        |
| **Módulos**       | users, access-control, auth                                           |
| **Criticidade**   | CRÍTICA                                                               |

**Passo a passo:**

1. User com role `reception` faz login
2. User tenta `GET /billing` — verificar 403 (reception não tem `billing.read`)
3. Admin atualiza user via `PATCH /users/:id` com `{ roleCodes: ["veterinarian"] }`
4. User faz logout e login novamente
5. User tenta `GET /billing` — verificar 403 (veterinarian também não tem `billing.read`)
6. User tenta `POST /encounters` — verificar 201 (veterinarian tem `encounters.manage`)
7. User tenta `POST /patients` — verificar 201 (veterinarian tem `patients.manage`)

**Resultado esperado:**

- Antes da alteração: reception bloqueada em billing e encounters
- Após alteração: veterinarian liberado em encounters, ainda bloqueado em billing
- Nova sessão reflete novo AccessProfile

---

### ICT-009 — Inativação bloqueia operações

| Campo             | Valor                                                             |
| ----------------- | ----------------------------------------------------------------- |
| **ID**            | ICT-009                                                           |
| **Nome**          | Inativação → Bloqueio operacional                                 |
| **Objetivo**      | Provar que usuário inativo não consegue operar módulos protegidos |
| **Pré-condições** | Admin autenticado; User existente e ativo                         |
| **Tipo**          | Integração API                                                    |
| **Módulos**       | users, access-control, auth                                       |
| **Criticidade**   | CRÍTICA                                                           |

**Passo a passo:**

1. User ativo faz login e opera normalmente (`GET /patients` → 200)
2. Admin atualiza user via `PATCH /users/:id` com `{ status: "inactive" }`
3. User tenta `GET /patients` com token existente — verificar 403 (AccessControlService verifica `actor.status !== "active"`)
4. User tenta `POST /encounters` — verificar 403
5. User tenta `POST /auth/login` novamente — verificar comportamento (gap: login não verifica status explicitamente)

**Resultado esperado:**

- Token existente é efetivamente invalidado pela verificação de status em assertAuthorized
- Todas as rotas protegidas retornam 403 para user inativo

**Gap conhecido:** Login não verifica status do user explicitamente. Proteção vem apenas de assertAuthorized nas rotas.

---

### ICT-010 — Triagem transita status do encounter

| Campo             | Valor                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| **ID**            | ICT-010                                                                  |
| **Nome**          | Atendimento → Triagem → Transição                                        |
| **Objetivo**      | Provar que triagem registra prioridade e transita encounter para destino |
| **Pré-condições** | Veterinário autenticado; Encounter em status `reception`                 |
| **Tipo**          | Integração API + E2E                                                     |
| **Módulos**       | encounters, triage                                                       |
| **Criticidade**   | ALTA                                                                     |

**Passo a passo:**

1. Veterinário registra triagem via `POST /triage` com `{ encounterId, priority: "high", chiefComplaint: "Febre", destination: "in_care" }`
2. Verificar response 201 com triage criado
3. Verificar que encounter status mudou para `in_care` via `GET /encounters/:id`
4. Verificar timeline com evento `triage_recorded`
5. Verificar queue atualizada via `GET /queue`

**Resultado esperado:**

- Triage criado com 201
- Encounter status = `in_care`
- Timeline registra `triage_recorded`
- QueueEntry transicionada

---

### ICT-011 — Internação com atribuição de leito

| Campo             | Valor                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| **ID**            | ICT-011                                                                  |
| **Nome**          | Internação completa                                                      |
| **Objetivo**      | Provar fluxo de internação: admissão → leito → progresso → alta          |
| **Pré-condições** | Veterinário autenticado; Encounter em `in_care`; Sector e Bed existentes |
| **Tipo**          | Integração API + E2E                                                     |
| **Módulos**       | encounters, inpatient, medical-records, discharges                       |
| **Criticidade**   | ALTA                                                                     |

**Passo a passo:**

1. Veterinário admite internação via `POST /inpatient` com `{ encounterId, unitId, wardId }`
2. Verificar response 201 com stay criado
3. Verificar encounter status mudou para `observation`
4. Veterinário atribui leito via `POST /inpatient/:stayId/assign-bed` com `{ bedId }`
5. Verificar response 200 com stay atualizado
6. Veterinário registra progresso via `POST /inpatient/progress` com `{ stayId, note: "Estável" }`
7. Verificar response 201 com progresso criado
8. Veterinário lista progressos via `GET /inpatient/:stayId/progress` — verificar progresso na lista

**Resultado esperado:**

- InpatientStay criado
- Encounter transita para observation
- Leito atribuído ao stay
- Progresso registrado e listado
- Medical record com evento `inpatient_admitted`

---

### ICT-012 — Cirurgia: solicitação e transição de status

| Campo             | Valor                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------- |
| **ID**            | ICT-012                                                                               |
| **Nome**          | Cirurgia completa                                                                     |
| **Objetivo**      | Provar fluxo cirúrgico: solicitação → pré-op → em progresso → recuperação → concluída |
| **Pré-condições** | Veterinário autenticado; Encounter existente                                          |
| **Tipo**          | Integração API                                                                        |
| **Módulos**       | encounters, surgery, medical-records                                                  |
| **Criticidade**   | ALTA                                                                                  |

**Passo a passo:**

1. Veterinário solicita cirurgia via `POST /surgeries` com `{ encounterId, procedureName: "Castração" }`
2. Verificar response 201 com surgery case criado (status `requested`)
3. Veterinário atualiza status via `POST /surgeries/:caseId/status` com `{ status: "pre_op" }` — verificar 200
4. Atualiza para `in_progress` — verificar 200
5. Atualiza para `recovery` — verificar 200
6. Atualiza para `completed` — verificar 200
7. Verificar medical record com eventos `surgery_requested` e `surgery_status_changed`

**Resultado esperado:**

- Surgery case criado com status `requested`
- Transições de status válidas aceitas
- Medical record com eventos cirúrgicos

---

### ICT-013 — Exames diagnósticos: solicitação e resultado

| Campo             | Valor                                                    |
| ----------------- | -------------------------------------------------------- |
| **ID**            | ICT-013                                                  |
| **Nome**          | Exames diagnósticos                                      |
| **Objetivo**      | Provar fluxo de exames: solicitação → coleta → resultado |
| **Pré-condições** | Veterinário autenticado; Encounter existente             |
| **Tipo**          | Integração API + E2E                                     |
| **Módulos**       | encounters, diagnostics, medical-records                 |
| **Criticidade**   | ALTA                                                     |

**Passo a passo:**

1. Veterinário solicita exame via `POST /diagnostics/orders` com `{ encounterId, examType: "lab", examName: "Hemograma" }`
2. Verificar response 201 com order criado (status `requested`)
3. Veterinário registra coleta via `POST /diagnostics/orders/:orderId/result` com `{ status: "collected" }` — verificar 200
4. Veterinário registra resultado via `POST /diagnostics/orders/:orderId/result` com `{ status: "resulted", resultData: {...} }` — verificar 200
5. Verificar medical record com eventos `diagnostic_requested` e `diagnostic_resulted`

**Resultado esperado:**

- DiagnosticOrder criado com status `requested`
- Status transita requested → collected → resulted
- Medical record com eventos diagnósticos

---

### ICT-014 — Prescrição e execução de medicação

| Campo             | Valor                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| **ID**            | ICT-014                                                                  |
| **Nome**          | Prescrição → Execução                                                    |
| **Objetivo**      | Provar fluxo de medicação: criação → execução → eventos de administração |
| **Pré-condições** | Veterinário autenticado; Encounter existente; ClinicalEntry existente    |
| **Tipo**          | Integração API                                                           |
| **Módulos**       | medical-records, prescription-executions                                 |
| **Criticidade**   | CRÍTICA                                                                  |

**Passo a passo:**

1. Veterinário cria prescription execution via `POST /prescription-executions` com `{ clinicalEntryId, patientId, encounterId, medicationName: "Dipirona", dosage: "1ml/kg", scheduledAt: "2026-04-01T10:00:00Z" }`
2. Verificar response 201 com execution criado (status `pending`)
3. Veterinário executa via `POST /prescription-executions/:id/execute` com `{ status: "administered" }` — verificar 200
4. Veterinário registra evento via `POST /prescription-executions/:id/log` com `{ eventType: "administered", notes: "Administered IV" }` — verificar 201
5. Veterinário consulta execution via `GET /prescription-executions/:id` — verificar status `administered` com eventos

**Resultado esperado:**

- PrescriptionExecution criado com status `pending`
- Execução muda status para `administered`
- AdministrationEvent registrado
- Gap: clinicalEntryId, patientId, encounterId não são validados quanto à existência

---

### ICT-015 — Alta (discharge) de atendimento

| Campo             | Valor                                                          |
| ----------------- | -------------------------------------------------------------- |
| **ID**            | ICT-015                                                        |
| **Nome**          | Alta de atendimento                                            |
| **Objetivo**      | Provar que alta pode ser criada e atualizada com versionamento |
| **Pré-condições** | Veterinário autenticado; Encounter existente                   |
| **Tipo**          | Integração API + E2E                                           |
| **Módulos**       | encounters, discharges                                         |
| **Criticidade**   | ALTA                                                           |

**Passo a passo:**

1. Veterinário cria alta via `POST /discharges` com `{ encounterId, dischargeType: "ambulatory" }`
2. Verificar response 201 com discharge criado (version 1)
3. Veterinário atualiza alta via `PATCH /discharges/:id` com `{ notes: "Paciente estável", expectedVersion: 1 }` — verificar 200 com version 2
4. Veterinário consulta alta via `GET /discharges/:id` — verificar dados atualizados

**Resultado esperado:**

- Discharge criado com version 1
- Update com optimistic concurrency (expectedVersion) incrementa para version 2
- Gap: encounterId não é validado quanto à existência

---

### ICT-016 — Notificações operacionais

| Campo             | Valor                                             |
| ----------------- | ------------------------------------------------- |
| **ID**            | ICT-016                                           |
| **Nome**          | Notificações operacionais                         |
| **Objetivo**      | Provar que notificações são criadas e processadas |
| **Pré-condições** | Veterinário autenticado                           |
| **Tipo**          | Integração API                                    |
| **Módulos**       | notifications                                     |
| **Criticidade**   | MÉDIA                                             |

**Passo a passo:**

1. Veterinário cria notificação via `POST /notifications` com `{ category: "operations", title: "Teste", message: "Notificação de teste", severity: "low" }`
2. Verificar response 201 com notification criada
3. Veterinário lista notificações via `GET /notifications` — verificar notificação na lista
4. Veterinário processa jobs via `POST /notifications/process` — verificar jobs processados

**Resultado esperado:**

- Notification criada com 201
- Notification listada corretamente
- Jobs processados com sucesso

---

### ICT-017 — Migration aplica em banco limpo

| Campo             | Valor                                                              |
| ----------------- | ------------------------------------------------------------------ |
| **ID**            | ICT-017                                                            |
| **Nome**          | Migration integrity                                                |
| **Objetivo**      | Provar que migration Drizzle 0000\_ aplica em banco limpo sem erro |
| **Pré-condições** | Banco PostgreSQL limpo (schema public dropado)                     |
| **Tipo**          | Migration                                                          |
| **Módulos**       | db                                                                 |
| **Criticidade**   | CRÍTICA                                                            |

**Passo a passo:**

1. Drop schema public
2. Executar `tsx packages/db/src/migrate.ts`
3. Verificar que 34 tabelas foram criadas
4. Verificar que 28 ENUM types foram criados
5. Verificar que todas as FKs estão presentes
6. Executar seed via `tsx packages/db/src/seed.ts`
7. Verificar que roles, permissions, account, unit foram populados

**Resultado esperado:**

- Migration aplica sem erro
- 34 tabelas criadas
- 28 ENUM types criados
- FKs presentes
- Seed popula dados iniciais

---

### ICT-018 — Dual RBAC detection

| Campo             | Valor                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| **ID**            | ICT-018                                                                      |
| **Nome**          | Dual RBAC detection                                                          |
| **Objetivo**      | Detectar e reportar divergência entre packages/rbac e modules/access-control |
| **Pré-condições** | Código compilado                                                             |
| **Tipo**          | Integração API                                                               |
| **Módulos**       | rbac, access-control                                                         |
| **Criticidade**   | CRÍTICA                                                                      |

**Passo a passo:**

1. Ler role codes de `packages/rbac/src/permissions.ts`
2. Ler role codes de `packages/modules/access-control/src/index.ts`
3. Comparar os dois conjuntos
4. Se diferentes, falhar o teste com relatório de divergência

**Resultado esperado:**

- Teste falha se role codes divergem
- Relatório lista codes presentes em um mas não no outro

---

### ICT-019 — FK constraint: encounter com patient inexistente deve falhar

| Campo             | Valor                                        |
| ----------------- | -------------------------------------------- |
| **ID**            | ICT-019                                      |
| **Nome**          | FK constraint validation                     |
| **Objetivo**      | Provar que FKs do banco impedem dados órfãos |
| **Pré-condições** | Banco com migration aplicada                 |
| **Tipo**          | Migration                                    |
| **Módulos**       | db                                           |
| **Criticidade**   | ALTA                                         |

**Passo a passo:**

1. Tentar insert direto na tabela `encounters` com `patient_id` inexistente
2. Verificar que PostgreSQL rejeita com foreign key violation
3. Tentar insert em `appointments` com `professional_user_id` inexistente
4. Verificar que PostgreSQL rejeita com foreign key violation

**Resultado esperado:**

- Inserts com FK inválida são rejeitados pelo banco
- Erro de foreign key violation retornado

---

### ICT-020 — Seed consistency: roles e permissions alinhados

| Campo             | Valor                                                                           |
| ----------------- | ------------------------------------------------------------------------------- |
| **ID**            | ICT-020                                                                         |
| **Nome**          | Seed consistency                                                                |
| **Objetivo**      | Provar que seed popula roles e permissions compatíveis com AccessControlService |
| **Pré-condições** | Banco limpo com migration aplicada                                              |
| **Tipo**          | Migration                                                                       |
| **Módulos**       | db, access-control                                                              |
| **Criticidade**   | CRÍTICA                                                                         |

**Passo a passo:**

1. Aplicar seed via `tsx packages/db/src/seed.ts`
2. Consultar roles no banco — verificar que codes são: admin, reception, nurse, veterinarian, finance, inventory, auditor
3. Consultar permissions no banco — verificar que keys correspondem às 32 perms do AccessControlService
4. Criar user com role `veterinarian` via seed
5. Fazer login e verificar que AccessProfile contém permissões corretas

**Resultado esperado:**

- Roles no banco correspondem exatamente aos 7 codes do AccessControlService
- Permissions no banco correspondem exatamente às 32 perms do AccessControlService
- User com role veterinarian recebe perfil correto

---

## 2. Resumo de Cobertura

| #       | Teste                        | Tipo             | Módulos                                            | Criticidade |
| ------- | ---------------------------- | ---------------- | -------------------------------------------------- | ----------- |
| ICT-001 | User → Auth → RBAC           | Integração API   | users, auth, access-control                        | CRÍTICA     |
| ICT-002 | Veterinário → Agenda         | Integração API   | users, staff, scheduling                           | ALTA        |
| ICT-003 | Tutor/Paciente → Agendamento | Integração + E2E | owners, patients, scheduling                       | CRÍTICA     |
| ICT-004 | Agendamento → Atendimento    | Integração + E2E | scheduling, encounters                             | ALTA        |
| ICT-005 | Atendimento → Audit          | Integração API   | encounters, medical-records, audit                 | CRÍTICA     |
| ICT-006 | Atendimento → Faturamento    | Integração API   | encounters, billing                                | ALTA        |
| ICT-007 | Consumo → Estoque            | Integração API   | encounters, inventory, notifications               | ALTA        |
| ICT-008 | Alteração de permissão       | Integração API   | users, access-control, auth                        | CRÍTICA     |
| ICT-009 | Inativação → Bloqueio        | Integração API   | users, access-control, auth                        | CRÍTICA     |
| ICT-010 | Triagem → Transição          | Integração + E2E | encounters, triage                                 | ALTA        |
| ICT-011 | Internação completa          | Integração + E2E | encounters, inpatient, medical-records, discharges | ALTA        |
| ICT-012 | Cirurgia completa            | Integração API   | encounters, surgery, medical-records               | ALTA        |
| ICT-013 | Exames diagnósticos          | Integração + E2E | encounters, diagnostics, medical-records           | ALTA        |
| ICT-014 | Prescrição → Execução        | Integração API   | medical-records, prescription-executions           | CRÍTICA     |
| ICT-015 | Alta de atendimento          | Integração + E2E | encounters, discharges                             | ALTA        |
| ICT-016 | Notificações                 | Integração API   | notifications                                      | MÉDIA       |
| ICT-017 | Migration integrity          | Migration        | db                                                 | CRÍTICA     |
| ICT-018 | Dual RBAC detection          | Integração API   | rbac, access-control                               | CRÍTICA     |
| ICT-019 | FK constraint validation     | Migration        | db                                                 | ALTA        |
| ICT-020 | Seed consistency             | Migration        | db, access-control                                 | CRÍTICA     |

**Total:** 20 testes críticos
**CRÍTICA:** 8 testes
**ALTA:** 11 testes
**MÉDIA:** 1 teste
