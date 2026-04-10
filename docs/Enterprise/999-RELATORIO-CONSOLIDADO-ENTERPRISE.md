# RELATORIO CONSOLIDADO DO PLANO ENTERPRISE - CVG-HIS-V2

## 1. Objetivo do relatorio

Este documento consolida a leitura de todos os arquivos do plano enterprise localizados em `docs/Enterprise`, com foco em sintetizar a visao executiva, a estrutura de execucao, os investimentos previstos, os riscos principais e os pontos que merecem alinhamento antes da implementacao.

## 2. Resumo executivo

O plano enterprise do CVG-HIS-V2 propoe uma transformacao estrutural do produto em 18 meses para elevar o score global de maturidade de `42/100` para `90+/100`. A proposta parte de uma base considerada solida, com arquitetura modular TypeScript, 26 modulos e 49 tabelas, mas identifica lacunas importantes em frontend, observabilidade, seguranca, compliance, integracoes, AI/ML, testes e documentacao.

O plano esta organizado em 5 ondas sequenciais e dependentes:

1. Fundacao critica
2. Frontend premium
3. Integracoes e API
4. AI/ML e analytics
5. Excelencia operacional e certificacao

O racional do plano esta bem estruturado: primeiro estabilizar fundamentos de dados, seguranca e operacao; depois modernizar a experiencia de uso; em seguida abrir integracoes externas; depois adicionar inteligencia operacional; e por fim elevar a plataforma a um patamar enterprise com performance, documentacao e preparacao para SOC2.

## 3. Documentos analisados

Foram lidos os seguintes arquivos:

- `000-MASTER-ENTERPRISE-PLAN.md`
- `001-BLUEPRINT-ENTERPRISE.md`
- `100-ROADMAP-VISAO-GERAL.md`
- `101-ONDA-1-FUNDACAO-CRITICA.md`
- `102-ONDA-2-FRONTEND-PREMIUM.md`
- `103-ONDA-3-INTEGRACOES-API.md`
- `104-ONDA-4-AI-ML.md`
- `105-ONDA-5-EXCELENCIA.md`
- `200-BACKLOG-MASTER.md`
- `201-BACKLOG-ONDA-1.md`
- `202-BACKLOG-ONDA-2.md`
- `203-BACKLOG-ONDA-3.md`
- `204-BACKLOG-ONDA-4.md`
- `205-BACKLOG-ONDA-5.md`
- `300-SCORECARD-PROGRESSO.md`
- `301-RISK-REGISTER.md`
- `302-RESOURCE-PLAN.md`

## 4. Arquitetura alvo proposta

O blueprint define uma migracao relevante de stack e de maturidade operacional:

- Frontend atual server-side HTML para Vue 3 SPA com TypeScript, Pinia, Vite, WebSocket e PWA
- API REST atual para um modelo com API Gateway, versionamento e suporte a comunicacao em tempo real
- Autenticacao JWT/RBAC evoluindo para JWT + RBAC + ABAC + MFA + SSO
- Backend modular evoluindo para padroes mais enterprise, incluindo CQRS e arquitetura orientada a eventos
- Banco PostgreSQL complementado por Redis, Elasticsearch e ClickHouse
- Observabilidade expandida para Prometheus, Grafana, OpenTelemetry e alertas com SLOs
- Deploy evoluindo de Docker Compose para Kubernetes, Terraform e ArgoCD
- Seguranca avancando para um modelo Zero Trust com WAF, Vault, DLP e trilha para SOC2

Tambem foi definido um modelo alvo de 14 bounded contexts, cobrindo identidade, tenancy, agenda, atendimento, prontuario, internacao, diagnosticos, estoque, financeiro, fiscal, CRM, comissoes e analytics.

## 5. Estrutura das 5 ondas

### Onda 1 - Fundacao critica

Periodo: meses 1 a 4
Meta de score: `42 -> 58`

Principais entregas:

