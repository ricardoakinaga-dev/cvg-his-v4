# Runbook — topologia de réplicas da API (R2-ARC-01)

**Estado:** mitigação vigente desde 26/09/2026 (R2-ARC-01). A correção
estrutural (R2-ARC-02 e R2-ARC-03) está implementada e provada por teste de
duas instâncias; o guard permanece ligado até o CI e a carga (R2-QA-02)
confirmarem em ambiente real. Ver a seção "Como funciona a consistência entre
réplicas" abaixo.

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

## Como funciona a consistência entre réplicas (R2-ARC-02 / R2-ARC-03)

| Peça | Onde | Comportamento |
|---|---|---|
| Leitura com escopo obrigatório | `OwnersService.getOrThrow(accountId, id)`, `PatientsService.getOrThrow(accountId, id)`, `EncountersService.getOrThrow(accountId, id)` | Leitura síncrona do cache que nunca devolve linha de outra conta. `peek(id)` existe só para validações que precisam distinguir "não existe" de "é de outra conta". |
| *Read-through* | `fetchOrThrow(accountId, id)` nos três serviços; usado pelas rotas HTTP (`/owners/:id`, `/patients/:id`, `/encounters/:id`, alta, cirurgia, triagem) | Cache hit da conta responde na hora; miss consulta o repositório, popula o cache (e os vínculos tutor–paciente) e responde. Uma linha criada em outra réplica aparece no primeiro acesso. |
| Invalidação entre réplicas | `PostgresCacheSyncBus` em `packages/shared/database/src/cache-sync-bus.ts`; canal `cvg_cache_sync` | Após cada escrita durável os serviços publicam `{entity, accountId, id, op}` por `pg_notify`. Dentro de uma transação de tenant o NOTIFY vai na mesma conexão e só é entregue no `COMMIT`; rollback nunca anuncia nada. Cada réplica mantém uma conexão em `LISTEN`, ignora os próprios eventos (`originId`) e relê a linha do repositório sob o contexto da conta do evento, convergindo o cache. Reconexão automática se a conexão cair. |
| Ligação no processo | `apps/api/src/index.ts` cria o bus quando o runtime é database-backed; `runtime.ts` assina `owner`, `patient` e `encounter` | Sem banco (modo memória) não há bus nem necessidade dele. |

**Provas.** `tests/unit/modules/cache-sync-replicas.test.ts` (duas árvores de serviço com hub em memória), `tests/integration/database/cache-sync-bus.test.ts` (LISTEN/NOTIFY real, inclusive rollback) e `tests/integration/database/multi-replica-cache-consistency.test.ts` (duas instâncias HTTP da API no mesmo PostgreSQL: criar em A e ler em B; atualizar e inativar em A converge em B; outra conta recebe 404).

**Memória por réplica** (`node --expose-gc scripts/measure-cache-memory.mjs`, 26/09/2026, Node 22.23.2):

| Conta sintética | Heap |
|---|---|
| 5.000 tutores | 5,1 MB (≈1,1 KB cada) |
| 10.000 pacientes com vínculos | 9,7 MB (≈1,0 KB cada) |
| 20.000 atendimentos com linha do tempo | 28,5 MB (≈1,5 KB cada) |
| **Total** | **43,3 MB** por réplica para essa conta |

Cada réplica paga isso por conta hidratada; módulos como faturamento, agenda e estoque somam ao valor. Com `api.resources.limits.memory: 2Gi` há folga para dezenas de contas desse porte, mas a hidratação total no boot continua sendo o limite de escala natural: quando o total ultrapassar ~500 MB, mover as entidades transacionais para leitura só por repositório.

**Como habilitar mais de uma réplica.** Com o CI verde nos três testes acima e a carga de R2-QA-02 dentro do SLO, defina no ambiente `api.crossReplicaCache.enabled: true` e só então `api.replicaCount` maior que 1. O chart e o guard de processo deixam de bloquear; nada mais muda.
