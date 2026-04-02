# 720 — Fluxos Críticos de Negócio

**Status:** R0 — fluxos definidos com base em código real
**Data:** 2026-03-31
**Fonte de verdade:** `docs/705-repository-assessment-for-validation-layer.md` + `docs/710-integration-matrix.md` + inspeção de código

---

## 1. Metodologia de Seleção

Um fluxo é crítico no CVG-HIS-V2 se satisfaz pelo menos um dos critérios:

1. **Segurança do paciente** — falha pode causar dano ao animal (medicação errada, diagnóstico perdido)
2. **Integridade financeira** — falha pode causar perda ou distorção de faturamento
3. **Controle de acesso** — falha permite operação por pessoa não autorizada
4. **Rastreabilidade** — falha apaga o histórico de quem fez o quê e quando
5. **Dependência em cascata** — falha impede 3+ módulos subsequentes de operar

Fluxos são ordenados por criticidade: CRÍTICA > ALTA > MÉDIA.

---

## 2. Fluxos Hospitalares Prioritários

### FLUXO-01 — Cadastro e Habilitação Operacional do Usuário

| Campo           | Valor                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Objetivo**    | Provar que um usuário criado com role X consegue operar módulos conforme permissões reais e é bloqueado nos demais |
| **Atores**      | Admin (cria usuário), Usuário criado (opera)                                                                       |
| **Criticidade** | CRÍTICA                                                                                                            |
| **Módulos**     | users, access-control, auth, staff                                                                                 |

**Pré-condições:**

- Banco com migration `0000_` aplicada
- Seed com roles e permissions populados via access-control (7 roles, 32 perms)
- Admin autenticado com role `admin`

**Sequência detalhada:**

1. Admin autenticado chama `POST /users` com `{ username, email, password, roleCode: 'veterinarian' }`
2. API valida body (username min 3 chars, email required, password min 8 chars)
3. UsersService cria user com scrypt password hash
4. User é retornado sem passwordHash
5. Novo usuário chama `POST /auth/login` com `{ username, password }`
6. AuthService verifica senha via scryptSync com salt `'cvg-his-v2-seed-v1'`
7. AuthService busca staff vinculado via `staff.findByUserId()`
8. AccessControlService.createProfile() gera perfil com permissões de `veterinarian`
9. Sessão criada com accessToken + refreshToken
10. Usuário autenticado tenta `GET /patients` (permite — `patients.read`)
11. Usuário autenticado tenta `POST /patients` (permite — `patients.manage`)
12. Usuário autenticado tenta `GET /access-control` (bloqueia — `access.read` não está no perfil de veterinarian)
13. Usuário autenticado tenta `POST /users` (bloqueia — `users.manage` não está no perfil)

**Entidades envolvidas:** User, Session, AccessProfile, Staff

**Efeitos esperados:**

- User persistido (se UsersService com DB injection)
- Session criada
- Audit events: `users/create`, `auth/session_read`, `patients/read`, `patients/manage`, tentativas bloqueadas em `access.read` e `users.manage`

**Falhas que devem ser bloqueadas:**

- Login com senha errada → AuthenticationError
- Acesso a rota sem permissão → ForbiddenError
- User inativo tenta login → ForbiddenError (AccessControlService verifica `actor.status !== "active"`)
- Token expirado → AuthenticationError

**Evidências que os testes devem coletar:**

- Response 201 na criação de user
- Response 200 no login com accessToken e refreshToken
- Response 200 em rotas permitidas
- Response 403 em rotas bloqueadas
- Audit events registrados para cada operação

---

### FLUXO-02 — Cadastro de Veterinário e Elegibilidade em Agenda

| Campo           | Valor                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------- |
| **Objetivo**    | Provar que um profissional cadastrado como veterinário aparece como elegível para agendamento |
| **Atores**      | Admin (cria), Recepcionista (agenda)                                                          |
| **Criticidade** | ALTA                                                                                          |
| **Módulos**     | users, staff, scheduling, access-control                                                      |

**Pré-condições:**

- Admin autenticado
- Recepcionista autenticada com role `reception`
- Owner e Patient existentes

**Sequência detalhada:**

