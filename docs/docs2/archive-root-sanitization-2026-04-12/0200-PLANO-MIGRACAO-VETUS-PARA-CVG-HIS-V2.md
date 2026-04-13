# Plano de Migração: Vetus ERP → CVG-HIS-V2

> **Objetivo:** Replicar a lógica de navegação e funcionalidade do ERP Veterinário Vetus no sistema CVG-HIS-V2, usando agentes de IA para execução paralela.
>
> **Data:** 2026-04-11
> **Status:** Planejamento

---

## 1. DIAGNÓSTICO ATUAL

### 1.1 O que existe no CVG-HIS-V2 (atual)

| Módulo | Funcionalidades |
|--------|----------------|
| **Início** | Dashboard |
| **Cadastro** | Tutores, Pacientes |
| **Operação** | Agendamentos, Agenda Operacional, Fila, Atendimentos, Prontuário |
| **Assistencial** | Triagem, Diagnósticos, Prescrições, Execuções, Internação, Mapa de Leitos, Setores, Leitos, Cirurgias, Altas |
| **Comercial** | Faturamento, Caixa, PIX, Vendas (Balcão), Orçamentos, Relatórios |
| **Estoque** | Estoque, Produtos, Serviços |
| **Plataforma** | Usuários, Equipe, Notificações, WhatsApp, Chaves API, Webhooks, Cliente API |
| **Governança** | Controle de Acesso, Auditoria |

### 1.2 Funcionalidades FALTANDO (comparado com Vetus)

| Módulo | Funcionalidade | Prioridade | Complexidade |
|--------|---------------|------------|--------------|
| **Laboratório** | Exames (Criação, Ordem) | 🔴 Alta | Alta |
| **Laboratório** | Laudos | 🔴 Alta | Alta |
| **Laboratório** | Hemogramas | 🔴 Alta | Média |
| **Laboratório** | Bioquímico | 🔴 Alta | Média |
| **Laboratório** | Urina (EAS) | 🔴 Alta | Média |
| **Laboratório** | Equipamentos | 🟡 Média | Baixa |
| **Laboratório** | Tipos de Laudo | 🟡 Média | Baixa |
| **Laboratório** | Valores de Referência | 🟡 Média | Média |
| **Financeiro** | Contas a Receber | 🔴 Alta | Alta |
| **Financeiro** | Contas a Pagar | 🔴 Alta | Alta |
| **Financeiro** | Fluxo de Caixa | 🔴 Alta | Alta |
| **Financeiro** | Gaveta/Dinheiro | 🔴 Alta | Média |
| **Financeiro** | Cartões (Débito/Crédito) | 🔴 Alta | Média |
| **Financeiro** | Cheques | 🟡 Média | Média |
| **Financeiro** | Bancos | 🟡 Média | Baixa |
| **Financeiro** | Centros de Custo | 🟡 Média | Média |
| **Financeiro** | Formas de Pagamento | 🟡 Média | Baixa |
| **Marketing** | Campanhas SMS | 🟡 Média | Alta |
| **Comissões** | Cálculo de Comissões | 🟡 Média | Alta |
| **Profissionais** | Profissões | 🟢 Baixa | Baixa |
| **Profissionais** | Folgas | 🟢 Baixa | Média |
| **Relatórios** | DRE | 🔴 Alta | Alta |
| **Relatórios** | Produção por Profissional | 🔴 Alta | Alta |
| **Relatórios** | Contas Recebidas/Pagas | 🔴 Alta | Média |
| **Fiscais** | Tabela ICMS | 🟢 Baixa | Baixa |
| **Fiscais** | Tabela CFOP | 🟢 Baixa | Baixa |
| **Fiscais** | NFS-e | 🟡 Média | Alta |

---

## 2. ESTRATÉGIA DE EXECUÇÃO

### 2.1 Abordagem

Usar **agentes de IA (Codex/Claude Code)** trabalhando em **tarefas paralelas** para acelerar a construção.

**Filosofia:**
- Agentes focados em módulos específicos
- Build incremental com testes
- Revisão de código antes de merge

### 2.2 Fases de Execução

