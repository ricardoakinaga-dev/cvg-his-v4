# 710 — Matriz de Integração entre Módulos

**Status:** R0 — contratos obrigatórios baseados em código real
**Data:** 2026-03-31
**Fonte de verdade:** `docs/705-repository-assessment-for-validation-layer.md` + inspeção direta de código

---

## 1. Conceitos Fundamentais

### 1.1 Entidade-Mestre

Entidade-mestre é o registro canônico de um conceito de domínio que outros módulos consultam para tomar decisões. No CVG-HIS-V2, as entidades-mestre são:

| Entidade                | Módulo Dono              | Tabela Drizzle           |
| ----------------------- | ------------------------ | ------------------------ |
| User                    | `modules/users`          | `users`                  |
| Staff                   | `modules/staff`          | (sem tabela — seed-only) |
| Owner (Tutor)           | `modules/owners`         | `owners`                 |
| Patient (Paciente)      | `modules/patients`       | `patients`               |
| Encounter (Atendimento) | `modules/encounters`     | `encounters`             |
| Role                    | `modules/access-control` | `roles`                  |
| Permission              | `modules/access-control` | `permissions`            |
| Product                 | `modules/inventory`      | `products`               |
| StockItem               | `modules/inventory`      | `stock_items`            |

### 1.2 Reflexo Obrigatório

Reflexo obrigatório é o efeito colateral que DEVE ocorrer quando uma entidade-mestre é criada, alterada ou removida. Se o reflexo não ocorre, o sistema está em estado inconsistente.

Exemplo: quando um Patient é criado e vinculado a um Owner, esse paciente DEVE aparecer como selecionável no módulo de Scheduling.

### 1.3 Contrato de Integração

Contrato de integração é a promessa formal entre dois módulos: "quando o módulo A executa a operação X, o módulo B deve responder Y". Cada contrato é validável por um teste automatizado.

---

## 2. Matriz de Contratos de Integração

### 2.1 Usuário → Roles/Permissões/Acesso Real

| Campo                         | Valor                                                                                                                                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | User criado com roleCodes                                                                                                                                                                                                                                  |
| **Módulo origem**             | `modules/users`                                                                                                                                                                                                                                            |
| **Módulos impactados**        | `modules/auth`, `modules/access-control`                                                                                                                                                                                                                   |
| **Comportamento obrigatório** | User com role X recebe exatamente as permissões mapeadas para X no catálogo de AccessControlService                                                                                                                                                        |
| **Pré-condições**             | Role code deve existir no catálogo de access-control (um dos 7: admin, reception, nurse, veterinarian, finance, inventory, auditor)                                                                                                                        |
| **Pós-condições**             | AuthService.#buildPrincipal gera AccessProfile com permissionCodes corretos; requirePrincipal na API aceita/bloqueia rotas conforme permissão                                                                                                              |
| **Criticidade**               | **CRÍTICA** — falha aqui permite acesso indevido ou bloqueio legítimo                                                                                                                                                                                      |
| **Tipo de teste**             | Integração (API-level com banco real)                                                                                                                                                                                                                      |
| **Status de implementação**   | **PARCIALMENTE IMPLEMENTADO** — AccessControlService tem 7 roles com 32 perms; UsersService seed tem 7 users com role codes compatíveis; mas seed.ts do Drizzle popula roles com codes diferentes (vet, enfermaria, recepcao) — dual RBAC não reconciliado |

### 2.2 Profissional/Veterinário → Agenda

