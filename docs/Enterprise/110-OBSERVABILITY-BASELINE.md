# Observabilidade Baseline — CVG-HIS-V2

**Data:** 2026-04-07
**Versão:** 1.0.0
**Escopo:** Executor 3 — Fundação Enterprise

---

## 1. Visão Geral

Este documento consolida o baseline de observabilidade operacional do CVG-HIS-V2. Define o que existe, o que é mínimo mas suficiente para operação inicial, e o que ainda precisa ser endereçado.

**Princípios:**

- Baseline mínimo, útil e auditável
- Não inventar infraestrutura que o repositório ainda não sustenta
- Preservar a arquitetura atual da API
- Métricas e logs devem ser acionáveis, não decorativos

### Evidência executada em 10/04/2026

Na reta final do Bloco 2, a API foi exercitada em runtime real via Playwright/webServer isolado em `127.0.0.1:3101`, com os seguintes resultados:

- `GET /health` -> `200 OK`
- `GET /ready` -> `503 Service Unavailable` em modo `in-memory`, com `readiness.ready=false` e `productionReady=false`
- `GET /metrics` -> `200 OK`, expondo ao menos `http_requests_total`, `http_request_duration_seconds`, `app_database_healthy` e `app_persistence_mode`

Leitura operacional:

- o sinal de liveness/health está funcional
- o sinal de readiness diferencia corretamente ambiente degradado/in-memory de estado pronto para produção
- a trilha mínima de métricas Prometheus está executável

---

## 2. Instrumentação Atual — O que Existe

### 2.1 Métricas Prometheus (`apps/api/src/metrics.ts`)

| Métrica                         | Tipo      | Labels                           | Descrição                                                  |
| ------------------------------- | --------- | -------------------------------- | ---------------------------------------------------------- |
| `http_requests_total`           | Counter   | `method`, `route`, `status_code` | Total de requests HTTP                                     |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Duração de requests em segundos                            |
| `http_errors_total`             | Counter   | `status_category`                | Erros agrupados em `4xx` ou `5xx`                          |
| `app_uptime_seconds`            | Gauge     | —                                | Uptime da aplicação em segundos                            |
| `app_active_requests`           | Gauge     | —                                | Requests atualmente em processamento                       |
| `app_database_healthy`          | Gauge     | —                                | Saúde do banco (`1=healthy`, `0=unhealthy`)                |
| `app_persistence_mode`          | Gauge     | `mode`                           | Modo de persistência (`database` ou `in-memory`)           |
| `nodejs_*`                      | Default   | —                                | Métricas automáticas do prom-client (event loop, GC, etc.) |

**Bukets de latência:** `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]` segundos.

**Proteção de cardinalidade:** A função `normalizeRoute()` mapeia rotas dinâmicas (ex: `/patients/:id`) para padrões fixos (ex: `/{resource}/:id`). Isso evita explosão de cardinalidade no Prometheus.

### 2.2 Endpoints de Saúde (`apps/api/src/health.ts`)

| Endpoint        | Método | Comportamento                                             |
| --------------- | ------ | --------------------------------------------------------- |
| `/health`       | GET    | Status completo com detalhes de DB, repositórios e worker |
| `/ready`        | GET    | Readiness probe — retorna 200 se pronto, 503 se não       |
| `/health/ready` | GET    | Alias de `/ready`                                         |
| `/live`         | GET    | Liveness probe — retorna 200 se processo vivo             |
| `/health/live`  | GET    | Alias de `/live`                                          |
| `/metrics`      | GET    | Exposição Prometheus (texto formatato)                    |

**Content-Type do `/metrics`:** `text/plain; version=0.0.4; charset=utf-8` (formato Prometheus).

### 2.3 Logs Estruturados (`packages/shared/logging/src/index.ts`)

Formato JSON por linha:

```json
{
  "level": "INFO",
  "message": "request completed",
  "timestamp": "2026-04-07T18:20:00.000Z",
  "pid": 12345,
  "service": "cvg-his-v2-api",
  "correlationId": "abc-123",
  "method": "POST",
  "url": "/auth/login",
  "statusCode": 200,
  "durationMs": 45
}
```

