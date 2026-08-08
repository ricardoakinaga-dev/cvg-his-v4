# Progresso Fase 2 - Internacao: Persistencia PostgreSQL de Ocorrencias e Diarias

Data: 2026-05-28

## Objetivo

Dar durabilidade enterprise ao incremento de internacao operacional, persistindo ocorrencias estruturadas e diarias de internacao em PostgreSQL para que os dados sobrevivam a restart, auditoria e leitura por repositorios.

## Entregas Realizadas

- Criadas tabelas de persistencia:
  - `inpatient_occurrences`;
  - `inpatient_daily_charges`.
- Criadas migrations:
  - `packages/db/migrations/0050_inpatient_occurrences_daily_charges.sql`;
  - `packages/shared/database/src/migrations/020_inpatient_occurrences_daily_charges.sql`.
- Atualizado schema Drizzle compartilhado em `packages/shared/database/src/schemas/index.ts`.
- Criados repositories PostgreSQL:
  - `DatabaseInpatientOccurrenceRepository`;
  - `DatabaseInpatientDailyChargeRepository`.
- Ampliado `InpatientService` para persistir:
  - ocorrencias ao registrar;
  - diarias ao lancar;
  - status/billing da diaria ao marcar como faturada.
- Atualizado wiring da API:
  - `RuntimeRepositories`;
  - `createApiRuntime`;
  - `bootstrapServices`, com deteccao de existencia das tabelas.
- Ampliado teste de persistencia para validar leitura de ocorrencias e diarias apos escrita e novo bootstrap.

## Resultado no Roadmap

O item F2-05 deixa de ter apenas operacao em memoria para ocorrencias e diarias, passando a ter base duravel. Isso fortalece a entrega Premium Enterprise porque a internacao agora possui dados hospitalares rastreaveis, cobrancas recuperaveis e caminho claro para integracao com faturamento.

## Validacoes Executadas

- `pnpm --filter @cvg-his-v2/shared-database build`
- `pnpm --filter @cvg-his-v2/shared-types build`
- `pnpm --filter @cvg-his-v2/shared-contracts build`
- `pnpm --filter @cvg-his-v2/module-inpatient build && pnpm --filter @cvg-his-v2/module-inpatient test`
- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/api build && node apps/api/dist/routes/inpatient-routes.test.js`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm validate:openapi`
- Conferencia do lockfile para manter `vue-component-type-helpers@3.2.7`.

## Proximos Incrementos Recomendados

- Integrar diarias pendentes ao modulo de billing/contas a receber.
- Expor fila gerencial de internacoes com ocorrencias criticas por setor.
- Vincular prescricoes e execucoes de medicacao diretamente a ficha de internacao.
- Criar relatorio financeiro de internacao por periodo, paciente, unidade e status de faturamento.
