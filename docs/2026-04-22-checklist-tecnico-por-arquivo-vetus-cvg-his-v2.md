# Checklist técnico por arquivo — início imediato da implementação Vetus-aligned no CVG-HIS V2

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

Goal: transformar o backlog em uma sequência técnica orientada por arquivos para iniciar a implementação imediatamente, com foco no shell, navegação, rotas, estados e principais páginas do SPA.

Architecture: a execução começa pelos arquivos estruturais que definem shell e contrato de navegação, depois avança para páginas-hub e domínios operacionais. A cada arquivo, a regra é: ajustar teste primeiro, implementar mudança mínima coerente, validar com vitest e build.

Tech Stack: Vue 3, Vue Router 4, Pinia, TypeScript, Vitest, Vite.

---

## 0. Ordem recomendada de ataque

Fase A — Fundação
1. `apps/spa/src/navigation.test.ts`
2. `apps/spa/src/router/routes.test.ts`
3. `apps/spa/src/navigation.ts`
4. `apps/spa/src/router/routes.ts`
5. `apps/spa/src/layouts/AppLayout.vue`
6. `apps/spa/src/stores/app.ts`
7. `apps/spa/src/components/AppPageHeader.vue`
8. `apps/spa/src/components/__tests__/AppPageHeader.test.ts`
9. `apps/spa/src/pages/PlaceholderPage.vue`

Fase B — Atendimento como modelo
10. `apps/spa/src/pages/appointments/AppointmentsListPage.vue`
11. `apps/spa/src/pages/sales/CounterSalesPage.vue`
12. `apps/spa/src/pages/scheduling/QueuePage.vue`
13. `apps/spa/src/pages/encounters/*`
14. `apps/spa/src/pages/inpatient/*`
15. `apps/spa/src/pages/patients/*`
16. `apps/spa/src/pages/owners/*`
17. `apps/spa/src/pages/services/*`

Fase C — Domínios densos
18. `apps/spa/src/pages/inventory/*`
19. `apps/spa/src/pages/products/*`
20. `apps/spa/src/pages/fiscal/*`
21. `apps/spa/src/pages/billing/*`
22. `apps/spa/src/pages/finance/*`
23. `apps/spa/src/pages/users/*`
24. `apps/spa/src/pages/staff/*`
25. `apps/spa/src/pages/commercial-reports/CommercialReportsPage.vue`

---

## 1. Arquivo: `apps/spa/src/navigation.test.ts`

Objetivo:
- tornar os testes o contrato oficial da nova árvore de navegação.

Checklist:
- [ ] atualizar o teste dos grupos oficiais para refletir a árvore final aprovada
- [ ] adicionar testes para subdomínios obrigatórios de Atendimento:
  - Atendimentos
  - Internação
  - Cadastros
- [ ] adicionar testes para subdomínios obrigatórios de Estoque:
  - Controles
  - Cadastrados
  - Configurações Fiscais
- [ ] adicionar testes para subdomínios obrigatórios de Financeiro:
  - Gaveta
  - Controles
  - Maquininha de Cartão
  - Cadastros
- [ ] adicionar testes para subdomínios obrigatórios de RH:
  - Usuários
  - Comissões
  - Cadastros
- [ ] adicionar testes para que rotas aninhadas encontrem grupo e subgrupo corretos
- [ ] adicionar teste garantindo que rotinas em estado transitório tenham representação explícita

Comando:
```bash
npm test -- navigation.test.ts
```

## 2. Arquivo: `apps/spa/src/router/routes.test.ts`

Objetivo:
- garantir convergência entre rotas canônicas e narrativa da navegação.

Checklist:
- [ ] revisar testes legados de `scheduling` e agenda canônica
- [ ] adicionar testes de breadcrumb para páginas-chave
- [ ] adicionar testes para rotas movidas ou renomeadas
- [ ] validar que rotas de landing page não substituem rotas reais do domínio
- [ ] validar estados de páginas em construção quando aplicável

Comando:
```bash
npm test -- routes.test.ts
```

## 3. Arquivo: `apps/spa/src/navigation.ts`

Objetivo:
- implementar a árvore Vetus-aligned definitiva.

