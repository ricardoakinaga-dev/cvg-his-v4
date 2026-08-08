# 896 - SPEC Billing Persistente

## 0. Status

Rascunho técnico para validação.

Este documento não autoriza implementação, migration, alteração de schema, alteração de backend, alteração de frontend ou mudança de regra financeira.

## 1. Objetivo

Definir a decisão técnica mínima para persistir `billing_records` e `billing_items` com isolamento por `account`, RLS e comportamento seguro.

O objetivo é remover a dependência atual de runtime/in-memory para o Billing do atendimento, sem criar registro persistente por leitura e sem alterar regra financeira nesta etapa.

## 2. Decisão de semântica

Decisão obrigatória:

- `GET /billing/:encounterId` é leitura.
- `GET /billing/:encounterId` não deve criar `billing_record` persistente.
- `GET /billing` não deve criar registros.
- `GET /billing/:encounterId/items` não deve criar registros.
- A persistência só pode ocorrer por ação explícita.

Ações explícitas candidatas:

- `POST /billing/estimate`
- `POST /billing/items`
- `PATCH /billing/:encounterId/status`
- comando futuro aprovado em SPEC própria

A UI pode mostrar estado vazio, rascunho visual ou cobrança derivada do atendimento sem persistir dado. Esse estado visual não deve ser confundido com `billing_record` gravado.

## 3. Tabelas candidatas

### 3.1 `billing_records`

Campos candidatos:

| Campo                  | Observação                            |
| ---------------------- | ------------------------------------- |
| `id`                   | Identificador do registro de cobrança |
| `account_id`           | Obrigatório para isolamento por conta |
| `encounter_id`         | Atendimento de origem                 |
| `patient_id`           | Paciente do atendimento               |
| `owner_id`             | Tutor responsável                     |
| `status`               | Estado do billing                     |
| `subtotal_amount`      | Soma dos itens persistidos            |
| `currency`             | Moeda, inicialmente `BRL`             |
| `administrative_notes` | Observações administrativas opcionais |
| `created_at`           | Criação                               |
| `updated_at`           | Última atualização                    |

### 3.2 `billing_items`

Campos candidatos:

| Campo                | Observação                            |
| -------------------- | ------------------------------------- |
| `id`                 | Identificador do item                 |
| `account_id`         | Obrigatório para isolamento por conta |
| `billing_record_id`  | Registro de cobrança pai              |
| `encounter_id`       | Atendimento de origem                 |
| `item_type`          | Tipo do item                          |
| `description`        | Descrição exibível                    |
| `quantity`           | Quantidade                            |
| `unit_price_amount`  | Valor unitário                        |
| `total_amount`       | Total calculado do item               |
| `source_entity_type` | Origem clínica/operacional opcional   |
| `source_entity_id`   | Identificador da origem opcional      |
| `created_by_user_id` | Usuário responsável pela inclusão     |
| `created_at`         | Criação                               |

## 4. Regras de persistência

- `createEstimate` cria `billing_record` se ainda não existir.
- `addItem` cria `billing_record` se ainda não existir e atualiza `subtotal_amount`.
- `updateStatus` não cria `billing_record` ausente nesta fase; deve retornar erro de não encontrado quando não houver registro persistido.
- `list` e `get` não criam `billing_record`.
- Registro com status `settled` não aceita novos itens.
- Todos os writes devem respeitar `accountId`.
- Todo item persistido deve carregar `account_id`.
- Toda atualização de subtotal deve ser consistente com os itens persistidos.

## 5. RLS e tenant

As tabelas `billing_records` e `billing_items` devem conter `account_id`.

Ambas precisam de:

- RLS habilitada;
- política `USING (account_id = app.current_account_id())`;
- política `WITH CHECK (account_id = app.current_account_id())`;
- índices por `account_id`;
- índice por `account_id` + `encounter_id`;
- vínculo por foreign key com `accounts`;
- vínculo com `encounters` quando aplicável.

Nenhuma correção deve relaxar isolamento por conta.

## 6. Diferença para `encounter_billing_items`

`encounter_billing_items` não será reaproveitada nesta fase.

Ela permanece como estrutura paralela/legada até decisão futura porque possui contrato diferente:

- é ligada diretamente ao `encounter`;
- não possui `billing_record_id`;
- usa campos como `name_snapshot`, `unit_price`, `line_total` e `discount_amount`;
- usa enum restrito a `service` e `product`;
- não representa o contrato atual do `BillingService`.

A fase de Billing persistente deve criar ou promover o contrato `billing_records` + `billing_items`, sem migrar automaticamente dados de `encounter_billing_items`.

## 7. Correções obrigatórias no repository

Antes de liberar BUILD, o repository deve ser corrigido para:

