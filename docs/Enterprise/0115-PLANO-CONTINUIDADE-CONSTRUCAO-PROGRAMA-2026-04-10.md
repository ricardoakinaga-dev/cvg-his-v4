# PLANO DE CONTINUIDADE DA CONSTRUCAO DO PROGRAMA — POS GATE BLOCO 2

**Data:** 10/04/2026
**Status:** CONCLUIDO
**Objetivo:** registrar o fechamento operacional do programa a partir do ponto real em que a execucao encerrou

---

## 1. Ponto Oficial de Parada

O programa parou no **gate final do Bloco 2**.

Estado consolidado:

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `BLOCO 3 DESBLOQUEADO`

Fontes de verdade principais:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0113-BLOCO-2-PLANO-CONSTRUCAO-ELEVACAO-E-PADRAO-ENTERPRISE-2026-04-10.md`
- `docs/Enterprise/1060-VISUAL-REGRESSION-WORKFLOW.md`
- `docs/Enterprise/0111-WCAG-AUDIT.md`
- `docs/Enterprise/1030-AUDITORIA-ADOCAO-DESIGN-SYSTEM-SPA.md`

---

## 2. Estado Real Consolidado

Evidencias ja fechadas:

- `pnpm typecheck` PASS
- `pnpm build` PASS
- `pnpm test:critical` PASS
- OpenAPI runtime PASS
- API keys PASS
- RLS/LGPD PASS
- Storybook PASS
- health/runtime signals com evidencia parcial real

Bloqueio real remanescente para liberacao do programa:

- nenhum bloqueio de release permanece no fechamento atual

Motivo objetivo:

- `pnpm test:visual` fechou em `PASS`
- o gate de frontend fechou em conjunto com `pnpm test:e2e:spa`

Conclusao operacional:

**O proximo trabalho do programa nao e reabrir o gate fechado.**
**O proximo trabalho do programa e seguir para a continuidade formal do bloco seguinte.**

---

## 3. Missao desta Continuidade

Concluir o fechamento do frontend enterprise com evidência suficiente para:

1. estabilizar a regressao visual;
2. revalidar o gate funcional da SPA;
3. registrar o resultado real no tracker;
4. decidir objetivamente se o `BLOCO 2` pode ser aprovado.

---

## 4. Escopo Permitido

Esta continuidade pode atuar somente em:

- paginas governadas da SPA que entram no gate visual;
- componentes e wrappers que afetam estabilidade visual;
- `e2e/spa/visual/visual-regression.spec.ts`;
- snapshots/baselines governados;
- fluxos SPA necessarios para revalidar `pnpm test:e2e:spa`;
- documentacao diretamente afetada pelo fechamento do `B2-F3`.

---

## 5. Escopo Proibido

Nao abrir nesta etapa:

- `BLOCO 3`
- novos epicos de produto
- expansao de API premium
- expansao de LGPD/RLS
- nova frente ampla de compliance
- nova frente ampla de IA/ML
- redesign amplo de frontend

---

## 6. Tarefas de Construcao

### T1. Reproduzir o estado atual do gate visual

Executar:

- `pnpm test:visual`

Objetivo:

- identificar exatamente quais paginas ainda variam;
- separar diff real, diff intencional e flake de renderizacao.

### T2. Estabilizar paginas governadas

Atuar nas paginas/listas que ainda variam entre execucoes, priorizando:

- owners
- patients
- encounters
- billing

Remover ou controlar:

- conteudo efemero
- ordenacao instavel
- loading transitório
- skeletons tardios
- dados variaveis
- elementos dinamicos que nao pertencem ao baseline

### T3. Endurecer o spec visual

Revisar `e2e/spa/visual/visual-regression.spec.ts` para:

- aguardar estado estavel antes do screenshot;
- garantir seed deterministica;
- mascarar ou excluir elementos nao governados;
- ajustar thresholds apenas com justificativa objetiva.

### T4. Atualizar baseline apenas quando justificavel

Se a diferenca for intencional e estavel:

- executar update de baseline;
- manter apenas snapshots governados e reproduziveis;
- nao usar baseline como remendo para bug ou flake.

### T5. Revalidar o gate funcional da SPA

Executar:

- `pnpm test:e2e:spa`

Objetivo:

- garantir que a estabilizacao visual nao introduziu regressao funcional;
- confirmar que o frontend principal segue liberavel.

### T6. Checagem WCAG pontual

Nas telas tocadas nesta etapa, verificar pelo menos:

- headings e labels coerentes;
- foco visivel;
- contraste preservado;
- feedback visual de sucesso/erro;
- atributos ARIA relevantes quando aplicavel.

### T7. Atualizar documentacao de verdade operacional

Atualizar:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/1060-VISUAL-REGRESSION-WORKFLOW.md`
- `docs/Enterprise/0113-BLOCO-2-PLANO-CONSTRUCAO-ELEVACAO-E-PADRAO-ENTERPRISE-2026-04-10.md`

Registrar somente:

- comandos executados;
- resultados reais;
- paginas estabilizadas;
- snapshots atualizados;
- decisao final do gate.

---

## 7. Ordem Obrigatoria de Execucao

1. `pnpm test:visual`
2. estabilizacao das paginas governadas
3. endurecimento do spec visual
4. update de baseline, se justificavel
5. `pnpm test:visual`
6. `pnpm test:e2e:spa`
7. checagem WCAG pontual
8. atualizacao documental
9. decisao final do gate do `B2-F3`
10. redecisao do `BLOCO 2`

---

## 8. Criterio de Saida

Criterio cumprido com evidencia objetiva:

- `pnpm test:visual` PASS
- `pnpm test:e2e:spa` PASS
- paginas tocadas sem regressao WCAG evidente
- documentacao coerente com o estado executado

Desfecho registrado:

- `B2-F3 RESOLVIDO`
- `BLOCO 2 APROVADO`

---

## 9. Resultado Registrado

O fechamento executado deixou como registro final:

- causa raiz do fail integrado: paginas governadas ainda variavam por estado dinamico de tabela e baseline nao canonicalizado
- arquivos alterados: visual spec, helper de estabilizacao, snapshots governados e docs de execução
- validacoes executadas: `pnpm test:visual`, `pnpm test:visual:update`, `pnpm test:e2e:spa`
- evidência por gap: visual regression e SPA integrada em `PASS`
- atualizacao documental: tracker e planos alinhados com o estado real
- decisao final:
  - `B2-F3 RESOLVIDO`
  - `BLOCO 2 APROVADO`
