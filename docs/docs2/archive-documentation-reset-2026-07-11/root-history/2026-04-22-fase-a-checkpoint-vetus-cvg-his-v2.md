# Checkpoint técnico — Fase A concluída parcialmente com convergência estrutural

Data: 2026-04-22
Status: checkpoint operacional
Escopo: shell, navegação, breadcrumbs, taxonomia e principais superfícies do SPA

## 1. Objetivo deste checkpoint

Registrar o que já convergiu na Fase A, o que foi efetivamente implementado no código, o que foi validado por teste e quais frentes ainda faltam para fechar a camada estrutural Vetus-aligned antes da próxima expansão de domínio.

## 2. O que já convergiu

## 2.1 Contrato e documentação de navegação
Documentos criados:
- `docs/navigation-contract-vetus-aligned.md`
- `docs/navigation-matrix-current-vs-target.md`
- `docs/navigation-copy-and-breadcrumb-conventions.md`
- `docs/routine-state-model.md`
- `docs/2026-04-22-sprint-1-tarefas-executaveis-vetus-cvg-his-v2.md`

Resultado:
- a árvore domínio > subdomínio > rotina está explicitada;
- existe matriz atual vs alvo;
- labels, breadcrumbs e estados têm convenção formal;
- a Fase A saiu do plano conceitual e entrou em implementação real.

## 2.2 Shell e layout estrutural
Arquivos impactados:
- `apps/spa/src/layouts/AppLayout.vue`
- `apps/spa/src/components/AppPageHeader.vue`
- `apps/spa/src/components/__tests__/AppPageHeader.test.ts`

Convergências já entregues:
- topbar com breadcrumbs e subtítulo contextual;
- contexto de empresa explicitado na sidebar;
- árvore operacional principal com menor competição visual;
- Enterprise, Favoritos e Recentes rebaixados para grupos utilitários colapsáveis;
- destaque mais claro de grupo ativo e seção ativa;
- `AppPageHeader` com suporte explícito a breadcrumbs.