- Multi-tenancy com `tenant_id` em todas as tabelas transacionais
- RLS no PostgreSQL
- MFA com TOTP e WebAuthn
- Step-up authentication para acoes sensiveis
- Pipeline LGPD com consentimento, exportacao, anonimizzazione e retencao
- Observabilidade premium com metricas, traces, logs estruturados e alertas
- API Gateway com rate limiting, versionamento e circuit breaker
- Quality gates com cobertura acima de 60% e testes de seguranca

Esta e a onda mais critica porque habilita tecnicamente todas as demais.

### Onda 2 - Frontend premium

Periodo: meses 5 a 9
Meta de score: `58 -> 72`

Principais entregas:

- Design system proprio com tokens, temas e Storybook
- Biblioteca inicial de componentes base e componentes avancados
- Migracao para Vue 3 SPA com shell principal e migracao de modulos-chave
- Dark mode, atalhos de teclado, skeletons, empty states e microinteracoes
- Responsividade, WebSocket e updates em tempo real
- PWA com cache, offline basico, sync e push notification

Esta onda representa a maior mudanca de experiencia do usuario e uma das maiores frentes de trabalho do programa.

### Onda 3 - Integracoes e API

Periodo: meses 10 a 13
Meta de score: `72 -> 82`

Principais entregas:

- Event Bus com outbox pattern, retry e DLQ
- Integracao de pagamentos via PIX e cartao
- Reconciliacao automatica e dashboard financeiro
- Integracao com WhatsApp Business, email e SMS
- Motor fiscal, emissao NFS-e e relatorios fiscais
- Webhooks, OpenAPI 3.1 e API key management para parceiros

Esta onda expande o produto para o ecossistema externo e aumenta a escalabilidade da arquitetura.

### Onda 4 - AI/ML

Periodo: meses 14 a 16
Meta de score: `82 -> 87`

Principais entregas:

- Infraestrutura de ML com feature store, model registry, pipeline de treino e serving
- Smart scheduling com A/B testing
- Demand forecasting para insumos
- OCR de notas fiscais
- Deteccao de anomalias em exames

Esta onda introduz casos de uso de IA com foco em ganhos operacionais mensuraveis.

### Onda 5 - Excelencia e certificacao

Periodo: meses 17 a 18
Meta de score: `87 -> 90+`

Principais entregas:

- Chaos engineering em staging
- Otimizacao de performance e carga
- Documentacao premium completa
- Preparacao para SOC2
- Quality gates finais, incluindo coverage > 80%, zero vulnerabilidades criticas e validacao WCAG 2.1 AA

Esta onda fecha os gaps finais para operacao enterprise de alta confiabilidade.

## 6. Metas de maturidade e evolucao de score

As maiores lacunas iniciais do plano sao:

- Design System/UX: `5 -> 90`
- AI/ML: `0 -> 80`
- LGPD/Compliance: `15 -> 90`
- Observabilidade: `30 -> 90`
- Integracoes: `25 -> 85`
- Frontend/Web: `40 -> 90`
- Testes/QA: `35 -> 90`

O scorecard mostra uma progressao coerente por onda e indica que:

- Onda 1 corrige a fundacao tecnica e regulatoria
- Onda 2 ataca o maior gap perceptivel ao usuario final
- Onda 3 amplia conectividade e monetizacao
- Onda 4 introduz diferenciacao competitiva
- Onda 5 consolida governanca, confiabilidade e certificacao

## 7. Backlog e esforco total

O backlog master consolida:

- 30 epicos
- Aproximadamente 450 story points
- Horizonte de 18 meses

Epicos de maior porte:

- `E2-03` Vue 3 SPA migration: 55 pts
- `E1-01` Multi-tenancy no banco: 34 pts
- `E2-02` Componentes avancados: 34 pts
- `E1-02` MFA e autenticacao avancada: 21 pts
- `E1-03` LGPD pipeline completo: 21 pts
- `E3-01`, `E3-02`, `E3-03`: 21 pts cada

Isso reforca que os maiores blocos de risco e capacidade estao concentrados na fundacao e na migracao de frontend.

## 8. Recursos, squads e investimento

O plano de recursos distribui o trabalho assim:

- Onda 1: 12 pessoas
- Onda 2: 10 pessoas
- Onda 3: 9 pessoas
- Onda 4: 6 pessoas
- Onda 5: 6 pessoas

