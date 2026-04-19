# 0203 - Prompts Paralelos Execucao Real Vetus-Aligned

**Status:** pronto para uso  
**Data:** 2026-04-12  
**Objetivo:** acelerar a implementacao real do plano Vetus-aligned com 4 frentes paralelas alinhadas ao estado atual do repositorio, evitando sobreposicao de arquivos.

---

## 1. Regras de execucao paralela

Antes de iniciar:

- usar uma branch por frente ou workspaces separados
- nao permitir que dois agentes editem os mesmos arquivos
- integrar primeiro `Prompt 1`, porque ele materializa o menu oficial que expoe entregas de outras frentes
- exigir de cada agente:
  - resumo executivo
  - arquivos alterados
  - validacao executada
  - riscos remanescentes
  - pendencias

### Regras globais

- preservar todos os upgrades enterprise do `cvg-his-v2`
- `apps/spa` continua sendo o frontend oficial
- nao reintroduzir nada em `apps/web`
- nao clonar visualmente o Vetus
- aplicar logica Vetus com base tecnica moderna do CVG
- nao reverter mudancas de outras frentes

### Estado real obrigatorio a considerar

- o shell Vetus-aligned ja existe
- `Laboratório`, `Estoque`, `Financeiro`, `Marketing`, `RH`, `Relatórios` e `Console Enterprise` ja existem semanticamente no shell
- o menu oficial ainda nao reflete toda a profundidade das rotas novas
- `LaboratoryOrdersPage.vue` e `LaboratoryResultsPage.vue` ainda quebram o `vue-tsc`
- o hub fiscal aponta para rotas ainda inexistentes
- ha avancos reais em `Dashboard`, `Appointments`, `Patients` e `Inpatient`

---

## 2. Prompt 1 - Shell Final e Mapa Oficial do Produto

**Objetivo da frente:** fechar o shell oficial do programa, fazendo o navbar e a command palette refletirem o estado real das rotas e dos dominios ja criados.

**Write scope exclusivo:**

- `apps/spa/src/navigation.ts`
- `apps/spa/src/layouts/AppLayout.vue`
- `apps/spa/src/navigation.test.ts`
- docs de shell/menu estritamente necessarias

**Nao editar:**

- `apps/spa/src/router/routes.ts`
- paginas em `apps/spa/src/pages/**`
- backend

### Prompt

```text
Voce esta trabalhando no repositorio `/root/.openclaw/workspace/cvg-his-v2`.

Contexto obrigatorio:
- Leia primeiro:
  - `docs/Enterprise/0197-PLANO-GERAL-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0198-ROADMAP-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0199-BACKLOG-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0200-MATRIZ-CONSTRUCAO-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0202-DOMINIO-LABORATORIO-ESTOQUE-FISCAL.md`
- Inspecione:
  - `apps/spa/src/navigation.ts`
  - `apps/spa/src/layouts/AppLayout.vue`
  - `apps/spa/src/router/routes.ts`

Missao:
- Fechar o mapa oficial do produto no shell.
- O navbar principal deve continuar com:
  - Início
  - Atendimento
  - Laboratório
  - Estoque
  - Financeiro
  - Marketing
  - RH
  - Relatórios
- O Console Enterprise deve continuar secundario.
- O foco agora nao e criar a taxonomia do zero. O foco e refletir no menu oficial o que ja existe no repositorio.

Obrigatorio:
- expor no menu e na command palette as rotas reais ja existentes de:
  - `Laboratório`
    - `/laboratory`
    - `/laboratory/orders`
    - `/laboratory/results`
    - `/laboratory/equipment`
    - `/laboratory/report-types`
    - `/laboratory/reference-values`
    - manter `diagnostics` de forma coerente, como ponte ou entrada primaria bem justificada
  - `Estoque`
    - `/inventory`
    - `/inventory/movements`
    - `/inventory/validity`
    - `/products`
    - decidir exposicao coerente de `/fiscal`
  - `Financeiro`
    - `/billing`
    - `/cash`
    - `/pix`
    - `/quotes`
    - `/counter-sales`
- preservar command palette, favoritos, recentes, breadcrumbs, dark mode e console enterprise
- revisar naming e breadcrumbs calculados para evitar inconsistencias semanticas no shell

Escopo de edicao:
- voce so pode editar:
  - `apps/spa/src/navigation.ts`
  - `apps/spa/src/layouts/AppLayout.vue`
  - `apps/spa/src/navigation.test.ts`
- nao altere paginas
- nao altere backend
- nao altere `routes.ts`

Entregas esperadas:
- mapa oficial do menu refletindo melhor o estado real do produto
- command palette atualizada com a profundidade nova
- favoritos e recentes sem regressao
- breadcrumbs coerentes com a nova profundidade
- testes de navegacao ajustados

Validacao minima:
- rodar `pnpm --filter @cvg-his-v2/spa exec vitest run src/navigation.test.ts`
- se possivel, rodar verificacao focada do shell/layout
- informar riscos remanescentes

Formato da resposta final:
- resumo curto
- arquivos alterados
- validacao executada
- pendencias
```

