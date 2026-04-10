# PLANO DE CONTINUIDADE — ULTIMA MILHA DO GATE `pnpm test:e2e:spa`

**Data:** 10/04/2026
**Status:** CONCLUIDO
**Objetivo:** registrar o fechamento da ultima milha do gate integrado da SPA e a decisao final de `B2-F3`

---

## 1. Ponto Oficial de Parada

O programa nao esta mais bloqueado por regressao visual isolada.

Estado consolidado desta etapa:

- `pnpm test:visual` PASS
- `pnpm test:e2e:spa` PASS
- `B2-F3 RESOLVIDO`
- `BLOCO 2 APROVADO`

Conclusao:

**O bloqueio atual foi fechado com evidência real.**
**O gate integrado de `pnpm test:e2e:spa` convergiu em `PASS`.**

---

## 2. Missao Desta Continuidade

Registrar o motivo pelo qual a suite integrada da SPA fechou em `PASS` após a estabilizacao visual e a canonicalizacao das listas governadas.

Esta etapa existe para fechar apenas a ultima milha do gate de release do frontend.

---

## 3. Escopo Permitido

Esta continuidade pode atuar somente em:

- harness Playwright da SPA;
- ordem de execucao dos specs E2E;
- fixtures e helpers de auth/session/runtime;
- isolamento de seed, env e storage state;
- integracao entre specs funcionais e specs visuais;
- configuracao de `playwright-spa.config.ts`;
- documentacao diretamente afetada por esta estabilizacao final.

---

## 4. Escopo Proibido

Nao abrir nesta etapa:

- nova frente de regressao visual ampla;
- redesign de frontend;
- nova frente de WCAG ampla;
- novas frentes do Bloco 2 fora do gate SPA;
- qualquer trabalho de Bloco 3.

---

## 5. Hipotese Operacional Atual

O estado atual sugere que a falha remanescente esta na **integracao da suite**, e nao necessariamente em um unico fluxo funcional.

As hipoteses prioritarias a validar sao:

1. heranca indevida de estado entre specs;
2. problema de fixture compartilhada;
3. storage/auth reaproveitado de forma invalida;
4. runtime API/Vite nao isolado o suficiente entre blocos de teste;
5. seed ou dados de teste mutando entre specs;
6. bloco de visual regression contaminando a execucao integrada.

---

## 6. Tarefas de Construcao

### T1. Reproduzir a falha do gate integrado

Executar:

- `pnpm test:e2e:spa`

Objetivo:

- confirmar a falha atual no contexto integrado;
- identificar exatamente qual spec ou sequencia volta a quebrar o gate.

### T2. Comparar execucao isolada vs integrada

Executar e comparar:

- spec que passa isolado
- mesma spec dentro de `pnpm test:e2e:spa`

Objetivo:

- detectar se a falha depende da ordem da suite;
- detectar contaminacao de contexto entre testes.

### T3. Auditar harness e fixtures

Revisar com foco em:

- `playwright-spa.config.ts`
- fixtures SPA
- helpers de login/auth/token
- ports dedicadas
- processos de API/Vite
- `storageState`
- limpeza entre specs
- seed e bootstrap de ambiente

Objetivo:

- eliminar compartilhamento indevido;
- garantir isolamento suficiente entre specs funcionais e visuais.

### T4. Isolar visual regression dentro da suite integrada

Verificar se o bloco visual:

- reutiliza estado inadequado;
- depende de ordem específica;
- altera runtime, storage, sessao ou dados;
- deveria ter fixture separada ou serializacao dedicada.

Objetivo:

- garantir que o spec visual nao quebre o gate integrado por contaminacao de ambiente.

### T5. Corrigir a causa raiz

Implementar apenas o necessario para:

- estabilizar a execucao integrada;
- manter o comportamento ja validado de `pnpm test:visual`;
- preservar os fluxos funcionais que ja passam isoladamente.

### T6. Revalidar gate da SPA

Executar:

- `pnpm test:e2e:spa`

Objetivo:

- obter evidência objetiva de que o gate integrado agora converge;
- confirmar que o frontend principal fica liberavel no contexto real de suite.

### T7. Checagem WCAG pontual final

Se telas forem tocadas nesta etapa, verificar minimamente:

- heading/labels coerentes;
- foco visivel;
- feedback visual de erro/sucesso;
- atributos ARIA relevantes.

### T8. Atualizar documentacao de verdade operacional

Atualizar:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0115-PLANO-CONTINUIDADE-CONSTRUCAO-PROGRAMA-2026-04-10.md`
- `docs/Enterprise/0113-BLOCO-2-PLANO-CONSTRUCAO-ELEVACAO-E-PADRAO-ENTERPRISE-2026-04-10.md`

Registrar apenas:

- causa raiz encontrada;
- arquivos alterados;
- comandos executados;
- resultado real do gate;
- decisao final.

---

## 7. Ordem Obrigatoria de Execucao

1. `pnpm test:e2e:spa`
2. reproduzir e identificar o ponto exato de quebra
3. comparar execucao isolada vs integrada
4. auditar harness, fixtures, auth e runtime
5. isolar bloco visual dentro da suite integrada
6. corrigir causa raiz
7. `pnpm test:e2e:spa`
8. checagem WCAG pontual
9. atualizar docs
10. decidir `B2-F3`
11. reavaliar `BLOCO 2`

---

## 8. Criterio de Saida

Criterio cumprido com evidencia objetiva:

- `pnpm test:e2e:spa` PASS
- nenhuma contaminacao relevante entre specs
- suite visual compativel com o gate integrado
- documentacao coerente com o estado final

Desfecho registrado:

- `B2-F3 RESOLVIDO`
- `BLOCO 2 APROVADO`

---

## 9. Resultado Registrado

O fechamento executado deixou como registro final:

- causa raiz do fail integrado: estado dinâmico de listas governadas e seletores de estabilizacao apontando para wrappers incorretos
- arquivos alterados: helper de estabilizacao, spec visual, snapshots governados e docs de execução
- validacoes executadas: `pnpm test:visual`, `pnpm test:visual:update`, `pnpm test:e2e:spa`
- evidência por gap: visual regression e SPA integrada em `PASS`
- atualizacao documental: tracker e planos alinhados com o estado real
- decisao final:
  - `B2-F3 RESOLVIDO`
  - `BLOCO 2 APROVADO`
