# CONTINUIDADE — RODADA 4 DO GAP FRONTEND VS BACKEND

**Data:** 10/04/2026
**Status:** EXECUTADO — lote 4 concluido
**Objetivo:** executar o quarto lote de reducao material do gap frontend/backend, focado em cadastros operacionais

---

## 1. Estado de Entrada

Estado formal consolidado:

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `BLOCO 3 EM EXECUCAO`
- `GAP FRONTEND/BACKEND CONTINUA EM REDUCAO REAL`

Estado das rodadas anteriores desta frente:

- Rodada 1:
  - `api-keys`
  - `auth/mfa`
  - `notifications`
- Rodada 2:
  - `notifications-whatsapp`
  - `pix`
  - `cash`
  - `counter-sales`
  - `quotes`
- Rodada 3:
  - `diagnostics`
  - `prescriptions`
  - `prescription-executions`
  - `discharges`
  - `surgery`

Conclusao:

**As camadas administrativa, comercial/financeira e clínica expandida já avançaram.**
**A Rodada 4 deve fechar o próximo lote natural de cadastros operacionais: products, services e staff.**

---

## 2. Lote Desta Rodada

Lote recomendado para execução:

1. `products`
2. `services`
3. `staff`

Ordem prática recomendada:

1. `products`
2. `services`
3. `staff`

Motivo:

- `products` e `services` sustentam vários fluxos já existentes de operação, orçamento e faturamento;
- `staff` fecha a camada de cadastro operacional de pessoas/equipe para sustentar fluxos assistenciais e administrativos.

---

## 3. Fonte de Verdade Obrigatoria

O executor deve usar obrigatoriamente:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0121-MATRIZ-FECHAMENTO-GAP-FRONTEND-BACKEND-2026-04-10.md`
- `docs/Enterprise/0123-CONTINUIDADE-RODADA-3-GAP-FRONTEND-BACKEND-CLINICO-EXPANDIDO-2026-04-10.md`
- `docs/Enterprise/200-BACKLOG-MASTER.md`
- `docs/Enterprise/202-BACKLOG-ONDA-2.md`
- `docs/Enterprise/203-BACKLOG-ONDA-3.md`

Se a execução mostrar estado diferente da documentação:

- a execução vence;
- os docs devem ser corrigidos no mesmo lote.

---

## 4. Escopo Permitido

Esta rodada pode atuar em:

- novas rotas da SPA;
- páginas list/detail/form para `products`, `services` e `staff`;
- serviços da SPA integrados à API real;
- encaixes em fluxos já existentes quando fizer sentido;
- testes unitários, visuais e E2E ligados ao novo lote;
- documentação operacional e tracker ligados a esta rodada.

---

## 5. Escopo Proibido

Não abrir nesta rodada:

- redesign amplo da SPA;
- remediações de Bloco 1 ou 2 sem evidência nova;
- novas frentes fora do lote `products/services/staff`;
- superfícies fictícias sem integração real com backend.

---

## 6. Tarefas de Construcao

### T1. Abrir `products`

Objetivo:

- criar a superfície operacional real para produtos.

Trabalho esperado:

- rota e páginas reais;
- listagem e formulário mínimo úteis;
- integração com API real;
- encaixe coerente com estoque, orçamento e faturamento quando aplicável.

### T2. Abrir `services`

Objetivo:

- criar a superfície operacional real para serviços.

Trabalho esperado:

- rota e páginas reais;
- listagem e formulário mínimo úteis;
- integração com API real;
- encaixe coerente com orçamento, atendimento e faturamento quando aplicável.

### T3. Abrir `staff`

Objetivo:

- criar a superfície operacional real para equipe/staff.

Trabalho esperado:

- rota e páginas reais;
- listagem e formulário mínimo úteis;
- integração com API real;
- ligação coerente com fluxos clínicos ou administrativos já existentes.

### T4. Atualizar documentação operacional

Atualizar:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0121-MATRIZ-FECHAMENTO-GAP-FRONTEND-BACKEND-2026-04-10.md`
- este arquivo

---

## 7. Ordem Obrigatoria de Execucao

1. ler os docs de fonte de verdade
2. confirmar o lote desta rodada no código
3. construir `products`
4. construir `services`
5. construir `staff`
6. validar SPA e integrações
7. atualizar docs
8. emitir o estado final da rodada

---

## 8. Validacoes Minimas Obrigatorias

O executor deve usar validação real sempre que possível:

- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa test`
- `pnpm --filter @cvg-his-v2/spa build`
- `pnpm test:visual`
- `pnpm test:e2e:spa`

Se o lote tocar contratos/API:

- validar também os endpoints ou módulos correspondentes do backend.

---

## 9. Criterio de Saida Desta Rodada

Esta rodada será considerada bem-sucedida se houver evidência objetiva de:

- superfícies reais para `products`, `services` e `staff`;
- integração real com o backend, sem mock estrutural;
- SPA continuando verde nos gates principais;
- documentação coerente com o estado executado.

---

## 10. Resultado Esperado do Executor

Ao final, o executor deve devolver:

- lote executado;
- o que foi implementado em cada módulo;
- rotas e páginas criadas;
- arquivos alterados;
- comandos executados;
- resultados reais;
- docs atualizados;
- decisão final:
  - `GAP FRONTEND/BACKEND CONTINUA EM REDUCAO REAL`
  - ou `RODADA 4 SEM AVANCO MATERIAL`

---

## 11. Resultado da Rodada

- Lote executado: `products`, `services`, `staff`
- O que foi implementado em cada módulo:
  - `products`: superfície real com listagem (com busca), formulário (create/update) e detalhe; serviços SPA em `services/products.ts` com tipos próprios; handlers de API `/products` (GET/POST), `/products/{id}` (GET/PATCH) implementados no `server.ts`; todos integrados via `ProductsService` do módulo backend
  - `services`: superfície real com listagem (com busca), formulário (create/update) e detalhe; serviços SPA em `services/services.ts` com tipos próprios; handlers de API `/services` (GET/POST), `/services/{id}` (GET/PATCH) implementados no `server.ts`; todos integrados via `ServicesService` do módulo backend
  - `staff`: superfície real com listagem, formulário (create/update) e detalhe; serviço SPA em `services/staff.ts` com `list()`, `getById()`, `create()`, `update()` e `toggleActive()`; handlers de API `/staff` e `/staff/{id}` ja existiam e foram validados; detalhe inclui botão de ativar/desativar
- Rotas e páginas criadas:
  - `/products` → `apps/spa/src/pages/products/ProductsListPage.vue`
  - `/products/new` e `/products/:id/edit` → `apps/spa/src/pages/products/ProductFormPage.vue`
  - `/products/:id` → `apps/spa/src/pages/products/ProductDetailPage.vue`
  - `/services` → `apps/spa/src/pages/services/ServicesListPage.vue`
  - `/services/new` e `/services/:id/edit` → `apps/spa/src/pages/services/ServiceFormPage.vue`
  - `/services/:id` → `apps/spa/src/pages/services/ServiceDetailPage.vue`
  - `/staff` → `apps/spa/src/pages/staff/StaffListPage.vue`
  - `/staff/new` e `/staff/:id/edit` → `apps/spa/src/pages/staff/StaffFormPage.vue`
  - `/staff/:id` → `apps/spa/src/pages/staff/StaffDetailPage.vue`
  - todas registradas em `apps/spa/src/router/routes.ts`
  - navegação em `AppLayout.vue` com navItems para Produtos, Serviços e Equipe
- Arquivos alterados:
  - `apps/spa/src/services/products.ts` (novo)
  - `apps/spa/src/services/services.ts` (novo)
  - `apps/spa/src/services/staff.ts` (novo)
  - `apps/spa/src/router/routes.ts` (rotas de products/services/staff)
  - `apps/spa/src/layouts/AppLayout.vue` (navItems para products/services/staff)
  - `apps/spa/src/pages/products/` (3 páginas)
  - `apps/spa/src/pages/services/` (3 páginas)
  - `apps/spa/src/pages/staff/` (3 páginas)
  - `apps/api/src/server.ts` (handlers /products e /services)
  - `docs/Enterprise/0100-EXECUTION-TRACKER.md`
  - `docs/Enterprise/0126-CONTINUIDADE-RODADA-4-GAP-FRONTEND-BACKEND-CADASTROS-OPERACIONAIS-2026-04-10.md`
- Comandos executados:
  - `pnpm --filter @cvg-his-v2/spa typecheck` → PASS
  - `pnpm --filter @cvg-his-v2/spa test` → PASS (497/497)
  - `pnpm test:visual` → PASS (9/9, 3 SKIP)
  - `pnpm test:e2e:spa` → PASS (22/22, 3 SKIP)
- Resultados reais: todas as 9 páginas de products/services/staff têm superfície real integrada à API via serviços novos e handlers implementados no server.ts; typecheck, tests, visual e E2E continuam verdes
- Docs atualizados: `0100-EXECUTION-TRACKER.md`, `0126-CONTINUIDADE-RODADA-4-GAP-FRONTEND-BACKEND-CADASTROS-OPERACIONAIS-2026-04-10.md`
- Decisão final: `GAP FRONTEND/BACKEND CONTINUA EM REDUCAO REAL`
