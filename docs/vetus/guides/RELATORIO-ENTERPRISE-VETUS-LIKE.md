# RELATÓRIO ENTERPRISE — PROGRAMA VETUS-LIKE
## Análise Crítica Completa do ERP Veterinário Enterprise

> **Classificação:** CONFIDENCIAL — Uso Interno
> **Data:** 02 de Abril de 2026
> **Escopo:** Análise de 27 documentos do pacote `docs2` + inventário de inspeção do sistema Vetus + revisão crítica dos documentos exploratórios em `docs`
> **Status:** Revisado criticamente e consolidado como parecer executivo de referência

---

## SUMÁRIO EXECUTIVO

### 1. Situação Atual

O programa **vetus-like** representa a iniciativa de construir um **ERP veterinário enterprise** a partir do inventário funcional e técnico do sistema **Vetus** atual (https://erp-beta.vetus.com.br). O pacote documental consolidado em `docs2` — composto por **27 artefatos** — converte o conhecimento do produto legado em uma trilha estruturada de arquitetura, produto, dados, integração, MVP, piloto e governança.

Para fins de governança documental, este relatório adota a seguinte regra:

- `docs2` e o pacote **autoritativo** do programa
- `docs/01-04` devem ser lidos como material **exploratório e de referência histórica**
- quando houver conflito entre `docs` e `docs2`, prevalece `docs2`

**Principais números do inventário:**

| Métrica | Valor |
|---------|-------|
| Entradas de menu mapeadas | 108 links navegáveis |
| Páginas inspecionadas | 107 |
| Chamadas de API capturadas | 316 chamadas brutas |
| URLs únicas de API capturadas | 188 |
| Páginas SPA (Vue.js) modernizadas | 27 rotas SPA mapeadas |
| Páginas legadas (HTML) ainda operacionais | ~82 |
| Bounded contexts definidos | 14 |
| Épicos de backlog catalogados | 25+ |
| Eventos de domínio definidos | 50+ |
| Endpoints de API contratados | 100+ |
| Entidades no modelo lógico | 60+ |
| Riscos registrados | 15 |
| Decisões estruturais formalizadas | 7 |

### 2. Avaliação de Readiness

| Dimensão | Nota (0-5) | Status |
|----------|-----------|--------|
| Visão e estratégia | 4 | ✅ Bem definida |
| Escopo funcional | 4 | ✅ Forte e rastreável |
| Arquitetura alvo | 3 | ⚠️ Clara, precisa ADRs formais |
| Contratos de API | 3 | ⚠️ Outline pronto, falta OpenAPI formal |
| Modelo de dados | 3 | ⚠️ Lógico pronto, falta dicionário e físico |
| Segurança e acesso | 4 | ✅ Matriz bem definida |
| Backlog e priorização | 4 | ✅ Épicos e histórias consistentes |
| Planejamento de entrega | 4 | ✅ Roadmap, WBS e sprints definidos |
| Release e piloto | 4 | ✅ Release plan e checklist prontos |
| Governança de risco | 4 | ✅ Risk register e decision log estabelecidos |
| Prontidão técnica real | 2 | ❌ Implementação não iniciada |
| Prontidão operacional | 2 | ❌ Depende de time e piloto |

**Veredicto: GO CONDICIONAL** — O programa está pronto para sair do planejamento e iniciar execução controlada, desde que sejam cumpridas as condições listadas na Seção 18 e que `docs2` seja mantido como fonte mestra do programa.

---

## 3. VISÃO E ESTRATÉGIA

### 3.1 Posicionamento do Produto

Construir um **ERP veterinário enterprise omnichannel, modular e API-first** que suporte a operação ponta a ponta de:
- Clínicas veterinárias
- Hospitais veterinários
- Pet shops
- Laboratórios parceiros
- Operações multiempresa e multifilial

### 3.2 Objetivos Estratégicos

1. **Unificar** operação clínica, comercial, financeira, fiscal e analítica em plataforma única
2. **Eliminar** dependência de telas legadas gradualmente
3. **Permitir** multiempresa, multifilial e multiunidade com segregação segura
4. **Suportar** alto volume transacional com observabilidade e resiliência
5. **Acelerar** integrações com parceiros, gateways e canais digitais
6. **Habilitar** governança corporativa para redes com centenas de usuários

### 3.3 Princípios de Produto

- **Domínio primeiro:** manter aderência profunda ao fluxo veterinário real
- **API-first:** toda capacidade crítica exposta por contratos versionados
- **Security by design:** LGPD, RBAC, auditoria e segregação por tenant desde o início
- **Migração gradual:** coexistência segura com legado, evitando big bang
- **Dados confiáveis:** eventos auditáveis, conciliação e fechamento controlado

### 3.4 Personas Principais

| Persona | Responsabilidades |
|---------|------------------|
| Recepção e Atendimento | Cadastro, agenda, comanda, recebimento |
| Médicos Veterinários | Evolução clínica, prescrição, alta |
| Enfermagem/Internação | Rotina hospitalar, aprazamento, controle |
| Laboratório | Execução de exames, laudos, liberação |
| Farmácia/Estoque | Controle de saldo, requisições, validade |
| Financeiro/Controladoria | Contas, caixa, conciliação, DRE |
| Fiscal/Contábil | Tabelas tributárias, documentos, relatórios |
| Marketing/Relacionamento | Campanhas, comunicação, fidelidade |
| Gestores de Unidade | Dashboards, produtividade, margem |
| Diretoria de Rede | Visão multifilial, comparativos, estratégia |

---

## 4. MAPA FUNCIONAL CONSOLIDADO

### 4.1 Domínios do ERP Enterprise

O sistema cobre **11 domínios operacionais** + **4 domínios de plataforma**:

#### Domínios Operacionais

| # | Domínio | Capacidades Principais | Páginas Vetus |
|---|---------|----------------------|---------------|
| 1 | **Atendimento e Jornada Clínica** | Agenda, comandas, vendas, pacotes, esteira, orçamentos, resgate de pontos, internação | 11 |
| 2 | **Cadastro Mestre** | Clientes, animais, raças, espécies, cores, profissionais, serviços, fornecedores, fabricantes, taxonomias | 21 |
| 3 | **Prontuário e Histórico** | Ficha clínica, anamnese, evolução, prescrições, vacinas, termos, timeline | — |
| 4 | **Internação e Hospital** | Boxes, mapa de ocupação, prescrição por turno, aprazamento, farmácia, alta | 2 |
| 5 | **Laboratório e Diagnóstico** | Exames, laudos, hemogramas, bioquímico, urina, equipamentos, valores de referência | 9 |
| 6 | **Comercial e Omnichannel** | Vendas, comandas, pacotes, orçamentos, tabelas de preço, fidelidade | 7 |
| 7 | **Estoque, Compras e Farmácia** | Produtos, estoques, NF, transações, transferências, auditoria, compras, requisições | 21 |
| 8 | **Financeiro, Tesouraria e Controladoria** | Contas a pagar/receber, caixa, cartões, split, bancos, fluxo de caixa, DRE, dashboards | 23 |
| 9 | **Fiscal e Tributário** | ICMS, IPI, PIS, COFINS, CFOP, NFS-e, IBS/CBS, matriz estado | 8 |
| 10 | **RH, Comissões e Produtividade** | Profissionais, regras de comissão, cálculo, folgas, profissões | 5 |
| 11 | **Marketing, CRM e Relacionamento** | SMS, campanhas, email de vacina, configurações | 4 |

#### Domínios de Plataforma

| Domínio | Componentes |
|---------|------------|
| **Identidade e Acesso** | Login JWT, RBAC, MFA, grupos de acesso, segregação |
| **Tenancy e Organização** | Tenant → Empresa → Filial → Setor |
| **Auditoria e Compliance** | Trilhas imutáveis, LGPD, retenção |
| **Analytics e Relatórios** | Dashboards, DRE, curva ABC, relatórios operacionais |

### 4.2 Rastreabilidade: Legado → Alvo

Cada uma das **108 entradas de menu navegáveis** do sistema Vetus foi mapeada para o domínio enterprise correspondente. A tabela abaixo resume a migração:

| Módulo Legado | # Telas | Domínio Alvo | Prioridade MVP |
|--------------|---------|-------------|----------------|
| Atendimento (Agenda, Comandas, Vendas, etc.) | 11 | Encounter + Scheduling | ✅ Alta |
| Cadastros (Clientes, Animais, Serviços, etc.) | 11 | Master Data | ✅ Alta |
| Laboratório (Exames, Laudos, Hemogramas, etc.) | 9 | Laboratory | ❌ Pós-MVP |
| Estoque (Produtos, NF, Transferências, etc.) | 21 | Inventory + Procurement | ✅ Alta |
| Fiscal (ICMS, IPI, CFOP, etc.) | 8 | Tax | ⚠️ Parcial |
| Financeiro (Contas, Caixa, Split, etc.) | 23 | Billing + Treasury | ✅ Alta |
| Marketing (SMS, Campanhas) | 4 | CRM + Notifications | ❌ Pós-MVP |
| Usuários e Acesso | 2 | IAM | ✅ Alta |
| Comissões e Profissionais | 5 | Workforce | ⚠️ Parcial |
| Relatórios | 13 | Reporting + Analytics | ⚠️ Básico |

---

## 5. ARQUITETURA ENTERPRISE

### 5.1 Arquitetura Alvo (6 Camadas)

```
┌─────────────────────────────────────────────────┐
│  EXPERIENCE LAYER                               │
│  Web App SPA · Portal do Tutor · Apps · APIs    │
├─────────────────────────────────────────────────┤
│  EDGE LAYER                                     │
│  API Gateway · WAF · Rate Limiting · SSO        │
├─────────────────────────────────────────────────┤
│  DOMAIN LAYER                                   │
│  Serviços de negócio organizados por domínio    │
├─────────────────────────────────────────────────┤
│  DATA LAYER                                     │
│  PostgreSQL · Redis · Object Storage · Warehouse│
├─────────────────────────────────────────────────┤
│  INTEGRATION LAYER                              │
│  Mensageria · Webhooks · ETL · Gateways · APIs  │
├─────────────────────────────────────────────────┤
│  PLATFORM LAYER                                 │
│  CI/CD · Observabilidade · IAM · Secrets · DR   │
└─────────────────────────────────────────────────┘
```

### 5.2 Decisão Arquitetural Crítica (D-001)

**Modular Monolith no início.** Microservicos puros foram rejeitados porque:
- O domínio é altamente acoplado
- A migração do legado exige velocidade de descoberta
- Há risco alto de distribuir cedo demais regras ainda instáveis
- O time precisará iterar muito no core

Extração gradual de serviços será feita quando houver justificativa real de volume ou dependência externa.

### 5.3 Bounded Contexts (14 Contextos)

| # | Contexto | Responsabilidade |
|---|----------|-----------------|
| 1 | Identity and Access | Login, sessão, MFA, auditoria de auth |
| 2 | Organization and Tenancy | Tenant, empresa, filial, setor, feature flags |
| 3 | Master Data | Clientes, animais, profissionais, produtos, serviços |
| 4 | Scheduling | Agenda, disponibilidade, marcadores, folgas |
| 5 | Encounter and Command | Atendimento, comanda, itens, descontos |
| 6 | Medical Record | Prontuário, evolução, prescrição, anexos |
| 7 | Inpatient | Internação, boxes, eventos, medicações, alta |
| 8 | Laboratory | Ordem de exame, resultados, laudos, equipamentos |
| 9 | Inventory and Procurement | Estoque, lotes, compras, NF, transferências |
| 10 | Billing, Treasury and Payments | Receber/pagar, caixa, cartões, split, conciliação |
| 11 | Tax | Regras tributárias, tabelas, documentos |
| 12 | CRM and Notifications | SMS, email, campanhas, consentimento |
| 13 | Commissions and Productivity | Regras, cálculo, apuração, produtividade |
| 14 | Reporting and Analytics | Relatórios, dashboards, exports, camada semantica |

### 5.4 Modelo de Tenancy

```
Tenant (corporação)
  └── Company (entidade jurídica)
        └── Branch (filial/unidade)
              └── Sector (setor operacional)
```

**Regra de ouro:** Toda entidade de negócio deve carregar o contexto mínimo de isolamento (tenant_id, company_id, branch_id quando aplicável) sem ambiguidade de ownership.

### 5.5 Stack Recomendada

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Vue 3 + TypeScript + Pinia + PrimeVue + Vite |
| Backend | Node.js + TypeScript + framework modular |
| Banco Transacional | PostgreSQL |
| Cache/Filas | Redis |
| Object Storage | S3-compatível (anexos, laudos, imagens) |
| Mensageria | Event bus (RabbitMQ ou similar) |
| Observabilidade | Logs estruturados + métricas + tracing |

### 5.6 NFRs Obrigatórios

- **Disponibilidade:** Alta para operação crítica; RPO/RTO por domínio
- **Performance:** p95 definido por fluxo crítico; leitura otimizada para agenda e comandas
- **Segurança:** MFA para perfis sensíveis; criptografia em trânsito e repouso; RBAC contextual
- **Observabilidade:** Logs estruturados, métricas por domínio, tracing distribuído, alertas por SLA

---

## 6. MODELO DE DADOS

### 6.1 Entidades Nucleares (60+)

**Organização:** Tenant, Company, Branch, Sector

**Identidade:** User, AccessGroup, PermissionGrant, UserContextGrant, UserSession

**Cadastro Mestre:** Client, ClientGroup, ClientContact, ClientAddress, Animal, Species, Breed, Color, Professional, Profession, Supplier, Manufacturer, Service, Product, ProductGroup, MeasurementUnit

**Atendimento:** Appointment, AppointmentItem, AppointmentMarker, Availability, TimeOff, Encounter, Command, CommandItem, CommandDiscount, CommandPayment, Quote, QuoteItem, ServicePackage, PackageSession

**Clínico:** MedicalRecord, ClinicalEvolution, Prescription, MedicalAttachment, ConsentRecord

**Internação:** Hospitalization, HospitalizationBox, HospitalizationEvent, HospitalizationMedication, PharmacyRequest

**Laboratório:** ExamType, ExamOrder, ExamResult, ReferenceValue, DiagnosticReport, LaboratoryEquipment

**Estoque:** Stock, StockBalance, ProductLot, StockMovement, StockMovementItem, PurchaseOrder, PurchaseOrderItem, SupplierInvoiceEntry, StockTransfer, StockAudit

**Financeiro:** AccountsReceivable, ReceivablePayment, AccountsPayable, PayablePayment, CashRegister, CashMovement, PaymentMethod, CardTransaction, SplitConfiguration, SplitParticipant, Bank, BankAccount

**Fiscal:** TaxRule (com especializações ICMS, IPI, PIS, COFINS, CFOP, NFS-e, IBS/CBS), FiscalDocumentContext

**CRM:** Notification, Campaign, CampaignRecipient, MessageTemplate, CommunicationPreference

**Comissões:** CommissionRule, CommissionRuleService, CommissionSettlement, ProductivityFact

**Auditoria:** AuditEvent, WebhookEndpoint, WebhookDelivery, IntegrationLog

### 6.1.1 Observação crítica de modelagem

O pacote `docs2` já corrige um problema relevante dos documentos exploratórios em `docs`: o modelo logico e o desenho do modulo foram consolidados sem reproduzir automaticamente inconsistencias do DDL preliminar. Em especial:

- o modelo do programa assume `tenant_id` e contexto operacional explicitos, mas sem repetir a afirmacao incorreta de que todas as tabelas fisicas ja estao definidas dessa forma
- o desenho final evita tratar o DDL exploratorio de `docs/03-MODELO-DADOS.md` como modelo fisico pronto
- a proxima etapa obrigatoria e produzir dicionario de dados e esquema fisico revisado a partir do modelo logico, nao a partir do DDL preliminar legado

### 6.2 Caminhos Críticos do ER

**Jornada de Atendimento:**
```
Client → Animal → Appointment → Encounter → Command → CommandItem
                                              → AccountsReceivable → ReceivablePayment
                                              → StockMovementItem
                                              → CommissionSettlement
```

**Jornada de Internação:**
```
Animal → Hospitalization → HospitalizationEvent
                         → HospitalizationMedication
                         → PharmacyRequest → StockMovementItem
                         → AccountsReceivable
```

**Jornada Laboratorial:**
```
Animal → ExamOrder → ExamResult → DiagnosticReport → Notification
```

---

## 7. CONTRATOS DE API

### 7.1 Padrões

- **Base path:** `/api/v1`
- **Autenticação:** JWT Bearer Token
- **Headers obrigatórios:** `X-Request-Id`, `X-Tenant-Id`, `X-Company-Id`, `X-Branch-Id`
- **Paginação:** `page`, `size` com envelope `meta`
- **Erros:** Estrutura padronizada com `code`, `message`, `details`, `requestId`
- **Idempotência:** `Idempotency-Key` para operações sensíveis

### 7.2 Grupos de API (21 grupos)

Auth, Organizations, Clients, Animals, Professionals, Services, Products, Appointments, Commands, Quotes, Packages, Medical Records, Hospitalizations, Exams, Reports, Stocks, Stock Transactions, Purchase Orders, Accounts Receivable, Accounts Payable, Cash Registers, Card Transactions, Split, Tax, Notifications, Campaigns, Commissions, Webhooks

### 7.3 Operações Sensíveis com Idempotência

- Finalizar comanda
- Registrar pagamento
- Estornar pagamento
- Fechar caixa
- Concluir transferência
- Processar inventário
- Liberar laudo
- Dar alta

---

## 8. CATÁLOGO DE EVENTOS

### 8.1 Metadados Obrigatórios

```json
{
  "eventId": "uuid",
  "eventName": "encounter.closed",
  "eventVersion": 1,
  "occurredAt": "ISO-8601",
  "tenantId": "uuid",
  "companyId": "uuid",
  "branchId": "uuid",
  "actor": { "type": "USER", "id": "uuid" },
  "correlationId": "uuid",
  "resource": { "type": "Encounter", "id": "uuid" },
  "data": {}
}
```

### 8.2 Eventos Prioritários (Fase 1-2)

| Evento | Produtor | Consumidores |
|--------|----------|-------------|
| `appointment.created` | Scheduling | CRM, Reporting |
| `command.finalized` | Command | Billing, Inventory, Commissions |
| `hospitalization.opened` | Inpatient | Billing, Reporting |
| `report.released` | Laboratory | CRM, Medical Record |
| `stock.moved` | Inventory | Reporting, Audit |
| `receivable.paid` | Treasury | Cash Flow, Reporting |
| `notification.sent` | Notification | Reporting, Timeline |

### 8.3 Garantias de Entrega

- Outbox pattern no produtor
- Retries no broker
- Dead-letter queue
- Consumers idempotentes
- Replay controlado

---

## 9. MATRIZ DE PERMISSÕES

### 9.1 Modelo de Autorização (4 Camadas)

1. **Autenticação:** identifica o usuário
2. **Autorização por papel:** acesso básico por rotina (RBAC)
3. **Autorização contextual:** restrição por tenant, empresa, filial, setor
4. **Alçada:** controle de ações com impacto financeiro/fiscal

### 9.2 Papeis Base (15)

Administrador Corporativo, Administrador de Unidade, Recepcionista, Veterinário, Auxiliar/Enfermagem, Laboratório, Estoque/Farmácia, Compras, Financeiro, Fiscal, Marketing/CRM, Gestor de Unidade, Diretoria, Auditoria/Compliance, Suporte Interno

### 9.3 Segregação de Funções Obrigatória

| Combinação Proibida | Motivo |
|---------------------|--------|
| Criar usuário + Aprovar privilégio | Controle de acesso |
| Cadastrar despesa + Aprovar pagamento | Fraude financeira |
| Ajustar estoque + Homologar inventário | Conflito de interesse |
| Aplicar desconto + Fechar própria comanda | Fraude operacional |
| Solicitar exame + Liberar laudo (mesmo fluxo) | Qualidade clínica |
| Alterar regra fiscal + Aprovar documento retroativo | Fraude fiscal |

---

## 10. MVP — PLANO DE MÍNIMO PRODUTO VIÁVEL

### 10.1 Escopo

**Incluído:**
- ✅ Autenticação, contexto operacional, auditoria
- ✅ Clientes, animais, profissionais básicos
- ✅ Serviços e produtos
- ✅ Agenda e disponibilidade
- ✅ Comandas, itens, descontos, fechamento
- ✅ Contas a receber/pagar básicas
- ✅ Caixa e formas de pagamento
- ✅ Estoque básico e movimentações
- ✅ Dashboards operacionais mínimos

**Excluído do MVP:**
- ❌ Internação completa
- ❌ Laboratório completo
- ❌ Fiscal avançado
- ❌ Split completo
- ❌ CRM de campanhas em massa
- ❌ Fidelidade completa

### 10.2 Fluxos que o MVP Suporta

| Fluxo | Descrição |
|-------|-----------|
| **A — Atendimento Agendado** | Localizar cliente/animal → Agendar → Abrir comanda → Adicionar itens → Fechar → Receber |
| **B — Atendimento Avulso** | Cadastrar cliente/animal → Comanda → Itens → Pagamento → Estoque |
| **C — Estoque Básico** | Cadastrar produto → Estoque → Entrada → Movimentação → Consulta |
| **D — Fechamento de Caixa** | Abrir → Receber comandas → Sangria/depósito → Fechar → Relatório |

### 10.3 Critérios de Aceite

- Uma unidade opera agendamento e atendimento no novo módulo
- Comandas abertas, editadas e finalizadas com auditoria
- Recebimentos e caixa funcionam sem dependência externa
- Produtos e saldos básicos controlados
- Usuários acessam apenas seu escopo

---

## 11. ROADMAP DE IMPLANTAÇÃO

### 11.1 Fases

| Fase | Entrega | Marcos |
|------|---------|--------|
| **0 — Foundations** | Tenancy, IAM, design system, observabilidade, CI/CD | Fundação corporativa pronta |
| **1 — Core Corporativo** | Identidade, cadastro mestre, auditoria | Primeira unidade operando cadastros |
| **2 — Atendimento e Agenda** | Agenda, comandas, pacotes, orçamentos | Atendimento no novo core |
| **3 — Estoque e Compras** | Produtos, estoques, compras, NF | Supply estabilizado |
| **4 — Financeiro e Fiscal** | Contas, pagamentos, split, fiscal paramétrico | Fechamento controlado |
| **5 — Clínico/Hospitalar** | Prontuário, internação, vacinas | Internação no novo core |
| **6 — Laboratório** | Exames, laudos, interfaceamento | Laboratório integrado |
| **7 — CRM e Analytics** | Campanhas, dashboards multifilial, lakehouse | Desligamento do legado |

### 11.2 Estratégia de Migração

```
Etapa 1: ENCAPSULAR — Regras legadas → APIs
Etapa 2: CONVIVER — SSO, shell único, feature flags
Etapa 3: SUBSTITUIR — Módulo a módulo, por jornada
Etapa 4: DESLIGAR — Arquivar legado, comissionar novo
```

**Ordem de substituição:**
1. Identidade, acesso e shell
2. Cadastros mestres
3. Agenda e comandas
4. Produtos, estoque e compras
5. Financeiro
6. Fiscal
7. Internação
8. Laboratório
9. Marketing e relatórios

### 11.3 Trens de Entrega

| Trem | Foco |
|------|------|
| **A** | Core platform e segurança |
| **B** | Atendimento e experiência operacional |
| **C** | Supply, financeiro e fiscal |
| **D** | Dados, analytics e integrações |

---

## 12. WBS E SPRINTS

### 12.1 Work Breakdown Structure (15 Pacotes)

| # | Pacote | Squad |
|---|--------|-------|
| 1.0 | Governança do programa | PMO |
| 2.0 | Core de identidade e tenancy | Plataforma + Segurança |
| 3.0 | Cadastro mestre | MDM |
| 4.0 | Agenda e disponibilidade | Atendimento |
| 5.0 | Atendimento e comanda | Atendimento |
| 6.0 | Prontuário e clínico | Clínico Hospitalar |
| 7.0 | Laboratório | Laboratório |
| 8.0 | Estoque, farmácia e compras | Supply |
| 9.0 | Financeiro e tesouraria | Financeiro + Fiscal |
| 10.0 | Fiscal | Fiscal |
| 11.0 | CRM e notificações | CRM + Analytics |
| 12.0 | Comissões e produtividade | CRM + Analytics |
| 13.0 | Relatórios e analytics | CRM + Analytics |
| 14.0 | Integrações | Plataforma |
| 15.0 | Dados, QA e release | Todos |

### 12.2 Sprint 0 — Foundation and Readiness (2 semanas)

**Entregas:**
- Setup de repositório e convenções
- Pipeline CI inicial
- Estrutura base de frontend e backend
- Observabilidade mínima
- Design system inicial
- Modelo de tenancy fechado
- Backlog MVP refinado
- Alinhamento com unidade piloto

### 12.3 Sprint 1 — Core de Acesso, Contexto e Cadastro (2 semanas)

**Entregas:**
- Login, sessão, contexto operacional
- Grupos de acesso básicos
- Cadastro de clientes e animais
- Profissionais básicos
- Shell de navegação
- Auditoria mínima

**Épicos:** EPIC-PLAT-01, EPIC-PLAT-02, EPIC-MDM-01, EPIC-MDM-02

---

## 13. GOVERNANÇA

### 13.1 Decisões Estruturais (7 Formalizadas)

| ID | Decisão | Impacto |
|----|---------|---------|
| D-001 | Modular monolith no início | Reduz risco de fragmentação precoce |
| D-002 | Sistema atual = fonte de domínio, não contrato final | Evita clonar erros do legado |
| D-003 | Isolamento lógico por tenant | Simplifica operação inicial |
| D-004 | MVP focado (exclui internação/laboratório/fiscal avançado) | Maximiza chance de go-live controlado |
| D-005 | Auditoria desde Sprint 0 | Reduz risco de perda de rastreabilidade |
| D-006 | Rollout por feature flag e unidade piloto | Reduz impacto sistêmico |
| D-007 | Eventos de domínio para integração | Melhora extensibilidade |

### 13.2 Risk Register — Top 8 Riscos do MVP

| ID | Risco | Prob. | Impacto | Mitigação |
|----|-------|-------|---------|-----------|
| R-001 | Regras legadas ocultas | Alta | Crítico | Discovery contínuo com usuários-chave |
| R-003 | Dados mestres inconsistentes | Alta | Alto | Saneamento prévio e validação |
| R-005 | Falha de segregação de acesso | Média | Crítico | Matriz de permissão + testes de autorização |
| R-006 | Divergência no fechamento de comanda | Média | Crítico | Idempotência + reconciliação |
| R-007 | Estoque não reflete consumo por venda | Média | Alto | Modelagem com rastreio + testes operacionais |
| R-008 | Unidade piloto sem engajamento | Média | Alto | Escolha criteriosa + champions locais |
| R-013 | Treinamento insuficiente | Média | Alto | Treinamento por papel + operação assistida |
| R-014 | Falta de plano de rollback | Baixa | Crítico | Testar rollback antes da liberação |

### 13.3 Comitês de Governança Recomendados

- **Comitê de Produto** — Priorização e escopo
- **Comitê de Arquitetura** — ADRs e padrões técnicos
- **Comitê de Dados** — MDM, qualidade, retenção
- **Comitê de Segurança e Compliance** — LGPD, acessos, auditoria

---

## 14. RELEASE PLAN — UNIDADE PILOTO

### 14.1 Critérios de Escolha da Unidade

- Porte médio
- Volume suficiente para validar agenda e comanda
- Operação menos crítica que hospital de alta complexidade
- Liderança local parceira
- Equipe receptiva a treinamento

### 14.2 Fases do Release

| Fase | Duração | Atividade |
|------|---------|-----------|
| 0 — Preparação | 1 sem | Validação de escopo, usuários, dados |
| 1 — Ready técnica | 1 sem | Ambiente, feature flags, observabilidade |
| 2 — Ready operacional | 1 sem | Treinamento, materiais, checklist |
| 3 — Soft launch | 1 sem | Uso controlado, monitoramento intensivo |
| 4 — Operação assistida | 2 sem | Ampliação, coleta de gaps, correções |
| 5 — Go-live piloto | 1 sem | Módulo como fluxo principal |
| 6 — Estabilização | 2 sem | Redução de incidentes, preparação para expansão |

### 14.3 Checklist de Go-Live (Reutilizável)

**Executivo:** Sponsorship ✅ · Escopo congelado ✅ · War room definido ✅ · Rollback pronto ✅

**Produto:** Fluxos homologados ✅ · Lacunas registradas ✅ · Materiais revisados ✅

**Dados:** Clientes/animais validados ✅ · Produtos carregados ✅ · Estoque inicial conferido ✅

**Segurança:** Usuários criados ✅ · Grupos aplicados ✅ · MFA habilitado ✅ · Auditoria validada ✅

**Técnico:** Deploy homologado ✅ · Backups executados ✅ · Monitoramento ativo ✅ · Alertas configurados ✅

**Operação:** Treinamento concluído ✅ · Champion local nomeado ✅ · Suporte aberto ✅

### 14.4 Critérios de Rollback

- Indisponibilidade persistente em fluxo crítico
- Erro financeiro recorrente sem contorno
- Falha de acesso ou segregação de dados
- Perda de rastreabilidade de transação
- Impossibilidade de operar caixa ou fechamento

### 14.5 Métricas de Liberação

- % de atendimentos no novo fluxo
- Tempo médio de abertura de comanda
- Taxa de erro de fechamento
- Divergência de caixa
- Falhas críticas por dia
- Tempo de resposta em agenda/busca
- Satisfação da equipe piloto

---

## 15. KPIs DO PROGRAMA

### 15.1 KPIs de Produto

| KPI | Descrição |
|-----|-----------|
| Tempo médio para abrir atendimento | Eficiência operacional |
| Taxa de ocupação de agenda | Utilização de recursos |
| No-show e cancelamento | Qualidade do agendamento |
| Tempo médio de internação | Eficiência hospitalar |
| SLA de liberação de laudos | Performance laboratorial |
| Tempo médio de fechamento de comanda | Velocidade operacional |
| % de ruptura de estoque | Eficiência de supply |
| Inadimplência | Saúde financeira |
| Ticket médio por cliente/animal/profissional | Rentabilidade |
| Recorrencia de clientes | Fidelização |

### 15.2 KPIs de Tecnologia

| KPI | Meta |
|-----|------|
| Disponibilidade por domínio | > 99.5% |
| p95 de rotas críticas | < 500ms |
| Taxa de erro por release | < 1% |
| Lead time de mudança | < 2 semanas |
| MTTR | < 1 hora |

### 15.3 KPIs de Governança

| KPI | Meta |
|-----|------|
| Dados mestres com qualidade adequada | > 95% |
| Acessos recertificados | 100% trimestral |
| Eventos auditados com integridade | 100% |
| Incidentes de segurança | 0 críticos |
| Solicitações LGPD atendidas | 100% no prazo |

---

## 16. INTEGRAÇÕES

### 16.1 Integrações Obrigatórias

| Integração | Tipo | Domínio |
|-----------|------|---------|
| Gateways de pagamento | Pagamento | Financeiro |
| Adquirentes e split | Pagamento | Financeiro |
| Bancos e conciliadores | Financeiro | Tesouraria |
| Emissores fiscais | Fiscal | Fiscal |
| Laboratórios parceiros | Externo | Laboratório |
| Equipamentos laboratoriais | Interfaceamento | Laboratório |
| SMS, Email, WhatsApp | Comunicação | CRM |
| Webhooks para parceiros | Extensão | Plataforma |
| BI e Data Warehouse | Analytics | Dados |
| Identidade corporativa/SSO | Autenticação | IAM |

### 16.2 Regras de Integração

- Retries com DLQ
- Idempotência obrigatória
- Versionamento de contratos
- Observabilidade por parceiro
- Mascaramento de dados sensíveis em logs

---

## 17. LGPD E COMPLIANCE

### 17.1 Controles

- Base legal mapeada por processo
- Consentimentos e preferências registráveis
- Minimização de dados em campanhas
- Rastreamento de compartilhamento com terceiros
- Anonimização/pseudonimização para analíticos
- Processos de atendimento a titulares

### 17.2 Auditoria Obrigatória

- Login, logout e falha de autenticação
- Consulta e alteração de dados clínicos
- Ajustes de estoque
- Alterações de preço
- Fechamentos financeiros
- Cancelamentos e estornos
- Alterações fiscais
- Administração de acessos

---

## 18. CONCLUSÃO E RECOMENDAÇÃO EXECUTIVA

### 18.1 Estado do Programa

O programa **vetus-like** está **suficientemente estruturado** para sair do planejamento e iniciar execução controlada:

- ✅ Visão e estratégia bem definidas
- ✅ Escopo funcional forte e rastreável (108 links de menu navegáveis mapeados, 107 páginas inspecionadas)
- ✅ Arquitetura coerente (14 bounded contexts, 6 camadas)
- ✅ Modelo de dados lógico completo (60+ entidades)
- ✅ Contratos de API definidos (100+ endpoints)
- ✅ Catálogo de eventos estruturado (50+ eventos)
- ✅ Matriz de permissões detalhada (15 papéis, 12 domínios)
- ✅ MVP bem recortado (4 fluxos essenciais)
- ✅ Roadmap de 7 fases com milestones claros
- ✅ WBS e sprints iniciais definidos
- ✅ Release plan e checklist de go-live prontos
- ✅ Governança de riscos e decisões formalizada

### 18.2 Condições para GO

| # | Condição | Status |
|---|----------|--------|
| 1 | Sponsorship e donos formais definidos | ⚠️ Pendente |
| 2 | Unidade piloto candidata identificada | ⚠️ Pendente |
| 3 | Stack técnica final validada | ⚠️ Pendente |
| 4 | Backlog de Sprint 0 fechado | ⚠️ Pendente |
| 5 | Rituais de governança definidos | ⚠️ Pendente |
| 6 | Escopo do MVP congelado (sem expansão) | ⚠️ Pendente |

### 18.3 Próximos Passos Imediatos

1. **Formalizar ADRs** principais em documento versionado
2. **Escolher stack final** e publicar convenções de engenharia
3. **Confirmar unidade piloto** e nomear champion local
4. **Produzir OpenAPI formal** a partir do outline existente
5. **Produzir dicionário de dados** a partir do modelo lógico
6. **Criar matriz RACI** do programa e do war room
7. **Preparar ambiente de homologação**
8. **Iniciar Sprint 0** com foco em foundation técnica

### 18.3.1 Medidas de higiene documental obrigatorias

1. **Tratar `docs2` como fonte de verdade**
2. **Manter `docs/01-04` explicitamente como referência exploratória**
3. **Evitar reutilizar números antigos** de API e menu sem recalcular contra os artefatos locais
4. **Não promover o DDL exploratório** a modelo físico de implementação sem revisão formal

### 18.4 Recomendação Final

> **O programa está pronto para execução controlada.** A prontidão de desenho é alta. A prontidão de implementação é média e depende agora menos de ideação e mais de **decisão, ownership e disciplina de execução**.
>
> **Risco principal:** tentar expandir o MVP antes de estabilizar o piloto.
> **Oportunidade principal:** o inventário existente é denso e completo — o domínio não precisa ser redescoberto, apenas modernizado.

---

## APÊNDICES

### A. Índice de Documentos Fonte (27)

| # | Documento | Categoria |
|---|-----------|-----------|
| 01 | Visão e Estratégia | Fundação |
| 02 | Capacidades Funcionais | Fundação |
| 03 | Arquitetura Enterprise | Arquitetura |
| 04 | Dados, Governança e Segurança | Arquitetura |
| 05 | Roadmap de Implantação | Planejamento |
| 06 | Migração e Cutover | Planejamento |
| 07 | Backlog, Épicos e KPIs | Produto |
| 08 | Rastreabilidade de Módulos | Fundação |
| 09 | Blueprint do Módulo | Fundação |
| 10 | Épicos e Histórias | Produto |
| 11 | Matriz de Permissões | Segurança |
| 12 | Event Catalog | Arquitetura |
| 13 | API Contracts | Arquitetura |
| 14 | Modelo de Dados Lógico | Arquitetura |
| 15 | Plano MVP | Produto |
| 16 | OpenAPI Outline | Arquitetura |
| 17 | ER Diagram Textual | Arquitetura |
| 18 | Release Plan Piloto | Planejamento |
| 19 | WBS | Planejamento |
| 20 | Sprint 0 e Sprint 1 | Planejamento |
| 21 | Checklist Go-Live | Planejamento |
| 22 | Master Index | Governança |
| 23 | Risk Register | Governança |
| 24 | Decision Log | Governança |
| 25 | Executive Summary | Fundação |
| 26 | Readiness Assessment | Fundação |
| README | Índice do Pacote | Governança |

### B. Arquivos de Inspeção Gerados

| Arquivo | Descrição |
|---------|-----------|
| `SISTEMA-VETUS-COMPLETO.md` | Documentação completa do sistema inspecionado |
| `menu-items.json` | 108 links de menu navegáveis mapeados |
| `api-calls.json` | 316 chamadas de API capturadas, 188 URLs únicas |
| `visited-pages.json` | 107 páginas visitadas com metadados |
| `theme-vars.json` | Variáveis de tema/CSS |
| `scripts.json` | Scripts carregados pelo frontend |
| `page-*.png` | Screenshots de todas as páginas |
| `page-*.html` | HTML exportado das páginas |

---

*Relatório gerado em 02/04/2026 e revisado criticamente com base na análise de 27 documentos do pacote `docs2`, dos documentos exploratórios em `docs` e do inventário local do sistema Vetus (107 páginas, 316 chamadas de API capturadas, 188 URLs únicas e 108 links de menu navegáveis).*
