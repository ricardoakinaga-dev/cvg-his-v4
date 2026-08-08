# Política de migração e deploy do CVG-HIS V4

**Data:** 2026-08-07
**Status:** vigente
**Fonte de verdade:** [`132-superficie-canonica-deploy-e-migracao.md`](132-superficie-canonica-deploy-e-migracao.md)

## Trilha canônica

O banco de produção é alterado exclusivamente pela trilha Drizzle em `packages/db`:

- migrations: `packages/db/migrations/*.sql`;
- schema: `packages/db/src/schema/`;
- runner: `packages/db/src/migrate.ts`;
- seed: `packages/db/src/seed.ts`.

O runner ordena os arquivos SQL, registra checksum em `drizzle_migrations`, aplica cada arquivo em transação e ignora somente arquivos `.revert.sql` e `.seed.sql` conforme a política do repositório.

As migrations históricas em `packages/shared/database/src/migrations/001-016` estão **deprecadas**. Elas permanecem para compatibilidade histórica e não podem ser executadas em deploy, cutover, teste crítico ou rollback operacional.

## Guardrails obrigatórios

Antes de publicar ou cortar tráfego:

```bash
pnpm deploy:check
pnpm validate:openapi
pnpm validate:rls
pnpm security:enterprise
DATABASE_URL="$DATABASE_URL" pnpm exec tsx packages/db/src/migrate.ts
```

O comando de migration deve executar com uma credencial de migração controlada. API e worker usam roles distintas, sem `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION` ou `BYPASSRLS`; nenhuma aplicação de runtime executa SQL histórico.

## Compatibilidade e rollback

Migrations novas devem ser aditivas e reversíveis por procedimento operacional documentado. Rollback de aplicação não desfaz schema automaticamente: primeiro preserva-se backup, depois aplica-se o procedimento de compatibilidade aprovado. A alteração só é considerada concluída quando o checksum da migration, o estado do banco e o artefato de deploy forem registrados.

## Evidência

O checklist de cutover é [`131-checklist-cutover-servidor.md`](131-checklist-cutover-servidor.md), a superfície canônica é [`132-superficie-canonica-deploy-e-migracao.md`](132-superficie-canonica-deploy-e-migracao.md) e o acompanhamento desta rodada está no [diário de execução](2026-08-07-diario-execucao-resolucao-auditoria-cvg-his-v4.md).