**Níveis:** `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`

- `ERROR` e `FATAL` são escritos em `stderr`; os demais em `stdout`.
- Em produção, o nível mínimo é `INFO`; em desenvolvimento é `DEBUG`.

**Sanitização:** E-mails, CPF, senhas, tokens e segredos são automaticamente redatados em logs.

**Correlação:** Todo request recebe `x-correlation-id` (header ou gerado). Esse ID aparece em todos os logs e na response header.

### 2.4 Headers de Correlação (`apps/api/src/server.ts`)

| Header             | Direção            | Conteúdo                                   |
| ------------------ | ------------------ | ------------------------------------------ |
| `x-correlation-id` | Request → Response | ID de correlação (gerado se não fornecido) |
| `x-request-id`     | Response           | Alias do correlation-id                    |

### 2.5 Artefatos Operacionais (`infra/observability/`)

Já existem configurações operacionais prontas para uso:

| Artefato                                    | Conteúdo                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `infra/observability/prometheus.yml`        | Scrape config para API (`:3001`) e worker (`:3002`)                                          |
| `infra/observability/prometheus-alerts.yml` | 7 regras de alerta (Down, ErrorRate, DB Unhealthy, Liveness, Latency, InMemory, ClientError) |

---

## 3. Indicadores de Saúde Técnica vs Prontidão Operacional

### 3.1 Indicadores de Saúde Técnica (Technical Health Indicators)

| Indicador                      | Fonte                | O que mede                   |
| ------------------------------ | -------------------- | ---------------------------- |
| `app_uptime_seconds`           | Prometheus           | Tempo desde último restart   |
| `app_database_healthy`         | Prometheus           | Conectividade com PostgreSQL |
| `app_persistence_mode`         | Prometheus           | Modo atual de persistência   |
| `/live` endpoint               | HTTP                 | Processo está vivo           |
| `nodejs_eventloop_lag_seconds` | Prometheus (default) | Lag do event loop Node       |

### 3.2 Indicadores de Prontidão Operacional (Operational Readiness Indicators)

| Indicador                               | Fonte      | O que mede                               |
| --------------------------------------- | ---------- | ---------------------------------------- |
| `http_requests_total`                   | Prometheus | Volume total de requests                 |
| `http_request_duration_seconds` p95/p99 | Prometheus | Latência da API                          |
| `http_errors_total`                     | Prometheus | Taxa de erros 4xx/5xx                    |
| `/ready` endpoint                       | HTTP       | Sistema está pronto para receber tráfego |
| `app_active_requests`                   | Prometheus | Carga atual                              |

---

## 4. Lacunas Identificadas e Plano de Correção

| #   | Lacuna                                                                            | Severidade | Status         | Ação Recomendada                                                                                                      |
| --- | --------------------------------------------------------------------------------- | ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | `app_active_requests` sempre zero                                                 | Alta       | ✅ Corrigido   | Métrica agora é incrementada/decrementada em cada request via `incrementActiveRequests()`/`decrementActiveRequests()` |
| 2   | Métricas de business não expostas (ex: agendamentos criados, pacientes atendidos) | Média      | Pendente       | Adicionar counters de negócio no módulo de domínio correspondente quando maduro.                                      |
| 3   | Sem métricas de persistência por tabela (ex: duração de queries)                  | Baixa      | Pendente       | Quando houver instrumentação de DB, adicionar.                                                                        |
| 4   | Sem alerting configurado                                                          | Alta       | ✅ Documentado | Thresholds documentados neste baseline + arquivo `infra/observability/prometheus-alerts.yml`                          |
| 5   | Health tests usam `node:test` nativo e não estão no vitest                        | Baixa      | Pendente       | Migrar para vitest ou separar em `tests/unit/health/`.                                                                |

---

## 5. Métricas Mínimas Operacionais — Catálogo

### 5.1 Requests Totais

```promql
sum(rate(http_requests_total[5m]))
```

**Nome interno:** `http_requests_total`
**Labels:** `method`, `route`, `status_code`

### 5.2 Duração por Rota