Perfis recorrentes:

- Platform
- Security
- Data
- QA
- Design
- Frontend
- Backend
- Integration
- AI/ML

O investimento informado, porem, apresenta divergencia entre documentos:

- `000-MASTER-ENTERPRISE-PLAN.md`: total de `R$ 8.2M`
- `302-RESOURCE-PLAN.md`: total de `R$ 8.9M`

A diferenca parece ocorrer porque o master plan contabiliza apenas custo de squads por onda, enquanto o resource plan adiciona:

- Infraestrutura por 18 meses
- Ferramentas/licencas por 18 meses

Portanto, a leitura mais completa do investimento total do programa e `R$ 8.9M`, enquanto `R$ 8.2M` representa apenas a alocacao direta de pessoas/squads.

## 9. ROI esperado

O resource plan estima:

- Produtividade operacional: `R$ 2.0M/ano`
- Reducao de churn: `R$ 1.5M/ano`
- Novos clientes premium: `R$ 3.0M/ano`
- Aumento de ticket medio: `R$ 1.0M/ano`

ROI anual estimado:

- `R$ 7.5M/ano`

Payback estimado:

- `~14 meses`

O business case fica mais convincente se esse ROI for acompanhado por premissas detalhadas e por um modelo de captura de valor por onda.

## 10. Principais dependencias do programa

As dependencias mapeadas no roadmap sao corretas e importantes:

- Multi-tenancy da Onda 1 habilita customizacao e isolamento por tenant nas ondas seguintes
- API Gateway da Onda 1 habilita integracoes da Onda 3
- Observabilidade da Onda 1 sustenta todas as ondas
- WebSocket da Onda 2 apoia experiencias real-time e futuros casos de AI
- Event Bus da Onda 3 habilita consumo de eventos por modelos e automacoes da Onda 4

Essas dependencias mostram que atrasos na Onda 1 tendem a comprometer todo o cronograma subsequente.

## 11. Principais riscos identificados

O risk register lista 10 riscos, com destaque para:

- Quebra de funcionalidade existente ao implantar multi-tenancy
- Atraso na migracao Vue 3
- Risco legal por pipeline LGPD incompleto
- Instabilidade em integracoes de pagamento
- Modelos de IA com baixa precisao
- Degradacao de performance com multi-tenancy
- Capacidade insuficiente para todas as ondas
- Baixa adesao do time ao design system

Os riscos mais estruturais do plano sao:

- O volume de transformacao em paralelo na Onda 1
- O esforco de migracao do frontend em apenas 5 meses
- A dependencia de integracoes reguladas e terceiros na Onda 3
- A necessidade de dados historicos confiaveis para os casos de AI/ML

## 12. Pontos fortes do plano

- Boa organizacao documental, com visao, blueprint, roadmap, backlog, scorecard, riscos e recursos
- Sequenciamento logico das ondas
- Criterios de aceite definidos em varias frentes
- Clara orientacao para maturidade enterprise
- Boa cobertura de temas criticos: tenancy, seguranca, LGPD, observabilidade, UX, integracoes, IA e certificacao
- Backlogs por onda facilitam priorizacao e planejamento incremental

## 13. Pontos de atencao e inconsistencias

### 13.1 Divergencia de custo total

Ha inconsistencia entre `R$ 8.2M` e `R$ 8.9M`. O plano deve explicitar oficialmente:

- custo direto de pessoas
- custo total do programa
- premissas usadas no calculo

### 13.2 Escopo muito agressivo na Onda 1

A Onda 1 concentra multi-tenancy, MFA, LGPD, observabilidade, gateway e quality gates. Isso e viavel apenas com forte disciplina de priorizacao e entregas incrementais.

### 13.3 Migracao de frontend de alta complexidade

A Onda 2 inclui design system, biblioteca de componentes, migracao SPA de varios modulos, UX premium, PWA e offline. O volume e alto para 5 meses, principalmente se houver necessidade de conviver com legado.

### 13.4 AI/ML depende de maturidade de dados

