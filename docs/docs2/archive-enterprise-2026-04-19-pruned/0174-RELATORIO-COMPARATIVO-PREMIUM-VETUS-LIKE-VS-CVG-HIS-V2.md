# 0174 - Relatorio Comparativo Premium Vetus-Like vs CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-11
**Objetivo:** Comparar o blueprint premium do `vetus-like` com a construcao real do `cvg-his-v2`, identificando gaps, oportunidades e acoes prioritarias para elevar o produto ao nivel enterprise.

---

## 1. Resumo Executivo

| Dimensão | vetus-like (Referencia) | cvg-his-v2 (Atual) | Lacuna |
|----------|------------------------|---------------------|--------|
| **Design System** | 90/100 | 5/100 | -85 CRITICO |
| **Frontend Premium** | 90/100 | 40/100 | -50 CRITICO |
| **Multi-Tenancy** | 90/100 | 15/100 | -75 CRITICO |
| **Seguranca** | 95/100 | 45/100 | -50 CRITICO |
| **Observabilidade** | 90/100 | 30/100 | -60 CRITICO |
| **LGPD/Compliance** | 90/100 | 15/100 | -75 CRITICO |
| **Documentacao** | 95/100 | 30/100 | -65 ALTO |
| **AI/ML** | 80/100 | 0/100 | -80 BAIXO |
| **Nota Global** | **90/100** | **42/100** | **-48** |

**Conclusao:** O `vetus-like` oferece um blueprint premium maduro. O `cvg-his-v2` tem execucao real, mas precisa evoluir em design system, multi-tenancy, seguranca e observabilidade para atingir o nivel enterprise.

---

## 2. O que o Vetus-Like faz melhor (referencia para emular)

### 2.1 Documentacao como Produto

O `vetus-like` apresenta 27+ documentos organizados como produto:

| Documento | Descricao | Pubblico |
|-----------|-----------|----------|
| 01-visao-e-estrategia | Visao premium, pilares, metas | Todos |
| 25-executive-summary | Resumo executivo premium | Sponsors |
| 05-roadmap | 7 fases, 9 marcos, inovacao continua | Todos |
| 07-backlog-epicos-kpis | 30+ epicos, KPIs premium | Produto |
| 23-risk-register | 18 riscos com AI/UX/security | Todos |
| 24-decision-log | 10 decisoes estruturais | Arquitetura |
| 26-readiness-assessment | Avaliacao de presteza premium | Sponsors |
| 09-blueprint-modulo | Blueprint de construcao premium | Todos |

**Padrao de nomenclatura:** Numeracao sequencial + nome descritivo em kebab-case.

### 2.2 Caracteristicas Premium Planejadas

| Pillar | Feature Premium | Status cvg-his-v2 |
|--------|-----------------|-------------------|
| UX Premium | Design system, dark mode, WCAG 2.1 AA, command palette | CRITICO - ausente |
| AI-Native | 8 ML models, smart scheduling, demand forecast | CRITICO - ausente |
| Platform Extensible | Marketplace, SDK, CLI, white-label | CRITICO - ausente |
| Hyper-Scale | Multi-region, 10K+ users, auto-scaling | PARCIAL |
| Zero Trust Security | SOC2, MFA, WAF, penetration testing | PARCIAL - RBAC apenas |

### 2.3 NFRs Detalhados

```
Performance Targets:
- LCP < 1.5s, FID < 100ms, CLS < 0.1
- API P50 < 100ms, P95 < 300ms, P99 < 500ms
- Search < 50ms

Availability:
- 99.9% uptime (43.8 min/month downtime)
- RPO < 5 min, RTO < 30 min
```

### 2.4 Visual Design Reference

O `vetus-like/referencias/` contem 100+ screenshots cobrindo:

- `page-Agenda.png` - Interface de agendamento
- `page-Comandas.png` - Ordens de servico/faturas
- `page-Clientes.png` - Gestao de clientes
- `page-Animais.png` - Registros de pacientes
- `page-Dashboard_Financeiro.png` - Dashboard financeiro
- `page-Internação.png` - Internacao
- `page-Estoques.png` - Gestao de inventario
- `page-Exames.png` - Exames laboratoriais
- `page-Profissionais.png` - Gestao de staff

**Padroes visuais identificados:**
- Sidebar de navegacao fixa com icones
- Layouts baseados em cards
- Badges de status com cores semanticas
- Tabelas de dados com ordenacao/filtragem
- Widgets de dashboard com metricas
- Modais para formularios
- Estados vazios com orientacao

---

## 3. O que o CVG-HIS V2 faz melhor

### 3.1 Produto Executavel Real

O `cvg-his-v2` nao e apenas um plano — e um sistema operacional:

- `apps/api` - API completa
- `apps/worker` - Jobs e processos assincronos
- `apps/spa` - SPA Vue 3 moderno
- Schema e migrations
- Cutover e deploy alinhados
- Docs vivas de arquitetura e operacao
- Suites de testes e gates

### 3.2 Frontend Oficial Moderno

O `apps/spa` ja opera com:
- Shell premium com navegacao por dominio
- Favoritos e recentes
- Topbar contextual
- Dashboard com KPIs e atalhos
- Roteamento por path
- Componentes do design system (DsButton, DsCard, etc.)

### 3.3 Governance de Acesso Mais Madura

O `cvg-his-v2` ja implementou alem do RBAC legado simples:
- Equipes de acesso
- Setores organizacionais
- Memberships
- Grants diretos
- Origem explicavel da permissao
- Matriz administravel

### 3.4 Cobertura Funcional Real

O `cvg-his-v2` cobre de forma executavel:
- Cadastro mestre (tutores, pacientes)
- Agenda e fila
- Atendimento e prontuario
- Triagem e internacao
- Diagnosticos, cirurgias, prescricoes
- Faturamento, caixa, estoque
- Notificacoes, auditoria, webhooks
- Api keys e comercial

---

## 4. Comparacao por Eixo

| Eixo | Vetus-like | CVG-HIS V2 | Leitura |
|------|------------|------------|---------|
| Visao de produto | Blueprint premium completo | Produto real com docs vivas | Vetus mais inspirador; CVG mais acionavel |
| Shell/navegacao | UI organizada, densa, por dominio | SPA premium em evolucao | CVG tem base certa, precisa unificar linguagem |
| Modulos | Muito bem descritos na documentacao | Muito bem cobertos no runtime | CVG tem mais execucao; Vetus tem mais narrativa |
| Governance | Forte no plano | Forte no implementado | CVG venceu em materializacao |
| Arquitetura | Muito forte no desenho | Muito forte no estado real | Empate, vantagem do CVG por estar operando |
| Visual | Estruturado, enterprise, funcional | Mais moderno, mais modular | CVG precisa absorver logica de organizacao |
| Backlog | Estruturado por capacidade e entrega | Estruturado por ondas e gaps | CVG precisa ficar mais modular |

---

## 5. Gaps Criticos Identificados

### 5.1 Design System - Score 5/100

**Estado atual:**
- `/packages/design-system/` existe mas incompleto
- Apenas 13 componentes basicos: button, input, modal, toast, tabs, etc.
- Tokens definidos em TypeScript + CSS variables
- Nenhum Storybook deployado
- Sem dark mode
- Sem acessibilidade WCAG 2.1 AA

**Componentes necessarios:**

| Categoria | Necessarios | Implementados |
|-----------|-------------|---------------|
| Form Controls | 15+ | 3 (button, input, search-bar) |
| Data Display | 10+ | 3 (card, badge, alert) |
| Navigation | 8+ | 0 |
| Feedback | 6+ | 2 (toast, spinner) |
| Layout | 5+ | 0 |
| Overlays | 4+ | 1 (modal) |
| Advanced | 10+ | 2 (data-table, command-palette) |

### 5.2 Frontend Premium - Score 40/100

