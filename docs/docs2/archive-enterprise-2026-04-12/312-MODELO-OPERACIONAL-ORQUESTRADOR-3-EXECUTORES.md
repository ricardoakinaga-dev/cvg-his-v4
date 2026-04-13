# 312 - Modelo Operacional com 1 Orquestrador e 3 Executores

## Objetivo

Este documento redefine a forma de trabalho da Onda 2 a partir de um novo arranjo operacional:

- `1 Orquestrador`
- `3 Executores`

O objetivo é aumentar paralelismo sem perder:

- clareza de ownership
- qualidade de integração
- previsibilidade de entrega
- autonomia dos executores

## Contexto

O projeto já possui:

- SPA madura em `apps/spa/`
- design system Vue em consolidação
- vários módulos migrados
- cobertura forte de testes unitários, de página, E2E e visual regression
- backlog operacional suficientemente grande para execução paralela

Com três executores, o melhor modelo não é repartir “por pessoas soltas”, e sim por `trilhas de responsabilidade`.

---

## Estrutura recomendada

## Papel 1 - Orquestrador

### Missão

Garantir que os três executores avancem em paralelo sem colisão, com prioridades corretas, dependências controladas e integração contínua.

### Responsabilidades

- definir a ordem de execução das frentes
- quebrar o trabalho em tasks pequenas e integráveis
- distribuir ownership por trilha
- evitar conflito em arquivos compartilhados
- revisar dependências cruzadas
- decidir prioridades semanais
- definir o que entra e o que não entra em cada sprint
- manter scorecard, cronograma e painel semanal alinhados

### O que o orquestrador não deve fazer

- concentrar toda a implementação em si
- deixar executores esperando decisões pequenas
- abrir frentes paralelas com forte sobreposição de arquivos

---

## Papel 2 - Executor 1

### Nome recomendado da trilha

`Executor E1 - Plataforma de UI e Design System`

### Missão

Consolidar a camada visual e os componentes reutilizáveis da SPA.

### Ownership principal

- `packages/design-system/`
- `apps/spa/src/components/`
- `apps/spa/src/styles/`
- refactors visuais controlados nas páginas

### Tipo de trabalho ideal

- port e hardening de componentes `Ds*`
- adoção ampla dos componentes na SPA
- wrappers compostos de UI
- acessibilidade, consistência e redução de duplicação visual

### Métrica principal de sucesso

- redução de markup/CSS duplicado
- aumento de adoção de `Ds*`
- estabilidade visual e de testes

---

## Papel 3 - Executor 2

### Nome recomendado da trilha

`Executor E2 - Produto e Módulos Operacionais`

### Missão

Migrar módulos funcionais do SSR para a SPA, começando pelos de melhor relação entre valor, maturidade de API e risco.

### Ownership principal

- `apps/spa/src/types/<modulo>.ts`
- `apps/spa/src/services/<modulo>.ts`
- `apps/spa/src/pages/<modulo>/`
- ajustes mínimos em `apps/api/src/server.ts` quando faltarem endpoints finos

### Tipo de trabalho ideal

- migração de módulos operacionais
- integração com API real
- list/detail/form
- fluxos operacionais e administrativos

### Módulo prioritário atual

- `Scheduling / Queue`

### Métrica principal de sucesso

- módulos novos funcionando na SPA
- valor funcional entregue
- integração com backend real validada

---

## Papel 4 - Executor 3

### Nome recomendado da trilha

`Executor E3 - Qualidade, Hardening e Enablement`

### Missão

Garantir que o avanço das duas trilhas principais não gere dívida operacional, regressão ou perda de confiabilidade.

### Ownership principal

- `apps/spa/tests/`
- `e2e/spa/`
- `playwright-spa.config.ts`
- visual regression
- helpers de teste
- quality gates operacionais

### Tipo de trabalho ideal

