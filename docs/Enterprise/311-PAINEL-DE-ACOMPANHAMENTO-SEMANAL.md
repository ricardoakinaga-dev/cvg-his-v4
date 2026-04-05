# 311 - Painel de Acompanhamento Semanal

## Objetivo

Este painel existe para acompanhar semanalmente a execução paralela das equipes da Onda 2 com um formato simples, operacional e reutilizável.

Use este documento como ritual semanal de:

- acompanhamento de status
- leitura de progresso real
- identificação de bloqueios
- decisão de prioridade da próxima semana

## Documentos relacionados

- [303-PLANO-OPERACIONAL-DUAS-EQUIPES-ONDA-2.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/303-PLANO-OPERACIONAL-DUAS-EQUIPES-ONDA-2.md)
- [306-PLANO-EXECUCAO-IMEDIATA-EQUIPE-A.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/306-PLANO-EXECUCAO-IMEDIATA-EQUIPE-A.md)
- [307-PLANO-EXECUCAO-IMEDIATA-EQUIPE-B.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/307-PLANO-EXECUCAO-IMEDIATA-EQUIPE-B.md)
- [308-QUADRO-DEPENDENCIAS-CRUZADAS-EQUIPES.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/308-QUADRO-DEPENDENCIAS-CRUZADAS-EQUIPES.md)
- [309-CRONOGRAMA-SEMANAL-RESUMIDO-DUAS-EQUIPES.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/309-CRONOGRAMA-SEMANAL-RESUMIDO-DUAS-EQUIPES.md)
- [310-LISTA-PRS-ISSUES-DUAS-EQUIPES.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/Enterprise/310-LISTA-PRS-ISSUES-DUAS-EQUIPES.md)

---

## Instruções de uso

### Frequência recomendada

- atualizar 1 vez por semana
- usar no checkpoint principal da semana
- revisar no fechamento da semana seguinte

### Regra de preenchimento

- registrar apenas progresso real concluído
- separar claramente o que está `concluído`, `em andamento` e `bloqueado`
- evitar percentuais inflados
- atualizar bloqueios com ação de desbloqueio proposta

### Escala de status sugerida

- `verde`: no prazo, sem bloqueio relevante
- `amarelo`: progresso parcial, com risco moderado
- `vermelho`: bloqueio material, atraso ou dependência crítica

---

## Cabeçalho da semana

**Semana de referência:** `____/____/______ a ____/____/______`

**Responsável pela atualização:** `________________________`

**Status geral da operação:** `verde | amarelo | vermelho`

**Resumo executivo da semana:**

> Escrever em 3 a 6 linhas o que avançou, o que travou e o que precisa de decisão.

---

## Painel resumido

| Responsável | Frente | Status | % Concluído | Entregas da semana | Principal bloqueio | Próximo passo |
|------------|--------|--------|-------------|--------------------|--------------------|---------------|
| Orquestrador | Governança, scorecards e priorização | `___` | `___%` | `________________` | `________________` | `________________` |
| E1 | Plataforma frontend, design system e UX premium | `___` | `___%` | `________________` | `________________` | `________________` |
| E2 | Módulos operacionais e fluxos de negócio | `___` | `___%` | `________________` | `________________` | `________________` |
| E3 | Qualidade, hardening, evidência e guardrails | `___` | `___%` | `________________` | `________________` | `________________` |

> Nota operacional: as seções históricas "Equipe A" e "Equipe B" abaixo podem ser mantidas como referência, mas o acompanhamento corrente deve priorizar o modelo `Orquestrador + 3 Executores`.

---

## Equipe A - Status detalhado

### Objetivo atual da sprint

`____________________________________________________________`

### Status

- Cor: `verde | amarelo | vermelho`
- Percentual da sprint: `____%`
- Tendência: `adiantado | no ritmo | em risco | atrasado`

### Entregáveis concluídos na semana

- [ ] `________________________________________________`
- [ ] `________________________________________________`
- [ ] `________________________________________________`
- [ ] `________________________________________________`

### Entregáveis em andamento

- [ ] `________________________________________________`
- [ ] `________________________________________________`
- [ ] `________________________________________________`

### Itens não iniciados

- [ ] `________________________________________________`
- [ ] `________________________________________________`

### Bloqueios da Equipe A

| ID | Bloqueio | Impacto | Dependência de quem | Ação de desbloqueio | Dono | Prazo |
|----|----------|---------|---------------------|---------------------|------|-------|
| A-B1 | `____________` | `baixo/médio/alto` | `A/B/externo` | `____________` | `______` | `____` |
| A-B2 | `____________` | `baixo/médio/alto` | `A/B/externo` | `____________` | `______` | `____` |

### Qualidade da semana

- `typecheck`: `ok | atenção | falhou`
- `testes unitários`: `ok | atenção | falhou`
- `testes de página`: `ok | atenção | falhou`
- `visual regression`: `ok | atenção | falhou`

