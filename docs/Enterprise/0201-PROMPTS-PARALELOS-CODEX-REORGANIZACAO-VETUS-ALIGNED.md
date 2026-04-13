# 0201 - Prompts Paralelos Codex Reorganizacao Vetus-Aligned

**Status:** pronto para uso  
**Data:** 2026-04-12  
**Objetivo:** acelerar a reorganizacao do `cvg-his-v2` com 4 frentes paralelas, com escopos bem separados para reduzir conflito de arquivo e permitir integracao controlada.

---

## 1. Regras para uso dos prompts em paralelo

Antes de rodar os 4 prompts:

- usar uma branch por frente ou um agente por workspace separado
- nao permitir que dois agentes editem os mesmos arquivos
- centralizar a integracao final no maintainer principal
- obrigar cada agente a entregar:
  - resumo executivo
  - arquivos alterados
  - riscos
  - pendencias
  - validacao executada

### Regras de ouro

- preservar todos os upgrades enterprise do `cvg-his-v2`
- `apps/spa` continua sendo o frontend oficial
- nao reintroduzir nada em `apps/web` alem do estritamente necessario
- nao fazer clone literal do Vetus
- reorganizar pela logica Vetus, manter execucao tecnica superior do CVG

---

## 2. Prompt 1 - Arquitetura de Informacao e Navbar

**Objetivo da frente:** fechar taxonomia, mapa de menu, labels, breadcrumbs e estrutura oficial da nova navegacao.

**Write scope recomendado:**

- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/layouts/AppLayout.vue`
- `apps/spa/src/navigation.test.ts`
- docs de apoio estritamente relacionadas a menu e taxonomia

**Nao editar:**

- paginas de dominio em `apps/spa/src/pages/**`
- servicos de negocio
- modulos de backend

### Prompt

```text
Voce esta trabalhando no repositorio `/root/.openclaw/workspace/cvg-his-v2`.

Contexto obrigatorio:
- Leia primeiro:
  - `docs/Enterprise/0197-PLANO-GERAL-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0198-ROADMAP-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0199-BACKLOG-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0200-MATRIZ-CONSTRUCAO-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `vetus-screenshots/00-NAVBAR-ESTRUTURA-COMPLETA.md`
  - `vetus-screenshots/docs/01-VETUS-NAVBAR-ESTRUTURA-COMPLETA.md`
- Inspecione:
  - `apps/spa/src/navigation.ts`
  - `apps/spa/src/router/routes.ts`
  - `apps/spa/src/layouts/AppLayout.vue`

Missao:
- Reorganizar a arquitetura de informacao do shell para o modelo Vetus-aligned.
- O navbar principal deve ficar com estes grupos:
  - Início
  - Atendimento
  - Laboratório
  - Estoque
  - Financeiro
  - Marketing
  - RH
  - Relatórios
- Preserve command palette, favoritos, recentes, dark mode, breadcrumbs e todos os upgrades premium enterprise.
- Nao faca clone visual do Vetus. Aplique a organizacao Vetus, mantendo a base moderna do CVG.
- Onde houver capacidades enterprise que nao pertencem ao menu ERP principal, posicione-as de forma secundaria e consistente no shell.

Escopo de edicao:
- Voce so pode editar:
  - `apps/spa/src/navigation.ts`
  - `apps/spa/src/router/routes.ts`
  - `apps/spa/src/layouts/AppLayout.vue`
  - `apps/spa/src/navigation.test.ts`
  - docs estritamente relacionadas ao shell, se necessario
- Nao altere paginas de dominio.
- Nao altere backend.

Entregas esperadas:
- novo mapa oficial do menu
- labels e breadcrumbs coerentes com a nova taxonomia
- command palette refletindo a nova estrutura
- favoritos/recentes sem regressao
- testes ajustados para a navegacao nova

Validacao minima:
- rodar os testes focados da navegacao/layout se existirem
- informar arquivos alterados
- apontar riscos ou pendencias

Formato da resposta final:
- resumo curto
- arquivos alterados
- validacao executada
- pendencias
```

---

## 3. Prompt 2 - Inicio + Atendimento + Internacao

**Objetivo da frente:** reorganizar o dominio operacional principal para refletir a jornada Vetus-like de recepcao, agenda, fila, atendimento, prontuario e internacao.

**Write scope recomendado:**

- `apps/spa/src/pages/DashboardPage.vue`
- paginas de `appointments`
- paginas de `scheduling`
- paginas de `encounters`
- paginas de `patients`
- paginas de `owners`
- paginas de `medical-records`
- paginas de `triage`
- paginas de `inpatient`

**Nao editar:**

- `navigation.ts`
- `AppLayout.vue`
- financeiro
- laboratorio
- marketing
- RH

### Prompt

```text
Voce esta trabalhando no repositorio `/root/.openclaw/workspace/cvg-his-v2`.

Contexto obrigatorio:
- Leia primeiro:
  - `docs/Enterprise/0197-PLANO-GERAL-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0198-ROADMAP-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0199-BACKLOG-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0200-MATRIZ-CONSTRUCAO-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
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
- Transformar `Início` e `Atendimento` nas jornadas mais fortes do produto.
- Reorganizar semanticamente a experiência para que:
  - pacientes e tutores pertençam ao fluxo de Atendimento
  - agenda, fila, triagem, atendimento e prontuario contem a mesma jornada
  - internacao seja percebida como subdominio de atendimento
- Preserve a arquitetura moderna do CVG:
  - hub pages
  - quick actions
  - cards de KPI
  - EmptyState
  - SkeletonLoader
  - design system existente
- Use o Vetus como referencia de organizacao, nao de visual legacy.

Escopo de edicao:
- Voce pode editar apenas:
  - `apps/spa/src/pages/DashboardPage.vue`
  - `apps/spa/src/pages/appointments/**`
  - `apps/spa/src/pages/scheduling/**`
  - `apps/spa/src/pages/encounters/**`
  - `apps/spa/src/pages/patients/**`
  - `apps/spa/src/pages/owners/**`
  - `apps/spa/src/pages/medical-records/**`
  - `apps/spa/src/pages/triage/**`
  - `apps/spa/src/pages/inpatient/**`
  - componentes compartilhados se forem estritamente necessarios a esse fluxo
- Nao edite `navigation.ts` nem `AppLayout.vue`.
- Nao edite financeiro, laboratorio, RH ou marketing.

Entregas esperadas:
- dashboard mais operacional
- hubs de pacientes/tutores/atendimento mais alinhados ao fluxo real
- internacao mais claramente conectada ao atendimento
- CTA e nomenclatura coerentes com o programa Vetus-aligned

Validacao minima:
- rodar testes focados das paginas alteradas
- informar se houve necessidade de criar pequenos componentes compartilhados
- listar qualquer dependencia do Prompt 1

Formato da resposta final:
- resumo curto
- arquivos alterados
- validacao executada
- pendencias
```

---

## 4. Prompt 3 - Laboratorio + Estoque + Fiscal

**Objetivo da frente:** materializar o dominio `Laboratório` como grupo de primeira classe e aprofundar `Estoque` para modelo ERP.

**Write scope recomendado:**

- paginas de `clinical/DiagnosticsPage.vue`
- eventuais novas paginas de `laboratory/**`
- paginas de `inventory`
- paginas de `products`
- paginas de `services` apenas se precisarem ser reposicionadas semanticamente
- docs de modulo dessas frentes

**Nao editar:**

- shell e layout global
- atendimento/internacao
- financeiro
- RH/marketing

### Prompt

```text
Voce esta trabalhando no repositorio `/root/.openclaw/workspace/cvg-his-v2`.

Contexto obrigatorio:
- Leia primeiro:
  - `docs/Enterprise/0197-PLANO-GERAL-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0198-ROADMAP-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0199-BACKLOG-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0200-MATRIZ-CONSTRUCAO-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `vetus-screenshots/docs/modulos/04-RELATORIO-LABORATORIO.md`
  - `vetus-screenshots/docs/modulos/01-RELATORIO-FINANCEIRO.md` apenas nas partes de estoque/cadastros correlatos
- Inspecione:
  - `packages/modules/diagnostics`
  - `packages/modules/inventory`
  - `packages/modules/products`
  - `packages/modules/services`
  - `packages/modules/fiscal`
  - `apps/spa/src/pages/clinical/**`
  - `apps/spa/src/pages/inventory/**`
  - `apps/spa/src/pages/products/**`
  - `apps/spa/src/pages/services/**`

Missao:
- Criar a narrativa de produto para `Laboratório` e aprofundar `Estoque` no padrao ERP.
- O dominio de laboratorio deve ficar claro para o usuario.
- O dominio de estoque deve sair da condicao de catalogo raso e ganhar cara de backoffice.
- Aproveite ao maximo o que ja existe no backend e no schema.
- Nao invente estruturas paralelas desnecessarias.

Escopo de edicao:
- pode editar paginas e componentes dessas frentes
- pode criar novas paginas de `laboratory` se isso for o melhor desenho
- pode ajustar docs estritamente dessas areas
- nao pode editar `AppLayout.vue` nem `navigation.ts`
- nao pode editar financeiro, RH, marketing ou relatorios globais

Entregas esperadas:
- proposta concreta ou implementacao inicial de grupo Laboratorio
- diagnostics desmembrado semanticamente em exames/laudos e futuras especialidades
- inventory/products com linguagem mais ERP
- recomendacao clara sobre onde `services` deve ficar no produto

Validacao minima:
- testes das paginas alteradas
- apontar se alguma rota depende do Prompt 1
- listar backlog residual das lacunas laboratoriais

Formato da resposta final:
- resumo curto
- arquivos alterados
- validacao executada
- pendencias
```

---

## 5. Prompt 4 - Financeiro + Marketing + RH + Console Enterprise

**Objetivo da frente:** consolidar o backoffice administrativo e separar o que e ERP do que e plataforma enterprise.

**Write scope recomendado:**

- paginas de `billing`
- paginas de `finance`
- paginas de `notifications`
- paginas de `users`
- paginas de `staff`
- paginas de `access-control`
- paginas de `audit`
- paginas de `lgpd`
- paginas de `api-client`, `api-keys`, `webhooks`
- docs operacionais dessa camada

**Nao editar:**

- shell global
- atendimento
- laboratorio/estoque

### Prompt

```text
Voce esta trabalhando no repositorio `/root/.openclaw/workspace/cvg-his-v2`.

Contexto obrigatorio:
- Leia primeiro:
  - `docs/Enterprise/0197-PLANO-GERAL-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0198-ROADMAP-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0199-BACKLOG-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `docs/Enterprise/0200-MATRIZ-CONSTRUCAO-REORGANIZACAO-VETUS-ALIGNED-PREMIUM-ENTERPRISE.md`
  - `vetus-screenshots/docs/modulos/01-RELATORIO-FINANCEIRO.md`
  - `vetus-screenshots/docs/modulos/02-RELATORIO-COMISSOES.md`
  - `vetus-screenshots/docs/00-VETUS-RELATORIO-COMPLETO.md` nas partes de RH, Marketing e Relatorios
- Inspecione:
  - `apps/spa/src/pages/billing/**`
  - `apps/spa/src/pages/finance/**`
  - `apps/spa/src/pages/notifications/**`
  - `apps/spa/src/pages/users/**`
  - `apps/spa/src/pages/staff/**`
  - `apps/spa/src/pages/access-control/**`
  - `apps/spa/src/pages/audit/**`
  - `apps/spa/src/pages/lgpd/**`
  - `apps/spa/src/pages/api-client/**`
  - `apps/spa/src/pages/api-keys/**`
  - `apps/spa/src/pages/webhooks/**`

Missao:
- Reorganizar semanticamente as camadas:
  - Financeiro
  - Marketing
  - RH
  - Console Enterprise
- Preserve todos os upgrades do CVG:
  - MFA
  - LGPD
  - auditoria
  - webhooks
  - API keys
  - API client
  - integrações
- O menu ERP principal deve ganhar narrativa de negocio.
- O que for recurso de plataforma enterprise deve migrar para um console secundario ou pelo menos ser preparado semanticamente para isso.

Escopo de edicao:
- pode editar apenas as paginas dessas frentes
- nao pode editar `navigation.ts` nem `AppLayout.vue`
- nao pode editar atendimento, laboratorio ou estoque
- se precisar criar componentes compartilhados, eles devem ser claramente restritos a essas areas

Entregas esperadas:
- financeiro com linguagem de ERP e nao de modulo isolado
- notifications com narrativa de Marketing/Relacionamento
- users/staff/access-control/mfa com narrativa de RH e governanca humana
- api-client, api-keys, webhooks e afins preparados como console enterprise
- recomendacao explicita do que fica no menu principal e do que deve ir para o console secundario

Validacao minima:
- testes focados das paginas alteradas
- lista clara de dependencias do Prompt 1
- lista de gaps residuais de AR/AP/comissoes/campanhas

Formato da resposta final:
- resumo curto
- arquivos alterados
- validacao executada
- pendencias
```

---

## 6. Ordem ideal de disparo

Se for realmente executar em paralelo, a ordem recomendada de disparo e:

1. **Prompt 1** primeiro
2. **Prompt 2, 3 e 4** em paralelo logo depois

### Motivo

Prompt 1 fecha a taxonomia do shell.  
Os prompts 2 a 4 podem trabalhar em paralelo porque seus write scopes sao majoritariamente separados e dependem apenas do mapa conceitual do Prompt 1, nao do merge final dele.

---

## 7. Ritual de integracao sugerido

Depois das 4 frentes:

1. integrar primeiro a frente `Prompt 1`
2. integrar `Prompt 2`
3. integrar `Prompt 3`
4. integrar `Prompt 4`
5. atualizar a matriz `0200`
6. reclassificar itens do backlog `0199`

---

## 8. Resultado esperado

Se os 4 prompts forem executados com disciplina de write scope, o programa deve ganhar:

- menu principal coerente
- frentes operacionais reorganizadas
- backoffice administrativo mais claro
- separacao limpa entre ERP e plataforma enterprise

Esse e o melhor ponto de partida para acelerar a implementacao sem perder controle arquitetural.
