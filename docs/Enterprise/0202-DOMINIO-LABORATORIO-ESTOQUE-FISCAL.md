# 0202 - Domínio Laboratório + Estoque + Fiscal

**Status:** laboratório backend-first entregue; estoque e fiscal seguem em aprofundamento  
**Data:** 2026-04-12  
**Base:** Prompt 3 de `0201-PROMPTS-PARALELOS-CODEX-REORGANIZACAO-VETUS-ALIGNED.md`  
**Complementar:** `0200` e `0204`

---

## 1. Veredito por domínio

| Domínio | Nota | Status real | Leitura objetiva |
| --- | --- | --- | --- |
| Laboratório | `84/100` | `REVIEW` | menu, rotas, API dedicada e páginas já operam por backend real; a taxonomia final de `/diagnostics` segue em consolidação |
| Estoque | `78/100` | `REVIEW` | menu, rotas e API real já sustentam operações principais |
| Fiscal | `72/100` | `REVIEW` | UI, rotas e API dedicada mínima já operam por HTTP real com filtros e páginas honestas; o domínio segue read-only e ainda sem persistência fiscal |

---

## 2. Escopo implementado

### 2.1 Laboratório

**Publicado no menu oficial e no router:**

- `/laboratory`
- `/laboratory/orders`
- `/laboratory/results`
- `/laboratory/equipment`
- `/laboratory/report-types`
- `/laboratory/reference-values`

**Estado atual:**

- o shell oficial já expõe a profundidade principal do domínio
- a API dedicada publica `summary`, `orders`, `equipment`, `report-types` e `reference-values` em `/api/laboratory/*`
- `laboratoryService` da SPA consome somente backend real via HTTP e deixou de derivar orders/results localmente
- equipamentos, tipos de laudo e valores de referência foram movidos para o backend com seed persistível em `packages/modules/diagnostics/**`
- `Central de Diagnósticos` permanece em `/diagnostics` como ponte operacional para intake clínico, timeline e anexos do domínio laboratorial

### 2.2 Estoque

**Publicado no menu oficial e no router:**

- `/inventory`
- `/inventory/movements`
- `/inventory/validity`

**Estado atual:**

- `InventoryListPage.vue` já expõe navegação alinhada ao ERP
- os links visíveis para orçamentos já apontam para `/quotes`
- a SPA usa API real para `/inventory`, `/inventory/consumptions` e `/inventory/lots`
- a API já possui handlers reais para estes fluxos em `apps/api/src/server.ts`

### 2.3 Fiscal

**Publicado no router:**

- `/fiscal`
- `/fiscal/icms`
- `/fiscal/pis-cofins`
- `/fiscal/cfop`
- `/fiscal/nfse`
- `/fiscal/ncm`
- `/fiscal/icms-matrix`

**Publicado no menu oficial:**

- `Configuração Fiscal`
- `ICMS`
- `NFS-e`

**Estado atual:**

- o domínio já não está restrito a um hub simples; as subrotas existem
- `fiscalService` da SPA consome `/api/fiscal/*` por HTTP real
- `apps/api/src/routes/fiscal-routes.ts` publica `summary`, `tax-preview`, `icms`, `pis-cofins`, `cfop`, `nfse`, `ncm` e `icms-matrix` com filtros operacionais por query string
- `packages/modules/fiscal/src/service.ts` centraliza o catálogo fiscal e o cálculo-base no backend
- `apps/spa/src/pages/fiscal/**` foi rebaixado para consulta read-only, sem CTA prometendo cadastro, edição ou emissão inexistentes
- ainda não há persistência de cadastros fiscais, emissão NFS-e transacional nem escrituração/backoffice fiscal avançado

---

## 3. Evidência técnica desta revisão

