# MASTER TRAIL - CVG-HIS V2 Premium Enterprise

**Status:** EM EXECUCAO
**Data de validacao:** 2026-04-12
**Objetivo:** Entregar o CVG-HIS V2 como produto Premium Enterprise, consolidando `apps/spa` como frontend unico e elevando o produto da baseline real de `69/100` para `90/100` no scorecard enterprise.

---

## 1. Contexto Consolidado

### Snapshot Executivo Real (`0191` + `0194`)

| Eixo | Status real em `2026-04-12` |
|------|------------------------------|
| Baseline tecnica | `69/100` |
| Release A | `BLOCKED` |
| Release B | `DONE` |
| Release C | `IN PROGRESS` |
| Release D | `TODO` |
| Release E | `TODO` |
| Sprint 3 | `DONE` |
| Sprint 4 | `DONE` |
| Sprint 5 | `DONE` |
| Sprint 6 | `TODO` |

**Leitura executiva:**
- a trilha de hardening (`R2` e `R3`) avancou antes do fechamento da recuperacao do executavel (`R0`) e da entrada em `80/100` (`R1`)
- config baseline, security baseline e observabilidade base foram entregues
- o principal gap atual nao esta mais em configuracao ou tracing, e sim no fundamento ainda aberto de build, coverage, `release:check` e modularizacao inicial
- a fonte operacional de verdade para sprints e backlog passa a ser `0193` + `0194`

### Scorecard Atual (0174)

| Dimensao | Atual | Meta | Lacuna | Prioridade |
|----------|-------|------|--------|------------|
| Design System | 5/100 | 90/100 | -85 | P0 |
| Frontend | 40/100 | 90/100 | -50 | P0 |
| Multi-Tenancy | 15/100 | 90/100 | -75 | P0 |
| Seguranca | 45/100 | 90/100 | -50 | P0 |
| Observabilidade | 30/100 | 90/100 | -60 | P0 |
| LGPD/Compliance | 15/100 | 90/100 | -75 | P0 |
| Documentacao | 30/100 | 85/100 | -55 | P1 |
| Arquitetura | 75/100 | 95/100 | -20 | P1 |
| Backend Modules | 70/100 | 95/100 | -25 | P1 |
| Auth/Authorization | 65/100 | 95/100 | -30 | P0 |
| Tests | 35/100 | 90/100 | -55 | P1 |
| CI/CD | 55/100 | 90/100 | -35 | P1 |
| Performance | 50/100 | 90/100 | -40 | P1 |
| **Global** | **42/100** | **90/100** | **-48** | |

### O que ja existe (0163-0173, 0172)

O `apps/spa` ja e consolidado como frontend oficial com:
- Shell premium com navegacao por dominio
- Favoritos e rotas recentes
- Command palette
- Dashboard com KPIs e atalhos
- Todos os dominios implementados (owners, patients, scheduling, encounters, medical-records, triage, inpatient, billing, cash, products, services, counter-sales, quotes, inventory, access-control, users, staff, audit, notifications, api-keys, webhooks)
- Multi-tenancy com RLS
- RBAC/ABAC com catalogo enterprise de permissoes
- Prometheus metrics
- Health endpoints

### O que falta (nova fase)

O produto tem base solida, mas ainda nao e **Premium Enterprise**. Falta:
- Design system com 50+ componentes documentados em Storybook
- Dark mode completo com toggle
- Accessibility WCAG 2.1 AA verificado
- Command palette funcional
- MFA TOTP para perfis criticos
- Dashboards Grafana completos
- Tracing distribuido
- OpenTelemetry com exportacao OTLP e correlacao entre traces, logs e metrics
- Validacao estrita de configuracao com schema fail-fast
- Hardening de seguranca operacional (CORS restritivo, secrets fora de `.env`, rotacao e scan)
- Quality gates reais com thresholds progressivos de coverage e release sem excecao manual
- Backup e restore automatizados com teste periodico
- Rate limiting distribuido em Redis
- Feature flags com governanca
- Runtime enterprise com Helm charts e trilha Kubernetes
- Secrets management dedicado (Vault ou equivalente)
- Event-driven architecture com contratos e DLQ governados
- Consent management LGPD
- Multi-tenancy com tenant_id em todas as tabelas criticas

### Estado real da trilha de implementacao

O programa nao esta seguindo mais a sequencia linear original do master. Hoje, o estado correto e:

