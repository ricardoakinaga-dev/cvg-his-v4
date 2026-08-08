# 502 — Módulo Billing

## Objetivo

Gerenciar registros de cobrança vinculados a encounters, incluindo estimativas, itens de cobrança e transições de status.

## Superfície funcional real

- `ensureRecord(encounterId)` — cria ou retorna billing record existente para um encounter. Status inicial: `draft`, moeda: `BRL`.
- `list(encounterId?)` — lista todos os records, com filtro opcional por encounter.
- `getByEncounterOrThrow(encounterId)` — alias para `ensureRecord`.
- `getOrThrow(recordId)` — busca record por ID, lança `ConflictError` se não existir.
- `createEstimate(payload)` — cria/atualiza record para status `estimated`.
- `addItem(actorUserId, payload)` — adiciona item a um billing record. Tipos de item válidos: `service`, `supply`, `procedure`, `exam`, `daily_rate`, `other`. Recalcula `subtotalAmount` automaticamente.
- `listItems(encounterId)` — lista itens de um billing record.
- `updateStatus(encounterId, payload)` — atualiza status do record (ex: `settled`).
- Exporta `DatabaseBillingRepository` mas não o utiliza internamente.

## Principais dependências

- `@cvg-his-v2/module-encounters` — `EncountersService` (validação de existência do encounter, herança de `accountId`, `patientId`, `ownerId`)
- `@cvg-his-v2/shared-errors` — `ConflictError`
- `@cvg-his-v2/shared-validation` — `requireEnum`, `requireNonEmptyString`, `requirePositiveNumber`
- `@cvg-his-v2/shared-utils` — `createCorrelationId`, `nowIso`

## Regras de negócio relevantes

- Billing record é criado automaticamente (lazy) ao acessar qualquer operação de billing para um encounter.
- Records com status `settled` rejeitam novos itens (`ConflictError`).
- `totalAmount` de cada item = `quantity * unitPriceAmount` (arredondado para 2 casas decimais).
- `subtotalAmount` do record é recalculado a cada adição de item ou mudança de status.
- Moeda hardcoded como `BRL`.
- Não há método para remover itens de um billing record.
- Não há método para cancelar ou reverter um billing record.

## Riscos atuais

- **Sem remocao de itens**: Uma vez adicionado, um item nao pode ser removido ou editado.
- **Sem validacao de duplicidade**: O mesmo item pode ser adicionado multiplos vezes sem checagem.
- **AccountId herdado do encounter**: Se o encounter nao existir, a operacao falha, mas naoo ha fallback.
- **Status nao validado**: `updateStatus` aceita qualquer status do payload sem validacao de transicao valida.
- **Concurrency**: Maps in-memory nao sao thread-safe; operacoes simultaneas podem corromper dados.

## Situacao de persistencia

- **Padrao**: Repositorio DB injetado via `options.repository` no construtor.
- **Runtime**: `apps/api/src/runtime.ts` injeta `DatabaseBillingRepository` quando DATABASE_URL esta disponivel.
- **Hydrate**: Metodo `hydrateFromDatabase()` carrega registros existentes do DB ao iniciar.
- **Fallback**: Maps in-memory atuam como cache local; writes persistem via repositorio.
- **Bootstrap**: `apps/api/src/bootstrap.ts` instancia `DatabaseBillingRepository` quando banco esta saudavel.

## Situação de testes

- Arquivo: `packages/modules/billing/src/billing.test.ts`
- 4 testes cobrindo: criação de estimativa, adição de itens com recálculo de subtotal, bloqueio de itens em record settled, filtragem por encounter.
- Testes usam mock inline do `EncountersService`.
- Nenhum teste cobre o repositório de banco de dados.
- Nenhum teste cobre `listItems`, `getOrThrow`, ou `updateStatus` isoladamente.

## Gaps para nivel enterprise

1. Adicionar metodo de remocao/edicao de itens.
2. Validar transicoes de status (ex: `draft` → `estimated` → `settled`).
3. Adicionar suporte a multiplas moedas.
4. Adicionar descontos, impostos e taxas.
5. Adicionar metodo para gerar fatura/invoice.
6. Adicionar integracao com gateway de pagamento.
7. Adicionar auditoria de alteracoes no billing record.
8. Adicionar paginacao em `list` e `listItems`.
9. Adicionar testes para `updateStatus`, `listItems`, `getOrThrow`.