- inserir `account_id` em `billing_items`;
- mapear `accountId` de `row.account_id`, não de `row.encounter_id`;
- fazer `addItem` atualizar `billing_records.subtotal_amount`;
- garantir `hydrate` e `list` filtrados por `accountId`;
- impedir que GET chame `ensureRecord` com persistência automática;
- manter transações quando criar record + item na mesma ação;
- manter consistência entre memória runtime e banco após writes.

## 8. Endpoints impactados

Endpoints impactados:

- `GET /billing`
- `GET /billing/:encounterId`
- `GET /billing/:encounterId/items`
- `POST /billing/estimate`
- `POST /billing/items`
- `PATCH /billing/:encounterId/status`

Regra central:

- endpoints GET são leitura;
- endpoints POST/PATCH são ações explícitas;
- nenhuma leitura deve gravar dados persistentes.

## 9. Testes obrigatórios

Testes obrigatórios para EP-BILL-1:

- teste do `DatabaseBillingRepository` com banco real/test DB;
- teste de RLS/tenant isolation para `billing_records`;
- teste de RLS/tenant isolation para `billing_items`;
- teste de `BillingService.addItem()` persistindo item e atualizando subtotal;
- teste garantindo que `GET /billing/:encounterId` não cria registro automaticamente;
- teste de `POST /billing/estimate`;
- teste de `POST /billing/items`;
- teste de `PATCH /billing/:encounterId/status`;
- teste de restart/hydration garantindo que record e items persistem;
- teste de status `settled` bloqueando novos itens;
- `git diff --check`;
- suíte focada de API Billing.

## 10. Critérios para liberar EP-BILL-1

EP-BILL-1 só deve ser liberada quando:

- esta SPEC estiver aprovada;
- backup do banco real tiver sido feito;
- migration tiver sido testada em clone/test;
- RLS estiver definida;
- plano de rollback estiver documentado;
- decisão sobre `updateStatus` criar ou não record ausente estiver aprovada; para EP-BILL-1 a decisão é não criar registro ausente;
- decisão sobre relação futura com `encounter_billing_items` estiver registrada;
- testes obrigatórios estiverem definidos como critério de aceite;
- responsável técnico autorizar explicitamente a implementação.

## 11. Validação executada

Validação registrada em 2026-05-01:

- migration `0044_billing_records_items` aplicada com sucesso em banco efêmero de teste;
- `billing_records` e `billing_items` criadas e registradas em `drizzle_migrations`;
- RLS habilitada nas duas tabelas com políticas `billing_records_tenant_isolation` e `billing_items_tenant_isolation`;
- testes reais com role restrita `cvg_test_rls` confirmaram bloqueio de leitura e escrita cross-account;
- `DatabaseBillingRepository` validado contra Postgres real para criar `billing_record`, criar `billing_item`, reler por atendimento e manter `subtotal_amount`;
- suíte focada do módulo Billing validou que `updateStatus` não cria registro ausente e que `addItem` mantém subtotal.
- teste de restart/hydration validou que uma nova instância de runtime recupera `billing_record` e `billing_items` persistidos, mantendo subtotal e sem criar duplicata por leitura.
- teste HTTP com runtime/database validou `POST /billing/estimate`, `POST /billing/items`, `GET /billing/:encounterId`, `GET /billing/:encounterId/items` e `PATCH /billing/:encounterId/status` com autenticação, tenant context e persistência real.

Comandos executados:

- `REQUIRE_TEST_DB=1 pnpm exec vitest run tests/integration/rls/billing-persistence.test.ts --config vitest.integration.config.ts --reporter=verbose`
- `REQUIRE_TEST_DB=1 pnpm exec vitest run tests/integration/billing-hydration.test.ts --config vitest.integration.config.ts --reporter=verbose`
- `REQUIRE_TEST_DB=1 pnpm exec vitest run tests/integration/billing-api-db.test.ts --config vitest.integration.config.ts --reporter=verbose`
- `pnpm --filter @cvg-his-v2/module-billing test`

## 12. Relação com Handoff - HOFF-027

Registro em 2026-05-02:

- `HOFF-027` não altera a semântica desta SPEC.
- Handoff clínico não cria `billing_record` nem `billing_item`.
- `sent_to_finance` não chama `POST /billing/estimate`, `POST /billing/items` ou `PATCH /billing/:encounterId/status`.
- Billing continua sendo ação explícita por rota própria.
- Falta de origem financeira rastreável deve ser tratada como pendência operacional `billing_origin`, não como tentativa de criar cobrança.
- Risco de duplicidade entre Billing, Encounter Billing, CounterSales e recebíveis deve ser bloqueado ou justificado antes de qualquer ação financeira futura.
