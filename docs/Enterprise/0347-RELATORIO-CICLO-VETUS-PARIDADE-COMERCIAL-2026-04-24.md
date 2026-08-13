# 0347 - RELATORIO DO CICLO VETUS: PARIDADE COMERCIAL, ROTAS E BANCO - 2026-04-24

**Taxonomia:** `CANONICO`
**Papel no sistema documental:** registro executivo da primeira fatia implementada a partir dos documentos Vetus em `docs/vetus/guides` e `docs/vetus/inspection`
**Ler em conjunto com:** `README.md`, `0100-EXECUTION-TRACKER.md`, `200-BACKLOG-MASTER.md`, `301-RISK-REGISTER.md`, `0346-RELATORIO-AUDITORIA-FINAL-96-2026-04-22.md`

**Data UTC:** `2026-04-24`

---

## 1. Escopo analisado

Foram usados como base os documentos de auditoria e inspeção Vetus mantidos em:

- `docs/vetus/guides`
- `docs/vetus/inspection`

A leitura identificou uma frente ampla de paridade funcional para módulos comerciais, cadastros, agenda, comandas, estoque, financeiro, orçamentos, pacotes, serviços, vendas, laboratório, RH, usuários, governança, relatórios e integrações.

Esta rodada não fecha todo esse universo. Ela materializa uma fatia verificável de paridade comercial e registra explicitamente os limites restantes.

---

## 2. Entregas implementadas nesta rodada

### 2.1 Fidelidade e resgate de pontos

- rota real `/loyalty` registrada no router da SPA;
- tela `Resgate de Pontos` com breadcrumbs, filtros, histórico, saldos e composição de benefício por produto/serviço;
- remoção de `loyalty` da lista de placeholders;
- testes de página e de roteamento.

Arquivos principais:

- `apps/spa/src/pages/loyalty/LoyaltyPage.vue`
- `apps/spa/src/pages/loyalty/LoyaltyPage.test.ts`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/router/routes.test.ts`

### 2.2 Tabelas de preço

- rota real `/tabelas-de-preco`;
- tela operacional de `Tabelas de Preço` com busca, cards de tabelas e integração conceitual com produtos, serviços e consulta de preços;
- entrada de navegação em Estoque.

Arquivos principais:

- `apps/spa/src/pages/inventory/PriceTablesPage.vue`
- `apps/spa/src/pages/inventory/__tests__/PriceTablesAndPosPage.test.ts`
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`

### 2.3 Pontos de venda e sincronização

- rota real `/pontos-de-venda`;
- tela operacional de `Pontos de venda`;
- ações de sincronização de estoque e clientes com feedback de execução em background;
- entrada de navegação em Estoque.

Arquivos principais:

- `apps/spa/src/pages/inventory/PointOfSaleSyncPage.vue`
- `apps/spa/src/pages/inventory/__tests__/PriceTablesAndPosPage.test.ts`
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`

### 2.4 Migration comercial

Foi criada a migration:

- `packages/db/migrations/0021_commercial_loyalty_price_pdv.sql`

Ela adiciona estruturas tenant-scoped para:

- `loyalty_programs`
- `loyalty_points`
- `loyalty_redemptions`
- `price_tables`
- `price_table_items`
- `pos_sync_jobs`

Também foram adicionados enums, índices, constraints de consistência e comentários operacionais para fidelidade, resgates, tabelas de preço e jobs de sincronização PDV.

---

## 3. Evidências executadas

| Evidência | Resultado |
|---|---|
| `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/inventory/__tests__/PriceTablesAndPosPage.test.ts src/pages/loyalty/LoyaltyPage.test.ts src/router/routes.test.ts src/navigation.test.ts` | `PASS` |
| `pnpm --filter @cvg-his-v2/spa run typecheck` | `PASS` |
| `pnpm --filter @cvg-his/db run build` | `PASS` |
| `pnpm --filter @cvg-his/db run test` | `PASS` |
| `DATABASE_URL="<test-database-url>" pnpm --filter @cvg-his/db run db:migrate` | `PASS`, incluindo `0021_commercial_loyalty_price_pdv` |
| `pnpm validate:openapi` | `PASS` (`175 paths`, `33 tags`, `178 schemas`) |
| `node infra/scripts/check-cutover-readiness.mjs` | `PASS` |
| `pnpm --filter @cvg-his-v2/secrets run test` | `PASS` apos execucao fora do sandbox, pois a suite abre servidor local |
| `pnpm typecheck` | `PASS` |
| `pnpm test` | `PASS`, incluindo `apps/spa` com `619` testes e `apps/api` com `139` testes |
| `pnpm validate:helm` | `NAO EXECUTADO`, binario `helm` ausente no ambiente |

---

## 4. Leitura executiva

Esta rodada aumenta a aderência do CVG-HIS-V2 aos fluxos Vetus em três pontos comerciais visíveis:

- fidelidade e resgate de pontos deixam de ser placeholder de navegação;
- tabelas de preço deixam de ser lacuna de cadastro comercial;
- pontos de venda passam a ter superfície operacional inicial para sincronização.

O banco já possui base relacional para essas capacidades, com isolamento por `account_id` e referências para `owners`, `users` e `accounts`.

---

## 5. Limites e GAPs remanescentes

Esta rodada não deve ser interpretada como fechamento integral do ERP Vetus.

GAPs ainda abertos:

- as novas telas comerciais ainda usam dados locais e precisam de serviços/API persistidos;
- a OpenAPI não ganhou novos endpoints para fidelidade, tabelas de preço ou jobs PDV nesta rodada;
- a migration foi aplicada no banco de teste, não em produção;
- `pnpm validate:helm` não pôde ser confirmado por ausência do binário `helm`;
- ainda existem rotas placeholder relevantes no router, incluindo áreas de fiscal, financeiro, estoque avançado, marketing, administração, relatórios e dashboards;
- a massa documental Vetus contém módulos adicionais que exigem ondas próprias de implementação e validação.

---

## 6. Decisão de score

O score oficial `96/100` publicado em `0346` permanece como baseline anterior do programa.

Esta rodada não promove score porque:

1. ela amplia paridade funcional, mas ainda não fecha APIs persistidas para a nova superfície comercial;
2. ainda há placeholders vivos;
3. houve um bloqueio ambiental em `validate:helm`;
4. a própria documentação Vetus registra uma frente maior do que a fatia implementada.

Leitura correta: avanço concreto e verificado de paridade Vetus, sem declarar o ERP inteiro como concluído.

---

## 7. Próxima prioridade recomendada

1. Criar módulo/API persistido para fidelidade, pontos, resgates, tabelas de preço e jobs PDV.
2. Publicar contratos OpenAPI e testes de rota para essas capacidades.
3. Substituir dados locais das telas por integração real com API.
4. Instalar `helm` no ambiente de validação ou mover `validate:helm` para runner com binário disponível.
5. Quebrar a frente Vetus restante em ondas pequenas e verificáveis, começando por placeholders ainda expostos na navegação.
