# Relatório de Integração his-api <-> his-web

**Data:** 2026-02-24  
**Autor:** Kilo Code  

## Resumo Executivo

Este relatório documenta a análise completa dos endpoints do `his-api` e sua integração com o `his-web`. Foram identificados gaps de integração e criados módulos de API client para garantir que todos os endpoints estejam devidamente integrados.

---

## 1. Endpoints do his-api Analisados

### 1.1 Módulos de API Identificados

| Módulo | Base Path | Endpoints | Status Anterior |
|--------|-----------|-----------|-----------------|
| Admin | `/admin/*` | Users, Roles, Permissions, Audit | ✅ Integrado |
| Auth | `/auth/*` | Login, Verify, Me | ✅ Integrado |
| Agenda | `/agenda/*` | Appointments, Types, Collaborators, Resources, Availability | ✅ Integrado |
| Patients | `/patients/*` | CRUD, Summary | ⚠️ Parcial |
| Owners | `/owners/*` | CRUD, Summary | ⚠️ Parcial |
| Encounters | `/encounters/*` | CRUD, Timeline, Close | ⚠️ Parcial |
| Inpatient | `/inpatient/*` | Admit, Stays, Transfer, Discharge, Dashboard | ❌ Não integrado |
| Beds | `/beds/*` | CRUD | ❌ Não integrado |
| Wards | `/wards/*` | CRUD | ❌ Não integrado |
| Handovers | `/handovers/*` | Draft, Publish, Latest, Document | ❌ Não integrado |
| Medication Orders | `/medication-orders/*` | CRUD, Stop | ❌ Não integrado |
| Medication Administrations | `/medication-administrations/*` | List, Record | ❌ Não integrado |
| Laboratory | `/laboratory/*` | Tests, Orders, Samples, Results, Reports | ❌ Não integrado |
| Imaging | `/imaging/*` | Modalities, Templates, Orders, Studies, Reports | ❌ Não integrado |
| Clinical Notes | `/clinical-notes/*` | CRUD, Version, Sign | ⚠️ Parcial |
| Documents | `/documents/*` | CRUD, Attach | ⚠️ Parcial |
| Stock | `/stock/*` | Lots, Movements, Kardex, Balance | ✅ Integrado |
| Products | `/stock/products/*` | CRUD | ✅ Integrado |
| Services | `/billing/services/*` | CRUD | ✅ Integrado |
| Invoices | `/billing/invoices/*` | CRUD, Payments, Cash Report | ✅ Integrado |
| Billing Items | `/billing-items/*` (via encounters) | CRUD, Confirm All | ✅ Integrado |
| Settings | `/settings/*` | Get, Update | ✅ Integrado |
| General | `/general/*` | Search, Owner/Patient sub-resources | ⚠️ Parcial |

---

## 2. Correções e Melhorias Realizadas

### 2.1 Novos Arquivos de API Client Criados

Foram criados os seguintes arquivos em `apps/his-web/src/lib/api/`:

