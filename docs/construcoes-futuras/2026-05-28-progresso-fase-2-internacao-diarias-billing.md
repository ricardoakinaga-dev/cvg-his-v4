# Progresso Fase 2 - Internacao: Diarias Integradas ao Billing

Data: 2026-05-28

## Objetivo

Fechar a ponte operacional-financeira da internacao, fazendo com que diarias lancadas na ficha hospitalar sejam faturadas como itens reais do modulo de billing.

## Entregas Realizadas

- A rota `POST /inpatient/{stayId}/daily-charges/{chargeId}/bill` agora integra com `BillingService`.
- Ao marcar uma diaria como faturada, a API cria um item de billing com:
  - `itemType: daily_rate`;
  - descricao da diaria;
  - quantidade da diaria;
  - valor unitario da diaria;
  - `sourceEntityType: inpatient_daily_charge`;
  - `sourceEntityId` apontando para a diaria de internacao.
- A diaria passa a gravar o `billingRecordId` retornado pelo billing.
- O contrato compartilhado de origem de item de billing passou a aceitar `inpatient_daily_charge`.
- O servidor principal passa a injetar `billing` nas rotas de internacao.
- O teste de rotas de internacao valida que faturar uma diaria cria o item financeiro e marca a diaria como `billed`.

## Resultado no Roadmap

Este incremento aprofunda F2-05 porque transforma as diarias de internacao em cobrancas reais, rastreaveis e vinculadas ao atendimento. A ficha hospitalar deixa de ser apenas clinica/operacional e passa a alimentar o fluxo financeiro do HIS.

## Validacoes Executadas

- `pnpm --filter @cvg-his-v2/shared-types build`
- `pnpm --filter @cvg-his-v2/shared-contracts build`
- `pnpm --filter @cvg-his-v2/api build && node apps/api/dist/routes/inpatient-routes.test.js`
- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm validate:openapi`
- Conferencia do lockfile para manter `vue-component-type-helpers@3.2.7`.

## Proximos Incrementos Recomendados

- Exibir o `billingRecordId` e link para a cobranca na ficha de internacao.
- Bloquear duplicidade visual de faturamento quando a diaria ja estiver `billed`.
- Criar fila gerencial de diarias pendentes por setor/unidade.
- Conectar relatorios de internacao ao faturamento por periodo e paciente.
