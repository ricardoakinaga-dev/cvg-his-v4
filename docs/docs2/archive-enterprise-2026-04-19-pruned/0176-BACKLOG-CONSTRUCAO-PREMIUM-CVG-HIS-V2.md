# 0176 - Backlog de Construcao Premium do CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-11
**Base:** [0174-RELATORIO-COMPARATIVO-PREMIUM-VETUS-LIKE-VS-CVG-HIS-V2.md](./0174-RELATORIO-COMPARATIVO-PREMIUM-VETUS-LIKE-VS-CVG-HIS-V2.md) e [0175-ROADMAP-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md](./0175-ROADMAP-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md)

---

## 1. Regras do Backlog

| Regra | Diretriz |
|-------|----------|
| Prioridade P0 | Bloqueia operacao, corte ou consistencia do frontend oficial |
| Prioridade P1 | Eleva o produto de forma material e reduz risco real |
| Prioridade P2 | Acabamento premium, refinamento e endurecimento |
| Escopo de frontend | Novas entregas vao para `apps/spa` |
| Escopo de legado | `apps/web` nao recebe novas entregas; apenas desligamento, limpeza e remocao de redirects |

---

## 2. Macroordem de Execucao

1. Shell premium e padrao de navegacao
2. Dashboard e rotinas de entrada
3. Core operacional assistencial
4. Governance e administracao
5. Comercial e analitica
6. Observabilidade, testes e corte final do legado

---

## 3. Backlog Priorizado

### EPIC P01 - Design System Premium

| ID | Prioridade | Entrega | Dependencias | Aceite |
|----|------------|---------|--------------|--------|
| P01-01 | P0 | Storybook deployado com todos os componentes | nenhum | docs visiveis, interativas e atualizadas |
| P01-02 | P0 | Dark mode / light mode com toggle | P01-01 | transicao suave, tokens consistentes |
| P01-03 | P0 | Command palette (Ctrl+K) | P01-01 | busca global de rotas e acoes |
| P01-04 | P0 | Navegacao por teclado completa | P01-01 | Tab order, atalhos, "/" para search |
| P01-05 | P1 | Skeleton loading em todos os componentes | P01-01 | estados de loading premium |
| P01-06 | P1 | Componentes de navegacao (sidebar, tabs, breadcrumbs) | P01-01 | shell completo e consistente |
| P01-07 | P1 | Componentes de overlay (tooltip, popover, dropdown) | P01-01 | interacoes ricas e acessiveis |
| P01-08 | P1 | Form components avancados (checkbox, radio, datepicker, file-upload) | P01-01 | forms completos e acessiveis |
| P01-09 | P1 | Accessibility WCAG 2.1 AA em todos os componentes | P01-01 | contraste, labels, ARIA |
| P01-10 | P2 | Micro-interacoes e animacoes | P01-01 | feedback visual premium |
| P01-11 | P2 | Icon system unificado (Lucide ou Phosphor) | P01-01 | consistencia visual total |

---

### EPIC P02 - Shell Premium do SPA

| ID | Prioridade | Entrega | Dependencias | Aceite |
|----|------------|---------|--------------|--------|
| P02-01 | P0 | Menu por dominio unificado | P01-01 | todo dominio agrupado com label, icone e descricao |
| P02-02 | P0 | Topbar com contexto persistente | P02-01 | usuario, role, account e grupo ativo visiveis em todas as rotas |
| P02-03 | P0 | Favoritos e recentes | P02-01 | fixar e revisitar rotas funciona em toda a SPA |
| P02-04 | P1 | CTA primario/secundario padronizado | P02-02 | acoes principais ficam sempre no mesmo lugar por tipo de tela |
| P02-05 | P1 | Breadcrumbs em todos os fluxos | P02-01 | navegacao hierarquica visivel |
| P02-06 | P2 | Notificacoes em tempo real via WebSocket | P02-02 | alertas e atualizacoes em tempo real |

---

### EPIC P03 - Dashboard e Entrada Operacional

