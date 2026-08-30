# Observability Runbook — CVG-HIS V2

**Stack**: Prometheus metrics + OpenTelemetry tracing + Grafana dashboards
**Services**: API (`cvg-api`), Worker (`cvg-worker`)
**Environment**: ver `docker-compose.v2.yml` para endpoints canonicos

---

## 1. Arquitetura de Observabilidade

```
┌─────────────────────────────────────────────────────────────┐
│                      Grafana                                  │
│  Dashboard: infra/observability/grafana/                    │
│  cvg-his-v2-api-dashboard.json                              │
└─────────────────────┬───────────────────────────────────────┘
                      │ Prometheus scraping
┌─────────────────────▼───────────────────────────────────────┐
│  Prometheus         │ Scrapes /metrics from API + Worker      │
│  prometheus.yml     │                                        │
│  prometheus-alerts.yml│ Alerts: API Down, HighError,         │
│                      │ HighLatency, DB Unhealthy, etc.        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│  OTEL Exporter      │ Exports traces to OTLP endpoint        │
│  (API + Worker)     │ Configurable via OTLP_TRACES_ENDPOINT  │
└─────────────────────┬───────────────────────────────────────┘
                      │ OTLP HTTP
┌─────────────────────▼───────────────────────────────────────┐
│  OTEL Collector     │ Receives traces from API/Worker       │
│  infra/observability│ Docker profile: observability         │
│  /otel-collector... │ OTLP HTTP :4318                       │
└─────────────────────┬───────────────────────────────────────┘
```

---

## 2. Métricas Disponíveis

### 2.1 API Metrics (`/metrics`)

| Métrica                         | Tipo      | Labels                           | Descrição                                             |
| ------------------------------- | --------- | -------------------------------- | ----------------------------------------------------- |
| `http_requests_total`           | Counter   | `method`, `route`, `status_code` | Total de requisições HTTP                             |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Duração de requisições (buckets: 5ms-10s)             |
| `http_errors_total`             | Counter   | `status_category`                | Erros HTTP por categoria (4xx, 5xx)                   |
| `app_uptime_seconds`            | Gauge     | —                                | Uptime da aplicação                                   |
| `app_active_requests`           | Gauge     | —                                | Requisições em processamento                          |
| `app_database_healthy`          | Gauge     | —                                | Saúde do banco (1=ok, 0=fail)                         |
| `app_persistence_mode`          | Gauge     | `mode`                           | Modo de persistência (database/in-memory/unavailable) |

### 2.2 Default Metrics (Node.js)

CPU, memory, event loop, GC, handles, requests in flight, etc.

---

## 3. SLOs Definidos

| SLO          | Target | Window | Alert | Critical |
| ------------ | ------ | ------ | ----- | -------- |
| P95 Latency  | 200ms  | 5min   | 250ms | 300ms    |
| P99 Latency  | 500ms  | 5min   | 600ms | 800ms    |
| Availability | 99.5%  | 1h     | 99.0% | 98.0%    |
| Error Rate   | 0.1%   | 5min   | 0.5%  | 1.0%     |

Ref: `apps/api/src/slos.ts`

## 3.1 Capacidades criticas amarradas a SLO, alerta e dashboard

| Capacidade critica                | Fonte primaria                                       | SLO/alerta principal                                 | Evidencia operacional                                             |
| --------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| Disponibilidade da API            | `/health`, `/ready`, `/metrics`                      | `api-availability`, `CVG_HIS_API_SLO_Availability_*` | dashboard + probes                                                |
| Latencia operacional              | `/metrics`, `/slos`                                  | `api-latency-p95`, `api-latency-p99`                 | dashboard + relatorio SLO                                         |
| Taxa de erro 5xx                  | `/metrics`, `/slos`                                  | `api-error-rate`, `CVG_HIS_API_SLO_ErrorRate_*`      | dashboard + alertas                                               |
| Saude do banco                    | `/ready`, Prometheus gauge                           | `CVG_HIS_DB_Unhealthy`                               | readiness + alert                                                 |
| Persistência durável indisponível | `/ready`, Prometheus gauge                           | `CVG_HIS_API_DatabasePersistenceUnavailable`         | readiness + alert                                                 |
| Runtime em memoria explícito      | `/health`, Prometheus gauge                          | `CVG_HIS_API_InMemoryMode`                           | health + alert                                                    |
| Liveness da aplicacao             | `/live`                                              | `CVG_HIS_API_Liveness_Failing`                       | probe + alert                                                     |
| PIX settlement DLQ                | `/internal/pix-settlement/deliveries`, worker metric | `CVG_HIS_PIX_Settlement_ReconciliationRequired`      | painel DLQ + [runbook](../../docs/runbooks/pix-settlement-dlq.md) |

---

## 4. Tracing (OpenTelemetry)

### 4.1 O que existe

- SDK OpenTelemetry bootstrapado em API (`apps/api/src/observability.ts`) e Worker
- Exporter OTLP HTTP configurável via `OTLP_TRACES_ENDPOINT`
- Span creation via `createSpan()` / `withSpan()` em `apps/api/src/tracing.ts`
- W3C Trace Context propagation (traceparent/tracestate headers)
- Middleware de tracing no handler HTTP (spans por request)
- Spans de DB no `shared-database`
- Spans de worker jobs
- Async trace handoff via outbox/event-bus (`payload._meta.traceparent`) para correlação API → worker
- `x-trace-id` exposto no response header

### 4.2 Variáveis de ambiente

