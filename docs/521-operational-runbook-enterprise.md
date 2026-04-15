# 521 - Runbook Operacional Enterprise

**Status:** vivo
**Data de criacao:** 2026-04-12
**Sprint:** 6 — Operacao Auditavel
**Items:** IMP-206, IMP-207, IMP-208, IMP-209, IMP-210, IMP-503

---

## 1. Escopo

Este runbook consolida as operacoes criticas de:
- Backup e restore
- Tracing e observabilidade
- Evidencia SOC2

Cada secao conecta um comando/script real a uma evidencia operacional auditavel.

---

## 2. Backup e Restore

### 2.1 Executar Backup

```bash
# Comando raiz
pnpm ops:backup:v2

# Ou diretamente
sudo ./infra/scripts/backup-v2.sh

# Com variaveis customizadas
BACKUP_BASE_DIR=/var/backups/cvg-his-v2 \
BACKUP_RETENTION_DAYS=7 \
BACKUP_INCLUDE_STORAGE=true \
bash infra/scripts/backup-v2.sh
```

**Evidencia gerada:**
```
/var/backups/cvg-his-v2/backup-{TIMESTAMP}/
  database/
    cvg_his_v2.dump           # pg_dump custom format (compressed)
    postgres-globals.sql        # roles, grants, settings
    backup.info                 # metadados (db, user, format)
  storage/
    file-storage.tar.gz         # anexos e uploads
    file-storage.contents.txt    # lista de arquivos
  meta/
    manifest.json               # hints de restore + metadados
    restore-hints.txt            # comandos de restore
    compose-ps.txt              # estado dos servicos no backup
    compose-services.txt         # servicos declarados
    docker-volume-ls.txt        # volumes Docker no momento do backup
    env.keys.txt               # keys presentes (sem valores)
  SHA256SUMS                  # checksums de todos os arquivos
```

**Retencao:** 7 dias por padrao (configuravel via `BACKUP_RETENTION_DAYS`).

**Aceite:**
- `SHA256SUMS` verificado com `sha256sum -c SHA256SUMS`
- `pg_restore -l` executa sem erro sobre o dump
- Arquivo `manifest.json` existe e tem campos `createdAt`, `databaseDump`, `storageIncluded`

### 2.2 Validar Backup (sem restaurar)

```bash
# Verificar checksums
cd /var/backups/cvg-his-v2/backup-{TIMESTAMP}
sha256sum -c SHA256SUMS

# Listar conteudo do dump
docker run --rm -v "$(pwd):/backup" postgres:16-alpine \
  pg_restore -l /backup/database/cvg_his_v2.dump | head -20

# Listar arquivos no storage
tar -tzf storage/file-storage.tar.gz | head -10
```

**Aceite:** ambos os comandos executam sem erro.

### 2.3 Executar Restore Drill

O drill restaura em um Postgres descartavel sem tocar a stack viva.

```bash
# Drill sobre bundle mais recente
pnpm ops:restore:drill:v2

# Drill sobre bundle especifico
pnpm ops:restore:drill:v2 -- imp207-20260412T065850Z

# Manter runtime descartavel para inspecao
KEEP_RUNTIME=true pnpm ops:restore:drill:v2 -- latest
```

**Evidencia gerada em `/tmp/cvg-his-v2-restore-drills/`:**
```
{backup-id}-restore-drill-{run-id}/
  checksums.txt                 # sha256sum -c output (0 = tudo OK)
  dump-toc.txt                  # TOC do pg_restore
  globals-restore.log           # log da restauracao de globals
  db-create.log                # log da criacao do banco
  db-restore.log               # log completo do pg_restore
  restored-public-tables.txt   # lista de tabelas publicas restauradas
  restored-db-metrics.csv      # metricas do banco restaurado
  storage-restored/            # arquivos do storage restaurados
  restored-storage.contents.txt # lista de arquivos restaurados
  expected-storage.contents.txt  # lista esperada (do bundle)
  storage-contents.diff        # diff (vazio = OK)
  restore-drill-report.txt      # relatorio texto
  restore-drill-report.json    # relatorio JSON
  postgres-container.log       # logs do container Postgres
```

**Aceite do drill:**
- `sha256sum -c SHA256SUMS` retorna 0 falhas
- `restored-public-tables.txt` contem 43+ tabelas
- `storage-contents.diff` esta vazio (conteudo restaurado = esperado)
- `restore-drill-report.json` tem `checksumVerification: "passed"` e `storageListingMatch: true`

