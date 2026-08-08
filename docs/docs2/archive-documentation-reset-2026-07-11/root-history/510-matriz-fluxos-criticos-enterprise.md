# 510 - Matriz de Fluxos Criticos Enterprise

**Status:** vivo
**Data de criacao:** 2026-03-31
**Base:** docs/720-critical-business-flows.md, docs/780-initial-critical-test-catalog.md

---

## Fluxo 1: Login → Sessao → Permissao

| Campo                  | Valor                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Objetivo**           | Validar que um usuario autenticado recebe permissoes coerentes com seu role            |
| **Modulos envolvidos** | auth, access-control, users, staff                                                     |
| **Entradas**           | username, password                                                                     |
| **Saidas**             | accessToken, refreshToken, AccessProfile com permissionCodes                           |
| **Risco operacional**  | CRITICO — falha aqui permite acesso indevido ou bloqueio legitimo                      |
| **Status atual**       | IMPLEMENTADO — auth.login() valida senha via scrypt, AccessControlService gera perfil  |
| **Cobertura de teste** | ✅ ICT-001 (User→Role→Permission), ICT-002 (blocked), ICT-003 (allowed), E2E Flow 1    |
| **Proximo passo**      | Testar login com user inativo; validar que seed roles alinham com AccessControlService |

## Fluxo 2: Tutor → Paciente → Atendimento

| Campo                  | Valor                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **Objetivo**           | Validar que tutor e paciente criados sao selecionaveis e permitem abertura de atendimento            |
| **Modulos envolvidos** | owners, patients, encounters                                                                         |
| **Entradas**           | owner data, patient data                                                                             |
| **Saidas**             | Owner, Patient, Encounter com status reception                                                       |
| **Risco operacional**  | CRITICO — sem tutor/paciente, nao ha operacao clinica                                                |
| **Status atual**       | IMPLEMENTADO — OwnersService e PatientsService com DB injection; EncountersService valida existencia; SchedulingService agora persiste appointments e queue entries |
| **Cobertura de teste** | ✅ ICT-006 (Owner+Patient→Scheduling), ICT-007 (Appointment linkage), E2E Flow 3, suite scheduling persistida |
| **Proximo passo**      | Validar que patient inativo nao pode ser usado em novos atendimentos e endurecer cancelamento/conflito de agenda |

## Fluxo 3: Atendimento → Triagem → Prontuario

| Campo                  | Valor                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| **Objetivo**           | Validar que triagem registra prioridade e destino, e que prontuario recebe entradas clinicas  |
| **Modulos envolvidos** | encounters, triage, medical-records                                                           |
| **Entradas**           | encounterId, priority, chiefComplaint, destination, clinical entry data                       |
| **Saidas**             | TriageRecord, MedicalRecord com ClinicalEntry                                                 |
| **Risco operacional**  | ALTO — sem triagem, nao ha priorizacao; sem prontuario, nao ha historico clinico              |
| **Status atual**       | IMPLEMENTADO — POST /triage registra a triagem inicial e PATCH /triage/:id permite correcao controlada enquanto o encounter estiver aberto |
| **Cobertura de teste** | ✅ ICT-009 (Clinical→Audit), E2E Flow 5 (Registro Clinico→Audit Trail)                        |
| **Proximo passo**      | Adicionar cobertura HTTP dedicada e, depois, historico versionado de re-triagem               |

## Fluxo 4: Atendimento → Internacao → Leito

| Campo                  | Valor                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| **Objetivo**           | Validar que paciente pode ser admitido em internacao com atribuicao de leito                 |
| **Modulos envolvidos** | encounters, inpatient, medical-records                                                       |
| **Entradas**           | encounterId, wardId, bedId (opcional), chiefComplaint                                        |
| **Saidas**             | InpatientStay, encounter status → observation, medical record event                          |
| **Risco operacional**  | ALTO — sem internacao, nao ha controle de leitos                                             |
| **Status atual**       | IMPLEMENTADO — POST /inpatient coordena inpatient.admit() + encounters.transitionEncounter() |
| **Cobertura de teste** | ✅ fluxo-internacao.spec.ts (E2E API-level)                                                  |
| **Proximo passo**      | Validar transferencia de leito e alta de internacao                                          |

## Fluxo 5: Atendimento → Exames → Resultado

| Campo                  | Valor                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Objetivo**           | Validar que exames podem ser solicitados e resultados registrados            |
| **Modulos envolvidos** | encounters, diagnostics, medical-records                                     |
| **Entradas**           | encounterId, examType, examName, priority                                    |
| **Saidas**             | DiagnosticOrder, ExamResult, medical record events                           |
| **Risco operacional**  | ALTO — sem exames, diagnostico fica incompleto                               |
| **Status atual**       | IMPLEMENTADO — POST /diagnostics/orders, POST /diagnostics/orders/:id/result |
| **Cobertura de teste** | ✅ fluxo-exames.spec.ts (E2E API-level, 5 testes)                            |
| **Proximo passo**      | Validar que resultado de exame gera notificao ao veterinario responsavel     |

## Fluxo 6: Atendimento → Cirurgia → Acompanhamento

| Campo                  | Valor                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Objetivo**           | Validar fluxo cirurgico: solicitacao → pre-op → em progresso → recuperacao → concluida |
| **Modulos envolvidos** | encounters, surgery, medical-records                                                   |
| **Entradas**           | encounterId, procedureName, surgeonUserId                                              |
| **Saidas**             | SurgeryCase com status transitions, medical record events                              |
| **Risco operacional**  | ALTO — sem cirurgia, procedimento cirurgico nao e rastreado                            |
| **Status atual**       | IMPLEMENTADO — POST /surgeries, POST /surgeries/:id/status (6 transicoes)              |
| **Cobertura de teste** | ✅ testes unitarios em surgery.test.ts; sem cobertura E2E                              |
| **Proximo passo**      | Criar teste E2E API-level para fluxo cirurgico completo                                |

