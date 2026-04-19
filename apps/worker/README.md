# apps/worker

Worker assíncrono do CVG-HIS V2.

## Responsabilidades

- processar jobs derivados de eventos e rotinas programadas
- executar notificacoes, reconciliacoes e integracoes
- preservar rastreabilidade com `correlation_id`
- processar pending queues de operacoes assincronas (medical records, clinical entries)

## Nao responsabilidades

- burlar policies ou auditoria
- virar ponto de entrada de regra clinica sem contrato

## Superficie funcional

### Processamento de Notificacoes

- Polling de notificacoes pendentes
- Envio via canais configurados (SMS, WhatsApp, email, push)
- Atualizacao de status (pending → queued → sent/delivered/failed)

### Processamento Assincrono

- Medical records pending queue
- Clinical entries pending queue
- Reconciliacao de estado entre modulos

## Execucao

```bash
# Desenvolvimento
pnpm dev:worker

# Producao
NODE_ENV=production node apps/worker/dist/index.js
```

## Variaveis de ambiente

- `DATABASE_URL` — conexao PostgreSQL
- `WORKER_INTERVAL_MS` — intervalo entre ticks (default: 5000)
- `WORKER_HEALTH_PORT` — porta do servidor HTTP operacional (default: 3002)
- `APP_NAME` — nome do servico (default: cvg-his-v2-worker)
- `OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` — trilha de observabilidade distribuida
- `WORKER_FEATURE_FLAGS` — lista bootstrap de flags explicitas para o worker

## Dependencias

- `@cvg-his-v2/shared-config` — carregamento de configuracao
- `@cvg-his-v2/shared-logging` — logging estruturado
- `@cvg-his-v2/shared-utils` — utilitarios (sleep, correlationId)
- `@cvg-his-v2/module-notifications` — processamento de notificacoes

## Comportamento

O worker executa em loop continuo:

1. Bootstrap das dependencias (DB, repositorios)
2. A cada `WORKER_INTERVAL_MS` ms, executa um tick
3. Cada tick processa notificacoes pendentes e queues assincronas
4. Graceful shutdown via `shutdownWorkerServices()`

## Contrato operacional

- `GET /health` — payload estruturado com `liveness`, `readiness`, dependencias e estatisticas do loop
- `GET /ready` e `GET /health/ready` — pronto para trafego operacional e scraping
- `GET /live` e `GET /health/live` — processo vivo sem validar dependencias
- `GET /metrics` — Prometheus exposition format quando `Accept: text/plain`
