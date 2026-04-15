# ADR-011 — Container Runtime e Plataforma de Orquestração

**Data**: 2026-04-14
**Status**: Aprovado
**Contexto**: Definir runtime container e plataforma de orquestração para CVG-HIS V2

---

## Decisão 1 — Imagem Base

**Imagem:** `node:22-bookworm-slim`

| Alternativa | Justificativa da Rejeição |
|-------------|--------------------------|
| `node:22-alpine` | Alpine lacks `glibc` — pnpm build falha em módulos nativos que usam `node-gyp` |
| `node:22-slim` | Bookworm é mais estável em produção com Better-SQLite3 |
| `node:22` (full) | Imagem muito grande (~1.4GB) — aumenta tempo de pull e ataque surface |

**Multi-stage build:**
- `builder`: usa `node:22-bookworm-slim` + pnpm install + build
- `runner`: usa `node:22-bookworm-slim` + copy dos artefactos

**Não-root:** runner não usa root — `USER node` no Dockerfile (UID 10000)

---

## Decisão 2 — Healthcheck como Gate de Readiness

Todos os serviços declaram `HEALTHCHECK` no Dockerfile e probes no Helm:

```
API:   GET /health  → liveness
       GET /ready    → readiness (verifica DB + Redis)
Worker: process exit 0 → liveness (não tem HTTP)
SPA:   GET /         → liveness + readiness
```

**Regra:** deployment não entra em serviço até healthcheck passar.

---

## Decisão 3 — Plataforma de Orquestração

**Target:** Kubernetes (k8s) via Helm charts

| Plataforma | Decisão |
|-----------|---------|
| Desenvolvimento local | k3s + `helm install --dry-run` ou kind |
| Staging | EKS (AWS) ou GKE (Google Cloud) |
| Produção | EKS (AWS) ou GKE (Google Cloud) |

**Package manager:** Helm 3

**Motivo:** Equipa já familiarizada com Helm; charts cobrem todos os serviços; rollbacks nativos.

---

## Decisão 4 — Persistência em Produção

| Componente | Decisão |
|-----------|---------|
| PostgreSQL | Externo: RDS (AWS) ou Cloud SQL (GCP) — **não** via Helm StatefulSet |
| Redis | Externo: ElastiCache (AWS) ou Memorystore (GCP) — **não** via Helm StatefulSet |
| storage (files) | PVC com `ReadWriteOnce` — NFS ou cloud storage class |

**Justificativa:** StatefulSets para DB/cache em prod criam operacional overhead (backup, DR, upgrades). RDS/ElastiCache gerenciam isso automaticamente.

---

## Decisão 5 — Secrets

**Nunca** colocar secrets reais em `values.yaml` ou `secrets.yaml`.

Opções em produção:
1. **Vault** (GAP-04) → inject no startup via AppRole
2. **Kubernetes External Secrets Operator** → syncs de AWS SM / GCP SM
3. **Sealed Secrets** → encrypts secrets no git

Para esta iteração: usar Vault via GAP-04 com `VAULT_ENABLED=1`.

---

## Decisão 6 — Networking

- **Ingress:** NGINX Ingress Controller (classe `nginx`)
- **TLS:** cert-manager com Let's Encrypt (staging) ou ACM (produção AWS)
- **CORS:** API processa `CORS_ALLOWED_ORIGINS` — Ingress não interfere
- **Service mesh:** não na fase inicial (Linkerd/Istio adiado)

---

## Consequências

### Positivas

- Imagem lean (~200MB) com multi-stage build
- Probes garante zero-downtime deploys
- Helm permite deploy reproducible em qualquer ambiente
- Separação clara DB/cache externo reduz operacional overhead

### Negativas

- DB/cache externos custam mais que StatefulSets self-hosted
- Requer setup de credenciais Vault/SM antes do primeiro deploy
- NGINX IC precisa ser instalado no cluster

---

## Data de Implementação

GAP-10: Helm charts implementados 2026-04-14
