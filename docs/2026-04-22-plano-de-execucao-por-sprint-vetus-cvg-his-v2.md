# Plano de execução por sprint com responsáveis — CVG-HIS V2 alinhado ao benchmark Vetus

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

Goal: executar a refatoração de shell, navegação e módulos prioritários do CVG-HIS V2 em sprints claras, com donos sugeridos, entregáveis, critérios de aceite e comandos de verificação.

Architecture: o programa é dividido em duas trilhas principais. A primeira trilha corrige a fundação do produto: shell, taxonomia, rotas, breadcrumbs e estados. A segunda trilha consolida os macrodomínios operacionais, começando por Atendimento e depois avançando em Estoque/Fiscal, Financeiro, RH, Relatórios e Marketing. Cada sprint encerra com verificação de roteamento, vitest e build do SPA.

Tech Stack: Vue 3, Vue Router 4, Pinia, Vitest, Vite, design system interno, TypeScript.

---

## 0. Papéis sugeridos

Se não houver nomes definidos, usar estes responsáveis por função:
- Product Owner / Sponsor
  - valida taxonomia, nomenclatura e priorização
- UX / Product Design
  - valida shell, hierarquia visual, estados e consistência com benchmark
- Front-end Lead
  - dono da navegação, shell e implementação do SPA
- Front-end Dev 1
  - foco em shell, topbar, sidebar, breadcrumbs, AppPageHeader
- Front-end Dev 2
  - foco em rotas, menu, páginas-hub e domínios operacionais
- Back-end / Integration Owner
  - garante aderência entre páginas, serviços e disponibilidade dos endpoints
- QA
  - smoke tests, navegação, regressões visuais e fluxos críticos

Se a equipe for menor, Front-end Lead acumula Dev 1 e Dev 2; Product Owner acumula UX validação funcional.

## 1. Cadência sugerida

- Sprint duration: 2 semanas
- Rito por sprint:
  - Dia 1: refinamento técnico e congelamento do escopo
  - Dias 2-8: implementação
  - Dia 9: correções e smoke tests
  - Dia 10: demo, aceite e decisão de go/no-go

## 2. Sprint 1 — Contrato de informação e congelamento da arquitetura alvo

Owner principal:
- Product Owner
- Front-end Lead

Apoio:
- UX
- QA

Objetivo:
- congelar a árvore oficial domínio > subdomínio > rotina que vai governar shell, menu, rotas e breadcrumbs.

Escopo:
- consolidar a árvore final com base no benchmark Vetus e no backlog já produzido;
- classificar todas as rotinas atuais em:
  - manter
  - mover
  - renomear
  - agrupar
  - criar estado temporário;
- decidir o papel final de:
  - Favoritos
  - Recentes
  - Console Enterprise
  - command palette.

Entregáveis:
- matriz canônica de navegação;
- mapa atual vs alvo;
- lista de labels oficiais;
- definição dos estados de produto por rotina.

Arquivos a produzir ou atualizar:
- `docs/2026-04-22-plano-executivo-vetus-cvg-his-v2.md` (referência)
- `docs/2026-04-22-roadmap-vetus-cvg-his-v2.md` (referência)
- `docs/2026-04-22-backlog-vetus-cvg-his-v2.md` (referência)
- criar opcionalmente um artefato de apoio:
  - `docs/navigation-contract-vetus-aligned.md`

Critérios de aceite:
- nenhuma rota importante fica sem subdomínio definido;
- cada grupo principal do Vetus tem árvore explícita;
- existe consenso de produto sobre nomes e agrupamentos.

Verificação:
- revisão documental com Product + UX + Front-end Lead.

## 3. Sprint 2 — Shell base Vetus-aligned

Owner principal:
- Front-end Dev 1

Apoio:
- Front-end Lead
- UX
- QA

Objetivo:
- refatorar o shell do SPA para refletir a anatomia operacional do benchmark.

Escopo:
- sidebar com destaque mais claro do grupo ativo;
- subgrupos com tratamento visual consistente;
- topbar revisada;
- breadcrumbs permanentes;
- CTA principal padronizado;
- rebaixar ou relocar Favoritos, Recentes e Console Enterprise para não competir com a árvore principal.

Arquivos prováveis:
- `apps/spa/src/layouts/AppLayout.vue`
- `apps/spa/src/stores/app.ts`
- `apps/spa/src/components/AppPageHeader.vue`
- `apps/spa/src/components/__tests__/AppPageHeader.test.ts`
- possivelmente componentes/tokens do design system consumidos pelo shell

