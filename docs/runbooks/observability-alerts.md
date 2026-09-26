# Runbook de alertas de observabilidade — CVG-HIS V2

Este runbook cobre os alertas de runtime adicionados ao contrato operacional.
Não encerre um alerta crítico apenas reiniciando o processo: preserve
correlation IDs, traces, logs e o estado das filas para a análise posterior.

<a id="entrega"></a>
## Entrega dos alertas

Os alertas do Prometheus são entregues pelo Alertmanager
(`infra/observability/alertmanager.yml`): `critical` vai ao receiver
`critical-pager` em até 10 s e repete a cada hora; `warning` vai ao
`warning-chat` em até 30 s e repete a cada 4 h. Se um alerta não chegou ao
canal:

1. `docker compose --profile observability ps alertmanager` e
   `curl -s http://127.0.0.1:9093/-/ready`.
2. `curl -s http://127.0.0.1:9093/api/v2/alerts` mostra o que o Prometheus
   entregou ao Alertmanager; se estiver vazio, o problema está na regra ou no
   scrape, não na entrega.
3. Logs do Alertmanager com `Notify for alerts failed`: `permission denied`
   indica arquivo de segredo sem leitura para o usuário do container
   (`chmod 0644`); erro HTTP indica URL do receiver inválida ou canal fora.
4. `pnpm ops:alerts:drill` reproduz a entrega ponta a ponta com um receptor
   local e grava a evidência em `artifacts/operations/`.

## Triagem comum

1. Confirme o ambiente, a instância e o horário no Grafana/Prometheus.
2. Correlacione o intervalo com `/health`, `/ready`, `/live` e `/metrics`.
3. Procure `correlationId`, `x-trace-id` e `traceparent` nos logs estruturados.
4. Se houver risco de perda ou duplicidade, pause redrive/mutações e abra um
   incidente antes de alterar dados.

<a id="redis-unhealthy"></a>
## `CVG_HIS_API_Redis_Unhealthy`

- Verifique `app_runtime_distributed_state_enabled` e `app_redis_healthy`.
- Valide conectividade DNS, TLS/credenciais e latência do Redis.
- Confirme que `/ready` permanece fechado enquanto o estado distribuído não
  estiver saudável.
- Recupere o Redis ou corrija a rota de rede; não habilite fallback em memória
  em ambiente produtivo.

<a id="database-pool-exhaustion"></a>
## `CVG_HIS_API_DatabasePoolExhaustion`

- Compare `app_database_pool_waiting_count`, `app_database_pool_total_count` e
  `app_database_pool_max_connections`.
- Investigue queries lentas, transações abertas e saturação no Postgres.
- Faça rollback/canary de mudanças recentes antes de aumentar limites sem
  confirmar capacidade do banco.

<a id="worker-unavailable"></a>
## `CVG_HIS_Worker_Unavailable`

- Verifique o pod/container do worker e seu endpoint interno `/health/ready`.
- Confirme falhas de bootstrap, migrações e credenciais do usuário worker.
- Verifique se o backlog durável está crescendo e preserve os leases antes de
  reiniciar réplicas.

<a id="worker-processing-stale"></a>
## `CVG_HIS_Worker_ProcessingStale`

- Compare `worker_last_tick_timestamp_seconds` com
  `worker_last_successful_tick_timestamp_seconds`.
- Consulte `worker_ticks_total{status=~"degraded|failed"}` e os logs do último
  `worker tick failed`.
- Investigue indisponibilidade de dependências, lock/lease, backlog e falhas de
  consumidor antes de redrive.
- Desde 26/09/2026 o próprio worker responde `503` em `/live` e `/ready` quando
  nenhum tick conclui dentro de `WORKER_LOOP_STALLED_AFTER_MS` (padrão
  `max(10 × WORKER_INTERVAL_MS, 15 min)`), e o orquestrador reinicia o pod. Se
  os reinícios se repetirem, trate como falha de dependência ou job travado e
  capture os logs do pod anterior (`kubectl logs --previous`).

<a id="worker-database-unhealthy"></a>
## `CVG_HIS_Worker_DatabaseUnhealthy`

- Compare o estado do worker com `app_database_healthy` e os logs de bootstrap.
- Verifique conectividade, credenciais, migrations e o limite do pool PostgreSQL.
- Não aceite processamento em memória como recuperação: restaure o banco ou
  remova a instância degradada do tráfego de jobs.

<a id="worker-in-memory-mode"></a>
## `CVG_HIS_Worker_InMemoryMode`

- Confirme o ambiente e o valor de `worker_persistence_mode{mode="in-memory"}`.
- Em produção, interrompa a promoção e corrija o bootstrap para obter o
  repositório durável compartilhado.
- Após a correção, valide backlog, leases e duplicidade antes de retomar o
  consumo.

<a id="worker-job-dead-lettered"></a>
## `CVG_HIS_Worker_JobDeadLettered`

- Identifique o job e a causa no repositório durável e nos logs correlacionados.
- Classifique a falha como código, dependência externa ou dado inválido.
- Só faça redrive após a causa estar corrigida e a operação autorizada; nunca
  apague a evidência da DLQ para silenciar o alerta.
