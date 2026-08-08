# Sprint 1 — tarefas executáveis com ordem e commits sugeridos

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** congelar o contrato de informação do shell Vetus-aligned no CVG-HIS V2, preparando a base segura para a Fase A de implementação sem retrabalho estrutural.

**Architecture:** este sprint não é um redesign visual completo; ele é um sprint de definição e convergência. A ideia é primeiro consolidar a árvore oficial domínio > subdomínio > rotina, depois refletir isso nos testes estruturais, e só então preparar os artefatos que vão guiar a execução da Fase A. O foco está em contrato, nomenclatura, mapeamento e critérios de aceite.

**Tech Stack:** documentação em Markdown, Vue Router, navigation contract do SPA, Vitest para testes estruturais, TypeScript.

---

## Resultado esperado do Sprint 1

Ao final deste sprint, a equipe deve ter:
- uma árvore oficial e congelada de navegação;
- uma matriz atual vs alvo aprovada;
- convenções de labels e breadcrumbs definidas;
- critérios claros para estados de rotina;
- testes estruturais preparados para a Fase A;
- ordem técnica confirmada para iniciar implementação.

## Regras do sprint

- nenhuma mudança visual grande no shell entra antes do contrato de navegação;
- toda alteração estrutural deve nascer da árvore oficial;
- páginas em estado transitório precisam de status explícito;
- os commits devem ser pequenos e legíveis.

## Tarefa 1 — Consolidar a árvore canônica de domínio > subdomínio > rotina

**Objective:** produzir a definição única da arquitetura de informação alvo.

**Files:**
- Create: `docs/navigation-contract-vetus-aligned.md`
- Reference: `docs/2026-04-22-plano-executivo-vetus-cvg-his-v2.md`
- Reference: `docs/2026-04-22-roadmap-vetus-cvg-his-v2.md`
- Reference: `docs/2026-04-22-backlog-vetus-cvg-his-v2.md`

**Passos:**
1. Criar o documento canônico com os grupos principais:
   - Início
   - Atendimento
   - Laboratório
   - Estoque
   - Financeiro
   - Marketing
   - RH
   - Relatórios
2. Para cada grupo, definir subdomínios oficiais.
3. Para cada subdomínio, listar rotinas.
4. Marcar cada rotina como:
   - existente
   - a mover
   - a renomear
   - em construção
   - planejada
5. Adicionar notas de fronteira entre domínios que hoje se sobrepõem.

**Critério de aceite:**
- o documento pode ser usado como contrato único por Product, UX e Front-end.

**Commit sugerido:**
```bash
git add docs/navigation-contract-vetus-aligned.md
git commit -m "docs: add canonical vetus-aligned navigation contract"
```

## Tarefa 2 — Criar matriz atual vs alvo

**Objective:** mapear exatamente como o sistema está hoje versus como deve ficar.

**Files:**
- Create: `docs/navigation-matrix-current-vs-target.md`
- Reference: `apps/spa/src/navigation.ts`
- Reference: `apps/spa/src/router/routes.ts`

**Passos:**
1. Listar todos os grupos e rotas hoje expostos no menu.
2. Mapear cada rota para o grupo/subgrupo alvo.
3. Marcar o tipo de ação necessária:
   - manter
   - mover
   - renomear
   - criar alias
   - criar placeholder específico
   - remover do menu principal
4. Marcar itens com maior risco de retrabalho.

**Critério de aceite:**
- cada rota importante do SPA tem destino claro no modelo alvo.

**Commit sugerido:**
```bash
git add docs/navigation-matrix-current-vs-target.md
git commit -m "docs: add current-vs-target navigation matrix"
```

## Tarefa 3 — Congelar convenções de labels, breadcrumbs e CTA primário

**Objective:** impedir inconsistência de nomenclatura durante a implementação.

**Files:**
- Create: `docs/navigation-copy-and-breadcrumb-conventions.md`

**Passos:**
1. Definir label oficial de cada grupo.
2. Definir labels oficiais de subgrupos.
3. Definir padrão para breadcrumb:
   - domínio
   - subdomínio
   - rotina
   - detalhe
   - edição
   - novo cadastro