A Onda 4 assume disponibilidade de historico confiavel, qualidade de dados, eventos bem estruturados e telemetria madura. Isso pode reduzir a velocidade real de entrega se nao for preparado antes.

### 13.5 Falta de status real de execucao

O scorecard e orientado a acompanhamento, mas no momento parece ser um template de progresso. Nao ha indicadores preenchidos de andamento atual, percentual concluido ou baseline tecnicamente verificada no repositorio.

### 13.6 Necessidade de definicao mais forte de MVP por onda

Mesmo com backlog priorizado, varias ondas ainda estao amplas. Seria recomendavel definir:

- MVP obrigatorio por onda
- itens que podem ser adiados
- criterios de corte em caso de atraso

## 14. Recomendacoes praticas

### 14.1 Recomendacoes imediatas

- Validar oficialmente o baseline atual de score com evidencia tecnica
- Fechar o escopo minimo da Onda 1 em ordem de criticidade
- Confirmar a estrategia de migracao frontend: big bang, strangler ou convivencia gradual
- Detalhar as premissas financeiras do programa
- Transformar o scorecard em artefato operacional com status real

### 14.2 Recomendacoes de governanca

- Criar comite mensal de acompanhamento das ondas
- Revisar riscos e dependencias ao fim de cada mes
- Medir valor entregue por onda, nao apenas itens concluidos
- Definir gates formais para entrada e saida de cada onda

### 14.3 Recomendacoes tecnicas

- Iniciar multi-tenancy com rollout progressivo e feature flags
- Preparar benchmark de performance antes da migracao de tenancy
- Adotar convenciao de design system como gate de PR desde cedo
- Estruturar event catalog e telemetria antes de acelerar AI/ML
- Garantir trilha de testes automatizados ja na Onda 1 para reduzir regressao acumulada

## 15. Conclusao

O plano enterprise do CVG-HIS-V2 e ambicioso, bem organizado e estrategicamente coerente. Ele cobre os principais pilares exigidos para elevar o produto a um patamar enterprise premium, combinando modernizacao tecnica, experiencia do usuario, integracoes externas, analytics e governanca operacional.

Os maiores desafios estao na execucao: especialmente a concentracao de escopo na Onda 1, a complexidade da migracao de frontend na Onda 2 e a necessidade de maturidade de dados para sustentar a Onda 4. Com governanca forte, priorizacao realista, definicao de MVP por onda e alinhamento financeiro, o plano tem boa consistencia como guia de transformacao.

## 16. Sintese final

- Objetivo do programa: elevar o score global de `42/100` para `90+/100`
- Horizonte: `18 meses`
- Estrutura: `5 ondas`
- Backlog consolidado: `30 epicos` e `~450 story points`
- Investimento direto estimado: `R$ 8.2M`
- Investimento total estimado com infra e ferramentas: `R$ 8.9M`
- ROI anual estimado: `R$ 7.5M`
- Payback estimado: `~14 meses`
- Maior prioridade: executar a Onda 1 com rigor de escopo, mitigacao de risco e medicao real de progresso

## 17. Status de execucao atualizado (03/04/2026) — OBSOLETO

> **AVISO (10/04/2026):** Esta secao contem informacoes desatualizadas. Claims de "concluida" para Onda 1 e Onda 2 sao questionaveis dado que build/typecheck/test estao falhando atualmente. Ver `0103-GAP-ANALYSIS-DOCUMENTACAO-VS-REALIDADE-10042026.md`.

### Onda 1 — Progresso real

