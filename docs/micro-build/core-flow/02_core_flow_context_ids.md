# IDs de contexto do fluxo principal

## Cadeia esperada

```text
ownerId
  -> patientId
    -> appointmentId
      -> encounterId
        -> medicalRecordId
          -> billingId / commandId
```

## Estado atual por ID

| ID | Onde nasce | Onde e preservado | Onde se perde | Risco |
| --- | --- | --- | --- | --- |
| `ownerId` | Tutor criado/listado; paciente possui `primaryOwnerId`; agenda possui `ownerId`; atendimento possui `ownerId` | `/patients/new?ownerId`, `/patients?ownerId`, `/appointments/new?ownerId`, `/encounters/new?ownerId`, `/counter-sales?ownerId`, Billing record | Alguns botoes de comanda usam `/counter-sales` sem query; novo agendamento a partir de tutor nao inclui paciente | Medio |
| `patientId` | Paciente criado/listado; agenda e atendimento carregam `patientId` | `/appointments/new?patientId&ownerId`, `/encounters/new?patientId&ownerId`, `/medical-records/:encounterId`, `/billing/:encounterId` indiretamente | Comandas comerciais nao persistem `patientId`; botoes de comanda em lista/detalhe de paciente nao enviam query | Alto |
| `appointmentId` | `POST /appointments` | `/appointments/:id`, `/appointments/:id/start-encounter`, `AppointmentDetailsDrawer` emite `appointmentId` para check-in | `/encounters/new` nao le/preserva `appointmentId`; Comandas nao carregam agenda | Alto |
| `encounterId` | `POST /encounters` ou `/appointments/:id/start-encounter` | `/encounters/:id`, `/medical-records/:encounterId`, `/billing/:encounterId`, `/counter-sales?encounterId=...` na URL | CounterSales le mas nao persiste; Atendimento direciona "Comanda" para CounterSales em vez de Billing por atendimento | Alto |
| `medicalRecordId` | Criado/obtido no modulo medical-records por atendimento | Entradas clinicas usam `medicalRecordId`; detalhe tecnico mostra `record.id` | URL usa `encounterId`, nao `medicalRecordId`; isso e aceitavel se consistente | Baixo |
| `billingId` | Billing record possui `id` interno e e acessado por `encounterId` | `/billing/:encounterId`, `billingService.getByEncounter`, itens por `encounterId` | UI chama isto de "Faturamento" e em alguns lugares "Comanda"; nao ha deep link de volta para tutor/pet com contexto visual | Medio |
| `commandId` | CounterSale `id` / `number` | `/counter-sales/:id` no backend; tela seleciona `selectedSaleId` internamente | Nao existe rota frontend dedicada `/counter-sales/:id`; nao preserva `patientId`/`encounterId` | Alto |

## Transicoes auditadas

### Cliente -> Pet

Confirmado:

- `OwnerDetailPage.vue` usa `/patients/new?ownerId=${owner.id}`.
- `PatientFormPage.vue` le `route.query.ownerId` e preenche `form.primaryOwnerId`.
- `OwnerDetailPage.vue` usa `/patients?ownerId=${owner.id}` para ver animais do tutor.

Problemas:

- `OwnersListPage.vue` abre comanda sem `ownerId` em alguns botoes.
- `OwnersListPage.vue` agenda com apenas `ownerId`, sem `patientId`.

ID minimo esperado para a fase 1:

- `ownerId` deve ser sempre mantido em "novo pet", "ver pets", "agendar" e "comanda".

### Pet -> Agenda

Confirmado:

- `PatientsListPage.vue` usa `/appointments/new?patientId=${patient.id}&ownerId=${patient.primaryOwnerId}`.
- `PatientDetailPage.vue` usa o mesmo padrao em acoes de agenda/vacina.
- `AppointmentFormPage.vue` le `ownerId` e `patientId` e repassa para `AppointmentQuickCreateForm`.
- `AppointmentQuickCreateForm` valida tutor e paciente antes de salvar.

Problemas:

