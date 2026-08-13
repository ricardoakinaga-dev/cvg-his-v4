# 0351 - BACKLOG DE FECHAMENTO DO GAP RUMO A 96 - 2026-04-24

**Taxonomia:** `CANONICO`
**Papel no sistema documental:** backlog executável para elevar `Enterprise core`, `Paridade Vetus comercial` e `Aderencia docs vs codigo` a `96/100`
**Ler em conjunto com:** `0349-PLANO-EXECUTIVO-FECHAMENTO-GAP-96-2026-04-24.md`, `0350-ROADMAP-FECHAMENTO-GAP-96-2026-04-24.md`, `0348-RELATORIO-AUDITORIA-DOCS-VS-CODIGO-2026-04-24.md`

**Data UTC:** `2026-04-24`

---

## 1. Regras do backlog

- `P0` bloqueia subida de qualquer nota para `96`.
- `P1` bloqueia `Paridade Vetus comercial` em `96`.
- `P2` melhora maturidade, cobertura e resiliência, mas não deve atrasar P0/P1.
- item só fecha com evidência executada e registrada.

---

## 2. P0 - Bloqueadores diretos do score 96

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| GAP96-P0-001 | Implementar API persistida de fidelidade e resgate de pontos | Alto | Fechado | `@cvg-his-v2/module-commercial`, rotas `/loyalty/*`, OpenAPI e testes API/UI cobrindo saldo, extrato, pontuação e resgate |
| GAP96-P0-002 | Implementar API persistida de tabelas de preço | Alto | Fechado | rotas `/price-tables*`, repositório persistido, OpenAPI, tela API-backed e teste UI/API |
| GAP96-P0-003 | Implementar API e job persistido de sincronização PDV | Alto | Fechado | rotas `/pos-sync/jobs*`, criação/listagem/finalização/falha, tela API-backed e teste API/UI |
| GAP96-P0-004 | Conectar `LoyaltyPage`, `PriceTablesPage` e `PointOfSaleSyncPage` à API real | Alto | Fechado | telas sem dados locais no fluxo principal, com loading/erro/vazio/sucesso testados |
| GAP96-P0-005 | Cobrir migration `0021` com isolamento tenant/RLS ou política equivalente | Alto | Fechado | migration `0022_commercial_rls` e `tests/integration/rls/rls-commercial.test.ts` (`16/16 PASS`) |
| GAP96-P0-006 | Fazer `pnpm validate:helm` passar | Alto | Fechado | `pnpm validate:helm` PASS; usa Helm real quando disponível e validação estática conservadora quando ausente |
| GAP96-P0-007 | Atualizar OpenAPI e contrato frontend-backend para a frente comercial | Alto | Fechado | `pnpm validate:openapi` PASS (`184 paths`) e testes de rotas comerciais cobrindo endpoints novos |

---

## 3. P1 - Paridade Vetus comercial e placeholders prioritários

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| GAP96-P1-001 | Substituir placeholder `inventory/purchases` | Alto | Fechado | `InventoryOperationPage` em modo compras, API-backed por estoque/lotes e teste SPA/rotas em PASS |
| GAP96-P1-002 | Substituir placeholder `inventory/transfers` | Alto | Fechado | `InventoryOperationPage` em modo transferencias, API-backed por estoque/lotes e teste SPA/rotas em PASS |
| GAP96-P1-003 | Substituir placeholder `inventory/nf` | Alto | Fechado | `InventoryOperationPage` em modo NF, conferência fiscal de entrada baseada em lotes e teste SPA/rotas em PASS |
| GAP96-P1-004 | Substituir placeholder `inventory/audit` | Medio | Fechado | rota real usando `InventoryMovementsPage` API-backed, filtros por natureza e teste SPA/rotas em PASS |
| GAP96-P1-005 | Substituir placeholder `finance/accounts-payable` | Alto | Fechado | `FinanceOperationPage` em modo contas a pagar usando catálogo financeiro persistido, filtros e teste SPA/rotas |
| GAP96-P1-006 | Substituir placeholder `finance/cash-flow` | Alto | Fechado | `FinanceOperationPage` em modo fluxo de caixa combinando faturamento, despesas e orçamentos |
| GAP96-P1-007 | Substituir placeholder `finance/cheques` | Medio | Fechado | `FinanceOperationPage` em modo cheques com decisão formal de escopo e vínculo a faturamento/caixa |
| GAP96-P1-008 | Substituir placeholders fiscais `fiscal/ipi` e `fiscal/ibs-cbs` | Alto | Fechado | `FiscalTaxOperationPage` API-backed por `summary`, `tax-preview`, NCM e CFOP; IBS/CBS com decisão regulatória explícita |
| GAP96-P1-009 | Substituir placeholder `reports/nf` | Medio | Fechado | `InvoiceReportsPage` API-backed por CFOP, layouts NFS-e e lotes de estoque |
| GAP96-P1-010 | Fechar cadastros base de animais `breeds`, `species`, `coat-colors` | Medio | Fechado | `ReferenceCatalogPage` com catálogo estável, rotas reais e testes SPA/rotas em PASS |