### 2.4 Restore Real (em producao)

**CUIDADO:** operacao destrutiva. Executar apenas com supervisao.

```bash
# 1. Parar servicos
docker compose -p cvg-his-v2 stop api worker

# 2. Restaurar backup
sudo ./infra/scripts/restore-backup.sh backup-{TIMESTAMP}

# 3. Voltar servicos
docker compose -p cvg-his-v2 start api worker

# 4. Validar
curl http://localhost:3001/health
curl http://localhost:3001/ready
```

---

## 3. Observabilidade e Tracing

### 3.1 Stack de Observabilidade

```
Grafana  (dashboards)
  └─ infra/observability/grafana/cvg-his-v2-api-dashboard.json
Prometheus (scraping)
  └─ infra/observability/prometheus.yml
  └─ infra/observability/prometheus-alerts.yml
OTEL Exporter (API + Worker)
  └─ apps/api/src/observability.ts
  └─ apps/api/src/tracing.ts
Collector (externo, nao incluso no repo)
```

### 3.2 Verificar API expondo metricas

```bash
curl -s http://localhost:3001/metrics | head -30
```

**O que procurar:**
- `http_requests_total` — contador de requests
- `http_request_duration_seconds` — histograma de latencia
- `app_database_healthy` — deve ser `1`
- `app_uptime_seconds` — uptime da aplicacao

### 3.3 Verificar Tracing

```bash
# Fazer uma request e verificar o trace header no response
curl -v http://localhost:3001/health 2>&1 | grep -i traceparent
```

**O que esperar:**
- Header `x-trace-id` no response (quando OTel habilitado)
- Header `traceparent` no formato `00-{traceId}-{spanId}-{flags}`

### 3.4 Validar SLOs

```bash
curl -s http://localhost:3001/slos | jq .
```

**O que esperar (estrutura):**
```json
{
  "generatedAt": "...",
  "window": "30d",
  "overallStatus": "healthy|degraded|critical",
  "slos": [
    { "id": "api-latency-p95", "status": "healthy", "burnRate": 0.3 },
    { "id": "api-availability", "status": "healthy", "errorBudgetPercent": 98.5 },
    ...
  ]
}
```

### 3.5 Verificar Dashboards Grafana

1. Abrir Grafana → Dashboards → Import
2. Carregar `infra/observability/grafana/cvg-his-v2-api-dashboard.json`
3. Selecionar datasource Prometheus

**Paineis disponiveis:**

| Painel | Tipo | O que valida |
|--------|------|-------------|
| API P95 Latency | Stat | Latencia P95 < 200ms (target) |
| API Error Rate | Stat | Taxa 5xx < 0.1% (target) |
| API Availability | Stat | Disponibilidade > 99.5% (target) |
| Latency Distribution | Timeseries | P50/P95/P99 ao longo do tempo |
| Request Rate by Status | Timeseries | Tráfego por codigo HTTP |
| Latency P95 by Endpoint | Timeseries | Latencia por rota normalizada |
| Error Budget Remaining | Stat | Budget de erro 30d |
| Error Budget Burn Rate | Stat | Taxa de consumo do budget |

### 3.6 Prometheus Scrape Config

Arquivo: `infra/observability/prometheus.yml`

```yaml
scrape_configs:
  - job_name: 'cvg-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:3001']
        labels:
          service: 'api'
          environment: 'development'
  - job_name: 'cvg-worker'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:3002']
        labels:
          service: 'worker'
          environment: 'development'
```

### 3.7 Alerts Prometheus

Arquivo: `infra/observability/prometheus-alerts.yml`

| Alerta | Severidade | Condicao |
|--------|------------|----------|
| `CVG_HIS_API_Down` | Critical | Nenhum request em 5min |
| `CVG_HIS_API_HighErrorRate` | Critical | >5% erros 5xx em 5min |
| `CVG_HIS_DB_Unhealthy` | Critical | DB unreachable |
| `CVG_HIS_API_Liveness_Failing` | Critical | Probe failing |
| `CVG_HIS_API_HighLatency` | Warning | P95 > 1s |
| `CVG_HIS_API_InMemoryMode` | Warning | In-memory > 5min |
| `CVG_HIS_API_HighClientErrorRate` | Warning | >10% erros 4xx |

### 3.8 Snapshot operacional de chaos e runtime

