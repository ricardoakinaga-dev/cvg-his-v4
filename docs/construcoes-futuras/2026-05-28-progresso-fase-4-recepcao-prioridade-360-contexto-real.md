# Progresso Fase 4 - Recepcao com prioridade 360 de contexto real

Data: 2026-05-28

## Objetivo

Avancar a pendencia de enriquecer a prioridade 360 da recepcao com sinais reais do cockpit, usando laboratorio pendente e preventivo vencido alem de alerta cadastral.

## Entregue

- A busca da `Recepcao` passou a carregar contexto 360 dos pacientes encontrados.
- Para cada paciente localizado, a tela consulta:
  - pedidos de laboratorio via `laboratoryService.listOrders({ patientId })`;
  - eventos preventivos via `vaccinesDewormersService.list({ patientId, ownerId, includeExecuted: true })`.
- O atalho `Prioridade 360` agora prioriza:
  - `Exames pendentes` quando ha pedidos `requested` ou `collected`;
  - `Preventivo vencido` quando ha evento preventivo agendado no passado;
  - `Pendência financeira` quando ha comanda do paciente com `status !== 'settled'`;
  - `Atencao clinica` quando ha doenca cronica ou alergia cadastral.
- A busca principal continua tolerante a falha parcial: laboratorio/preventivo usam carregamento separado e nao devem impedir a localizacao de tutor/paciente.
- O teste da recepcao cobre chamadas para laboratorio/preventivo e a exibicao combinada de exames pendentes com preventivo vencido.

## Evidencias tecnicas

- `apps/spa/src/pages/reception/ReceptionGatewayPage.vue`
- `apps/spa/src/pages/reception/__tests__/ReceptionGatewayPage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/reception/__tests__/ReceptionGatewayPage.test.ts` - 6/6 testes passando.

## Impacto no Premium Enterprise

A recepcao deixa de depender apenas de alerta cadastral e passa a refletir parte da hierarquia real do cockpit. Isso reduz risco operacional antes de agenda, esteira ou comanda, especialmente em pacientes com exames pendentes ou preventivo atrasado.

## Proximos passos recomendados

- Rodar a jornada 360 E2E em ambiente com PostgreSQL de teste ativo para validar persistencia real.
