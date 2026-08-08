# 620 — Ciclo Residual Final: Validacao

**Data:** 2026-04-01
**Status:** Concluido
**Escopo:** Staff CRUD + notifications na migration/persistencia

## 1. O que foi implementado

### RF001 — Staff CRUD completo

- `StaffService` passou a sustentar create, update, toggle active e hidratação via repositório.
- `DatabaseStaffRepository` foi ligado ao bootstrap/runtime da API.
- A API ficou com rotas reais para listar, obter por id, criar, atualizar e ativar/inativar.
- A UI `/staff` passou a permitir cadastro, edição e ativação/inativação.
- O fluxo E2E crítico do veterinário passou a criar staff real via API.

### RF002 — notifications na migration e persistência coerente

- A história oficial de `notifications` foi reduzida ao modelo operacional realmente usado: `notifications` + `notification_jobs`.
- `packages/db/src/schema/notifications.ts` foi alinhado ao módulo real.
- `packages/db/migrations/0000_vengeful_pet_avengers.sql` foi corrigida para remover a trilha duplicada/incoerente e sustentar o modelo persistido real.
- `NotificationsService` deixou de persistir em fire-and-forget no caminho com repositório.
- A API passou a listar/processar notificações pelo caminho persistente quando houver banco.
- O worker continua processando pelo repositório compartilhado.

## 2. Arquivos alterados

- `packages/modules/staff/src/index.ts`
- `packages/modules/staff/src/repositories/database-staff.repository.ts`
- `packages/modules/staff/src/staff.test.ts`
- `apps/api/src/bootstrap.ts`
- `apps/api/src/runtime.ts`
- `apps/api/src/server.ts`
- `apps/web/src/pages/staff.ts`
- `e2e/tests/fluxos-criticos.spec.ts`
- `packages/modules/notifications/src/index.ts`
- `packages/modules/notifications/src/repositories/database-notifications.repository.ts`
- `packages/modules/notifications/src/notifications.test.ts`
- `packages/db/src/schema/notifications.ts`
- `packages/db/src/schema/index.ts`
- `packages/db/migrations/0000_vengeful_pet_avengers.sql`
- `tests/integration/database/migration.test.ts`
- `apps/api/src/db-persistence.test.ts`
- `apps/api/src/runtime.test.ts`
- `docs/503-modulo-notifications.md`
- `docs/505-modulo-staff.md`
- `docs/590-consolidacao-global-produto.md`
- `docs/593-backlog-residual-pos-fechamento-global.md`
- `docs/115-backend-architecture.md`
- `docs/README.md`
- `docs/620-ciclo-residual-final-validacao.md`

## 3. Status final de staff

- **Status:** fechado
- **Persistência:** real em `staff`
- **API:** CRUD administrativo entregue
- **UI:** `/staff` com criação, edição e ativação/inativação
- **Dependência de seed:** não exclusiva mais; seed permanece só como baseline local

## 4. Status final de notifications

- **Status:** fechado
- **Schema/migration:** coerentes com o módulo operacional real
- **Persistência:** real em `notifications` e `notification_jobs`
- **API:** leitura/processamento pelo repositório quando disponível
- **Worker:** continua consumindo do banco compartilhado
- **Capacidade não prometida:** sem templates/canais externos/retry avançado

## 5. Comandos executados

- `pnpm typecheck`
- `pnpm --filter @cvg-his-v2/module-staff test`
- `pnpm --filter @cvg-his-v2/module-notifications test`
- `pnpm test`
- `pnpm --filter @cvg-his-v2/module-notifications build`
- `pnpm build`

## 6. Testes executados

- `pnpm typecheck` — verde
- `pnpm build` — verde
- `pnpm test` — verde
- `packages/modules/notifications/src/notifications.test.ts` — cobre caminho in-memory e caminho com repositório/account scope
- `packages/modules/staff/src/staff.test.ts` — cobre create/update/toggle na suite global
- `apps/api/src/db-persistence.test.ts` — cobre persistência real de staff e notifications
- `tests/integration/database/migration.test.ts` — atualizado para validar a trilha oficial de notifications
- `e2e/tests/fluxos-criticos.spec.ts` — atualizado para criar staff real no fluxo do veterinário

## 7. Bloqueios residuais remanescentes

- Queue do scheduling ainda é in-memory
- Triage continua sem update
- Notifications continuam somente no canal `internal`
- PDF server-side continua HTML inline

## 8. Impacto qualitativo no produto

- O acabamento administrativo ficou mais coerente: equipe deixou de ser cadastro parcial/seed-only.
- Notifications deixou de ter narrativa quebrada entre módulo, migration, API e worker.
- A documentação viva agora conta a mesma história do código nesses dois pontos residuais.
- O ganho é de coerência e fechamento operacional, não de salto grande de score.

## 9. Fechamento residual

- **Staff CRUD:** efetivamente fechado
- **Notifications na migration/persistência:** efetivamente fechado
- **Ciclo residual final:** concluído dentro do escopo solicitado