## Fluxo 7: Atendimento → Prescricao → Execucao

| Campo                  | Valor                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**           | Validar que prescricoes geram ordens de medicacao e execucoes registram administracao                                      |
| **Modulos envolvidos** | medical-records, prescription-executions                                                                                   |
| **Entradas**           | clinicalEntryId, patientId, encounterId, medicationName, dosage                                                            |
| **Saidas**             | PrescriptionExecution, AdministrationEvents                                                                                |
| **Risco operacional**  | CRITICO — falha aqui pode causar erro de medicacao                                                                         |
| **Status atual**       | PARCIALMENTE IMPLEMENTADO — PrescriptionExecutionsService nao valida existencia de clinicalEntryId, patientId, encounterId |
| **Cobertura de teste** | ✅ testes unitarios em prescription-executions.test.ts; sem E2E                                                            |
| **Proximo passo**      | Adicionar validacao de existencia de entidades referenciadas; criar teste E2E                                              |

## Fluxo 8: Atendimento → Billing → Recebiveis

| Campo                  | Valor                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **Objetivo**           | Validar que atendimento gera itens faturaveis e reflexo financeiro                        |
| **Modulos envolvidos** | encounters, billing                                                                       |
| **Entradas**           | encounterId, itemType, description, quantity, unitPriceAmount                             |
| **Saidas**             | BillingRecord, BillingItems, status transitions (draft → open → estimated → settled)      |
| **Risco operacional**  | ALTO — impacto financeiro direto                                                          |
| **Status atual**       | PARCIALMENTE IMPLEMENTADO — BillingService usa Maps em memoria; dados perdidos em restart |
| **Cobertura de teste** | ✅ ICT-010a (Billable→Reflex), E2E Flow 6 (Atendimento→Faturamento)                       |
| **Proximo passo**      | Injetar DatabaseBillingRepository no BillingService para persistencia real                |

## Fluxo 9: Estoque → Consumo → Reflexo Assistencial

| Campo                  | Valor                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| **Objetivo**           | Validar que consumo de estoque durante atendimento reduz quantidade e gera notificao de reposicao |
| **Modulos envolvidos** | encounters, inventory, notifications                                                              |
| **Entradas**           | encounterId, inventoryItemId, quantity                                                            |
| **Saidas**             | InventoryConsumption, onHandQuantity reduzida, Notification se nivel minimo atingido              |
| **Risco operacional**  | ALTO — falta de medicamento afeta seguranca do paciente                                           |
| **Status atual**       | PARCIALMENTE IMPLEMENTADO — InventoryService usa Maps em memoria; dados perdidos em restart       |
| **Cobertura de teste** | ✅ ICT-010b (Consumption→Reflex), E2E Flow 7 (Atendimento→Consumo→Estoque)                        |
| **Proximo passo**      | Injetar DatabaseInventoryRepository no InventoryService para persistencia real                    |

## Fluxo 10: Atendimento → Alta → Auditoria/Notificacao

| Campo                  | Valor                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| **Objetivo**           | Validar que alta de atendimento gera registro auditavel e notificacoes relevantes             |
| **Modulos envolvidos** | encounters, discharges, audit, notifications                                                  |
| **Entradas**           | encounterId, dischargeType, notes                                                             |
| **Saidas**             | DischargeSummary, audit events, notifications                                                 |
| **Risco operacional**  | ALTO — sem alta, atendimento fica em aberto; sem auditoria, nao ha rastreabilidade            |
| **Status atual**       | PARCIALMENTE IMPLEMENTADO — DischargesService nao valida existencia do encounter referenciado |
| **Cobertura de teste** | ✅ fluxo-internacao.spec.ts (alta de internacao); sem teste dedicado de discharge             |
| **Proximo passo**      | Adicionar validacao de existencia do encounter; criar teste E2E de alta                       |

---

## Resumo de Cobertura

| Fluxo                                  | Status          | Cobertura de Teste   | Proximo Passo                  |
| -------------------------------------- | --------------- | -------------------- | ------------------------------ |
| 1. Login→Sessao→Permissao              | ✅ Implementado | 4 testes + 1 E2E     | Validar user inativo           |
| 2. Tutor→Paciente→Atendimento          | ✅ Implementado | 3 testes + 1 E2E     | Validar patient inativo        |
| 3. Atendimento→Triagem→Prontuario      | ✅ Implementado | 2 testes + 1 E2E     | Adicionar update triage        |
| 4. Atendimento→Internacao→Leito        | ✅ Implementado | 1 E2E                | Validar transferencia de leito |
| 5. Atendimento→Exames→Resultado        | ✅ Implementado | 1 E2E (5 sub-testes) | Notificao de resultado         |
| 6. Atendimento→Cirurgia→Acompanhamento | ✅ Implementado | Unitarios apenas     | Criar E2E                      |
| 7. Atendimento→Prescricao→Execucao     | ⚠️ Parcial      | Unitarios apenas     | Validar entidades + E2E        |
| 8. Atendimento→Billing→Recebiveis      | ⚠️ Parcial      | 1 teste + 1 E2E      | Injetar DB repository          |
| 9. Estoque→Consumo→Reflexo             | ⚠️ Parcial      | 1 teste + 1 E2E      | Injetar DB repository          |
| 10. Atendimento→Alta→Auditoria         | ⚠️ Parcial      | Parcial (internacao) | Validar encounter + E2E        |

**6/10 fluxos implementados com cobertura adequada**
**4/10 fluxos com gaps de persistencia ou validacao**