| Fase                             | Status       | Entregas                                                                             |
| -------------------------------- | ------------ | ------------------------------------------------------------------------------------ |
| Fase 1: Multi-tenancy foundation | ✅ Concluida | Tabela tenants, tenant_id em accounts, modulo tenant-context, migration 0001         |
| Fase 2: Tabelas criticas         | ✅ Concluida | account_id em clinical_notes, clinical_note_versions, encounter_documents            |
| Fase 3: RLS core tables          | ✅ Concluida | 47 tabelas com RLS, policies, funcoes app.\*, helpers, 37 testes                     |
| Fase 3b: Tabelas text-based      | ✅ Concluida | Migrar triage_records, triage_record_versions, scheduling_queue_entries para uuid    |
| Fase 3c: RLS text-based          | ✅ Concluida | Habilitar RLS nas 3 tabelas migradas                                                 |
| Fase 4: MFA TOTP                 | ✅ Concluida | Modulo MFA, endpoints, integracao com AuthService, persistencia real (Fase 4c)       |
| Fase 5: LGPD                     | ✅ Concluida | Consent pipeline MVP, DSR, export base, RLS, 30+10 testes                            |
| Fase 6: Observabilidade          | ✅ Concluida | Metrics Prometheus, health endpoints, logging estruturado, correlation ID, 15 testes |

### Onda 2 — Progresso real

### Atualização executiva (05/04/2026)

- Estágio atual: `consolidação avançada da Onda 2` com `readiness inicial para Onda 3`
- Score executivo revisado do programa: `81/100`
- Forças reais do estado atual:
  - frontend SPA estabilizado com `typecheck` verde
  - `design-system Vue` consolidado como API pública
  - suíte da SPA com `478/478` testes passando
  - módulos operacionais-chave já ativos na SPA, incluindo `Scheduling / Queue`, `Billing`, `Inpatient`, `Triage`, `Users` e `Inventory`
- Gaps que ainda impedem nota `90+`:
  - governança documental ainda defasada em relação ao estado real do código
  - hardening final de fluxos operacionais como `Inventory`
  - integrações e contratos da `Onda 3` ainda não consolidados como trilha principal
  - maturidade enterprise ainda incompleta em documentação executiva, métricas de produto e operação cross-module

