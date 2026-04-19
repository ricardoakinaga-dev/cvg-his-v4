# 0209 - Agenda Premium Enterprise Status

**Status:** vivo  
**Data:** 2026-04-12  
**Fonte:** `0196`, `0206`, `0207`, `0208`

## 1. Escopo entregue neste lote

- `ERP-030` fechado com cockpit multiprofissional em `apps/spa/src/pages/appointments/AppointmentsListPage.vue`
- `ERP-031` fechado com contratos reais `/api/scheduling/overview` e `/api/scheduling/availability`
- `ERP-032` fechado com fluxo rápido reutilizável em `apps/spa/src/components/appointments/AppointmentQuickCreateForm.vue`
- `ERP-033` fechado com jornada operacional agenda -> fila -> atendimento e retorno visual do estágio na agenda

## 2. Evidência real no código

- extração de agenda para `apps/api/src/routes/scheduling-routes.ts`
- enriquecimento do módulo `packages/modules/scheduling` com:
  - overview multiprofissional
  - conflitos previsíveis
  - bloqueios operacionais
  - disponibilidade por slot
  - metadados de profissional, serviço, setor, especialidade e recurso
  - estágio operacional agregado por agendamento com vínculo real de fila/encounter
- atualização do repositório e schema de `appointments` com metadados de agenda
- reuso do mesmo núcleo de agendamento rápido na página e no modal da agenda
- `apps/spa/src/pages/scheduling/QueuePage.vue` passou a abrir triagem/atendimento a partir do encounter real, sem pular direto para um estado de fila sem episódio clínico
- `apps/spa/src/pages/appointments/AppointmentDetailPage.vue` rebaixou o CTA para a etapa operacional honesta (`/queue`) quando o agendamento já está em check-in

## 3. Fechamento real de `ERP-033`

- card da agenda já dispara `check-in` direto para a fila
- card/listagem da agenda agora exibem estágio operacional agregado (`Agendado`, `Check-in`, `Chamado`, `Em triagem`, `Em atendimento`, `Em observação`, `Concluído`, `Cancelado`)
- a agenda deixou de depender de `listQueue()` em paralelo para saber o estado operacional do compromisso
- a fila abre triagem por `POST /encounters`, vincula `queueEntryId`, transiciona o encounter e devolve o operador ao detalhe do atendimento
- os estados terminais da fila sincronizam o `appointment.status` para `cancelled` ou `completed`

## 4. Validação executada

- `pnpm --filter @cvg-his-v2/module-scheduling typecheck`
- `pnpm --filter @cvg-his-v2/module-scheduling test`
- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/api build`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/appointments/__tests__/AppointmentsListPage.test.ts src/pages/scheduling/__tests__/QueuePage.test.ts src/pages/appointments/__tests__/AppointmentDetailPage.test.ts --reporter=verbose`
- `pnpm --filter @cvg-his-v2/spa build`
