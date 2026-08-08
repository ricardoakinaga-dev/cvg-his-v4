# 0341 - RELATORIO DE EVIDENCIAS DE OPERACAO PREMIUM - 2026-04-22

**Taxonomia:** `CANONICO`
**Papel no sistema documental:** consolidar a evidencia executavel do lote `OPS-101` a `OPS-105`
**Ler em conjunto com:** `README.md`, `0100-EXECUTION-TRACKER.md`, `0339-CHECKLIST-FORMAL-REQUISITOS-VIVOS-2026-04-22.md`, `0340-SCORECARD-E-GATE-RUMO-96-2026-04-22.md`, `201-BACKLOG-RUMO-96.md`

**Data UTC:** `2026-04-22`

---

## 1. Resumo executivo

O lote operacional premium desta rodada fechou evidencias reais para:

- `OPS-101` restore drill reexecutado sobre bundle novo;
- `OPS-102` cutover readiness revalidado com saida estruturada;
- `OPS-103` observabilidade amarrada a capacidades criticas com alertas, SLOs e dashboard;
- `OPS-104` estabilidade repetida provada por duas rodadas consecutivas de `smoke` e `integration`;
- `OPS-105` checklist de release por ambiente publicado em `0342`.

Conclusao objetiva:

- a fase operacional saiu de evidencia pontual para trilha repetivel e rastreavel;
- o gate `90+` agora tem a parte operacional principal sustentada por execucao de campo desta data.

---

## 2. Evidencias por item

### OPS-101 - Restore drill reexecutado

Comandos executados:

```bash
pnpm ops:backup:v2
pnpm ops:restore:drill:v2 -- backup-20260422T220909Z
```

Resultados:

- bundle gerado em `/var/backups/cvg-his-v2/backup-20260422T220909Z`
- restore drill concluido em `/tmp/cvg-his-v2-restore-drills/backup-20260422T220909Z-restore-drill-20260422T220919Z-1725567`
- `public tables restored: 76`
- `checksumVerification: passed`
- `storageListingMatch: true`

Artefatos principais:

- `/var/backups/cvg-his-v2/backup-20260422T220909Z/SHA256SUMS`
- `/tmp/cvg-his-v2-restore-drills/backup-20260422T220909Z-restore-drill-20260422T220919Z-1725567/restore-drill-report.txt`
- `/tmp/cvg-his-v2-restore-drills/backup-20260422T220909Z-restore-drill-20260422T220919Z-1725567/restore-drill-report.json`

Status:

- `cumpre`

### OPS-102 - Cutover readiness expandido

Comando executado:

```bash
node infra/scripts/check-cutover-readiness.mjs --json
```

Resultado:

- `failures: 0`
- `10/10` checks em `pass`

Checks validados:

- frontend canonico em `apps/spa`
- stack oficial `api + worker + spa`
- compose e proxy sem legado `apps/web`
- `NODE_ENV` production-like
- doc de deploy referenciando guardrail

Status:

- `cumpre`

### OPS-103 - Observabilidade por capacidade critica

Comandos executados:

```bash
curl -fsS http://127.0.0.1:3003/health
curl -fsS http://127.0.0.1:3003/ready
curl -fsS http://127.0.0.1:3003/slos
pnpm exec vitest run tests/unit/observability/prometheus-alerts-slo-alignment.test.ts tests/unit/api/slos.test.ts
```

Resultados observados:

- `/health` -> `ok=true`, `environment=production`, `persistenceMode=database`
- `/ready` -> `ready=true`, `productionReady=true`, `database.state=healthy`
- `/slos` -> `overallStatus=healthy`, `availability=100`, `errorRate=0`
- testes de alinhamento observabilidade/SLO -> `33/33` verdes

Capacidades criticas cobertas:

- disponibilidade da API
- latencia `P95/P99`
- erro `5xx`
- saude de banco
- deteccao de runtime em memoria

Status:

- `cumpre`

### OPS-104 - Reducao de flakiness residual

Rodada 1:

```bash
pnpm test:smoke
pnpm test:integration
```

Resultado:

- `smoke` -> `13 passed`
- `integration` -> `75 files`, `886 tests`, tudo verde

Rodada 2:

```bash
pnpm test:smoke
pnpm test:integration
```

Resultado:

- `smoke` -> `13 passed`
- `integration` -> `75 files`, `886 tests`, tudo verde

Leitura:

- a rodada repetida sustenta o verde sem mudanca de codigo entre uma execucao e outra;
- os warnings esperados de harness e logs de erro de cenarios negativos continuam presentes, mas sem falha intermitente de suite.

Status:

- `cumpre`

### OPS-105 - Checklist de release por ambiente

Entregavel publicado:

- `0342-CHECKLIST-RELEASE-POR-AMBIENTE-2026-04-22.md`

Status:

- `cumpre`

---

## 3. Decisao operacional

O bloco `OPS-101` a `OPS-105` desta fase passa a ter evidencia executavel suficiente para promocao no checklist formal da pasta `docs/Enterprise`.

O que ainda nao significa:

- nao significa `96/100`;
- nao elimina o trabalho restante em `INT-*`, `FIN-101`, `FIS-101`, `ML-*` e `AUD-*`.

O que passa a significar:

- o eixo operacional premium desta fase deixou de ser risco prioritario aberto;
- o programa agora tem restore drill recente, readiness expandido, observabilidade rastreavel, estabilidade repetida e checklist de release por ambiente.
