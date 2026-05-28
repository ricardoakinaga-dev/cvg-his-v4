# Progresso Fase 4 - Lentes executivas Premium

Data: 2026-05-28

## Objetivo

Expandir o item `F4-02 - Criar dashboards executivos Premium`, cobrindo explicitamente gestao clinica, financeira, operacional e estoque na tela inicial do CVG-HIS v4.

## Entregue

- A `Central executiva Premium` passou a exibir `Lentes executivas`.
- As lentes usam servicos e contratos reais ja existentes:
  - `inpatientService.list()` para internacoes ativas;
  - `inpatientService.listDailyChargeWorklist()` para diarias pendentes;
  - `counterSalesService.getCommercialDashboard()` para receita, comandas e ticket medio;
  - `inventoryService.list()` para itens abaixo do ponto de reposicao e SKUs zerados.
- As quatro visoes executivas agora aparecem no primeiro acesso:
  - `Gestao clinica`;
  - `Financeiro hoje`;
  - `Operacao comercial`;
  - `Estoque critico`.
- As lentes possuem links diretos para as superficies operacionais:
  - `/inpatient`;
  - `/dashboards/financial`;
  - `/counter-sales`;
  - `/inventory/movements`.
- A carga das lentes e isolada por `Promise.allSettled`, evitando que uma fonte parcial derrube todo o dashboard executivo.
- A responsividade foi ampliada para desktop, tablet e mobile.

## Evidencias tecnicas

- `apps/spa/src/pages/DashboardPage.vue`
- `apps/spa/src/pages/__tests__/DashboardPage.test.ts`
- `apps/spa/src/services/inpatient.ts`
- `apps/spa/src/services/counterSales.ts`
- `apps/spa/src/services/inventory.ts`

## Validacao executada

- `pnpm --dir apps/spa exec vitest run src/pages/__tests__/DashboardPage.test.ts --pool=forks` - 1/1 teste passando.
- `pnpm --filter @cvg-his-v2/spa typecheck` - passou.
- `git diff --check -- apps/spa/src/pages/DashboardPage.vue apps/spa/src/pages/__tests__/DashboardPage.test.ts` - passou.

## Impacto no Premium Enterprise

O dashboard inicial agora deixa de ser apenas operacional e passa a ter uma leitura executiva multi-dominio. Isso fortalece a demonstracao Premium Enterprise porque o gestor encontra, no primeiro acesso, sinais de clinica, receita, operacao comercial e estoque sem navegar por quatro modulos diferentes.

Esse incremento tambem melhora a produtividade: cada lente funciona como atalho contextual para a tela de decisao correspondente, reduzindo cliques e conectando indicadores a acao.

## Proximos passos recomendados

- Criar tendencia historica nas lentes usando relatorios executados ou snapshots por periodo.
- Adicionar indicadores de laboratorio e exames pendentes na lente clinica.
- Separar alertas de estoque por validade, lote e fornecedor.
- Criar cockpit tutor/paciente com visao 360 para atender `F4-03`.
