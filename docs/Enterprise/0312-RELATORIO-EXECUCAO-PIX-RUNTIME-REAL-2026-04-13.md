# 0312 - RELATORIO DE EXECUCAO - PIX RUNTIME REAL - 2026-04-13

**Data UTC:** `2026-04-13`  
**Item do backlog:** `IMP-101` / `ERP-110`  
**Status:** implementado no escopo de runtime da API

---

## 1. Arquitetura adotada

Foi removida a dependencia fixa da API em `LocalPixPaymentGateway` como unico caminho.

Arquitetura entregue:

- `apps/api/src/payment-gateway.ts` agora expõe um factory `createPaymentGateway()`
- o runtime suporta `PIX_PROVIDER=local|mock|pagarme`
- quando `PIX_PROVIDER` e omitido, a API resolve:
  - `pagarme` se `PAGARME_API_KEY` e `PAGARME_PIX_KEY` estiverem configurados
  - `local` se as credenciais nao estiverem presentes
- o provider Pagar.me usa `PagarMePixAdapter`
- o provider `mock` usa `MockPixAdapter`
- o provider `local` continua disponivel como modo controlado de fallback/desenvolvimento

A camada de gateway ganhou:

- `providerName`
- `getPixIntentStatus()`
- `confirmPayment()` assíncrono
- mapeamento interno de `transactionId` interno para `providerTransactionId`

Isso fecha o principal gap anterior: o adapter real existia, mas a API nao tinha composicao de provider nem runtime configuravel.

---

## 2. Estrategia de provider e fallback

Estrategia adotada:

- `pagarme` passa a ser o provider real quando as credenciais existem
- `local` e `mock` continuam disponiveis, mas como modos explicitamente controlados
- nao foi implementado fallback silencioso em tempo de request de `pagarme -> local`

Motivo:

- fallback silencioso em pagamento mascara degradacao operacional
- para um fluxo financeiro, e melhor falhar de forma explicita do que liquidar pagamentos em modo fake sem governanca

Fallback efetivo que existe agora:

- ausencia de credenciais Pagar.me com `PIX_PROVIDER` omitido resolve para `local`
- `PIX_PROVIDER=mock` pode ser usado em testes e ambientes controlados
- `PIX_PROVIDER=pagarme` sem credenciais falha na validacao de config

---

## 3. Arquivos alterados

Arquivos alterados nesta execucao:

- `packages/modules/pix/src/index.ts`
- `packages/shared/config/src/index.ts`
- `packages/shared/config/src/config.test.ts`
- `apps/api/package.json`
- `apps/api/src/index.ts`
- `apps/api/src/payment-gateway.ts`
- `apps/api/src/routes/payments-routes.ts`
- `apps/api/src/server.ts`
- `apps/api/src/payment-gateway.test.ts`
- `apps/api/src/server.test.ts`

Observacao:

- havia alteracoes preexistentes e nao relacionadas em outros arquivos da workspace; elas nao foram revertidas nem reescritas nesta execucao

---

## 4. Validacoes executadas

Executado com sucesso:

- `pnpm --filter @cvg-his-v2/module-pix build`
- `pnpm --filter @cvg-his-v2/module-pix test`
- `pnpm --filter @cvg-his-v2/shared-config build`
- `pnpm --filter @cvg-his-v2/shared-config test`
- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/api build`
- `pnpm --filter @cvg-his-v2/api test`

Resultados:

- `module-pix`: `8/8 PASS`
- `shared-config`: `45/45 PASS`
- `api typecheck`: `PASS`
- `api build`: `PASS`
- `api test`: `50/50 PASS`

Cobertura de comportamento validada na API:

- catalogo de integracoes passa a refletir o provider ativo
- criacao de intent PIX com provider `mock`
- consulta de status via `GET /payments/pix/intents/:intentId`
- confirmacao via `POST /payments/pix/intents/:intentId/confirm`
- gateway Pagar.me validado com stub de `fetch`

---

## 5. Riscos remanescentes

1. O mapeamento `transactionId -> providerTransactionId` ainda esta em memoria no gateway da API. Sem persistencia propria, reinicios perdem essa correlacao.
2. O adapter Pagar.me continua dependendo do contrato atual da API externa e ainda nao ha teste de contrato contra sandbox real.
3. Nao foi adicionado webhook autenticado especifico de Pagar.me nesta rodada; a confirmacao foi reforcada pelo endpoint de confirmacao e pela camada de provider.
4. O fluxo financeiro continua sem persistencia dedicada de transacoes PIX no dominio de billing/payments.

---

## 6. Proximos passos

1. Persistir transacoes PIX e o `providerTransactionId` em repositorio proprio, em vez de manter o mapeamento apenas em memoria.
2. Adicionar webhook autenticado de confirmacao Pagar.me com validacao de assinatura.
3. Integrar status/confirmacao PIX com settlement mais explicito no billing.
4. Atualizar o OpenAPI para incluir `GET /payments/pix/intents/{intentId}` e o contrato de confirmacao.
5. Adicionar smoke/integration tests contra sandbox real do provider quando houver credenciais seguras para CI/staging.

---

## 7. Melhorias recomendadas

- Introduzir feature flag para rollout progressivo de `pagarme` por ambiente ou tenant.
- Adicionar metricas para `pix_provider_active`, `pix_intent_create_total`, `pix_confirm_total` e erros por provider.
- Registrar alertas quando a API estiver em `local` em ambiente onde o esperado seja `pagarme`.
- Extrair a composicao do gateway de pagamentos de `server.ts` para bootstrap dedicado, reduzindo concentracao de runtime.

---

## 8. Resumo executivo

`IMP-101` / `ERP-110` avancou de forma material.

Antes:

- a API estava presa a `LocalPixPaymentGateway`
- o adapter Pagar.me existia, mas nao entrava no runtime real

Agora:

- a API suporta provider configuravel
- o runtime ativa `pagarme` quando as credenciais existem
- `local` e `mock` ficaram como modos controlados
- status e confirmacao foram reforcados
- o escopo alterado passou em `build`, `typecheck` e `test`