| Fase                                                | Status       | Entregas                                                                                                               |
| --------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Fase 1: Design System Foundation                    | ✅ Concluida | Tokens, temas, 8 componentes base, CSS, acessibilidade, 37 testes                                                      |
| Etapa 2.2: Componentes Avancados                    | ✅ Concluida | DataTable, Modal, Toast, Tabs, EmptyState, SearchBar, Pagination, CommandPalette, 54 testes                            |
| Etapa 2.3: Vue 3 SPA Setup                          | ✅ Concluida | Vite + Pinia + Router, 6 paginas, layout, auth guard, dark mode, API client                                            |
| Etapa 2.4: Migração Owners                          | ✅ Concluida | List + Detail + Form integrados com API real, padrao reutilizavel para proximos modulos                                |
| Etapa 2.5: Migração Patients                        | ✅ Concluida | List + Detail + Form integrados com API real, select de tutor, padrao consolidado                                      |
| Etapa 2.6: Migração Appointments                    | ✅ Concluida | Kanban list + Detail + Create form integrados com API real, visao operacional                                          |
| Etapa 2.7: Migração Encounters                      | ✅ Concluida | List + Detail com timeline/transition/close + Create form integrados com API real                                      |
| Fase 2.6b: Hardening Transversal                    | ✅ Concluida | Breadcrumbs dinâmicos, cache de entidades, skeleton loading, SearchSelect, componentes reutilizáveis                   |
| Fase 2.6c: Consolidação e Testes                    | ✅ Concluida | CSS global, labels centralizados, 42 testes unitários, redução massiva de duplicação                                   |
| Etapa 2.8: Migração Billing                         | ✅ Concluida | List + Detail com itens, add item, update status, estimate integrados com API real, 6 endpoints criados                |
| Fase 2.9b: Consolidação + DataTable                 | ✅ Concluida | useFormValidation em 4 forms, DataTable reutilizavel, SearchSelect 17 testes, 85 testes SPA                            |
| Etapa 2.9: Migração Medical Records                 | ✅ Concluida | List + Detail com entradas clinicas, timeline, arquivar integrados com API real                                        |
| Fase 2.10: Migração Inpatient                       | ✅ Concluida | List + Detail com status update, bed map, setores/leitos integrados com API real, endpoint update-status criado        |
| Fase 2.10b: Consolidação List Pages                 | ✅ Concluida | DataTable em Billing/MedicalRecords/Encounters, useListData em Inpatient, padronização completa                        |
| Fase 2.11: Bed Board + Progress Notes               | ✅ Concluida | BedBoardPage visual, progress notes no detail, endpoints GET/POST progress adicionados                                 |
| Fase 2.11b: Endpoint Medical Records                | ✅ Concluida | findAll no backend, listAll no service, MedicalRecordsListPage sem N+1, useListData + DataTable                        |
| Fase 2.12: Testes Inpatient + Cache Users           | ✅ Concluida | 8 testes InpatientDetailPage, 5 testes user cache, autores resolvidos por nome                                         |
| Fase 2.12b: Testes Interação + BedBoard             | ✅ Concluida | 17 testes InpatientDetailPage (9 interacao), 12 testes BedBoardPage, 122 testes total                                  |
| Fase 2.13: Preload Users + Otimização               | ✅ Concluida | preloadUserNames via list() único, InpatientDetailPage otimizado, 3 testes preload                                     |
| Fase 2.13b: Testes Erro API + InpatientListPage     | ✅ Concluida | 5 testes erro API no DetailPage, 9 testes InpatientListPage, 136 testes total                                          |
| Fase 2.14: Testes Owners + Patients List Pages      | ✅ Concluida | 11 testes OwnersListPage, 13 testes PatientsListPage, 160 testes total                                                 |
| Fase 2.15: Testes AppointmentsListPage (Kanban)     | ✅ Concluida | 18 testes AppointmentsListPage (Kanban columns, cards, filters, grouping, navigation), 198 testes total                |
| Fase 2.16: Testes Encounters + Billing List Pages   | ✅ Concluida | 10 testes EncountersListPage, 11 testes BillingListPage, 180 testes total                                              |
| Fase 2.16b: Error Alert + Billing useListData       | ✅ Concluida | Error alert adicionado ao EncountersListPage, BillingListPage refatorado para useListData                              |
| Fase 2.17: Testes Appointment Detail + Form         | ✅ Concluida | 13 testes AppointmentDetailPage, 12 testes AppointmentFormPage, 205 testes total                                       |
| Fase 2.18: Testes OwnerForm + PatientForm           | ✅ Concluida | 16 testes OwnerFormPage, 18 testes PatientFormPage, 257 testes total                                                   |
| Fase 2.19: Testes Encounter Detail + Form           | ✅ Concluida | 19 testes EncounterDetailPage, 15 testes EncounterFormPage, 291 testes total                                           |
| Fase 2.20: Testes MedicalRecords + Billing Detail   | ✅ Concluida | 22 testes MedicalRecordsDetailPage, 27 testes BillingDetailPage, 340 testes total                                      |
| Fase 2.22: Testes E2E Fluxo Critico SPA             | ✅ Concluida | 1 teste E2E ponta a ponta (login → owner → patient → encounter → medical record → billing → close encounter)           |
| Fase 2.22b: Login Real + Owner/Patient via UI       | ✅ Concluida | 4 testes E2E (login real, erro login, validacao owner, validacao patient) + fixtures reutilizaveis                     |
| Fase 2.23: Fixtures + Fluxo Internação E2E          | ✅ Concluida | 2 testes E2E Inpatient (fluxo completo + validacao lista) + fixtures reutilizaveis (SpaPage, ApiCall, etc)             |
| Fase 2.23b: Cleanup + Endurecimento E2E             | ✅ Concluida | Cleanup automatico, waits deterministicos, seletores semanticos, 0 waitForTimeout no SearchSelect                      |
| Fase 2.24: Fluxo E2E de Agendamento                 | ✅ Concluida | 2 testes E2E Appointment (criar → validar Kanban → cancelar + validacao elementos Kanban), 9 testes E2E total          |
| Fase 2.25: Fluxo E2E Completo de Billing            | ✅ Concluida | 2 testes E2E Billing (estimativa → itens → status → quitado + validacao elementos), 11 testes E2E total                |
| Fase 2.26: Integracao E2E no CI com Docker          | ✅ Concluida | docker-compose.e2e.yml, run-e2e-spa.sh, job CI test-e2e-spa, upload de report HTML                                     |
| Fase 2.26b: Dockerfile SPA + Health Check CI        | ✅ Concluida | apps/spa/Dockerfile (nginx), nginx.conf, spa-e2e service no compose, health check explicito no CI                      |
| Fase 2.27: Visual Regression da SPA                 | ✅ Concluida | 7 snapshots visuais (login, owners, patients, appointments, encounters, inpatient, billing), viewport fixo             |
| Fase 2.27b: Baseline + Estabilização Visual         | ✅ Concluida | Helper stabilize-visual, CSS injection, thresholds calibrados, waits deterministicos, documentacao completa            |
| Fase 2.28: Visual no CI + Detail Pages              | ✅ Concluida | Job CI dedicado, 3 artifacts de falha, 5 snapshots detail (owner, patient, encounter, billing, appointment)            |
| Fase 2.29: Design System Vue SFC                    | ✅ Concluida | 8 componentes Vue (Button, Card, Badge, Alert, Modal, Tabs, Spinner, Input), integracao LoginPage/Dashboard, 42 testes |
| Fase 2.29b: Adoção Ampla Ds\* + Testes Vue          | ✅ Concluida | DsInput/DsModal/DsAlert/DsCard adotados em 7+ paginas reais, bug fix DsModal, 390 testes passando                      |
| Fase 2.30: Migração Triagem para SPA                | ✅ Concluida | Módulo triagem migrado (list/form/detail), 4 endpoints API, 3 páginas, 4 testes, sidebar atualizado                    |
| Fase 2.31: Migração Módulo Usuários para SPA        | ✅ Concluida | Módulo usuários migrado (list/detail/form), userService expandido, 12 testes, sidebar atualizado                       |
| Fase 2.32: Consolidação DS Vue — Detail + Hardening | ✅ Concluida | DsCard/DsAlert em OwnerDetail+PatientDetail, DsInput (datetime-local, step/min/max), DsButton (prop to)                |
| Fase 2.32: Consolidação DS Vue — Detail + Hardening | ✅ Concluida | DsCard/DsAlert em OwnerDetail+PatientDetail, DsInput (datetime-local, step/min/max), DsButton (prop to)                |

