# 10 - Proteção da ação Iniciar atendimento na agenda

## Objetivo

Adicionar confirmação explícita antes de executar:

`POST /appointments/:id/start-encounter`

A mudança é somente de UI. Não altera backend, reutilização de atendimento ativo, endpoint ou regra clínica.

## Arquivos alterados

- `apps/spa/src/pages/appointments/AppointmentDetailPage.vue`
- `apps/spa/src/pages/appointments/__tests__/AppointmentDetailPage.test.ts`
- `docs/micro-build/core-flow/10_protect_start_encounter.md`

## Comportamento antes

- O botão `Iniciar Atendimento` chamava `appointmentService.startEncounter()` imediatamente.
- O backend podia reutilizar atendimento ativo do paciente.
- A tela não informava ao usuário se a ação criaria novo atendimento ou reutilizaria um existente.

## Comportamento depois

- O botão `Iniciar Atendimento` abre uma confirmação.
- A chamada ao backend só acontece ao clicar em `Confirmar`.
- O botão `Cancelar` fecha a confirmação sem chamar backend.

## Dados exibidos na confirmação

- Tutor.
- Paciente.
- Data/hora do agendamento.
- Status do paciente.
- Impacto da ação:
  - `Será criado novo atendimento para este agendamento.`
  - ou `Será reutilizado atendimento existente (...)`.

## Como a UI decide a mensagem

- A tela usa serviços frontend existentes:
  - `patientService.getById(appointment.patientId)` para exibir status do paciente.
  - `encounterService.list()` para identificar atendimento ativo do paciente.
- Se houver atendimento do mesmo paciente com status diferente de `closed`, a confirmação informa reutilização.
- A regra final continua sendo a do backend em `/appointments/:id/start-encounter`.

## Validação executada

- Abrir detalhe de agendamento.
- Clicar em `Iniciar Atendimento`.
- Confirmar que o modal aparece antes do POST.
- Clicar em `Cancelar`.
- Confirmar que `appointmentService.startEncounter()` não é chamado.
- Clicar em `Confirmar`.
- Confirmar que `appointmentService.startEncounter(appointmentId)` é chamado e navega para `/encounters/:id`.
- Simular paciente com atendimento ativo.
- Confirmar que a mensagem informa reutilização.

## Riscos restantes

- A indicação de criação/reutilização é uma prévia baseada nos dados carregados pela UI. Em caso de concorrência, a decisão final continua sendo do backend.
- Se a tela não conseguir carregar status do paciente ou lista de atendimentos, a confirmação ainda protege o POST, mas pode mostrar status como `Não informado`.
