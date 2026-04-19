# 0180 - WBS e Resource Plan Premium CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-11
**Base:** [0175-ROADMAP-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md](./0175-ROADMAP-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md) e [0178-PLANO-EXECUCAO-POR-SPRINTS-PREMIUM-CVG-HIS-V2.md](./0178-PLANO-EXECUCAO-POR-SPRINTS-PREMIUM-CVG-HIS-V2.md)
**Objetivo:** Definir a estrutura de quebra do trabalho (WBS), plano de recursos humanos, organizacao de squads e cronogramas de alocacao para o programa de construcao premium.

---

## 1. Work Breakdown Structure (WBS)

### 1.1 Nivel 1 - Entregas do Programa

```
CVG-HIS-V2 Premium Construction
├── 1.0 Fundacao Premium
├── 2.0 Core Operacional
├── 3.0 Assistencial Avancado
├── 4.0 Governance
├── 5.0 Comercial
├── 6.0 Plataforma e Corte
└── 7.0 Gestao do Programa
```

### 1.2 Nivel 2 - Pacotes de Trabalho

#### 1.0 - Fundacao Premium

```
1.0 Fundacao Premium
├── 1.1 Design System
│   ├── 1.1.1 Storybook e documentacao
│   ├── 1.1.2 Dark/Light mode
│   ├── 1.1.3 Command palette
│   ├── 1.1.4 Keyboard navigation
│   └── 1.1.5 Accessibility WCAG
├── 1.2 Shell do SPA
│   ├── 1.2.1 Menu por dominio
│   ├── 1.2.2 Topbar contextual
│   ├── 1.2.3 Favoritos
│   ├── 1.2.4 Recentes
│   └── 1.2.5 Breadcrumbs
├── 1.3 Dashboard
│   ├── 1.3.1 KPIs operacionais
│   ├── 1.3.2 Atalhos de dominio
│   └── 1.3.3 Widgets por perfil
└── 1.4 Infraestrutura de DEV
    ├── 1.4.1 CI/CD pipeline
    ├── 1.4.2 Ambiente de staging
    └── 1.4.3 Monitoring setup
```

#### 2.0 - Core Operacional

```
2.0 Core Operacional
├── 2.1 Cadastro Mestre
│   ├── 2.1.1 Hub de Tutores
│   ├── 2.1.2 Hub de Pacientes
│   ├── 2.1.3 Busca global
│   └── 2.1.4 Importacao de cadastros
├── 2.2 Agenda e Fila
│   ├── 2.2.1 Agenda premium
│   ├── 2.2.2 Fila operacional
│   ├── 2.2.3 Fluxo de atendimento
│   └── 2.2.4 Formulario de agendamento
└── 2.3 API Core
    ├── 2.3.1 Endpoints de cadastro
    ├── 2.3.2 Endpoints de agenda
    └── 2.3.3 Endpoints de atendimento
```

#### 3.0 - Assistencial Avancado

```
3.0 Assistencial Avancado
├── 3.1 Prontuario
│   ├── 3.1.1 Timeline de prontuario
│   ├── 3.1.2 Triagem
│   └── 3.1.3 Historico clinico
├── 3.2 Internacao
│   ├── 3.2.1 Mapa de setores e leitos
│   ├── 3.2.2 Gestao de internacao
│   └── 3.2.3 Alta com seguimento
├── 3.3 Clinico
│   ├── 3.3.1 Diagnosticos
│   ├── 3.3.2 Cirurgia
│   ├── 3.3.3 Prescricoes
│   └── 3.3.4 Execucao de prescricoes
└── 3.4 API Assistencial
    ├── 3.4.1 Endpoints de prontuario
    └── 3.4.2 Endpoints de internacao
```

#### 4.0 - Governance