1. Admin cria user com `roleCode: 'veterinarian'` via `POST /users`
2. StaffService (seed-only) tem registro vinculado ao user via `staffByUserId`
3. Recepcionista autenticada lista appointments via `GET /appointments`
4. Recepcionista cria appointment via `POST /appointments` com `{ patientId, ownerId, startAt, endAt, professionalUserId }`
5. SchedulingService valida patient via `patients.getOrThrow()`
6. SchedulingService valida owner via `owners.getOrThrow()`
7. Appointment criado

**Entidades envolvidas:** User, Staff, Appointment, Patient, Owner

**Efeitos esperados:**

- Appointment persistido com professionalUserId
- Appointment aparece em `GET /appointments`

**Falhas que devem ser bloqueadas:**

- Appointment com patient inexistente → NotFoundError
- Appointment com owner inexistente → NotFoundError
- Appointment sem permissão `scheduling.manage` → ForbiddenError

**Evidências que os testes devem coletar:**

- User veterinarian criado com sucesso
- Appointment criado com professionalUserId válido
- Appointment listado na consulta

**Gap conhecido:** StaffService é seed-only, sem CRUD. O professionalUserId refere-se a um User, não a um Staff com perfil profissional completo. Não há validação de que o professionalUserId corresponde a um staff com role veterinarian.

---

### FLUXO-03 — Cadastro Tutor + Paciente + Marcação de Consulta

| Campo           | Valor                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| **Objetivo**    | Provar que tutor e paciente criados são selecionáveis e permitem agendamento |
| **Atores**      | Recepcionista                                                                |
| **Criticidade** | CRÍTICA                                                                      |
| **Módulos**     | owners, patients, scheduling, access-control                                 |

**Pré-condições:**

- Recepcionista autenticada com role `reception`

**Sequência detalhada:**

1. Recepcionista chama `POST /owners` com `{ fullName, document, email, phoneMain }`
2. OwnersService cria owner com accountId da recepcionista
3. Owner retornado com id
4. Recepcionista chama `POST /patients` com `{ name, species, breed, sex, ownerId }`
5. PatientsService valida owner via `owners.getOrThrow()`
6. PatientsService cria patient e owner-patient link
7. Patient retornado com id
8. Recepcionista chama `GET /patients?q=<nome>` — patient aparece na busca
9. Recepcionista chama `GET /owners?q=<nome>` — owner aparece na busca
10. Recepcionista chama `POST /appointments` com `{ patientId, ownerId, startAt, endAt }`
11. SchedulingService valida patient e owner
12. Appointment criado
13. Recepcionista chama `GET /appointments` — appointment aparece

**Entidades envolvidas:** Owner, Patient, OwnerPatientLink, Appointment

**Efeitos esperados:**

- Owner persistido com DB
- Patient persistido com DB
- OwnerPatientLink persistido com DB
- Appointment criado (em memória — gap de persistência)

**Falhas que devem ser bloqueadas:**

- Patient com ownerId inexistente → NotFoundError
- Appointment com patientId inexistente → NotFoundError
- Operação sem permissão → ForbiddenError

**Evidências que os testes devem coletar:**

- Owner criado com 201
- Patient criado com 201
- Patient encontrado na busca
- Owner encontrado na busca
- Appointment criado com 201
- Audit events: `owners/create`, `patients/create`, `scheduling/create_appointment`

---

### FLUXO-04 — Agendamento → Atendimento

| Campo           | Valor                                                                          |
| --------------- | ------------------------------------------------------------------------------ |
| **Objetivo**    | Provar que um agendamento com check-in resulta em atendimento vinculado à fila |
| **Atores**      | Recepcionista                                                                  |
| **Criticidade** | ALTA                                                                           |
| **Módulos**     | scheduling, encounters, access-control                                         |

**Pré-condições:**

- Recepcionista autenticada
- Owner, Patient, Appointment existentes

**Sequência detalhada:**

1. Recepcionista chama `POST /queue/check-in` com `{ appointmentId }`
2. SchedulingService valida appointment
3. QueueEntry criada com status `checked_in`
4. Recepcionista chama `POST /encounters` com `{ patientId, ownerId, reason, queueEntryId }`
5. EncountersService valida patient e owner
6. Encounter criado com status `reception` e queueEntryId
7. `scheduling.attachEncounter(queueEntryId, encounterId)` vincula
8. Timeline do encounter registra `queue_checked_in`
9. Se queueEntry já estava `called`, timeline registra `queue_called`
10. Recepcionista chama `GET /encounters/:id` — encounter retornado com queueEntryId

