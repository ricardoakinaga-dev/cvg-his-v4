# 511 - Backlog de Gaps Funcionais

**Status:** vivo
**Data de criacao:** 2026-03-31
**Base:** inspecao de codigo real dos 9 modulos subrepresentados

---

## Gaps por modulo

### access-control

| Gap                                                        | Impacto                                 | Severidade | Evidencia                                                                                                  | Dono sugerido | Criterio de aceite                                                              | Prioridade |
| ---------------------------------------------------------- | --------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------- | ---------- |
| Dual RBAC com packages/rbac/                               | Autorizacao pode falhar silenciosamente | SEV-1      | access-control: 7 roles, 32 perms; rbac: 4 roles, 53 perms; role codes diferentes (vet vs veterinarian)    | Backend       | Um unico sistema de RBAC; seed e AccessControlService usam os mesmos role codes | P0         |
| DatabaseAccessControlRepository exportado mas nao injetado | Roles/permissions nao persistem em DB   | SEV-2      | repositorio existe em repositories/database-access-control.repository.js mas service usa catalog in-memory | Backend       | Roles e permissions sao lidos do DB; seed popula via Drizzle                    | P1         |

### users

| Gap                               | Impacto                              | Severidade | Evidencia                                                      | Dono sugerido | Criterio de aceite                                      | Prioridade |
| --------------------------------- | ------------------------------------ | ---------- | -------------------------------------------------------------- | ------------- | ------------------------------------------------------- | ---------- |
| UsersService usa Maps em memoria  | Dados de usuario perdidos em restart | SEV-1      | constructor nao aceita repository; create/update operam em Map | Backend       | DatabaseUsersRepository injetado; users persistem em DB | P0         |
| Sem validacao de email unico      | Emails duplicados possiveis          | SEV-2      | create() nao verifica existencia de email                      | Backend       | Email duplicado retorna ConflictError                   | P1         |
| Sem metodo de inativacao dedicado | Inativacao depende de PATCH generico | SEV-3      | update() aceita status mas nao tem metodo dedicado             | Backend       | Metodo dedicated deactivate(userId) existe              | P2         |

### scheduling

| Gap                                   | Impacto                                  | Severidade | Evidencia                                                      | Dono sugerido | Criterio de aceite                             | Prioridade |
| ------------------------------------- | ---------------------------------------- | ---------- | -------------------------------------------------------------- | ------------- | ---------------------------------------------- | ---------- |
| SchedulingService usa Maps em memoria | Agendamentos perdidos em restart         | SEV-1      | constructor nao aceita repository DB                           | Backend       | DatabaseSchedulingRepository injetado          | P0         |
| Sem validacao de professional_user_id | Agendamento com profissional inexistente | SEV-2      | createAppointment() nao valida professionalUserId contra staff | Backend       | Profissional inexistente retorna NotFoundError | P1         |
| Sem validacao de conflito de horario  | Agendamentos sobrepostos possiveis       | SEV-2      | createAppointment() nao verifica overlap                       | Backend       | Conflito de horario retorna ConflictError      | P1         |

### triage

| Gap                                      | Impacto                           | Severidade | Evidencia                                          | Dono sugerido | Criterio de aceite                               | Prioridade |
| ---------------------------------------- | --------------------------------- | ---------- | -------------------------------------------------- | ------------- | ------------------------------------------------ | ---------- |
| Triage imutavel                          | Nao ha correcao de triagem errada | SEV-2      | TriageService nao tem metodo update; apenas create | Backend       | Metodo updateTriage(encounterId, payload) existe | P1         |
| Sem validacao de 1 triagem por encounter | Triagens duplicadas possiveis     | SEV-3      | createTriage() nao verifica existencia previa      | Backend       | Segunda triagem retorna ConflictError            | P2         |

### billing

