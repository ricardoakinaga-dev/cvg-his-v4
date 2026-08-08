# Progresso - Fase 4 - Lente clínica com exames pendentes

Data: 2026-05-28

## Objetivo

Atender a pendência da F4-02 para adicionar indicadores de laboratório e exames pendentes à lente clínica do Dashboard Premium.

## Entregue

- A tela inicial passou a carregar pedidos laboratoriais via `laboratoryService.listOrders()`.
- A lente `Gestão clínica` agora conta exames pendentes com status:
  - `requested`;
  - `collected`.
- O resumo clínico combina exames pendentes com diárias pendentes quando ambos existem.
- Quando há exames pendentes, a lente clínica direciona para `/laboratory/orders`.
- O carregamento parcial das lentes executivas considera laboratório como uma das fontes monitoradas.
- Teste do Dashboard cobre a exibição de `2 exame(s) pendente(s)` junto do indicador financeiro de diárias.

## Arquivos principais

- `apps/spa/src/pages/DashboardPage.vue`
- `apps/spa/src/pages/__tests__/DashboardPage.test.ts`

## Validação executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/__tests__/DashboardPage.test.ts`

## Impacto no plano Premium Enterprise

Este incremento fortalece a `Central executiva Premium` ao transformar laboratório em sinal executivo dentro da gestão clínica, reduzindo a chance de exames coletados ou solicitados ficarem fora da rotina de acompanhamento.