- `R0 / Release A` ainda aberto: build, typecheck, coverage minima e `release:check` continuam pendentes
- `R2 / Release B` concluido: config e security baseline entregues
- `R3 / Release C` parcialmente concluido: Sprint 5 fechada, Sprint 6 ainda nao iniciada
- `R4` e `R5` ainda nao iniciados

Isso significa que o master precisa ser lido como trilha estrategica, enquanto a execucao real de curto prazo esta governada por:

- [0192 - Roadmap de Implementacao](./0192-ROADMAP-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md)
- [0193 - Backlog de Implementacao](./0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md)
- [0194 - Plano de Sprints de Implementacao](./0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md)

---

## 2. Principios da Trilha

| Principio | Diretriz |
|-----------|----------|
| SPA como unico frontend | `apps/web` recebe apenas manutencao de transicao |
| Build no spa | Toda nova entrega vai para `apps/spa` |
| Corte por dominio | Migracao dominio a dominio com aceite claro |
| Docs vivas | Documentacao segue o codigo, nao o contrario |
| Backlog por impacto | Prioridade por risco operacional e ganho funcional |

---

## 3. Roadmap Unificado (Horizontes)

### H1 - Consolidacao do Shell Premium (0-30 dias)

**Foco:** Estabilizar a experiencia unificada do SPA

| Entrega | Descricao | Aceite |
|---------|-----------|--------|
| Shell consistente | Menu por dominio, contexto, favoritos, recentes em todas as telas | UX coerente |
| Dark mode | Toggle dark/light com transicao suave | Tokens consistentes |
| Command palette | Ctrl+K com busca global de rotas e acoes | Funcional |
| Keyboard nav | Tab order, atalhos "/" para search, "?" para help | 100% accessible |
| Storybook DS | 13+ componentes documentados e interativos | Docs visiveis |

**Squad:** Frontend (4) + Design System (2)

---

### H2 - Hubs Operacionais por Dominio (30-90 dias)

**Foco:** Transformar paginas em centros de dominio

| Dominio | Entregas |
|---------|----------|
| Cadastro | Tutores e pacientes como hubs com KPI, alerta, acao e detalhe |
| Agenda | Agenda premium com visoes dia/semana/mes, drag-drop |
| Fila | Console operacional em tempo real |
| Atendimentos | Fluxo completo abertura a fechamento |

**Squad:** Frontend (4) + Backend (4) + Domain (2)

---

### H3 - Governance e Plataforma Premium (90-150 dias)

**Foco:** Consolidar administracao explicavel e auditavel

| Dominio | Entregas |
|---------|----------|
| Access-control | Teams, sectors, roles, grants explicaveis |
| Users | Membership e origem da permissao visiveis |
| Audit | Busca e filtros de eventos auditaveis |
| MFA | TOTP para Admin/Financeiro |
| Notifications | Canais visiveis e acionaveis |

**Squad:** Backend (4) + Security (2) + Frontend (2)

---

### H4 - Comercial e Expansao (150-240 dias)

**Foco:** Fechar camada comercial com leitura executiva

| Dominio | Entregas |
|---------|----------|
| Billing | Painel de faturamento e recebiveis |
| Caixa | Abertura, movimentacao e fechamento |
| Produtos/Servicos | Catalogos premium |
| Vendas | balcao, orcamentos, fechamento |

**Squad:** Frontend (3) + Backend (3) + Domain (2)

---

### H5 - Corte do Legado (240+ dias)

**Foco:** Desativar `apps/web` operacionalmente

| Dominio | Entregas |
|---------|----------|
| Corte progressivo | Dominio a dominio com aceite |
| Limpeza documental | Docs que induzem web removidas |
| Desligamento | Deploy canonico centrado no SPA |

---

### H6 - Hardening Premium Enterprise (transversal, iniciar agora)

**Foco:** fechar o gap entre produto funcional e operacao enterprise auditavel

| Dominio | Entregas |
|---------|----------|
| Configuracao | schema Zod, fail-fast de ambiente e inventario de vars obrigatorias |
| Observabilidade | OpenTelemetry, OTLP exporter, correlacao trace-log-metric |
| Security | CORS restritivo, secrets manager, secret scanning, politica de rotacao |
| Runtime | rate limiter Redis, backup/restore automatizado, feature flags, Helm charts |
| Arquitetura | avaliacao Fastify, maturacao event-driven e runbooks de plataforma |

**Squad:** Platform (2) + Security (1) + Backend (2) + SRE (1)

---

## 4. Backlog Unificado (Epics)

### EPIC P01 - Design System Premium