### Metricas verificaveis

- Typecheck: 0 errors em todos os pacotes
- Testes unitarios: 236/236 passando (10 tenant + 65 RLS + 30 LGPD + 25 MFA + 15 observabilidade + 91 design-system)
- Tabelas com RLS: 55/64 (86%) — 3 tabelas text-based agora incluidas
- Tabelas pendentes de RLS: 14 (globais/join — nao requerem RLS direto)
- Endpoint /metrics: Prometheus format (text/plain) com 20+ metricas
- Logging: 5 niveis (DEBUG, INFO, WARN, ERROR, FATAL) com sanitizacao de dados sensiveis
- Design System: 7 paletas de cores, spacing 4px grid, temas light/dark, 16 componentes (8 base + 8 avancados) + 8 componentes Vue SFC (DsButton, DsInput, DsCard, DsBadge, DsAlert, DsModal, DsTabs, DsSpinner) + 4 componentes SPA reutilizaveis (SkeletonLoader, StatusBadge, EmptyState, SearchSelect)
- Testes unitarios: 585/585 passando (10 tenant + 65 RLS + 30 LGPD + 25 MFA + 15 observabilidade + 91 design-system + 349 SPA)
- SPA: 7 componentes reutilizaveis (SkeletonLoader, StatusBadge, EmptyState, SearchSelect, DataTable), 3 composables de form (useFormValidation, useEntityForm, useListData), 1 composable de cache estendido (owners, patients, users com preload), 1 arquivo de labels, CSS global, 20+ paginas consolidadas, 390 testes unitarios, modulos Billing + Inpatient + Triage + Users migrados, Bed Board visual + Progress Notes operacionais, Medical Records sem N+1, testes de interação robustos, cobertura de erros de API, Design System Vue adotado em 14+ paginas (DsInput, DsModal, DsAlert, DsCard, DsButton, DsBadge)
- API: 6 novos endpoints de billing (list, getByEncounter, estimate, addItem, listItems, updateStatus)