---

## 3. Prompt 2 - Atendimento Completo: Inicio, Agenda, Cadastros, Jornada Clinica e Internacao

**Objetivo da frente:** fechar de verdade o dominio `Atendimento` como trilha operacional principal, alinhando Inicio, Agenda, Fila, Atendimentos, Triagem, Prontuario, Pacientes, Tutores e Internacao.

**Write scope exclusivo:**

- `apps/spa/src/pages/DashboardPage.vue`
- `apps/spa/src/pages/appointments/**`
- `apps/spa/src/pages/scheduling/**`
- `apps/spa/src/pages/encounters/**`
- `apps/spa/src/pages/patients/**`
- `apps/spa/src/pages/owners/**`
- `apps/spa/src/pages/medical-records/**`
- `apps/spa/src/pages/triage/**`
- `apps/spa/src/pages/inpatient/**`
- componentes compartilhados estritamente necessarios para esse fluxo

**Nao editar:**

- `apps/spa/src/navigation.ts`
- `apps/spa/src/layouts/AppLayout.vue`
- `apps/spa/src/router/routes.ts`
- laboratorio
- estoque
- fiscal
- financeiro/marketing/rh/console enterprise

### Prompt

```text
Voce esta trabalhando no repositorio `/root/.openclaw/workspace/cvg-his-v2`.

Contexto obrigatorio:
- Leia primeiro:
  - `docs/Enterprise/0197-PLANO-GERAL-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0198-ROADMAP-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0199-BACKLOG-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0200-MATRIZ-CONSTRUCAO-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
- Leia os modulos Vetus de referencia:
  - `vetus-screenshots/docs/02-VETUS-AGENDA.md`
  - `vetus-screenshots/docs/03-VETUS-COMANDAS.md`
  - `vetus-screenshots/docs/04-VETUS-CADASTROS-ANIMAIS-CLIENTES.md`
- Inspecione as paginas atuais de:
  - dashboard
  - appointments
  - scheduling
  - queue
  - encounters
  - patients
  - owners
  - medical-records
  - triage
  - inpatient

Missao:
- Transformar `Atendimento` na trilha operacional principal e mais madura do produto.
- Aproveitar os avancos que ja existem no repo e fechar a narrativa ponta a ponta:
  - Início como porta operacional
  - Agenda / fila / atendimento / triagem / prontuario como mesma jornada
  - Pacientes e tutores claramente subordinados ao dominio Atendimento
  - Internacao claramente percebida como subdominio de Atendimento
- nao mudar o shell
- nao criar visual legacy
- manter design system, EmptyState, SkeletonLoader, AppPageHeader, quick actions, KPI cards e o padrao moderno do CVG

O que precisa melhorar concretamente:
- consistencia entre CTAs, subtitulos, blocos de resumo e empty states
- conexao entre as paginas do fluxo
- linguagem operacional uniforme
- menos paginas “soltas” e mais leitura de jornada
- reforcar entrada contextual para agendamento, admissao, atendimento e internacao

Escopo de edicao:
- voce pode editar apenas:
  - `apps/spa/src/pages/DashboardPage.vue`
  - `apps/spa/src/pages/appointments/**`
  - `apps/spa/src/pages/scheduling/**`
  - `apps/spa/src/pages/encounters/**`
  - `apps/spa/src/pages/patients/**`
  - `apps/spa/src/pages/owners/**`
  - `apps/spa/src/pages/medical-records/**`
  - `apps/spa/src/pages/triage/**`
  - `apps/spa/src/pages/inpatient/**`
  - componentes compartilhados estritamente necessarios
- nao editar `navigation.ts`, `AppLayout.vue` nem `routes.ts`

Entregas esperadas:
- `Início` mais operacional
- cadastros de pacientes e tutores mais claramente ligados ao fluxo de atendimento
- jornada agenda -> fila -> atendimento -> prontuario mais legivel
- internacao mais integrada ao resto do fluxo
- consistencia de linguagem e CTA entre as paginas

Validacao minima:
- rodar testes focados das paginas alteradas, se existirem
- rodar o que for viavel de `vitest` focado nesse write scope
- apontar dependencias remanescentes fora do escopo

