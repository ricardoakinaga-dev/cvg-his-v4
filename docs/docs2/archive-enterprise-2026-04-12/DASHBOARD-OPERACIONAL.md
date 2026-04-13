# Dashboard Operacional — CVG-HIS-V2

**CVG-HIS-V2 — Baseline Operacional**
**Data:** 2026-04-07
**Nota:** Este documento descreve o dashboard ideal para uma stack Prometheus + Grafana. A implementação concreta depende da infraestrutura disponível.

---

## 1. Visão Geral do Dashboard

O dashboard operacional é destinado a **operadores** (não desenvolvedores) e cobre 5 dimensões:

| Dimensão        | Foco                                     | Prioridade |
| --------------- | ---------------------------------------- | ---------- |
| Disponibilidade | API está no ar? DB está saudável?        | Crítica    |
| Erro            | Taxa de erros 4xx/5xx                    | Crítica    |
| Latência        | P50/P95/P99 por rota                     | Alta       |
| Volume          | Requests/segundo, distribuição de status | Média      |
| Persistência    | Modo atual, saúde do banco               | Alta       |

---

## 2. Painel 1 — Disponibilidade

### 2.1 Status Panel (Indicador Grande)

```
# Status da API
Uptime > 0 ? VERDE : VERMELHO
```

**Widget:** Stat ou Gauge
**Expressão:** `app_uptime_seconds > 0`
**Cores:** Verde (online) / Vermelho (offline)

### 2.2 Saúde do Banco (Indicador)

```
# Database healthy
app_database_healthy == 1 ? VERDE : VERMELHO
```

**Widget:** Stat
**Expressão:** `app_database_healthy`
**Labels:** "Healthy" / "Unhealthy"

### 2.3 Modo de Persistência (Stat)

```
app_persistence_mode
```

**Widget:** Stat
**Labels esperados:** `database` ou `in-memory`

### 2.4 Tempo Online (Stat)

```
# Tempo desde último restart formatado
app_uptime_seconds
```

**Widget:** Stat (com unidade de tempo)

### 2.5 Readiness Probe (Indicador)

```
# Readiness via /ready endpoint
/ready HTTP code == 200 ? VERDE : AMARELO/VERMELHO
```

**Widget:** Indicator
**Nota:** Requer exporter HTTP custom ou Blackbox Exporter

---

## 3. Painel 2 — Erro

### 3.1 Taxa de Erros 5xx (Time Series)

```
# Séries temporais de erros 5xx e 4xx
sum by (status_category) (rate(http_errors_total[5m]))
```

**Widget:** Time series (linhas)
**Labels:** `4xx`, `5xx`
**Colors:** `4xx` = amarelo, `5xx` = vermelho

### 3.2 Proporção de Erros 5xx (Gauge)

```
# Percentual de requests que resultam em 5xx
sum(rate(http_errors_total{status_category="5xx"}[5m]))
  / sum(rate(http_requests_total[5m]))
  * 100
```

**Widget:** Gauge (0-100%)
**Threshold:** >5% = vermelho

### 3.3 Top 5 Rotas com Erro 5xx (Table)

```
# Ranking de rotas com mais erros
topk(5, sum by (route) (rate(http_errors_total{status_category="5xx"}[5m])))
```

**Widget:** Table
**Colunas:** `route`, `error_rate`

### 3.4 Erros por Status Code (Pie Chart)

```
sum by (status_code) (rate(http_requests_total[5m]))
```

**Widget:** Pie chart
**Purpose:** Ver distribuição de códigos de resposta

---

## 4. Painel 3 — Latência

### 4.1 Latência Percentuais (Time Series)

```
# Três linhas: P50, P95, P99
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

**Widget:** Time series (3 linhas)
**Cores:** P50 = azul, P95 = amarelo, P99 = vermelho
**Unit:** segundos

### 4.2 Latência P95 por Rota (Bar Gauge)

```
# Top 10 rotas mais lentas
topk(10, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))) by (route)
```

**Widget:** Bar gauge (horizontal)
**Threshold:** >1s = vermelho

### 4.3 Requests Lentas (>1s) (Counter)

```
# Requests com duração > 1 segundo
sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m])
  - rate(http_request_duration_seconds_bucket{le="1"}[5m]))
```

**Widget:** Stat (counter)
**Unit:** requests/segundo

---

## 5. Painel 4 — Volume

### 5.1 Requests por Segundo (Time Series)

```
# Total de requests por segundo
sum(rate(http_requests_total[5m]))
```

**Widget:** Time series (área)
**Unit:** requests/s

### 5.2 Requests por Método HTTP (Time Series)

```
sum by (method) (rate(http_requests_total[5m]))
```

**Widget:** Time series (linhas por método)
**Métodos:** GET, POST, PATCH, DELETE

### 5.3 Requests por Rota (Time Series)

```
sum by (route) (rate(http_requests_total[5m]))
```

**Widget:** Time series (top 10 rotas)
**Purpose:** Identificar rotas com maior volume

### 5.4 Requests Ativas (Gauge)

```
app_active_requests
```

**Widget:** Gauge
**Nota:** Este Gauge precisa ser corrigido na implementação para refletir contagem real.

---

## 6. Painel 5 — Persistência

### 6.1 Modo Atual (Stat)

```
app_persistence_mode
```

**Widget:** Stat
**Labels:** `database` (verde), `in-memory` (amarelo)

### 6.2 Saúde do Banco (Indicador)

```
app_database_healthy
```

**Widget:** Indicator
**1 =** Verde (healthy)
**0 =** Vermelho (unhealthy)

### 6.3 Detalhes do DB (Text)

```
# Mostrar detail do health endpoint
dependencies_database_detail
```

**Widget:** Text panel
**Nota:** Requer scrape do endpoint `/health` com JSON parser

---

## 7. Variáveis de Dashboard (Grafana)

### 7.1 Filtros Recomendados

| Variável      | Tipo         | Query/Valores                                    |
| ------------- | ------------ | ------------------------------------------------ |
| `environment` | Dropdown     | `production`, `staging`, `development`           |
| `route`       | Multi-select | `label_values(http_requests_total, route)`       |
| `method`      | Dropdown     | `GET`, `POST`, `PATCH`, `DELETE`                 |
| `status_code` | Multi-select | `label_values(http_requests_total, status_code)` |

---

## 8. Links e Resources

| Recurso            | URL/Referência                                                 |
| ------------------ | -------------------------------------------------------------- |
| Endpoint Métricas  | `http://localhost:3000/metrics`                                |
| Endpoint Health    | `http://localhost:3000/health`                                 |
| Prometheus         | Configurar scrape job com `targets: ['localhost:3000']`        |
| Grafana Dashboards | Importar JSON spec (a criar quando Grafana estiver disponível) |

---

_Parte do Baseline Enterprise — Executor 3 — CVG-HIS-V2_