- Detalhe do pet mostra lista de agendamentos, mas os itens nao sao links diretos para `/appointments/:id`.
- Agenda por tutor (`/appointments/new?ownerId=...`) ainda exige escolha manual do paciente.

ID minimo esperado para a fase 2:

- `ownerId` e `patientId` obrigatorios ao sair do pet para a agenda.

### Agenda -> Atendimento

Confirmado:

- `AppointmentDetailPage.vue` chama `POST /appointments/:id/start-encounter`.
- Backend cria atendimento com `patientId`, `ownerId`, `appointmentId`, `visitType`, `origin: schedule`, `reason`.
- Se ja houver atendimento ativo para o paciente, backend reutiliza.

Problemas:

- `/encounters/new` nao le `appointmentId`.
- Reuso de atendimento ativo por paciente pode anexar agendamento ao atendimento errado se houver episodio aberto antigo.
- Cancel/no-show no cockpit precisa de confirmacao contextual.

ID minimo esperado para a fase 3:

- `appointmentId`, `ownerId`, `patientId` devem estar visiveis ao iniciar atendimento, e o `encounterId` resultante deve voltar para agenda.

### Atendimento -> Prontuario

Confirmado:

- `EncounterDetailPage.vue` aponta para `/medical-records/${encounter.id}`.
- `MedicalRecordsDetailPage.vue` usa `route.params.id` como `encounterId`.
- Entradas clinicas preservam `encounterId` e `patientId`.
- `medicalRecordId` e retornado e exibido em detalhes tecnicos.

Problemas:

- `MedicalRecordsListPage.vue` exibe o `encounterId` truncado como coluna "Atendimento".
- A secao "Timeline tecnica e IDs" exibe UUID completo para usuario final.

ID minimo esperado para fase 4:

- `encounterId` continua como chave tecnica, mas UI deve usar nomes/numero amigavel no topo.

### Atendimento -> Cobranca

Confirmado no Billing:

- `/billing/:encounterId` preserva `encounterId`.
- `BillingRecordSummary` contem `encounterId`, `patientId`, `ownerId`.
- Itens e status sao atualizados por `encounterId`.

Confirmado na Comanda:

- `EncounterDetailPage.vue` gera `/counter-sales?encounterId=...&patientId=...&ownerId=...`.
- `CounterSalesPage.vue` le esses params em `readWorkflowContext`.
- `CounterSalesPage.vue` usa `workflowContext.ownerId` para selecionar comanda existente e preencher busca.

Problema central:

- `counterSalesService.create` envia apenas `{ ownerId, notes }`.
- `POST /counter-sales` aceita apenas `ownerId` e `notes`.
- `CounterSaleSummary` nao possui `patientId` nem `encounterId`.
- Portanto, a comanda nao preserva o contexto assistencial exigido.

ID minimo esperado para fase 5:

- Decidir se a cobranca principal sera `/billing/:encounterId` ou se Comanda deve receber campos `patientId` e `encounterId`.

## Checklist de preservacao por tela

| Tela | ownerId | patientId | appointmentId | encounterId | medicalRecordId | billing/command |
| --- | --- | --- | --- | --- | --- | --- |
| `/owners/:id` | Sim | Parcial por pet | Nao | Nao | Nao | Parcial |
| `/patients/new?ownerId` | Sim | Nao ate criar | Nao | Nao | Nao | Nao |
| `/patients/:id` | Sim | Sim | Lista sem deep link | Focal se existir | Via encounter | Parcial |
| `/appointments/new` | Sim | Sim | Nao ate criar | Nao | Nao | Nao |
| `/appointments/:id` | Sim | Sim | Sim | Cria/reusa | Nao | Nao |
| `/encounters/new` | Sim | Sim | Nao | Nao ate criar | Nao | Nao |
| `/encounters/:id` | Sim | Sim | Se veio do backend | Sim | Via prontuario | Parcial |
| `/medical-records/:encounterId` | Sim por lookup | Sim | Nao | Sim | Sim | Billing sim |
| `/billing/:encounterId` | Sim | Sim | Nao | Sim | Nao | Sim por record |
| `/counter-sales` | Sim | Nao persistido | Nao | Nao persistido | Inferido | Sim |