Formato da resposta final:
- resumo curto
- arquivos alterados
- validacao executada
- pendencias
```

---

## 4. Prompt 3 - Laboratorio, Estoque e Fiscal: Fechamento Tecnico e Integracao Real

**Objetivo da frente:** sair do estado “hubs e rotas criados” para estado “dominio utilizavel”, corrigindo tipagem, links quebrados, placeholders excessivos e lacunas fiscais mais obvias.

**Write scope exclusivo:**

- `apps/spa/src/router/routes.ts`
- `apps/spa/src/pages/clinical/DiagnosticsPage.vue`
- `apps/spa/src/pages/laboratory/**`
- `apps/spa/src/pages/inventory/**`
- `apps/spa/src/pages/products/**`
- `apps/spa/src/pages/services/**` se estritamente necessario
- `apps/spa/src/pages/fiscal/**`
- services e componentes compartilhados estritamente necessarios para essas frentes

**Nao editar:**

- `apps/spa/src/navigation.ts`
- `apps/spa/src/layouts/AppLayout.vue`
- dominio de atendimento
- financeiro/marketing/rh fora de estoque/fiscal

### Prompt

```text
Voce esta trabalhando no repositorio `/root/.openclaw/workspace/cvg-his-v2`.

Contexto obrigatorio:
- Leia primeiro:
  - `docs/Enterprise/0197-PLANO-GERAL-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0198-ROADMAP-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0199-BACKLOG-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0200-MATRIZ-CONSTRUCAO-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0202-DOMINIO-LABORATORIO-ESTOQUE-FISCAL.md`
  - `vetus-screenshots/docs/modulos/04-RELATORIO-LABORATORIO.md`
- Inspecione:
  - `apps/spa/src/pages/clinical/**`
  - `apps/spa/src/pages/laboratory/**`
  - `apps/spa/src/pages/inventory/**`
  - `apps/spa/src/pages/products/**`
  - `apps/spa/src/pages/fiscal/**`
  - `packages/modules/diagnostics`
  - `packages/modules/inventory`
  - `packages/modules/fiscal`

Missao:
- Fechar tecnicamente `Laboratório`, `Estoque` e `Fiscal`.
- Esta frente nao deve apenas criar telas novas. Ela deve estabilizar o que ja existe.

Obrigatorio:
- corrigir o `vue-tsc` nas pages:
  - `LaboratoryOrdersPage.vue`
  - `LaboratoryResultsPage.vue`
- corrigir o link incorreto de estoque para orcamentos
- decidir o tratamento correto para os CTAs do hub fiscal que hoje apontam para rotas inexistentes:
  - ou criar as rotas/paginas faltantes
  - ou esconder/rebaixar as acoes ainda nao implementadas
- reduzir placeholders onde houver caminho claro de integracao com services existentes
- amadurecer a narrativa do hub de laboratorio e do hub de estoque

Desejavel:
- tornar `DiagnosticsPage` semanticamente mais alinhada ao dominio `Laboratório`
- adicionar servicos minimos para alimentar listas laboratoriais/fiscais quando isso for viavel sem explodir escopo
- elevar a qualidade das paginas de fiscal acima do nivel “link farm”

Escopo de edicao:
- voce pode editar apenas:
  - `apps/spa/src/router/routes.ts`
  - `apps/spa/src/pages/clinical/DiagnosticsPage.vue`
  - `apps/spa/src/pages/laboratory/**`
  - `apps/spa/src/pages/inventory/**`
  - `apps/spa/src/pages/products/**`
  - `apps/spa/src/pages/services/**` se estritamente necessario
  - `apps/spa/src/pages/fiscal/**`
  - services/componentes estritamente necessarios
- nao editar `navigation.ts` nem `AppLayout.vue`

Entregas esperadas:
- laboratorio compilando e menos placeholder
- estoque com atalhos corretos e narrativa ERP mais solida
- fiscal sem links falsos e com fluxo mais coerente
- rotas consistentes com o que a UI promete

Validacao minima:
- rodar `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit`
- rodar testes focados se existirem
- informar claramente o que ainda ficou como placeholder

Formato da resposta final:
- resumo curto
- arquivos alterados
- validacao executada
- pendencias
```

---

## 5. Prompt 4 - Financeiro, Marketing, RH, Relatorios e Console Enterprise

**Objetivo da frente:** amadurecer os dominios administrativos e premium enterprise para que a reorganizacao nao pare no shell e passe a existir tambem no conteudo das paginas.

**Write scope exclusivo:**

- `apps/spa/src/pages/billing/**`
- `apps/spa/src/pages/finance/**`
- `apps/spa/src/pages/sales/**`
- `apps/spa/src/pages/notifications/**`
- `apps/spa/src/pages/users/**`
- `apps/spa/src/pages/staff/**`
- `apps/spa/src/pages/commercial-reports/**`
- `apps/spa/src/pages/access-control/**`
- `apps/spa/src/pages/audit/**`
- `apps/spa/src/pages/api-keys/**`
- `apps/spa/src/pages/webhooks/**`
- `apps/spa/src/pages/api-client/**`
- `apps/spa/src/pages/lgpd/**`
- `apps/spa/src/pages/master-search/**`
- componentes compartilhados estritamente necessarios para essas areas

**Nao editar:**

- `apps/spa/src/navigation.ts`
- `apps/spa/src/layouts/AppLayout.vue`
- `apps/spa/src/router/routes.ts`
- atendimento
- laboratorio
- estoque
- fiscal

### Prompt

```text
Voce esta trabalhando no repositorio `/root/.openclaw/workspace/cvg-his-v2`.

Contexto obrigatorio:
- Leia primeiro:
  - `docs/Enterprise/0197-PLANO-GERAL-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0198-ROADMAP-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0199-BACKLOG-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0200-MATRIZ-CONSTRUCAO-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
- Inspecione:
  - `billing`
  - `finance`
  - `sales`
  - `notifications`
  - `users`
  - `staff`
  - `commercial-reports`
  - `access-control`
  - `audit`
  - `api-keys`
  - `webhooks`
  - `api-client`
  - `lgpd`
  - `master-search`

Missao:
- Fazer com que `Financeiro`, `Marketing`, `RH`, `Relatórios` e `Console Enterprise` tenham conteudo compatível com a organizacao nova do shell.
- Hoje esses grupos ja existem no menu, mas varias paginas ainda contam historia antiga, tecnica demais ou rasa demais.

Objetivos concretos:
- `Financeiro`:
  - melhorar narrativa de billing, caixa, pix, vendas assistidas e orcamentos
  - criar mais cara de backoffice ERP e menos cara de modulo isolado
- `Marketing`:
  - transformar notificacoes em centro de relacionamento/canais/campanhas operacionais
- `RH`:
  - aproximar usuarios e equipe da governanca humana
- `Relatórios`:
  - tornar relatorios comerciais mais cara de hub analitico
- `Console Enterprise`:
  - elevar maturidade de LGPD, auditoria, API keys, webhooks, api client e busca mestre

Preservar:
- design system atual
- command palette e shell existentes
- base enterprise do CVG

Escopo de edicao:
- voce pode editar apenas:
  - `apps/spa/src/pages/billing/**`
  - `apps/spa/src/pages/finance/**`
  - `apps/spa/src/pages/sales/**`
  - `apps/spa/src/pages/notifications/**`
  - `apps/spa/src/pages/users/**`
  - `apps/spa/src/pages/staff/**`
  - `apps/spa/src/pages/commercial-reports/**`
  - `apps/spa/src/pages/access-control/**`
  - `apps/spa/src/pages/audit/**`
  - `apps/spa/src/pages/api-keys/**`
  - `apps/spa/src/pages/webhooks/**`
  - `apps/spa/src/pages/api-client/**`
  - `apps/spa/src/pages/lgpd/**`
  - `apps/spa/src/pages/master-search/**`
  - componentes compartilhados estritamente necessarios
- nao editar `navigation.ts`, `AppLayout.vue` ou `routes.ts`

Entregas esperadas:
- conteudo das paginas mais alinhado aos grupos do shell
- linguagem mais ERP e menos tecnica onde fizer sentido
- hubs e quick actions mais coerentes
- console enterprise mais premium e mais legivel

Validacao minima:
- rodar testes focados se existirem
- rodar verificacoes localizadas que sejam viaveis no write scope
- apontar claramente o que ainda depende de backend ou novas rotas

Formato da resposta final:
- resumo curto
- arquivos alterados
- validacao executada
- pendencias
```

---

## 6. Ordem recomendada de integracao

1. Integrar `Prompt 1`
2. Integrar `Prompt 3`
3. Integrar `Prompt 2`
4. Integrar `Prompt 4`

### Motivo

- `Prompt 1` fecha o menu oficial
- `Prompt 3` resolve os maiores gaps de coerencia entre menu, rotas e typecheck
- `Prompt 2` aprofunda o dominio mais importante do produto
- `Prompt 4` fecha a camada administrativa e enterprise depois que o shell e os dominios core estiverem mais estaveis