**Entidades envolvidas:** Appointment, QueueEntry, Encounter, EncounterTimelineEvent

**Efeitos esperados:**

- Encounter persistido com DB
- QueueEntry atualizada com encounterId
- Timeline event registrado

**Falhas que devem ser bloqueadas:**

- Encounter com patient inexistente → NotFoundError
- Encounter com queueEntryId inexistente → erro
- Operação sem permissão `encounters.manage` → ForbiddenError

**Evidências que os testes devem coletar:**

- QueueEntry criada com 201
- Encounter criado com 201 e queueEntryId populado
- Timeline com queue_checked_in
- Audit events: `scheduling/check_in`, `encounters/open`

---

### FLUXO-05 — Atendimento → Lançamento Clínico → Faturamento

| Campo           | Valor                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------- |
| **Objetivo**    | Provar que um atendimento em andamento aceita registros clínicos e gera itens de faturamento |
| **Atores**      | Veterinário                                                                                  |
| **Criticidade** | CRÍTICA                                                                                      |
| **Módulos**     | encounters, triage, medical-records, billing, access-control                                 |

**Pré-condições:**

- Veterinário autenticado com role `veterinarian`
- Encounter existente em status `in_care` ou `observation`

**Sequência detalhada:**

1. Veterinário registra triagem: `POST /triage` com `{ encounterId, priority, chiefComplaint, destination }`
2. Server coordena: encounters.transitionEncounter(reception → in_triage) → triage.createTriage() → encounters.transitionEncounter(→ destination) → syncQueueWithEncounter()
3. Timeline registra `triage_recorded`
4. Veterinário cria entrada clínica: `POST /medical-records/entries` com `{ encounterId, entryType, content }`
5. MedicalRecordsService.ensureRecord() cria medical record se não existe
6. ClinicalEntry criado com version 1
7. Veterinário atualiza entrada: `PATCH /medical-records/entries/:id` com novo content
8. Entry version incrementada para 2
9. Veterinário cria item de billing: `POST /billing/items` com `{ encounterId, itemType, description, quantity, unitPrice }`
10. BillingService.ensureRecord() cria billing record se não existe (status draft → open)
11. BillingItem criado
12. Veterinário lista itens: `GET /billing/items?encounterId=:id` — item aparece

**Entidades envolvidas:** Encounter, TriageRecord, MedicalRecord, ClinicalEntry, BillingRecord, BillingItem

**Efeitos esperados:**

- Triage persistido com DB
- MedicalRecord persistido (async pending queue)
- ClinicalEntry persistido (async pending queue)
- BillingRecord e BillingItem em memória (gap — sem persistência DB)

**Falhas que devem ser bloqueadas:**

- Triage para encounter inexistente → NotFoundError
- Clinical entry para encounter sem medical record → erro
- Billing item para encounter inexistente → NotFoundError
- Operação sem permissão → ForbiddenError

**Evidências que os testes devem coletar:**

- Triage criado com 201
- Clinical entry criado com 201
- Clinical entry atualizado com 200 e version=2
- Billing item criado com 201
- Billing items listados com o item
- Audit events: `triage/create`, `medical-records/create_entry`, `medical-records/update_entry`, `billing/create_item`

**Gap conhecido:** BillingService usa Maps em memória. Após restart da API, billing items são perdidos.

---

### FLUXO-06 — Atendimento → Consumo → Estoque

| Campo           | Valor                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| **Objetivo**    | Provar que consumo de item durante atendimento reduz estoque e gera notificação se nível mínimo atingido |
| **Atores**      | Veterinário, Sistema (notificação)                                                                       |
| **Criticidade** | ALTA                                                                                                     |
| **Módulos**     | encounters, inventory, notifications, access-control                                                     |

**Pré-condições:**

- Veterinário autenticado
- Encounter existente
- InventoryItem existente com quantidade conhecida

**Sequência detalhada:**

1. Veterinário consulta estoque: `GET /inventory/items` — item retornado com onHandQuantity
2. Veterinário registra consumo: `POST /inventory/consumptions` com `{ encounterId, inventoryItemId, quantity }`
3. InventoryService valida encounter via `encounters.getOrThrow()`
4. InventoryService valida stock suficiente (onHandQuantity >= quantity)
5. onHandQuantity reduzida
6. InventoryConsumption criada
7. Se onHandQuantity <= reorderLevel após consumo:
   - Notification criada com category `inventory`, severity `high`, title `Reposicao recomendada`
