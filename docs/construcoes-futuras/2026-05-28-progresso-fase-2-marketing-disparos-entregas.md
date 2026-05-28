# Progresso Fase 2 - Marketing: Disparos e Entregas de Campanhas

Data: 2026-05-28

## Objetivo

Evoluir Marketing de planejamento de campanha para uma esteira operacional rastreavel, com processamento de campanha agendada, entregas por destinatario, status de envio, tentativas, provedor e falhas.

## Entregas Realizadas

- O dominio de Marketing ganhou `MarketingCampaignDeliverySummary`.
- Campanhas agendadas podem ser processadas por `dispatchCampaign`.
- O processamento filtra a audiencia pelos criterios do segmento e pelo canal da campanha.
- Templates passam a ser renderizados com variaveis como `{{ownerName}}`, `{{patientName}}`, `{{ownerId}}` e `{{patientId}}`.
- Cada destinatario elegivel gera uma entrega com canal, contato, assunto, corpo, status, provedor, id externo, tentativas e erro.
- A campanha muda de `scheduled` para `running` durante o processamento e finaliza como `sent`.
- O resumo do processamento retorna total, enviados, falhados e ignorados.
- O reposititorio PostgreSQL passou a persistir entregas em `marketing_campaign_deliveries`.
- A migration principal de Marketing passou a incluir indices e RLS para entregas.
- A API ganhou endpoints:
  - `POST /marketing/campaigns/{campaignId}/dispatch`
  - `GET /marketing/campaigns/{campaignId}/deliveries`
- A API usa o gateway SMS existente quando o canal e SMS e fallback local para WhatsApp/e-mail ate a integracao real.
- O OpenAPI foi atualizado com schemas de entrega, dispatch e listagem de entregas.
- O service da SPA ganhou contratos para disparo e consulta de entregas.
- Os testes de dominio e rota cobrem envio bem-sucedido, falha simulada, ignorados e consulta de entregas.

## Resultado no Roadmap

Este incremento aprofunda F2-06 ao criar a ponte entre campanhas planejadas e execucao auditavel. O modulo agora sustenta relatorio de entregabilidade, retry futuro e integracao real com provedores de SMS, WhatsApp e e-mail.

## Validacoes Executadas

- `pnpm --filter @cvg-his-v2/module-marketing build`
- `pnpm --filter @cvg-his-v2/module-marketing test`
- `pnpm validate:openapi`
- `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit`
- `pnpm --filter @cvg-his-v2/api build`
- `node apps/api/dist/routes/marketing-routes.test.js`
- `pnpm --filter @cvg-his-v2/api typecheck`
- Conferencia do lockfile para manter `vue-component-type-helpers@3.2.7`.

## Proximos Incrementos Recomendados

- Criar tela de entregas por campanha na SPA com filtros por status e canal.
- Integrar WhatsApp e e-mail aos provedores reais.
- Adicionar retry/cancelamento por entrega.
- Conectar a audiencia aos cadastros reais de tutores, pacientes, grupos e consentimentos LGPD.
