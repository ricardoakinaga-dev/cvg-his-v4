# CVG HIS V2 Helm Chart

Este chart agora segue uma trilha multiambiente explícita:

- `values.yaml`: baseline compartilhado
- `values.dev.yaml`: desenvolvimento com secrets locais do chart
- `values.staging.yaml`: staging com `existingSecret` para API/Postgres/Redis
- `values.prod.yaml`: produção com `existingSecret` para API/Postgres/Redis
- `values.schema.json`: guardrail tipado para `helm lint`

## Guardrails operacionais

- `ServiceAccount` explícito com `automountServiceAccountToken=false` por padrão.
- `PodDisruptionBudget` explícito para `api`, `worker` e `spa`.
- `ConfigMap` por serviço para reduzir drift entre valores, templates e runtime.
- `worker` expõe `Service` de health/metrics e usa probes HTTP (`/live`, `/ready`, `/health`) em vez de `exec`.
- `pnpm validate:helm` executa `helm lint` e `helm template` para `dev`, `staging` e `prod`, validando também:
  - presença de `Deployment`, `Service` e `PodDisruptionBudget` por serviço
  - alinhamento dos probes operacionais da API e do worker
  - ausência de `Secret` gerado pelo chart em `staging/prod`
  - presença de PostgreSQL/Redis embutidos apenas em `dev`

## Render por ambiente

Desenvolvimento:

```bash
helm template cvg-his-v2-dev infra/helm/cvg-his-v2 \
  -f infra/helm/cvg-his-v2/values.yaml \
  -f infra/helm/cvg-his-v2/values.dev.yaml
```

Staging:

```bash
helm template cvg-his-v2-staging infra/helm/cvg-his-v2 \
  -f infra/helm/cvg-his-v2/values.yaml \
  -f infra/helm/cvg-his-v2/values.staging.yaml
```

Produção:

```bash
helm template cvg-his-v2-prod infra/helm/cvg-his-v2 \
  -f infra/helm/cvg-his-v2/values.yaml \
  -f infra/helm/cvg-his-v2/values.prod.yaml
```

Validação de guardrails:

```bash
pnpm validate:helm
```

## Convenção de secrets

- `api.auth.existingSecret`: secret com `AUTH_SECRET`
- `postgresql.existingSecret`: Secret com `api-url`, `worker-url` e `password`; API e worker usam roles PostgreSQL diferentes. Em ambiente externo, provisione as roles com `NOSUPERUSER NOBYPASSRLS` antes do deploy.
- `api.attachmentStorage.existingSecret`: Secret privado com `endpoint`, `bucket`, `access-key` e `secret-key` para S3/MinIO; o API também exige `ATTACHMENT_SCANNER_HOST` apontando para ClamAV em staging/produção.
- `api.attachmentScanner.existingSecret`: Secret com `host` e, opcionalmente, `port`/`timeout-ms` do ClamAV; sem esse secret o API permanece fail-closed em ambientes staging/produção.
- `redis.existingSecret`: secret com `url`

Em `dev`, o chart pode gerar os secrets locais.
Em `staging/prod`, a recomendação é sempre usar `existingSecret`.

## Upgrade seguro

```bash
helm upgrade --install cvg-his-v2-prod infra/helm/cvg-his-v2 \
  -n cvg-his \
  -f infra/helm/cvg-his-v2/values.yaml \
  -f infra/helm/cvg-his-v2/values.prod.yaml \
  --wait \
  --atomic
```

## Rollback mínimo

1. Ver histórico:

```bash
helm history cvg-his-v2-prod -n cvg-his
```

2. Voltar para a revisão anterior estável:

```bash
helm rollback cvg-his-v2-prod <REVISAO> -n cvg-his --wait
```

3. Revalidar:

```bash
kubectl get pods -n cvg-his
kubectl rollout status deploy/cvg-his-v2-prod-cvg-his-v2-api -n cvg-his
kubectl rollout status deploy/cvg-his-v2-prod-cvg-his-v2-spa -n cvg-his
kubectl rollout status deploy/cvg-his-v2-prod-cvg-his-v2-worker -n cvg-his
```

4. Confirmar readiness da API e rota pública antes de encerrar o rollback.

## Observações operacionais

- `revisionHistoryLimit` e `strategy` foram explicitados em `api`, `spa` e `worker` para preservar trilha mínima de reversão.
- `runtime.distributed_state.enabled` e o `AUTH_SECRET` precisam estar coerentes em staging/prod, porque o fluxo OIDC distribuído depende disso.
- Os endpoints canônicos de probe são:
  - API: `/live`, `/ready`, `/health`
  - Worker: `/live`, `/ready`, `/health`
  - SPA: `/`