| Campo                         | Valor                                                                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | Staff record vinculado a User com role veterinarian                                                                                                                                                                                    |
| **Módulo origem**             | `modules/staff`                                                                                                                                                                                                                        |
| **Módulos impactados**        | `modules/scheduling`                                                                                                                                                                                                                   |
| **Comportamento obrigatório** | Veterinário elegível aparece como opção de professional_user_id em appointments                                                                                                                                                        |
| **Pré-condições**             | Staff existe com userId válido; User existe e está ativo                                                                                                                                                                               |
| **Pós-condições**             | Appointment pode ser criado com professional_user_id referenciando o staff                                                                                                                                                             |
| **Criticidade**               | **ALTA** — sem veterinário na agenda, não há agendamento operacional                                                                                                                                                                   |
| **Tipo de teste**             | Integração (API-level)                                                                                                                                                                                                                 |
| **Status de implementação**   | **PARCIALMENTE IMPLEMENTADO** — appointments.ts tem FK `professional_user_id → users(restrict)`, mas SchedulingService.createAppointment() NÃO valida professional_user_id contra staff existente. Staff module é seed-only, sem CRUD. |

### 2.3 Tutor/Paciente → Agenda/Atendimento

| Campo                         | Valor                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | Owner criado + Patient criado + OwnerPatientLink                                                                                                              |
| **Módulo origem**             | `modules/owners`, `modules/patients`                                                                                                                          |
| **Módulos impactados**        | `modules/scheduling`, `modules/encounters`                                                                                                                    |
| **Comportamento obrigatório** | Paciente vinculado a tutor aparece selecionável em agendamento e em abertura de atendimento                                                                   |
| **Pré-condições**             | Owner existe; Patient existe; Patient tem owner_id válido                                                                                                     |
| **Pós-condições**             | Scheduling.createAppointment() valida patient e owner via getOrThrow; EncountersService.openEncounter() valida patient e owner via getOrThrow                 |
| **Criticidade**               | **CRÍTICA** — sem tutor/paciente, não há operação clínica                                                                                                     |
| **Tipo de teste**             | Integração (API-level) + E2E                                                                                                                                  |
| **Status de implementação**   | **IMPLEMENTADO** — OwnersService e PatientsService com repositórios DB injetados; SchedulingService e EncountersService validam existência de owner e patient |

### 2.4 Agendamento → Atendimento

| Campo                         | Valor                                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | Appointment criado + QueueEntry com check-in                                                                                                                               |
| **Módulo origem**             | `modules/scheduling`                                                                                                                                                       |
| **Módulos impactados**        | `modules/encounters`                                                                                                                                                       |
| **Comportamento obrigatório** | QueueEntry com check-in pode ser vinculada a um Encounter aberto; encounter.queueEntryId é populado                                                                        |
| **Pré-condições**             | QueueEntry existe com status checked_in ou called; Patient e Owner existem                                                                                                 |
| **Pós-condições**             | Encounter criado com queueEntryId; scheduling.attachEncounter() vincula; timeline do encounter registra queue_checked_in                                                   |
| **Criticidade**               | **ALTA** — fluxo principal de recepção                                                                                                                                     |
| **Tipo de teste**             | Integração (API-level) + E2E                                                                                                                                               |
| **Status de implementação**   | **IMPLEMENTADO** — server.ts rota POST /encounters chama scheduling.attachEncounter() quando queueEntryId está presente; EncountersService e SchedulingService coordenados |

### 2.5 Atendimento → Faturamento

| Campo                         | Valor                                                                                                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | Encounter aberto                                                                                                                                                                              |
| **Módulo origem**             | `modules/encounters`                                                                                                                                                                          |
| **Módulos impactados**        | `modules/billing`                                                                                                                                                                             |
| **Comportamento obrigatório** | Billing.ensureRecord() cria billing record para o encounter; billing items podem ser adicionados                                                                                              |
| **Pré-condições**             | Encounter existe com accountId, patientId, ownerId válidos                                                                                                                                    |
| **Pós-condições**             | BillingRecordSummary criado; BillingItemSummary pode ser adicionado; status transita draft → open → estimated → settled                                                                       |
| **Criticidade**               | **ALTA** — impacto financeiro direto                                                                                                                                                          |
| **Tipo de teste**             | Integração (API-level)                                                                                                                                                                        |
| **Status de implementação**   | **PARCIALMENTE IMPLEMENTADO** — BillingService valida encounter via getOrThrow, mas usa Maps em memória; repositório DB exportado mas não injetado. Dados de billing são perdidos em restart. |

