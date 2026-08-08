# CVG-HIS — Checklist técnico da Issue #1

Issue: **#1 — R3.1: implementar catálogo comercial mínimo (services + products)**

## Objetivo

Criar a base comercial mínima para suportar billing no atendimento, com entidades de serviços e produtos, CRUD básico, pesquisa e segregação por tenant.

---

# 1. Schema / banco

## 1.1 Tabela `services`
- [ ] criar arquivo de schema `services.ts`
- [ ] definir colunas mínimas:
  - [ ] `id`
  - [ ] `accountId`
  - [ ] `name`
  - [ ] `code` (nullable ou opcional)
  - [ ] `description` (nullable)
  - [ ] `basePrice`
  - [ ] `active`
  - [ ] `createdAt`
  - [ ] `updatedAt`
- [ ] adicionar índices por `accountId`
- [ ] adicionar índice por `name`
- [ ] considerar unicidade por `accountId + code` se `code` existir

## 1.2 Tabela `products`
- [ ] criar arquivo de schema `products.ts`
- [ ] definir colunas mínimas:
  - [ ] `id`
  - [ ] `accountId`
  - [ ] `name`
  - [ ] `code` (nullable ou opcional)
  - [ ] `description` (nullable)
  - [ ] `basePrice`
  - [ ] `active`
  - [ ] `createdAt`
  - [ ] `updatedAt`
- [ ] adicionar índices por `accountId`
- [ ] adicionar índice por `name`
- [ ] considerar unicidade por `accountId + code` se `code` existir

## 1.3 Integração do schema
- [ ] exportar `services` em `packages/db/src/schema/index.ts`
- [ ] exportar `products` em `packages/db/src/schema/index.ts`
- [ ] gerar migration correspondente
- [ ] validar migration em ambiente local

---

# 2. Backend — módulo Services

## 2.1 Estrutura
- [ ] criar `apps/his-api/src/modules/services/repo.ts`
- [ ] criar `apps/his-api/src/modules/services/service.ts`
- [ ] criar `apps/his-api/src/modules/services/routes.ts`
- [ ] criar `apps/his-api/src/modules/services/types.ts` se necessário

## 2.2 Repositório
- [ ] implementar `create`
- [ ] implementar `getById`
- [ ] implementar `list`
- [ ] implementar `update`
- [ ] filtrar sempre por `accountId`

## 2.3 Service layer
- [ ] validar actor autenticado
- [ ] validar tenant scoping
- [ ] validar campos obrigatórios
- [ ] impedir inconsistência de nome/código quando aplicável
- [ ] suportar ativação/inativação

## 2.4 Rotas
- [ ] `POST /services`
- [ ] `GET /services`
- [ ] `GET /services/:id`
- [ ] `PATCH /services/:id`
- [ ] proteger rotas com permissão adequada

---

# 3. Backend — módulo Products

## 3.1 Estrutura
- [ ] criar `apps/his-api/src/modules/products/repo.ts`
- [ ] criar `apps/his-api/src/modules/products/service.ts`
- [ ] criar `apps/his-api/src/modules/products/routes.ts`
- [ ] criar `apps/his-api/src/modules/products/types.ts` se necessário

## 3.2 Repositório
- [ ] implementar `create`
- [ ] implementar `getById`
- [ ] implementar `list`
- [ ] implementar `update`
- [ ] filtrar sempre por `accountId`

## 3.3 Service layer
- [ ] validar actor autenticado
- [ ] validar tenant scoping
- [ ] validar campos obrigatórios
- [ ] impedir inconsistência de nome/código quando aplicável
- [ ] suportar ativação/inativação

## 3.4 Rotas
- [ ] `POST /products`
- [ ] `GET /products`
- [ ] `GET /products/:id`
- [ ] `PATCH /products/:id`
- [ ] proteger rotas com permissão adequada

---

# 4. Backend — integração e padrões transversais

- [ ] registrar módulos novos no bootstrap do `his-api`
- [ ] revisar permissão mínima necessária para leitura/escrita
- [ ] registrar auditoria para create/update/inactivate
- [ ] padronizar respostas e erros seguindo módulos maduros
- [ ] validar isolamento cross-tenant

---

# 5. Frontend — Services

## 5.1 Páginas e navegação
- [ ] criar página de listagem de serviços
- [ ] criar fluxo de criação de serviço
- [ ] criar fluxo de edição de serviço

## 5.2 UI mínima
- [ ] tabela/lista de serviços
- [ ] filtro por nome
- [ ] filtro por ativo/inativo
- [ ] feedback de loading
- [ ] feedback de erro
- [ ] empty state

---

# 6. Frontend — Products

## 6.1 Páginas e navegação
- [ ] criar página de listagem de produtos
- [ ] criar fluxo de criação de produto
- [ ] criar fluxo de edição de produto

## 6.2 UI mínima
- [ ] tabela/lista de produtos
- [ ] filtro por nome
- [ ] filtro por ativo/inativo
- [ ] feedback de loading
- [ ] feedback de erro
- [ ] empty state

---

# 7. Frontend — integração com padrões atuais

- [ ] reaproveitar padrões de CRUD de `owners` / `patients`
- [ ] seguir convenções de autenticação/sessão do frontend atual
- [ ] manter consistência visual com layout atual
- [ ] garantir proteção de rota conforme permissão

---

# 8. Testes

## 8.1 Backend
- [ ] teste de criação de serviço
- [ ] teste de listagem de serviços por tenant
- [ ] teste de update de serviço
- [ ] teste de criação de produto
- [ ] teste de listagem de produtos por tenant
- [ ] teste de update de produto
- [ ] teste de isolamento cross-tenant

## 8.2 Frontend
- [ ] teste de renderização da listagem de serviços
- [ ] teste de criação de serviço
- [ ] teste de renderização da listagem de produtos
- [ ] teste de criação de produto

---

# 9. Critério de pronto

A issue #1 pode ser considerada concluída quando:

- [ ] `services` e `products` existem como entidades reais no banco
- [ ] backend expõe CRUD mínimo funcional para ambos
- [ ] frontend permite listar, criar e editar ambos
- [ ] itens ficam segregados por tenant
- [ ] filtros básicos funcionam
- [ ] auditoria mínima está registrada
- [ ] testes principais passam

---

# 10. Fora de escopo

- [ ] estoque
- [ ] lote/validade
- [ ] NCM/fiscal
- [ ] preço promocional avançado
- [ ] pacotes comerciais
- [ ] integração direta com billing no mesmo ticket