| ID | Prioridade | Entrega | Dependencias |
|----|------------|---------|--------------|
| P01-01 | ~~P0~~ **DONE** | Storybook deployado | nenhum | COMPLETO - 14 stories, 17 tests passing, 15 Vue components | 2026-04-11 |
| P01-02 | ~~P0~~ **DONE** | Dark/Light mode | P01-01 | COMPLETO - 2026-04-11 |
| P01-03 | ~~P0~~ **DONE** | Command palette | P01-01 | COMPLETO - 2026-04-11 |
| P01-04 | ~~P0~~ **DONE** | Keyboard navigation | P01-01 | COMPLETO - "/" focus search, "?" help, arrows nav, skip-link, main landmarks | 2026-04-11 |
| P01-05 | ~~P1~~ **DONE** | Skeleton loading | P01-01 | COMPLETO - placeholders padronizados e testes de cobertura | 2026-04-11 |
| P01-06 | ~~P1~~ **DONE** | Navegacao (sidebar, tabs, breadcrumbs) | P01-01 | COMPLETO - nav global, breadcrumbs e tabs padronizados | 2026-04-11 |
| P01-07 | ~~P1~~ **DONE** | WCAG 2.1 AA | P01-01 | COMPLETO - DsInput com aria-invalid/aria-describedby, DsModal aria-modal/labelledby, DsButton focus-visible, skip-link, contraste 4.5:1 tokens, focus rings em todos componentes, prefers-reduced-motion em skeleton | 2026-04-12 |
| P01-08 | ~~P2~~ **DONE** | Micro-interacoes | P01-01 | COMPLETO - hover, transitions e animações de interface | 2026-04-11 |

### EPIC P02 - Shell Premium

| ID | Prioridade | Entrega | Dependencias |
|----|------------|---------|--------------|
| P02-01 | ~~P0~~ **DONE** | Menu por dominio | P01-01 | COMPLETO - 2026-04-11 |
| P02-02 | ~~P0~~ **DONE** | Topbar contextual | P02-01 | COMPLETO - 2026-04-11 |
| P02-03 | ~~P0~~ **DONE** | Favoritos e recentes | P02-01 | COMPLETO - 2026-04-11 |
| P02-04 | ~~P1~~ **DONE** | CTA padronizado | P02-02 | COMPLETO - 2026-04-11 |

### EPIC P03 - Dashboard Premium

| ID | Prioridade | Entrega | Dependencias |
|----|------------|---------|--------------|
| P03-01 | ~~P0~~ **DONE** | KPIs operacionais | P02-02 | COMPLETO - 2026-04-11 | 2026-04-11 |
| P03-02 | ~~P0~~ **DONE** | Atalhos de dominios | P03-01 | COMPLETO - 2026-04-11 | 2026-04-11 |
| P03-03 | ~~P1~~ **DONE** | Widgets por perfil | P03-01 | COMPLETO - 2026-04-11 | 2026-04-11 |

### EPIC P04 - Cadastro Mestre

| ID | Prioridade | Entrega | Dependencias |
|----|------------|---------|--------------|
| P04-01 | ~~P0~~ **DONE** | Tutores como hub | P02-01 | COMPLETO - KPIs (pacientes, contatos, financeiro), alertas (documento ausente, sem contatos, inativo, pacientes inativos), ações rápidas (novo paciente, agendar, WhatsApp), pacientes vinculados em tabela | 2026-04-11 |
| P04-02 | ~~P0~~ **DONE** | Pacientes como hub | P04-01 | COMPLETO - KPIs (atendimentos, peso, raça, idade), alertas (peso ausente, raça indefinida, inativo, falecido), ações rápidas (novo atendimento, agendar, prontuário, ver atendimentos) | 2026-04-11 |
| P04-03 | ~~P1~~ **DONE** | Busca federada | P04-01 | COMPLETO - busca debounced (400ms), nomes resolvidos para IDs, ações com links para detalhe, status badges, total de resultados | 2026-04-11 |

### EPIC P05 - Agenda e Atendimento

| ID | Prioridade | Entrega | Dependencias |
|----|------------|---------|--------------|
| P05-01 | ~~P0~~ **DONE** | Agenda premium | P02-02 | COMPLETO - leitura operacional com resumo, filtros e status | 2026-04-11 |
| P05-02 | ~~P0~~ **DONE** | Fila operacional | P05-01 | COMPLETO - console de fila com check-in, chamada e no-show | 2026-04-11 |
| P05-03 | ~~P0~~ **DONE** | Atendimentos | P04-02 | COMPLETO - abertura, timeline, transições e fechamento | 2026-04-11 |
| P05-04 | ~~P1~~ **DONE** | Formulario melhorado | P05-01 | COMPLETO - resumo em tempo real e busca de paciente/tutor | 2026-04-11 |

