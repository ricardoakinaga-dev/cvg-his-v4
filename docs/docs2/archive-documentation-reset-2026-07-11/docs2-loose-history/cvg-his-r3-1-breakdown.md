# CVG-HIS — Sprint R3.1 detalhado

Data: 2026-03-17
Sprint: **R3.1 — Catálogo comercial mínimo**

## Objetivo

Criar a base comercial mínima para que encounters possam receber itens faturáveis nas etapas seguintes do R3.

---

# Escopo do sprint

- módulo `services`
- módulo `products`
- schemas/tabelas mínimas
- CRUD básico
- pesquisa/listagem
- segregação por tenant
- auditoria mínima de mudanças críticas

---

# Quebra em tarefas

## Backend

### Serviços
- criar schema/tabela `services`
- definir campos mínimos:
  - `id`
  - `accountId`
  - `name`
  - `code` (opcional no início)
  - `description` (opcional)
  - `basePrice`
  - `active`
  - `createdAt`
  - `updatedAt`
- criar repo de serviços
- criar service layer
- criar rotas:
  - `POST /services`
  - `GET /services`
  - `GET /services/:id`
  - `PATCH /services/:id`
- validar isolamento multi-tenant
- registrar auditoria de create/update

### Produtos
- criar schema/tabela `products`
- definir campos mínimos:
  - `id`
  - `accountId`
  - `name`
  - `code` (opcional)
  - `description` (opcional)
  - `basePrice`
  - `active`
  - `createdAt`
  - `updatedAt`
- criar repo de produtos
- criar service layer
- criar rotas:
  - `POST /products`
  - `GET /products`
  - `GET /products/:id`
  - `PATCH /products/:id`
- validar isolamento multi-tenant
- registrar auditoria de create/update

### Regras mínimas
- impedir duplicidade absurda por `name` ou `code` por tenant quando aplicável
- suportar filtro por `active`
- suportar busca textual simples

---

## Frontend

### Serviços
- criar página de listagem de serviços
- criar formulário/modal de criação
- criar edição simples
- filtro por nome/status

### Produtos
- criar página de listagem de produtos
- criar formulário/modal de criação
- criar edição simples
- filtro por nome/status

### UX mínima
- feedback de sucesso/erro
- loading states
- empty state

---

## Schema / banco

### Novas tabelas esperadas
- `services`
- `products`

### Requisitos de modelagem
- colunas com `account_id`
- timestamps
- índice por `account_id`
- índice por `name` ou busca simples
- consistência com padrão das tabelas existentes

---

## Testes sugeridos

### Backend
- criar serviço com account correto
- listar apenas itens do tenant atual
- editar serviço/produto existente
- impedir acesso cross-tenant
- filtrar apenas ativos

### Frontend
- criar item com sucesso
- exibir erro de validação
- listar itens criados
- editar item existente

---

## Critério de pronto

O sprint pode ser considerado concluído quando:

- serviços e produtos existirem como entidades reais no banco
- backend expuser CRUD mínimo funcional
- frontend permitir cadastro, edição e listagem
- tudo estiver segregado por tenant
- itens puderem ser pesquisados e marcados como ativos/inativos

---

## Fora de escopo

- estoque
- lote/validade
- NCM/fiscal
- pacotes
- promoções
- preço por tabela complexa
- integração com billing já no mesmo sprint

---

## Risco principal

Tentar transformar esse sprint em módulo completo de estoque/comercial. O foco aqui é apenas criar o catálogo mínimo necessário para o billing do atendimento.
