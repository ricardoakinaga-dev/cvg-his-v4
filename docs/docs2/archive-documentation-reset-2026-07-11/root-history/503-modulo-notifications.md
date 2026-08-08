# 503 — Módulo Notifications

## Objetivo

Gerenciar notificações operacionais internas com persistência mínima real em banco e processamento por jobs em `notification_jobs`.

## Superfície funcional real

- `create(actorUserId, accountId, payload)` — cria notificação `queued` e o job correspondente; agora persiste de forma síncrona quando há repositório.
- `list(status?, accountId?)` — lista notificações em memória.
- `listJobs(status?, accountId?)` — lista jobs em memória.
- `listFromRepository(status?, accountId?)` — leitura persistente por conta quando o repositório está disponível.
- `listJobsFromRepository(status?, accountId?)` — leitura persistente dos jobs.
- `processPending(payload?, accountId?)` — processa jobs em memória.
- `processPendingFromRepository(payload?, accountId?)` — processa jobs persistidos; o worker usa este caminho.
- `DatabaseNotificationRepository` — repositório Drizzle para `notifications` e `notification_jobs`.

## Modelo persistido oficial

- Tabelas oficiais:
  - `notifications`
  - `notification_jobs`
- Schema oficial: `packages/db/src/schema/notifications.ts`
- Migration oficial: `packages/db/migrations/0000_vengeful_pet_avengers.sql`
- A trilha oficial foi reduzida ao modelo operacional realmente usado pelo módulo. `notification_templates` e `notification_settings` não fazem parte da história oficial atual.

## Regras de negócio relevantes

- Cada notificação gera automaticamente um job.
- O canal operacional atual continua `internal`.
- `encounterId`, `patientId` e `recipientRoleCode` seguem opcionais.
- A API usa leitura/processamento persistentes quando o repositório existe.
- O worker processa jobs do banco via `processPendingFromRepository`.

## Situação de persistência

- Com banco: persistência real e compartilhada entre API e worker.
- Sem banco: fallback in-memory continua existindo para desenvolvimento/local sem `DATABASE_URL`.
- O comportamento oficial não é mais fire-and-forget no caminho persistente.

## Situação de testes

- `packages/modules/notifications/src/notifications.test.ts` cobre criação, processamento, limites, categorias, severidades e caminho com repositório/account scope.
- `apps/api/src/db-persistence.test.ts` cobre persistência real de `notifications` e `notification_jobs`.
- `apps/api/src/runtime.test.ts` cobre integração API/worker via repositório compartilhado.
- `tests/integration/database/migration.test.ts` valida presença das tabelas na migration oficial.

## Gaps ainda abertos

1. Canais reais de envio externo.
2. Retry/backoff e dead letter.
3. Templates/preferências por usuário.
4. Priorização por severidade no processamento.