### EPIC P06 - Prontuario Assistencial

| ID | Prioridade | Entrega | Dependencias |
|----|------------|---------|--------------|
| P06-01 | ~~P0~~ **DONE** | Linha do tempo | P05-03 | COMPLETO - prontuário com timeline, entradas e histórico clínico | 2026-04-11 |
| P06-02 | ~~P0~~ **DONE** | Triagem | P05-03 | COMPLETO - classificação, revisão e histórico de alterações | 2026-04-11 |
| P06-03 | ~~P0~~ **DONE** | Internacao e leitos | P06-01 | COMPLETO - internação, setores, leitos e mapa de ocupação | 2026-04-11 |
| P06-04 | ~~P1~~ **DONE** | Diagnosticos | P06-01 | COMPLETO - solicitações, anexos e timeline diagnóstica | 2026-04-11 |
| P06-05 | ~~P1~~ **DONE** | Cirurgia | P06-01 | COMPLETO - solicitação cirúrgica com timeline de acompanhamento | 2026-04-11 |
| P06-06 | ~~P1~~ **DONE** | Prescricoes | P06-01 | COMPLETO - prescrição e execução com rastreio operacional | 2026-04-11 |
| P06-07 | ~~P1~~ **DONE** | Altas | P06-03 | COMPLETO - desfecho, continuidade e retorno pós-alta | 2026-04-11 |

### EPIC P07 - Governance

| ID | Prioridade | Entrega | Dependencias |
|----|------------|---------|--------------|
| P07-01 | ~~P0~~ **DONE** | Access-control | P02-02 | COMPLETO - catalogo enterprise de permissoes, matriz RBAC/ABAC por usuario/equipe/setor, heranca e grants explicitos, criaacao de equipes e setores | 2026-04-11 |
| P07-02 | ~~P0~~ **DONE** | Users com membership | P07-01 | COMPLETO - UsersListPage com KPIs operacionais, filtros por perfil/status, badges de role, ver/editar links | 2026-04-11 |
| P07-03 | ~~P0~~ **DONE** | Auditoria | P02-02 | COMPLETO - AuditPage com overview (total/riscos/modulos/atores), DataTable com filtros por risco/query, formatacao de datas, badges de risco | 2026-04-11 |
| P07-04 | ~~P1~~ **DONE** | Staff | P07-01 | COMPLETO - StaffListPage com KPIs (total/ativos/departamentos/cargos/cobertura), story-cards executivos, DataTable com status badges | 2026-04-11 |
| P07-05 | ~~P1~~ **DONE** | Notifications | P02-02 | COMPLETO - NotificationsPage com overview de notificacoes e jobs, filtros por status, DataTables com badges, processar pendentes | 2026-04-11 |
| P07-06 | ~~P1~~ **DONE** | API keys/webhooks | P07-05 | COMPLETO - ApiKeysPage com summary cards (ativas/permissoes/expiracao), formulario de criacao com catalogo de permissoes, DataTable de chaves existentes | 2026-04-11 |
| P07-07 | ~~P2~~ **DONE** | MFA TOTP | P07-01 | COMPLETO - MfaService com verifyTOTP/verifyTOTP/regenerateRecoveryCodes, isMfaRequired por role (admin/finance/auditor), completeMfaLogin com brute-force lockout, endpoints /mfa/setup|confirm|status|disable|recovery-codes wired, MfaPage.vue com token input | 2026-04-12 |

### EPIC P08 - Comercial