| Gap                                  | Impacto                                     | Severidade | Evidencia                                                                     | Dono sugerido | Criterio de aceite                                      | Prioridade |
| ------------------------------------ | ------------------------------------------- | ---------- | ----------------------------------------------------------------------------- | ------------- | ------------------------------------------------------- | ---------- |
| BillingService usa Maps em memoria   | Dados de faturamento perdidos em restart    | SEV-1      | constructor aceita EncountersService mas nao repository DB                    | Backend       | DatabaseBillingRepository injetado                      | P0         |
| Sem validacao de encounter existente | Itens faturaveis para encounter inexistente | SEV-2      | createEstimate() valida via encounters.getOrThrow mas repository nao injetado | Backend       | Encounter inexistente retorna NotFoundError consistente | P1         |

### notifications

| Gap                                          | Impacto                                    | Severidade | Evidencia                                                                                | Dono sugerido | Criterio de aceite                                                                | Prioridade |
| -------------------------------------------- | ------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------- | ---------- |
| Notification tables nao existem na migration | Notificacoes nao persistem em DB           | SEV-2      | packages/db/src/schema/notifications.ts existe mas tabelas nao estao na migration 0000\_ | Backend       | Tabelas notifications, notification_templates, notification_settings na migration | P1         |
| Sem canal de envio real                      | Notificacoes sao apenas registros internos | SEV-3      | NotificationService registra jobs mas nao envia SMS/email/WhatsApp                       | Backend       | Pelo menos 1 canal de envio funcional                                             | P2         |

### attachments

| Gap                               | Impacto                    | Severidade | Evidencia                                                                   | Dono sugerido | Criterio de aceite                      | Prioridade |
| --------------------------------- | -------------------------- | ---------- | --------------------------------------------------------------------------- | ------------- | --------------------------------------- | ---------- |
| FileStorage em memoria por padrao | Anexos perdidos em restart | SEV-2      | FileStorage in-memory por default; DiskFileStorage existe mas requer config | Backend       | DiskFileStorage como padrao em producao | P1         |

### staff

| Gap               | Impacto                                   | Severidade | Evidencia                                                        | Dono sugerido | Criterio de aceite                        | Prioridade |
| ----------------- | ----------------------------------------- | ---------- | ---------------------------------------------------------------- | ------------- | ----------------------------------------- | ---------- |
| Staff sem CRUD    | Nao e possivel criar/editar profissionais | SEV-1      | StaffService tem apenas 7 records seed; sem create/update/delete | Backend       | POST/GET/PATCH/DELETE /staff operacionais | P0         |
| Sem repository DB | Staff nao persiste                        | SEV-1      | Sem StaffRepository; dados hardcoded                             | Backend       | DatabaseStaffRepository criado e injetado | P0         |

### surgery

| Gap                      | Impacto                                    | Severidade | Evidencia                              | Dono sugerido | Criterio de aceite                        | Prioridade |
| ------------------------ | ------------------------------------------ | ---------- | -------------------------------------- | ------------- | ----------------------------------------- | ---------- |
| Sem validacao de surgeon | Cirurgia sem cirurgiao designado           | SEV-2      | requestCase() nao valida surgeonUserId | Backend       | Surgeon inexistente retorna NotFoundError | P1         |
| Sem cobertura E2E        | Fluxo cirurgico nao validado ponta a ponta | SEV-2      | Apenas testes unitarios                | QA            | Teste E2E API-level para fluxo cirurgico  | P1         |

---

## Resumo por severidade

| Severidade | Count | Gaps                                                                                                                                                    |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEV-1      | 6     | Dual RBAC, Users sem DB, Scheduling sem DB, Billing sem DB, Staff sem CRUD, Staff sem DB                                                                |
| SEV-2      | 8     | AccessControl sem DB, email unico, professional validation, horario overlap, encounter validation, notification tables, FileStorage, surgeon validation |
| SEV-3      | 3     | User inactivation, triage duplicada, canal de envio                                                                                                     |

## Proxima acao recomendada

1. **P0:** Resolver dual RBAC (unificar seed codes com AccessControlService)
2. **P0:** Injetar DB repositories em UsersService, SchedulingService, BillingService
3. **P0:** Criar Staff CRUD com repository DB
4. **P1:** Adicionar validacoes de negocio (email unico, professional, horario, encounter)
5. **P1:** Adicionar notification tables a migration Drizzle
6. **P1:** Adicionar metodo update em TriageService
7. **P2:** Metodo dedicado de inativacao de usuario
8. **P2:** Canal de envio de notificacoes