```
4.0 Governance
├── 4.1 Access Control
│   ├── 4.1.1 Teams e sectors
│   ├── 4.1.2 Roles e permissions
│   ├── 4.1.3 Grants diretos
│   └── 4.1.4 Matriz de permissao
├── 4.2 Usuarios e Staff
│   ├── 4.2.1 User management
│   ├── 4.2.2 Staff management
│   └── 4.2.3 Memberships
├── 4.3 Auditoria
│   ├── 4.3.1 Eventos auditaveis
│   └── 4.3.2 Busca e filtros
├── 4.4 Seguranca
│   ├── 4.4.1 MFA TOTP
│   └── 4.4.2 SSO/OIDC
└── 4.5 API Governance
    └── 4.5.1 Endpoints de seguranca
```

#### 5.0 - Comercial

```
5.0 Comercial
├── 5.1 Billing e Financeiro
│   ├── 5.1.1 Painel de billing
│   ├── 5.1.2 Caixa operacional
│   └── 5.1.3 Relatorios financeiros
├── 5.2 Catalogos
│   ├── 5.2.1 Produtos
│   ├── 5.2.2 Servicos
│   └── 5.2.3 Precificacao
├── 5.3 Vendas
│   ├── 5.3.1 Vendas de balcao
│   ├── 5.3.2 Orcamentos
│   └── 5.3.3 Fechamento de comanda
└── 5.4 API Comercial
    ├── 5.4.1 Endpoints de billing
    └── 5.4.2 Endpoints de vendas
```

#### 6.0 - Plataforma e Corte

```
6.0 Plataforma e Corte
├── 6.1 Multi-Tenancy
│   ├── 6.1.1 Modelo de dados
│   ├── 6.1.2 Middleware de tenant
│   └── 6.1.3 Queries isoladas
├── 6.2 Observabilidade
│   ├── 6.2.1 Prometheus metrics
│   ├── 6.2.2 Dashboards Grafana
│   └── 6.2.3 Tracing distribuido
├── 6.3 LGPD/Compliance
│   ├── 6.3.1 Consent management
│   ├── 6.3.2 Data subject requests
│   └── 6.3.3 Right to be forgotten
├── 6.4 Corte do Legado
│   ├── 6.4.1 Matriz de corte para SPA
│   ├── 6.4.2 Migracao por dominio para `apps/spa`
│   └── 6.4.3 Desligamento do `apps/web`
└── 6.5 Estabilizacao
    ├── 6.5.1 Hardening
    ├── 6.5.2 Performance tuning
    └── 6.5.3 Cutover final
```

#### 7.0 - Gestao do Programa

```
7.0 Gestao do Programa
├── 7.1 Planejamento
│   ├── 7.1.1 Sprint planning
│   ├── 7.1.2 Backlog refinement
│   └── 7.1.3 Roadmap management
├── 7.2Execucao
│   ├── 7.2.1 Daily standups
│   ├── 7.2.2 Sprint reviews
│   └── 7.2.3 Retrospectivas
├── 7.3 Gestao de Risco
│   ├── 7.3.1 Identificacao
│   ├── 7.3.2 Mitigacao
│   └── 7.3.3 Monitoramento
└── 7.4 Gestao de Docs
    ├── 7.4.1 Documentacao viva
    └── 7.4.2 Atualizacao de docs
```

### 1.3 Dictamen de Pacotes (WBS Dictionary)

