# Progresso Fase 2 - F2-03 Motor Real de Relatorios

Data: 2026-05-28

## Escopo entregue

- Criado o modulo `@cvg-his-v2/module-reports`.
- Implementado dominio real para:
  - catalogo de relatorios;
  - definicoes com categoria, permissao exigida, formatos suportados, filtros e colunas;
  - execucao de relatorio com filtros normalizados;
  - armazenamento de execucoes em memoria;
  - exportacao em `csv` e `json`;
  - agendamento com frequencia diaria, semanal ou mensal;
  - listagem de execucoes e agendamentos.
- Integrada a API com rotas auditadas:
  - `GET /reports/catalog`
  - `GET /reports/executions`
  - `POST /reports/executions`
  - `GET /reports/executions/{executionId}`
  - `POST /reports/executions/{executionId}/export`
  - `GET /reports/schedules`
  - `POST /reports/schedules`
- O runtime da API passou a instanciar `ReportsService`.
- O contrato OpenAPI principal passou a documentar a tag `Reports`, paths e schemas do novo motor.

## Fontes reais conectadas neste incremento

- `administrative-executive`: usa billing, counter-sales, quotes e cash para montar linhas executivas.
- `commission-calculations`: usa o motor real de comissoes para montar relatorio de fechamentos, status, base, comissao e quantidade de linhas.

## Validacoes executadas

- `pnpm --filter @cvg-his-v2/module-reports build`
- `pnpm --filter @cvg-his-v2/module-reports test`
- `pnpm validate:openapi`
- `pnpm --filter @cvg-his-v2/module-packages build`
- `pnpm --filter @cvg-his-v2/module-commissions build`
- `pnpm --filter @cvg-his-v2/module-reports build`
- `pnpm --filter @cvg-his-v2/api build`
- `node --test dist/routes/reports-routes.test.js` em `apps/api`

Resultado: todos os comandos passaram.

## Evidencia OpenAPI

- Contrato validado com 265 paths, 38 tags e 282 schemas.

## Observacoes tecnicas

- Este incremento entrega o nucleo real e o contrato HTTP de F2-03.
- A persistencia PostgreSQL/RLS de execucoes, exportacoes e agendamentos ainda deve ser adicionada em incremento posterior.
- O catalogo inicial cobre relatorio executivo administrativo e fechamentos de comissao; os proximos relatorios podem reutilizar o mesmo motor.

## Proximo passo recomendado

Conectar a SPA de relatorios ao novo motor (`/reports/catalog`, execucoes, exportacoes e agendamentos) e depois adicionar persistencia PostgreSQL/RLS para execucoes e schedules.
