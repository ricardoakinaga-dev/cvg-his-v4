# Runbook — topologia de réplicas da API (R2-ARC-01)

**Estado:** mitigação vigente desde 26/09/2026. Remoção prevista em R2-ARC-03.

## Por que a API roda com uma única réplica

A API carrega no boot os dados de todas as contas em caches por processo
(`apps/api/src/runtime.ts`, hidratação de 29 módulos) e várias leituras
síncronas (`patients.getOrThrow`, `owners.getOrThrow`, `encounters.getOrThrow`)
consultam só esse cache. Não existe invalidação entre réplicas. Com duas ou mais
réplicas atrás de um balanceador, um paciente criado na réplica A não existe na
réplica B até o próximo reinício, e o usuário vê "não encontrado" ou dados
antigos de forma intermitente. É o achado **A1** da
[auditoria de 26/09/2026](../2026-09-26-auditoria-completa-sistema.md).

## O que o guard faz

| Camada | Comportamento |
|---|---|
| Helm (`templates/api-deployment.yaml`) | `helm template`/`helm install` falha quando `api.replicaCount > 1` e `api.crossReplicaCache.enabled` não é `true`. |
| Valores | `values.prod.yaml` e `values.staging.yaml` fixam `api.replicaCount: 1`. `values.yaml` define `api.crossReplicaCache.enabled: false`. |
| Processo (`apps/api/src/replica-topology-guard.ts`) | O chart exporta `CVG_API_EXPECTED_REPLICAS` e `CVG_API_CROSS_REPLICA_CACHE`. Se o processo recebe mais de 1 réplica sem a flag, ele recusa iniciar com `replica topology guard rejected startup`. |
| Validador (`infra/scripts/validate-helm.mjs`) | Caso de teste garante que `values.prod.yaml` com `api.replicaCount=3` falha e que o padrão continua fechado. |

## Como escalar enquanto o guard existe

- **Vertical:** aumente `api.resources.requests/limits` em `values.prod.yaml`.
- **Worker e SPA:** não são afetados; `worker.replicaCount` e `spa.replicaCount`
  seguem livres. O SPA é estático e o worker não usa o cache por processo da API.
- **Não** faça `kubectl scale deployment <api> --replicas=N`. O pod novo recusa
  iniciar (guard de processo) e a implantação fica degradada.

## Sintomas de violação

- Pods da API em `CrashLoopBackOff` com o log
  `replica topology guard rejected startup: CVG_API_EXPECTED_REPLICAS=<n> is unsafe`.
- `helm upgrade` recusado com
  `api.replicaCount > 1 requires api.crossReplicaCache.enabled=true`.

Ação: volte `api.replicaCount` para 1. Não defina `crossReplicaCache.enabled`
manualmente; a flag só é válida quando R2-ARC-03 estiver em produção com o
teste de duas instâncias verde.

## Critério para remover o guard (R2-ARC-03)

1. `getOrThrow(accountId, id)` com escopo obrigatório e *read-through* em
   patients, owners e encounters (R2-ARC-02).
2. Invalidação por `LISTEN/NOTIFY` por conta e entidade, ou remoção do cache
   nas entidades transacionais.
3. Teste de duas instâncias da API no mesmo banco: criar, atualizar e inativar
   em A, ler em B, tudo verde no CI.
4. Só então: `api.crossReplicaCache.enabled: true` no ambiente, seguido de
   `api.replicaCount` maior que 1.