| CP | Nome | Descricao | Entregas | Responsavel |
|----|------|-----------|----------|-------------|
| 1.1.1 | Storybook DS | Documentacao interativa do design system | Storybook deployado, 13 componentes | Design System |
| 1.1.2 | Dark Mode | Toggle e transicao de temas | Dark mode funcional | Design System |
| 1.1.3 | Command Palette | Ctrl+K busca global | Command palette implementada | Design System |
| 1.1.4 | Keyboard Nav | Navegacao completa por teclado | 100% keyboard accessible | Design System |
| 1.1.5 | WCAG AA | Verificacao e correcao de accessibility | Todos componentes AA compliant | Design System |
| 1.2.1 | Menu Dominio | Sidebar organizada por dominio | Menu com 5 dominios | Shell Team |
| 1.2.2 | Topbar | Header com contexto persistente | User, role, unit visiveis | Shell Team |
| 1.2.3 | Favoritos | Sistema de rotas favoritas | ate 10 favoritos | Shell Team |
| 1.2.4 | Recentes | Lista de rotas recentes | 20 itens, 7 dias TTL | Shell Team |
| 1.2.5 | Breadcrumbs | Navegacao hierarquica | Breadcrumbs em todas telas | Shell Team |
| 1.3.1 | KPIs Dashboard | Widgets operacionais | 4 widgets basicos | Frontend |
| 1.3.2 | Atalhos | Acesso rapido a dominios | 8 atalhos configuraveis | Frontend |
| 1.3.3 | Widgets Perfil | Widgets customizados por role | Layouts por perfil | Frontend |
| 1.4.1 | CI/CD | Pipeline de deploy | Builds automatizados | DevOps |
| 1.4.2 | Staging | Ambiente de staging | Staging operacional | DevOps |
| 1.4.3 | Monitoring | Setup de monitoring | Dashboards base | DevOps |
| 2.1.1 | Hub Tutores | Hub de gerenciamento de tutores | List, detail, form completos | Frontend |
| 2.1.2 | Hub Pacientes | Hub de gerenciamento de pacientes | List, detail, form completos | Frontend |
| 2.1.3 | Busca Global | Busca federada | Busca via Ctrl+K | Frontend |
| 2.1.4 | Importacao | Wizard de importacao | Upload CSV/Excel | Backend |
| 2.2.1 | Agenda Premium | Calendario com visoes | Dia/semana/mes, drag-drop | Frontend |
| 2.2.2 | Fila | Console de trabalho | Fila real-time | Frontend |
| 2.2.3 | Atendimento | Fluxo de atendimento | Abertura a fechamento | Frontend |
| 2.2.4 | Form Agenda | Formulario aprimorado | Auto-complete, suggestions | Frontend |
| 2.3.1-3 | API Core | Endpoints core | CRUD completo | Backend |
| 3.1.1 | Prontuario TL | Timeline de prontuario | Timeline vertical | Frontend |
| 3.1.2 | Triagem | Form de triagem | Prioridade e destino | Frontend |
| 3.1.3 | Historico | Acesso ao historico | Busca e export | Backend |
| 3.2.1 | Mapa Leitos | Bed board visual | Mapa com status | Frontend |
| 3.2.2 | Internacao | Gestao de internacao | CRUD internacao | Frontend |
| 3.2.3 | Alta | Processo de alta | Checklist e retorno | Frontend |
| 3.3.1-4 | Clinico | Diagnosticos, cirurgia, prescricoes | Fluxo completo | Frontend/Backend |
| 4.1.1-4 | Access Control | Teams, sectors, roles, grants | Matriz visual | Backend |
| 4.2.1-3 | Users/Staff | Gestao de usuarios | CRUD completo | Backend |
| 4.3.1-2 | Auditoria | Eventos auditaveis | Busca e export | Backend |
| 4.4.1-2 | MFA/SSO | Seguranca | TOTP e OIDC | Backend |
| 5.1.1-3 | Billing | Faturamento e financeiro | Painel e relatorios | Frontend/Backend |
| 5.2.1-3 | Catalogos | Produtos e servicos | Catalogos premium | Frontend/Backend |
| 5.3.1-3 | Vendas | Vendas de balcao | Fechamento comanda | Frontend/Backend |
| 6.1.1-3 | Multi-tenancy | Tenancy multi-level | Isolamento por tenant | Backend |
| 6.2.1-3 | Observabilidade | Metrics, dashboards, tracing | Stack completo | DevOps |
| 6.3.1-3 | LGPD | Consentimento e direitos | Portal GDPR | Frontend/Backend |
| 6.4.1-3 | Corte Legado | Migracao por dominio para SPA e desligamento do web | 100% migrado sem novas entregas no web | All |
| 6.5.1-3 | Estabilizacao | Hardening e tuning | Sistema estavel | All |

---

## 2. Resource Plan

### 2.1 Organizacao de Squads