Task breakdown:

### Task 2.1: registrar testes-alvo do shell
Objective: definir comportamento esperado antes da refatoração.

Files:
- Modify: `apps/spa/src/navigation.test.ts`
- Modify: `apps/spa/src/router/routes.test.ts`
- Create if needed: `apps/spa/src/layouts/__tests__/AppLayout.test.ts`

Step 1: escrever testes falhando para:
- agrupamento principal obrigatório;
- comportamento de destaque do grupo ativo;
- presença de breadcrumbs;
- não concorrência de blocos auxiliares com a navegação principal.

Step 2: rodar testes
Run: `npm test -- navigation.test.ts routes.test.ts`
Expected: FAIL nos cenários novos

### Task 2.2: refatorar sidebar
Objective: aproximar a sidebar do padrão Vetus.

Files:
- Modify: `apps/spa/src/layouts/AppLayout.vue`
- Modify: `apps/spa/src/stores/app.ts`

### Task 2.3: refatorar topbar
Objective: reorganizar ações globais, perfil e contexto de empresa.

Files:
- Modify: `apps/spa/src/layouts/AppLayout.vue`

### Task 2.4: padronizar header de páginas
Objective: deixar `AppPageHeader` compatível com breadcrumbs e CTA principal.

Files:
- Modify: `apps/spa/src/components/AppPageHeader.vue`
- Modify: `apps/spa/src/components/__tests__/AppPageHeader.test.ts`

Step final: validar shell
Run:
- `npm run test`
- `npm run build`
Expected:
- testes passando
- build ok

## 4. Sprint 3 — Refatoração de navegação e rotas

Owner principal:
- Front-end Lead

Apoio:
- Front-end Dev 2
- QA
- Product Owner

Objetivo:
- converter a árvore aprovada em contrato real do app.

Escopo:
- refatorar `navigation.ts`;
- refatorar `router/routes.ts`;
- revisar breadcrumbs, aliases e agrupamentos;
- explicitar estados temporários onde a rotina ainda não está completa.

Arquivos principais:
- `apps/spa/src/navigation.ts`
- `apps/spa/src/navigation.test.ts`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/router/routes.test.ts`
- `apps/spa/src/pages/PlaceholderPage.vue`

Critérios de aceite:
- todos os grupos do shell mapeados corretamente;
- `findMatchingNavGroup()` e breadcrumbs coerentes com a árvore;
- estados transitórios claros para rotinas ainda incompletas.

Verificação:
Run:
- `npm test -- navigation.test.ts routes.test.ts`
- `npm run build`

## 5. Sprint 4 — Atendimento como domínio modelo

Owner principal:
- Front-end Dev 2

Apoio:
- Front-end Lead
- UX
- QA
- Back-end / Integration Owner

Objetivo:
- fazer Atendimento refletir a jornada operacional do benchmark.

Escopo:
- reestruturar menu Atendimento em:
  - Atendimentos
  - Internação
  - Cadastros;
- posicionar corretamente:
  - Agenda
  - Comandas
  - Vendas
  - Orçamentos
  - Pacotes
  - Esteira
  - Esteira de Exames
  - Vacinas
  - Pacientes
  - Tutores
  - Serviços;
- revisar atalhos cruzados entre agenda, fila, atendimentos e internação.

Arquivos principais:
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/pages/appointments/AppointmentsListPage.vue`
- `apps/spa/src/pages/sales/CounterSalesPage.vue`
- `apps/spa/src/pages/scheduling/QueuePage.vue`
- `apps/spa/src/pages/encounters/*`
- `apps/spa/src/pages/inpatient/*`
- testes correspondentes em `__tests__`

Critérios de aceite:
- Atendimento passa a contar a mesma história operacional do benchmark;
- não há rotinas core “escondidas” fora da árvore principal.

Verificação:
Run:
- `npm test -- src/pages/appointments/__tests__/AppointmentsListPage.test.ts src/pages/sales/__tests__/CounterSalesPage.test.ts src/pages/scheduling/__tests__/QueuePage.test.ts src/pages/encounters/__tests__/EncountersListPage.test.ts src/pages/inpatient/__tests__/InpatientListPage.test.ts`
- `npm run build`

## 6. Sprint 5 — Estoque/Fiscal

Owner principal:
- Front-end Dev 2

Apoio:
- Front-end Lead
- Back-end / Integration Owner
- QA

Objetivo:
- consolidar a leitura ERP do bloco Estoque/Fiscal.

