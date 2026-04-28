# 08 - Caminho financeiro canônico do atendimento

## Decisão aplicada

O caminho financeiro canônico para cobrança vinculada a atendimento é:

`/billing/:encounterId`

`/counter-sales` permanece disponível apenas para venda/comanda comercial sem contexto clínico confiável.

Observação técnica: a rota frontend atual está declarada como `billing/:id` em `apps/spa/src/router/routes.ts`, mas `BillingDetailPage.vue` interpreta esse parâmetro como `encounterId` e chama `billingService.getByEncounter(encounterId)`.

## Arquivos alterados

- `apps/spa/src/pages/encounters/EncounterDetailPage.vue`
- `apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue`
- `apps/spa/src/pages/patients/PatientDetailPage.vue`
- `apps/spa/src/pages/patients/PatientsListPage.vue`
- `apps/spa/src/pages/owners/OwnerDetailPage.vue`
- `apps/spa/src/pages/owners/OwnersListPage.vue`
- `apps/spa/src/pages/scheduling/QueuePage.vue`
- `apps/spa/src/pages/patients/__tests__/PatientDetailPage.test.ts`
- `apps/spa/src/pages/patients/__tests__/PatientsListPage.test.ts`
- `docs/micro-build/core-flow/08_financial_canonical_path.md`

## Pontos corrigidos

### Atendimento

- Botão principal antes apontava para `/counter-sales`.
- Agora aponta para `/billing/${encounter.id}`.
- Rótulo ajustado de `Comanda` para `Cobrança`.
- Painel `Serviços / Comanda` ajustado para `Serviços / Cobrança`.
- Ação `Abrir comanda` agora abre `/billing/${encounter.id}`.

IDs preservados:

- `encounterId`: preservado no path.
- `ownerId` e `patientId`: recuperados pela tela de billing a partir do billing record do atendimento.

### Prontuário

- O link já usava `/billing/${record.encounterId}`.
- Rótulos ajustados para `Cobrança` e `Abrir Cobrança`, alinhando a nomenclatura ao caminho canônico.

IDs preservados:

- `encounterId`: preservado no path a partir do prontuário.
- `ownerId` e `patientId`: resolvidos pela cobrança vinculada ao atendimento.

### Pet com atendimento ativo

- Botão financeiro da ficha do paciente deixou de apontar sempre para `/counter-sales`.
- Quando existe atendimento ativo, abre `/billing/${activeEncounter.id}`.
- Quando não existe atendimento ativo, cai para `/counter-sales?ownerId=...&patientId=...` como comanda comercial explícita.

IDs preservados:

- Com atendimento ativo: `encounterId`.
- Sem atendimento ativo: `ownerId` e `patientId` em query params comerciais.

### Tutor com pet e atendimento ativo

- Na lista de animais dentro do detalhe do tutor, o botão financeiro do pet agora verifica atendimento ativo.
- Com atendimento ativo, abre `/billing/${encounterId}`.
- Sem atendimento ativo, mantém `/counter-sales?ownerId=...&patientId=...`.

### Listas de tutores e pacientes

- Links de lista sem atendimento carregado foram mantidos em `/counter-sales`.
- Esses links agora preservam `ownerId` e, quando aplicável, `patientId`.
- O botão em lista de pacientes foi rotulado como `Comanda comercial` para reduzir ambiguidade.

### Esteira operacional

- Linha com `row.entry.encounterId` agora abre `/billing/${row.entry.encounterId}`.
- Linha sem atendimento continua abrindo `/counter-sales`.

## Locais onde `/counter-sales` permanece

- `apps/spa/src/navigation.ts`: navegação global de PDV/comandas.
- `apps/spa/src/pages/appointments/AppointmentsListPage.vue`: ação global da agenda sem agendamento/atendimento selecionado.
- `apps/spa/src/pages/scheduling/QueuePage.vue`: somente quando a linha não possui `encounterId`.
- `apps/spa/src/pages/owners/OwnerDetailPage.vue`: ações gerais do tutor, sem paciente/atendimento específico.
- `apps/spa/src/pages/owners/OwnersListPage.vue`: ações comerciais de lista, agora com query params de contexto.
- `apps/spa/src/pages/patients/PatientsListPage.vue`: lista não carrega atendimentos ativos; ação permanece comercial com `ownerId/patientId`.

## Ambiguidades restantes

- A agenda possui botão global `Comandas` para `/counter-sales`; não há ali um atendimento selecionado no cabeçalho.
- A lista de pacientes não carrega atendimentos ativos, então não consegue decidir entre `/billing/:encounterId` e `/counter-sales` por linha.
- A rota frontend usa `billing/:id`, embora semanticamente o valor seja `encounterId`.
- A tela de billing ainda mostra `Atendimento ${encounterId.slice(0, 8)}...` no cabeçalho, expondo parte do UUID.
- A criação automática de cobrança para atendimento sem billing record depende do backend existente; esta etapa não alterou backend nem inventou endpoint.

## Riscos restantes

- Se `/billing/:encounterId` receber um atendimento sem cobrança criada e o backend não criar ou retornar o registro, a tela exibirá erro.
- O detalhe do tutor depende da lista de atendimentos já carregada para detectar atendimento ativo por pet.
- Links comerciais com `ownerId/patientId` só preservam contexto se a tela de `/counter-sales` consumir esses query params.
- A validação ponta a ponta ainda precisa confirmar visualmente tutor, paciente e atendimento corretos na tela de cobrança.

## Checklist de validação do fluxo

- Abrir um tutor com pet e atendimento ativo.
- Clicar no financeiro do pet no detalhe do tutor.
- Confirmar navegação para `/billing/:encounterId`.
- Abrir a ficha do pet com atendimento ativo.
- Clicar em `Abrir cobrança do atendimento`.
- Confirmar navegação para `/billing/:encounterId`.
- Abrir um atendimento.
- Clicar em `Cobrança`.
- Confirmar navegação para `/billing/:encounterId`.
- Abrir o prontuário do atendimento.
- Clicar em `Abrir Cobrança`.
- Confirmar navegação para `/billing/:encounterId`.
- Em todos os casos, conferir tutor, paciente e atendimento exibidos na cobrança.
- Confirmar que `/counter-sales` continua acessível pela navegação comercial global.