```
CVG-HIS-V2 Premium Construction Team
├── Core Squad
│   ├── Tech Lead (1)
│   ├── Backend Engineers (2)
│   └── Frontend Engineers (2)
├── Design System Squad
│   ├── Tech Lead (1)
│   ├── Designers (2)
│   └── Frontend Engineers (2)
├── Domain Squad A (Cadastro/Agenda)
│   ├── Tech Lead (1)
│   ├── Backend Engineers (2)
│   └── Frontend Engineers (2)
├── Domain Squad B (Assistencial)
│   ├── Tech Lead (1)
│   ├── Backend Engineers (2)
│   └── Frontend Engineers (2)
├── Platform Squad
│   ├── Tech Lead (1)
│   ├── Backend Engineers (2)
│   └── DevOps Engineers (2)
├── Governance Squad
│   ├── Tech Lead (1)
│   ├── Backend Engineers (2)
│   └── Frontend Engineers (1)
└── Program Management
    ├── Program Manager (1)
    ├── Product Owner (1)
    └── Scrum Master (1)
```

### 2.2 Alocacao por Fase

#### Fase 1 (Sprints 1-2) - Fundacao Premium

| Squad | Tech Lead | Backend | Frontend | Design | DevOps | Total |
|-------|-----------|---------|----------|--------|--------|-------|
| Core | 1 | 1 | 2 | - | 1 | 5 |
| Design System | 1 | - | 2 | 2 | - | 5 |
| Domain A | 1 | 1 | 1 | - | - | 3 |
| Program | 1 PM | 1 PO | 1 SM | - | - | 3 |
| **Total** | **4** | **3** | **6** | **2** | **1** | **19** |

#### Fase 2 (Sprints 3-4) - Core Operacional

| Squad | Tech Lead | Backend | Frontend | Design | DevOps | Total |
|-------|-----------|---------|----------|--------|--------|-------|
| Core | 1 | 1 | 2 | - | 1 | 5 |
| Domain A | 1 | 2 | 2 | - | - | 5 |
| Domain B | 1 | 1 | 1 | - | - | 3 |
| Program | 1 PM | 1 PO | 1 SM | - | - | 3 |
| **Total** | **4** | **5** | **6** | **0** | **1** | **20** |

#### Fase 3 (Sprints 5-6) - Assistencial Avancado

| Squad | Tech Lead | Backend | Frontend | Design | DevOps | Total |
|-------|-----------|---------|----------|--------|--------|-------|
| Core | 1 | 1 | 2 | - | 1 | 5 |
| Domain B | 1 | 2 | 3 | - | - | 6 |
| Governance | 1 | 1 | 1 | - | - | 3 |
| Program | 1 PM | 1 PO | 1 SM | - | - | 3 |
| **Total** | **4** | **5** | **7** | **0** | **1** | **21** |

#### Fase 4 (Sprints 7-8) - Governance e Comercial

| Squad | Tech Lead | Backend | Frontend | Design | DevOps | Total |
|-------|-----------|---------|----------|--------|--------|-------|
| Core | 1 | 1 | 2 | - | 1 | 5 |
| Domain B | 1 | 1 | 2 | - | - | 4 |
| Governance | 1 | 2 | 2 | - | - | 5 |
| Platform | 1 | 2 | 1 | - | - | 4 |
| Program | 1 PM | 1 PO | 1 SM | - | - | 3 |
| **Total** | **5** | **7** | **8** | **0** | **1** | **25** |

#### Fase 5 (Sprints 9-10) - Plataforma e Corte

| Squad | Tech Lead | Backend | Frontend | Design | DevOps | Total |
|-------|-----------|---------|----------|--------|--------|-------|
| Core | 1 | 1 | 2 | - | 1 | 5 |
| Platform | 2 | 3 | 1 | - | 2 | 8 |
| Governance | 1 | 1 | 1 | - | - | 3 |
| Program | 1 PM | 1 PO | 1 SM | - | - | 3 |
| **Total** | **5** | **6** | **5** | **0** | **3** | **23** |

### 2.3 Resumo de Recursos