- testes de página e interação
- expansão de E2E
- estabilização de visual regression
- hardening de seletores e fixtures
- testes dos componentes portados
- suportar E1 e E2 com camada de validação

### Métrica principal de sucesso

- cobertura cresce sem fragilidade
- regressões detectadas cedo
- E2E/visuais permanecem estáveis

---

## Quadro de distribuição de frentes

| Papel | Foco | Exemplo de backlog | Área principal |
|------|------|--------------------|----------------|
| Orquestrador | coordenação | planejamento, prioridades, handoff, governança | docs + backlog + coordenação |
| E1 | UI platform | `Ds*`, adoção visual, wrappers | design system + SPA UI |
| E2 | produto | módulos SPA, services, types, rotas | páginas e fluxos de negócio |
| E3 | qualidade | testes, E2E, visual, hardening | testes + infraestrutura de validação |

---

## Modelo de trabalho recomendado

## 1. O orquestrador sempre trabalha um nível acima

O orquestrador deve:

- quebrar o trabalho em tasks
- escolher quem executa cada task
- garantir ordem de merge
- decidir dependências
- evitar overlap

O orquestrador não deve desperdiçar executor com tarefa mal definida.

## 2. Cada executor tem uma trilha dominante

Executores podem colaborar entre si, mas cada um deve ter uma trilha dominante clara:

- `E1` domina UI base
- `E2` domina produto/módulos
- `E3` domina qualidade e hardening

## 3. Toda sprint deve ter três tipos de entrega

Idealmente, a cada semana:

- `E1` entrega plataforma visual
- `E2` entrega valor funcional
- `E3` entrega confiança operacional

Isso mantém o projeto evoluindo em equilíbrio.

---

## Ownership por arquivo e tipo de mudança

## Áreas com ownership quase exclusivo

### Executor E1

- `packages/design-system/**`
- `apps/spa/src/components/**`
- `apps/spa/src/styles/**`

### Executor E2

- `apps/spa/src/pages/<modulo>/**`
- `apps/spa/src/services/<modulo>.ts`
- `apps/spa/src/types/<modulo>.ts`

### Executor E3

- `apps/spa/tests/**`
- `e2e/spa/**`
- configs de Playwright e visual regression

## Áreas compartilhadas de alto risco

- `apps/spa/src/router/routes.ts`
- `apps/spa/src/layouts/AppLayout.vue`
- `docs/Enterprise/300-SCORECARD-PROGRESSO.md`
- `docs/Enterprise/999-RELATORIO-CONSOLIDADO-ENTERPRISE.md`

### Regra para áreas compartilhadas

- mudanças pequenas
- PR isolado
- alinhamento prévio do orquestrador
- merge com prioridade explícita

---

## Fluxo operacional por task

## Etapa 1 - Orquestrador define a task

A task deve sair com:

- objetivo
- escopo
- fora de escopo
- arquivos prováveis
- riscos
- critério de pronto

## Etapa 2 - Executor implementa

Cada executor deve devolver:

- diagnóstico curto
- plano da task
- implementação realizada
- testes/validações executadas
- limitações remanescentes
- próximos passos

## Etapa 3 - Orquestrador integra

O orquestrador:

- decide a próxima task
- ajusta prioridades
- atualiza o painel semanal
- coordena dependências cruzadas

---

## Cadência semanal recomendada

## Segunda - Planejamento

O orquestrador define:

- task do E1
- task do E2
- task do E3

Cada executor sai da segunda com:

- escopo claro
- definição de pronto
- arquivos de maior probabilidade de mudança

## Quarta - Checkpoint

Revisar:

- progresso real
- bloqueios
- colisões de arquivo
- risco da sprint

## Sexta - Fechamento

Revisar:

- o que foi entregue
- o que escorregou
- o que depende de quem
- o que entra na próxima semana

---

## Modelo de priorização do trabalho

Quando houver mais backlog do que capacidade, usar esta ordem:

### Prioridade 1