| Evidência | Resultado |
| --- | --- |
| `apps/spa/src/navigation.ts` | laboratório e estoque têm profundidade publicada; fiscal continua parcial no menu principal |
| `apps/spa/src/router/routes.ts` | todas as rotas de laboratório e fiscal citadas acima existem |
| `apps/spa/src/services/laboratory.ts` | consome `/api/laboratory/*` sem fallback derivado/local |
| `apps/api/src/routes/laboratory-routes.ts` | superfície laboratorial dedicada publicada com ponte coerente em `/diagnostics/orders` |
| `packages/modules/diagnostics/**` | pedidos e catálogos laboratoriais centralizados no backend, com repositório persistível |
| `apps/spa/src/pages/clinical/DiagnosticsPage.vue` | registra pedido real, mantém nota clínica e libera resultado anexado como ponte operacional |
| `apps/spa/src/services/fiscal.ts` | consome backend fiscal real via `/api/fiscal/*` com query params para filtros reais |
| `apps/api/src/routes/fiscal-routes.ts` | superfície fiscal mínima dedicada publicada na API com filtros por tabela |
| `packages/modules/fiscal/src/service.ts` | catálogo e cálculo fiscal movidos para o backend, com cobertura ampliada de ICMS, PIS/COFINS, NFS-e, NCM e matriz |
| `pnpm --filter @cvg-his-v2/module-diagnostics test` | PASS; serviço laboratorial e catálogo backend-first cobertos por teste focado |
| `node --test --import tsx apps/api/src/routes/laboratory-routes.test.ts` | PASS; rotas laboratoriais e ponte `/diagnostics/orders` validadas |
| `cd apps/spa && npx vitest run src/pages/clinical/__tests__/DiagnosticsPage.test.ts` | PASS; fluxo da ponte diagnóstica validado |

---

## 4. Riscos atuais

| Risco | Gravidade | Leitura objetiva | Mitigação |
| --- | --- | --- | --- |
| Taxonomia final de `/diagnostics` ainda não está fechada | média | a ponte operacional foi formalizada, mas a nomenclatura/hub definitivo ainda precisa de decisão final | concluir `ERP-023` |
| Catálogos laboratoriais ainda não têm CRUD operacional na SPA | média | a persistência saiu da SPA, mas os cadastros seguem backend-seeded e read-only na interface | decidir profundidade de manutenção operacional |
| Fiscal segue sem persistência apesar do baseline read-only fechado | alta | há leitura, filtros e catálogo por backend, mas ainda sem persistência, emissão ou backoffice fiscal completo | aprofundar o domínio além do baseline read-only |
| Menu fiscal expõe só parte da profundidade do router | média | PIS/COFINS, CFOP, NCM e matriz ICMS existem no router, mas ainda não estão no menu principal | decidir a profundidade final do menu fiscal |

---

## 5. Backlog residual real

| ID | Item | Prioridade | Status |
| --- | --- | --- | --- |
| REORG-050 | consolidar backend real do laboratório | P0 | `DONE` |
| REORG-051 | decidir o papel definitivo de `/diagnostics` como ponte ou subdomínio legado | P1 | `IN PROGRESS` |
| REORG-053 | transformar equipamentos, tipos de laudo e valores de referência em cadastros reais | P1 | `DONE` |
| REORG-060 | manter estoque alinhado ao ERP e ampliar cobertura de fluxos | P1 | `IN PROGRESS` |
| REORG-064 | backend e contratos reais para fiscal | P0 | `DONE` |
| REORG-066 | persistência e operações fiscais reais além do catálogo | P0 | `TODO` |
| REORG-065 | aprofundar compras, fornecedores e transferências | P2 | `TODO` |

---

## 6. Conclusão

O bloco `Laboratório + Estoque + Fiscal` avançou mais do que a documentação anterior reconhecia.

- laboratório: já é domínio backend-first com contratos reais para pedidos, resultados e catálogos
- estoque: já é domínio operacional sustentado por API
- fiscal: já tem superfície, rotas, API dedicada mínima e páginas honestas apoiadas em HTTP real, mas ainda carece de persistência e profundidade fiscal de ERP

O principal trabalho restante deixou de ser "criar as telas" e passou a ser **fechar taxonomia final, ampliar CRUD operacional e aprofundar os domínios administrativos remanescentes**.