| Recurso | Quantidade | Fase Pico |
|---------|------------|-----------|
| Tech Leads | 5-7 | Fases 2-4 |
| Backend Engineers | 5-7 | Fases 2-4 |
| Frontend Engineers | 5-8 | Fases 2-4 |
| Designers | 2 | Fase 1 |
| DevOps Engineers | 1-3 | Fases 1 e 5 |
| Program Manager | 1 | Todas |
| Product Owner | 1 | Todas |
| Scrum Master | 1 | Todas |
| **Total** | **21-28** | **Fase 4** |

---

## 3. Cronograma de Alocacao

### 3.1 Timeline Geral

```
Mes          | 1   2   3   4   5   6
-------------|------------------------
Design       | XX XX
Core Squad   | XX XX XX XX XX XX
Domain A     |     XX XX XX
Domain B     |         XX XX XX XX
Platform     |             XX XX XX XX
Governance   |                 XX XX
Program      | XX XX XX XX XX XX XX XX
```

### 3.2 Milestones de Alocacao

| Milestone | Data | Entregas | Squad Focus |
|-----------|------|----------|-------------|
| M1 | Sem 4 | Shell, DS, Command Palette | Core + Design System |
| M2 | Sem 8 | Cadastro, Agenda, Fila | Domain A |
| M3 | Sem 12 | Prontuario, Triagem, Cirurgia | Domain B |
| M4 | Sem 14 | Access Control, MFA, Audit | Governance |
| M5 | Sem 16 | Billing, Caixa, Vendas | Domain B + Core |
| M6 | Sem 20 | Multi-tenancy, Observability, Corte | Platform |

---

## 4. Budget Estimado

### 4.1 Custo de Mão de Obra (Mensal)

| Papel | Quantidade | Custo Mensal (R$) |
|-------|------------|-------------------|
| Tech Lead | 5 | 75.000 |
| Backend Engineer | 6 | 60.000 |
| Frontend Engineer | 6 | 54.000 |
| Designer | 2 | 20.000 |
| DevOps Engineer | 2 | 20.000 |
| Program Manager | 1 | 18.000 |
| Product Owner | 1 | 15.000 |
| Scrum Master | 1 | 12.000 |
| **Subtotal** | **24** | **274.000** |

### 4.2 Custo de Infraestrutura (Mensal)

| Item | Custo Mensal (R$) |
|------|-------------------|
| Cloud (AWS/GCP) | 30.000 |
| Tools (Jira, Confluence, etc) | 5.000 |
| Third-party services | 10.000 |
| **Subtotal** | **45.000** |

### 4.3 Custo Total Estimado

| Fase | Semanas | Custo Mensal | Custo Total |
|------|---------|--------------|-------------|
| Fase 1 (Fundacao) | 4 | 319.000 | 127.600 |
| Fase 2 (Core) | 8 | 319.000 | 255.200 |
| Fase 3 (Assistencial) | 8 | 319.000 | 255.200 |
| Fase 4 (Governance) | 8 | 319.000 | 255.200 |
| Fase 5 (Plataforma) | 8 | 319.000 | 255.200 |
| **Total** | **36 semanas** | - | **1.148.400** |

---

## 5. Matriz RACI

### 5.1 Governance do Programa

| Atividade | PM | PO | SM | Tech Lead | Dev |
|-----------|---|---|----|-----------|-----|
| Sprint Planning | C | A | R | C | I |
| Daily Standup | I | I | R | C | R |
| Sprint Review | A | R | C | C | R |
| Sprint Retrospective | C | C | R | C | R |
| Backlog Refinement | A | R | C | C | I |
| Risk Management | R | C | C | C | C |
| Stakeholder Updates | R | C | I | I | I |

### 5.2 Entregas Tecnicas

| Entrega | Tech Lead | Backend | Frontend | Design | DevOps |
|---------|-----------|---------|----------|--------|--------|
| Design System | A | I | R | C | I |
| Shell SPA | A | C | R | C | - |
| Cadastro | C | R | R | I | I |
| Agenda | C | R | R | - | I |
| Assistencial | A | R | R | - | - |
| Governance | A | R | R | - | - |
| Comercial | C | R | R | - | - |
| Plataforma | A | R | I | - | R |
| Corte Legado | A | C | R | - | C |