8. Veterinário consulta estoque novamente: onHandQuantity reflete redução
9. Veterinário consulta consumptions: `GET /inventory/consumptions?encounterId=:id` — consumo aparece

**Entidades envolvidas:** Encounter, InventoryItem, InventoryConsumption, Notification

**Efeitos esperados:**

- onHandQuantity reduzida (em memória — gap de persistência)
- InventoryConsumption registrada (em memória)
- Notification criada se nível mínimo atingido

**Falhas que devem ser bloqueadas:**

- Consumo com quantity > onHandQuantity → ConflictError "Insufficient stock"
- Consumo com encounter inexistente → NotFoundError
- Consumo sem permissão `inventory.manage` → ForbiddenError

**Evidências que os testes devem coletar:**

- onHandQuantity antes e depois do consumo
- InventoryConsumption criada com 201
- Notification criada (se aplicável)
- Audit events: `inventory/consume`

**Gap conhecido:** InventoryService usa Maps em memória. Estoque é perdido em restart.

---

### FLUXO-07 — Alteração de Permissão e Efeito Real na Operação

| Campo           | Valor                                                                                |
| --------------- | ------------------------------------------------------------------------------------ |
| **Objetivo**    | Provar que alterar o role de um usuário muda imediatamente suas permissões de acesso |
| **Atores**      | Admin, Usuário alterado                                                              |
| **Criticidade** | CRÍTICA                                                                              |
| **Módulos**     | users, access-control, auth                                                          |

**Pré-condições:**

- Admin autenticado
- Usuário existente com role `reception`

**Sequência detalhada:**

1. Usuário com role `reception` faz login
2. Usuário tenta `GET /patients` — permitido (`patients.read`)
3. Usuário tenta `POST /patients` — permitido (`patients.manage`)
4. Usuário tenta `GET /billing` — bloqueado (`billing.read` não está em reception)
5. Admin atualiza usuário: `PATCH /users/:id` com `{ roleCodes: ['veterinarian'] }`
6. UsersService atualiza user
7. Usuário faz logout e login novamente (nova sessão com novo perfil)
8. Usuário tenta `GET /patients` — permitido
9. Usuário tenta `POST /patients` — permitido
10. Usuário tenta `GET /billing` — ainda bloqueado (veterinarian não tem billing.read)
11. Usuário tenta `POST /encounters` — permitido (`encounters.manage` está em veterinarian)

**Entidades envolvidas:** User, Session, AccessProfile

**Efeitos esperados:**

- User atualizado com novos roleCodes
- Nova sessão reflete novo AccessProfile
- Rotas antes permitidas podem ser bloqueadas e vice-versa

**Falhas que devem ser bloqueadas:**

- Sessão antiga continua com permissões antigas até expirar (comportamento esperado — sessão é snapshot)
- Usuário sem permissão acessa rota → ForbiddenError

**Evidências que os testes devem coletar:**

- Response 403 antes da alteração de role
- Response 200 após nova sessão com role alterado
- AccessProfile na sessão reflete permissões corretas

**Gap conhecido:** UsersService usa Maps em memória. Alteração de user é perdida em restart. Sessão antiga não é invalidada automaticamente.

---

### FLUXO-08 — Inativação e Bloqueio de Uso Operacional

| Campo           | Valor                                                       |
| --------------- | ----------------------------------------------------------- |
| **Objetivo**    | Provar que um usuário inativo não consegue operar o sistema |
| **Atores**      | Admin, Usuário inativado                                    |
| **Criticidade** | CRÍTICA                                                     |
| **Módulos**     | users, access-control, auth                                 |

**Pré-condições:**

- Admin autenticado
- Usuário existente e ativo

**Sequência detalhada:**

1. Usuário ativo faz login — sucesso
2. Usuário opera normalmente (ex: `GET /patients`)
3. Admin atualiza usuário: `PATCH /users/:id` com `{ status: 'inactive' }`
4. Usuário tenta fazer nova operação com token existente
5. requirePrincipal na API extrai principal do token
6. accessControl.assertAuthorized() verifica `actor.status !== "active"` → lança ForbiddenError
7. Usuário recebe 403 em todas as rotas protegidas
8. Usuário tenta novo login — AuthService verifica user.status; se inativo, comportamento depende da implementação de login (gap: login não verifica status explicitamente no código inspecionado)