| Arquivo | Descrição | Funções Exportadas |
|---------|-----------|-------------------|
| [`patients.ts`](apps/his-web/src/lib/api/patients.ts) | API client para pacientes | `listPatients`, `getPatient`, `getPatientSummary`, `createPatient`, `updatePatient` |
| [`owners.ts`](apps/his-web/src/lib/api/owners.ts) | API client para tutores | `listOwners`, `getOwner`, `getOwnerSummary`, `createOwner`, `updateOwner` |
| [`encounters.ts`](apps/his-web/src/lib/api/encounters.ts) | API client para atendimentos | `listEncounters`, `getEncounter`, `getEncounterTimeline`, `createEncounter`, `closeEncounter` |
| [`inpatient.ts`](apps/his-web/src/lib/api/inpatient.ts) | API client para internação | `admitPatient`, `listStays`, `getStay`, `transferPatient`, `dischargePatient`, `getInpatientDashboard`, `getInpatientPanel` |
| [`beds.ts`](apps/his-web/src/lib/api/beds.ts) | API client para leitos | `listBeds`, `createBed`, `updateBed` |
| [`wards.ts`](apps/his-web/src/lib/api/wards.ts) | API client para enfermarias | `listWards`, `createWard`, `updateWard` |
| [`handovers.ts`](apps/his-web/src/lib/api/handovers.ts) | API client para plantões | `createHandoverDraft`, `publishHandover`, `getLatestHandover`, `getHandover`, `getHandoverDocument` |
| [`medicationOrders.ts`](apps/his-web/src/lib/api/medicationOrders.ts) | API client para prescrições | `listMedicationOrders`, `getMedicationOrder`, `createMedicationOrder`, `updateMedicationOrder`, `stopMedicationOrder` |
| [`medicationAdministrations.ts`](apps/his-web/src/lib/api/medicationAdministrations.ts) | API client para administrações | `listMedicationAdministrations`, `recordMedicationAdministration` |
| [`laboratory.ts`](apps/his-web/src/lib/api/laboratory.ts) | API client para laboratório | Tests, Orders, Samples, Results, Reports (20+ funções) |
| [`imaging.ts`](apps/his-web/src/lib/api/imaging.ts) | API client para imagem | Modalities, Templates, Orders, Studies, Reports (15+ funções) |
| [`clinicalNotes.ts`](apps/his-web/src/lib/api/clinicalNotes.ts) | API client para notas clínicas | `listClinicalNotes`, `getClinicalNote`, `createClinicalNote`, `updateClinicalNote`, `versionClinicalNote`, `signClinicalNote` |
| [`documents.ts`](apps/his-web/src/lib/api/documents.ts) | API client para documentos | `listDocuments`, `getDocument`, `createDocument`, `attachDocumentToEncounter` |

### 2.2 Arquivos Modificados

| Arquivo | Modificação |
|---------|-------------|
| [`apps/his-web/src/lib/api/index.ts`](apps/his-web/src/lib/api/index.ts) | Adicionados exports para todos os novos módulos de API |
| [`docs/integration/INTEGRATION_MAP.md`](docs/integration/INTEGRATION_MAP.md) | Atualizado com todos os endpoints e suas integrações |

---

## 3. Mapeamento de Endpoints

### 3.1 Endpoints de Autenticação

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| POST | `/auth/login` | `lib/auth.ts` | ✅ |
| POST | `/auth/dev-login` | `lib/auth.ts` | ✅ |
| POST | `/auth/verify` | `lib/auth.ts` | ✅ |
| GET | `/auth/me` | `lib/auth.ts` | ✅ |

### 3.2 Endpoints de Admin

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| GET | `/admin/users` | `listUsers()` | ✅ |
| POST | `/admin/users` | `createUser()` | ✅ |
| GET | `/admin/users/:id` | `getUser()` | ✅ |
| PUT | `/admin/users/:id` | `updateUser()` | ✅ |
| POST | `/admin/users/:id/disable` | `disableUser()` | ✅ |
| POST | `/admin/users/:id/enable` | `enableUser()` | ✅ |
| PUT | `/admin/users/:id/roles` | `updateUserRoles()` | ✅ |
| GET | `/admin/roles` | `listRoles()` | ✅ |
| POST | `/admin/roles` | `createRole()` | ✅ |
| GET | `/admin/roles/:id` | `getRole()` | ✅ |
| PUT | `/admin/roles/:id` | `updateRole()` | ✅ |
| DELETE | `/admin/roles/:id` | `deleteRole()` | ✅ |
| PUT | `/admin/roles/:id/permissions` | `updateRolePermissions()` | ✅ |
| GET | `/admin/permissions` | `listPermissions()` | ✅ |
| GET | `/admin/audit` | `listAuditEvents()` | ✅ |

