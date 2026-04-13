# Referência Rápida — Alertas de Observabilidade

**CVG-HIS-V2 — Baseline Operacional**
**Data:** 2026-04-07

---

## Como Usar Este Documento

Este é um reference rápido para operadores configurarem alertas em Prometheus/AlertManager ou ferramenta similar. Cada alerta inclui a expressão PromQL e thresholds recomendados.

---

## Alertas Críticos (Critical)

### AL-01: API Indisponível

| Campo          | Valor                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| **Nome**       | `CVG_HIS_API_Down`                                                      |
| **Severidade** | Critical                                                                |
| **Expressão**  | `sum(rate(http_requests_total[5m])) == 0 unless app_uptime_seconds > 0` |
| **Resumo**     | Nenhum request processado nos últimos 5 minutos enquanto API está no ar |
| **Ação**       | 1. Verificar se API está rodando (`curl http://localhost:3000/health`)  |
|                | 2. Verificar logs: `grep "level\":\"ERROR\"" /var/log/api.log`          |
|                | 3. Verificar memória e CPU do processo                                  |

### AL-02: Taxa de Erros 5xx Elevada

| Campo          | Valor                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| **Nome**       | `CVG_HIS_API_HighErrorRate`                                                                                 |
| **Severidade** | Critical                                                                                                    |
| **Expressão**  | `sum(rate(http_errors_total{status_category="5xx"}[5m])) / sum(rate(http_requests_total[5m])) > 0.05`       |
| **Resumo**     | Mais de 5% das requests resultam em erro 5xx                                                                |
| **Ação**       | 1. Verificar health endpoint: `/health`                                                                     |
|                | 2. Inspecionar logs de erro: `grep "statusCode\":5" /var/log/api.log`                                       |
|                | 3. Verificar conectividade com banco de dados                                                               |
|                | 4. Identificar rota afetada: `topk(5, sum by (route) (rate(http_errors_total{status_category="5xx"}[5m])))` |

### AL-03: Banco de Dados Unhealthy

| Campo          | Valor                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| **Nome**       | `CVG_HIS_DB_Unhealthy`                                                   |
| **Severidade** | Critical                                                                 |
| **Expressão**  | `app_database_healthy == 0`                                              |
| **Resumo**     | Banco de dados não está respondendo                                      |
| **Ação**       | 1. Verificar se PostgreSQL está rodando: `pg_isready`                    |
|                | 2. Verificar string de conexão `DATABASE_URL`                            |
|                | 3. Inspecionar `/health` para detalhes em `dependencies.database.detail` |

### AL-04: Liveness Probe Falhando

| Campo          | Valor                                        |
| -------------- | -------------------------------------------- |
| **Nome**       | `CVG_HIS_API_Liveness_Failing`               |
| **Severidade** | Critical                                     |
| **Expressão**  | `up{job="cvg-his-v2-api"} == 0`              |
| **Resumo**     | Probe de liveness da API retornou não-200    |
| **Ação**       | 1. Verificar se processo da API está rodando |
|                | 2. Restartar API se necessário               |
|                | 3. Verificar logs para crashes ou OOM        |

---

## Alertas de Advertência (Warning)

### AL-05: Latência Alta

| Campo          | Valor                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Nome**       | `CVG_HIS_API_HighLatency`                                                                                                         |
| **Severidade** | Warning                                                                                                                           |
| **Expressão**  | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1`                                                    |
| **Resumo**     | P95 de latência acima de 1 segundo                                                                                                |
| **Ação**       | 1. Identificar rotas mais lentas: `topk(10, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))) by (route)` |
|                | 2. Verificar latência de DB: métricas `nodejs_*` e `app_database_healthy`                                                         |
|                | 3. Considerar scaling horizontal se carga alta                                                                                    |

### AL-06: Modo In-Memory Ativo em Produção

| Campo          | Valor                                                                      |
| -------------- | -------------------------------------------------------------------------- |
| **Nome**       | `CVG_HIS_API_InMemoryMode`                                                 |
| **Severidade** | Warning                                                                    |
| **Expressão**  | `app_persistence_mode{mode="in-memory"} == 1 and app_uptime_seconds > 300` |
| **Resumo**     | API está em fallback in-memory há mais de 5 minutos                        |
| **Ação**       | 1. Verificar variável `DATABASE_URL`                                       |
|                | 2. Confirmar que PostgreSQL está acessível                                 |
|                | 3. Dados serão perdidos em restart — planejar ação                         |

---

## Alertas Informacionais

### AL-07: Taxa de Erros 4xx Elevada

| Campo          | Valor                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| **Nome**       | `CVG_HIS_API_HighClientErrorRate`                                                                     |
| **Severidade** | Warning                                                                                               |
| **Expressão**  | `sum(rate(http_errors_total{status_category="4xx"}[5m])) / sum(rate(http_requests_total[5m])) > 0.10` |
| **Resumo**     | Mais de 10% das requests resultam em erro 4xx                                                         |
| **Ação**       | Pode indicar problema no cliente (SPA) ou tentativa de acesso não autorizado                          |

---

## Configuração de Canal (Exemplo AlertManager)

```yaml
# alertmanager.yml
route:
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default-receiver'
  routes:
    - match:
        severity: critical
      receiver: 'critical-receiver'
      group_wait: 10s

receivers:
  - name: 'default-receiver'
    email_configs:
      - to: 'ops@cvg.com'
  - name: 'critical-receiver'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
```

---

## Notas de Implementação

1. **Prometheus scrape interval:** Recomendado `15s` para métricas da API
2. **Evaluation interval:** `30s` para regras de alerta
3. **For**: Todas as expressões usam janela de `5m` (5 minutos) para evitar falsos positivos
4. **Annotations**: Adicionar `summary`, `description` e `runbook_url` como annotations nos rules

---

_Parte do Baseline Enterprise — Executor 3 — CVG-HIS-V2_