**Features ausentes:**

| Feature | Status | Prioridade |
|---------|--------|------------|
| Command Palette (Ctrl+K) | Ausente | P0 |
| Keyboard Navigation | Ausente | P0 |
| Dark Mode | Ausente | P0 |
| Skeleton Loading | Ausente | P1 |
| Optimistic Updates | Ausente | P1 |
| Infinite Scroll | Ausente | P1 |
| PWA/Offline | Ausente | P2 |
| WebSocket Real-time | Ausente | P0 |
| Micro-interactions | Ausente | P2 |

### 5.3 Multi-Tenancy - Score 15/100

**Estado atual:**
- 49 tabelas definidas
- NENHUM `tenant_id` na maioria das tabelas
- Organizacao unica apenas
- `units.ts` existe mas limitado

**Tabelas criticas faltando:**
```sql
-- CRITICAL
tenants               -- Multi-corporacao
companies             -- Multi-entidade
branches               -- Multi-filial
sectors                -- Hierarquia detalhada

-- LGPD CRITICAL
consent_records       -- Compliance LGPD
data_subject_requests -- Direitos LGPD

-- BUSINESS MISSING
client_groups         -- Segmantacao
split_configurations  -- Divisao de pagamentos
card_transactions     -- Pagamentos com cartao
commission_rules      -- Comissoes de staff
ml_models/ml_predictions -- AI/ML
webhook_endpoints      -- Integracoes
campaigns             -- Marketing
```

### 5.4 Seguranca - Score 45/100

| Feature | Atual | Necessario |
|---------|-------|------------|
| MFA | Ausente | TOTP/WebAuthn para admin/finance |
| SSO/OIDC | Ausente | Integracao OAuth2 |
| WAF | Ausente | Protecao OWASP Top 10 |
| Rate Limiting | Basico | Por tenant, por usuario |
| ABAC | Ausente | Controle baseado em atributos |
| SOC2 | Ausente | Caminho para certificacao Type II |

### 5.5 Observabilidade - Score 30/100

**Atual:** Logs estruturados + correlation IDs basicos

**Faltando:**
- Endpoints Prometheus metrics
- Dashboards Grafana (infra, app, business, DB, cache, queue)
- Tracing distribuido (Jaeger/Tempo)
- SLOs e error budgets
- AlertManager + PagerDuty
- Monitoramento de uptime
- Agregacao de logs (ELK/Loki)

### 5.6 LGPD Compliance - Score 15/100

**Atual:** Tabela `audit_events` existe, basica

**Faltando:**
- UI de gestao de consentimento
- Portal de requisicoes de titular
- Automacao do "direito ao esquecimento"
- Anonimizacao de dados para analytics
- Exportacao de dados (portabilidade)
- Checks de privacy by design
- Integracao DPO

---

## 6. Scorecard Comparativo

| Dimensao | vetus-like | cvg-his-v2 | Lacuna | Prioridade |
|----------|-----------|------------|--------|------------|
| **Documentacao** | 95/100 | 30/100 | -65 | P1 |
| **Arquitetura** | 95/100 | 75/100 | -20 | P1 |
| **Design System** | 90/100 | 5/100 | -85 | P0 |
| **Frontend** | 90/100 | 40/100 | -50 | P0 |
| **Backend Modules** | 95/100 | 70/100 | -25 | P1 |
| **Seguranca** | 95/100 | 45/100 | -50 | P0 |
| **Observabilidade** | 90/100 | 30/100 | -60 | P0 |
| **Data Model** | 95/100 | 70/100 | -25 | P0 |
| **Auth/Authorization** | 95/100 | 65/100 | -30 | P0 |
| **Tests** | 90/100 | 35/100 | -55 | P1 |
| **Integracoes** | 85/100 | 25/100 | -60 | P2 |
| **AI/ML** | 80/100 | 0/100 | -80 | P3 |
| **LGPD/Compliance** | 90/100 | 15/100 | -75 | P0 |
| **CI/CD** | 90/100 | 55/100 | -35 | P1 |
| **Performance** | 90/100 | 50/100 | -40 | P1 |
| **Global Score** | **90/100** | **42/100** | **-48** | |