Escopo:
- organizar menu em:
  - Controles
  - Cadastrados
  - Configurações Fiscais;
- reconciliar Produtos, Estoque e Fiscal;
- explicitar rotinas faltantes ou estados transitórios.

Arquivos principais:
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/pages/inventory/*`
- `apps/spa/src/pages/products/*`
- `apps/spa/src/pages/fiscal/*`
- testes correspondentes

Verificação:
Run:
- `npm test -- src/pages/inventory/__tests__/InventoryListPage.test.ts src/pages/products/__tests__/ProductsListPage.test.ts src/router/routes.test.ts`
- `npm run build`

Nota: se não existir teste para Produtos, criar nesta sprint.

## 7. Sprint 6 — Financeiro

Owner principal:
- Front-end Lead

Apoio:
- Front-end Dev 2
- Back-end / Integration Owner
- QA

Objetivo:
- elevar Financeiro do estado atual para uma leitura mais próxima do benchmark.

Escopo:
- reorganizar menu em:
  - Gaveta
  - Controles
  - Maquininha de Cartão
  - Cadastros;
- dar visibilidade a contas a receber/pagar, transações e cadastros financeiros;
- revisar fronteira entre Billing, Caixa e PIX.

Arquivos prováveis:
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/pages/billing/*`
- `apps/spa/src/pages/finance/*`
- novas páginas, se necessário, conforme árvore final
- testes de rotas e páginas financeiras

Verificação:
Run:
- `npm test -- src/pages/billing/__tests__/BillingListPage.test.ts src/pages/finance/__tests__/PixPage.test.ts src/router/routes.test.ts`
- `npm run build`

## 8. Sprint 7 — RH e Relatórios

Owner principal:
- Front-end Dev 1 para RH
- Front-end Dev 2 para Relatórios

Apoio:
- Front-end Lead
- QA
- Product Owner

Objetivo:
- densificar a camada administrativa.

Escopo RH:
- reorganizar RH em:
  - Usuários
  - Comissões
  - Cadastros;
- delimitar corretamente RH x Governança de Acesso.

Escopo Relatórios:
- quebrar hub único em árvore por domínio;
- manter landing page, mas não como substituta da árvore.

Arquivos principais:
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/pages/users/*`
- `apps/spa/src/pages/staff/*`
- `apps/spa/src/pages/commercial-reports/CommercialReportsPage.vue`
- páginas novas ou renomeadas para relatórios, se aprovadas

Verificação:
Run:
- `npm test -- src/pages/users/__tests__/UsersListPage.test.ts src/pages/__tests__/DashboardPage.test.ts src/router/routes.test.ts`
- `npm run build`

## 9. Sprint 8 — Marketing, estados e hardening

Owner principal:
- Front-end Lead

Apoio:
- QA
- Product Owner
- UX

Objetivo:
- fechar o ciclo com consistência global e prevenção de regressão.

Escopo:
- estrutura mínima de Marketing;
- padronização final de estados “em construção”, “sem permissão” e “sem integração”;
- smoke tests do shell e domínios críticos;
- limpeza de inconsistências remanescentes.

Arquivos principais:
- `apps/spa/src/pages/PlaceholderPage.vue`
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`
- testes por domínio

Verificação:
Run:
- `npm test`
- `npm run build`

## 10. Checklist de governança por sprint

Todo sprint deve encerrar com:
- [ ] labels alinhadas ao contrato de navegação
- [ ] breadcrumbs corretos
- [ ] CTA principal padronizado
- [ ] grupo e subgrupo corretos no menu
- [ ] estados vazios/erro/permissão consistentes
- [ ] testes relevantes atualizados
- [ ] build do SPA passando

## 11. Critério de sucesso do plano

Este plano estará bem executado quando:
- a navegação parecer naturalmente Vetus-aligned;
- a árvore de menu comunicar o produto sem depender de explicação externa;
- Agenda e Comandas deixarem de ser exceções e passarem a ser referência do restante do sistema;
- Financeiro, RH e Relatórios não dependerem mais de superfícies genéricas para serem compreendidos;
- o shell deixar de ter competição visual entre operação principal e utilidades de plataforma.

## 12. Comandos padrão de validação

No diretório `apps/spa`:

```bash
npm test
npm run build
```

Para rodadas menores:

```bash
npm test -- navigation.test.ts routes.test.ts
npm test -- src/pages/appointments/__tests__/AppointmentsListPage.test.ts
npm test -- src/pages/sales/__tests__/CounterSalesPage.test.ts
```