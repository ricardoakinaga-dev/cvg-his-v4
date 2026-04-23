# 🏢 ERP ENTERPRISE — PLANEJAMENTO COMPLETO DE CONSTRUÇÃO

> **Baseado na análise do sistema Vetus ERP** — Sistema de gestão para Clínicas Veterinárias e Pet Shops  
> **Data:** 02/04/2026  
> **Nível:** Enterprise  
> **Status:** Planejamento exploratório inicial
>
> **Nota de governança:** este documento permanece como referência exploratória. Para o plano consolidado e autoritativo do programa, utilizar `docs2`.

---

## 📋 ÍNDICE

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Módulos do ERP](#4-módulos-do-erp)
5. [Modelo de Dados](#5-modelo-de-dados)
6. [APIs e Integrações](#6-apis-e-integrações)
7. [Segurança](#7-segurança)
8. [Infraestrutura](#8-infraestrutura)
9. [Roadmap de Implementação](#9-roadmap-de-implementação)
10. [Equipe e Estimativas](#10-equipe-e-estimativas)

---

## 1. VISÃO GERAL DO PROJETO

### 1.1 Objetivo

Construir um **ERP Enterprise completo** para gestão de clínicas veterinárias e pet shops, baseado na análise aprofundada do sistema Vetus ERP (107 páginas inspecionadas, 292 chamadas de API capturadas, 109 itens de menu mapeados).

### 1.2 Escopo

O sistema cobrirá **11 módulos principais** com **100+ funcionalidades**:

| Módulo        | Funcionalidades                                                                  |
| ------------- | -------------------------------------------------------------------------------- |
| Atendimento   | Agenda, Comandas, Vendas, Pacotes, Esteira, Orçamentos, Fidelidade, Internação   |
| Cadastros     | Animais, Clientes, Serviços, Raças, Espécies, Cores, Webhooks                    |
| Laboratório   | Exames, Laudos, Hemogramas, Urina, Bioquímico, Equipamentos                      |
| Estoque       | Produtos, NF, Transações, Farmácia, Validade, Auditoria, Compras, Transferências |
| Fiscal        | ICMS, IPI, PIS, COFINS, CFOP, NFS-e, IBS/CBS                                     |
| Financeiro    | Contas a Pagar/Receber, Caixa, Split, Cartões, Cheques, Fluxo de Caixa           |
| Marketing     | SMS, Campanhas, Email de Vacina                                                  |
| RH            | Profissionais, Comissões, Folgas, Profissões                                     |
| Relatórios    | DRE, Contas, Vendas, Produção, Estoque, NF                                       |
| Administração | Usuários, Grupos de Acesso, Configurações                                        |
| Dashboards    | Financeiro, Multifilial, Curva ABC                                               |

### 1.3 Diferenciais Enterprise

- **Multi-tenant** com isolamento de dados
- **Multi-filial** com gestão centralizada
- **Split de pagamento** integrado
- **Laboratório completo** com esteira de exames
- **Programa de fidelidade** com pontos e resgate
- **Marketing automatizado** via SMS e email
- **Integrações externas** (Live Pet, Live Lab, gateways de pagamento)
- **API RESTful** documentada e versionada
- **Auditoria completa** de todas as operações

---

## 2. ARQUITETURA DO SISTEMA

### 2.1 Arquitetura Macro

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAMADA DE CLIENTE                        │
├─────────────────────────────────────────────────────────────────┤
│  Web App (Vue.js 3)  │  Mobile App  │  Desktop POS  │  API Ext. │
└──────────┬───────────┴──────┬───────┴───────┬───────┴─────┬─────┘
           │                  │               │             │
┌──────────▼──────────────────▼───────────────▼─────────────▼─────┐
│                     API GATEWAY (Kong/Nginx)                     │
│         Rate Limiting │ Auth │ Logging │ Load Balancing          │
└──────────┬──────────────────────────────────────────┬───────────┘
           │                                          │
┌──────────▼──────────┐                    ┌──────────▼───────────┐
│   MICROSERVIÇOS     │                    │   SERVIÇOS LEGACY    │
│  (Node.js/Go)       │                    │   (Migração Gradual) │
├─────────────────────┤                    ├──────────────────────┤
│ • Auth Service      │                    │ • Módulo Fiscal      │
│ • Agenda Service    │                    │ • Módulo Lab         │
│ • Cliente Service   │                    │ • Módulo Estoque     │
│ • Animal Service    │                    │ • Módulo Financeiro  │
│ • Comanda Service   │                    │                      │
│ • Estoque Service   │                    │                      │
│ • Financeiro Svc    │                    │                      │
│ • Lab Service       │                    │                      │
│ • Notificação Svc   │                    │                      │
│ • Relatório Service │                    │                      │
│ • Split Service     │                    │                      │
│ • Marketing Service │                    │                      │
│ • RH Service        │                    │                      │
└──────────┬──────────┴────────────────────┴──────────┬───────────┘
           │                                          │
┌──────────▼──────────────────────────────────────────▼───────────┐
│                     CAMADA DE DADOS                              │
├────────────────────┬──────────────────┬─────────────────────────┤
│   PostgreSQL 16    │   Redis 7        │   Elasticsearch 8       │
│   (Dados Transac.) │   (Cache/Sessões)│   (Busca/Logs)          │
├────────────────────┼──────────────────┼─────────────────────────┤
│   MinIO/S3         │   RabbitMQ       │   TimescaleDB           │
│   (Arquivos)       │   (Message Queue)│   (Time Series)         │
└────────────────────┴──────────────────┴─────────────────────────┘
```

### 2.2 Padrão Arquitetural

- **Backend:** Microserviços com comunicação assíncrona (event-driven)
- **Frontend:** SPA Vue.js 3 com Composition API + PrimeVue
- **Banco de Dados:** PostgreSQL com schema por tenant (multi-tenant)
- **Cache:** Redis para sessões, cache de consultas e rate limiting
- **Message Broker:** RabbitMQ para comunicação entre serviços
- **Busca:** Elasticsearch para buscas full-text e logs
- **Storage:** MinIO (S3-compatible) para arquivos e documentos

### 2.3 Fluxo de Dados Principal

```
Cliente → API Gateway → Auth → Serviço → Banco de Dados
                              ↓
                         Message Queue
                              ↓
                    Serviços Assíncronos
                    (Notificações, Relatórios, Integrações)
```

---

## 3. STACK TECNOLÓGICO

### 3.1 Frontend

| Tecnologia         | Versão | Uso                     |
| ------------------ | ------ | ----------------------- |
| Vue.js             | 3.4+   | Framework principal     |
| TypeScript         | 5.3+   | Tipagem estática        |
| PrimeVue           | 4.x    | Componentes UI          |
| PrimeFlex          | 3.x    | Grid e utilitários CSS  |
| Vue Router         | 4.x    | Roteamento              |
| Pinia              | 2.x    | Gerenciamento de estado |
| Vite               | 5.x    | Build tool              |
| Chart.js / ECharts | -      | Gráficos e dashboards   |
| Day.js             | -      | Manipulação de datas    |
| Axios              | -      | HTTP client             |
| Vitest             | -      | Testes unitários        |
| Playwright         | -      | Testes E2E              |

### 3.2 Backend

| Tecnologia      | Versão | Uso                      |
| --------------- | ------ | ------------------------ |
| Node.js         | 20 LTS | Runtime principal        |
| NestJS          | 10.x   | Framework backend        |
| TypeScript      | 5.3+   | Tipagem estática         |
| Prisma ORM      | 5.x    | ORM para PostgreSQL      |
| JWT             | -      | Autenticação             |
| BullMQ          | -      | Filas de jobs            |
| Socket.IO       | 4.x    | WebSockets em tempo real |
| Swagger/OpenAPI | 3.0    | Documentação de API      |

### 3.3 Infraestrutura

| Tecnologia              | Uso                      |
| ----------------------- | ------------------------ |
| Docker + Docker Compose | Containerização local    |
| Kubernetes (EKS/GKE)    | Orquestração em produção |
| PostgreSQL 16           | Banco de dados principal |
| Redis 7                 | Cache e sessões          |
| RabbitMQ                | Message broker           |
| Elasticsearch 8         | Busca e logs             |
| MinIO                   | Object storage           |
| Nginx/Kong              | API Gateway              |
| Grafana + Prometheus    | Monitoramento            |
| ELK Stack               | Centralização de logs    |
| Terraform               | Infrastructure as Code   |
| GitHub Actions          | CI/CD                    |

---

## 4. MÓDULOS DO ERP

### 4.1 MÓDULO DE ATENDIMENTO

#### 4.1.1 Agenda

- Calendário visual por profissional
- Agendamento de consultas, cirurgias, retornos
- Controle de disponibilidades e folgas
- Notificações automáticas (SMS/Email)
- Cores por tipo de agendamento (marcadores)
- Visualização: Dia, Semana, Mês
- Drag & drop para reagendamento
- Integração com comandas (abrir comanda direto do agendamento)

**Entidades:** `Schedule`, `Professional`, `ScheduleMarker`, `Availability`, `TimeOff`

**APIs:**

```
GET    /api/v1/schedule?startDateTime=&endDateTime=
POST   /api/v1/schedule
PUT    /api/v1/schedule/{id}
DELETE /api/v1/schedule/{id}
GET    /api/v1/professionals/available?date=&time=
GET    /api/v1/schedule/markers
POST   /api/v1/schedule/markers
GET    /api/v1/professionals/{id}/availability
POST   /api/v1/time-off
```

#### 4.1.2 Comandas

- Abertura de comanda vinculada a cliente/animal
- Adição de produtos e serviços
- Descontos por item ou no total
- Múltiplas formas de pagamento
- Finalização com baixa automática no financeiro
- Histórico de comandas
- Comandas abertas/fechadas

**Entidades:** `Command`, `CommandItem`, `CommandPayment`, `CommandDiscount`

**APIs:**

```
GET    /api/v1/commands?page=&size=&query=
GET    /api/v1/commands/open
GET    /api/v1/commands/{id}
POST   /api/v1/commands
POST   /api/v1/commands/{id}/items
DELETE /api/v1/commands/{id}/items/{itemId}
POST   /api/v1/commands/{id}/finalize
POST   /api/v1/commands/{id}/discount
```

#### 4.1.3 Vendas

- PDV completo para balcão
- Leitura de código de barras
- Busca rápida de produtos
- Controle de estoque em tempo real
- Cupom fiscal (NFC-e)
- Cancelamento de vendas com auditoria

**Entidades:** `Sale`, `SaleItem`, `SalePayment`, `SaleCancellation`

#### 4.1.4 Pacotes

- Criação de pacotes de serviços
- Intervalo entre sessões configurável
- Controle de sessões utilizadas/restantes
- Pagamento antecipado ou parcelado

**Entidades:** `Package`, `PackageItem`, `PackageSession`, `PackagePayment`

#### 4.1.5 Esteira de Atendimento

- Kanban visual do fluxo de pacientes
- Colunas: Aguardando → Em Atendimento → Em Exame → Finalizado
- Controle de tempo por etapa
- Alertas de tempo excedido
- Integração com agenda e comandas

#### 4.1.6 Esteira de Exames

- Fila de exames laboratoriais
- Status: Solicitado → Coletado → Em Análise → Laudado → Entregue
- Vinculação com resultados de exames

#### 4.1.7 Orçamentos

- Criação de orçamentos com produtos e serviços
- Validade do orçamento
- Conversão de orçamento em venda/comanda
- Aprovação/reprovação pelo cliente

**Entidades:** `Quote`, `QuoteItem`, `QuoteApproval`

#### 4.1.8 Programa de Fidelidade (Resgate de Pontos)

- Acúmulo de pontos por compra
- Regras de pontuação configuráveis
- Resgate de pontos por produtos/serviços
- Bloqueio de pontos
- Saldo disponível vs bloqueado

**Entidades:** `LoyaltyProgram`, `LoyaltyPoint`, `LoyaltyRedemption`

#### 4.1.9 Internação

- Gestão de internação de animais
- Controle de boxes/enfermarias
- Mapa de internação visual
- Medicações e cuidados programados
- Eventos de internação (alimentação, medicação, curativo)
- Abertura de comanda vinculada
- Finalização de internação

**Entidades:** `Hospitalization`, `HospitalizationBox`, `HospitalizationEvent`, `HospitalizationMedication`

---

### 4.2 MÓDULO DE CADASTROS

#### 4.2.1 Animais

- Cadastro completo: nome, espécie, raça, cor, sexo, idade
- Foto do animal
- Tutor/proprietário vinculado
- Histórico médico (prontuário)
- Vacinas e vermífugos
- Aniversariantes (dia/mês)
- Status: Ativo/Inativo

**Entidades:** `Animal`, `AnimalPhoto`, `AnimalMedicalRecord`

**APIs:**

```
GET    /api/v1/animals?page=&size=&query=
GET    /api/v1/animals/{id}
POST   /api/v1/animals
PUT    /api/v1/animals/{id}
DELETE /api/v1/animals/{id}
GET    /api/v1/animals/birthdays?month=
```

#### 4.2.2 Clientes

- Pessoa física ou jurídica
- CPF/CNPJ com validação
- Endereço completo
- Contatos (telefone fixo, celular, email)
- Grupos de clientes (ex: convênio)
- Programa de fidelidade
- Aceite de SMS marketing
- Limite de saldo devedor
- Histórico de atendimentos

**Entidades:** `Client`, `ClientAddress`, `ClientContact`, `ClientGroup`, `ClientDetail`

**APIs:**

```
GET    /api/v1/clients?page=&size=&query=
GET    /api/v1/clients/{id}
POST   /api/v1/clients
PUT    /api/v1/clients/{id}
DELETE /api/v1/clients/{id}
GET    /api/v1/client-groups
POST   /api/v1/client-groups
```

#### 4.2.3 Serviços

- Cadastro de serviços veterinários
- Preço, duração, especialidade
- Vinculação com profissionais
- Serviços agendáveis ou não
- Importação em massa via CSV/Excel

**Entidades:** `Service`, `ServiceCategory`, `ServiceProfessional`

#### 4.2.4 Cadastros Auxiliares

- **Raças:** CRUD completo
- **Espécies:** CRUD completo
- **Cores:** CRUD completo
- **Grupos de Clientes:** Categorização
- **Boxes de Internação:** Enfermarias
- **Webhooks:** Configuração de integrações externas
- **Termos de Responsabilidade:** Documentos legais

---

### 4.3 MÓDULO DE LABORATÓRIO

#### 4.3.1 Exames

- Cadastro de tipos de exames
- Valores de referência por espécie
- Faixas etárias de referência
- Equipamentos vinculados

**Entidades:** `ExamType`, `Exam`, `ExamResult`, `ExamReferenceValue`

#### 4.3.2 Laudos

- Emissão de laudos médicos
- Documentação fotográfica
- Modelos de laudo por tipo
- Assinatura digital

**Entidades:** `Report`, `ReportItem`, `ReportPhoto`, `ReportType`

#### 4.3.3 Hemograma

- Registro completo de hemograma
- Valores de referência automáticos
- Flag de valores fora da faixa
- Histórico comparativo

#### 4.3.4 Urina

- Análise urinária completa
- Exame físico, químico e microscópico

#### 4.3.5 Bioquímico

- Painel bioquímico completo
- Valores de referência por espécie

#### 4.3.6 Equipamentos

- Cadastro de equipamentos de laboratório
- Manutenção preventiva e corretiva
- Calibração

**Entidades:** `LabEquipment`, `EquipmentMaintenance`

---

### 4.4 MÓDULO DE ESTOQUE

#### 4.4.1 Produtos

- Cadastro completo de produtos
- Código de barras (EAN/GTIN)
- Grupo de produtos
- Fabricante
- Unidade de medida
- Múltiplos estoques
- Tabelas de preço
- Controle de validade
- Foto do produto
- Importação em massa

**Entidades:** `Product`, `ProductBarcode`, `ProductStock`, `ProductPrice`, `ProductBatch`

**APIs:**

```
GET    /api/v1/products?page=&size=&query=
GET    /api/v1/products/{id}
POST   /api/v1/products
PUT    /api/v1/products/{id}
DELETE /api/v1/products/{id}
POST   /api/v1/products/import
GET    /api/v1/products/price-consultation?query=
```

#### 4.4.2 Entrada de Nota Fiscal

- Registro de NF de entrada
- Itens da nota com valores
- Geração automática de contas a pagar
- Estocagem automática dos produtos
- Opção de cadastrar produtos não existentes

**Entidades:** `InvoiceEntry`, `InvoiceItem`, `InvoiceTax`

#### 4.4.3 Transações no Estoque

- Entrada manual de produtos
- Saída manual (perda, quebra, uso interno)
- Ajuste de estoque
- Justificativa obrigatória

**Entidades:** `StockTransaction`, `StockTransactionItem`

#### 4.4.4 Requisição à Farmácia

- Solicitação de medicamentos
- Aprovação da requisição
- Baixa automática do estoque

#### 4.4.5 Validade de Produtos

- Controle de lotes e validade
- Alertas de produtos próximos ao vencimento
- Baixas de lotes vencidos

#### 4.4.6 Auditoria de Estoque

- Contagem física vs sistema
- Relatórios de divergência
- Ajuste pós-auditoria

#### 4.4.7 Auditoria de Preços

- Verificação de preços
- Relatórios de inconsistência

#### 4.4.8 Compras

- Pedidos de compra para fornecedores
- Cotação de preços
- Geração de contas a pagar

**Entidades:** `PurchaseOrder`, `PurchaseOrderItem`, `PurchaseQuote`

#### 4.4.9 Reajuste de Preços

- Reajuste em massa por percentual ou valor
- Filtros por grupo, fabricante, estoque
- Preview antes de aplicar

#### 4.4.10 Transferência entre Estoques

- Transferência entre filiais/estoques
- Rastreabilidade completa

#### 4.4.11 Coletores de Dados

- Integração com coletores de código de barras
- Contagem de estoque via coletor
- Sincronização automática

#### 4.4.12 Cadastros Auxiliares de Estoque

- **Estoques:** Múltiplos depósitos
- **Fabricantes:** CRUD
- **Grupos de Produtos:** Categorização
- **Setores da Empresa:** Departamentos
- **Unidades de Medida:** kg, un, ml, cx, etc.
- **Tabelas de Preço:** Múltiplas tabelas
- **Pontos de Venda:** Configuração de PDVs

---

### 4.5 MÓDULO FISCAL

#### 4.5.1 Tabelas Fiscais

- **ICMS:** Alíquotas por estado e produto
- **IPI:** Alíquotas por produto
- **PIS:** Regimes de tributação
- **COFINS:** Regimes de tributação
- **CFOP:** Código Fiscal de Operações
- **NFS-e:** Notas fiscais de serviço
- **Matriz Estado ICMS:** Alíquotas interestaduais
- **IBS/CBS:** Novo regime tributário

**Entidades:** `TaxICMS`, `TaxIPI`, `TaxPIS`, `TaxCOFINS`, `TaxCFOP`, `TaxNFS`, `TaxIBSCBS`

---

### 4.6 MÓDULO FINANCEIRO

#### 4.6.1 Contas a Receber

- Geração automática por vendas/comandas
- Contas avulsas
- Baixa individual ou em lote
- Rateio por centro de custo
- Juros e multa por atraso

**Entidades:** `AccountReceivable`, `AccountReceivablePayment`, `AccountBatch`

#### 4.6.2 Contas a Pagar

- Geração automática por compras/NF
- Contas avulsas
- Baixa individual ou em lote
- Rateio por centro de custo
- Alertas de vencimento

**Entidades:** `AccountPayable`, `AccountPayablePayment`

#### 4.6.3 Gaveta (Caixa)

- Abertura de caixa
- Sangria e suprimento
- Fechamento de caixa
- Conferência de valores
- Diferenças de caixa

**Entidades:** `CashRegister`, `CashTransaction`, `CashClose`

#### 4.6.4 Pagamento Antecipado

- Recebimentos antecipados
- Pagamentos antecipados
- Compensação futura

#### 4.6.5 Contas Adm. Cartão

- Administração de recebimentos via cartão
- Parcelamento
- Taxas de administração
- Conciliação com operadoras

**Entidades:** `CardAdminAccount`, `CardAdminInstallment`

#### 4.6.6 Cheques

- Cadastro de cheques recebidos/emitidos
- Baixa de cheques
- Controle de vencimento
- Devolução

**Entidades:** `Check`

#### 4.6.7 Fluxo de Caixa

- Projeção de receitas e despesas
- Gráfico de fluxo
- Filtros por período
- Saldo projetado

#### 4.6.8 Split de Pagamento

- Configuração de divisão de pagamentos
- Rateio entre profissionais e empresa
- Simulador de split
- Exportação de dados
- Habilitação de gateway (Stone)

**Entidades:** `SplitConfig`, `SplitParticipant`, `SplitSimulation`, `SplitTransaction`

#### 4.6.9 Maquininhas de Cartão

- Cadastro de máquinas
- Vinculação com operadora
- Taxas configuráveis

**Entidades:** `CardMachine`

#### 4.6.10 Transações de Cartão

- Registro de todas as transações
- Consulta com operadora
- Cancelamento/estorno
- Exportação

**Entidades:** `CardTransaction`

#### 4.6.11 Formas de Pagamento

- Dinheiro, Cartão Débito, Cartão Crédito, Pix, Boleto
- Configuração de taxas
- Prazo de recebimento

**Entidades:** `PaymentMethod`

#### 4.6.12 Centros de Custo

- Estrutura hierárquica
- Rateio de despesas

**Entidades:** `CostCenter`

#### 4.6.13 Custos e Despesas

- Cadastro de tipos de custo
- Vinculação com contas a pagar

**Entidades:** `CostType`, `Expense`

#### 4.6.14 Cartões Débito/Crédito

- Cadastro de bandeiras
- Configuração de taxas

#### 4.6.15 Bancos

- Cadastro de bancos
- Contas bancárias
- Conciliação bancária

**Entidades:** `Bank`, `BankAccount`

#### 4.6.16 Dashboard Financeiro

- Resumo financeiro
- Receitas vs Despesas
- Gráficos interativos
- Indicadores (DRE, margem, etc.)

#### 4.6.17 Linha do Tempo

- Visualização cronológica de todas as movimentações
- 21 tabelas de dados consolidados

---

### 4.7 MÓDULO DE MARKETING

#### 4.7.1 SMS Simples

- Envio individual de SMS
- Templates de mensagem
- Histórico de envios

**Entidades:** `SMSMessage`, `SMSTemplate`

#### 4.7.2 Campanhas de SMS Marketing

- Criação de campanhas
- Segmentação de público
- Agendamento de envio
- Relatórios de entrega

**Entidades:** `SMSCampaign`, `SMSCampaignRecipient`

#### 4.7.3 Email de Vacina

- Layout personalizável de email
- Envio automático de lembretes de vacina
- Templates HTML

**Entidades:** `EmailTemplate`, `EmailVacineReminder`

#### 4.7.4 Configurações de SMS

- Gateway de SMS
- Créditos disponíveis
- Configurações de envio

---

### 4.8 MÓDULO DE RH (PROFISSIONAIS)

#### 4.8.1 Profissionais

- Cadastro completo
- Especialidades/profissões
- Horários de trabalho
- Disponibilidades
- Foto

**Entidades:** `Professional`, `ProfessionalSpecialty`, `ProfessionalSchedule`

#### 4.8.2 Cálculo de Comissões

- Cálculo automático por venda/serviço
- Regras configuráveis por profissional
- Regras por serviço ou grupo de produto
- Histórico de comissões

**Entidades:** `Commission`, `CommissionCalculation`

#### 4.8.3 Regras de Comissão

- Percentuais por profissional
- Percentuais por serviço
- Percentuais por grupo de produto
- Regras progressivas

**Entidades:** `CommissionRule`, `CommissionRuleService`, `CommissionRuleProductGroup`

#### 4.8.4 Folgas

- Agendamento de folgas
- Bloqueio de agenda
- Histórico

**Entidades:** `TimeOff`

#### 4.8.5 Profissões

- Cadastro de especialidades veterinárias

---

### 4.9 MÓDULO DE RELATÓRIOS

| Relatório                     | Descrição                              |
| ----------------------------- | -------------------------------------- |
| DRE                           | Demonstração de Resultado do Exercício |
| Contas Recebidas              | Relatório de recebimentos              |
| Contas Pagas                  | Relatório de pagamentos                |
| Comandas/Vendas               | Relatório de vendas e comandas         |
| Produtos/Serviços Produzidos  | Relatório de produção                  |
| Produção                      | Relatório geral de produção            |
| Atendimento por Profissional  | Performance de profissionais           |
| NF de Serviços Prestados      | Notas fiscais de serviço               |
| Fornecedores                  | Cadastro de fornecedores               |
| Exclusão de Vendas e Comandas | Auditoria de exclusões                 |
| Estoque                       | Posição de estoque                     |
| Movimentações no Estoque      | Histórico de movimentações             |
| Entrada de NF                 | Notas fiscais de entrada               |
| Curva ABC Clientes            | Classificação por faturamento          |
| Curva ABC Produtos            | Classificação por importância          |
| Dashboard Multifilial         | Visão consolidada de filiais           |

**Entidades:** `Report`, `ReportFilter`, `ReportExport`

---

### 4.10 MÓDULO DE ADMINISTRAÇÃO

#### 4.10.1 Usuários

- Cadastro de usuários
- Perfis de acesso
- Senhas com política de segurança
- Login com 3 fatores (ID Vetus + Usuário + Senha)
- Sessão com expiração configurável

**Entidades:** `User`, `UserProfile`, `UserSession`

#### 4.10.2 Grupos de Acesso

- Criação de grupos
- Permissões por rotina (Consultar, Inserir, Alterar, Excluir)
- Vinculação de usuários a grupos

**Entidades:** `AccessGroup`, `AccessGroupPermission`, `AccessGroupRoutine`

#### 4.10.3 Configurações do Sistema

- Dados da empresa
- Logo
- Configurações de email
- Configurações de SMS
- Configurações de pagamento
- Integrações

---

### 4.11 MÓDULO DE DASHBOARDS

#### 4.11.1 Dashboard Principal

- Animais ativos
- Aniversariantes do dia/mês
- Notificações
- Saldo em contas (gráfico pizza)
- Ticket médio por profissional
- Lembretes

#### 4.11.2 Dashboard Financeiro

- Receitas do período
- Despesas do período
- Saldo
- Projeção
- Gráficos de tendência

#### 4.11.3 Dashboard Multifilial

- Visão consolidada de todas as filiais
- Comparativo entre filiais
- Ranking de desempenho

---

## 5. MODELO DE DADOS

### 5.1 Diagrama Entidade-Relacionamento (Resumo)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Tenant    │────<│  Company    │────<│   Branch    │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ├────< ┌─────────────┐     ┌─────────────┐
       │      │   User      │────<│AccessGroup  │
       │      └─────────────┘     └─────────────┘
       │
       ├────< ┌─────────────┐     ┌─────────────┐
       │      │   Client    │────<│   Animal    │
       │      └─────────────┘     └─────────────┘
       │            │                    │
       │            │              ┌─────▼─────────┐
       │            │              │MedicalRecord  │
       │            │              └───────────────┘
       │            │
       │      ┌─────▼─────────┐
       │      │   Command     │────<│ CommandItem  │
       │      └───────────────┘     └──────────────┘
       │            │
       │      ┌─────▼─────────┐
       │      │     Sale      │────<│  SaleItem    │
       │      └───────────────┘     └──────────────┘
       │
       ├────< ┌─────────────┐     ┌─────────────┐
       │      │  Product    │────<│ProductStock │
       │      └─────────────┘     └─────────────┘
       │            │
       │      ┌─────▼─────────┐
       │      │StockTransaction│
       │      └───────────────┘
       │
       ├────< ┌─────────────┐     ┌─────────────┐
       │      │  Schedule   │────<│Professional │
       │      └─────────────┘     └─────────────┘
       │
       ├────< ┌─────────────┐     ┌─────────────┐
       │      │AccountRec.  │     │AccountPay.  │
       │      └─────────────┘     └─────────────┘
       │
       ├────< ┌─────────────┐     ┌─────────────┐
       │      │   Exam      │────<│ ExamResult  │
       │      └─────────────┘     └─────────────┘
       │
       ├────< ┌─────────────┐
       │      │  Hospitaliz.│
       │      └─────────────┘
       │
       ├────< ┌─────────────┐     ┌─────────────┐
       │      │ Commission  │────<│CommRule     │
       │      └─────────────┘     └─────────────┘
       │
       └────< ┌─────────────┐
              │    Report   │
              └─────────────┘
```

### 5.2 Tabelas Principais (Estimativa: 200+ tabelas)

| Categoria   | Tabelas                                                                                                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core        | `tenants`, `companies`, `branches`, `settings`                                                                                                                                                                              |
| Usuários    | `users`, `access_groups`, `group_permissions`, `sessions`, `audit_logs`                                                                                                                                                     |
| Clientes    | `clients`, `client_addresses`, `client_contacts`, `client_groups`, `client_details`                                                                                                                                         |
| Animais     | `animals`, `animal_photos`, `medical_records`, `vaccines`, `dewormings`                                                                                                                                                     |
| Atendimento | `schedules`, `schedule_markers`, `commands`, `command_items`, `command_payments`, `quotes`, `quote_items`, `packages`, `package_sessions`                                                                                   |
| Esteira     | `pipeline_stages`, `pipeline_cards`, `pipeline_transitions`                                                                                                                                                                 |
| Internação  | `hospitalizations`, `hospitalization_boxes`, `hospitalization_events`, `hospitalization_medications`                                                                                                                        |
| Produtos    | `products`, `product_barcodes`, `product_stocks`, `product_batches`, `product_prices`, `product_groups`, `manufacturers`, `measurement_units`                                                                               |
| Estoque     | `stock_transactions`, `stock_transaction_items`, `invoice_entries`, `invoice_items`, `purchase_orders`, `stock_transfers`, `stock_audits`                                                                                   |
| Financeiro  | `accounts_receivable`, `accounts_payable`, `cash_registers`, `cash_transactions`, `card_transactions`, `card_machines`, `payment_methods`, `cost_centers`, `checks`, `bank_accounts`, `split_configs`, `split_participants` |
| Fiscal      | `tax_icms`, `tax_ipi`, `tax_pis`, `tax_cofins`, `tax_cfop`, `tax_nfs`, `tax_ibs_cbs`                                                                                                                                        |
| Laboratório | `exam_types`, `exams`, `exam_results`, `exam_reference_values`, `reports`, `report_items`, `report_photos`, `lab_equipment`                                                                                                 |
| RH          | `professionals`, `professional_schedules`, `commissions`, `commission_rules`, `time_off`, `professions`                                                                                                                     |
| Marketing   | `sms_messages`, `sms_campaigns`, `email_templates`, `sms_configs`                                                                                                                                                           |
| Fidelidade  | `loyalty_points`, `loyalty_redemptions`, `loyalty_programs`                                                                                                                                                                 |
| Relatórios  | `report_definitions`, `report_exports`                                                                                                                                                                                      |
| Integrações | `webhooks`, `webhook_events`, `integration_logs`                                                                                                                                                                            |

---

## 6. APIS E INTEGRAÇÕES

### 6.1 API RESTful

**Padrão:**

```
https://api.{domain}.com/api/v1/{resource}
```

**Autenticação:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Headers padrão:**

```
Content-Type: application/json
Accept: application/json
X-Tenant-ID: {tenant_id}
X-Request-ID: {uuid}
```

**Paginação:**

```
GET /api/v1/products?page=0&size=20&query=search
```

**Resposta padrão:**

```json
{
  "data": [],
  "meta": {
    "page": 0,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8
  },
  "links": {
    "self": "/api/v1/products?page=0&size=20",
    "next": "/api/v1/products?page=1&size=20"
  }
}
```

### 6.2 Integrações Externas

| Integração               | Tipo      | Descrição                       |
| ------------------------ | --------- | ------------------------------- |
| Live Pet                 | OAuth2    | Sistema auxiliar de atendimento |
| Live Lab                 | OAuth2    | Sistema auxiliar de laboratório |
| Stone                    | REST API  | Gateway de pagamento + Split    |
| SMS Gateway              | REST API  | Envio de SMS (Zenvia, Twilio)   |
| SEFAZ                    | SOAP/REST | Emissão de NF-e, NFC-e, NFS-e   |
| Correios                 | REST API  | Cálculo de frete                |
| Google Calendar          | OAuth2    | Sincronização de agenda         |
| WhatsApp Business        | API       | Notificações via WhatsApp       |
| Email (SendGrid/AWS SES) | REST API  | Envio de emails                 |
| SoluCX                   | REST API  | Pesquisa de satisfação (NPS)    |

### 6.3 Webhooks

```json
{
  "id": "wh_123",
  "url": "https://cliente.com/webhook",
  "events": ["sale.created", "command.finalized", "appointment.reminder"],
  "secret": "whsec_***",
  "active": true
}
```

**Eventos disponíveis:**

- `client.created`, `client.updated`
- `animal.created`, `animal.updated`
- `appointment.created`, `appointment.reminder`, `appointment.cancelled`
- `command.opened`, `command.finalized`
- `sale.created`, `sale.cancelled`
- `stock.low`, `stock.expired`
- `payment.received`, `payment.overdue`
- `exam.completed`, `report.issued`

---

## 7. SEGURANÇA

### 7.1 Autenticação

- **JWT** com expiração configurável (padrão: 10 minutos)
- **Refresh Token** com expiração de 7 dias
- **3 fatores de login:** ID Vetus + Usuário + Senha
- **Rate limiting** por IP e usuário
- **Bloqueio após 5 tentativas** falhas

### 7.2 Autorização

- **RBAC** (Role-Based Access Control)
- **Permissões por rotina:** Consultar, Inserir, Alterar, Excluir
- **Grupos de acesso** hierárquicos
- **Permissões granulares** por módulo e funcionalidade

### 7.3 Proteção de Dados

- **TLS 1.3** em todas as comunicações
- **Criptografia AES-256** para dados sensíveis
- **Hash BCrypt** para senhas
- **Mascaramento** de CPF/CNPJ em logs
- **LGPD** compliance completo
- **Anonimização** de dados para testes

### 7.4 Auditoria

- **Audit log** de todas as operações (criação, edição, exclusão)
- **Log de acesso** com IP, user-agent, timestamp
- **Log de exclusões** com motivo obrigatório
- **Trilha de auditoria** imutável

### 7.5 Infraestrutura

- **WAF** (Web Application Firewall)
- **DDoS protection**
- **Cloudflare** como CDN e proteção
- **Secrets management** (HashiCorp Vault)
- **Backup automático** com retenção de 30 dias
- **Disaster Recovery** com RPO < 1h e RTO < 4h

---

## 8. INFRAESTRUTURA

### 8.1 Ambientes

| Ambiente    | URL                  | Finalidade            |
| ----------- | -------------------- | --------------------- |
| Development | localhost            | Desenvolvimento local |
| Staging     | staging.{domain}.com | Testes e homologação  |
| Production  | {domain}.com         | Produção              |

### 8.2 Recursos (Produção)

| Recurso       | Especificação                              |
| ------------- | ------------------------------------------ |
| API Gateway   | 2x c5.xlarge (4 vCPU, 8GB)                 |
| Microserviços | 3-10 pods por serviço (EKS)                |
| PostgreSQL    | RDS db.r6g.xlarge (4 vCPU, 32GB)           |
| Redis         | ElastiCache cache.r6g.large (2 vCPU, 13GB) |
| RabbitMQ      | 3x m5.large (cluster)                      |
| Elasticsearch | 3x m5.xlarge (cluster)                     |
| MinIO         | 4x m5.xlarge (erasure coding)              |
| Storage       | 500GB+ (escalável)                         |

### 8.3 CI/CD

```
Developer → Push → GitHub Actions → Testes → Build → Docker → Registry → Deploy (Staging) → QA → Deploy (Production)
```

**Pipeline:**

1. **Lint** → ESLint, Prettier
2. **Testes Unitários** → Vitest, Jest
3. **Testes de Integração** → Supertest
4. **Testes E2E** → Playwright
5. **Análise de Código** → SonarQube
6. **Build** → Docker image
7. **Scan de Segurança** → Trivy, Snyk
8. **Deploy Staging** → Kubernetes
9. **Testes Automatizados Staging**
10. **Deploy Production** → Blue/Green

### 8.4 Monitoramento

- **Prometheus** → Métricas de sistema
- **Grafana** → Dashboards de monitoramento
- **AlertManager** → Alertas (Slack, Email, PagerDuty)
- **ELK Stack** → Centralização de logs
- **Sentry** → Error tracking
- **Hotjar/Clarity** → Analytics de UX
- **Uptime Kuma** → Monitoramento de disponibilidade

---

## 9. ROADMAP DE IMPLEMENTAÇÃO

### Fase 1 — Fundação (Meses 1-2)

| Sprint     | Entregas                                                                     |
| ---------- | ---------------------------------------------------------------------------- |
| Sprint 1-2 | Setup de infraestrutura, CI/CD, repositórios, design system                  |
| Sprint 3-4 | Serviço de autenticação, multi-tenant, gestão de usuários e grupos de acesso |
| Sprint 5-6 | Cadastros básicos: Clientes, Animais, Raças, Espécies, Cores                 |
| Sprint 7-8 | Dashboard principal, notificações, aniversariantes                           |

**Entregáveis:**

- [ ] Infraestrutura base (K8s, DB, Redis, RabbitMQ)
- [ ] Pipeline CI/CD
- [ ] Design system completo
- [ ] Auth Service com JWT
- [ ] Multi-tenant architecture
- [ ] CRUD de Clientes e Animais
- [ ] Dashboard inicial
- [ ] Sistema de notificações

### Fase 2 — Atendimento (Meses 3-4)

| Sprint       | Entregas                                                 |
| ------------ | -------------------------------------------------------- |
| Sprint 9-10  | Agenda completa com marcadores, disponibilidades, folgas |
| Sprint 11-12 | Comandas com itens, descontos, finalização               |
| Sprint 13-14 | Vendas (PDV), Pacotes, Orçamentos                        |
| Sprint 15-16 | Esteira de atendimento, Esteira de exames                |

**Entregáveis:**

- [ ] Agenda Service
- [ ] Command Service
- [ ] Sale Service (PDV)
- [ ] Package Service
- [ ] Quote Service
- [ ] Pipeline Service (Esteira)
- [ ] Frontend completo de atendimento

### Fase 3 — Estoque e Produtos (Meses 5-6)

| Sprint       | Entregas                                            |
| ------------ | --------------------------------------------------- |
| Sprint 17-18 | Cadastro de produtos, grupos, fabricantes, unidades |
| Sprint 19-20 | Controle de estoque, transações, múltiplos estoques |
| Sprint 21-22 | Entrada de NF, compras, transferências              |
| Sprint 23-24 | Validade, auditoria, reajuste de preços, coletores  |

**Entregáveis:**

- [ ] Product Service
- [ ] Stock Service
- [ ] Purchase Service
- [ ] Invoice Service
- [ ] Audit Service
- [ ] Frontend completo de estoque

### Fase 4 — Financeiro (Meses 7-8)

| Sprint       | Entregas                                              |
| ------------ | ----------------------------------------------------- |
| Sprint 25-26 | Contas a receber, contas a pagar, gaveta              |
| Sprint 27-28 | Split de pagamento, transações de cartão, maquininhas |
| Sprint 29-30 | Fluxo de caixa, dashboard financeiro, linha do tempo  |
| Sprint 31-32 | Centros de custo, custos e despesas, bancos, cheques  |

**Entregáveis:**

- [ ] Financial Service
- [ ] Split Service
- [ ] Card Service
- [ ] Cash Register Service
- [ ] Dashboard Financeiro
- [ ] Integração com gateway de pagamento

### Fase 5 — Laboratório (Meses 9-10)

| Sprint       | Entregas                                            |
| ------------ | --------------------------------------------------- |
| Sprint 33-34 | Cadastro de exames, tipos de laudo, equipamentos    |
| Sprint 35-36 | Hemograma, urina, bioquímico, valores de referência |
| Sprint 37-38 | Laudos com documentação fotográfica                 |
| Sprint 39-40 | Integração com Live Lab, esteira de exames          |

**Entregáveis:**

- [ ] Lab Service
- [ ] Exam Service
- [ ] Report Service
- [ ] Equipment Service
- [ ] Integração Live Lab

### Fase 6 — Fiscal e RH (Meses 11-12)

| Sprint       | Entregas                                              |
| ------------ | ----------------------------------------------------- |
| Sprint 41-42 | Tabelas fiscais (ICMS, IPI, PIS, COFINS, CFOP, NFS-e) |
| Sprint 43-44 | Profissionais, comissões, regras de comissão          |
| Sprint 45-46 | Cálculo de comissões, folgas, profissões              |
| Sprint 47-48 | Emissão de NF-e, NFC-e, NFS-e                         |

**Entregáveis:**

- [ ] Tax Service
- [ ] HR Service
- [ ] Commission Service
- [ ] Invoice Emission Service (NF-e)

### Fase 7 — Marketing, Relatórios e Finalização (Meses 13-14)

| Sprint       | Entregas                                     |
| ------------ | -------------------------------------------- |
| Sprint 49-50 | SMS, campanhas, email de vacina              |
| Sprint 51-52 | Todos os relatórios, exportações             |
| Sprint 53-54 | Programa de fidelidade, webhooks             |
| Sprint 55-56 | Dashboard multifilial, testes finais, deploy |

**Entregáveis:**

- [ ] Marketing Service
- [ ] Report Service
- [ ] Loyalty Service
- [ ] Webhook Service
- [ ] Multi-branch Dashboard
- [ ] Testes de carga e segurança
- [ ] Documentação completa
- [ ] Deploy em produção

---

## 10. EQUIPE E ESTIMATIVAS

### 10.1 Equipe Necessária

| Função                       | Quantidade | Alocação  |
| ---------------------------- | ---------- | --------- |
| Tech Lead / Arquiteto        | 1          | Full-time |
| Backend Developers (NestJS)  | 3-4        | Full-time |
| Frontend Developers (Vue.js) | 3-4        | Full-time |
| DevOps Engineer              | 1          | Full-time |
| QA Engineer                  | 2          | Full-time |
| UI/UX Designer               | 1          | Part-time |
| Product Owner                | 1          | Part-time |
| Scrum Master                 | 1          | Part-time |

**Total:** 12-15 pessoas

### 10.2 Estimativa de Esforço

| Fase                 | Meses  | Story Points | Custo Estimado   |
| -------------------- | ------ | ------------ | ---------------- |
| Fase 1 — Fundação    | 2      | 200          | R$ 200.000       |
| Fase 2 — Atendimento | 2      | 300          | R$ 300.000       |
| Fase 3 — Estoque     | 2      | 350          | R$ 350.000       |
| Fase 4 — Financeiro  | 2      | 400          | R$ 400.000       |
| Fase 5 — Laboratório | 2      | 300          | R$ 300.000       |
| Fase 6 — Fiscal e RH | 2      | 300          | R$ 300.000       |
| Fase 7 — Finalização | 2      | 250          | R$ 250.000       |
| **TOTAL**            | **14** | **2.100**    | **R$ 2.100.000** |

### 10.3 Métricas de Sucesso

| Métrica                        | Meta         |
| ------------------------------ | ------------ |
| Uptime                         | 99.9%        |
| Tempo de resposta (p95)        | < 500ms      |
| Cobertura de testes            | > 80%        |
| Bugs críticos em produção      | 0            |
| Satisfação do usuário (NPS)    | > 70         |
| Tempo de deploy                | < 15 minutos |
| RPO (Recovery Point Objective) | < 1 hora     |
| RTO (Recovery Time Objective)  | < 4 horas    |

---

## 11. DESIGN SYSTEM

### 11.1 Paleta de Cores

| Token                     | Valor     | Uso                    |
| ------------------------- | --------- | ---------------------- |
| `--primary-color`         | `#f19436` | Cor primária (laranja) |
| `--primary-pumpkin-light` | `#ffedda` | Fundo primário claro   |
| `--surface-a`             | `#fff`    | Superfície principal   |
| `--surface-b`             | `#efefef` | Superfície secundária  |
| `--surface-c`             | `#e9ecef` | Superfície terciária   |
| `--surface-d`             | `#dee2e6` | Bordas                 |
| `--text-color`            | `#212529` | Texto principal        |
| `--text-color-secondary`  | `#6c757d` | Texto secundário       |
| `--badges-orange-light`   | `#fff4de` | Fundo de badges        |

### 11.2 Tipografia

- **Font Family:** Open Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto
- **Pesos:** 400 (Regular), 600 (Semibold), 700 (Bold)

### 11.3 Componentes UI

| Componente   | Biblioteca                          |
| ------------ | ----------------------------------- |
| Botões       | PrimeVue `Button`                   |
| Inputs       | PrimeVue `InputText`, `InputNumber` |
| Dropdowns    | PrimeVue `Dropdown`                 |
| Tabelas      | PrimeVue `DataTable`                |
| Diálogos     | PrimeVue `Dialog`                   |
| Notificações | PrimeVue `Toast`                    |
| Checkboxes   | PrimeVue `Checkbox`                 |
| Calendários  | PrimeVue `Calendar`                 |
| Paginação    | PrimeVue `Paginator`                |
| Cards        | PrimeVue `Card`                     |
| Abas         | PrimeVue `TabView`                  |
| Gráficos     | Chart.js / ECharts                  |

---

## 12. FLUXOS DE TRABALHO PRINCIPAIS

### Fluxo 1: Atendimento Completo

```
Cliente chega → Cadastro (se novo)
  → Animal cadastrado (vinculado ao cliente)
    → Agendamento na Agenda
      → Comanda aberta
        → Serviços/Produtos adicionados
          → Finalização (pagamento)
            → Baixa no Financeiro
              → Atualização do Estoque
                → Cálculo de Comissão
```

### Fluxo 2: Laboratório

```
Requisição de exame
  → Esteira de Exames
    → Coleta de material
      → Registro de resultados (Hemograma/Urina/Bioquímico)
        → Emissão de Laudo
          → Entrega ao cliente
```

### Fluxo 3: Estoque

```
Pedido de Compra
  → Entrada de Nota Fiscal
    → Produtos no Estoque
      → Requisição à Farmácia (quando necessário)
        → Venda/Consumo
          → Transação no Estoque
            → Auditoria
```

### Fluxo 4: Financeiro

```
Venda/Comanda finalizada
  → Contas a Receber
    → Recebimento (Dinheiro/Cartão/Pix)
      → Gaveta (caixa)
        → Fluxo de Caixa atualizado
          → Split de pagamento
            → DRE
```

---

## 13. CONVENÇÕES DE DESENVOLVIMENTO

### 13.1 Git Flow

```
main → production
develop → staging
feature/* → novas funcionalidades
hotfix/* → correções urgentes
release/* → preparação de release
```

### 13.2 Commits (Conventional Commits)

```
feat: add split payment configuration
fix: resolve stock calculation on invoice entry
docs: update API documentation
test: add unit tests for command service
refactor: extract validation logic to shared module
chore: update dependencies
```

### 13.3 Padrão de Nomenclatura

| Entidade           | Padrão     | Exemplo                       |
| ------------------ | ---------- | ----------------------------- |
| Banco de dados     | snake_case | `accounts_receivable`         |
| API endpoints      | kebab-case | `/api/v1/accounts-receivable` |
| Variáveis JS/TS    | camelCase  | `totalAmount`                 |
| Componentes Vue    | PascalCase | `CommandList.vue`             |
| Classes TypeScript | PascalCase | `CommandService`              |
| Arquivos de teste  | \*.spec.ts | `command.service.spec.ts`     |

---

## 14. RISCOS E MITIGAÇÃO

| Risco                                | Probabilidade | Impacto | Mitigação                                            |
| ------------------------------------ | ------------- | ------- | ---------------------------------------------------- |
| Migração de dados do sistema legado  | Alta          | Alto    | Scripts de migração automatizados + validação manual |
| Complexidade do módulo fiscal        | Alta          | Alto    | Consultoria com contador especializado               |
| Integração com gateways de pagamento | Média         | Alto    | Sandbox de testes extensivo                          |
| Performance com múltiplos tenants    | Média         | Médio   | Sharding de banco, cache agressivo                   |
| Adoção pelos usuários                | Média         | Médio   | UX research, treinamentos, feedback contínuo         |
| Mudanças na legislação fiscal        | Alta          | Médio   | Módulo fiscal configurável e atualizável             |
| Segurança de dados sensíveis         | Baixa         | Alto    | Pentest regular, criptografia, auditoria             |

---

## 15. PRÓXIMOS PASSOS

1. **Validar este planejamento** com stakeholders
2. **Definir MVP** (Mínimo Produto Viável) — sugerido: Fases 1-3
3. **Contratar equipe** ou alocar recursos
4. **Setup de infraestrutura** (Fase 1, Sprint 1)
5. **Iniciar desenvolvimento** com sprints de 2 semanas
6. **Revisões quinzenais** de progresso
7. **Demo mensal** para stakeholders

---

_Documento criado em 02/04/2026 — Baseado na análise completa do sistema Vetus ERP (107 páginas, 292 APIs, 109 itens de menu)_
