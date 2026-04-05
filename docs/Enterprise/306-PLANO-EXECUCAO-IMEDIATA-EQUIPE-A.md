# 306 - Plano de Execução Imediata da Equipe A

## Objetivo

Este documento converte o plano estratégico da `Equipe A` em um plano de execução imediata, com foco em:

- backlog por sprint
- entregáveis por semana
- definição de pronto por fase
- ordem sugerida de PRs

## Escopo da Equipe A

A Equipe A é responsável por consolidar a camada Vue do design system e ampliar sua adoção nas páginas da SPA.

Documento de referência principal:

- [304-PLANO-EQUIPE-A-DESIGN-SYSTEM-VUE.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/304-PLANO-EQUIPE-A-DESIGN-SYSTEM-VUE.md)

## Resultado esperado ao final da execução

- componentes `Ds*` base endurecidos e testados
- adoção ampliada dos componentes Vue em páginas reais da SPA
- redução visível de CSS/markup duplicado
- wrappers compostos criados para padrões repetidos
- documentação de uso e backlog residual atualizados

---

## Estratégia de execução

### Princípios

- começar por componentes e páginas de baixo risco e alto reaproveitamento
- fazer refactors em lotes pequenos
- garantir regressão visual controlada após cada lote
- sempre preferir PRs pequenos, integráveis e testáveis

### Cadência sugerida

- horizonte inicial: `4 semanas`
- 1 sprint por semana
- 1 checkpoint técnico no meio da semana
- 1 checkpoint de integração no final da semana

---

## Sprint 1 - Hardening do núcleo do Design System Vue

### Objetivo do sprint

Estabilizar a API, acessibilidade e cobertura de testes dos componentes base já portados.

### Backlog do sprint

#### A1.1 - Revisão de API dos componentes

- revisar `DsButton`
- revisar `DsInput`
- revisar `DsCard`
- revisar `DsAlert`
- revisar `DsBadge`
- revisar `DsModal`
- revisar `DsSpinner`
- revisar `DsTabs`

#### A1.2 - Ajustes de acessibilidade

- revisar labels
- revisar `aria-*`
- revisar foco visível
- revisar keyboard behavior em modal e tabs

#### A1.3 - Hardening visual

- revisar variants
- revisar tamanhos
- revisar estados loading/disabled/error
- alinhar tokens e espaçamento

#### A1.4 - Testes de componente

- criar/ampliar testes unitários
- cobrir props principais
- cobrir slots relevantes
- cobrir estados especiais

### Entregáveis reais da semana

- suite de testes dos componentes Vue base
- API pública estabilizada dos componentes
- lista final de componentes prontos para adoção ampla

### Checklist da semana

- [ ] `DsButton` revisado
- [ ] `DsInput` revisado
- [ ] `DsCard` revisado
- [ ] `DsAlert` revisado
- [ ] `DsBadge` revisado
- [ ] `DsModal` revisado
- [ ] `DsSpinner` revisado
- [ ] `DsTabs` revisado
- [ ] testes dos componentes criados ou ampliados
- [ ] `typecheck` limpo
- [ ] regressão visual sem quebra crítica

### Definição de pronto do Sprint 1

O Sprint 1 será considerado pronto quando:

- os componentes base tiverem API coerente e documentada
- os principais estados estiverem testados
- a equipe tiver um lote claro de componentes prontos para adoção nas páginas

### Ordem sugerida de PRs

1. `PR-A1-01` Hardening `DsButton`, `DsInput`, `DsCard`
2. `PR-A1-02` Hardening `DsAlert`, `DsBadge`, `DsSpinner`
3. `PR-A1-03` Hardening `DsModal` e `DsTabs`
4. `PR-A1-04` Testes consolidados dos componentes Vue base

---

## Sprint 2 - Adoção em formulários prioritários

### Objetivo do sprint

Levar os componentes `Ds*` para as form pages de maior repetição e menor risco.

### Backlog do sprint

#### A2.1 - Form pages prioritárias

- `OwnerFormPage`
- `PatientFormPage`
- `AppointmentFormPage`
- `EncounterFormPage`

#### A2.2 - Padronização de estrutura

- labels
- hints
- erros
- ações primárias/secundárias
- blocos de formulário

#### A2.3 - Padronização de feedback

- alerts de erro
- alerts de sucesso
- loading de submit
- disabled state

### Entregáveis reais da semana

- formulários prioritários usando `DsInput`, `DsButton`, `DsAlert`, `DsCard`
- redução de markup repetido em forms
- UI dos formulários mais consistente entre módulos

### Checklist da semana

- [ ] `OwnerFormPage` refatorada
- [ ] `PatientFormPage` refatorada
- [ ] `AppointmentFormPage` refatorada
- [ ] `EncounterFormPage` refatorada
- [ ] erros e hints padronizados
- [ ] botões e ações padronizados
- [ ] testes da SPA passando
- [ ] visual regression revisada nas páginas afetadas

### Definição de pronto do Sprint 2

O Sprint 2 será considerado pronto quando:

- os 4 formulários prioritários estiverem usando os componentes base do design system
- o comportamento visual e funcional tiver sido preservado
- a duplicação de markup de formulário tiver sido reduzida de forma clara

### Ordem sugerida de PRs

1. `PR-A2-01` Refactor `OwnerFormPage` + `PatientFormPage`
2. `PR-A2-02` Refactor `AppointmentFormPage` + `EncounterFormPage`
3. `PR-A2-03` Padronização de alerts, submit states e cleanup de CSS local

---

## Sprint 3 - Adoção em detail pages e blocos compostos

### Objetivo do sprint

Padronizar a camada de detalhe da SPA e extrair wrappers reutilizáveis.

### Backlog do sprint

#### A3.1 - Detail pages prioritárias

- `OwnerDetailPage`
- `PatientDetailPage`
- `EncounterDetailPage`
- `BillingDetailPage`
- `MedicalRecordsDetailPage`

#### A3.2 - Wrappers compostos

- `AppPageHeader`
- `AppDetailSection`
- `AppStatusPill`
- `AppConfirmModal`

#### A3.3 - Adoção seletiva de wrappers

- aplicar wrappers nas páginas com maior repetição
- reduzir seções locais duplicadas

### Entregáveis reais da semana

- details mais consistentes usando `DsCard`, `DsBadge`, `DsAlert`, `DsModal`
- 2 a 4 wrappers compostos criados
- redução adicional de duplicação de layout e seções

### Checklist da semana

- [ ] detail pages prioritárias auditadas
- [ ] adoção de `DsCard` ampliada
- [ ] adoção de `DsBadge` ampliada
- [ ] adoção de `DsModal` ampliada
- [ ] `AppPageHeader` criado
- [ ] `AppDetailSection` criado
- [ ] wrappers aplicados em páginas reais
- [ ] testes mínimos adicionados quando necessário

### Definição de pronto do Sprint 3

O Sprint 3 será considerado pronto quando:

- detail pages críticas estiverem visualmente mais uniformes
- wrappers compostos já estiverem reduzindo repetição real
- o design system Vue começar a ser percebido como base da SPA, não como exceção

### Ordem sugerida de PRs

1. `PR-A3-01` Wrappers compostos base
2. `PR-A3-02` Refactor de detail pages administrativas
3. `PR-A3-03` Refactor de detail pages operacionais/clínicas

---

## Sprint 4 - Fechamento, documentação e backlog residual

### Objetivo do sprint

Fechar a frente com evidência técnica, documentação e backlog residual priorizado.

### Backlog do sprint

#### A4.1 - Revisão final de adoção

- mapear o que já usa `Ds*`
- mapear o que ainda não usa
- justificar exceções

#### A4.2 - Documentação

- atualizar docs da Equipe A
- atualizar scorecard
- atualizar relatório consolidado
- registrar backlog residual

#### A4.3 - Qualidade final

- rodar typecheck
- rodar testes SPA
- revisar visual regression nas páginas impactadas

### Entregáveis reais da semana

- relatório de adoção consolidado
- backlog residual da frente visual
- documentação atualizada

### Checklist da semana

- [ ] inventário final de adoção concluído
- [ ] backlog residual documentado
- [ ] scorecard atualizado
- [ ] relatório consolidado atualizado
- [ ] `typecheck` limpo
- [ ] testes SPA verdes
- [ ] regressão visual revisada

### Definição de pronto do Sprint 4

O Sprint 4 será considerado pronto quando:

- a frente tiver documentação fechada
- estiver claro o que entrou e o que ficou fora
- a camada visual da SPA estiver mais padronizada e sustentável

### Ordem sugerida de PRs

1. `PR-A4-01` Revisão final de adoção + cleanup
2. `PR-A4-02` Documentação + backlog residual

---

## Quadro de PRs sugerido da Equipe A

### Bloco 1 - Componentes

- `PR-A1-01`
- `PR-A1-02`
- `PR-A1-03`
- `PR-A1-04`

### Bloco 2 - Form pages

- `PR-A2-01`
- `PR-A2-02`
- `PR-A2-03`

### Bloco 3 - Detail pages e wrappers

- `PR-A3-01`
- `PR-A3-02`
- `PR-A3-03`

### Bloco 4 - Fechamento

- `PR-A4-01`
- `PR-A4-02`

---

## Critérios globais de pronto da Equipe A

- componentes Vue base testados e estáveis
- formulários prioritários adotando `Ds*`
- details prioritários adotando `Ds*` e wrappers
- redução observável de CSS/markup duplicado
- documentação e backlog residual atualizados

## Riscos operacionais

- colisão com páginas em evolução por outras equipes
- regressão visual em áreas já estáveis
- wrappers prematuros demais

## Mitigações

- PRs pequenos
- revisão visual após cada lote
- foco em páginas estáveis primeiro
- checkpoints semanais com o orquestrador

## Indicadores de acompanhamento

- número de páginas que passaram a usar `Ds*`
- número de componentes Vue cobertos por testes
- redução de blocos CSS locais
- redução de markup repetido em forms e details