Checklist:
- [ ] reorganizar `navGroups` para refletir apenas os grupos do benchmark
- [ ] quebrar grupos em seções coerentes com subdomínios reais
- [ ] revisar labels para aderência ao benchmark
- [ ] revisar descrições dos grupos para linguagem operacional
- [ ] garantir que Atendimento contenha a árvore correta
- [ ] garantir que Laboratório contenha “Atendimentos” e “Cadastrados”
- [ ] garantir que Estoque contenha “Controles”, “Cadastrados” e “Configurações Fiscais”
- [ ] garantir que Financeiro contenha “Gaveta”, “Controles”, “Maquininha de Cartão” e “Cadastros”
- [ ] garantir que RH contenha “Usuários”, “Comissões” e “Cadastros”
- [ ] revisar `findMatchingNavLocation()` para identificar corretamente níveis aninhados
- [ ] revisar `findMatchingNavGroup()` para fallback coerente
- [ ] decidir o papel final de `enterpriseConsole`
  - manter fora da árvore principal
  - ou mover para outro ponto do shell

Validação:
```bash
npm test -- navigation.test.ts
```

## 4. Arquivo: `apps/spa/src/router/routes.ts`

Objetivo:
- alinhar rotas canônicas à árvore final.

Checklist:
- [ ] revisar `meta.title`, `breadcrumb` e `breadcrumbParent` de todas as rotas core
- [ ] alinhar rotas de Atendimento à taxonomia final
- [ ] alinhar rotas de Estoque/Fiscal à taxonomia final
- [ ] alinhar rotas de Financeiro à taxonomia final
- [ ] alinhar rotas de RH e Relatórios à taxonomia final
- [ ] revisar aliases para evitar duplicidade conceitual indevida
- [ ] garantir que cada item principal do menu possua rota clara ou estado controlado
- [ ] evitar rotas “escondidas” fora da árvore

Validação:
```bash
npm test -- routes.test.ts navigation.test.ts
npm run build
```

## 5. Arquivo: `apps/spa/src/layouts/AppLayout.vue`

Objetivo:
- refatorar o shell para o padrão Vetus-aligned.

Checklist:
- [ ] simplificar a sidebar para que a árvore principal domine a leitura
- [ ] revisar o comportamento visual do grupo expandido
- [ ] aplicar destaque do grupo ativo mais próximo do benchmark
- [ ] revisar a faixa visual dos subgrupos
- [ ] reposicionar ou recolher Favoritos e Recentes
- [ ] remover competição visual do bloco Enterprise com o menu principal
- [ ] revisar a topbar para enfatizar contexto global, busca, suporte e perfil
- [ ] criar área consistente de breadcrumb acima do conteúdo principal
- [ ] garantir que o título da página não concorra com a topbar
- [ ] manter command palette funcional sem poluir o shell

Testes a criar ou ajustar:
- [ ] `apps/spa/src/layouts/__tests__/AppLayout.test.ts` se ainda não existir

Validação:
```bash
npm test -- navigation.test.ts routes.test.ts
npm run build
```

## 6. Arquivo: `apps/spa/src/stores/app.ts`

Objetivo:
- sustentar o novo comportamento do shell sem carregar complexidade excessiva.

Checklist:
- [ ] revisar se `sidebarCollapsed` continua compatível com a nova anatomia
- [ ] revisar persistência de Favoritos e Recentes após mudança de layout
- [ ] avaliar se algum estado deve sair do store por não ser mais estrutural
- [ ] manter compatibilidade com o mínimo necessário para o shell

## 7. Arquivo: `apps/spa/src/components/AppPageHeader.vue`

Objetivo:
- virar o componente padrão de cabeçalho de todas as páginas.

Checklist:
- [ ] suportar breadcrumb consistente
- [ ] suportar título e subtítulo em hierarquia clara
- [ ] suportar CTA primário destacado
- [ ] suportar ações secundárias sem poluir o topo
- [ ] alinhar anatomia ao benchmark: breadcrumb + título + ações

Arquivo de teste:
- `apps/spa/src/components/__tests__/AppPageHeader.test.ts`

Validação:
```bash
npm test -- src/components/__tests__/AppPageHeader.test.ts
```

## 8. Arquivo: `apps/spa/src/pages/PlaceholderPage.vue`

Objetivo:
- parar de usar estado genérico demais para rotinas não concluídas.

Checklist:
- [ ] diferenciar “em construção” de “sem permissão”
- [ ] diferenciar “indisponível” de “não implementado”
- [ ] permitir mensagens por domínio/subdomínio
- [ ] adicionar CTA coerente com a navegação de retorno
- [ ] evitar texto genérico que esconda status real do produto

## 9. Arquivo: `apps/spa/src/pages/DashboardPage.vue`

Objetivo:
- manter Início como porta de entrada e não como substituto da navegação.