| ID | Prioridade | Entrega | Dependencias | Aceite |
|----|------------|---------|--------------|--------|
| P03-01 | P0 | Dashboard com KPIs operacionais | P02-02 | dashboard mostra tutores, pacientes, agenda e fila em tempo real |
| P03-02 | P0 | Atalhos de dominios prioritarios | P03-01 | acesso rapido para os fluxos mais usados |
| P03-03 | P1 | Blocos de recentes e favoritos | P02-03 | dashboard reflete o uso real do operador |
| P03-04 | P1 | Widgets por perfil/role | P03-01 | a leitura muda por papel/role |
| P03-05 | P1 | Filtros de dashboard configuraveis | P03-01 | usuario escolhe o que ver |

---

### EPIC P04 - Cadastro Mestre

| ID | Prioridade | Entrega | Dependencias | Aceite |
|----|------------|---------|--------------|--------|
| P04-01 | P0 | Tutores como hub de relacionamento | P02-01 | list/detail/form com resumo, atalhos e contexto |
| P04-02 | P0 | Pacientes como hub assistencial | P04-01 | ficha do paciente com tutor, status e acao primaria |
| P04-03 | P1 | Busca e filtros de cadastro | P04-01 | localizar pessoa/paciente em menos cliques |
| P04-04 | P1 | Telas de detalhe mais densas | P04-01 | o detalhe vira ponto de decisao, nao so ficha |
| P04-05 | P2 | Importacao de cadastros com validacao | P04-01 | upload em massa com preview e correcao |
| P04-06 | P2 | Dedup engine e data quality | P04-01 | identificar duplicados automaticamente |

---

### EPIC P05 - Agenda, Fila e Atendimento

| ID | Prioridade | Entrega | Dependencias | Aceite |
|----|------------|---------|--------------|--------|
| P05-01 | P0 | Agenda com leitura premium | P02-02 | calendario, filtros e status operacionais consistentes |
| P05-02 | P0 | Fila operacional | P05-01 | fila vira console de trabalho do dia |
| P05-03 | P0 | Atendimentos como fluxo principal | P04-02 | abrir, acompanhar e concluir atendimento sem vacuo |
| P05-04 | P1 | Formulario de agendamento melhorado | P05-01 | criar agendamento com menos friccao |
| P05-05 | P1 | Detalhe de atendimento com contexto | P05-03 | resumo, timeline e acao principal visiveis |
| P05-06 | P1 | Confirmacao por WhatsApp | P05-01 | notificacao automatica de agendamento |
| P05-07 | P2 | Smart scheduling com AI | P05-01 | sugestao de horarios por demanda |

---

### EPIC P06 - Prontuario e Assistencial Avancado

| ID | Prioridade | Entrega | Dependencias | Aceite |
|----|------------|---------|--------------|--------|
| P06-01 | P0 | Prontuario como linha do tempo | P05-03 | acesso rapido ao historico clinico |
| P06-02 | P0 | Triagem como etapa critica | P05-03 | prioridade, destino e correcoes controladas |
| P06-03 | P0 | Internacao com setores, leitos e mapa | P06-01 | ocupar, mover e liberar leitos com clareza |
| P06-04 | P1 | Diagnosticos com resumo executivo | P06-01 | exames e resultados sao legiveis em contexto |
| P06-05 | P1 | Cirurgia com status e acompanhamento | P06-01 | o caso cirurgico e rastreavel do inicio ao fim |
| P06-06 | P1 | Prescricoes e execucao | P06-01 | prescrever e executar com leitura clara |
| P06-07 | P1 | Altas com proxima acao | P06-03 | alta fecha ciclo e aponta seguimento |
| P06-08 | P2 | Clinical decision support | P06-01 | sugestoes baseadas em evidencia |

---

### EPIC P07 - Governance e Administracao

| ID | Prioridade | Entrega | Dependencias | Aceite |
|----|------------|---------|--------------|--------|
| P07-01 | P0 | Access-control como governance real | P02-02 | equipes, setores, roles e grants explicaveis |
| P07-02 | P0 | Usuarios com membership e origem | P07-01 | usuario mostra permissao efetiva e fontes |
| P07-03 | P0 | Auditoria consultavel | P02-02 | busca e filtros de eventos auditaveis |
| P07-04 | P1 | Staff com leitura administrativa madura | P07-01 | equipe interna com visualizacao operacional |
| P07-05 | P1 | Notificacoes e integracoes | P02-02 | alertas e canais sao visiveis e acionaveis |
| P07-06 | P1 | API keys, API client e webhooks | P07-05 | integracao administravel no SPA |
| P07-07 | P2 | MFA para perfis criticos | P07-01 | TOTP para Admin/Financeiro |