| Variável               | Descrição         | Exemplo                                |
| ---------------------- | ----------------- | -------------------------------------- |
| `OTEL_ENABLED`         | Habilita OTel SDK | `true`                                 |
| `OTEL_SERVICE_NAME`    | Nome do serviço   | `cvg-api`                              |
| `OTEL_ENVIRONMENT`     | Ambiente          | `production`                           |
| `OTLP_TRACES_ENDPOINT` | Endpoint OTLP     | `http://otel-collector:4318/v1/traces` |
| `OTLP_PROTOCOL`        | Protocolo         | `http/protobuf`                        |
| `OTLP_HEADERS`         | Headers auth      | `Authorization=Bearer xxx`             |

### 4.3 Subir stack de observabilidade local

```bash
docker compose --profile observability up -d otel-collector prometheus grafana
```

Portas:

- OTEL collector: `4318`
- Prometheus: `9090`
- Grafana: `3005`

### 4.4 Como adicionar tracing a uma função

```typescript
import { withSpan } from './tracing.js';

const result = await withSpan('my-operation', async () => {
  return doSomething();
});
```

---

## 5. Prometheus Scrape Config

Arquivo: `infra/observability/prometheus.yml`

```yaml
scrape_configs:
  - job_name: 'cvg-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:3003']
        labels:
          service: 'api'
          environment: 'development'

  - job_name: 'cvg-worker'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:3003']
        labels:
          service: 'worker'
          environment: 'development'
```

Para localhost em desenvolvimento, adicione `host.docker.internal` ao `/etc/hosts`.

---

## 6. Grafana Dashboard

Arquivo: `infra/observability/grafana/cvg-his-v2-api-dashboard.json`

### Painéis

| Painel                  | Tipo       | Query                 |
| ----------------------- | ---------- | --------------------- |
| API P95 Latency         | Stat       | P95 latency em ms     |
| API Error Rate          | Stat       | Taxa de 5xx           |
| API Availability        | Stat       | Disponibilidade 1h    |
| Latency Distribution    | Timeseries | P50/P95/P99 (5m)      |
| Request Rate by Status  | Timeseries | req/s por status code |
| Latency P95 by Endpoint | Timeseries | Por rota normalizada  |
| Error Budget Remaining  | Stat       | Budget 30d            |
| Error Budget Burn Rate  | Stat       | Taxa de consumo       |

### Importar dashboard

1. Abrir Grafana → Dashboards → Import
2. Carregar JSON de `infra/observability/grafana/cvg-his-v2-api-dashboard.json`
3. Selecionar datasource Prometheus

---

## 7. Alerts Prometheus

Arquivo: `infra/observability/prometheus-alerts.yml`

| Alerta                                          | Severidade | Condição                                  |
| ----------------------------------------------- | ---------- | ----------------------------------------- |
| `CVG_HIS_API_Down`                              | Critical   | Nenhum request em 5min                    |
| `CVG_HIS_API_HighErrorRate`                     | Critical   | >5% erros 5xx em 5min                     |
| `CVG_HIS_DB_Unhealthy`                          | Critical   | DB unreachable                            |
| `CVG_HIS_API_Liveness_Failing`                  | Critical   | Probe failing                             |
| `CVG_HIS_API_HighLatency`                       | Warning    | P95 > 1s                                  |
| `CVG_HIS_API_DatabasePersistenceUnavailable`    | Critical   | Persistence unavailable                   |
| `CVG_HIS_API_InMemoryMode`                      | Warning    | Explicit in-memory > 5min                 |
| `CVG_HIS_API_HighClientErrorRate`               | Warning    | >10% erros 4xx                            |
| `CVG_HIS_PIX_Settlement_ReconciliationRequired` | Critical   | Backlog PIX terminal atual maior que zero |

---

## 8. health e readiness endpoints

| Endpoint       | Descrição                                        |
| -------------- | ------------------------------------------------ |
| `GET /health`  | Resumo de saúde; transporte 200 mesmo degradado  |
| `GET /ready`   | Readiness probe (200/503)                        |
| `GET /live`    | Liveness-only probe (200 enquanto processo vivo) |
| `GET /metrics` | Prometheus metrics                               |
| `GET /slos`    | Relatório SLO (error budget, burn rate)          |

---

## 9. Operações

### 9.0 PIX settlement DLQ

O painel **PIX Settlement DLQ (current)** acompanha o backlog durável atual,
recalculado por cada réplica do worker sem labels de tenant; a consulta usa
`max(...)` para evitar dupla contagem entre pods. O contador
`worker_pix_provider_settlement_reconciliation_required_total` continua
disponível para investigar novas promoções, mas não é a fonte do alerta. A
lista e o redrive são tenant-scoped e documentados no
[runbook de PIX settlement](../../docs/runbooks/pix-settlement-dlq.md). Não há
fallback em memória nem `UPDATE` direto da API na tabela de deliveries.

### 9.1 Verificar se API está expondo métricas

```bash
curl -s http://localhost:3003/metrics | head -50
```

### 9.2 Verificar traces estão sendo exportados

Verificar logs da API procurando por `span` exportado ou erros de conexão OTLP.

### 9.3 Validar SLOs

```bash
curl -s http://localhost:3003/slos | jq .
```

---

## 10. Limitações atuais

- Collector usa exporter `debug` como baseline local; retenção e backend de traces seguem responsabilidade do ambiente alvo
- Sem sampling configurado (100% das requests são traceadas)
- Dashboard espera `job="cvg-api"` label no Prometheus