Checklist:
- [ ] revisar shortcuts para aderir à nova árvore
- [ ] remover atalhos que contradigam a taxonomia final
- [ ] garantir que os atalhos reforcem os domínios principais
- [ ] ajustar copies para a narrativa operacional oficial
- [ ] revisar métricas iniciais para não ficarem excessivamente concentradas apenas em Atendimento se a estratégia mudar

Teste relacionado:
- `apps/spa/src/pages/__tests__/DashboardPage.test.ts`

## 10. Arquivo: `apps/spa/src/pages/appointments/AppointmentsListPage.vue`

Objetivo:
- usar Agenda como padrão de módulo premium.

Checklist:
- [ ] revisar breadcrumbs e cabeçalho para a nova árvore
- [ ] garantir coerência da CTA “Criar agendamento”
- [ ] revisar links cruzados para Fila e Atendimento
- [ ] validar se os filtros laterais estão alinhados ao padrão final do shell
- [ ] preservar mini calendário e views mês/semana/dia como referência de qualidade

Teste relacionado:
- `apps/spa/src/pages/appointments/__tests__/AppointmentsListPage.test.ts`

Validação:
```bash
npm test -- src/pages/appointments/__tests__/AppointmentsListPage.test.ts
```

## 11. Arquivo: `apps/spa/src/pages/sales/CounterSalesPage.vue`

Objetivo:
- consolidar Comandas como workbench central do balcão.

Checklist:
- [ ] revisar cabeçalho e breadcrumbs
- [ ] alinhar posição de Comandas na árvore de Atendimento
- [ ] revisar relação com Orçamentos, Caixa e Faturamento
- [ ] revisar cross-links com Tutor, Paciente e Atendimento
- [ ] garantir que o módulo continue sendo referência de densidade operacional

Teste relacionado:
- `apps/spa/src/pages/sales/__tests__/CounterSalesPage.test.ts`

## 12. Arquivo: `apps/spa/src/pages/scheduling/QueuePage.vue`

Objetivo:
- encaixar Fila Operacional no lugar correto do domínio Atendimento.

Checklist:
- [ ] revisar breadcrumb parent
- [ ] revisar labels e títulos
- [ ] revisar links com Agenda e Atendimentos
- [ ] alinhar nomenclatura com a árvore final

Teste relacionado:
- `apps/spa/src/pages/scheduling/__tests__/QueuePage.test.ts`

## 13. Diretório: `apps/spa/src/pages/encounters/`

Objetivo:
- consolidar Atendimentos como rotina central do domínio.

Checklist:
- [ ] revisar `EncountersListPage.vue`
- [ ] revisar `EncounterFormPage.vue`
- [ ] revisar `EncounterDetailPage.vue`
- [ ] alinhar breadcrumbs, CTA e textos com nova árvore
- [ ] reforçar links para Pacientes, Tutores, Agenda, Triagem e Prontuário

Testes:
- `src/pages/encounters/__tests__/EncountersListPage.test.ts`
- `src/pages/encounters/__tests__/EncounterFormPage.test.ts`
- `src/pages/encounters/__tests__/EncounterDetailPage.test.ts`

## 14. Diretório: `apps/spa/src/pages/inpatient/`

Objetivo:
- encaixar Internação como subdomínio explícito de Atendimento.

Checklist:
- [ ] revisar `InpatientListPage.vue`
- [ ] revisar `InpatientDetailPage.vue`
- [ ] revisar `BedBoardPage.vue`
- [ ] revisar `SectorsPage.vue`
- [ ] revisar `BedsPage.vue`
- [ ] alinhar todos os breadcrumbs sob Internação

## 15. Diretórios: `apps/spa/src/pages/patients/`, `owners/`, `services/`

Objetivo:
- consolidar Cadastros-base de Atendimento.

Checklist:
- [ ] revisar todos os list/detail/form pages
- [ ] alinhar parent breadcrumb com Cadastros ou equivalente aprovado
- [ ] alinhar textos e atalhos com a nova árvore
- [ ] revisar coerência entre Pacientes, Tutores e Serviços

## 16. Diretório: `apps/spa/src/pages/laboratory/`

Objetivo:
- reorganizar Laboratório na taxonomia final.

Checklist:
- [ ] revisar `LaboratoryHubPage.vue` como landing page e não destino único
- [ ] explicitar Exames, Laudos/Resultados, Hemogramas, Urina e Bioquímico na navegação
- [ ] revisar pages de equipment, report-types e reference-values
- [ ] alinhar breadcrumbs com “Atendimentos” e “Cadastrados”

## 17. Diretórios: `apps/spa/src/pages/inventory/`, `products/`, `fiscal/`