```promql
# P50
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))

# P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# P99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

**Nome interno:** `http_request_duration_seconds`
**Labels:** `method`, `route`, `status_code`

### 5.3 Erros por Categoria

```promql
# Taxa de erros 5xx
sum(rate(http_errors_total{status_category="5xx"}[5m]))

# Taxa de erros 4xx
sum(rate(http_errors_total{status_category="4xx"}[5m]))

# Proporção de erros 5xx
sum(rate(http_errors_total{status_category="5xx"}[5m])) / sum(rate(http_requests_total[5m]))
```

**Nome interno:** `http_errors_total`
**Labels:** `status_category`

### 5.4 Uptime

```promql
app_uptime_seconds > 0
```

**Nome interno:** `app_uptime_seconds`

### 5.5 Requests Ativas

```promql
app_active_requests
```

**Nome interno:** `app_active_requests`
**Nota:** Implementado corretamente — incrementado em request start, decrementado em finish (server.ts linhas 173, 177).

### 5.6 Saúde de Banco/Persistência

```promql
# Saúde do DB (1 = healthy, 0 = unhealthy)
app_database_healthy

# Modo atual (1 = database, 0 = in-memory)
app_persistence_mode{mode="database"}
```

**Nomes internos:** `app_database_healthy`, `app_persistence_mode`

---

## 6. Alertas Mínimos Recomendados

### 6.1 Alerta: API Indisponível (Critical)

| Parâmetro      | Valor                                                                         |
| -------------- | ----------------------------------------------------------------------------- |
| **Nome**       | `CVG_HIS_API_Down`                                                            |
| **Expressão**  | `sum(rate(http_requests_total[5m])) == 0 unless app_uptime_seconds > 0`       |
| **Thresholds** | Qualquer período de 5min sem requests E sem uptime = API down                 |
| **Severidade** | Critical                                                                      |
| **Canal**      | Página + e-mail                                                               |
| **Ação**       | Verificar se a API está rodando. Verificar logs com correlationId do período. |

### 6.2 Alerta: Alta Taxa de Erros 5xx (Critical)

| Parâmetro      | Valor                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| **Nome**       | `CVG_HIS_API_HighErrorRate`                                                                           |
| **Expressão**  | `sum(rate(http_errors_total{status_category="5xx"}[5m])) / sum(rate(http_requests_total[5m])) > 0.05` |
| **Thresholds** | Mais de 5% das requests resultando em 5xx em 5 minutos                                                |
| **Severidade** | Critical                                                                                              |
| **Canal**      | Página + e-mail                                                                                       |
| **Ação**       | Inspecionar logs de erro com `level: ERROR`. Verificar health endpoint.                               |

### 6.3 Alerta: Latência Alta (Warning)

| Parâmetro      | Valor                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Nome**       | `CVG_HIS_API_HighLatency`                                                                                                 |
| **Expressão**  | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1`                                            |
| **Thresholds** | P95 de latência acima de 1 segundo em 5 minutos                                                                           |
| **Severidade** | Warning                                                                                                                   |
| **Canal**      | Página                                                                                                                    |
| **Ação**       | Identificar rotas mais lentas com `sum by (route) (rate(http_request_duration_seconds_bucket[5m]))`. Verificar DB health. |

### 6.4 Alerta: Banco de Dados Unhealthy (Critical)

| Parâmetro      | Valor                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Nome**       | `CVG_HIS_DB_Unhealthy`                                                                    |
| **Expressão**  | `app_database_healthy == 0`                                                               |
| **Thresholds** | DB unhealthy por mais de 1 minuto                                                         |
| **Severidade** | Critical                                                                                  |
| **Canal**      | Página + e-mail                                                                           |
| **Ação**       | Verificar conectividade com PostgreSQL. Verificar `databaseDetail` no endpoint `/health`. |

### 6.5 Alerta: Modo In-Memory Ativo em Produção (Warning)

| Parâmetro      | Valor                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------- |
| **Nome**       | `CVG_HIS_API_InMemoryMode`                                                                    |
| **Expressão**  | `app_persistence_mode{mode="in-memory"} == 1 and app_uptime_seconds > 300`                    |
| **Thresholds** | Rodando em modo in-memory por mais de 5 minutos                                               |
| **Severidade** | Warning                                                                                       |
| **Canal**      | Página                                                                                        |
| **Ação**       | Sistema está em fallback. Verificar variável `DATABASE_URL`. Dados serão perdidos em restart. |