---

### EPIC P08 - Comercial e Financeiro

| ID | Prioridade | Entrega | Dependencias | Aceite |
|----|------------|---------|--------------|--------|
| P08-01 | P0 | Billing com painel de leitura | P05-03 | faturamento e recebiveis compreensiveis |
| P08-02 | P0 | Caixa com abertura, movimentacao e fechamento | P08-01 | visao operacional de caixa persistente |
| P08-03 | P0 | Produtos e servicos como catalogos premium | P02-01 | cadastro com resumo, filtros e detalhe |
| P08-04 | P0 | Vendas de balcao / comanda | P08-03 | vender, pagar, fechar e auditar |
| P08-05 | P1 | Orcamentos com conversao | P08-04 | simular, aprovar e transformar em venda |
| P08-06 | P1 | Inventario com reflexo de consumo | P08-04 | baixa e rastreio consistentes |
| P08-07 | P1 | Relatorios comerciais | P08-02 | leitura executiva do financeiro e comercial |
| P08-08 | P2 | PIX integration | P08-01 | pagamentos instantaneos |
| P08-09 | P2 | Auto reconciliation com ML | P08-01 | conciliacao automatica de pagamentos |

---

### EPIC P09 - Multi-Tenancy e Plataforma

| ID | Prioridade | Entrega | Dependencias | Aceite |
|----|------------|---------|--------------|--------|
| P09-01 | P0 | Modelo de tenancy multi-level | nenhum | tenants, companies, branches, sectors |
| P09-02 | P0 | Middleware de contexto de tenant | P09-01 | isolamento de dados por tenant |
| P09-03 | P0 | Queries isoladas por tenant | P09-02 | todas as queries respeitam tenant_id |
| P09-04 | P1 | Feature flags por tenant | P09-01 | capacidades ativadas por organizacao |
| P09-05 | P1 | Rate limiting por tenant | P09-01 | controle de uso por organizacao |
| P09-06 | P2 | White-label engine | P09-01 | customizacao de marca por tenant |

---

### EPIC P10 - Observabilidade e Qualidade

| ID | Prioridade | Entrega | Dependencias | Aceite |
|----|------------|---------|--------------|--------|
| P10-01 | P0 | Endpoint /metrics (Prometheus) | nenhum | metricas de infraestrutura e negocio |
| P10-02 | P0 | Dashboards Grafana | P10-01 | infraestrutura, app, business, DB, cache, queue |
| P10-03 | P0 | Tracing distribuido | P10-01 | openTelemetry instrumentado |
| P10-04 | P1 | Logs estruturados JSON | nenhum | formatacao, retencao, PII masking |
| P10-05 | P1 | SLOs e error budgets | P10-02 | disponibilidade e performance medida |
| P10-06 | P1 | E2E dos fluxos criticos | P02-05 | cobrir os fluxos mais importantes do produto |
| P10-07 | P2 | Visual regression testing | P01-01 | evitar quebra do shell e dos hubs |
| P10-08 | P2 | Chaos engineering | P10-02 | resiliencia testada em producao |

---

### EPIC P11 - LGPD e Compliance

| ID | Prioridade | Entrega | Dependencias | Aceite |
|----|------------|---------|--------------|--------|
| P11-01 | P0 | Consent management UI | P09-01 | coleta e gestao de consentimentos |
| P11-02 | P0 | Data subject requests portal | P11-01 | requisicoes de titular de dados |
| P11-03 | P0 | Right to be forgotten automation | P11-02 | anonimizacao e exclusao solicitadas |
| P11-04 | P1 | Data portability (export) | P11-02 | exportacao de dados em formato padrao |
| P11-05 | P1 | Audit trail completo | P07-03 | rastrear todo acesso a dados sensiveis |
| P11-06 | P2 | Privacy by design checks | P09-01 | validacao de compliance em cada feature |

---

### EPIC P12 - Corte do Legado