```
FASE 1: Infraestrutura e Base (Semana 1)
├── 1.1 Criar schema de Banco para Laboratório
├── 1.2 Criar schema de Banco para Financeiro  
├── 1.3 Criar schema de Banco para Comissões
├── 1.4 Definir tipos/roteiros de exames
└── 1.5 Setup de notificação interna

FASE 2: Laboratório (Semana 2)
├── 2.1 Módulo de Exames (CRUD completo)
├── 2.2 Módulo de Laudos
├── 2.3 Templates de Laudos
├── 2.4 Resultados de Hemograma
├── 2.5 Resultados de Bioquímico
└── 2.6 Integração com equipamentos

FASE 3: Financeiro Core (Semana 3)
├── 3.1 Plano de Contas
├── 3.2 Centro de Custo
├── 3.3 Contas a Pagar
├── 3.4 Contas a Receber
└── 3.5 Operações de Caixa

FASE 4: Financeiro Avançado + Comissões (Semana 4)
├── 4.1 Máquinas de Cartão
├── 4.2 Integração PIX/Gateway
├── 4.3 Fluxo de Caixa
├── 4.4 Cálculo de Comissões
└── 4.5 DRE e Relatórios

FASE 5: Marketing + Relatórios + Fiscais (Semana 5)
├── 5.1 Campanhas SMS
├── 5.2 Relatório DRE
├── 5.3 Relatório Produção
├── 5.4 NFS-e (se aplicável)
└── 5.5 Tabelas Fiscais
```

---

## 3. MAPEAMENTO DETALHADO DE MÓDULOS

### 3.1 LABORATÓRIO

| Funcionalidade Vetus | Descrição | Dependências | Notas |
|---------------------|-----------|--------------|-------|
| Exames | Ordem de serviço laboratorial | Cadastro de serviços, Pacientes | Similar a prescrição mas com fluxo laboratorial |
| Laudos | Documento assinado por profissional | Templates, Profissionais | Requer assinatura digital |
| Hemogramas | Resultado tabular com valores referência | Equipamentos, Valores de Referência | 18 campos aproximadamente |
| Bioquímico | Resultado tabular | Equipamentos, Valores de Referência | 12-15 campos |
| Urina (EAS) | Análisis de Urina | Valores de Referência | Macroscópico + Microscópico |
| Equipamentos | Cadastro de equipamentos | - | Basicamente CRUD |
| Tipos de Laudo | Templates de laudo | - | Define campos por tipo |
| Vlr. Referência | Tabela de valores normais | Espécie, Parâmetro | Por espécie animal |

**Roteiro de Implementação:**
1. `packages/modules/laboratory/src/` - Módulo compartido
2. `apps/api/src/modules/laboratory/` - Endpoints
3. `apps/spa/src/pages/laboratory/` - Páginas
4. `packages/types/src/laboratory.ts` - Tipos

### 3.2 FINANCEIRO

| Funcionalidade Vetus | Descrição | Dependências | Notas |
|---------------------|-----------|--------------|-------|
| Gaveta | Controle de dinheiro físico | Operador, Data | Abertura/Fecha |
| Contas a Pagar | Fornecedores + Despesas | Fornecedores, Centro de Custo | Vencimento, Status |
| Contas a Receber | Cliente + Faturas | Clientes, Serviços | Boleto, Cartão |
| Fluxo de Caixa | Entradas e saídas projetadas | Contas, Lançamentos | Timeline |
| Cartões | Transações de máquina | Maquininhas, Bandeira | Taxa %, prazo |
| Cheques | Títulos pré-datados | Clientes, Bancos | Status: compensado/devolvido |
| Bancos | Cadastro de bancos | - | Número banco, agência |
| Centros de Custo | Categoria de custo | - | Hierarchy |
| Formas de Pagamento | Dinheiro, Pix, Cartão, Cheque | - | Ativas por loja |

**Roteiro de Implementação:**
1. `packages/modules/financial/src/` - Módulo compartido
2. `apps/api/src/modules/financial/` - Endpoints
3. `apps/spa/src/pages/financial/` - Páginas
4. `apps/spa/src/pages/billing/` - Extender existente

### 3.3 COMISSÕES

| Funcionalidade | Descrição |
|----------------|-----------|
| Regras de Comissão | % por profissional, serviço, categoria |
| Cálculo de Comissão | Job periódico ou sob demanda |
| Folha de Comissão | Resumo por período |

### 3.4 MARKETING

| Funcionalidade | Descrição |
|----------------|-----------|
| Campanhas SMS | Lista de clientes, modelo de texto |
| Configuração SMS | API Gateway (ex: Zenvia, TotalVoice) |

### 3.5 RELATÓRIOS

| Relatório | Descrição |
|-----------|-----------|
| DRE | Demonstrativo de Resultados |
| Produção | Por profissional, período |
| Contas | Recebidas e Pagas |

---

## 4. ESTRUTURA DE PASTAS PROPOSTA

