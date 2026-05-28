# Progresso Fase 2 - Marketing: Persistencia PostgreSQL

Data: 2026-05-28

## Objetivo

Tornar o modulo premium de Marketing resiliente a reinicios e preparado para operacao enterprise, persistindo segmentos, templates e campanhas em PostgreSQL com isolamento por conta.

## Entregas Realizadas

- Criada migration `0051_marketing_campaigns.sql` em `packages/db/migrations`.
- Criada migration compartilhada `021_marketing_campaigns.sql` em `packages/shared/database/src/migrations`.
- Criadas tabelas:
  - `marketing_segments`
  - `marketing_templates`
  - `marketing_campaigns`
  - `marketing_campaign_deliveries`
- A migration principal inclui indices por conta, canal, status e agenda.
- A migration principal inclui RLS por `account_id` usando `app.current_account_id()`.
- O pacote `@cvg-his-v2/module-marketing` passou a expor `DatabaseMarketingRepository`.
- O reposititorio PostgreSQL persiste e reidrata segmentos, templates e campanhas.
- O bootstrap da API agora ativa `DatabaseMarketingRepository` quando as tres tabelas estao disponiveis.
- O runtime preserva fallback in-memory quando a migration ainda nao foi aplicada.
- O teste de dominio passou a cobrir persistencia/hidratacao pelo contrato `MarketingRepository`.

## Resultado no Roadmap

Este incremento aprofunda F2-06 ao mover Marketing de uma superficie operacional em memoria para um dominio com persistencia PostgreSQL, pronto para campanhas reais, auditoria e continuidade operacional.

## Validacoes Executadas

- `pnpm install --lockfile-only`
- `pnpm install --offline --frozen-lockfile`
- `pnpm --filter @cvg-his-v2/module-marketing build`
- `pnpm --filter @cvg-his-v2/module-marketing test`
- `pnpm --filter @cvg-his-v2/api exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @cvg-his-v2/api build`
- `node apps/api/dist/routes/marketing-routes.test.js`
- `pnpm validate:openapi`
- `pnpm --filter @cvg-his-v2/api typecheck`
- Conferencia do lockfile para manter `vue-component-type-helpers@3.2.7`.

## Observacoes

- Nao foi executado teste de persistencia contra PostgreSQL real nesta etapa porque depende de banco local preparado. A validacao realizada cobre compilacao, contrato de repositorio, bootstrap condicional, OpenAPI e rotas da API.

## Proximos Incrementos Recomendados

- Integrar campanhas agendadas aos provedores reais de SMS, WhatsApp e e-mail.
- Criar fila de disparos com tentativas, falhas, cancelamento e reprocessamento.
- Conectar segmentos aos cadastros reais de tutores, pacientes, LGPD e grupos de clientes.