---

## 7. Acoes Prioritarias

### P0 - Critico (bloqueia enterprise)

1. **Completar Design System** - Deploy Storybook + 50+ componentes + dark mode + WCAG
2. **Implementar Multi-Tenancy** - Adicionar tenant_id + tabelas de hierarquia
3. **MFA para perfis criticos** - TOTP para Admin/Financeiro
4. **Deploy Observabilidade** - Prometheus + Grafana + tracing
5. **LGPD Consent Management** - UI de consentimento + data subject requests

### P1 - Alto (proxima fase)

1. **Command Palette** - Ctrl+K com busca global
2. **Keyboard Navigation** - Tab order, atalhos, "/" para search
3. **Skeleton Loading** - Estados de loading premium
4. **WAF/Rate Limiting** - Protecao OWASP Top 10
5. **Modulos faltantes** - CRM, Commissions, Fiscal, Webhooks

### P2 - Medio (roadmap futuro)

1. **API Gateway** - Rate limiting, versioning, WAF
2. **GraphQL** - Dashboards flexiveis
3. **Event Bus (Kafka)** - Comunicacao desacoplada
4. **Circuit Breaker** - Resiliencia
5. **Marketplace** - Extensibilidade

### P3 - Baixo (longo prazo)

1. **AI/ML Models** - Smart scheduling, forecasting
2. **SOC2 Type II** - Certificacao completa

---

## 8. Preservar do Vetus-Like

| Elemento | Como aplicar no CVG-HIS V2 |
|----------|------------------------------|
| Navegacao por dominio | Manter taxonomia do `apps/spa` e aprofundar hierarquia |
| Menu como espinha dorsal | Manter sidebar, contexto, favoritos e recentes |
| KPI por modulo | Cada hub precisa expor indicadores e alertas |
| Fluxos densos | Listas, filtros, calendarios e paineis de detalhe |
| Premium docs | Manter docs vivas por dominio, sem ambiguidade |
| Planejamento por capacidade | Backlog nascido do dominio e fluxo |

---

## 9. Diferenciar do Vetus-Like

| Meta | Diretriz |
|------|----------|
| Arquitetura executavel | Manter `apps/spa` como base oficial, evitar duplicidade |
| Governance real | Consolidar acesso, auditoria e membership como motor |
| Operacao reproduzivel | Build, testes, deploy e cutover com historias coerentes |
| Evolucao sustentavel | Construir por modulo e hub, corte por dominio |
| Linguagem premium moderna | Absorver densidade do Vetus sem copiar visual antigo |

---

## 10. Conclusao

O `vetus-like` mostra **como pensar premium**.
O `cvg-his-v2` mostra **como construir de forma real, auditavel e escalavel**.

O objetivo e combinar os dois:
1. Manter o `cvg-his-v2` como produto executavel
2. Usar o `vetus-like` como referencia de organizacao premium
3. Fazer o `apps/spa` virar a melhor expressao dessa combinacao

**Caminho critico:**
1. Design System (P0) - Bloqueia todo UX
2. Multi-Tenancy (P0) - Bloqueia deploy enterprise
3. Seguranca (P0) - MFA e WAF
4. Observabilidade (P0) - Prontidao para producao
5. LGPD (P0) - Requisito legal

---

## 11. Proximos Passos Imediatos

1. Deploy Storybook para o design system existente
2. Criar plano de migracao multi-tenancy
3. Implementar TOTP para perfis Admin/Financeiro
4. Adicionar endpoint `/metrics` (Prometheus)
5. Criar `docs/Enterprise/0175-ROADMAP-CONSTRUCAO-PREMIUM-V2.md`
6. Criar `docs/Enterprise/0176-BACKLOG-CONSTRUCAO-PREMIUM-V2.md`