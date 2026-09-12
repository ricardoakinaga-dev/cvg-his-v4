# Diagnóstico do gate de performance

O job `Performance (k6 SLOs)` mantém o perfil e os thresholds congelados e
publica `performance-diagnostics.json` junto do relatório k6. O coletor roda
em paralelo ao teste, registra amostras no início, durante a carga e no
encerramento, e é best effort: uma falha na coleta não transforma um resultado
de carga em verde.

Cada amostra contém:

- SHA do checkout, perfil de carga, capacidade declarada do pool e origem do
  alvo;
- agregados de `pg_stat_activity` e `pg_stat_database`, incluindo sessões
  ativas, esperas, conexões máximas, commits, leituras, cache hit, temporários e
  deadlocks;
- carga, memória, cgroup, `vmstat`, `iostat`, sockets, processos e espaço em
  disco do runner;
- estado da coleta (`PASS`, `PARTIAL` ou `SKIPPED`) e códigos de erro por
  consulta quando o banco não puder ser observado.

O artefato não registra texto SQL, payloads HTTP, o ambiente completo nem
credenciais. A URL do PostgreSQL é persistida somente com usuário e senha
redigidos. `PARTIAL` descreve a qualidade da observação e nunca substitui a
decisão do SLO.

O resumo do k6 também lista as tendências de latência por endpoint que já
fazem parte do relatório (`query_patients_list_latency_ms`,
`query_patient_detail_latency_ms`, `inventory_read_latency_ms` e
`inventory_create_latency_ms`), além da latência do health check. Isso permite
separar uma cauda de consulta, mutação ou readiness da métrica agregada antes
de alterar índice, pool ou threshold.

Para reproduzir a coleta fora do CI:

```bash
TARGET=http://localhost:3001 \
DATABASE_URL='postgres://postgres@localhost:5433/cvg_his_v2_test' \
LOAD_PROFILE=operational-minimum-v1 \
node scripts/capture-performance-diagnostics.mjs \
  --phase local \
  --output /tmp/performance-diagnostics.json
```

Um restore, target ou runner que não esteja acessível deve permanecer
`NOT_RUN`/`PARTIAL` no dossiê de release. O diagnóstico ajuda a investigar a
causa; ele não autoriza promover uma execução remota que falhou.