4. Definir convenção de CTA principal por tipo de página:
   - listagem
   - detalhe
   - dashboard de domínio
   - rotina operacional
5. Definir convenção de título/subtítulo.

**Critério de aceite:**
- qualquer dev consegue preencher `meta.title`, `breadcrumb` e header sem improviso.

**Commit sugerido:**
```bash
git add docs/navigation-copy-and-breadcrumb-conventions.md
git commit -m "docs: define labels breadcrumbs and primary cta conventions"
```

## Tarefa 4 — Definir estados oficiais de rotina

**Objective:** eliminar ambiguidade entre rotina pronta, parcial ou indisponível.

**Files:**
- Create: `docs/routine-state-model.md`
- Reference: `apps/spa/src/pages/PlaceholderPage.vue`

**Passos:**
1. Definir os estados oficiais:
   - funcional
   - em construção
   - sem permissão
   - sem integração
   - planejado
   - legado mapeado
2. Definir copy padrão por estado.
3. Definir CTA de retorno por estado.
4. Definir quando a rotina aparece no menu principal e quando não aparece.
5. Definir quando usar placeholder genérico e quando usar placeholder específico.

**Critério de aceite:**
- a equipe sabe exatamente como expor rotinas incompletas sem confundir usuário.

**Commit sugerido:**
```bash
git add docs/routine-state-model.md
git commit -m "docs: define official routine state model"
```

## Tarefa 5 — Preparar testes estruturais de navegação

**Objective:** transformar o contrato em expectativa verificável antes da Fase A.

**Files:**
- Modify: `apps/spa/src/navigation.test.ts`
- Modify: `apps/spa/src/router/routes.test.ts`

**Step 1: Escrever testes para a árvore alvo**

Cobrir no mínimo:
- grupos principais oficiais;
- subgrupos obrigatórios de Atendimento;
- subgrupos obrigatórios de Estoque;
- subgrupos obrigatórios de Financeiro;
- subgrupos obrigatórios de RH;
- convergência de breadcrumb nas rotas canônicas;
- exclusão de rotas legadas da navegação principal quando aplicável.

**Step 2: Rodar testes para confirmar a lacuna atual**

Run:
```bash
npm test -- navigation.test.ts routes.test.ts
```

Expected:
- falhas coerentes com o trabalho que será feito na Fase A.

**Step 3: Registrar os gaps encontrados no documento do sprint**

Adicionar uma seção final com:
- testes que falharam;
- motivo;
- quais arquivos da Fase A precisam absorver o ajuste.

**Critério de aceite:**
- os testes novos descrevem corretamente o alvo futuro.

**Commit sugerido:**
```bash
git add apps/spa/src/navigation.test.ts apps/spa/src/router/routes.test.ts
git commit -m "test: codify target vetus-aligned navigation contract"
```

## Tarefa 6 — Definir backlog técnico da Fase A em ordem de execução real

**Objective:** transformar o checklist técnico em sequência operacional curta para começar no próximo ciclo.

**Files:**
- Modify: `docs/2026-04-22-checklist-tecnico-por-arquivo-vetus-cvg-his-v2.md`
- Reference: `docs/2026-04-22-sprint-1-tarefas-executaveis-vetus-cvg-his-v2.md`

**Passos:**
1. Marcar explicitamente o bloco de início:
   - navigation tests
   - routes tests
   - navigation.ts
   - routes.ts
   - AppLayout.vue
   - AppPageHeader.vue
   - PlaceholderPage.vue
2. Identificar dependências entre arquivos.
3. Quebrar em lotes de execução de 1 dia.
4. Indicar quais tasks devem gerar commit separado.

**Critério de aceite:**
- a Fase A pode começar sem nova rodada de planejamento.

**Commit sugerido:**
```bash
git add docs/2026-04-22-checklist-tecnico-por-arquivo-vetus-cvg-his-v2.md docs/2026-04-22-sprint-1-tarefas-executaveis-vetus-cvg-his-v2.md
git commit -m "docs: refine phase-a execution order from sprint 1 outputs"
```

## Tarefa 7 — Validação cruzada com stakeholders