### 2.6 Atendimento → Audit Trail

| Campo                         | Valor                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | Qualquer operação em qualquer rota da API                                                                                                               |
| **Módulo origem**             | `apps/api/src/server.ts` (appendAudit em cada handler)                                                                                                  |
| **Módulos impactados**        | `modules/audit`                                                                                                                                         |
| **Comportamento obrigatório** | Cada operação protegida por requirePrincipal gera um audit event com actorId, accountId, module, action, entityType, entityId, riskLevel, correlationId |
| **Pré-condições**             | Usuário autenticado (accessToken válido)                                                                                                                |
| **Pós-condições**             | AuditEventSummary armazenado em AuditService (in-memory + optional DB)                                                                                  |
| **Criticidade**               | **ALTA** — requisito de conformidade e rastreabilidade                                                                                                  |
| **Tipo de teste**             | Integração (API-level)                                                                                                                                  |
| **Status de implementação**   | **IMPLEMENTADO** — appendAudit() é chamado em todos os handlers protegidos; AuditService com repositório DB injetado                                    |

### 2.7 Consumo Clínico → Estoque/Farmácia

| Campo                         | Valor                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | Inventory.consume() com encounterId                                                                                                                                 |
| **Módulo origem**             | `modules/inventory`                                                                                                                                                 |
| **Módulos impactados**        | `modules/encounters`, `modules/notifications`                                                                                                                       |
| **Comportamento obrigatório** | Consumo reduz onHandQuantity do item; se onHandQuantity ≤ reorderLevel, notificação de reposição é criada                                                           |
| **Pré-condições**             | InventoryItem existe com quantidade suficiente; Encounter existe                                                                                                    |
| **Pós-condições**             | onHandQuantity reduzida; InventoryConsumptionSummary criada; Notification criada se nível de reposição atingido                                                     |
| **Criticidade**               | **ALTA** — impacto na segurança do paciente (falta de medicamento)                                                                                                  |
| **Tipo de teste**             | Integração (API-level)                                                                                                                                              |
| **Status de implementação**   | **PARCIALMENTE IMPLEMENTADO** — InventoryService valida encounter e stock, mas usa Maps em memória; repositório DB não injetado. Notificação é criada corretamente. |

### 2.8 Inativação de Cadastros → Inelegibilidade Operacional

| Campo                         | Valor                                                                                                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | User.status = 'inactive' ou Patient/Owner removido                                                                                                                                                                                           |
| **Módulo origem**             | `modules/users`, `modules/patients`, `modules/owners`                                                                                                                                                                                        |
| **Módulos impactados**        | `modules/auth`, `modules/scheduling`, `modules/encounters`                                                                                                                                                                                   |
| **Comportamento obrigatório** | User inativo não consegue autenticar; Patient/Owner inativo não pode ser usado em novos agendamentos ou atendimentos                                                                                                                         |
| **Pré-condições**             | Entidade existe e foi marcada como inativa                                                                                                                                                                                                   |
| **Pós-condições**             | Login falha para user inativo; Tentativa de agendar com patient inativo falha                                                                                                                                                                |
| **Criticidade**               | **CRÍTICA** — segurança de acesso e integridade clínica                                                                                                                                                                                      |
| **Tipo de teste**             | Integração (API-level)                                                                                                                                                                                                                       |
| **Status de implementação**   | **PARCIALMENTE IMPLEMENTADO** — AccessControlService.assertAuthorized() verifica `actor.status !== "active"` e lança ForbiddenError; mas não há validação de patient/owner ativo em scheduling/encounters (apenas existência via getOrThrow) |

