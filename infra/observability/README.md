# Observability Bootstrap

## Fundacao atual

- logs estruturados via `@cvg-his-v2/shared-logging`
- `correlation_id` nos skeletons de apps
- separacao conceitual entre log tecnico e auditoria de negocio
- metricas Prometheus expostas em `/metrics`
- health endpoints: `/health`, `/ready`, `/live`

## Arquivos operacionais

| Arquivo                 | Descricao                            |
| ----------------------- | ------------------------------------ |
| `prometheus.yml`        | Configuracao de scrape do Prometheus |
| `prometheus-alerts.yml` | Regras de alertas Prometheus         |

## Como usar

### Prometheus Scrape Config

O `prometheus.yml` configura o Prometheus para coletar metricas da API:

```yaml
scrape_configs:
  - job_name: 'cvg-his-v2-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:3001']
```

### Alert Rules

O `prometheus-alerts.yml` contem 7 alertas operacionais:

| Alerta                          | Severidade | Condicao               |
| ------------------------------- | ---------- | ---------------------- |
| CVG_HIS_API_Down                | Critical   | Nenhum request em 5min |
| CVG_HIS_API_HighErrorRate       | Critical   | >5% erros 5xx          |
| CVG_HIS_DB_Unhealthy            | Critical   | DB unreachable         |
| CVG_HIS_API_Liveness_Failing    | Critical   | Probe failing          |
| CVG_HIS_API_HighLatency         | Warning    | P95 > 1s               |
| CVG_HIS_API_InMemoryMode        | Warning    | In-memory > 5min       |
| CVG_HIS_API_HighClientErrorRate | Warning    | >10% erros 4xx         |

### Integracao com AlertManager

Para usar com AlertManager, adicione ao `prometheus.yml`:

```yaml
rule_files:
  - 'prometheus-alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

## Limites atuais

- Sem tracing distribuido (OpenTelemetry pendente)
- Sem Prometheus/Grafana real em producao
- Sem AlertManager configurado de fato
