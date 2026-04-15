# CVG-HIS-V2 Helm Charts

Kubernetes Helm charts for deploying CVG-HIS-V2 applications.

## Structure

```
charts/helm/
├── umbrella/          # Umbrella chart deploying all components
├── api/               # API server chart
├── worker/            # Background worker chart
├── spa/               # Single Page Application chart
└── web/               # Marketing web site chart
```

## Quick Start

### Install the full application (umbrella)

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install with release name
helm install cvghis ./umbrella \
  --namespace cvghis \
  --create-namespace \
  -f ./umbrella/values.yaml
```

### Install individual components

```bash
# API only
helm install cvghis-api ./api \
  --namespace cvghis \
  --create-namespace

# SPA only
helm install cvghis-spa ./spa \
  --namespace cvghis
```

## Prerequisites

- Kubernetes 1.19+
- Helm 3.8+
- PostgreSQL 15+ (external or via bitnami/postgresql chart)
- Redis 7+ (external or via bitnami/redis chart)
- nginx-ingress-controller or similar (for Ingress resources)
- cert-manager (for TLS certificates)

## Database & Redis Dependencies

Install PostgreSQL and Redis if not already available:

```bash
# PostgreSQL
helm install cvghis-postgres bitnami/postgresql \
  --namespace cvghis \
  --set auth.username=cvghis \
  --set auth.password=REPLACE_ME \
  --set auth.database=cvghis

# Redis
helm install cvghis-redis bitnami/redis \
  --namespace cvghis \
  --set auth.password=REPLACE_ME
```

## Configuration

### API Configuration

Key values to override in `api/values.yaml`:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of API replicas | `2` |
| `image.tag` | Docker image tag | `latest` |
| `service.type` | Kubernetes Service type | `ClusterIP` |
| `autoscaling.enabled` | Enable HPA | `true` |
| `autoscaling.minReplicas` | Minimum replicas | `2` |
| `autoscaling.maxReplicas` | Maximum replicas | `10` |
| `env.FF_RUNTIME_DISTRIBUTED_STATE_ENABLED` | Enable Redis-backed rate limiting | `true` |
| `env.PIX_MOCK_MODE` | Use mock PIX adapter | `false` |
| `env.AUTH_RATE_LIMIT_MAX_REQUESTS` | Auth rate limit per window | `100` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.host` | API hostname | `api.cvg-his.internal` |

### Secrets

Secrets are defined in `templates/secret.yaml` with `REPLACE_ME` placeholders. In production, use:

- **External Secrets Operator**: Sync from AWS Secrets Manager, HashiCorp Vault, etc.
- **Sealed Secrets**: Encrypt secrets for Git storage
- **Manual**: Create secrets before helm install

```bash
# Example: Create secret manually
kubectl create secret generic cvghis-api-secret \
  --from-literal=DATABASE_PASSWORD=actualpassword \
  --namespace=cvghis
```

## Production Checklist

- [ ] Set `image.tag` to specific version, not `latest`
- [ ] Replace all `REPLACE_ME` values in secrets
- [ ] Configure TLS certificates via cert-manager
- [ ] Set appropriate resource limits/requests
- [ ] Configure autoscaling based on load testing
- [ ] Set up PostgreSQL backup strategy
- [ ] Set up Redis persistence (AOF recommended)
- [ ] Configure monitoring (Prometheus + Grafana)
- [ ] Set up log aggregation
- [ ] Review pod security policies

## Monitoring

The API chart includes Prometheus annotations for automatic scraping. Ensure Prometheus has service discovery enabled:

```yaml
# prometheus values
prometheus:
  serviceMonitor:
    enabled: true
    namespace: monitoring
```

## Ingress Annotations

The API ingress includes rate limiting. Adjust based on your nginx-ingress-controller configuration:

```yaml
ingress:
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
```

## Health Probes

All charts include startup, liveness, and readiness probes:

- **API**: HTTP checks on `/health/startup`, `/health/live`, `/health/ready`
- **Worker**: Process checks via `pgrep`
- **SPA/Web**: HTTP checks on `/index.html`

## Troubleshooting

### Pod not starting

```bash
# Check pod events
kubectl describe pod -n cvghis -l app=cvg-his-v2-api

# Check logs
kubectl logs -n cvghis -l app=cvg-his-v2-api --tail=100
```

### Database connection issues

The API deployment includes init containers that wait for PostgreSQL. If timing is an issue:

```bash
# Manually check DB connectivity
kubectl run -it --rm debug --image=postgres:15-alpine --restart=Never -- \
  sh -c 'until pg_isready -h cvghis-postgres -U cvghis; do sleep 1; done'
```

## Uninstall

```bash
# Umbrella release
helm uninstall cvghis --namespace cvghis

# Individual components
helm uninstall cvghis-api --namespace cvghis
helm uninstall cvghis-worker --namespace cvghis
helm uninstall cvghis-spa --namespace cvghis
helm uninstall cvghis-web --namespace cvghis

# Remove namespace (WARNING: deletes all resources)
kubectl delete namespace cvghis
```