```bash
# Estado efetivo do runtime + experimentos ativos
curl -s http://localhost:3001/chaos/experiments | jq .

# Apenas o resumo operacional efetivo
curl -s http://localhost:3001/chaos/experiments | jq '.runtimeState'
```

**O que esperar:**
- `runtimeState.activeExperimentIds` lista os experimentos ativos naquele processo
- `runtimeState.persistenceMode` muda para `in-memory` durante `database-failure`
- `runtimeState.redisHealthy=false` e `runtimeState.rateLimiterMode="in-memory-fallback"` durante `redis-failure`
- cada experimento retorna `runbook.path`, `indicators` e `runtimeImpact`

### 3.9 Metricas operacionais de fallback real

```bash
curl -s http://localhost:3001/metrics | grep -E 'app_database_healthy|app_redis_healthy|app_persistence_mode|app_rate_limiter_mode'
```

**O que procurar:**
- `app_database_healthy 0` quando o runtime estiver degradado por DB real ou `database-failure`
- `app_persistence_mode{mode="in-memory"} 1` quando houver fallback operacional
- `app_redis_healthy 0` quando Redis estiver indisponivel ou o experimento `redis-failure` estiver ativo
- `app_rate_limiter_mode{mode="in-memory-fallback"} 1` quando o rate limiter distribuido cair para memoria

### 3.10 Adicionar Tracing a uma Funcao

```typescript
import { withSpan } from './tracing.js';

const result = await withSpan('my-operation', async () => {
  return doSomething();
});
```

O span e exportado automaticamente via OTLP quando `OTEL_ENABLED=true`.

---

## 4. Evidencia SOC2

### 4.1 Endpoints de Evidencia

| Endpoint | Auth | O que retorna |
|---------|------|--------------|
| `GET /soc2/evidence` | Requer `audit.read` | Pacote de evidencia SOC2 (CC6.2, CC3.1, CC5.1, CC7.1, CC7.2, CC8.1) |
| `GET /soc2/security-score` | Requer `audit.read` | Score de seguranca por dimensao |
| `GET /soc2/policies` | Publico | Politicas ABAC ativas |

### 4.2 Coletar Evidencia SOC2

```bash
# Coletar pacote de evidencia (requer token JWT com role audit.read)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/soc2/evidence?periodStart=2026-03-01&periodEnd=2026-04-01" | jq .
```

**Estrutura do retorno:**
```json
{
  "collectedAt": "...",
  "periodStart": "2026-03-01T00:00:00.000Z",
  "periodEnd": "2026-04-01T00:00:00.000Z",
  "summary": {
    "totalControls": 18,
    "controlsPassing": 14,
    "controlsFailing": 1,
    "controlsAtRisk": 3,
    "lastDrTest": "2026-04-12T...",
    "lastVulnerabilityScan": "2026-04-10T...",
    "openIncidents": 0,
    "staleAccessUsers": 2
  },
  "trustServiceCriteria": [
    { "criterion": "CC6.2", "overallStatus": "pass", "controls": [...] },
    { "criterion": "CC7.1", "overallStatus": "at_risk", "controls": [...] }
  ]
}
```