### 6.6 Alerta: Saúde Liveness Falhando (Critical)

| Parâmetro      | Valor                                            |
| -------------- | ------------------------------------------------ |
| **Nome**       | `CVG_HIS_API_Liveness_Failing`                   |
| **Expressão**  | `up{job="cvg-his-v2-api"} == 0`                  |
| **Thresholds** | Liveness probe retorna não-200 por 1 minuto      |
| **Severidade** | Critical                                         |
| **Canal**      | Página + e-mail                                  |
| **Ação**       | Processo da API provavelmente travou. Restartar. |

---

## 7. Dashboard Operacional Inicial

### 7.1 Visão Geral

Dashboard para operadores com foco em 5 dimensões: **Disponibilidade**, **Erro**, **Latência**, **Volume**, **Persistência**.

> **Nota:** Este documento descreve o dashboard operacional ideal. A implementação real (Grafana, Datadog, etc.) é contingente da infraestrutura de produção.

### 7.2 Painel 1 — Disponibilidade

| Widget               | Tipo      | Query/Indicador                                                          |
| -------------------- | --------- | ------------------------------------------------------------------------ |
| Status geral         | Indicador | `app_uptime_seconds > 0` (verde) vs `app_uptime_seconds == 0` (vermelho) |
| Saúde do DB          | Indicador | `app_database_healthy` (1=verde, 0=vermelho)                             |
| Modo de persistência | Stat      | `app_persistence_mode` label                                             |
| Tempo online         | Stat      | `app_uptime_seconds` formatado                                           |
| Readiness probe      | Indicador | `/ready` retorna 200 = verde, 503 = vermelho                             |

### 7.3 Painel 2 — Erro

| Widget                 | Tipo        | Query/Indicador                                                                                      |
| ---------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| Taxa de erros 5xx      | Time series | `sum by (status_category) (rate(http_errors_total[5m]))`                                             |
| Taxa de erros 4xx      | Time series | `sum by (status_category) (rate(http_errors_total[5m]))`                                             |
| Proporção de erros 5xx | Gauge       | `sum(rate(http_errors_total{status_category="5xx"}[5m])) / sum(rate(http_requests_total[5m])) * 100` |
| Top rotas com erro 5xx | Table       | `topk(5, sum by (route) (rate(http_errors_total{status_category="5xx"}[5m])))`                       |

### 7.4 Painel 3 — Latência

| Widget                | Tipo        | Query/Indicador                                                                                                           |
| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Latência P50          | Time series | `histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))`                                                |
| Latência P95          | Time series | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`                                                |
| Latência P99          | Time series | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))`                                                |
| Latência por rota P95 | Bar gauge   | `topk(10, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])))` by route                             |
| Requests lentas (>1s) | Counter     | `sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]) - rate(http_request_duration_seconds_bucket{le="1"}[5m]))` |

### 7.5 Painel 4 — Volume

| Widget                       | Tipo        | Query/Indicador                                        |
| ---------------------------- | ----------- | ------------------------------------------------------ |
| Requests por segundo         | Time series | `sum(rate(http_requests_total[5m]))`                   |
| Requests por método          | Time series | `sum by (method) (rate(http_requests_total[5m]))`      |
| Requests por rota            | Time series | `sum by (route) (rate(http_requests_total[5m]))`       |
| Distribuição de status codes | Pie chart   | `sum by (status_code) (rate(http_requests_total[5m]))` |
| Requests ativas              | Gauge       | `app_active_requests`                                  |

### 7.6 Painel 5 — Persistência

| Widget         | Tipo      | Query/Indicador                                                       |
| -------------- | --------- | --------------------------------------------------------------------- |
| Modo atual     | Stat      | `app_persistence_mode` label                                          |
| Saúde DB       | Indicador | `app_database_healthy`                                                |
| Detalhes do DB | Text      | Informacao vinda do health endpoint em `dependencies.database.detail` |

