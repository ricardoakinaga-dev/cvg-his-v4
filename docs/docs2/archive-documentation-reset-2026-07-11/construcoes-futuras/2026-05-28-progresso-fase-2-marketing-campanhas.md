# Progresso Fase 2 - Marketing: Campanhas, Segmentos e Templates

Data: 2026-05-28

## Objetivo

Transformar Marketing de telas seguras/estaticas em um modulo operacional premium com dominio real para planejamento de campanhas, segmentacao de publico, templates de comunicacao e agendamento auditavel.

## Entregas Realizadas

- Criado o pacote `@cvg-his-v2/module-marketing`.
- O dominio de marketing agora possui segmentos com criterios por grupo de tutor, especie, consentimento e tags.
- O dominio passou a gerenciar templates por canal: SMS, WhatsApp e e-mail.
- O dominio passou a criar campanhas vinculadas a segmento e template.
- Campanhas calculam audiencia estimada a partir de uma base de publico informada e dos criterios do segmento.
- Campanhas em rascunho podem ser agendadas, registrando usuario responsavel e status `scheduled`.
- A API ganhou endpoints dedicados:
  - `GET/POST /marketing/segments`
  - `GET/POST /marketing/templates`
  - `GET/POST /marketing/campaigns`
  - `POST /marketing/campaigns/{campaignId}/schedule`
- A API registra auditoria para criacao de segmentos, templates, campanhas e agendamento.
- O runtime da API passou a carregar `MarketingService`.
- O OpenAPI foi atualizado com tag, paths e schemas de Marketing.
- A SPA ganhou a pagina `/marketing/campaigns`, com aliases `/marketing/campanhas` e `/campanhas-de-marketing`.
- A pagina permite listar campanhas, segmentos e templates, criar segmento rapido, criar template, criar campanha e agendar campanha.
- O menu de Marketing passou a apontar "Campanhas de Marketing" para a nova superficie operacional, substituindo o uso indireto da tela generica de notificacoes.

## Resultado no Roadmap

Este incremento inicia F2-06 com base real de dominio, API e SPA. O CVG HIS deixa de tratar marketing apenas como SMS simples/configuracoes e passa a ter uma esteira de campanha premium com segmentacao, template e agendamento multicanal.

## Validacoes Executadas

- `pnpm --filter @cvg-his-v2/module-marketing build`
- `pnpm --filter @cvg-his-v2/module-marketing test`
- `pnpm --filter @cvg-his-v2/api exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @cvg-his-v2/api build`
- `node apps/api/dist/routes/marketing-routes.test.js`
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/marketing/__tests__/MarketingCampaignsPage.test.ts src/router/routes.test.ts src/navigation.test.ts --pool=forks`
- `pnpm validate:openapi`
- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa build`
- Conferencia do lockfile para manter `vue-component-type-helpers@3.2.7`.

## Proximos Incrementos Recomendados

- Persistir segmentos, templates e campanhas em PostgreSQL com migrations dedicadas.
- Integrar campanhas agendadas aos provedores reais de SMS, WhatsApp e e-mail.
- Criar processamento de disparos com fila, tentativas, falhas e relatorio de entregabilidade.
- Conectar segmentos aos cadastros reais de tutores, pacientes, consentimentos LGPD e grupos de clientes.