### 2.9 Atendimento → Triagem

| Campo                         | Valor                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | Encounter em status reception                                                                                                               |
| **Módulo origem**             | `modules/encounters`                                                                                                                        |
| **Módulos impactados**        | `modules/triage`                                                                                                                            |
| **Comportamento obrigatório** | Triage registra prioridade e destino; encounter transita para destino (in_care, observation, etc.); queue é atualizada                      |
| **Pré-condições**             | Encounter existe em status reception                                                                                                        |
| **Pós-condições**             | TriageRecord criado (1 por encounter); Encounter status atualizado; QueueEntry transicionada                                                |
| **Criticidade**               | **ALTA** — fluxo clínico prioritário                                                                                                        |
| **Tipo de teste**             | Integração (API-level) + E2E                                                                                                                |
| **Status de implementação**   | **IMPLEMENTADO** — server.ts rota POST /triage coordena encounters.transitionEncounter() + triage.createTriage() + syncQueueWithEncounter() |

### 2.10 Atendimento → Internação

| Campo                         | Valor                                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | Encounter em status in_care                                                                                                                                |
| **Módulo origem**             | `modules/encounters`                                                                                                                                       |
| **Módulos impactados**        | `modules/inpatient`, `modules/medical-records`                                                                                                             |
| **Comportamento obrigatório** | Internação cria InpatientStay; encounter transita para observation; evento de advanced care é registrado no medical record                                 |
| **Pré-condições**             | Encounter existe; Sector e Bed existem (se atribuição de leito)                                                                                            |
| **Pós-condições**             | InpatientStaySummary criado; Encounter status = observation; Medical record com evento inpatient_admitted                                                  |
| **Criticidade**               | **ALTA** — fluxo de internação                                                                                                                             |
| **Tipo de teste**             | Integração (API-level) + E2E                                                                                                                               |
| **Status de implementação**   | **IMPLEMENTADO** — server.ts rota POST /inpatient coordena inpatient.admit() + encounters.transitionEncounter() + medicalRecords.appendAdvancedCareEvent() |

### 2.11 Atendimento → Cirurgia

| Campo                         | Valor                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | Encounter em andamento                                                                                                      |
| **Módulo origem**             | `modules/encounters`                                                                                                        |
| **Módulos impactados**        | `modules/surgery`, `modules/medical-records`                                                                                |
| **Comportamento obrigatório** | SurgeryCase criado vinculado ao encounter; evento de advanced care registrado                                               |
| **Pré-condições**             | Encounter existe                                                                                                            |
| **Pós-condições**             | SurgeryCaseSummary criado com status requested; Medical record com evento surgery_requested                                 |
| **Criticidade**               | **ALTA** — fluxo cirúrgico                                                                                                  |
| **Tipo de teste**             | Integração (API-level)                                                                                                      |
| **Status de implementação**   | **IMPLEMENTADO** — server.ts rota POST /surgeries coordena surgery.requestCase() + medicalRecords.appendAdvancedCareEvent() |

### 2.12 Atendimento → Exames/Diagnósticos

| Campo                         | Valor                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | Encounter em andamento                                                                                                              |
| **Módulo origem**             | `modules/encounters`                                                                                                                |
| **Módulos impactados**        | `modules/diagnostics`, `modules/medical-records`                                                                                    |
| **Comportamento obrigatório** | DiagnosticOrder criado vinculado ao encounter; resultado registra status transitions; evento de advanced care registrado            |
| **Pré-condições**             | Encounter existe                                                                                                                    |
| **Pós-condições**             | DiagnosticOrderSummary criado; Medical record com evento diagnostic_requested/resulted                                              |
| **Criticidade**               | **ALTA** — fluxo diagnóstico                                                                                                        |
| **Tipo de teste**             | Integração (API-level) + E2E                                                                                                        |
| **Status de implementação**   | **IMPLEMENTADO** — server.ts rotas POST /diagnostics/orders e /diagnostics/orders/:id/result coordenam diagnostics + medicalRecords |

