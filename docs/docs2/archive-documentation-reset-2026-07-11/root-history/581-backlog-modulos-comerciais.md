# 581 - Backlog Executavel dos Modulos Comerciais

**Status:** vivo
**Data de validacao:** 2026-04-01
**Base:** `580-plano-modulos-comerciais-enterprise.md`

## 1. Ordem de implementacao recomendada

1. fundacao e modelagem comercial
2. modulo de produtos
3. modulo de servicos
4. modulo de comanda de balcao
5. modulo de orcamentos
6. dashboard administrativo comercial
7. hardening enterprise

## 2. Backlog por frente

### MC001 - Consolidar arquitetura comercial

- `Prioridade`: `P0`
- `Entrega`:
  - contratos de dominio comercial
  - decisao sobre tabelas novas
  - integracao com billing, inventory, payments e cash
- `Arquivos-alvo`:
  - `docs/580-plano-modulos-comerciais-enterprise.md`
  - novos ADRs ou docs complementares se necessario
- `Status`: ✅ **CONCLUIDO** (Fase C1)

### MC002 - Elevar products a modulo canonico

- `Prioridade`: `P0`
- `Entrega`:
  - `packages/modules/products`
  - CRUD em API
  - pagina administrativa web
- `Reuso obrigatorio`:
  - `packages/contracts/src/products.ts`
  - `packages/db/src/schema/products.ts`
- `Status`: ✅ **CONCLUIDO** (Fase C2)

### MC003 - Elevar services a modulo canonico

- `Prioridade`: `P0`
- `Entrega`:
  - `packages/modules/services`
  - CRUD em API
  - pagina administrativa web
- `Reuso obrigatorio`:
  - `packages/contracts/src/services.ts`
  - `packages/db/src/schema/services.ts`
- `Status`: ✅ **CONCLUIDO** (Fase C2)

### MC004 - Modelar counter-sales

- `Prioridade`: `P0`
- `Entrega`:
  - schema (counter_sales, counter_sale_items, counter_sale_payments)
  - modulo (packages/modules/counter-sales)
  - contratos (packages/contracts/src/counterSales.ts)
  - runtime e API (12 endpoints)
  - 18 testes unitarios
- `Status`: ✅ **CONCLUIDO** (Fase C3)

### MC005 - Implementar tela de comanda

- `Prioridade`: `P0`
- `Entrega`:
  - apps/web/src/pages/counter-sales.ts
  - abertura, itens, pagamentos, fechamento
- `Status`: ✅ **CONCLUIDO** (Fase C3)

### MC006 - Integrar counter-sales com payments e cash

- `Prioridade`: `P0`
- `Entrega`:
  - pagamento multiplo com metodos canonicos
  - parcelamento
  - consistencia total == pagamentos
- `Status`: ✅ **CONCLUIDO** (Fase C3)

### MC007 - Integrar counter-sales com inventory

- `Prioridade`: `P0`
- `Entrega`:
  - baixa de estoque para produtos via inventory.consume()
  - nenhum reflexo para servicos
- `Status`: ✅ **CONCLUIDO** (Fase C3)

### MC008 - Modelar quotes

- `Prioridade`: `P1`
- `Entrega`:
  - schema (quotes, quote_items)
  - modulo (packages/modules/quotes)
  - contratos (packages/contracts/src/quotes.ts)
  - 17 testes unitarios
- `Status`: ✅ **CONCLUIDO** (Fase C4)

### MC009 - Implementar tela de orcamentos

- `Prioridade`: `P1`
- `Entrega`:
  - apps/web/src/pages/quotes.ts
  - criar, editar, imprimir/PDF, converter em comanda
- `Status`: ✅ **CONCLUIDO** (Fase C4)

### MC010 - Dashboard comercial

- `Prioridade`: `P1`
- `Entrega`:
  - KPIs comerciais no dashboard com filtros por periodo
  - vendas por forma de pagamento (grafico barras CSS)
  - top produtos e servicos
  - bloco de conversao de orcamentos
  - alertas comerciais
  - acessos rapidos
- `Status`: ✅ **CONCLUIDO** (Fase C5)

### MC011 - RBAC, auditoria e observabilidade

- `Prioridade`: `P1`
- `Entrega`:
  - 4 novas permissoes (counter_sale.read/write, quote.read/write)
  - roles atualizadas (admin, reception, inventory, finance, auditor)
  - eventos auditaveis: open, add/remove item, close, cancel, reopen, approve, reject, convert
- `Status`: ✅ **CONCLUIDO** (Fase C3/C4/C5)

### MC012 - Testes e validacao enterprise

- `Prioridade`: `P1`
- `Entrega`:
  - 87 testes unitarios passando (16 products + 16 services + 23 counter-sales + 17 quotes + 15 cash)
  - typecheck e build verdes
  - 5 testes de integracao estoque/caixa
- `Status`: ✅ **CONCLUIDO** (Fase C1-Ciclo Final)

### MC013 - Caixa real com persistencia DB

- `Prioridade`: `P0`
- `Entrega`:
  - modulo `@cvg-his-v2/module-cash` com service + repository
  - UI `/cash-register` com abertura, movimentacao, fechamento
  - 6 endpoints API de caixa
  - Integracao real com counter-sales no close
- `Status`: ✅ **CONCLUIDO** (Ciclo Comercial Final)

### MC014 - PDF server-side para quotes

- `Prioridade`: `P1`
- `Entrega`:
  - endpoint `/quotes/:id/pdf` com HTML profissional inline
  - Content-Disposition para download/visualizacao
- `Status`: ✅ **CONCLUIDO** (Ciclo Comercial Final)

## 3. Criterios de aceite por modulo

## Produtos

- ✅ CRUD completo
- ✅ ativo/inativo
- ✅ uso em comanda e orcamento

## Servicos

- ✅ CRUD completo
- ✅ ativo/inativo
- ✅ uso em comanda e orcamento

## Venda de balcao

- ✅ abrir comanda
- ✅ adicionar itens
- ✅ pagar (multiplos metodos)
- ✅ fechar
- ✅ registrar tudo

## Orcamentos

- ✅ criar
- ✅ salvar
- ✅ imprimir/PDF
- ✅ converter em comanda

## 4. Criterio de pronto enterprise

O pacote comercial sera considerado pronto quando:

- ✅ os 4 modulos estiverem ativos
- ✅ pagamentos e caixa estiverem integrados
- ✅ estoque refletir venda de produto
- ✅ dashboard comercial estiver operacional
- ✅ RBAC e auditoria cobrirem os fluxos criticos
- ✅ testes cobrirem o fluxo principal comercial ponta a ponta
