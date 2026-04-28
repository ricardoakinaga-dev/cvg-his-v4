# Mapa de rotas do fluxo principal

## Frontend

| Fluxo | Rota | Tela | Arquivo |
| --- | --- | --- | --- |
| Cliente lista | `/owners` | Lista de clientes | `apps/spa/src/pages/owners/OwnersListPage.vue` |
| Cliente novo | `/owners/new` | Formulario de cliente | `apps/spa/src/pages/owners/OwnerFormPage.vue` |
| Cliente detalhe | `/owners/:id` | Hub/detalhe do cliente | `apps/spa/src/pages/owners/OwnerDetailPage.vue` |
| Cliente edicao | `/owners/:id/edit` | Formulario de cliente | `apps/spa/src/pages/owners/OwnerFormPage.vue` |
| Pet lista | `/patients` | Lista de animais | `apps/spa/src/pages/patients/PatientsListPage.vue` |
| Pet lista por tutor | `/patients?ownerId=:ownerId` | Lista filtrada por tutor | `apps/spa/src/pages/patients/PatientsListPage.vue` |
| Pet novo por tutor | `/patients/new?ownerId=:ownerId` | Formulario de animal pre-vinculado | `apps/spa/src/pages/patients/PatientFormPage.vue` |
| Pet detalhe | `/patients/:id` | Ficha do animal | `apps/spa/src/pages/patients/PatientDetailPage.vue` |
| Pet edicao | `/patients/:id/edit` | Formulario de animal | `apps/spa/src/pages/patients/PatientFormPage.vue` |
| Agenda | `/appointments` | Cockpit da agenda | `apps/spa/src/pages/appointments/AppointmentsListPage.vue` |
| Agenda novo | `/appointments/new` | Formulario rapido/completo | `apps/spa/src/pages/appointments/AppointmentFormPage.vue` + `AppointmentQuickCreateForm.vue` |
| Agenda detalhe | `/appointments/:id` | Detalhe do agendamento | `apps/spa/src/pages/appointments/AppointmentDetailPage.vue` |
| Atendimento lista | `/encounters` | Lista de atendimentos | `apps/spa/src/pages/encounters/EncountersListPage.vue` |
| Atendimento novo | `/encounters/new?patientId=:patientId&ownerId=:ownerId` | Abrir atendimento | `apps/spa/src/pages/encounters/EncounterFormPage.vue` |
| Atendimento detalhe | `/encounters/:id` | Cockpit do atendimento | `apps/spa/src/pages/encounters/EncounterDetailPage.vue` |
| Prontuario lista | `/medical-records` | Lista de prontuarios | `apps/spa/src/pages/medical-records/MedicalRecordsListPage.vue` |
| Prontuario detalhe | `/medical-records/:encounterId` | Prontuario clinico | `apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue` |
| Billing lista | `/billing` | Faturamento | `apps/spa/src/pages/billing/BillingListPage.vue` |
| Billing detalhe | `/billing/:encounterId` | Faturamento do atendimento | `apps/spa/src/pages/billing/BillingDetailPage.vue` |
| Comandas | `/counter-sales` | Comandas comerciais | `apps/spa/src/pages/sales/CounterSalesPage.vue` |
| Comandas contextual | `/counter-sales?ownerId=:ownerId&patientId=:patientId&encounterId=:encounterId` | Comandas com contexto parcial | `apps/spa/src/pages/sales/CounterSalesPage.vue` |

## Query params reconhecidos

| Rota | Params | Uso atual |
| --- | --- | --- |
| `/patients/new` | `ownerId` | Preenche `form.primaryOwnerId` e `stagedOwnerId` |
| `/patients` | `ownerId` | Filtra lista local de pacientes e ajusta acao "novo animal" |
| `/appointments/new` | `ownerId`, `patientId`, `scheduledAt`, `durationMinutes`, `practitionerStaffId`, `visitType`, `serviceId`, `unit`, `specialty`, `resourceLabel`, `reason`, `appointmentId` | Prefill do componente `AppointmentQuickCreateForm` |
| `/encounters/new` | `patientId`, `ownerId` | Prefill do atendimento; `appointmentId` nao e lido |
| `/medical-records/:encounterId` | `entry` | Usado para deep link de intencao, mas nao ha garantia de abrir modal automaticamente em todas as rotas |
| `/billing` service | `encounterId` | Filtra lista via `billingService.list(encounterId)` |
| `/counter-sales` | `ownerId`, `patientId`, `encounterId` | `ownerId` seleciona comanda existente ou busca tutor no modal; `patientId` e `encounterId` nao sao persistidos |

## Backend

