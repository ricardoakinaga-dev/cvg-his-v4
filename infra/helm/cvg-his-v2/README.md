# CVG HIS V2 Helm Chart

Este chart agora segue uma trilha multiambiente explícita:

- `values.yaml`: baseline compartilhado
- `values.dev.yaml`: desenvolvimento com secrets locais do chart
- `values.staging.yaml`: staging com `existingSecret` para API/Postgres/Redis
- `values.prod.yaml`: produção com `existingSecret` para API/Postgres/Redis

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

## Convenção de secrets

- `api.auth.existingSecret`: secret com `AUTH_SECRET`
- `postgresql.existingSecret`: secret com `url` e `password`
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