```
cvg-his-v2/
├── apps/
│   ├── spa/
│   │   └── src/
│   │       └── pages/
│   │           ├── laboratory/          # NOVO
│   │           │   ├── ExamsPage.vue
│   │           │   ├── ExamFormPage.vue
│   │           │   ├── ExamResultPage.vue
│   │           │   ├── ReportsPage.vue
│   │           │   ├── LaudosPage.vue
│   │           │   └── LaudoTemplatePage.vue
│   │           ├── financial/           # NOVO (expandir)
│   │           │   ├── AccountsPayablePage.vue
│   │           │   ├── AccountsReceivablePage.vue
│   │           │   ├── CashFlowPage.vue
│   │           │   ├── DrawerPage.vue
│   │           │   └── CardsPage.vue
│   │           └── reports/            # NOVO
│   │               ├── DREPage.vue
│   │               ├── ProductionPage.vue
│   │               └── FinancialPage.vue
│   └── api/
│       └── src/
│           └── modules/
│               ├── laboratory/         # NOVO
│               │   ├── exams/
│               │   ├── laudos/
│               │   ├── results/
│               │   └── equipment/
│               ├── financial/          # NOVO
│               │   ├── accounts-payable/
│               │   ├── accounts-receivable/
│               │   ├── cash-flow/
│               │   └── drawer/
│               └── commissions/        # NOVO
│
├── packages/
│   ├── modules/
│   │   ├── laboratory/                # NOVO
│   │   │   ├── src/
│   │   │   │   ├── exam.ts
│   │   │   │   ├── laudo.ts
│   │   │   │   ├── result.ts
│   │   │   │   └── equipment.ts
│   │   │   └── dist/
│   │   ├── financial/                # NOVO
│   │   │   ├── src/
│   │   │   │   ├── account.ts
│   │   │   │   ├── transaction.ts
│   │   │   │   └── payment.ts
│   │   │   └── dist/
│   │   └── commissions/              # NOVO
│   │       ├── src/
│   │       │   ├── commission.ts
│   │       │   └── rules.ts
│   │       └── dist/
│   └── types/
│       └── src/
│           ├── laboratory.ts         # NOVO
│           └── financial.ts          # NOVO
│
└── packages/
    └── db/
        └── src/
            └── migrations/
                ├── 017_laboratory.sql   # NOVO
                └── 018_financial.sql     # NOVO
```

---

## 5. TASKS PARA AGENTES

### Task 1: Infraestrutura de Laboratório
```
Descrição: Criar schema, tipos e módulo base de laboratório
Módulo: packages/modules/laboratory
Dependências: Nenhuma
Complexidade: Alta
Tempo estimado: 8h
```

### Task 2: CRUD de Exames
```
Descrição: Criar páginas e endpoints para gestão de exames
Módulo: apps/spa/pages/laboratory + apps/api/modules/laboratory
Dependências: Task 1
Complexidade: Alta
Tempo estimado: 12h
```

### Task 3: Sistema de Laudos
```
Descrição: Templates e geração de laudos
Módulo: apps/spa/pages/laboratory + apps/api/modules/laboratory
Dependências: Task 1, Task 2
Complexidade: Alta
Tempo estimado: 16h
```

### Task 4: Resultados (Hemograma/Bioquímico)
```
Descrição: Páginas de resultado tabular
Módulo: apps/spa/pages/laboratory + apps/api/modules/laboratory
Dependências: Task 1
Complexidade: Média
Tempo estimado: 8h
```

### Task 5: Infraestrutura Financeira
```
Descrição: Schema, tipos e módulo base financeiro
Módulo: packages/modules/financial
Dependências: Nenhuma
Complexidade: Alta
Tempo estimado: 8h
```

### Task 6: Contas a Pagar/Receber
```
Descrição: CRUD completo de contas
Módulo: apps/spa/pages/financial + apps/api/modules/financial
Dependências: Task 5
Complexidade: Alta
Tempo estimado: 12h
```

### Task 7: Fluxo de Caixa
```
Descrição: Dashboard de fluxo de caixa
Módulo: apps/spa/pages/financial
Dependências: Task 5, Task 6
Complexidade: Alta
Tempo estimado: 8h
```

### Task 8: Sistema de Comissões
```
Descrição: Regras e cálculo de comissão
Módulo: packages/modules/commissions + apps/api/modules/commissions
Dependências: Task 5
Complexidade: Alta
Tempo estimado: 12h
```

---

## 6. PRÓXIMOS PASSOS

1. **Revisar este documento** com stakeholders
2. **Confirmar prioridades** - quais módulos são mais críticos?
3. **Alocar recursos** - quantos agentes podem rodar em paralelo?
4. **Decidir formato de execução:**
   - Um agente por fase?
   - Múltiplos agentes em paralelo?
   - Revisão manual antes de merge?
5. **Iniciar execução** com Task 1

---

## 7. FATORES DE SUCESSO

- ✅ Mapeamento completo de funcionalidades
- ✅ Dependências identificadas
- ✅ Estimativas de tempo realistas
- ✅ Estrutura de código padronizada
- ✅ Testes incluídos em cada task
- ⏳ Revisão contínua do progresso
- ⏳ Validação com usuários finais