### Status pos-execucao P0 - 2026-04-24

Os itens `GAP96-P0-001` a `GAP96-P0-007` foram fechados na primeira onda executavel. A promocao final para `96/100` ainda depende dos itens P1 e dos gates P2 definidos neste backlog.

Evidencias executadas:

- `pnpm --filter @cvg-his-v2/module-commercial run build` - PASS.
- `pnpm --filter @cvg-his-v2/module-commercial run test` - PASS.
- `pnpm --filter @cvg-his-v2/api run typecheck` - PASS.
- `pnpm --filter @cvg-his-v2/api run build` - PASS.
- `node --test apps/api/dist/routes/commercial-routes.test.js` - PASS.
- `pnpm --filter @cvg-his-v2/api run test` - PASS funcional com `26/27` no sandbox; `startup-secrets.test.js` PASS isolado fora do sandbox por restricao ambiental.
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/inventory/__tests__/PriceTablesAndPosPage.test.ts src/pages/loyalty/LoyaltyPage.test.ts` - PASS (`5/5`).
- `pnpm --filter @cvg-his-v2/spa run typecheck` - PASS.
- `DATABASE_URL_TEST="<test-database-url>" pnpm exec vitest run --config vitest.integration.config.ts tests/integration/rls/rls-commercial.test.ts --reporter=verbose` - PASS fora do sandbox (`16/16`).
- `pnpm validate:openapi` - PASS (`184 paths`).
- `pnpm validate:helm` - PASS com fallback estatico documentado quando `helm` nao esta instalado.

### Status pos-execucao P1 parcial - 2026-04-24

Os itens `GAP96-P1-001` a `GAP96-P1-010` foram fechados. Estoque avançado passou a usar paginas API-backed por estoque/lotes; financeiro operacional passou a usar dados persistidos de despesas, faturamento e orçamentos; fiscal passou a usar contratos fiscais reais; `reports/nf` ganhou relatorio fiscal operacional; `breeds`, `species` e `coat-colors` foram substituidos por pagina real de catalogo base.

Evidencias executadas:

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/catalogs/__tests__/ReferenceCatalogPage.test.ts src/router/routes.test.ts` - PASS (`10/10`).
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/inventory/__tests__/InventoryMovementsPage.test.ts src/router/routes.test.ts` - PASS (`8/8`).
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/inventory/__tests__/InventoryOperationPage.test.ts src/router/routes.test.ts` - PASS (`10/10`).
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/fiscal/__tests__/FiscalTaxOperationPage.test.ts src/router/routes.test.ts` - PASS (`9/9`).
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/reports/__tests__/InvoiceReportsPage.test.ts src/router/routes.test.ts` - PASS (`8/8`).
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/finance/__tests__/FinanceOperationPage.test.ts src/router/routes.test.ts` - PASS (`10/10`).
- `pnpm --filter @cvg-his-v2/spa run typecheck` - PASS.

---

## 4. P2 - Maturidade e reforço operacional

| ID | Item | Impacto | Status | Criterio de aceite |
|---|---|---|---|---|
| GAP96-P2-001 | Criar e2e Vetus comercial ponta a ponta | Medio | Implementado; bloqueado ambiente | spec Playwright criado e descoberto; execucao real bloqueada pelo `webServer` do runner atual |
| GAP96-P2-002 | Reexecutar `pnpm test:integration` após a frente comercial | Medio | Bloqueado ambiente | tentativa executada; sandbox bloqueou PostgreSQL local com `EPERM 127.0.0.1:5433` |
| GAP96-P2-003 | Reexecutar `pnpm test:e2e:spa` ou smoke equivalente | Medio | Bloqueado ambiente | tentativa `pnpm test:smoke` executada; Playwright `webServer` saiu cedo no runner atual |
| GAP96-P2-004 | Publicar relatório operacional de jobs PDV | Medio | Fechado | `PointOfSaleSyncPage` lista jobs PDV existentes, status, registros processados e datas |
| GAP96-P2-005 | Atualizar scorecard final pós-implementação | Medio | Aberto | novo relatório com notas recalculadas e gates verdes |
| GAP96-P2-006 | Revalidar docs Enterprise após cada onda | Medio | Fechado | `README`, `0100`, `0349`, `0350` e `0351` atualizados após P1/P2 parcial |
| GAP96-P2-007 | Revisar risco de dados locais remanescentes nas telas SPA | Baixo | Fechado | varredura documentada; exceções limitadas a arrays de configuracao, mocks de teste e catalogo base estavel |

---

## 5. Mapa de impacto nas notas

| Item | Core | Vetus Comercial | Docs vs Codigo |
|---|---:|---:|---:|
| GAP96-P0-001 a P0-004 | +1 | +22 | +3 |
| GAP96-P0-005 | +1 | +5 | +1 |
| GAP96-P0-006 | +2 | +2 | +1 |
| GAP96-P0-007 | +1 | +6 | +2 |
| GAP96-P1-001 a P1-010 | +1 | +10 | +1 |
| GAP96-P2-001 a P2-007 | +1 | +4 | +2 |

---

## 6. Sequenciamento recomendado

1. Fechar `GAP96-P0-001` a `GAP96-P0-003` juntos, porque compartilham migration e padrões de persistência.
2. Fechar `GAP96-P0-007` antes de integrar completamente a SPA.
3. Fechar `GAP96-P0-004` com testes de UI e contrato.
4. Fechar `GAP96-P0-005` antes da auditoria final.
5. Resolver `GAP96-P0-006` em paralelo, pois é bloqueio de ambiente.
6. Atacar placeholders P1 por domínio, começando por estoque e financeiro.
7. Rodar gates P2 e publicar novo relatório final.

---

## 7. Definicao de fechamento do backlog

O backlog `0351` fecha quando:

- todos os P0 estiverem `Fechado`;
- todos os P1 estiverem `Fechado` ou formalmente retirados de escopo com justificativa;
- pelo menos `GAP96-P2-001`, `GAP96-P2-002`, `GAP96-P2-003` e `GAP96-P2-005` estiverem fechados;
- uma nova auditoria confirmar `96/100` nas três notas alvo.

## 8. Status pos-P2 parcial - 2026-04-24

Os itens `GAP96-P2-004`, `GAP96-P2-006` e `GAP96-P2-007` foram fechados. O relatorio operacional de jobs PDV foi publicado na tela `PointOfSaleSyncPage`, a documentação Enterprise viva foi revalidada apos a onda e a varredura de dados locais remanescentes nao encontrou mock operacional nas rotas P0/P1.

O item `GAP96-P2-001` foi implementado com spec Playwright, fixture `PATCH` e criacao de tutor real via API antes de pontuar/resgatar fidelidade. Ele nao foi promovido para `Fechado` porque o gate exige execucao real do fluxo, e o runner atual ainda bloqueia o `webServer` do Playwright.

Evidencias executadas:

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/inventory/__tests__/PriceTablesAndPosPage.test.ts` - PASS (`2/2`).
- `pnpm exec playwright test --config playwright-spa.config.ts --list | rg "Vetus Comercial|vetus-commercial"` - PASS; spec `vetus-commercial-flow.spec.ts` descoberto.
- `pnpm --filter @cvg-his-v2/spa run typecheck` - PASS.
- `rg "placeholderRoute\\('(inventory/(purchases|transfers|nf|audit)|finance/(accounts-payable|cash-flow|cheques)|fiscal/(ipi|ibs-cbs)|reports/nf|breeds|species|coat-colors|loyalty)'" apps/spa/src/router/routes.ts` - PASS por ausencia de matches.
- `rg "const .*\\= \\[|ref\\(\\[|reactive\\(\\[|PlaceholderPage|mock|seed|dados locais" ...` nas telas P0/P1 - PASS operacional; achados restritos a colunas/configuracoes de UI, mocks de teste e catalogo base estavel.
- `docs/Enterprise/README.md`, `0100`, `0349`, `0350` e `0351` atualizados sem conflito de status conhecido.

Tentativas bloqueadas pelo ambiente:

- `pnpm test:integration` - FAIL ambiental; setup nao conseguiu conectar ao PostgreSQL local e os testes DB falharam com `EPERM 127.0.0.1:5433`/`::1:5433`.
- `pnpm test:smoke` - FAIL ambiental; Playwright reportou `Process from config.webServer exited early`.

Pendencias para promocao final:

- `GAP96-P2-001`: executar o spec Playwright real, nao apenas descoberta/listagem.
- `GAP96-P2-002`: reexecutar integracao em ambiente com PostgreSQL local acessivel.
- `GAP96-P2-003`: reexecutar smoke/e2e quando o `webServer` Playwright iniciar API e SPA corretamente.
- `GAP96-P2-005`: publicar scorecard final somente apos gates P2 verdes.
