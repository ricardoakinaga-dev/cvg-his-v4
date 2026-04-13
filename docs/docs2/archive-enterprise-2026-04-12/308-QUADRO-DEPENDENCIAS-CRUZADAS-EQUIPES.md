# 308 - Quadro de Dependências Cruzadas entre Equipe A e Equipe B

## Objetivo

Este documento organiza as dependências cruzadas entre as duas equipes da Onda 2 para evitar:

- bloqueios silenciosos
- colisões de merge
- retrabalho
- mudança de contrato no meio da sprint

## Equipes

### Equipe A

Responsável por:

- consolidação do design system Vue
- adoção dos componentes `Ds*` na SPA
- wrappers visuais e padronização de UI

### Equipe B

Responsável por:

- migração do módulo `Scheduling / Queue` para a SPA
- integração com API real
- páginas, serviços e fluxos operacionais do módulo

---

## Resumo executivo das dependências

| Dependência | Time dono | Time consumidor | Tipo | Criticidade | Regra operacional |
|------------|-----------|-----------------|------|-------------|-------------------|
| Componentes `Ds*` base | Equipe A | Equipe B | Técnica/UI | Alta | A define API estável antes da adoção ampla |
| Wrappers compostos da SPA | Equipe A | Equipe B | Técnica/UI | Média | B só adota wrappers depois da primeira versão estável |
| Router global da SPA | Compartilhado | Compartilhado | Integração | Alta | Mudanças coordenadas com janela de merge |
| Sidebar/AppLayout | Compartilhado | Compartilhado | Integração/UI | Alta | Alterar em PR pequeno e isolado |
| Visual regression baseline | Equipe A | Equipe B | Qualidade | Média | Toda mudança estrutural de UI exige revisão visual |
| Convenções de formulários | Equipe A | Equipe B | Técnica/UI | Alta | B segue convenções após Sprint A2 |
| Scheduling routes/types/services | Equipe B | Equipe A | Funcional | Baixa | A não deve criar abstração específica de scheduling sem alinhar com B |
| Docs do scorecard e consolidado | Compartilhado | Compartilhado | Governança | Média | Atualização no fechamento de cada PR relevante |

---

## Matriz de dependências cruzadas

## D1 - API dos componentes `Ds*`

### Dono

Equipe A

### Consumidor

Equipe B

### O que depende disso

- formulários de scheduling
- cards e alertas do módulo
- modais simples de cancelamento/check-in
- consistência visual das páginas da Equipe B

### Risco

Se a API dos componentes mudar durante a adoção do módulo de scheduling:

- quebra de páginas em desenvolvimento
- retrabalho em PRs da Equipe B
- conflitos de merge

### Regra operacional

- mudanças breaking em `Ds*` só podem ocorrer no início da sprint
- depois de “API estável da sprint”, apenas ajustes compatíveis
- Equipe A deve publicar lista de props/slots definitivos da semana

### Sinal de liberação

- PR da Equipe A mergeado
- changelog curto no comentário da sprint
- consumo autorizado pela Equipe B

---

## D2 - Wrappers compostos de aplicação

### Dono

Equipe A

### Consumidor

Equipe B

### O que depende disso

- `AppPageHeader`
- `AppFormSection`
- `AppDetailSection`
- `AppConfirmModal`

### Risco

Wrapper ainda instável sendo adotado cedo demais pode:

- espalhar bugs de layout
- gerar refactors em cascata

### Regra operacional

- Equipe B não depende desses wrappers para começar
- wrappers só entram no scheduling se já existirem e estiverem testados
- se não estiverem maduros, Equipe B usa `Ds*` base diretamente

---

## D3 - Router global e AppLayout

### Dono

Compartilhado

### O que depende disso

- inclusão de menu de scheduling/queue
- breadcrumbs
- metadados de rota
- navegação global da SPA

### Risco

Arquivo com alto churn. Alto risco de conflito.

### Regra operacional

- toda alteração em `routes.ts` deve ser pequena e isolada
- toda alteração em `AppLayout.vue` deve ser feita em PR dedicado
- merge preferencial na seguinte ordem:
  1. Equipe A atualiza shell, se necessário
  2. Equipe B adiciona rotas e navegação do módulo