### 4.3 Obter Security Score

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/soc2/security-score" | jq .
```

**Estrutura do retorno:**
```json
{
  "overall": 72,
  "security": 65,
  "availability": 55,
  "confidentiality": 70,
  "processingIntegrity": 60,
  "privacy": 55,
  "criticalGaps": [
    "DR test overdue",
    "2 users with stale access"
  ],
  "recommendations": [
    "Schedule and conduct DR failover test"
  ]
}
```

### 4.4 Controles SOC2 Implementados

| Criterio | Controle | Evidencia automatica |
|----------|----------|---------------------|
| CC6.2 (Access) | MFA enforcement, session timeout, lockout | `/soc2/evidence` via `MfaControlService` |
| CC3.1 (Risk) | Vulnerability scanning, critical vulns | `/soc2/evidence` via `VulnerabilityControlService` |
| CC5.1 (Oversight) | Quarterly access review, revocation | `/soc2/evidence` via `AccessReviewControlService` |
| CC7.1 (Operations) | DR testing, backup verification, uptime | `/soc2/evidence` via `DisasterRecoveryControlService` + `restore-drill-v2.sh` |
| CC7.2 (Incident) | MTTR, open incidents, response plan | `/soc2/evidence` via `IncidentResponseControlService` |
| CC8.1 (Change) | CI/CD pipeline, change log | Git history + CI/CD logs |

### 4.5 Mapear Evidencia a Artefatos Reais

| Evidencia SOC2 | Artefato / Comando / Arquivo |
|----------------|------------------------------|
| Backup executado | `SHA256SUMS` no bundle `/var/backups/cvg-his-v2/backup-{ts}/` |
| Restore drill realizado | `restore-drill-report.json` em `/tmp/cvg-his-v2-restore-drills/` |
| Checksums verificados | `checksums.txt` no dir do drill |
| Tabelas restauradas | `restored-public-tables.txt` (43+ tabelas) |
| Storage restaurado | `restored-storage.contents.txt` + diff vazio |
| SLOs validos | `curl localhost:3001/slos` → `overallStatus` |
| API healthy | `curl localhost:3001/health` → `ok: true` |
| DB healthy | `curl localhost:3001/ready` → `readiness.databaseHealthy: true` |
| Audit log | `appendAudit()` chamado em cada operacao critica |
| MFA configurado | `soc2MfaControl` com roles `admin`, `finance` requerendo TOTP |
| Secrets rotacionados | `env.keys.txt` no backup (keys sem valores) |

---

## 5. Health Endpoints

| Endpoint | Descricao | Criteria de aceite |
|----------|-----------|-------------------|
| `GET /health` | Liveness | `ok: true` |
| `GET /ready` | Readiness | `readiness.ready: true`, `productionReady: true`, `databaseHealthy: true` |
| `GET /live` | Alias de health | `ok: true` |
| `GET /metrics` | Prometheus | Contem `http_requests_total`, `http_request_duration_seconds` |
| `GET /slos` | SLO report | JSON com `overallStatus` e array de slos |

```bash
# Validacao rapida
curl -s http://localhost:3001/health | jq .
curl -s http://localhost:3001/ready | jq .
curl -s http://localhost:3001/slos | jq '.overallStatus'
```

---

## 6. Variaveis de Ambiente de Observabilidade

| Variavel | Default | Descricao |
|----------|---------|-----------|
| `OTEL_ENABLED` | `false` | Habilita OTel SDK |
| `OTEL_SERVICE_NAME` | `cvg-api` | Nome do servico nos spans |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | — | Endpoint do collector OTLP |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | Protocolo OTLP |
| `OTEL_EXPORTER_OTLP_HEADERS` | — | Headers auth para OTLP |
| `PROMETHEUS_ENABLED` | `true` | Exposicao de metricas Prometheus |

---

## 7. Referencias

| Artefato | Localizacao |
|----------|-------------|
| Dashboard Grafana | `infra/observability/grafana/cvg-his-v2-api-dashboard.json` |
| Config Prometheus | `infra/observability/prometheus.yml` |
| Alerts Prometheus | `infra/observability/prometheus-alerts.yml` |
| Runbook Observabilidade | `infra/observability/README.md` |
| Script Backup | `infra/scripts/backup-v2.sh` |
| Script Restore Drill | `infra/scripts/restore-drill-v2.sh` |
| Script Restore Manual | `infra/scripts/restore-backup.sh` |
| Docs Backup/DR | `infra/scripts/README.md` |
| Docs Instalacao | `docs/130-instalacao-publicacao-cvg-his-v2-real.md` |
| SOC2 module | `packages/modules/soc2/src/` |
| SLOs (API) | `apps/api/src/slos.ts` |
| Tracing (API) | `apps/api/src/tracing.ts` |
| Observability (API) | `apps/api/src/observability.ts` |
| Metrics (API) | `apps/api/src/metrics.ts` |

---

## 8. Checklist de Aceite Operacional

### Diario

- [ ] API respondendo em `/health`
- [ ] `persistenceMode: "database"` na readiness
- [ ] Sem logs de erro critico nos ultimos 15 minutos

### Apos Backup

- [ ] `sha256sum -c SHA256SUMS` OK (0 falhas)
- [ ] `pg_restore -l` OK (sem erro no dump)
- [ ] `manifest.json` existe com `createdAt`

### Apos Restore Drill

- [ ] `checksumVerification: "passed"` no report JSON
- [ ] `storageListingMatch: true` no report JSON
- [ ] `publicTablesRestored: 43+` no report JSON

### Apos Deploy

- [ ] `/health` → `ok: true`
- [ ] `/ready` → `readiness.ready: true`
- [ ] `/slos` → `overallStatus: healthy`
- [ ] Backup executado antes do deploy
