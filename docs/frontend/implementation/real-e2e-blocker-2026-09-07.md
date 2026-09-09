# Bloqueio da E2E real — 07/09/2026

## Reprodução

Comando executado:

```text
E2E_BROWSER=chromium pnpm exec playwright test e2e/spa/critical-journeys-accessibility.spec.ts --config playwright-spa.config.ts
```

O servidor de API tentou conectar a `postgres://…@127.0.0.1:5433/cvg_his_v2_test`
três vezes e recebeu `connect ECONNREFUSED 127.0.0.1:5433`. Depois do retry, o
bootstrap registrou `persistenceMode=in-memory`, `databaseHealthy=false` e
`productionReady=false`. O global setup terminou com:

```text
Error: API is not healthy after 30 seconds: Error: API reported an unhealthy runtime (unhealthy)
```

Exit observado: `1`.

## Interpretação

Este resultado é um bloqueio de ambiente para a fronteira browser-to-database,
não uma aprovação nem uma falha funcional isolada do frontend. O fallback em
memória foi explicitamente desconsiderado como prova de persistência, RLS,
idempotência ou integração clínica-financeira.

## Desbloqueio necessário

Subir PostgreSQL acessível na configuração do runner, aplicar as migrations em
base efêmera, confirmar health/readiness e executar novamente o mesmo candidato
com `productionReady=true`. Guardar log, SHA do checkout, cleanup e resultado
sem converter uma execução sintética em E2E real.
