# Observability Foundation

## Pilares

- logs estruturados
- metricas operacionais e de negocio
- tracing e correlacao
- auditoria de negocio separada de observabilidade tecnica

## Regras

- todo request recebe `correlation_id`
- jobs preservam correlacao quando derivados de requests
- erros criticos geram log estruturado e, quando relevante, `audit event`

## Ownership

- `packages/shared/logging`: logger e convencoes
- `infra/observability`: stack operacional
- `packages/modules/audit`: trilha de negocio
