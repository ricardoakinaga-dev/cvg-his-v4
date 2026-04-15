# 0313 - RELATORIO DE EXECUCAO - PIX PERSISTENCIA, WEBHOOK, SETTLEMENT E OPENAPI - 2026-04-13

**Data UTC:** `2026-04-13`  
**Itens:** continuidade de `IMP-101` / `ERP-110`  
**Status:** implementado no escopo da API

---

## 1. Objetivo

Fechar os proximos passos deixados pelo runtime real de PIX:

1. persistir transacoes PIX e `providerTransactionId`
2. adicionar webhook autenticado do Pagar.me
3. integrar settlement PIX de forma explicita ao billing
4. atualizar o OpenAPI

---

## 2. Arquitetura entregue

Foi introduzido um repositorio proprio de transacoes PIX em `apps/api/src/pix-transaction-repository.ts`.

O repositorio agora guarda:

- `transactionId`
- `provider`
- `providerTransactionId`
- `providerConfirmationId`
- `providerWebhookEventId`
- `billingRecordId`
- `amount`, `description`, QR payload e expiracao
- `status` do pagamento
- `billingSettlementStatus`
- `billingSettledAt`
- `billingSettlementError`

O `payment-gateway` deixou de depender do `Map` interno como fonte primaria e passou a usar esse repositorio.

O runtime da API passa a compartilhar o mesmo repositorio entre:

- `createPaymentGateway()`
- rotas de pagamentos
- `PaymentsEventHandlers`

---

## 3. Webhook autenticado

Foi adicionado `POST /payments/pix/webhooks/pagarme`.

Comportamento implementado:

- validacao de assinatura `X-Hub-Signature`
- leitura do raw body antes do parse
- extracao tolerante de `providerTransactionId` e status do payload
- confirmacao do pagamento via provider runtime
- resposta `202` para eventos recebidos
- ignorar eventos nao conclusivos ou sem correlacao local conhecida

Configuracao nova:

- `PAGARME_WEBHOOK_SECRET`
- quando ausente, o runtime usa `PAGARME_API_KEY` como fallback de assinatura para manter compatibilidade operacional

Observacao:

- a validacao foi implementada com `HMAC-SHA1` sobre o raw body e header `X-Hub-Signature`, com base na documentacao disponivel do provider e no contrato historico conhecido

---

## 4. Settlement explicito no billing

O settlement deixou de ficar apenas implicito por evento.

Agora:

- `POST /payments/pix/intents/{intentId}/confirm`
- `POST /payments/pix/webhooks/pagarme`

fazem:

1. confirmacao do pagamento no gateway/provider
2. persistencia do status da transacao PIX
3. `billing.settleByRecordId()` quando existe `billingRecordId`
4. persistencia do resultado em `billingSettlementStatus`

Estados usados:

- `not_applicable`
- `awaiting_payment`
- `pending_billing`
- `applied`
- `failed`

O consumer `payments.consumer.ts` tambem foi endurecido para manter coerencia se o fluxo voltar a usar processamento assíncrono da outbox.

---

## 5. OpenAPI atualizado

`apps/api/src/openapi.yaml` foi atualizado para documentar:

- `GET /payments/pix/intents/{intentId}`
- `POST /payments/pix/intents/{intentId}/confirm`
- `POST /payments/pix/webhooks/pagarme`

Tambem foram adicionados schemas para:

- status do PIX
- confirmacao do PIX
- webhook Pagar.me
- `billingSettlementStatus`

---

## 6. Arquivos alterados

Principais arquivos desta rodada:

- `apps/api/src/pix-transaction-repository.ts`
- `apps/api/src/payment-gateway.ts`
- `apps/api/src/routes/payments-routes.ts`
- `apps/api/src/consumers/payments.consumer.ts`
- `apps/api/src/runtime.ts`
- `apps/api/src/runtime-repositories.ts`
- `apps/api/src/bootstrap.ts`
- `apps/api/src/server.ts`
- `apps/api/src/index.ts`
- `apps/api/src/helpers/common.ts`
- `apps/api/src/openapi.yaml`
- `packages/shared/config/src/index.ts`
- `packages/shared/config/src/config.test.ts`
- `packages/shared/database/src/migrations/020_create_pix_transactions.sql`
- `apps/api/src/payment-gateway.test.ts`
- `apps/api/src/server.test.ts`

---

## 7. Validacoes executadas

Executado com sucesso:

- `pnpm --filter @cvg-his-v2/shared-config test`
- `pnpm --filter @cvg-his-v2/shared-config build`
- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/api build`
- `pnpm --filter @cvg-his-v2/api test`

Resultado final:

- `shared-config`: `46/46 PASS`
- `api test`: `54/54 PASS`

Cobertura funcional validada:

- persistencia da correlacao `transactionId -> providerTransactionId`
- status PIX por endpoint
- confirmacao manual com settlement explicito
- webhook autenticado do Pagar.me
- billing mudando para `settled`
- OpenAPI refletindo os endpoints novos

---

## 8. Riscos remanescentes

1. A persistencia de PIX foi entregue no trilho de runtime atual (`packages/shared/database/src/migrations`) e ainda nao no trilho canonico unificado de `packages/db`; isso conversa com a duplicidade historica de migracoes do programa.
2. O parser de webhook do Pagar.me foi feito para os formatos conhecidos e mais provaveis; convem endurecer isso com payloads reais de sandbox/staging.
3. O fluxo continua sem reconciliacao financeira mais profunda com o dominio de recebiveis/caixa alem do `billing.settleByRecordId()`.
4. Ainda faltam metricas/alertas operacionais especificos de PIX.

---

## 9. Proximos passos recomendados

1. Levar `pix_transactions` tambem para o trilho canonico de migracoes em `packages/db` quando a consolidacao de schema for retomada.
2. Persistir reconciliacao/baixa financeira de PIX em entidades financeiras mais proximas de caixa/recebiveis.
3. Adicionar smoke test com sandbox real do provider.
4. Expor metricas e alertas para assinatura invalida, webhook ignorado, settlement falho e provider ativo.

---

## 10. Resumo executivo

Os quatro proximos passos de PIX foram fechados no escopo da API.

Antes:

- correlacao com provider ficava em memoria
- nao havia webhook autenticado
- o settlement com billing era implicito e fraco
- o OpenAPI estava incompleto

Agora:

- a transacao PIX e persistida em repositorio proprio
- o webhook Pagar.me e autenticado
- o billing e liquidado explicitamente
- o OpenAPI documenta status, confirmacao e webhook