| Dominio | Endpoint | Metodo | Permissao | Observacao |
| --- | --- | --- | --- | --- |
| Owners | `/owners` | GET | `owners.read` | Lista tutores |
| Owners | `/owners` | POST | `owners.manage` | Cria tutor |
| Owners | `/owners/:id` | GET | `owners.read` | Detalhe tutor |
| Owners | `/owners/:id` | PATCH | `owners.manage` | Edita tutor |
| Owners | `/owners/:id/summary` | GET | `owners.read` | Resumo com pets e stats |
| Patients | `/patients` | GET | `patients.read` | Aceita `ownerId`, `q`, `species`, `status` |
| Patients | `/patients` | POST | `patients.manage` | Cria paciente |
| Patients | `/patients/:id` | GET | `patients.read` | Detalhe paciente |
| Patients | `/patients/:id` | PATCH | `patients.manage` | Edita paciente |
| Patients | `/patients/:id/summary` | GET | `patients.read` | Resumo com tutor e encontros |
| Agenda | `/appointments` | GET | `scheduling.read` | Lista agendamentos |
| Agenda | `/appointments` | POST | `scheduling.manage` | Cria agendamento |
| Agenda | `/appointments/:id` | GET | `scheduling.read` | Detalhe |
| Agenda | `/appointments/:id/cancel` | POST | `scheduling.manage` | Cancela |
| Agenda -> Atendimento | `/appointments/:id/start-encounter` | POST | `encounters.manage` | Cria ou reutiliza atendimento ativo do paciente |
| Agenda | `/scheduling/overview` | GET | `scheduling.read` | Cockpit |
| Agenda | `/scheduling/availability` | GET | `scheduling.read` | Disponibilidade |
| Fila | `/queue` | GET | `scheduling.read` | Lista fila |
| Fila | `/queue/check-in` | POST | `scheduling.manage` | Check-in |
| Fila | `/queue/:id/call` | POST | `scheduling.manage` | Chamar |
| Fila | `/queue/:id/start-care` | POST | `scheduling.manage` | Iniciar cuidado na fila |
| Fila | `/queue/:id/no-show` | POST | `scheduling.manage` | No-show/cancelado |
| Atendimento | `/encounters` | GET | `encounters.read` | Lista |
| Atendimento | `/encounters` | POST | `encounters.manage` | Abre atendimento |
| Atendimento | `/encounters/:id` | GET | `encounters.read` | Detalhe |
| Atendimento | `/encounters/:id/summary` | GET | `encounters.read` | Timeline, diagnosticos e financeiro |
| Atendimento | `/encounters/:id/timeline` | GET | `encounters.read` | Timeline |
| Atendimento | `/encounters/:id/transition` | POST | `encounters.manage` | Transicao de status |
| Atendimento | `/encounters/:id/close` | POST | `encounters.manage` | Fecha atendimento |
| Prontuario | `/medical-records` | GET | `medical-records.read` | Lista ou detalhe por `encounterId` |
| Prontuario | `/medical-records/entries` | GET | `medical-records.read` | Lista entradas por `encounterId` |
| Prontuario | `/medical-records/entries` | POST | `medical-records.manage` | Cria entrada |
| Prontuario | `/medical-records/entries/:id` | PATCH | `medical-records.manage` | Edita entrada |
| Prontuario | `/medical-records/entries/:id` | DELETE | `medical-records.manage` | Arquiva entrada |
| Prontuario | `/medical-records/entries/:id/revisions` | GET | `medical-records.read` | Revisoes |
| Prontuario | `/medical-records/timeline` | GET | `medical-records.read` | Timeline clinica |
| Billing | `/billing` | GET | `billing.read` | Lista; aceita `encounterId` |
| Billing | `/billing/:encounterId` | GET | `billing.read` | Record por atendimento |
| Billing | `/billing/:encounterId/items` | GET | `billing.read` | Itens |
| Billing | `/billing/estimate` | POST | `billing.manage` | Cria estimativa |
| Billing | `/billing/items` | POST | `billing.manage` | Adiciona item |
| Billing | `/billing/:encounterId/status` | PATCH | `billing.manage` | Atualiza status |
| Financeiro atendimento | `/encounters/:encounterId/financial-summary` | GET | `billing.read` | Resumo financeiro |
| Financeiro atendimento | `/encounters/:encounterId/financial-close` | POST | `billing.manage` | Fechamento financeiro |
| Comandas | `/counter-sales` | GET | `counter_sale.read` | Lista; aceita `ownerId`, `status`, datas |
| Comandas | `/counter-sales` | POST | `counter_sale.write` | Abre comanda por `ownerId`; nao aceita `patientId`/`encounterId` |
| Comandas | `/counter-sales/:id` | GET | `counter_sale.read` | Detalhe |
| Comandas | `/counter-sales/:id/items` | POST | `counter_sale.write` | Adiciona item |
| Comandas | `/counter-sales/:id/items/:itemId` | PATCH/DELETE | `counter_sale.write` | Atualiza/remove item |
| Comandas | `/counter-sales/:id/payments` | POST | `counter_sale.write` | Pagamento |
| Comandas | `/counter-sales/:id/close` | POST | `counter_sale.write` | Fecha |
| Comandas | `/counter-sales/:id/cancel` | POST | `counter_sale.write` | Cancela |
| Comandas | `/counter-sales/:id/reopen` | POST | `counter_sale.write` | Reabre |

## Rotas problemáticas ou ambiguas

- `/billing/new` aparece como acao em `BillingListPage.vue`, mas nao ha rota frontend correspondente no mapa inspecionado.
- `/counter-sales?patientId=...&encounterId=...` parece contextual, mas o backend e o service so persistem `ownerId`.
- `/encounters/new` nao recebe `appointmentId`, mesmo quando a origem deveria ser agenda.
- `/appointments/new?ownerId=...` e util a partir do tutor, mas incompleto para criar agendamento real sem escolher paciente.
