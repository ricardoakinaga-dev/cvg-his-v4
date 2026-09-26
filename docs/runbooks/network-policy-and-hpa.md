# Runbook — NetworkPolicy e HPA do worker (R2-INF-01)

**Estado:** entregue em 26/09/2026 no chart `infra/helm/cvg-his-v2`. Ativo em
`values.prod.yaml` e `values.staging.yaml`; desligado em `values.dev.yaml`.
Exige um CNI que aplique `NetworkPolicy` (Calico, Cilium, Azure CNI com
policy, GKE Dataplane V2). Sem isso as políticas são aceitas mas não filtram.

## Política de rede (`templates/networkpolicy.yaml`)

Cada workload recebe uma política *default-deny* nas duas direções e uma
lista explícita de permissões:

| Origem | Destino | Porta |
|---|---|---|
| ingress controller (`networkPolicy.ingressController`) | spa, api | 3002, 3001 |
| spa | api | 3001 |
| api, worker, jobs `database-maintenance` | postgres (in-cluster) **ou** `networkPolicy.managedDatastores` | 5432 |
| api, worker | redis (in-cluster) **ou** `networkPolicy.managedDatastores` | 6379 |
| monitoring (`networkPolicy.monitoring`) | api, worker (`/metrics`) | 3001, 3002 |
| api, worker | internet HTTPS (`networkPolicy.externalEgress`: Pagar.me, NFS-e, WhatsApp, HIBP, OTLP) | 443 |
| todos | DNS do cluster (`networkPolicy.dns`) | 53 |

Nada mais alcança o PostgreSQL ou o Redis; o SPA só fala com a API; ninguém
abre conexão com o worker além do monitoramento.

Com PostgreSQL/Redis gerenciados (`postgresql.enabled: false`, como em
produção), o chart **falha** se `networkPolicy.managedDatastores` estiver
vazio: preencha com os CIDRs dos endpoints gerenciados antes do deploy. O
valor de exemplo (`10.0.0.0/8`) é um placeholder a ser estreitado.

## HPA do worker (`templates/worker-hpa.yaml`)

`worker.autoscaling.enabled: true` cria um `HorizontalPodAutoscaler`
(`autoscaling/v2`) por CPU (70%) e, opcionalmente, memória; o Deployment do
worker deixa de fixar `replicas`. O worker não tem cache por processo, então
escala horizontalmente. **A API não recebe HPA**: continua sob o guard de
réplica única de [R2-ARC-01](api-replica-topology.md) até
`api.crossReplicaCache.enabled` ser validado; o validador do chart recusa
qualquer HPA apontado para a API.

## Validação estática (CI)

`pnpm validate:helm` renderiza dev, staging e prod e afirma: políticas para
api/worker/spa com `policyTypes: [Ingress, Egress]`; SPA com egress só para
API e DNS; worker sem ingress de api/spa; postgres in-cluster aceitando só
api/worker; egress da API para 5432 quando o banco é gerenciado; HPA do
worker apontando para o Deployment certo sem `replicas` fixo; nenhum HPA de
API; caso negativo com `managedDatastores` vazio.

## Teste de conectividade negada (no cluster)

Executar após o primeiro deploy em cada ambiente e anexar a saída ao registro
de mudanças:

```bash
NS=cvg-his
SPA=$(kubectl -n $NS get pod -l app.kubernetes.io/component=spa -o jsonpath='{.items[0].metadata.name}')
API=$(kubectl -n $NS get pod -l app.kubernetes.io/component=api -o jsonpath='{.items[0].metadata.name}')
PG_HOST=<host do PostgreSQL>   # service in-cluster ou endpoint gerenciado
# Deve FALHAR (timeout): SPA → PostgreSQL
kubectl -n $NS exec $SPA -- sh -c "timeout 5 nc -zv $PG_HOST 5432" ; echo "exit=$?"
# Deve FUNCIONAR: API → PostgreSQL
kubectl -n $NS exec $API -- sh -c "timeout 5 nc -zv $PG_HOST 5432" ; echo "exit=$?"
# Deve FALHAR: SPA → worker
WORKER=$(kubectl -n $NS get svc -l app.kubernetes.io/component=worker -o jsonpath='{.items[0].metadata.name}')
kubectl -n $NS exec $SPA -- sh -c "timeout 5 nc -zv $WORKER 3002" ; echo "exit=$?"
```

Resultado esperado: `exit=1` (ou 124) nos casos negados e `exit=0` no
permitido. Se o negado passar, o CNI não está aplicando `NetworkPolicy`.
