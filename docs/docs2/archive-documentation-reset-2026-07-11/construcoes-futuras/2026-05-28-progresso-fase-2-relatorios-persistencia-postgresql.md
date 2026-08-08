# Progresso Fase 2 - Relatórios Persistência PostgreSQL

Data: 2026-05-28

## Objetivo

Persistir execuções, exportações e agendamentos do motor enterprise de relatórios, removendo a dependência exclusiva de memória em runtime.

## Entregas

- Adicionado `ReportRepository` ao módulo `@cvg-his-v2/module-reports`.
- Adicionado `DatabaseReportRepository` com suporte a:
  - `report_executions`;
  - `report_exports`;
  - `report_schedules`.
- `ReportsService` agora aceita repositório opcional, expõe `persistenceMode` e hidrata dados por conta via `hydrateFromDatabase(accountId)`.
- Execução, exportação e criação de agendamento passaram a persistir no repositório configurado.
- Criada migração `packages/db/migrations/0048_report_engine.sql` com:
  - tabelas de execução, exportação e agendamento;
  - índices por conta, relatório, execução e data;
  - validações de formato/frequência/status;
  - RLS por `app.current_account_id()`.
- Bootstrap da API detecta as tabelas e injeta `DatabaseReportRepository` quando a migração está disponível.
- Runtime da API hidrata relatórios no bootstrap multi-tenant.

## Validação

- `pnpm --filter @cvg-his-v2/module-reports build`
- `pnpm --filter @cvg-his-v2/module-reports test`
- `pnpm --filter @cvg-his-v2/module-packages build`
- `pnpm --filter @cvg-his-v2/module-commissions build`
- `pnpm --filter @cvg-his-v2/module-reports build`
- `pnpm --filter @cvg-his-v2/api build`
- `node apps/api/dist/routes/reports-routes.test.js`

## Resultado

F2-03 agora tem motor de relatórios com domínio, API, OpenAPI, SPA operacional e persistência PostgreSQL com isolamento por conta. O próximo salto de valor é ampliar o catálogo com relatórios premium por domínio e plugar permissões finas na interface.