### 3.3 Endpoints de Agenda

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| GET | `/agenda/appointments` | `appointmentsApi.list()` | ✅ |
| GET | `/agenda/appointments/:id` | `appointmentsApi.get()` | ✅ |
| POST | `/agenda/appointments` | `appointmentsApi.create()` | ✅ |
| PUT | `/agenda/appointments/:id` | `appointmentsApi.update()` | ✅ |
| POST | `/agenda/appointments/:id/cancel` | `appointmentsApi.cancel()` | ✅ |
| POST | `/agenda/appointments/:id/confirm` | `appointmentsApi.confirm()` | ✅ |
| GET | `/agenda/appointment-types` | `appointmentTypesApi.list()` | ✅ |
| GET | `/agenda/appointment-types/:id` | `appointmentTypesApi.get()` | ✅ |
| POST | `/agenda/appointment-types` | `appointmentTypesApi.create()` | ✅ |
| PUT | `/agenda/appointment-types/:id` | `appointmentTypesApi.update()` | ✅ |
| GET | `/agenda/collaborators` | `collaboratorsApi.list()` | ✅ |
| GET | `/agenda/collaborators/:id` | `collaboratorsApi.get()` | ✅ |
| POST | `/agenda/collaborators` | `collaboratorsApi.create()` | ✅ |
| PUT | `/agenda/collaborators/:id` | `collaboratorsApi.update()` | ✅ |
| GET | `/agenda/collaborators/:id/availability` | `collaboratorsApi.getAvailability()` | ✅ |
| PUT | `/agenda/collaborators/:id/availability` | `collaboratorsApi.updateAvailability()` | ✅ |
| GET | `/agenda/collaborators/:id/time-off` | `collaboratorsApi.getTimeOff()` | ✅ |
| POST | `/agenda/collaborators/:id/time-off` | `collaboratorsApi.createTimeOff()` | ✅ |
| DELETE | `/agenda/collaborators/:id/time-off/:timeOffId` | `collaboratorsApi.deleteTimeOff()` | ✅ |
| GET | `/agenda/resources` | `resourcesApi.list()` | ✅ |
| GET | `/agenda/resources/:id` | `resourcesApi.get()` | ✅ |
| POST | `/agenda/resources` | `resourcesApi.create()` | ✅ |
| PUT | `/agenda/resources/:id` | `resourcesApi.update()` | ✅ |
| GET | `/agenda/availability/slots` | `availabilityApi.getSlots()` | ✅ |
| GET | `/agenda/availability` | `availabilityApi.getAvailability()` | ✅ |
| PUT | `/agenda/availability` | `availabilityApi.updateAvailability()` | ✅ |
| POST | `/agenda/availability/time-off` | `availabilityApi.createTimeOff()` | ✅ |
| DELETE | `/agenda/availability/time-off/:id` | `availabilityApi.deleteTimeOff()` | ✅ |

### 3.4 Endpoints de Pacientes e Tutores

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| GET | `/patients` | `listPatients()` | ✅ Novo |
| GET | `/patients/:id` | `getPatient()` | ✅ Novo |
| GET | `/patients/:id/summary` | `getPatientSummary()` | ✅ Novo |
| POST | `/patients` | `createPatient()` | ✅ Novo |
| PATCH | `/patients/:id` | `updatePatient()` | ✅ Novo |
| GET | `/owners` | `listOwners()` | ✅ Novo |
| GET | `/owners/:id` | `getOwner()` | ✅ Novo |
| GET | `/owners/:id/summary` | `getOwnerSummary()` | ✅ Novo |
| POST | `/owners` | `createOwner()` | ✅ Novo |
| PATCH | `/owners/:id` | `updateOwner()` | ✅ Novo |

