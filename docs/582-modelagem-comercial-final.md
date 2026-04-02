# 582 — Modelagem Comercial Final

**Data:** 2026-03-31
**Status:** Final
**Base:** 580-plano-modulos-comerciais-enterprise.md

---

## 1. Decisao de Arquitetura Comercial

### Principio central

Se algo ja existe no sistema, nao deve ser recriado como um segundo sistema paralelo.

### Catalogo unico

O CVG-HIS V2 adota **catalogos canonicos unicos** por conta para produtos e servicos vendaveis:

| Catalogo | Tabela DB  | Modulo                      | Contrato                             |
| -------- | ---------- | --------------------------- | ------------------------------------ |
| Produtos | `products` | `packages/modules/products` | `packages/contracts/src/products.ts` |
| Servicos | `services` | `packages/modules/services` | `packages/contracts/src/services.ts` |

### Relacao com outros modulos

```
products ──► inventory (baixa de estoque quando vendavel)
products ──► counter-sales (Fase C3)
products ──► quotes (Fase C4)
services ──► counter-sales (Fase C3)
services ──► quotes (Fase C4)
products ──► billing (snapshot de preco/nome no momento da venda)
services ──► billing (snapshot de preco/nome no momento da venda)
```

### Regras de integracao

1. **Snapshot nos documentos comerciais:** Venda e orcamento nao dependem de leitura futura do catalogo para recompor valor historico. O nome, codigo e preco sao copiados no momento da criacao do item.

2. **Estoque integrado:** Venda de produto deve refletir estoque. Venda de servico nao baixa estoque.

3. **Financeiro compartilhado, contexto separado:** `encounterFinancial` continua no contexto clinico. `counterSales` (Fase C3) ganha contexto comercial proprio, mas usa a mesma linguagem de pagamento.

4. **Nao forcar encounter:** Produtos e servicos existem independentemente de atendimento clinico. A venda de balcao nao exige encounter.

---

## 2. Produtos

### Estrutura

| Campo         | Tipo     | Descricao                  |
| ------------- | -------- | -------------------------- |
| `id`          | UUID     | Identificador unico        |
| `accountId`   | UUID     | Conta proprietaria         |
| `name`        | string   | Nome do produto            |
| `code`        | string?  | Codigo/SKU unico por conta |
| `description` | string?  | Descricao curta            |
| `basePrice`   | number   | Preco base                 |
| `active`      | boolean  | Status ativo/inativo       |
| `createdAt`   | datetime | Criado em                  |
| `updatedAt`   | datetime | Atualizado em              |

### Capacidades (Fase C2)

- Criar produto
- Listar produtos (com filtro por nome/codigo/ativo)
- Obter produto por ID
- Atualizar produto
- Ativar/inativar

### Capacidades futuras (Fase C3/C4)

- Relacao com item de inventory (quando aplicavel)
- Uso em comanda de balcao
- Uso em orcamento
- Historico de preco

---

## 3. Servicos

### Estrutura

| Campo         | Tipo     | Descricao              |
| ------------- | -------- | ---------------------- |
| `id`          | UUID     | Identificador unico    |
| `accountId`   | UUID     | Conta proprietaria     |
| `name`        | string   | Nome do servico        |
| `code`        | string?  | Codigo unico por conta |
| `description` | string?  | Descricao curta        |
| `basePrice`   | number   | Preco base             |
| `active`      | boolean  | Status ativo/inativo   |
| `createdAt`   | datetime | Criado em              |
| `updatedAt`   | datetime | Atualizado em          |

### Capacidades (Fase C2)

- Criar servico
- Listar servicos (com filtro por nome/codigo/ativo)
- Obter servico por ID
- Atualizar servico
- Ativar/inativar

### Capacidades futuras (Fase C3/C4)

- Uso em comanda de balcao
- Uso em orcamento
- Snapshot de preco/nome no momento da venda

---

## 4. API Entregue (Fase C2)

| Metodo  | Path            | Descricao                               |
| ------- | --------------- | --------------------------------------- |
| `GET`   | `/products`     | Listar produtos (query: search, active) |
| `POST`  | `/products`     | Criar produto                           |
| `GET`   | `/products/:id` | Obter produto por ID                    |
| `PATCH` | `/products/:id` | Atualizar produto                       |
| `GET`   | `/services`     | Listar servicos (query: search, active) |
| `POST`  | `/services`     | Criar servico                           |
| `GET`   | `/services/:id` | Obter servico por ID                    |
| `PATCH` | `/services/:id` | Atualizar servico                       |

### Permissoes RBAC

| Permissao       | Modulo   | Descricao                  |
| --------------- | -------- | -------------------------- |
| `product.read`  | products | Leitura de produtos        |
| `product.write` | products | Criacao/edicao de produtos |
| `service.read`  | services | Leitura de servicos        |
| `service.write` | services | Criacao/edicao de servicos |

---

## 5. Telas Web Entregues (Fase C2)

| Rota        | Pagina   | Capacidades                            |
| ----------- | -------- | -------------------------------------- |
| `/products` | Produtos | Listar, criar, buscar, ativar/inativar |
| `/services` | Servicos | Listar, criar, buscar, ativar/inativar |

---

## 6. Proximos Passos

### Fase C3 — Comanda de Balcao

- Entidades: `counter_sales`, `counter_sale_items`, `counter_sale_payments`
- Integracao com products, services, inventory, payments, cash
- Baixa de estoque automatica para produtos

### Fase C4 — Orcamentos

- Entidades: `quotes`, `quote_items`
- Conversao de orcamento em comanda
- PDF/print

### Fase C5 — Dashboard Comercial

- KPIs: faturamento, ticket medio, vendas por forma de pagamento
- Filtros por periodo