| ID | Prioridade | Entrega | Dependencias | Status | Detalhes |
|----|------------|---------|--------------|--------|----------|
| P08-01 | ~~P0~~ **DONE** | Billing | P05-03 | COMPLETO | hub-kpis (DsStatCard: registros, em aberto, quitados, valor total), hub-alerts (cobranças em aberto, tudo quitado), hub-actions (novo faturamento, ver caixa, orçamentos, atualizar) | 2026-04-11 |
| P08-02 | ~~P0~~ **DONE** | Caixa | P08-01 | COMPLETO | hub-kpis (DsStatCard: orçamentos, valor preparado, PIX, entradas), hub-actions (criar orçamento, vendas balcão, faturamento, atualizar) | 2026-04-11 |
| P08-03 | ~~P0~~ **DONE** | Produtos/Servicos | P02-01 | COMPLETO | hub-kpis (DsStatCard: produtos, ativos, inativos, resultados), hub-actions (novo produto, ver estoque, orçamentos, atualizar) | 2026-04-11 |
| P08-04 | ~~P0~~ **DONE** | Vendas balcao | P08-03 | COMPLETO | hub-kpis (DsStatCard: total, aprovados, rascunhos, convertidos), hub-actions (criar orçamento, ver caixa, faturamento, atualizar), botao Converter desabilitado exceto para status approved | 2026-04-11 |
| P08-05 | ~~P1~~ **DONE** | Orcamentos | P08-04 | COMPLETO | hub-kpis (DsStatCard: orçamentos, aprovados, convertidos, volume total), hub-alerts (aguardando conversão, encerrados), hub-actions (vendas balcão, ver caixa, faturamento, atualizar) | 2026-04-11 |
| P08-06 | ~~P1~~ **DONE** | Inventario | P08-04 | COMPLETO | hub-kpis (DsStatCard: itens, abaixo do ponto, unidades, valor), hub-alerts (estoque baixo, estoque okay), hub-actions (novo item, orçamentos, faturamento, atualizar) | 2026-04-11 |
| P08-07 | ~~P1~~ **DONE** | Relatorios | P08-02 | COMPLETO | hub-kpis (DsStatCard: faturas, receita bruta, aprovados, pipeline), hub-alerts (cobranças em aberto, orçamentos prontos), hub-actions (criar orçamento, faturamento, ver caixa, vendas balcão, atualizar) | 2026-04-11 |

### EPIC P09 - Multi-Tenancy

| ID | Prioridade | Entrega | Dependencias |
|----|------------|---------|--------------|
| P09-01 | ~~P0~~ **DONE** | Modelo multi-level | nenhum | COMPLETO - schema hierárquico com tenants, accounts e units/setores operacionais | 2026-04-12 |
| P09-02 | ~~P0~~ **DONE** | Middleware tenant | P09-01 | COMPLETO - resolução centralizada de tenant/account/branch/user via headers e fallback autenticado | 2026-04-12 |
| P09-03 | ~~P0~~ **DONE** | Queries isoladas | P09-02 | COMPLETO - helpers de contexto, `tenantFilter` e RLS por `account_id` com testes focados | 2026-04-12 |

### EPIC P10 - Observabilidade

| ID | Prioridade | Entrega | Dependencias |
|----|------------|---------|--------------|
| P10-01 | ~~P0~~ **DONE** | /metrics Prometheus | nenhum | COMPLETO - prom-client com httpRequestsTotal, httpRequestDurationSeconds, httpErrorsTotal, default metrics, normalizeRoute anti-cardinality | 2026-04-12 |
| P10-02 | ~~P0~~ **DONE** | Dashboards Grafana | P10-01 | COMPLETO - cvg-his-v2-api-dashboard.json com SLO Summary, P50/P95/P99 latency, datasource Prometheus | 2026-04-12 |
| P10-03 | ~~P0~~ **DONE** | Tracing | P10-01 | COMPLETO - W3C Trace Context em tracing.ts (traceparent/tracestate), createSpan/endSpan/withSpan, middleware wired em server.ts | 2026-04-12 |
| P10-04 | ~~P1~~ **DONE** | Logs estruturados | nenhum | COMPLETO - StructuredLogger em @cvg-his-v2/shared-logging com redaçao de dados sensiveis (CPF, senhas, tokens) | 2026-04-12 |
| P10-05 | ~~P1~~ **DONE** | SLOs e error budgets | P10-02 | COMPLETO - slos.ts com calculateErrorBudget/calculateBurnRate/getSLOStatus/calculateBudgetRemaining/generateSLOReport, 4 SLOs (P95/P99 latency, availability, error rate), /slos endpoint em health-routes, dashboard Grafana com error budget remaining e burn rate panels | 2026-04-12 |

### EPIC P11 - LGPD/Compliance

| ID | Prioridade | Entrega | Dependencias | Status | Detalhes |
|----|------------|---------|--------------|--------|----------|
| P11-01 | ~~P0~~ **DONE** | Consent management | P09-01 | COMPLETO | hub LGPD com hub-kpis (consentimentos ativos, DSRs pendentes/completas/total), hub-alerts (consentimento clínico pendente, DSRs pendentes, todos concedidos), hub-actions, aba Consentimento com 6 finalidades (clínico, financeiro, operacional, marketing, analytics, notificações) com grant/revoke por finalidade | 2026-04-12 |
| P11-02 | ~~P0~~ **DONE** | Data subject requests | P11-01 | COMPLETO | aba Solicitações DSR com formulário de criação (tipos: acesso, exportação, rectificação, portabilidade, exclusão, revogação), tabela de DSRs com filtros por status, ações completar/rejeitar, StatusBadge por status, audit trail integrado | 2026-04-12 |
| P11-03 | ~~P0~~ **DONE** | Right to be forgotten | P11-02 | COMPLETO | implementado via DSR tipo data_deletion e data_anonymization na aba Solicitações, com workflow completo pending → in_progress → completed/rejected e resultado documentado em resultJson | 2026-04-12 |

