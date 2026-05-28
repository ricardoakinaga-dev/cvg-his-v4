# Progresso Fase 2 - Relatórios SPA Operacional

Data: 2026-05-28

## Objetivo

Conectar o motor real de relatórios enterprise à SPA, mantendo o `ReportWorkbenchPage` legado para relatórios Vetus-like já mapeados.

## Entregas

- Criado `reportsService` em `apps/spa/src/services/reports.ts` para o contrato real:
  - catálogo: `GET /reports/catalog`;
  - execuções: `GET/POST /reports/executions`;
  - exportação: `POST /reports/executions/:id/export`;
  - agendamentos: `GET/POST /reports/schedules`.
- Criada a página `apps/spa/src/pages/reports/ReportsEnginePage.vue` com:
  - KPIs de catálogo, execuções, agendamentos e linhas retornadas;
  - seleção de relatório e filtros por schema;
  - execução sob demanda;
  - exportação CSV/JSON;
  - criação de agendamento recorrente;
  - tabela dinâmica de resultado com colunas vindas do backend.
- Registrada a rota `/reports/engine` como `ReportsEngine`.
- Adicionada entrada no menu `Relatórios > Hubs CVG > Motor Enterprise`.
- Adicionada chamada principal no hub `Relatórios por Domínio`.
- Adicionados testes de rota e testes da página operacional com mock do serviço real.

## Validação

- `pnpm exec vitest run src/pages/reports/__tests__/ReportsEnginePage.test.ts src/pages/reports/__tests__/ReportsDomainPages.test.ts src/router/routes.test.ts --pool=forks`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa build`

## Resultado

O módulo de relatórios da F2-03 agora possui backend/API/OpenAPI e uma superfície SPA operacional. A entrega deixa de ser apenas catálogo técnico e passa a ter fluxo utilizável para execução, exportação e agendamento, alinhado ao objetivo Premium Enterprise.

## Próximos Passos

1. Adicionar persistência PostgreSQL para execuções, exportações e agendamentos de relatórios.
2. Expandir o catálogo com relatórios financeiros, clínicos, estoque e equipe usando fontes reais.
3. Implementar download real de arquivos exportados quando o backend expuser streaming/binário.
4. Aplicar controle granular de permissões por `requiredPermission` na interface.
