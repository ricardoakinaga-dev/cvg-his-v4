# 310 - Lista Pronta de PRs e Issues para as Duas Equipes

## Objetivo

Fornecer uma lista operacional pronta para abertura de PRs ou issues por equipe, já organizada em blocos pequenos, integráveis e com escopo claro.

## Como usar

- cada item abaixo pode virar issue
- cada issue pode virar uma PR pequena e objetiva
- o ideal é manter PRs curtos, com write scope controlado

---

# Equipe A

## Bloco A1 - Hardening dos componentes Vue

### A1-01 - Hardening de `DsButton`, `DsInput` e `DsCard`

**Objetivo**

Revisar API, variantes, estados e acessibilidade dos três componentes mais usados da camada Vue.

**Entregáveis**

- props e slots revisados
- testes ampliados
- documentação revisada

**Write scope**

- `packages/design-system/`

**Critério de pronto**

- testes verdes
- API estável para adoção em páginas

### A1-02 - Hardening de `DsAlert`, `DsBadge` e `DsSpinner`

**Objetivo**

Estabilizar feedback visual e indicadores de estado.

**Entregáveis**

- variantes revisadas
- acessibilidade revisada
- testes criados/ajustados

### A1-03 - Hardening de `DsModal` e `DsTabs`

**Objetivo**

Fechar os componentes de interação mais sensíveis antes da adoção ampla.

**Entregáveis**

- comportamento e API revisados
- testes dos estados principais

### A1-04 - Consolidação da suíte de testes dos componentes Vue

**Objetivo**

Garantir cobertura mínima da camada Vue do design system.

**Entregáveis**

- suite unificada
- gaps documentados

---

## Bloco A2 - Adoção em formulários

### A2-01 - Refactor de `OwnerFormPage` e `PatientFormPage`

**Objetivo**

Migrar forms base para `DsInput`, `DsButton`, `DsAlert`, `DsCard`.

### A2-02 - Refactor de `AppointmentFormPage` e `EncounterFormPage`

**Objetivo**

Aplicar o padrão visual do design system nos forms operacionais.

### A2-03 - Cleanup de feedback visual e CSS local nos formulários

**Objetivo**

Reduzir CSS repetido e alinhar feedback de erro/sucesso/loading.

---

## Bloco A3 - Adoção em details e wrappers

### A3-01 - Criar wrappers `AppPageHeader` e `AppDetailSection`

**Objetivo**

Extrair padrões compostos reutilizáveis para details.

### A3-02 - Refactor de detail pages administrativas

**Objetivo**

Aplicar `DsCard`, `DsBadge`, `DsAlert` e wrappers nas páginas de detalhe administrativas.

### A3-03 - Refactor de detail pages operacionais/clínicas

**Objetivo**

Aplicar a mesma camada nas páginas de detalhe operacionais e clínicas.

---

## Bloco A4 - Fechamento

### A4-01 - Revisão final da adoção dos `Ds*`

**Objetivo**

Mapear onde a adoção aconteceu e o que ainda ficou fora.

### A4-02 - Atualização documental e backlog residual da frente visual

**Objetivo**

Fechar scorecard, relatório consolidado e backlog residual da Equipe A.

---

# Equipe B

## Bloco B1 - Fundação do módulo Scheduling

### B1-01 - Auditoria SSR/API do módulo Scheduling

**Objetivo**

Fechar o mapa entre legado, backend e MVP SPA.

**Entregáveis**

- matriz SSR vs API
- lista de divergências
- escopo do MVP

### B1-02 - Tipos e services do módulo Scheduling

**Objetivo**

Criar a camada de tipos e serviços base do módulo.

### B1-03 - Rotas e navegação do módulo Scheduling

**Objetivo**

Adicionar rotas SPA e item de navegação do módulo.

---

## Bloco B2 - Appointments

### B2-01 - `SchedulingListPage`

**Objetivo**

Entregar a listagem funcional de appointments.

### B2-02 - `SchedulingFormPage`

**Objetivo**

Entregar o formulário funcional de criação de appointment.

### B2-03 - Cancelamento de appointment na SPA

**Objetivo**

Permitir cancelamento com feedback e atualização visual.

---

## Bloco B3 - Queue

### B3-01 - `QueuePage`

**Objetivo**

Entregar a visualização funcional da fila operacional.

### B3-02 - Fluxo de check-in

**Objetivo**

Conectar appointment à queue operacional via UI.

### B3-03 - Ação de chamada da fila

**Objetivo**

Permitir o call da queue entry e refletir estado na UI.

---

## Bloco B4 - Hardening e qualidade

### B4-01 - Testes de página do módulo Scheduling

**Objetivo**

Cobrir list/form/queue pages.

### B4-02 - Testes de interação do módulo Scheduling

**Objetivo**

Cobrir create/cancel/check-in/call.

### B4-03 - E2E e documentação do módulo Scheduling

**Objetivo**

Fechar a migração com teste proporcional e documentação.

---

## Ordem sugerida de abertura

### Ordem da Equipe A

1. `A1-01`
2. `A1-02`
3. `A1-03`
4. `A1-04`
5. `A2-01`
6. `A2-02`
7. `A2-03`
8. `A3-01`
9. `A3-02`
10. `A3-03`
11. `A4-01`
12. `A4-02`

### Ordem da Equipe B

1. `B1-01`
2. `B1-02`
3. `B1-03`
4. `B2-01`
5. `B2-02`
6. `B2-03`
7. `B3-01`
8. `B3-02`
9. `B3-03`
10. `B4-01`
11. `B4-02`
12. `B4-03`

---

## Labels recomendadas para issues

### Gerais

- `team-a`
- `team-b`
- `wave-2`
- `frontend-spa`
- `design-system`
- `scheduling`
- `queue`
- `tests`
- `docs`

### Prioridade

- `prio-high`
- `prio-medium`
- `prio-low`

### Tipo

- `feature`
- `refactor`
- `hardening`
- `test`
- `documentation`

---

## Template curto de issue

### Título

`[Equipe A] A2-01 - Refactor de OwnerFormPage e PatientFormPage para Ds*`

ou

`[Equipe B] B3-02 - Fluxo de check-in do módulo Scheduling`

### Corpo

**Objetivo**

Descrever o resultado esperado da issue.

**Escopo**

- item 1
- item 2
- item 3

**Fora de escopo**

- item 1
- item 2

**Critério de pronto**

- [ ] typecheck limpo
- [ ] testes relevantes passando
- [ ] docs atualizadas se aplicável

**Arquivos prováveis**

- listar write scope principal
