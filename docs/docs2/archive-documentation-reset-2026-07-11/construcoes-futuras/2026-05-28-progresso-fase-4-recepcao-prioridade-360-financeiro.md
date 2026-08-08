# Progresso Fase 4 - Recepcao com prioridade 360 financeira

Data: 2026-05-28

## Objetivo

Concluir a pendencia de conectar pendencias financeiras na `Prioridade 360` da recepcao, depois dos sinais clinicos e preventivos.

## Entregue

- A busca da `Recepcao` passou a carregar billing do tutor via `billingService.list({ ownerId })`.
- A `Prioridade 360` agora soma comandas do paciente com `status !== 'settled'`.
- A hierarquia operacional ficou:
  - exames laboratoriais pendentes;
  - preventivo vencido;
  - pendencia financeira;
  - alerta cadastral de doenca cronica ou alergia.
- Quando nao ha exame pendente nem preventivo vencido, a recepcao exibe `Pendência financeira` com o valor em aberto e atalho para o cockpit do paciente.
- O teste da recepcao cobre a chamada de billing e o caso em que o financeiro vira a prioridade depois dos sinais clinicos/preventivos.

## Evidencias tecnicas

- `apps/spa/src/pages/reception/ReceptionGatewayPage.vue`
- `apps/spa/src/pages/reception/__tests__/ReceptionGatewayPage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/reception/__tests__/ReceptionGatewayPage.test.ts` - 7/7 testes passando.

## Impacto no Premium Enterprise

A mesa da recepcao passa a refletir a mesma leitura 360 que o cockpit usa para orientar proxima acao, reduzindo encaminhamentos sem contexto financeiro e mantendo risco clinico acima de cobranca comum.

## Proximos passos recomendados

- Rodar a jornada 360 E2E em ambiente com PostgreSQL de teste ativo para validar persistencia real.