Objetivo:
- consolidar a leitura de Estoque/Fiscal como bloco ERP coeso.

Checklist inventory:
- [ ] revisar list/form/detail/movements/validity
- [ ] alinhar breadcrumbs sob Controles

Checklist products:
- [ ] alinhar Produtos sob Cadastrados
- [ ] revisar quick actions para não contradizer a nova árvore
- [ ] criar teste se ainda não existir `ProductsListPage.test.ts`

Checklist fiscal:
- [ ] revisar config, ICMS, PIS/COFINS, CFOP, NFS-e, NCM, Matriz ICMS
- [ ] alinhar sob Configurações Fiscais
- [ ] expor estados transitórios onde faltar superfície real

## 18. Diretórios: `apps/spa/src/pages/billing/` e `finance/`

Objetivo:
- aprofundar Financeiro e remover ambiguidades conceituais.

Checklist:
- [ ] revisar `BillingListPage.vue`
- [ ] revisar `BillingDetailPage.vue`
- [ ] revisar `PixPage.vue`
- [ ] revisar `CashPage.vue`
- [ ] mapear lacunas para contas a receber/pagar, transações e cadastros financeiros
- [ ] criar placeholders específicos e honestos onde a árvore final exigir páginas novas

## 19. Diretórios: `apps/spa/src/pages/users/` e `staff/`

Objetivo:
- consolidar RH com profundidade correta.

Checklist:
- [ ] revisar UsersList, UserForm e UserDetail
- [ ] revisar StaffList, StaffForm e StaffDetail
- [ ] alinhar com subgrupos Usuários, Comissões e Cadastros
- [ ] separar semanticamente RH de Governança de Acesso
- [ ] preparar pontos de extensão para Comissões

## 20. Arquivo: `apps/spa/src/pages/commercial-reports/CommercialReportsPage.vue`

Objetivo:
- transformar Relatórios em landing page coerente com árvore por domínio.

Checklist:
- [ ] revisar título e breadcrumb
- [ ] decidir se a página é hub executivo ou landing page dos relatórios
- [ ] criar atalhos claros para relatórios por domínio
- [ ] impedir que a página substitua toda a camada de relatórios

## 21. Testes adicionais a criar onde faltarem

Checklist:
- [ ] criar `apps/spa/src/layouts/__tests__/AppLayout.test.ts` se inexistente
- [ ] criar testes para páginas novas de relatórios, fiscal ou financeiro, se surgirem
- [ ] criar teste para Produtos se a página continuar sendo pivô do domínio
- [ ] reforçar smoke tests de rotas críticas

## 22. Comandos padrão por ciclo curto

No diretório `apps/spa`:

Rodada fundacional:
```bash
npm test -- navigation.test.ts routes.test.ts src/components/__tests__/AppPageHeader.test.ts
npm run build
```

Rodada Atendimento:
```bash
npm test -- \
  src/pages/appointments/__tests__/AppointmentsListPage.test.ts \
  src/pages/sales/__tests__/CounterSalesPage.test.ts \
  src/pages/scheduling/__tests__/QueuePage.test.ts \
  src/pages/encounters/__tests__/EncountersListPage.test.ts \
  src/pages/inpatient/__tests__/InpatientListPage.test.ts
```

Rodada domínios densos:
```bash
npm test -- \
  src/pages/inventory/__tests__/InventoryListPage.test.ts \
  src/pages/billing/__tests__/BillingListPage.test.ts \
  src/pages/users/__tests__/UsersListPage.test.ts
```

Rodada completa:
```bash
npm test
npm run build
```

## 23. Definição de pronto por arquivo alterado

Um arquivo só pode ser considerado concluído quando:
- [ ] aderiu à árvore final aprovada
- [ ] breadcrumbs ficaram corretos
- [ ] CTA principal ficou coerente
- [ ] labels e textos ficaram consistentes com o domínio
- [ ] links cruzados não contradizem a navegação
- [ ] testes relevantes passaram
- [ ] build do SPA continuou íntegro

## 24. Sequência prática para começar hoje

Primeira sessão de implementação recomendada:
- [ ] alterar `navigation.test.ts`
- [ ] alterar `routes.test.ts`
- [ ] refatorar `navigation.ts`
- [ ] refatorar `routes.ts`
- [ ] refatorar `AppLayout.vue`
- [ ] refatorar `AppPageHeader.vue`
- [ ] ajustar `PlaceholderPage.vue`
- [ ] rodar `npm test`
- [ ] rodar `npm run build`

Quando essa base estiver estável, abrir o domínio Atendimento como segunda sessão de trabalho.