---

## 6. Riscos de Recursos

| Risco | Prob | Impact | Mitigacao |
|-------|------|--------|-----------|
| Turnover de Tech Lead | Media | Alto | Cross-training, documentation |
| Desbalanceamento Backend/Frontend | Media | Medio | Buffer capacity, pair programming |
| Sobrecarga de DevOps | Alta | Alto | Auto-scaling, IaC |
| Indisponibilidade de Designer | Media | Medio | Design tokens, component library |
| Burnout de equipe | Baixa | Alto | Rotacao de squads, breaks |

---

## 7. Entregaveis de Gestao

### 7.1 Relatorios

| Relatorio | Frequencia | audiencia | Conteudo |
|-----------|------------|-----------|----------|
| Sprint Report | Biweekly | Stakeholders | Achievements, blockers, next |
| Burndown Chart | Weekly | Team | Velocity, remaining work |
| Risk Report | Monthly | sponsors | Top risks, mitigations |
| Status Report | Weekly | PMO | Overall program status |
| Budget Report | Monthly | Finance | Spent vs planned |

### 7.2 Rituais

| Ritual | Frequencia | Duracao | Participantes |
|--------|------------|---------|---------------|
| Sprint Planning | Biweekly | 4h | All |
| Daily Standup | Daily | 15min | Team |
| Sprint Review | Biweekly | 2h | All |
| Sprint Retro | Biweekly | 1h | Team |
| Backlog Refinement | Weekly | 2h | PO, SM, TL |
| Risk Review | Monthly | 1h | PM, TL |
| Stakeholder Update | Biweekly | 30min | PM, Sponsors |

---

## 8. Anexos

### 8.1 WBS Numeracao Completa

```
1.0    Fundacao Premium
  1.1   Design System
    1.1.1 Storybook
    1.1.2 Dark Mode
    1.1.3 Command Palette
    1.1.4 Keyboard Navigation
    1.1.5 Accessibility WCAG
  1.2   Shell SPA
    1.2.1 Menu Dominio
    1.2.2 Topbar
    1.2.3 Favoritos
    1.2.4 Recentes
    1.2.5 Breadcrumbs
  1.3   Dashboard
    1.3.1 KPIs
    1.3.2 Atalhos
    1.3.3 Widgets Perfil
  1.4   Infraestrutura
    1.4.1 CI/CD
    1.4.2 Staging
    1.4.3 Monitoring

2.0    Core Operacional
  2.1   Cadastro
    2.1.1 Tutores
    2.1.2 Pacientes
    2.1.3 Busca
    2.1.4 Importacao
  2.2   Agenda
    2.2.1 Agenda Premium
    2.2.2 Fila
    2.2.3 Atendimento
    2.2.4 Form Agenda
  2.3   API Core

3.0    Assistencial
  3.1   Prontuario
  3.2   Internacao
  3.3   Cirurgia/Prescricoes
  3.4   API Assistencial

4.0    Governance
  4.1   Access Control
  4.2   Users/Staff
  4.3   Auditoria
  4.4   Seguranca

5.0    Comercial
  5.1   Billing
  5.2   Catalogos
  5.3   Vendas
  5.4   API Comercial

6.0    Plataforma
  6.1   Multi-tenancy
  6.2   Observabilidade
  6.3   LGPD
  6.4   Corte Legado
  6.5   Estabilizacao

7.0    Gestao
  7.1   Planejamento
  7.2   Execucao
  7.3   Risco
  7.4   Docs
```

### 8.2 Checklist de Gestao

- [ ] Squads definidos e alocados
- [ ] WBS aprovado
- [ ] Budget aprovado
- [ ] Timeline acordado
- [ ] Rituais agendados
- [ ] Canais de comunicacao configurados
- [ ] Ferramentas configuradas
- [ ] Risks identificados
