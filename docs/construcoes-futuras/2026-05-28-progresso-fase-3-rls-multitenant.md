# Progresso Fase 3 - RLS multi-tenant

Data: 2026-05-28

## Objetivo

Avancar o item F3-02 do roadmap Premium Enterprise: validar isolamento multi-tenant forte por `account_id` e RLS nas migrations canonicas.

## Entregue

- Criado analisador estatico de cobertura RLS em `packages/db/src/rls.ts`.
- Criado comando raiz `pnpm validate:rls`.
- Criado script `scripts/validate-rls-coverage.ts`.
- O validador identifica tabelas criadas com `account_id` e exige:
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`;
  - `CREATE POLICY`;
  - predicado tenant com `app.current_account_id()` ou `current_setting('app.current_account_id', true)`.
- A primeira execucao apontou 7 gaps reais:
  - `api_keys`;
  - `webhooks`;
  - `feature_flags`;
  - `feature_flag_overrides`;
  - `attachments`;
  - `inpatient_occurrences`;
  - `inpatient_daily_charges`.
- Criada migration `0054_enterprise_rls_gap_closure.sql` fechando RLS e policies tenant dessas 7 tabelas.
- A validacao final passou com 91/91 tabelas tenant protegidas e 0 excecoes documentadas.

## Evidencias tecnicas

- `packages/db/src/rls.ts`
- `packages/db/src/rls.test.ts`
- `scripts/validate-rls-coverage.ts`
- `package.json`
- `packages/db/migrations/0054_enterprise_rls_gap_closure.sql`

## Validacao executada

- `pnpm validate:rls` - 91/91 tabelas tenant protegidas
- `pnpm --filter @cvg-his/db test -- --run src/rls.test.ts` - 7/7 testes passando
- `pnpm --filter @cvg-his/db build`
- Conferencia do lockfile preservando `vue-component-type-helpers@3.2.7`

## Atualizacao RC

O gate `pnpm readiness:enterprise` passou a exigir `pnpm validate:rls` e o gate `pnpm governance:access` cruza a disponibilidade do validador RLS com rotas criticas e governanca RBAC/ABAC. A ultima execucao local validou 96/96 tabelas tenant protegidas.

## Status

F3-02 fica atendido como criterio tecnico local de Release Candidate. A validacao final de isolamento em ambiente real segue coberta pelos pendentes externos de CI/homologacao do pacote RC.