## 2.3 Navegação e rotas
Arquivos impactados:
- `apps/spa/src/navigation.ts`
- `apps/spa/src/navigation.test.ts`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/router/routes.test.ts`

Convergências já entregues:
- Atendimento usa `Cadastros` em vez de `Cadastrados`;
- Estoque usa `Configurações Fiscais`;
- Financeiro já expõe `Gaveta`, `Controles`, `Maquininha de Cartão` e `Cadastros` na navegação;
- RH já expõe `Usuários`, `Comissões` e `Cadastros` na navegação;
- `breadcrumbParent` foi reorientado para a taxonomia nova em rotas-chave.

## 3. Superfícies já alinhadas com breadcrumbs explícitos

## 3.1 Início
- `DashboardPage.vue`

## 3.2 Atendimento > Atendimentos
- `AppointmentsListPage.vue`
- `CounterSalesPage.vue`

## 3.3 Atendimento > Cadastros
Pacientes:
- `PatientsListPage.vue`
- `PatientDetailPage.vue`
- `PatientFormPage.vue`

Tutores:
- `OwnersListPage.vue`
- `OwnerDetailPage.vue`
- `OwnerFormPage.vue`

Serviços:
- `ServicesListPage.vue`
- `ServiceDetailPage.vue`
- `ServiceFormPage.vue`

## 3.4 Estoque > Controles
- `InventoryListPage.vue`
- `InventoryDetailPage.vue`
- `InventoryFormPage.vue`
- `InventoryMovementsPage.vue`
- `InventoryValidityPage.vue`

## 3.5 Estoque > Cadastrados
- `ProductsListPage.vue`
- `ProductDetailPage.vue`
- `ProductFormPage.vue`

## 3.6 Estoque > Configurações Fiscais
- `FiscalConfigPage.vue`
- `FiscalICMSPage.vue`
- `FiscalPisCofinsPage.vue`
- `FiscalCfopPage.vue`
- `FiscalNFSELayoutPage.vue`
- `FiscalNcmPage.vue`
- `FiscalICMSMatrixPage.vue`

## 3.7 Financeiro > Controles
- `BillingListPage.vue`
- `BillingDetailPage.vue`

## 3.8 Financeiro > Gaveta / Maquininha de Cartão
- `CashPage.vue`
- `PixPage.vue`

## 3.9 RH > Usuários
- `UsersListPage.vue`
- `StaffListPage.vue`
- `StaffDetailPage.vue`
- `StaffFormPage.vue`

## 3.10 Relatórios
- `CommercialReportsPage.vue`

## 3.11 Laboratório
- `LaboratoryHubPage.vue`

## 4. Evidência de validação

Suítes executadas com sucesso ao longo da Fase A:
- `src/navigation.test.ts`
- `src/router/routes.test.ts`
- `src/components/__tests__/AppPageHeader.test.ts`
- blocos de páginas de patients/owners/services/inventory/billing/users

Status observado repetidamente:
- testes estruturais passando;
- contrato de navegação convergindo;
- breadcrumbs explícitos não quebraram as páginas já cobertas.

## 5. Dívidas e alertas conhecidos

## 5.1 Warnings de teardown no ambiente de teste
Há warnings recorrentes de:
- `EnvironmentTeardownError`
- imports tardios de estilos `.vue`
- Vue Router iniciando com imports assíncronos do shell/design system no teardown

Interpretação:
- não bloquearam a validação até agora;
- valem ser tratados em uma trilha de estabilidade de testes, mas não impedem seguir com a evolução estrutural.

## 5.2 `navigation.ts` ainda tem seções vazias
Ainda vazias ou apenas esboçadas:
- Financeiro > Cadastros
- RH > Comissões
- RH > Cadastros

Isso é coerente com a estratégia da Fase A, mas passa a ser prioridade da próxima expansão estrutural.

## 6. Auditoria de páginas ainda sem breadcrumbs explícitos

A auditoria encontrou páginas com `AppPageHeader` ainda sem `:breadcrumbs` explícitos, incluindo grupos como:
- access-control
- api-client
- api-keys
- audit
- diagnostics
- clinical/*
- encounters/*
- inpatient/*
- laboratory/* além do hub
- lgpd
- master-search
- medical-records/*
- notifications/*
- sales/QuotesPage.vue
- scheduling/* legado
- triage/*
- users detail/form
- webhooks/*

Conclusão:
- a Fase A já cobriu as superfícies mais sensíveis da taxonomia principal;
- ainda existe uma segunda camada de páginas sem breadcrumb explícito;
- a partir daqui, vale atacar por blocos de domínio, não página a página aleatória.

## 7. Leitura executiva do estado atual

A Fase A já atingiu o objetivo principal de fundação:
- shell mais alinhado ao benchmark;
- taxonomia principal refletida em navegação e rotas;
- headers e breadcrumbs estruturados;
- macrodomínios mais relevantes já comunicam melhor o produto.

O sistema ainda não está “completo” no modelo final, mas já saiu do estágio de inconsistência estrutural difusa.

## 8. Critério de fechamento da Fase A

A Fase A pode ser considerada funcionalmente bem encaminhada porque:
- contrato documental existe;
- shell foi reestruturado;
- rotas principais foram realinhadas;
- superfícies centrais dos macrodomínios principais já usam breadcrumbs explícitos;
- testes estruturais continuam verdes.

Ela só não está 100% encerrada porque ainda restam páginas sem breadcrumb explícito em domínios secundários e enterprise.

## 9. Recomendação oficial de próxima onda

Em vez de continuar espalhando breadcrumbs individualmente, a próxima onda deve ser de expansão estrutural real.

Prioridades recomendadas:
1. Financeiro > Cadastros
2. RH > Comissões / Cadastros
3. Estoque > Cadastrados adicionais
4. Relatórios por domínio

## 10. Commit lógico sugerido para checkpoint

```bash
git add docs/2026-04-22-fase-a-checkpoint-vetus-cvg-his-v2.md
git commit -m "docs: add phase-a checkpoint for vetus-aligned shell convergence"
```