| ID | Prioridade | Entrega | Dependencias | Aceite |
|----|------------|---------|--------------|--------|
| P12-01 | P0 | Bloquear novas entregas em `apps/web` | nenhum | nenhum desenvolvimento novo entra no legado |
| P12-02 | P0 |_ALIGNAR docs, compose e deploy ao SPA | P02-02 | documentacao e runtime contam a mesma historia |
| P12-03 | P0 | Matriz de corte por dominio | P05-03 | criterio de migracao por modulo |
| P12-04 | P1 | Checklist de desligamento do web | P12-03 | criterio objetivo de apagamento do legado |
| P12-05 | P1 | Rollback plan documentado | P12-04 | como voltar se necessario |
| P12-06 | P2 | Limpeza residual de docs historicas | P12-05 | nada vivo deve induzir deploy do web |

---

## 4. Ordem Sugerida de Entrega

### Sprint/Onda 1 - Fundacao Premium (Semanas 1-4)

- P01-01 (Storybook deployado)
- P01-02 (Dark mode)
- P01-03 (Command palette)
- P01-04 (Keyboard navigation)
- P02-01 (Menu por dominio)
- P02-02 (Topbar contextual)
- P02-03 (Favoritos e recentes)

### Sprint/Onda 2 - Core Operacional (Semanas 5-8)

- P03-01 (Dashboard com KPIs)
- P03-02 (Atalhos de dominios)
- P04-01 (Tutores hub)
- P04-02 (Pacientes hub)
- P05-01 (Agenda premium)
- P05-02 (Fila operacional)
- P05-03 (Atendimentos)

### Sprint/Onda 3 - Assistencial Avancado (Semanas 9-12)

- P06-01 (Prontuario linha do tempo)
- P06-02 (Triagem)
- P06-03 (Internacao)
- P06-04 (Diagnosticos)
- P06-05 (Cirurgia)
- P06-06 (Prescricoes)
- P06-07 (Altas)

### Sprint/Onda 4 - Governance (Semanas 13-16)

- P07-01 (Access-control)
- P07-02 (Users com membership)
- P07-03 (Auditoria)
- P07-04 (Staff)
- P07-05 (Notificacoes)
- P07-06 (API keys/webhooks)
- P07-07 (MFA)

### Sprint/Onda 5 - Comercial (Semanas 17-20)

- P08-01 (Billing)
- P08-02 (Caixa)
- P08-03 (Produtos/Servicos)
- P08-04 (Vendas balcao)
- P08-05 (Orcamentos)
- P08-06 (Inventario)
- P08-07 (Relatorios comerciais)

### Sprint/Onda 6 - Plataforma e Corte (Semanas 21-24)

- P09-01 (Multi-tenancy)
- P09-02 (Middleware tenant)
- P09-03 (Queries isoladas)
- P10-01 (/metrics Prometheus)
- P10-02 (Dashboards Grafana)
- P10-03 (Tracing)
- P11-01 (Consent management)
- P11-02 (Data subject requests)
- P12-01 (Corte web)

---

## 5. Criticos de Aceite do Backlog

| Critico | Condicao |
|---------|----------|
| Shell premium | Menu, contexto, favoritos e recentes disponiveis em toda a SPA |
| Design system | 50+ componentes documentados, dark mode, WCAG 2.1 AA |
| Hub do core | Dashboard, cadastro e agenda resolvem o uso diario |
| Governance real | Access-control e users explicam permissao efetiva |
| Fluxo assistencial | Triagem, internacao, prontuario e prescricoes fecham ciclo |
| Fluxo comercial | Billing, caixa, produtos, servicos e vendas funcionam juntos |
| Corte do legado | `apps/web` nao participa da trilha principal e nao recebe build novo |

---

## 6. KPIs do Backlog

| KPI | Meta |
|-----|------|
| Tempo abertura atendimento | -30% |
| Taxa ocupacao agenda | 80% |
| No-show rate | <15% |
| SLA laudo | <4h |
| Tempo fechamento comanda | <3min |
| Taxa ruptura estoque | <3% |
| Disponibilidade | >99.9% |
| P95 latencia API | <300ms |
| LCP (web vitals) | <1.5s |

---

## 7. Observacao Final

Este backlog nao substitui os docs de produto ou arquitetura.

Ele existe para orientar o trabalho real de construcao do `cvg-his-v2` na mesma linha premium do `vetus-like`, mas com uma vantagem clara:

- menos ambiguidade
- mais execucao
- mais governance
- mais capacidade de corte gradual por dominio