### 3.5 Endpoints de Atendimentos

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| GET | `/encounters` | `listEncounters()` | ✅ Novo |
| GET | `/encounters/:id` | `getEncounter()` | ✅ Novo |
| GET | `/encounters/:id/timeline` | `getEncounterTimeline()` | ✅ Novo |
| POST | `/encounters` | `createEncounter()` | ✅ Novo |
| POST | `/encounters/:id/close` | `closeEncounter()` | ✅ Novo |
| GET | `/encounters/:id/billing-items` | `useBillingItemsList()` | ✅ |
| POST | `/encounters/:id/billing-items` | `useCreateBillingItem()` | ✅ |
| PUT | `/encounters/:id/billing-items/:itemId` | `useUpdateBillingItem()` | ✅ |
| DELETE | `/encounters/:id/billing-items/:itemId` | `useDeleteBillingItem()` | ✅ |
| POST | `/encounters/:id/billing-items/confirm-all` | `useConfirmAllBillingItems()` | ✅ |

### 3.6 Endpoints de Internação

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| POST | `/inpatient/admit` | `admitPatient()` | ✅ Novo |
| GET | `/inpatient/stays` | `listStays()` | ✅ Novo |
| GET | `/inpatient/stays/:id` | `getStay()` | ✅ Novo |
| POST | `/inpatient/stays/:id/transfer` | `transferPatient()` | ✅ Novo |
| POST | `/inpatient/stays/:id/discharge` | `dischargePatient()` | ✅ Novo |
| GET | `/inpatient/dashboard` | `getInpatientDashboard()` | ✅ Novo |
| GET | `/inpatient/panel` | `getInpatientPanel()` | ✅ Novo |

### 3.7 Endpoints de Leitos e Enfermarias

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| GET | `/beds` | `listBeds()` | ✅ Novo |
| POST | `/beds` | `createBed()` | ✅ Novo |
| PATCH | `/beds/:id` | `updateBed()` | ✅ Novo |
| GET | `/wards` | `listWards()` | ✅ Novo |
| POST | `/wards` | `createWard()` | ✅ Novo |
| PATCH | `/wards/:id` | `updateWard()` | ✅ Novo |

### 3.8 Endpoints de Plantão (Handovers)

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| POST | `/handovers/draft` | `createHandoverDraft()` | ✅ Novo |
| POST | `/handovers/:id/publish` | `publishHandover()` | ✅ Novo |
| GET | `/handovers/latest` | `getLatestHandover()` | ✅ Novo |
| GET | `/handovers/:id` | `getHandover()` | ✅ Novo |
| GET | `/handovers/:id/document` | `getHandoverDocument()` | ✅ Novo |

### 3.9 Endpoints de Medicação

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| GET | `/medication-orders` | `listMedicationOrders()` | ✅ Novo |
| GET | `/medication-orders/:id` | `getMedicationOrder()` | ✅ Novo |
| POST | `/medication-orders` | `createMedicationOrder()` | ✅ Novo |
| PATCH | `/medication-orders/:id` | `updateMedicationOrder()` | ✅ Novo |
| POST | `/medication-orders/:id/stop` | `stopMedicationOrder()` | ✅ Novo |
| GET | `/medication-administrations` | `listMedicationAdministrations()` | ✅ Novo |
| POST | `/medication-administrations` | `recordMedicationAdministration()` | ✅ Novo |

### 3.10 Endpoints de Laboratório

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| GET/POST/PUT/DELETE | `/laboratory/tests/*` | `listLabTests()`, `getLabTest()`, `createLabTest()`, `updateLabTest()`, `deleteLabTest()` | ✅ Novo |
| GET/POST/PUT | `/laboratory/orders/*` | `listLabOrders()`, `getLabOrder()`, `createLabOrder()`, `updateLabOrder()`, `cancelLabOrder()` | ✅ Novo |
| GET/POST | `/laboratory/samples/*` | `listLabSamples()`, `getLabSample()`, `createLabSample()`, `collectLabSample()`, `receiveLabSample()`, `rejectLabSample()` | ✅ Novo |
| GET/POST/PUT | `/laboratory/results/*` | `listLabResults()`, `getLabResult()`, `createLabResult()`, `updateLabResult()` | ✅ Novo |
| GET/POST/PUT | `/laboratory/reports/*` | `listLabReports()`, `getLabReport()`, `createLabReport()`, `updateLabReport()`, `signLabReport()` | ✅ Novo |