### EPIC P12 - Corte do Legado

| ID | Prioridade | Entrega | Dependencias |
|----|------------|---------|--------------|
| P12-01 | ~~P0~~ **DONE** | Bloquear web | nenhum | COMPLETO - guardrail executavel para congelar `apps/web` fora de excecao documentada | 2026-04-12 |
| P12-02 | ~~P0~~ **DONE** | Docs alinhadas | P02-02 | COMPLETO - README, arquitetura de frontend, proxy e scripts alinhados ao `apps/spa` | 2026-04-12 |
| P12-03 | ~~P0~~ **DONE** | Corte por dominio | P05-03 | COMPLETO - matriz encerrada com todos os dominios em `web desligado` | 2026-04-12 |
| P12-04 | ~~P1~~ **DONE** | Checklist desligamento | P12-03 | COMPLETO - roteiro operacional consolidado e verificacao automatica de cutover | 2026-04-12 |
| P12-05 | ~~P2~~ **DONE** | Limpeza residual | P12-04 | COMPLETO - docs vivas do legado residual reclassificadas e `apps/web` marcado como congelado | 2026-04-12 |

### EPIC P13 - Platform Hardening Premium Enterprise

| ID | Prioridade | Entrega | Dependencias | Status | Detalhes |
|----|------------|---------|--------------|--------|----------|
| P13-01 | ~~P0~~ **DONE** | Validacao rigorosa de config com Zod | nenhum | COMPLETO - schema Zod central, inventario de env vars e fail-fast em API, worker e SPA | 2026-04-12 |
| P13-02 | ~~P0~~ **DONE** | OpenTelemetry com OTLP exporter | P10-03 | COMPLETO - SDK OTel, exporter OTLP e bootstrap observavel em API e worker | 2026-04-12 |
| P13-03 | ~~P0~~ **DONE** | Security hardening de runtime (CORS, headers, scans, secrets hygiene) | P13-01 | COMPLETO - allowlist CORS, headers endurecidos, secret scanning e politica de rotacao | 2026-04-12 |
| P13-04 | P0 | Quality gates progressivos de coverage e release gate imutavel | nenhum | TODO | bloqueado pelo fechamento de `R0` e `R1` |
| P13-05 | P1 | Backup/restore automatizado com teste de restauracao | P13-01 | TODO | alvo da Sprint 6 |
| P13-06 | P1 | Rate limiter distribuido em Redis | P13-01 | TODO | alvo de runtime premium |
| P13-07 | P1 | Feature flags com Unleash | P13-01 | TODO | alvo de runtime premium |
| P13-08 | P1 | Avaliacao arquitetural de Fastify com decisao ADR | P13-01 | TODO | longo prazo |
| P13-09 | P2 | Helm charts e trilha Kubernetes | P13-05 | TODO | longo prazo |
| P13-10 | P2 | Secrets management dedicado (Vault ou equivalente) | P13-03 | TODO | longo prazo |
| P13-11 | P2 | Event-driven architecture com contratos e DLQ governados | P13-06 | TODO | longo prazo |

---

## 5. Sprints de Execucao

### Semaforo executivo da execucao real (`0194`)

| Bloco | Status | Observacao |
|--------|--------|------------|
| Sprint 1 | TODO | build, typecheck e alinhamento documental do executavel ainda nao fechados |
| Sprint 2 | TODO | coverage minima, `release:check` e recorte inicial de `server.ts` ainda nao fechados |
| Sprint 3 | DONE | config baseline implementada |
| Sprint 4 | DONE | security baseline implementada |
| Sprint 5 | DONE | OpenTelemetry, OTLP, spans HTTP/DB/worker e correlacao log-trace entregues |
| Sprint 6 | TODO | operacao auditavel, backup, restore e evidencia SOC2 ainda pendentes |
| Release A | BLOCKED | depende do fechamento das Sprints 1-2 |
| Release B | DONE | config e security baseline entregues |
| Release C | IN PROGRESS | observabilidade base entregue; operacao auditavel ainda pendente |
| Release D | TODO | runtime premium e quality gates intermediarios ainda nao iniciados |
| Release E | TODO | plataforma enterprise de longo prazo ainda nao iniciada |

