# Links quebrados, incompletos ou com perda de contexto

## P0 - Quebra direta do fluxo

### BL-001 - Comanda a partir do paciente perde contexto

- Arquivo: `apps/spa/src/pages/patients/PatientDetailPage.vue`
- Rota atual: `/counter-sales`
- Contexto esperado: `/counter-sales?ownerId=:ownerId&patientId=:patientId`
- Impacto: usuario sai da ficha do pet e entra em comanda sem tutor/paciente selecionado.
- IDs perdidos: `ownerId`, `patientId`, `encounterId`.
- Fase: 5.

### BL-002 - Comanda a partir da lista de pacientes perde contexto

- Arquivo: `apps/spa/src/pages/patients/PatientsListPage.vue`
- Rota atual: `/counter-sales`
- Contexto esperado: no minimo `/counter-sales?ownerId=:ownerId&patientId=:patientId`.
- Impacto: risco de lancar cobranca para tutor errado.
- IDs perdidos: `ownerId`, `patientId`.
- Fase: 5.

### BL-003 - Comanda a partir da lista de clientes perde contexto

- Arquivo: `apps/spa/src/pages/owners/OwnersListPage.vue`
- Rota atual: `/counter-sales`
- Contexto esperado: `/counter-sales?ownerId=:ownerId`; quando a acao vem de animal, tambem `patientId`.
- Impacto: abre tela global sem tutor selecionado.
- IDs perdidos: `ownerId`, `patientId`.
- Fase: 1/5.

### BL-004 - CounterSales nao persiste `patientId`/`encounterId`

- Arquivos: `apps/spa/src/pages/sales/CounterSalesPage.vue`, `apps/spa/src/services/counterSales.ts`, `apps/api/src/routes/counter-sales-routes.ts`, `packages/modules/counter-sales/src/index.ts`
- Rota atual: `/counter-sales?ownerId=:ownerId&patientId=:patientId&encounterId=:encounterId`
- Comportamento: a pagina le os params, mas criacao de comanda envia apenas `ownerId` e `notes`.
- Impacto: nao atende ao criterio "Preservar ownerId, patientId e encounterId quando possivel".
- IDs perdidos: `patientId`, `encounterId`.
- Fase: 5.

### BL-005 - `/billing/new` sem rota frontend

- Arquivo: `apps/spa/src/pages/billing/BillingListPage.vue`
- Rota citada: `/billing/new`
- Rota declarada encontrada: `/billing`, `/billing/:id`
- Impacto: acao "Novo Faturamento" tende a cair em detalhe com `id = new` ou 404/logica errada.
- IDs perdidos: todos, pois novo billing deveria nascer de `encounterId`.
- Fase: 5.

## P1 - Perda de contexto entre etapas

### BL-006 - Agendamento a partir do tutor nao carrega paciente

- Arquivos: `OwnerDetailPage.vue`, `OwnersListPage.vue`
- Rota atual: `/appointments/new?ownerId=:ownerId`
- Impacto: usuario precisa selecionar manualmente o pet; risco de agenda para paciente errado.
- Correcao futura: quando houver pet especifico, enviar `patientId`; quando nao houver, mostrar selecao obrigatoria filtrada por tutor.
- Fase: 2.

### BL-007 - Atendimento manual nao preserva `appointmentId`

- Arquivo: `apps/spa/src/pages/encounters/EncounterFormPage.vue`
- Rota atual suportada: `/encounters/new?patientId=:patientId&ownerId=:ownerId`
- Param ausente: `appointmentId`
- Impacto: se a conversao agenda -> atendimento passar pelo formulario manual, perde vinculo com agenda.
- Fase: 3.

### BL-008 - Lista de agendamentos no pet nao abre detalhe

- Arquivo: `apps/spa/src/pages/patients/PatientDetailPage.vue`
- Comportamento: itens de agenda sao exibidos como historico, sem link claro para `/appointments/:id`.
- Impacto: recepcao nao consegue sair do pet para o agendamento especifico com seguranca.
- Fase: 2.

### BL-009 - Atendimento aponta "Comanda" para CounterSales, nao Billing

- Arquivo: `apps/spa/src/pages/encounters/EncounterDetailPage.vue`
- Rota atual: `workflowLink('/counter-sales')`
- Alternativa existente: `/billing/:encounterId`
- Impacto: bifurca financeiro em dois modelos; CounterSales perde contexto clinico.
- Fase: 5.

### BL-010 - Prontuario chama Billing de "Comanda"

- Arquivo: `apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue`
- Rota atual: `/billing/${record.encounterId}`
- Texto: "Abrir Comanda"
- Impacto: mistura conceitos; usuario pode esperar a comanda comercial de `/counter-sales`.
- Fase: 4/5.

## P2 - Links tecnicamente funcionais, mas confusos

### BL-011 - Fallbacks com UUID como nome

- Arquivos: `AppointmentsListPage.vue`, `EncountersListPage.vue`, `MedicalRecordsListPage.vue`, `PatientsListPage.vue`, `BillingListPage.vue`
- Exemplos: `Tutor ${ownerId.slice(0, 6)}`, `Paciente ${patientId.slice(0, 8)}...`, `encounterId.slice(0,8)`.
- Impacto: usuario final ve identificadores tecnicos quando cache/lookup falha.
- Fase: 6/7.

### BL-012 - Voltar sem contexto original

- Arquivos: `AppointmentFormPage.vue`, `BillingDetailPage.vue`, `MedicalRecordsDetailPage.vue`, `CounterSalesPage.vue`
- Exemplos: `goBack()` volta sempre para `/appointments`; billing volta para `/billing`; comanda fecha workbench sem voltar ao atendimento.
- Impacto: usuario perde a trilha tutor/pet/atendimento.
- Fase: 6.

## Dependencias para correcao futura

- Decisao de arquitetura: Billing por atendimento sera a cobranca principal, ou CounterSales deve ser expandido para aceitar `patientId` e `encounterId`.
- Definir padrao de `returnTo` ou contexto de origem para botoes "Voltar".
- Definir numero amigavel para atendimento/prontuario/comanda, evitando UUID como titulo primario.
