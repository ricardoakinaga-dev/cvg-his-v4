# Progresso - Fase 4 - Painel de execuções vazias versus preenchidas

Data: 2026-05-28

## Objetivo

Atender a lacuna operacional do Motor Enterprise de Relatórios que pedia visibilidade direta sobre relatórios recorrentes vazios versus relatórios com linhas reais.

## Entregue

- O Motor Enterprise de Relatórios passou a exibir dois novos KPIs operacionais:
  - `Execuções com dados`;
  - `Execuções vazias`.
- Os indicadores usam o `rowCount` já retornado pelo contrato real de execuções.
- A tela mantém o total de `Execuções registradas`, mas agora separa o valor operacional de execuções úteis e execuções sem conteúdo.
- O teste da SPA cobre a exibição dos novos indicadores a partir de execuções preenchidas e vazias.

## Arquivos principais

- `apps/spa/src/pages/reports/ReportsEnginePage.vue`
- `apps/spa/src/pages/reports/__tests__/ReportsEnginePage.test.ts`

## Validação executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts`

## Impacto no plano Premium Enterprise

Este incremento fortalece a operabilidade de relatórios agendados, permitindo que gestão e suporte diferenciem automações que apenas executaram daquelas que realmente entregaram dados úteis.