**Entidades envolvidas:** User, Session, AccessProfile

**Efeitos esperados:**

- Usuário inativo recebe ForbiddenError em todas as rotas protegidas
- Sessão existente é efetivamente invalidada pela verificação de status

**Falhas que devem ser bloqueadas:**

- Usuário inativo opera módulos → ForbiddenError (via assertAuthorized)
- Novo login de usuário inativo → comportamento a definir (gap: login não verifica status)

**Evidências que os testes devem coletar:**

- Response 403 em operações após inativação
- ForbiddenError com mensagem clara

**Gap conhecido:** UsersService usa Maps em memória. Inativação é perdida em restart. Login não verifica status do user explicitamente — apenas assertAuthorized na rota protege.

---

## 3. Fluxos Adicionais Identificados

### FLUXO-09 — Internação Completa

| Campo           | Valor                                                           |
| --------------- | --------------------------------------------------------------- |
| **Objetivo**    | Provar fluxo de internação: admissão → progressos → alta        |
| **Módulos**     | encounters, inpatient, medical-records, discharges              |
| **Criticidade** | ALTA                                                            |
| **Status**      | Parcialmente coberto por `fluxo-internacao.spec.ts` (API-level) |

### FLUXO-10 — Exames Diagnósticos

| Campo           | Valor                                                                |
| --------------- | -------------------------------------------------------------------- |
| **Objetivo**    | Provar fluxo de exames: solicitação → coleta → resultado → conclusão |
| **Módulos**     | encounters, diagnostics, medical-records                             |
| **Criticidade** | ALTA                                                                 |
| **Status**      | Coberto por `fluxo-exames.spec.ts` (API-level)                       |

### FLUXO-11 — Cirurgia

| Campo           | Valor                                                                                 |
| --------------- | ------------------------------------------------------------------------------------- |
| **Objetivo**    | Provar fluxo cirúrgico: solicitação → pré-op → em progresso → recuperação → concluída |
| **Módulos**     | encounters, surgery, medical-records                                                  |
| **Criticidade** | ALTA                                                                                  |
| **Status**      | Sem cobertura e2e; testes unitários existem                                           |

### FLUXO-12 — Prescrição e Execução

| Campo           | Valor                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| **Objetivo**    | Provar fluxo de medicação: prescrição → execução → eventos de administração |
| **Módulos**     | medical-records, prescription-executions                                    |
| **Criticidade** | CRÍTICA                                                                     |
| **Status**      | Sem cobertura e2e; testes unitários existem                                 |

---

## 4. Resumo de Cobertura Atual dos Fluxos

| Fluxo                                     | Unitários | API | E2E UI      | E2E API                | Gap Crítico                |
| ----------------------------------------- | --------- | --- | ----------- | ---------------------- | -------------------------- |
| FLUXO-01: User habilitação                | Sim       | Sim | —           | —                      | UsersService sem DB        |
| FLUXO-02: Veterinário agenda              | Sim       | —   | —           | —                      | Staff seed-only            |
| FLUXO-03: Tutor+Paciente+Consulta         | Sim       | —   | Sim (smoke) | Sim (fluxo-principal)  | Scheduling sem DB          |
| FLUXO-04: Agendamento→Atendimento         | Sim       | Sim | —           | Sim (fluxo-principal)  | —                          |
| FLUXO-05: Atendimento→Clínico→Faturamento | Sim       | Sim | —           | —                      | Billing sem DB             |
| FLUXO-06: Atendimento→Consumo→Estoque     | Sim       | Sim | —           | —                      | Inventory sem DB           |
| FLUXO-07: Alteração de permissão          | Sim       | Sim | —           | —                      | UsersService sem DB        |
| FLUXO-08: Inativação                      | Sim       | —   | —           | —                      | Login não verifica status  |
| FLUXO-09: Internação                      | Sim       | —   | —           | Sim (fluxo-internacao) | —                          |
| FLUXO-10: Exames                          | Sim       | Sim | —           | Sim (fluxo-exames)     | —                          |
| FLUXO-11: Cirurgia                        | Sim       | Sim | —           | —                      | Sem e2e                    |
| FLUXO-12: Prescrição+Execução             | Sim       | —   | —           | —                      | Sem validação de entidades |