### Historico de sprints do programa

| Sprint | Foco | Itens | Saida |
|--------|------|-------|-------|
| Sprint 1 | Fundacao Premium | P01-01 a P01-04, P02-01 a P02-03 | Shell e DS funcionais |
| Sprint 2 | Core Operacional | P03-01, P03-02, P04-01, P04-02, P05-01, P05-02, P05-03 | Cadastro e agenda |
| Sprint 3 | Assistencial | P06-01 a P06-07 | Prontuario e procedimentos |
| Sprint 4 | Governance | P07-01 a P07-07 | Access-control e audit |
| Sprint 5 | Comercial | P08-01 a P08-07 | Billing e comercial | ~~EM EXECUCAO~~ **COMPLETO** - 2026-04-11 |
| Sprint 6 | Plataforma | P09-01 a P09-03, P10-01 a P10-03, P11-01 a P11-03 | ~~EM EXECUCAO~~ **COMPLETO** - 2026-04-12 (P12 pendente) |
| Sprint 7 | Hardening Enterprise | P13-01 a P13-07 | Config, OTel, security, quality gates, backup e runtime premium |
| Sprint 8 | Plataforma Premium de Longo Prazo | P13-08 a P13-11 | ADRs estruturais, k8s, Vault e arquitetura orientada a eventos |

---

## 6. Issues por Modulo (Consolidado)

### Navigation / Shell
- `ISS-001` - Menu por dominio unificado
- `ISS-002` - Topbar com contexto persistente
- `ISS-003` - Favoritos e recentes
- `ISS-004` - Command palette

### Dashboard
- `ISS-010` - KPIs operacionais
- `ISS-011` - Atalhos de dominios
- `ISS-012` - Widgets por perfil

### Cadastro
- `ISS-020` - Tutores como hub
- `ISS-021` - Busca e filtros
- `ISS-022` - Detalhe denso

### Agenda/Atendimento
- `ISS-030` - Agenda premium
- `ISS-031` - Fila operacional
- `ISS-032` - Atendimento como fluxo

### Prontuario
- `ISS-040` - Linha do tempo
- `ISS-041` - Triagem
- `ISS-042` - Internacao/leitos
- `ISS-043` - Diagnosticos
- `ISS-044` - Cirurgia
- `ISS-045` - Prescricoes
- `ISS-046` - Altas

### Governance
- `ISS-050` - Access-control
- `ISS-051` - Users/membership
- `ISS-052` - Auditoria
- `ISS-053` - Staff
- `ISS-054` - Notifications
- `ISS-055` - API keys/webhooks

### Comercial
- `ISS-060` - Billing
- `ISS-061` - Caixa
- `ISS-062` - Produtos
- `ISS-063` - Servicos
- `ISS-064` - Vendas balcao
- `ISS-065` - Orcamentos
- `ISS-066` - Inventario
- `ISS-067` - Relatorios

### Plataforma
- `ISS-070` - Multi-tenancy
- `ISS-071` - Observabilidade
- `ISS-072` - LGPD

### Hardening Enterprise
- `ISS-090` - Config validation com Zod
- `ISS-091` - OpenTelemetry + OTLP
- `ISS-092` - CORS/secrets/security hardening
- `ISS-093` - Coverage thresholds e release gate
- `ISS-094` - Backup/restore automatizado
- `ISS-095` - Redis rate limiter
- `ISS-096` - Feature flags / Unleash
- `ISS-097` - ADR Fastify
- `ISS-098` - Helm charts / Kubernetes
- `ISS-099` - Vault + event-driven governance

### Corte
- `ISS-080` - Bloquear web
- `ISS-081` - Docs alinhadas
- `ISS-082` - Corte por dominio
- `ISS-083` - Checklist

---

## 7. Matriz de Corte Web para SPA

| Dominio | Estado Atual | Estado Alvo |
|---------|-------------|------------|
| Shell/Navegacao | spa oficial | web desligado |
| Dashboard | spa oficial | web desligado |
| Owners | spa oficial | web desligado |
| Patients | spa oficial | web desligado |
| Scheduling | spa oficial | web desligado |
| Encounters | spa oficial | web desligado |
| Medical Records | spa oficial | web desligado |
| Triage | spa oficial | web desligado |
| Inpatient | spa oficial | web desligado |
| Billing | spa oficial | web desligado |
| Governance | spa oficial | web desligado |
| Comercial | spa oficial | web desligado |

