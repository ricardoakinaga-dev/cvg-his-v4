# 09 - Correção de links financeiros sem contexto

## Objetivo

Remover links que abriam comanda/cobrança sem contexto clínico suficiente nos pontos do fluxo principal:

Cliente -> Pet -> Agenda -> Atendimento -> Cobrança

## Regra aplicada

- Atendimento, prontuário ou agenda/esteira com `encounterId`: abrir `/billing/:encounterId`.
- Tutor ou pet sem atendimento ativo: não abrir cobrança direta; enviar para seleção/lista de atendimentos.
- Nenhum link do escopo deve abrir `/counter-sales` sem `ownerId`.
- Quando possível, preservar `ownerId`, `patientId` e `encounterId`.

## Arquivos alterados

- `apps/spa/src/pages/appointments/AppointmentsListPage.vue`
- `apps/spa/src/pages/owners/OwnersListPage.vue`
- `apps/spa/src/pages/owners/OwnerDetailPage.vue`
- `apps/spa/src/pages/patients/PatientsListPage.vue`
- `apps/spa/src/pages/patients/PatientDetailPage.vue`
- `apps/spa/src/pages/owners/__tests__/OwnersListPage.test.ts`
- `apps/spa/src/pages/patients/__tests__/PatientsListPage.test.ts`
- `docs/micro-build/core-flow/09_fix_broken_financial_links.md`

## Pontos corrigidos

### Agenda

- `AppointmentsListPage.vue`
- O botão global `Comandas` apontava para `/counter-sales` sem `ownerId`, `patientId` ou `encounterId`.
- Foi substituído por `Selecionar atendimento para cobrança`, apontando para `/encounters`.

### Lista de tutores

- `OwnersListPage.vue`
- Botões de cobrança/comanda em tutor e pet não abrem mais `/counter-sales`.
- Agora apontam para `/encounters?ownerId=...` ou `/encounters?ownerId=...&patientId=...`.
- Rótulo alterado para `Selecionar atendimento para cobrança`.

### Detalhe do tutor

- `OwnerDetailPage.vue`
- Ações gerais do tutor não abrem mais comanda/cobrança direta.
- Links genéricos para `/billing` em cartões financeiros foram substituídos por seleção de atendimento com `ownerId`.
- No pet do tutor:
  - com atendimento ativo: mantém `/billing/:encounterId`;
  - sem atendimento ativo: usa `/encounters?ownerId=...&patientId=...`.

### Lista de pacientes

- `PatientsListPage.vue`
- O botão financeiro por paciente não abre mais `/counter-sales`.
- Agora aponta para `/encounters?ownerId=...&patientId=...`.
- Rótulo alterado para `Selecionar atendimento para cobrança`.

### Detalhe do paciente

- `PatientDetailPage.vue`
- Com atendimento ativo: mantém `/billing/:encounterId`.
- Sem atendimento ativo: usa `/encounters?ownerId=...&patientId=...`.
- Rótulo sem atendimento ativo: `Selecionar atendimento para cobrança`.

### Atendimento

- `EncounterDetailPage.vue`
- Já estava correto para o caminho canônico: `/billing/:encounterId`.
- Não houve nova alteração nesta etapa.

### Prontuário

- `MedicalRecordsDetailPage.vue`
- Já estava correto para o caminho canônico: `/billing/:encounterId`.
- Não houve nova alteração nesta etapa.

## Validação estática

No escopo solicitado, não restaram ocorrências de:

- `/counter-sales`
- `counterSalesPath`
- `/billing` genérico em `to="/billing"` ou `href="/billing"`
- botões `Abrir Nova Comanda`, `Abrir Comanda`, `Abrir comanda` ou `Comanda comercial`

Ocorrências restantes de cobrança no escopo são:

- `/billing/${encounter.id}` em atendimento.
- `/billing/${record.encounterId}` em prontuário.
- `/billing/${activeEncounter.id}` quando a ficha do pet ou tutor consegue identificar atendimento ativo.
- `/encounters?...` quando a origem é tutor/pet sem atendimento ativo.

## Riscos restantes

- A rota `/encounters?ownerId=...&patientId=...` preserva contexto na URL, mas a lista de atendimentos precisa respeitar esses filtros para a seleção ficar totalmente guiada.
- A agenda global não tem `ownerId`, `patientId` ou `encounterId`; por isso só pode enviar para `/encounters`.
- Esta etapa não criou endpoint nem fluxo novo de criação de cobrança; se o atendimento ainda não tiver billing record, o comportamento continua dependendo do backend atual de `/billing/:encounterId`.

## Checklist de validação

- Abrir tutor sem selecionar pet/atendimento e clicar na ação financeira: deve abrir `/encounters?ownerId=...`.
- Abrir pet sem atendimento ativo e clicar na ação financeira: deve abrir `/encounters?ownerId=...&patientId=...`.
- Abrir pet com atendimento ativo e clicar na ação financeira: deve abrir `/billing/:encounterId`.
- Abrir atendimento e clicar em cobrança: deve abrir `/billing/:encounterId`.
- Abrir prontuário e clicar em cobrança: deve abrir `/billing/:encounterId`.
- Abrir agenda e clicar em seleção financeira: deve abrir `/encounters`.
- Confirmar que nenhum botão do escopo abre `/counter-sales` sem contexto.