### Estratégia recomendada

- evitar refactor estrutural amplo no mesmo período
- usar placeholders mínimos quando necessário

---

## D4 - Convenções de formulários e feedback visual

### Dono

Equipe A

### Consumidor

Equipe B

### O que depende disso

- form de criação de appointment
- mensagens de erro
- botões primários/secundários
- alerts e hints

### Risco

Se a Equipe B construir o módulo antes da padronização mínima da Equipe A:

- nasce mais dívida visual
- exige refactor logo em seguida

### Regra operacional

- Equipe B pode começar com componentes base disponíveis
- após Sprint A2, forms de scheduling devem convergir para o padrão final
- refactor de alinhamento pode ser separado em PR final do módulo

---

## D5 - Visual regression

### Dono

Compartilhado

### O que depende disso

- mudanças de componentes base
- mudanças em páginas já migradas
- inclusão de novas páginas de scheduling

### Risco

Falso positivo visual ou regressão não percebida.

### Regra operacional

- Equipe A revisa visual regression após PRs que mexem em `Ds*`
- Equipe B adiciona snapshots do scheduling apenas quando as telas estabilizarem
- se houver mudança intencional de UI, baseline deve ser atualizado com registro explícito

---

## D6 - Documentação de scorecard e relatório consolidado

### Dono

Compartilhado

### O que depende disso

- rastreabilidade da evolução por sprint
- comunicação com orquestrador

### Risco

Documentos ficarem atrasados em relação à implementação real.

### Regra operacional

- cada equipe atualiza docs apenas no fechamento de PR significativo
- evitar atualizar scorecard em PR puramente exploratório
- update documental sempre no último commit do PR ou em PR separado de fechamento

---

## Quadro de bloqueios possíveis

| Cenário | Equipe bloqueada | Origem | Ação de desbloqueio |
|--------|------------------|--------|---------------------|
| API de `DsInput` muda no meio da sprint | B | A | congelar API da sprint |
| `AppLayout.vue` em conflito | A e B | Compartilhado | PRs pequenos e merge coordenado |
| wrapper visual ainda instável | B | A | usar `Ds*` base, não wrapper |
| rota/menu de scheduling conflita com mudança de shell | B | Compartilhado | merge do shell primeiro, menu depois |
| visual regression falha em páginas já migradas | A/B | Compartilhado | revisar baseline e impacto antes de merge |
| scorecard divergente do estado real | A/B | Processo | atualizar docs no fechamento da sprint |

---

## Regras de coordenação semanal

### Checkpoint 1 - Início da semana

Cada equipe informa:

- arquivos de alto churn previstos
- PRs esperados
- dependências de outras equipes
- componentes ou rotas que precisam estar estáveis

### Checkpoint 2 - Meio da semana

Cada equipe informa:

- o que já está mergeado
- o que ainda está instável
- se existe bloqueio cruzado

### Checkpoint 3 - Fechamento da semana

Cada equipe informa:

- entregáveis concluídos
- backlog deslocado
- impacto em visual regression, testes e docs

---

## Regra de prioridade em caso de conflito

Quando houver conflito entre as duas equipes:

1. preserva-se estabilidade da base da SPA
2. preserva-se API pública dos componentes já em uso
3. privilegia-se o merge do PR menor e menos disruptivo
4. posterga-se refactor estrutural que não seja bloqueante

---

## Decisões operacionais recomendadas

- Equipe A não deve depender do módulo Scheduling para concluir sua frente
- Equipe B pode começar com `Ds*` base e adotar wrappers depois
- `routes.ts` e `AppLayout.vue` devem ter PRs pequenos, curtos e rápidos
- toda decisão breaking de componente deve ser comunicada antes do merge

## Critério de funcionamento saudável entre equipes

O modelo paralelo estará funcionando bem quando:

- nenhuma equipe ficar bloqueada por mais de 1 dia útil
- não houver PRs gigantes em áreas compartilhadas
- mudanças de design system forem absorvidas sem rework massivo
- scheduling for migrado sem regressão visual ou estrutural relevante
