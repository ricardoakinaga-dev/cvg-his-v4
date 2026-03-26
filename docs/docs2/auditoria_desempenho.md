# Auditoria de Performance e Escalabilidade: cvg_his

**Data:** 18/02/2026
**Auditor:** Antigravity (Google Deepmind)
**Escopo:** Latência, Throughput, Concorrência, Eficiência de Banco de Dados

---

## 1. Resumo Executivo

O sistema `cvg_his` está estruturado para **escalabilidade horizontal** (API stateless, Workers separados), mas os padrões atuais de configuração (Connection Pool, Concorrência de Worker) e **padrões síncronos** (Log de Auditoria) limitarão severamente o throughput sob carga.

**Prontidão de Escala:** **Média**. A arquitetura é sólida, mas a configuração precisa de ajustes para produção.
**Risco de Latência:** **Médio**. Auditoria de escrita síncrona adiciona overhead a cada mutação.

---

## 2. Análise de Gargalos

### 2.1. Crítico: Log de Auditoria Síncrono
*   **Achado**: Serviços como `EncountersService.create` executam `await repo.create()` seguido por **`await appendAudit()`**.
*   **Impacto**: Toda operação de escrita paga o custo de latência de *duas* capacidades (Transação DB + Auditoria DB). Se a tabela de Auditoria crescer muito (milhões de linhas), a latência de inserção degradará diretamente a performance da API.
*   **Correção**: Mover o Log de Auditoria para um barramento de eventos assíncrono (Fire-and-forget ou baseado em Fila).

### 2.2. Connection Pooling do Banco de Dados
*   **Achado**: `packages/db/src/connection.ts` inicializa `new Pool()` sem argumentos. Isso define o padrão de `max: 10` conexões por instância.
*   **Impacto**:
    *   **Muito Baixo**: Uma única instância de API lidando com requisições concorrentes bloqueará esperando por uma conexão DB.
    *   **Muito Alto (em escala)**: Se você escalar para 20 pods de API, abrirá 200 conexões. Sem um pooler externo (PgBouncer), isso cria overhead no Postgres.
*   **Correção**: Expor variável de ambiente `POSTGRES_MAX_CONNECTIONS` e configurar `Pool({ max: env.MAX })`. Usar PgBouncer para deploys de alta escala.

### 2.3. Ineficiência de Build Docker
*   **Achado**: `Dockerfile` copia `apps` e `packages` inteiramente e roda `pnpm install` em tempo de execução.
*   **Impacto**:
    *   **Cold Starts Lentos**: Tempo de inicialização do container é dominado por `pnpm install`.
    *   **Tamanho de Imagem Grande**: Inclui todas as devDependencies e código de workspace não relacionado.
*   **Correção**: Usar Docker Multi-Stage builds com `pnpm deploy --filter` para criar uma imagem podada, apenas para produção (~200MB vs ~1GB).

### 2.4. Concorrência de Worker
*   **Achado**: `apps/his-worker` inicializa workers com configurações padrão (Concorrência = 1).
*   **Impacto**: Uma única instância de worker processa jobs serialmente. Para `medicationOverdueScan`, que pode gerar milhares de alertas, isso será muito lento.
*   **Correção**: Aumentar concorrência (ex: `concurrency: 10`) para jobs ligados a I/O.

---

## 3. Performance de Banco de Dados

### 3.1. Estratégia de Indexação (Forte)
*   **Veredito**: **Excelente**.
*   O schema consistentemente inclui índices em `(account_id, status)` e Chaves Estrangeiras. Isso garante que queries multi-tenant permaneçam performáticas mesmo com o crescimento do dataset.
*   **Lacuna**: Timestamps (`created_at`, `admitted_at`) geralmente **não são indexados**. Queries de relatório (ex: "Admissões Diárias") exigirão Sequential Scans.

### 3.2. Caching (Ausente)
*   **Veredito**: **Inexistente**.
*   Serviços de API (ex: `getPatientSummary`) atingem o banco de dados diretamente toda vez.
*   **Recomendação**: Implementar estratégia de header `Cache-Control` para recursos estáticos ou cache Redis de curta duração para resumos de dashboard.

---

## 4. Roadmap de Escala

### Fase 1: Ajuste de Configuração (Imediato)
1.  **Pool**: Definir `PG_POOL_SIZE=20` para API, `5` para Workers.
2.  **Concorrência**: Definir concorrência de `Worker` para 5.
3.  **App**: Remover `await` de `appendAudit` (capturar erros para evitar rejection não tratada) OU usar uma fila.

### Fase 2: Otimização Estrutural
1.  **Docker**: Reescrever `Dockerfile` para usar `pnpm deploy`.
2.  **Réplicas de Leitura**: Configurar Drizzle para usar uma Réplica de Leitura para requisições `GET` (via funcionalidade Replicas do `drizzle-orm/pg-core`).

### Fase 3: Alta Escala
1.  **Cache Redis**: Implementar cache estrito para definições de `Protocol` (que são versões imutáveis) e headers de `Patient`.
2.  **Particionamento**: Particionar a tabela `audit_events` por `created_at` (Ano/Mês) para manter o tamanho do índice gerenciável.

---

## 5. Pontuações

### Pontuação de Latência: **75/100**
*   **Por que**: Fastify + Drizzle é muito rápido, mas o log de Auditoria síncrono é um limite de velocidade auto-imposto.

### Pontuação de Escalabilidade: **80/100**
*   **Por que**: Arquitetura stateless permite fácil escala horizontal. Limites são majoritariamente baseados em configuração (Conexões, Concorrência) em vez de falhas arquiteturais.
