# Progresso - Fase 1 - Vacinas e Vermífugos com filtros rápidos

Data: 2026-05-28

## Objetivo

Fechar a pendência recomendada da F1-07 para permitir triagem rápida da agenda preventiva por situação operacional.

## Entregue

- A tela `Vacinas e Vermífugos` recebeu filtros rápidos:
  - `Vencidos`;
  - `Vence hoje`;
  - `Próximos 7 dias`;
  - `Sem aviso`;
  - `Todos rápidos`.
- Os filtros rápidos operam sobre a lista já carregada, sem alterar o contrato da API.
- O filtro `Sem aviso` considera eventos agendados sem `reminderEmailPreparedAt`.
- O filtro `Próximos 7 dias` considera eventos agendados entre hoje e os próximos sete dias.
- Aplicar ou limpar filtros principais reseta o filtro rápido para `Todos rápidos`.
- Teste da tela cobre os botões e a filtragem por vencimento, janela de 7 dias e aviso pendente.

## Arquivos principais

- `apps/spa/src/pages/preventive/VaccinesDewormersPage.vue`
- `apps/spa/src/pages/preventive/__tests__/VaccinesDewormersPage.test.ts`

## Validação executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/preventive/__tests__/VaccinesDewormersPage.test.ts`

## Impacto no plano Premium Enterprise

Este incremento fortalece o item `F1-07 - Fechar vacinas e vermífugos`, reduzindo o tempo de triagem da recepção e tornando a agenda preventiva mais próxima de uma rotina operacional premium.