Trabalho que desbloqueia outras frentes.

Exemplos:

- hardening de componente base usado por muitos módulos
- endpoint fino necessário para módulo em migração
- fixture de teste usada por várias specs

### Prioridade 2

Trabalho que entrega valor funcional de negócio.

Exemplos:

- módulo novo na SPA
- fluxo operacional novo
- ação funcional crítica

### Prioridade 3

Trabalho que reduz dívida e aumenta velocidade futura.

Exemplos:

- wrappers compostos
- refactor de repetição
- helper compartilhado de testes

---

## Modelo recomendado de divisão imediata

## Orquestrador

Responsável agora por:

- manter `303`, `308`, `309`, `310`, `311`
- emitir a próxima task de cada executor
- controlar ordem de merge e dependências

## Executor E1

Próxima frente recomendada:

- adoção ampla dos componentes `Ds*`
- hardening incremental de `DsInput`, `DsButton`, `DsSpinner`, `DsTabs`
- padronização de loading/error states

## Executor E2

Próxima frente recomendada:

- `Scheduling / Queue` na SPA

## Executor E3

Próxima frente recomendada:

- ampliar cobertura da SPA conforme E1 e E2 avançam
- testar componentes Vue portados
- estabilizar E2E/visual quando as novas telas entrarem

---

## Modelo de dependência entre executores

### E1 → E2

E1 fornece:

- base visual reutilizável
- API estável de componentes

E2 consome:

- `Ds*`
- wrappers maduros, quando disponíveis

### E2 → E3

E2 fornece:

- páginas e fluxos novos

E3 consome:

- telas reais para cobrir com testes

### E1 → E3

E1 fornece:

- componentes Vue reais

E3 consome:

- componentes para criar testes e validar adoção

---

## Regras de merge recomendadas

### 1. PR pequeno vence PR grande

Se houver conflito, priorizar:

- PRs curtos
- PRs específicos
- PRs com escopo claramente testado

### 2. PR estrutural precisa entrar antes

Se um componente base mudar:

- E1 mergeia antes
- E2 e E3 rebaseiam depois

### 3. PR de rota/layout deve ser isolado

Mudança em:

- `routes.ts`
- `AppLayout.vue`

deve ser feita em PR pequeno, de preferência único na semana.

---

## Checklist de funcionamento saudável

- [ ] cada executor com trilha dominante clara
- [ ] orquestrador emitindo tasks pequenas
- [ ] áreas compartilhadas com baixo churn simultâneo
- [ ] dependências cruzadas atualizadas
- [ ] painel semanal atualizado
- [ ] scorecard atualizado apenas no fechamento de entregas reais

---

## Sinais de problema no modelo

### Alerta amarelo

- um executor sem task clara
- mais de 2 PRs simultâneos em área compartilhada
- E3 sem conseguir acompanhar o ritmo de E1/E2

### Alerta vermelho

- E2 bloqueado pela base visual por mais de 1 dia útil
- E1 fazendo refactor amplo em páginas sob forte churn
- E3 descobrindo regressão crítica só no final da sprint
- orquestrador emitindo tasks grandes demais ou ambíguas

---

## Decisão recomendada

Este é o modelo recomendado daqui para frente:

- `Orquestrador`: coordena, prioriza, integra, destrava
- `Executor E1`: plataforma visual
- `Executor E2`: módulos e produto
- `Executor E3`: qualidade e enablement

Esse formato dá o melhor equilíbrio entre:

- avanço funcional
- consistência arquitetural
- segurança de entrega

## Próximo passo sugerido

Com este modelo aprovado, o próximo passo operacional é:

- emitir a primeira task do `Executor E1`
- emitir a primeira task do `Executor E2`
- emitir a primeira task do `Executor E3`
- atualizar o `311-PAINEL-DE-ACOMPANHAMENTO-SEMANAL.md` com a Semana 1 do novo arranjo