### PRs da semana

- `PR-A____` - `____________________________________________`
- `PR-A____` - `____________________________________________`
- `PR-A____` - `____________________________________________`

### Decisões necessárias

- `____________________________________________________________`
- `____________________________________________________________`

### Próximo passo recomendado da Equipe A

`____________________________________________________________`

---

## Equipe B - Status detalhado

### Objetivo atual da sprint

`____________________________________________________________`

### Status

- Cor: `verde | amarelo | vermelho`
- Percentual da sprint: `____%`
- Tendência: `adiantado | no ritmo | em risco | atrasado`

### Entregáveis concluídos na semana

- [ ] `________________________________________________`
- [ ] `________________________________________________`
- [ ] `________________________________________________`
- [ ] `________________________________________________`

### Entregáveis em andamento

- [ ] `________________________________________________`
- [ ] `________________________________________________`
- [ ] `________________________________________________`

### Itens não iniciados

- [ ] `________________________________________________`
- [ ] `________________________________________________`

### Bloqueios da Equipe B

| ID | Bloqueio | Impacto | Dependência de quem | Ação de desbloqueio | Dono | Prazo |
|----|----------|---------|---------------------|---------------------|------|-------|
| B-B1 | `____________` | `baixo/médio/alto` | `A/B/externo` | `____________` | `______` | `____` |
| B-B2 | `____________` | `baixo/médio/alto` | `A/B/externo` | `____________` | `______` | `____` |

### Qualidade da semana

- `typecheck`: `ok | atenção | falhou`
- `testes unitários`: `ok | atenção | falhou`
- `testes de página`: `ok | atenção | falhou`
- `E2E`: `ok | atenção | falhou`

### PRs da semana

- `PR-B____` - `____________________________________________`
- `PR-B____` - `____________________________________________`
- `PR-B____` - `____________________________________________`

### Decisões necessárias

- `____________________________________________________________`
- `____________________________________________________________`

### Próximo passo recomendado da Equipe B

`____________________________________________________________`

---

## Dependências cruzadas da semana

| Dependência | Time dono | Time impactado | Status | Ação necessária | Prazo |
|------------|-----------|----------------|--------|-----------------|-------|
| `________________` | `A/B` | `A/B` | `aberta/fechada` | `________________` | `____` |
| `________________` | `A/B` | `A/B` | `aberta/fechada` | `________________` | `____` |
| `________________` | `A/B` | `A/B` | `aberta/fechada` | `________________` | `____` |

---

## Checklist do checkpoint semanal

### Checkpoint de início da semana

- [ ] objetivos da sprint confirmados
- [ ] backlog da semana congelado
- [ ] áreas de alto churn mapeadas
- [ ] dependências cruzadas revisadas
- [ ] PRs prioritários definidos

### Checkpoint do meio da semana

- [ ] progresso real revisado
- [ ] bloqueios atualizados
- [ ] PRs em risco identificados
- [ ] decisões pendentes escaladas
- [ ] mudanças breaking congeladas

### Checkpoint de fechamento da semana

- [ ] entregáveis concluídos confirmados
- [ ] percentuais atualizados com honestidade
- [ ] documentação atualizada
- [ ] scorecard atualizado, se aplicável
- [ ] backlog residual da próxima semana definido

---

## Resumo de saúde da operação

### Critérios

#### Operação saudável

- ambas as equipes avançaram sem bloqueio material
- PRs pequenos e integráveis
- nenhum arquivo compartilhado virou gargalo
- testes e validações principais permaneceram verdes

#### Operação em atenção

- uma equipe com atraso moderado
- dependências cruzadas abertas por mais de 2 dias
- regressão visual ou técnica pontual

#### Operação crítica

- bloqueio alto em área compartilhada
- regressão recorrente
- backlog da sprint inviabilizado
- dependência não resolvida entre equipes

### Classificação da semana

- Saúde geral: `saudável | atenção | crítica`
- Justificativa:

`____________________________________________________________`

---

## Decisão de planejamento para a próxima semana

### O que continua

- `____________________________________________________________`
- `____________________________________________________________`

### O que entra

- `____________________________________________________________`
- `____________________________________________________________`

### O que sai ou é postergado

- `____________________________________________________________`
- `____________________________________________________________`

---

## Histórico resumido

| Semana | Status geral | Equipe A % | Equipe B % | Principal ganho | Principal bloqueio |
|--------|--------------|------------|------------|-----------------|--------------------|
| W1 | `___` | `___%` | `___%` | `____________` | `____________` |
| W2 | `___` | `___%` | `___%` | `____________` | `____________` |
| W3 | `___` | `___%` | `___%` | `____________` | `____________` |
| W4 | `___` | `___%` | `___%` | `____________` | `____________` |
