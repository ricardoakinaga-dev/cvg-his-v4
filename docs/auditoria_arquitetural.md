# Auditoria Arquitetural: cvg_his

**Data:** 18/02/2026
**Auditor:** Antigravity (Google Deepmind)
**Escopo:** Arquitetura, Qualidade de Código, Escalabilidade, Prontidão SaaS

---

## 1. Resumo Executivo

O projeto `cvg_his` é um **monolito moderno bem arquitetado**, projetado com **multi-tenancy SaaS** e **governança clínica** como cidadãos de primeira classe.

A arquitetura segue um padrão de **Monolito Modular**, aproveitando uma estrutura de workspace pnpm para separar as preocupações entre a API, Workers em Background, Cliente Web e Bibliotecas de Domínio compartilhadas.

**Vereditos Chave:**
*   **Prontidão para Produção:** **Alta**. O sistema usa padrões robustos (idempotência, transações ACID, validação estrita) adequados para operações de saúde de missão crítica.
*   **Prontidão SaaS:** **Muito Alta**. A multi-tenancy está enraizada no esquema do banco de dados (`accountId`) e no contexto da API.
*   **Escalabilidade**: **Alta**. API stateless e Workers independentes permitem escalabilidade horizontal. O uso de `Fastify` e `Drizzle` garante baixo overhead.

---

## 2. Pontos Fortes da Arquitetura

### 2.1. Verdadeira Multi-Tenancy e Segurança
*   **Aplicação no Schema**: Entidades críticas (ex: `patients`, `protocols`) referenciam explicitamente `accountId`. Isso previne vazamento de dados no nível da query.
*   **API Context-Aware**: O `requestContextPlugin` e o middleware `requirePermission` garantem que cada requisição seja autenticada e autorizada antes de atingir a lógica de negócios.
*   **RBAC**: Sistema de permissões granulado (`requirePermission('patient.write')`) permite gerenciamento complexo de papéis hospitalares.

### 2.2. Governança de Protocolo Robusta (Motor Clínico)
*   **Versionamento Imutável**: O Motor de Protocolos usa um mecanismo sofisticado de "Snapshot & Hash" (`protocol_snapshots`, `protocol_versions`). Isso garante que, uma vez publicado, um protocolo é legalmente imutável — um requisito crítico para auditabilidade clínica.
*   **Idempotência**: O worker `protocolPublish` implementa lock distribuído via Redis para prevenir condições de corrida durante a publicação de versões.
*   **Integridade Transacional**: Gerenciamento manual de transações (`BEGIN` ... `COMMIT`) nos workers garante consistência de dados mesmo durante atualizações complexas em múltiplos estágios.

### 2.3. Tech Stack Moderna e Eficiente
*   **Fastify**: Escolhido em vez de Express/NestJS pela performance bruta.
*   **Drizzle ORM**: Fornece controle similar a SQL com type safety, evitando penalidades de performance de caixas pretas como Prisma.
*   **BullMQ & Redis**: A separação entre tarefas síncronas da API e jobs assíncronos (ex: publicação) está implementada corretamente.

### 2.4. Padrões de Código
*   **Validação Estrita**: Uso extensivo de `Zod` para validação em tempo de execução de inputs da API (`createPatientBodySchema`) e jobs dos Workers (`protocolPublishJobDataSchema`).
*   **Monolito Modular**: A divisão `apps/` e `packages/` permite reuso de código (ex: compartilhando uso de `db` e `domain`) sem a complexidade de microserviços.

---

## 3. Fraquezas e Riscos

### 3.1. Vazamento de Lógica de Negócios nos Workers
*   **Observação**: O arquivo `protocolPublish.worker.ts` contém ~300 linhas de lógica SQL complexa, queries cruas e regras de negócios.
*   **Risco**: A lógica está acoplada ao transporte do worker (BullMQ). Se você precisar "publicar" de forma síncrona ou via CLI, não poderá reutilizar essa lógica facilmente.
*   **Recomendação**: Extrair a "Lógica de Domínio de Publicação" para `packages/domain` ou um serviço em `his-api`, deixando o Worker responsável apenas pela *orquestração*.

### 3.2. Lacunas de Observabilidade
*   **Observação**: Logging está presente (`request.log`), mas não há evidência de **Tracing Distribuído** (OpenTelemetry) ou **APM** (Monitoramento de Performance de Aplicação).
*   **Risco**: Em um ambiente hospitalar distribuído, depurar "requisições lentas" que atravessam API -> Redis -> Worker -> DB será difícil sem propagação de contexto de trace.

### 3.3. Evolução do Schema do Banco de Dados
*   **Observação**: Colunas JSONB (`alertsJson`, `content_json`) são usadas para flexibilidade.
*   **Risco**: Embora útil para agilidade tipo NoSQL, dependência pesada de JSONB para dados clínicos centrais pode levar a gargalos de performance se filtragens complexas forem necessárias (ex: "Encontrar todos os pacientes com alergia X"). Índices Postgres GIN podem ajudar, mas tabelas estruturadas são mais seguras para queries de alto volume.

---

## 4. Recomendações Críticas de Refatoração

| Prioridade | Área | Recomendação | Esforço |
| :--- | :--- | :--- | :--- |
| **Alta** | **Lógica do Worker** | Extrair transações SQL de `protocolPublish.worker.ts` para um `ProtocolPublishingService` dentro de `packages/domain` ou `apps/his-api`. O worker deve chamar este serviço. | Médio |
| **Média** | **Observabilidade** | Implementar OpenTelemetry SDK. Garantir que `requestId` seja propagado da API para o Worker via dados do job BullMQ para rastrear requisições E2E. | Médio |
| **Média** | **Tratamento de Erros** | Padronizar classes de erro no monorepo (além de `NonRetryablePublishError`). Códigos de erro centralizados mapeiam para respostas HTTP 4xx/5xx automaticamente. | Baixo |
| **Baixa** | **Schema** | Revisar o uso de `alertsJson`. Se alertas específicos forem consultados frequentemente, promova-os para colunas de primeira classe ou uma tabela padronizada `patient_alerts`. | Baixo |

---

## 5. Roadmap de Escalabilidade a Longo Prazo

1.  **Fase 1: Escala Horizontal (Atual)**
    *   Deploy de múltiplas instâncias de `his-api` atrás de um load balancer.
    *   Deploy de instâncias isoladas de `his-worker` para diferentes prioridades de fila (ex: `high-priority` para alertas críticos, `low-priority` para relatórios).

2.  **Fase 2: Segmentação de Dados (Crescimento)**
    *   **Row-Level Security (RLS)**: Habilitar Postgres RLS passando o `current_tenant` para a sessão do DB para uma camada extra de segurança.
    *   **Read Replicas**: Configurar Drizzle para direcionar tráfego de leitura pesada (ex: `GET /patients`) para réplicas de leitura.

3.  **Fase 3: Microserviços (Alta Escala)**
    *   Os módulos atuais de `experiments` ou `protocols` são suficientemente desacoplados para serem extraídos em serviços independentes se a demanda de throughput exigir, interagindo via o Event Bus existente.

---

## 6. Pontuações

### Pontuação de Prontidão SaaS: **95/100**
*   **Por que**: Multi-tenancy é nativa, não uma adaptação. A arquitetura suporta isolamento e recursos compartilhados corretamente.

### Pontuação de Prontidão para Escala Hospitalar: **88/100**
*   **Por que**: Forte integridade de dados e auditoria. A única dedução é pela falta de observabilidade avançada (Tracing/APM) que é mandatória para gerenciar SLAs hospitalares complexos.
