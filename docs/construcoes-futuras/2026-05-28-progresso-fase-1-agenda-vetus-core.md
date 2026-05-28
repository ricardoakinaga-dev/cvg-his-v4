# Progresso Fase 1 - Agenda Vetus Core

Data: 2026-05-28

## Incremento entregue

Primeiro incremento da Fase 1 do roadmap Premium Enterprise: reagendamento real de consultas/agendamentos, com contrato, API, dominio e fluxo operacional na SPA.

## Escopo implementado

- Novo contrato `RescheduleAppointmentRequest`.
- Novo endpoint HTTP `POST /appointments/{appointmentId}/reschedule`.
- Novo metodo de dominio `SchedulingService.rescheduleAppointment`.
- Validacao de conflitos ao reagendar, ignorando o proprio agendamento e bloqueando colisao real de paciente, profissional, recurso ou janela operacional.
- Reagendamento permitido apenas para agendamentos em status `scheduled`.
- Persistencia completa dos campos alteraveis do agendamento no reposititorio SQL:
  - data/hora;
  - duracao;
  - tipo de visita;
  - motivo;
  - profissional;
  - servico;
  - unidade;
  - especialidade;
  - recurso/sala.
- Client SPA atualizado com `appointmentService.reschedule`.
- Tela de agenda atualizada com acao `Reagendar` para agendamentos em status `scheduled`.
- Modal de reagendamento na SPA com data/hora, duracao, motivo e recurso/sala.
- Recarregamento da agenda apos reagendamento concluido.
- Tratamento de erro no fluxo visual de reagendamento.
- OpenAPI atualizado para expor o novo endpoint.

## Evidencias de validacao

- `pnpm --filter @cvg-his-v2/module-scheduling test`: passou.
  - `40` testes.
- Teste focado da rota `scheduling-routes`: passou.
  - `7` testes.
- `pnpm validate:openapi`: passou.
  - `235 paths`, `35 tags`, `231 schemas`.
- `pnpm typecheck`: passou.
- `pnpm build`: passou.
- `pnpm test`: passou.
  - SPA: `161` arquivos, `909` testes.
  - API: `194` testes.
- Teste focado da tela `SchedulingListPage`: passou.
  - `9` testes.
- `pnpm --filter @cvg-his-v2/spa typecheck`: passou.
- `pnpm --filter @cvg-his-v2/spa build`: passou.

## Impacto no roadmap

Este incremento melhora o item `F1-01 - Validar e completar agenda ponta a ponta`, adicionando uma operacao essencial do fluxo Vetus: reagendar sem cancelar e recriar manualmente. O fluxo de agenda agora cobre criar, listar, consultar, reagendar pela interface, cancelar, fazer check-in e concluir via fila operacional.

## Proximo foco recomendado

Avancar para `F1-02 - Consolidar comandas/counter-sales`, priorizando abrir comanda, adicionar itens, receber pagamento, fechar e cancelar com rastreabilidade e testes ponta a ponta.