**Objective:** obter aceite explícito antes da implementação estrutural.

**Files:**
- No file required, but optionally update:
  - `docs/navigation-contract-vetus-aligned.md`
  - `docs/navigation-matrix-current-vs-target.md`

**Passos:**
1. Revisar contrato de navegação com Product.
2. Revisar shell e nomenclatura com UX.
3. Revisar impacto técnico com Front-end Lead.
4. Revisar dependências com Integration Owner.
5. Consolidar mudanças finais.

**Critério de aceite:**
- existe sinal verde para iniciar a Fase A sem ambiguidade estrutural.

**Commit sugerido:**
```bash
git add docs/navigation-contract-vetus-aligned.md docs/navigation-matrix-current-vs-target.md docs/navigation-copy-and-breadcrumb-conventions.md docs/routine-state-model.md
git commit -m "docs: approve sprint 1 navigation and routine state decisions"
```

## Tarefa 8 — Fechamento formal do sprint

**Objective:** encerrar Sprint 1 com uma saída operacional clara para o Sprint 2 / Fase A.

**Files:**
- Modify: `docs/2026-04-22-plano-de-execucao-por-sprint-vetus-cvg-his-v2.md`
- Modify: `docs/2026-04-22-backlog-vetus-cvg-his-v2.md`

**Passos:**
1. Marcar Sprint 1 como concluído documentalmente.
2. Atualizar backlog com decisões finais.
3. Se necessário, reclassificar itens P0/P1 pela nova matriz.
4. Escrever a seção “Ready for Phase A”.

**Critério de aceite:**
- o programa está pronto para sair do planejamento e entrar em implementação estrutural.

**Commit sugerido:**
```bash
git add docs/2026-04-22-plano-de-execucao-por-sprint-vetus-cvg-his-v2.md docs/2026-04-22-backlog-vetus-cvg-his-v2.md
git commit -m "docs: close sprint 1 and mark phase a ready"
```

## Ordem recomendada dos commits do Sprint 1

1.
```bash
git commit -m "docs: add canonical vetus-aligned navigation contract"
```

2.
```bash
git commit -m "docs: add current-vs-target navigation matrix"
```

3.
```bash
git commit -m "docs: define labels breadcrumbs and primary cta conventions"
```

4.
```bash
git commit -m "docs: define official routine state model"
```

5.
```bash
git commit -m "test: codify target vetus-aligned navigation contract"
```

6.
```bash
git commit -m "docs: refine phase-a execution order from sprint 1 outputs"
```

7.
```bash
git commit -m "docs: approve sprint 1 navigation and routine state decisions"
```

8.
```bash
git commit -m "docs: close sprint 1 and mark phase a ready"
```

## Resultado parcial já executado

Os artefatos documentais do Sprint 1 já foram criados:
- `docs/navigation-contract-vetus-aligned.md`
- `docs/navigation-matrix-current-vs-target.md`
- `docs/navigation-copy-and-breadcrumb-conventions.md`
- `docs/routine-state-model.md`

Os testes estruturais iniciais também já foram preparados em:
- `apps/spa/src/navigation.test.ts`
- `apps/spa/src/router/routes.test.ts`

Execução realizada em `apps/spa`:
```bash
npm test -- src/navigation.test.ts src/router/routes.test.ts
```

Status observado:
- `src/router/routes.test.ts`: passando
- `src/navigation.test.ts`: 1 falha esperada

Falha esperada atual:
- o grupo `Atendimento` ainda usa a seção `Cadastrados`
- o contrato alvo exige `Cadastros`

Interpretação:
- o Sprint 1 já comprovou, por teste, a lacuna estrutural que a Fase A precisará corrigir em `navigation.ts`.

## Comando de validação do Sprint 1

No diretório `apps/spa`:

```bash
npm test -- navigation.test.ts routes.test.ts
```

Se quiser validar que nada colateral quebrou:

```bash
npm test
npm run build
```

## Saída final esperada

Quando este sprint acabar, a próxima ação correta será:
- iniciar a Fase A do checklist técnico por arquivo,
- começando por testes e contrato estrutural,
- sem reabrir discussão conceitual sobre árvore, labels ou estados.