---

## 8. Correlação entre x-correlation-id, Logs e Métricas

### 8.1 Fluxo de Correlação

```
1. Request entra com header x-correlation-id (ou é gerado pelo servidor)
           ↓
2. correlationId é setado na response header (x-correlation-id e x-request-id)
           ↓
3. correlationId é injetado no tenant context (TenantContext.correlationId)
           ↓
4. Todo log emitido durante o request carrega o correlationId
           ↓
5. Métricas são coletadas por route/method/status_code (sem correlationId nas labels)
           ↓
6. Para correlacionar: usar timestamp + route + method + status_code nos logs
   como ponte para as métricas
```

### 8.2 Como Investigar um Incidente

1. Identificar o período do incidente (gráfico de erros ou latência)
2. Identificar a rota afetada (dashboard de erro)
3. Filtrar logs por `timestamp` e `route` para encontrar correlationIds
4. Com o correlationId, buscar todos os logs daquele request
5. Se 5xx, inspecionar `error.stack` nos logs ERROR

### 8.3 Exemplo de Log com Correlação

```json
{
  "level": "ERROR",
  "message": "request completed",
  "timestamp": "2026-04-07T18:25:00.000Z",
  "pid": 12345,
  "service": "cvg-his-v2-api",
  "correlationId": "api-abc-123-def",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "method": "POST",
  "url": "/patients",
  "statusCode": 500,
  "durationMs": 1203
}
```

### 8.4 Query PromQL para Logs de Erro

Se logs forem enviados para Loki ou similar:

```logql
{service="cvg-his-v2-api", level="ERROR"} |= "api-abc-123-def"
```

---

## 9. Golden Path — Investigação de Incidente Simples

### Passo 1: Detectar o problema

- **Sintoma:** Alerta de erro 5xx ou latência alta dispara.
- **Tempo:** < 5 minutos após início do incidente.

### Passo 2: Avaliar impacto

- Dashboard de **Disponibilidade**: API está no ar?
- Dashboard de **Erro**: Qual a taxa de erro? Está subindo?
- Dashboard de **Volume**: Houve spike de tráfego?

### Passo 3: Identificar o escopo

- Erros estão concentrados em uma rota específica?
- Todas as rotas ou apenas algumas?
- Apenas em-production ou também em Homologação?

### Passo 4: Investigar logs

```bash
# Buscar logs de erro no período
grep "2026-04-07T18:2" /var/log/cvg-his-v2-api.log | grep '"level":"ERROR"'

# Filtrar por rota
grep "2026-04-07T18:2" /var/log/cvg-his-v2-api.log | grep '"/patients"'

# Com correlationId específico
grep "api-abc-123-def" /var/log/cvg-his-v2-api.log
```

### Passo 5: Investigar métricas

- Usar timestamp do erro para encontrar a janela exata no dashboard
- Identificar se latência de DB subiu (métricas `nodejs_*` e `app_database_healthy`)

### Passo 6: Ação imediata

| Cenário                      | Ação                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| DB unhealthy                 | Verificar PostgreSQL. Restartar se necessário.                                     |
| Latência alta sem erro de DB | Verificarevent loop lag (`nodejs_eventloop_lag_seconds`). Possível memory leak.    |
| Erro em rota específica      | Verificar se schema mudou, se第三方 API está down, ou se há problema de validação. |
| Spike de tráfego             | Verificar se é ataque, marketing, ou uso legítimo. Considerar rate limiting.       |

### Passo 7: Resolução e pós-incidente

- Confirmar que métricas voltaram ao normal
- Documentar o incidente com timeline e root cause
- Se new issue: abrir issue com label `incident` e seguir workflow de segurança

---

## 10. Testes de Observabilidade Existentes