**Sequencia de corte:** Shell > Core diario > Assistencial > Governance > Comercial > Desligamento final

---

## 8. Gates de Aceite

### Gate A - Shell
- Menu, contexto, favoritos e recentes completos
- Dark mode funcional
- Command palette operante

### Gate B - Core
- Owners, patients, agenda, fila, atendimento funcionando
- Nenhuma jornada critica abre no web

### Gate C - Assistencial
- Prontuario, triagem, internacao, procedimentos fechando ciclo

### Gate D - Governance
- Access-control, users, audit visiveis e consultaveis

### Gate E - Comercial
- Billing, caixa, produtos, servicos, vendas funcionais

### Gate F - Corte Final
- Checklist de desligamento completo
- SPA validado em uso real
- Web sem novas entregas

### Gate G - Premium Enterprise
- Config fail-fast validada em runtime e CI
- OpenTelemetry exportando traces reais
- CORS e secrets fora de modo permissivo
- Coverage gate evoluindo por fases sem threshold zerado
- Backup/restore testado
- Redis rate limiter e feature flags governados
- ADR de runtime e trilha Kubernetes documentados

---

## 9. Primeiro Passo Imediato

O programa e grande demais para comecar tudo de uma vez. O primeiro passo e:

### Fechar Release A ou replanejar formalmente a ordem da trilha

**Por que comecar por aqui:**
- o master agora reconhece que `R2` e `R3` avancaram antes de `R0` e `R1`
- o repositorio ainda nao fecha todos os gates basicos prometidos na entrada em `80/100`
- seguir para runtime premium sem resolver isso aumenta o risco de inflacao documental
- a proxima decisao de governanca precisa escolher entre estabilizar o executavel ou rebaselinear oficialmente a sequencia do plano

**Entrega:**
- `Release A` formalmente fechada com build, typecheck, coverage minima e `release:check`
- ou roadmap explicitamente replanejado assumindo execucao fora de ordem
- backlog e semaforo da trilha sincronizados entre master, roadmap e backlog

**Dependencias:** baseline real confirmada em `0191`

**Aceite:**
- sem ambiguidade entre plano estrategico e execucao real
- governanca clara sobre o que esta concluido, bloqueado e pendente
- proximo bloco escolhido com criterio explicito

---

## 10. Links da Trilha

### Baseline (ja executado)
- [0163 - Comparativo Vetus-like vs CVG-HIS V2](./0163-RELATORIO-COMPARATIVO-VETUS-LIKE-CVG-HIS-V2.md)
- [0164 - Roadmap anterior](./0164-ROADMAP-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md)
- [0165 - Backlog anterior](./0165-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md)
- [0166 - Plano de Sprints](./0166-PLANO-EXECUCAO-POR-SPRINTS-CVG-HIS-V2.md)
- [0172 - Relatorio Final Implementacao SPA](./0172-RELATORIO-FINAL-IMPLEMENTACAO-SPA-PREMIUM.md)

### Nova Fase
- [0174 - Comparativo Premium](./0174-RELATORIO-COMPARATIVO-PREMIUM-VETUS-LIKE-VS-CVG-HIS-V2.md)
- [0175 - Roadmap Premium](./0175-ROADMAP-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md)
- [0176 - Backlog Premium](./0176-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md)
- [0178 - Plano de Sprints Premium](./0178-PLANO-EXECUCAO-POR-SPRINTS-PREMIUM-CVG-HIS-V2.md)
- [0179 - Issues por Modulo Premium](./0179-ISSUES-POR-MODULO-PREMIUM-CVG-HIS-V2.md)
- [0180 - WBS e Resource Plan](./0180-WBS-AND-RESOURCE-PLAN-PREMIUM-CVG-HIS-V2.md)
- [0191 - Avaliacao Real](./0191-RELATORIO-EXECUTIVO-AVALIACAO-REAL-2026-04-12.md)
- [0192 - Roadmap de Implementacao](./0192-ROADMAP-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md)
- [0193 - Backlog de Implementacao](./0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md)
- [0194 - Plano de Sprints de Implementacao](./0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md)

---

## 11. Regra de Execucao

1. **R0 primeiro** - recuperar build, typecheck, regressao e coverage minima antes de escalar a narrativa premium
2. **Nenhuma issue nova para `apps/web`**
3. **Corte por dominio** - So desliga quando o dominio estiver verde no SPA
4. **Docs atualizadas** - Cada fase fecha com documentacao sincronizada
5. **Gate antes de prosseguir** - Nao avanca sem aceite da fase atual
