# Progresso Fase 2 - Internacao: Ocorrencias e Diarias Operacionais

Data: 2026-05-28

## Objetivo

Avancar o item F2-05 do roadmap Premium Enterprise, transformando a internacao em uma operacao hospitalar mais completa, com registro estruturado de ocorrencias e lancamento de diarias cobraveis a partir da ficha da internacao.

## Entregas Realizadas

- Ampliado o dominio `@cvg-his-v2/module-inpatient` com:
  - ocorrencias estruturadas por tipo e severidade;
  - listagem de ocorrencias por internacao;
  - criacao de diaria/cobranca de internacao;
  - calculo de total por quantidade e valor unitario;
  - ciclo de diaria `pending -> billed`.
- Adicionados contratos e tipos compartilhados para:
  - `InpatientOccurrenceSummary`;
  - `InpatientDailyChargeSummary`;
  - requisicoes/listagens de ocorrencias e diarias.
- Adicionados endpoints HTTP:
  - `GET /inpatient/{stayId}/occurrences`;
  - `POST /inpatient/{stayId}/occurrences`;
  - `GET /inpatient/{stayId}/daily-charges`;
  - `POST /inpatient/{stayId}/daily-charges`;
  - `POST /inpatient/{stayId}/daily-charges/{chargeId}/bill`.
- Atualizado o OpenAPI com os novos paths e schemas.
- Atualizada a SPA em `InpatientDetailPage.vue` com:
  - secao "Ocorrencias da Internacao";
  - formulario de nova ocorrencia;
  - secao "Diarias e Cobrancas";
  - formulario de lancamento de diaria;
  - acao para marcar diaria como faturada;
  - KPI de diarias pendentes na ficha resumida.

## Resultado no Roadmap

Este incremento fortalece F2-05 ao cobrir partes centrais do requisito "ocorrencias, diaria, prescricao, evolucao e alta". O sistema ja possuia evolucao clinica e alta com justificativa; agora passa a ter tambem ocorrencias estruturadas e diarias operacionais na tela da internacao.

## Validacoes Executadas

- `pnpm --filter @cvg-his-v2/module-inpatient build && pnpm --filter @cvg-his-v2/module-inpatient test`
- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/api build && node apps/api/dist/routes/inpatient-routes.test.js`
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/inpatient/__tests__/InpatientDetailPage.test.ts --pool=forks`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa build`
- `pnpm validate:openapi`
- Conferencia do lockfile para manter `vue-component-type-helpers@3.2.7`.

## Proximos Incrementos Recomendados

- Persistir ocorrencias e diarias em PostgreSQL com migrations dedicadas.
- Integrar diarias pendentes ao modulo de billing/contas a receber.
- Vincular prescricao e execucao de medicacao diretamente na ficha de internacao.
- Criar visao de plantao com ocorrencias criticas e diarias pendentes por setor.
- Criar relatorio financeiro de internacao por paciente, periodo e unidade.
