# 0314 - RELATORIO DE EXECUCAO - PIX CONSOLIDACAO NO SCHEMA CANONICO - 2026-04-13

**Data UTC:** `2026-04-13`  
**Item:** continuidade de `IMP-101` / `ERP-110`  
**Status:** concluido no escopo de schema/migration canonicos

---

## 1. Objetivo

Fechar o proximo passo imediato deixado pelo runtime PIX:

- consolidar `pix_transactions` no trilho canônico de banco em `packages/db`

Isso reduz o gap entre:

- persistencia operacional entregue na API
- governanca oficial de schema e cutover do programa

---

## 2. Entrega realizada

Foi criada a migration canônica:

- `packages/db/migrations/0013_pix_transactions.sql`

E foi adicionado o schema Drizzle correspondente:

- `packages/db/src/schema/pix_transactions.ts`
- export em `packages/db/src/schema/index.ts`

O schema canônico cobre:

- `transaction_id`
- `provider`
- `account_id`
- `billing_record_id`
- `provider_transaction_id`
- `provider_confirmation_id`
- `provider_webhook_event_id`
- `status`
- `billing_settlement_status`
- timestamps operacionais e de settlement
- QR payload/base64

Tambem foram adicionados:

- indice unico por `(provider, provider_transaction_id)`
- indice por `(account_id, status)`
- indice por `billing_record_id`
- RLS com policy `pix_transactions_tenant_isolation`

---

## 3. Decisao tecnica

Nesta rodada eu nao movi a API para depender diretamente do schema canônico.

Motivo:

- o runtime ja estava funcionando e validado
- o gap imediato era de governanca de banco
- acoplar agora o repositorio runtime ao trilho canonico ampliaria escopo desnecessariamente

Resultado:

- runtime PIX permanece operacional
- trilho canônico passa a conhecer oficialmente `pix_transactions`

---

## 4. Arquivos alterados

- `packages/db/migrations/0013_pix_transactions.sql`
- `packages/db/src/schema/pix_transactions.ts`
- `packages/db/src/schema/index.ts`

---

## 5. Validacoes executadas

Executado com sucesso:

- `pnpm --filter @cvg-his/db build`
- `pnpm --filter @cvg-his/db test`

Resultados:

- `build`: `PASS`
- `test`: `6/6 PASS`

Nao executei nesta rodada:

- aplicacao real da migration em banco de teste
- `tests/integration/deploy-migrations-contract.test.ts`

Motivo:

- esse contrato depende de banco com `drizzle_migrations` atualizado e migracao efetivamente aplicada

---

## 6. Riscos remanescentes

1. Ainda existe dualidade historica entre o trilho de runtime em `packages/shared/database` e o trilho canônico em `packages/db`.
2. A migration canônica foi criada, mas ainda precisa ser aplicada nos ambientes para entrar no inventario efetivo de `drizzle_migrations`.
3. O dominio financeiro continua com settlement focado em `billing`, sem reconciliacao mais profunda em caixa/recebiveis.

---

## 7. Proximos passos recomendados

1. Aplicar `packages/db/migrations/0013_pix_transactions.sql` no banco de teste/staging e validar `deploy-migrations-contract`.
2. Decidir se `pix_transactions` deve migrar de vez para um repositorio 100% alinhado ao trilho canônico, removendo a dualidade futura.
3. Avancar para reconciliacao financeira explicita em recebiveis/caixa apos settlement do PIX.

---

## 8. Resumo executivo

O proximo passo de governanca foi fechado.

Antes:

- `pix_transactions` existia apenas no trilho operacional/runtime

Agora:

- `pix_transactions` tambem existe no trilho canônico de banco
- a tabela tem schema oficial, indices e RLS
- `packages/db` compila e testa limpo