| Teste                                      | Escopo                                                                                                                                                  | Status                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `tests/unit/observability/logging.test.ts` | Logger: níveis, JSON output, child logger, serialização de erro, filtragem por LOG_LEVEL                                                                | ✅ Passa                               |
| `tests/unit/observability/metrics.test.ts` | normalizeRoute: 9 cenários; updateAppMetrics: 5 cenários; increment/decrement: 3 cenários                                                               | ✅ Passa                               |
| `apps/api/src/health.test.ts`              | createHealthResponse: 6 cenários (in-memory, DB unhealthy, DB healthy, repositories not ready, DB connection failed); createLivenessResponse: 1 cenário | ⚠️ Usa `node:test`, não está no vitest |

### 10.1 Testes Recomendados a Adicionar

| Teste                                                           | Arquivo                                              | Prioridade |
| --------------------------------------------------------------- | ---------------------------------------------------- | ---------- |
| `httpRequestDurationSeconds` observe — validar buckets          | `tests/unit/observability/metrics.test.ts`           | Média      |
| Health response — validar campos obrigatórios do HealthResponse | `tests/unit/api/health.test.ts` (migrar para vitest) | Média      |

---

## 11. Arquivos Relevantes

| Arquivo                                     | Descrição                                            |
| ------------------------------------------- | ---------------------------------------------------- |
| `apps/api/src/metrics.ts`                   | Instrumentação Prometheus (métricas, normalizeRoute) |
| `apps/api/src/health.ts`                    | Criação de payloads de health/readiness/liveness     |
| `apps/api/src/server.ts`                    | HTTP server com logging, métricas e correlação       |
| `apps/api/src/app-state.ts`                 | Estado global da aplicação (persistência, DB, etc.)  |
| `packages/shared/logging/src/index.ts`      | Logger estruturado JSON                              |
| `packages/tenant-context/src/context.ts`    | AsyncLocalStorage para correlação por tenant         |
| `packages/shared/contracts/src/index.ts`    | Tipos `HealthResponse`                               |
| `.github/workflows/ci.yml`                  | CI com jobs de typecheck, build, test, coverage      |
| `infra/observability/prometheus.yml`        | Configuração de scrape do Prometheus                 |
| `infra/observability/prometheus-alerts.yml` | Regras de alertas Prometheus (7 alertas)             |
| `tests/unit/observability/logging.test.ts`  | Tests de logging                                     |
| `tests/unit/observability/metrics.test.ts`  | Tests de normalização de rotas                       |

---

## 12. Próximos Passos (Fora do Escopo Baseline, Mas Recomendados)

| Prioridade | Ação                                                                                 |
| ---------- | ------------------------------------------------------------------------------------ |
| Alta       | Integrar `/metrics` a um Prometheus real (docker-compose ou infraestrutura)          |
| Alta       | Configurar alertas no AlertManager (arquivo `prometheus-alerts.yml` pronto para uso) |
| Média      | Migrar `apps/api/src/health.test.ts` para vitest                                     |
| Média      | Adicionar métricas de negócio (agendamentos, pacientes atendidos)                    |
| Baixa      | Adicionar tracing com OpenTelemetry (requer infraestrutura adicional)                |
| Baixa      | Configurar dashboards no Grafana (requer instância)                                  |
| Baixa      | Adicionar health checks por dependência externa (Redis, etc.)                        |

---

## 13. Riscos e Limitações

| Risco                                             | Impacto                                                | Mitigação                                                                  |
| ------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `app_active_requests` agora funciona corretamente | Nenhum — métrica foi corrigida                         | Métrica implementada e testada                                             |
| Health tests não estão no vitest                  | Cobertura de teste pode não ser executada na CI padrão | Migrar para vitest ou garantir que `node:test` seja executado              |
| Sem alerting configurado                          | Incidentes podem passar despercebidos                  | Arquivo de regras `prometheus-alerts.yml` disponível para uso              |
| Sem Prometheus real                               | Métricas expostas mas não coletadas                    | Configurar scrape job no Prometheus ou usar `/metrics` com exportador      |
| Sem dashboard real                                | Visualização depende de implementação externa          | Usar spec da seção 7 como referência para implementação em Grafana/DataDog |
| Logs em stdout/stderr sem agregador               | Logs podem ser perdidos em crash                       | Configurar log aggregation (Loki, ELK, CloudWatch)                         |

---

_Documento mantido como parte do Baseline Enterprise — Executor 3 — CVG-HIS-V2_
