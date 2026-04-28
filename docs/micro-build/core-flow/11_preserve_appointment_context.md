# 11 - Preservar appointmentId ao criar atendimento manualmente

## Objetivo

Preservar o contexto do agendamento quando o atendimento é criado manualmente por:

`/encounters/new?appointmentId=...&patientId=...&ownerId=...`

## Arquivos alterados

- `apps/spa/src/pages/encounters/EncounterFormPage.vue`
- `apps/spa/src/pages/encounters/__tests__/EncounterFormPage.test.ts`
- `docs/micro-build/core-flow/11_preserve_appointment_context.md`

## Comportamento antes

- `EncounterFormPage.vue` lia apenas:
  - `patientId`
  - `ownerId`
- O campo `appointmentId` presente na URL era ignorado.
- O atendimento manual podia ser criado sem vínculo explícito ao agendamento de origem.

## Comportamento depois

- `EncounterFormPage.vue` passa a ler:
  - `patientId`
  - `ownerId`
  - `appointmentId`
- Quando `appointmentId` está presente:
  - mantém `form.appointmentId`;
  - ajusta `visitType` para `scheduled`;
  - ajusta `origin` para `schedule`;
  - inclui `appointmentId` no payload de criação.

## Suporte backend

Não foi necessário alterar backend.

O contrato frontend atual já possui `appointmentId?: string` em `CreateEncounterRequest`, e o backend atual repassa `payload.appointmentId` para `openEncounter`.

Status: suportado pelo backend atual.

## Payload esperado

Entrada:

`/encounters/new?appointmentId=appt-1&patientId=pat-1&ownerId=owner-1`

Payload enviado:

```json
{
  "patientId": "pat-1",
  "ownerId": "owner-1",
  "appointmentId": "appt-1",
  "visitType": "scheduled",
  "origin": "schedule",
  "reason": "..."
}
```

## Validação

- Abrir `/encounters/new?appointmentId=...&patientId=...&ownerId=...`.
- Confirmar paciente e tutor pré-preenchidos.
- Preencher motivo.
- Salvar atendimento.
- Verificar que `encounterService.create()` recebe `appointmentId`.

## Riscos restantes

- A tela ainda não mostra visualmente o ID do agendamento ou resumo do agendamento; apenas preserva o contexto no payload.
- Se o backend rejeitar um `appointmentId` inexistente em ambiente específico, a falha será exibida pelo erro atual do formulário.