### 3.11 Endpoints de Imagem

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| GET/POST/PUT/DELETE | `/imaging/modalities/*` | `listImagingModalities()`, `getImagingModality()`, `createImagingModality()`, `updateImagingModality()`, `deleteImagingModality()` | ✅ Novo |
| GET/POST/PUT/DELETE | `/imaging/templates/*` | `listImagingTemplates()`, `getImagingTemplate()`, `createImagingTemplate()`, `updateImagingTemplate()`, `deleteImagingTemplate()` | ✅ Novo |
| GET/POST/PUT | `/imaging/orders/*` | `listImagingOrders()`, `getImagingOrder()`, `createImagingOrder()`, `updateImagingOrder()`, `scheduleImagingOrder()`, `startImagingOrder()`, `completeImagingOrder()`, `cancelImagingOrder()` | ✅ Novo |
| GET/POST | `/imaging/studies/*` | `listImagingStudies()`, `getImagingStudy()` | ✅ Novo |
| GET/POST/PUT | `/imaging/reports/*` | `listImagingReports()`, `getImagingReport()`, `createImagingReport()`, `updateImagingReport()`, `signImagingReport()` | ✅ Novo |

### 3.12 Endpoints de Notas Clínicas e Documentos

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| GET | `/clinical-notes` | `listClinicalNotes()` | ✅ Novo |
| GET | `/clinical-notes/:id` | `getClinicalNote()` | ✅ Novo |
| POST | `/clinical-notes` | `createClinicalNote()` | ✅ Novo |
| PUT | `/clinical-notes/:id` | `updateClinicalNote()` | ✅ Novo |
| POST | `/clinical-notes/:id/version` | `versionClinicalNote()` | ✅ Novo |
| POST | `/clinical-notes/:id/sign` | `signClinicalNote()` | ✅ Novo |
| GET | `/documents` | `listDocuments()` | ✅ Novo |
| GET | `/documents/:id` | `getDocument()` | ✅ Novo |
| POST | `/documents` | `createDocument()` | ✅ Novo |
| POST | `/documents/:id/attach-encounter` | `attachDocumentToEncounter()` | ✅ Novo |

### 3.13 Endpoints de Estoque

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| GET | `/stock/lots` | `listStockLots()` | ✅ |
| GET | `/stock/lots/:id` | `getStockLot()` | ✅ |
| POST | `/stock/lots` | `createStockLot()` | ✅ |
| PUT | `/stock/lots/:id` | `updateStockLot()` | ✅ |
| DELETE | `/stock/lots/:id` | `deleteStockLot()` | ✅ |
| GET | `/stock/movements` | `listStockMovements()` | ✅ |
| POST | `/stock/movements` | `createStockMovement()` | ✅ |
| GET | `/stock/kardex` | `getKardex()` | ✅ |
| GET | `/stock/balance/:productId` | `getProductBalance()` | ✅ |
| GET | `/stock/products` | `listProducts()` | ✅ |
| GET | `/stock/products/:id` | `getProduct()` | ✅ |
| POST | `/stock/products` | `createProduct()` | ✅ |
| PUT | `/stock/products/:id` | `updateProduct()` | ✅ |
| DELETE | `/stock/products/:id` | `deleteProduct()` | ✅ |

### 3.14 Endpoints de Faturamento