### 2.13 Atendimento → Alta (Discharge)

| Campo                         | Valor                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Origem**                    | Encounter em andamento                                                                                                                                       |
| **Módulo origem**             | `modules/encounters`                                                                                                                                         |
| **Módulos impactados**        | `modules/discharges`                                                                                                                                         |
| **Comportamento obrigatório** | Discharge criado com tipo (ambulatory, inpatient, transfer, death); encounter pode ser fechado                                                               |
| **Pré-condições**             | Encounter existe                                                                                                                                             |
| **Pós-condições**             | DischargeSummary criado com versionamento                                                                                                                    |
| **Criticidade**               | **ALTA** — encerramento de atendimento                                                                                                                       |
| **Tipo de teste**             | Integração (API-level) + E2E                                                                                                                                 |
| **Status de implementação**   | **PARCIALMENTE IMPLEMENTADO** — DischargesService aceita repository opcional mas NÃO valida existência do encounter (apenas requireNonEmptyString no string) |

### 2.14 Prescrição → Execução de Prescrição

| Campo                         | Valor                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Origem**                    | ClinicalEntry com prescrição (em medical-records)                                                                                                             |
| **Módulo origem**             | `modules/medical-records`                                                                                                                                     |
| **Módulos impactados**        | `modules/prescription-executions`                                                                                                                             |
| **Comportamento obrigatório** | PrescriptionExecution criado vinculado a clinicalEntry; execução registra eventos de administração                                                            |
| **Pré-condições**             | ClinicalEntry existe; Patient existe; Encounter existe                                                                                                        |
| **Pós-condições**             | PrescriptionExecutionSummary criado; AdministrationEventSummary registrado                                                                                    |
| **Criticidade**               | **CRÍTICA** — segurança do paciente (medicação)                                                                                                               |
| **Tipo de teste**             | Integração (API-level)                                                                                                                                        |
| **Status de implementação**   | **PARCIALMENTE IMPLEMENTADO** — PrescriptionExecutionsService NÃO valida existência de clinicalEntryId, patientId, encounterId (apenas requireNonEmptyString) |

---

## 3. Resumo de Status por Contrato

| #    | Contrato                            | Status                                                 |
| ---- | ----------------------------------- | ------------------------------------------------------ |
| 2.1  | User → Roles/Permissões/Acesso      | Parcialmente implementado (dual RBAC)                  |
| 2.2  | Veterinário → Agenda                | Parcialmente implementado (staff seed-only)            |
| 2.3  | Tutor/Paciente → Agenda/Atendimento | Implementado                                           |
| 2.4  | Agendamento → Atendimento           | Implementado                                           |
| 2.5  | Atendimento → Faturamento           | Parcialmente implementado (sem persistência DB)        |
| 2.6  | Atendimento → Audit Trail           | Implementado                                           |
| 2.7  | Consumo → Estoque/Notificação       | Parcialmente implementado (sem persistência DB)        |
| 2.8  | Inativação → Inelegibilidade        | Parcialmente implementado (só user, não patient/owner) |
| 2.9  | Atendimento → Triagem               | Implementado                                           |
| 2.10 | Atendimento → Internação            | Implementado                                           |
| 2.11 | Atendimento → Cirurgia              | Implementado                                           |
| 2.12 | Atendimento → Exames                | Implementado                                           |
| 2.13 | Atendimento → Alta                  | Parcialmente implementado (sem validação de encounter) |
| 2.14 | Prescrição → Execução               | Parcialmente implementado (sem validação de entidades) |

**Implementados:** 6 de 14
**Parcialmente implementados:** 8 de 14
**Ausentes:** 0 de 14

Nenhum contrato está completamente ausente — todos têm alguma implementação. Mas 8 dos 14 têm gaps que impedem operação confiável em produção.