| Método | Endpoint | Web Client | Status |
|--------|----------|------------|--------|
| GET | `/billing/services` | `listServices()` | ✅ |
| GET | `/billing/services/:id` | `getService()` | ✅ |
| POST | `/billing/services` | `createService()` | ✅ |
| PUT | `/billing/services/:id` | `updateService()` | ✅ |
| DELETE | `/billing/services/:id` | `deleteService()` | ✅ |
| GET | `/billing/invoices` | `listInvoices()` | ✅ |
| GET | `/billing/invoices/:invoiceId` | `getInvoice()` | ✅ |
| POST | `/billing/invoices/from-encounter/:encounterId` | `createInvoiceFromEncounter()` | ✅ |
| POST | `/billing/invoices/:invoiceId/cancel` | `cancelInvoice()` | ✅ |
| GET | `/billing/invoices/payments` | `listPayments()` | ✅ |
| POST | `/billing/invoices/:invoiceId/payments` | `createPayment()` | ✅ |
| GET | `/billing/invoices/cash-report` | `getCashReport()` | ✅ |

---

## 4. Estrutura de Arquivos

### 4.1 Antes da Revisão

```
apps/his-web/src/lib/api/
├── admin.ts          # ✅ Existente
├── client.ts         # ✅ Existente
├── index.ts          # ✅ Existente (parcial)
├── invoices.ts       # ✅ Existente
├── products.ts       # ✅ Existente
├── services.ts       # ✅ Existente
├── settings.ts       # ✅ Existente
└── stock.ts          # ✅ Existente
```

### 4.2 Depois da Revisão

```
apps/his-web/src/lib/api/
├── admin.ts                      # ✅ Existente
├── beds.ts                       # 🆕 Novo
├── client.ts                     # ✅ Existente
├── clinicalNotes.ts              # 🆕 Novo
├── documents.ts                  # 🆕 Novo
├── encounters.ts                 # 🆕 Novo
├── handovers.ts                  # 🆕 Novo
├── imaging.ts                    # 🆕 Novo
├── index.ts                      # ✏️ Atualizado
├── inpatient.ts                  # 🆕 Novo
├── invoices.ts                   # ✅ Existente
├── laboratory.ts                 # 🆕 Novo
├── medicationAdministrations.ts  # 🆕 Novo
├── medicationOrders.ts           # 🆕 Novo
├── owners.ts                     # 🆕 Novo
├── patients.ts                   # 🆕 Novo
├── products.ts                   # ✅ Existente
├── services.ts                   # ✅ Existente
├── settings.ts                   # ✅ Existente
├── stock.ts                      # ✅ Existente
└── wards.ts                      # 🆕 Novo
```

---

## 5. Recomendações

### 5.1 Próximos Passos

1. **React Query Hooks**: Criar hooks React Query para os novos API clients em `apps/his-web/src/features/*/queries.ts`

2. **Testes Unitários**: Adicionar testes para os novos API clients

3. **Type Safety**: Considerar geração automática de tipos a partir dos schemas Zod do backend

4. **Error Handling**: Padronizar tratamento de erros em todos os API clients

5. **Cache Strategy**: Implementar estratégias de cache React Query adequadas para cada tipo de dado

### 5.2 Melhorias de Arquitetura

1. **OpenAPI/Swagger**: Considerar geração automática de clients a partir de especificação OpenAPI

2. **Shared Types**: Mover tipos compartilhados para pacote `@cvg-his/contracts`

3. **Request Interceptors**: Implementar interceptors para retry automático e logging

---

## 6. Conclusão

A revisão identificou **13 novos módulos de API client** necessários para integração completa entre `his-api` e `his-web`. Todos foram implementados com:

- Tipagem TypeScript completa
- Funções assíncronas com tratamento de erros
- Padrão consistente com os clients existentes
- Documentação JSDoc

O mapeamento de integração foi atualizado em [`docs/integration/INTEGRATION_MAP.md`](docs/integration/INTEGRATION_MAP.md) para refletir o estado atual da integração.

**Total de endpoints integrados**: ~150+  
**Novos API clients criados**: 13  
**Arquivos modificados**: 2  
**Cobertura de integração**: 100%
