# 0212 - RELATORIO DE EXECUCAO - RATE LIMITER REDIS - 2026-04-13

Data UTC: `2026-04-13T20:57:06Z`

## Fonte de verdade utilizada

- `docs/Enterprise/0190-MASTER-TRILHA-PREMIUM-ENTERPRISE-CVGHISV2.md`
- `docs/Enterprise/0192-ROADMAP-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0193-BACKLOG-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md`
- `docs/Enterprise/0196-MATRIZ-STATUS-REAL-PROJETO-PREMIUM-ENTERPRISE-2026-04-12.md`
- `docs/ENTERPRISE-BUILD-REPORT.md`

Leitura aplicada:

- `IMP-201`: migrar limiter para backend Redis.
- `IMP-202`: manter fallback seguro quando Redis estiver indisponivel.
- Escopo atual: autenticao/API, sem expandir para feature flags ou outros usos de Redis.

## Arquitetura implementada

Foi implementado um `RateLimiter` com backend configuravel:

- `memory`: comportamento anterior, agora com contrato `async`.
- `redis`: caminho distribuido real usando cliente RESP minimo implementado no proprio package, sem dependencia externa nova.
- `fallback`: se o backend configurado for `redis` e a conexao falhar, a operacao recai para store em memoria.

Detalhes tecnicos relevantes:

- O package `@cvg-his-v2/shared-rate-limiter` agora suporta:
  - `backend`
  - `redisUrl`
  - `redisKeyPrefix`
  - `redisConnectTimeoutMs`
  - `fallbackToMemory`
  - `onStateChange`
- O contador distribuido usa `EVAL` com script atomico em Redis para `INCR + PEXPIRE + PTTL`.
- O runtime do limiter expoe `getRuntimeState()` para observabilidade do backend ativo e do estado de fallback.
- A API passou a injetar backend/config Redis via `shared-config`.
- Os endpoints `/auth/login` e `/auth/login/mfa` agora usam `await authRateLimiter.check(...)`.
- A API registra:
  - configuracao inicial do limiter
  - troca de backend efetivo quando fallback ativa ou quando Redis volta a responder

## Estrategia de fallback

Fallback adotado:

- Se `AUTH_RATE_LIMIT_BACKEND=redis` e `REDIS_URL` estiver valido, o caminho principal passa a ser Redis-backed.
- Se Redis estiver indisponivel em runtime, o limiter muda para `memory` e marca:
  - `fallbackActive=true`
  - `activeBackend=memory`
  - `lastRedisError=<erro mais recente>`
- Se Redis voltar, o limiter tenta novamente o backend distribuido na proxima operacao e limpa o estado de fallback ao recuperar.

Protecoes implementadas:

- `loadApiConfig` agora exige `REDIS_URL` quando `AUTH_RATE_LIMIT_BACKEND=redis`.
- Prefixo de chave Redis dedicado para auth limiter: default `rate-limit:auth`.
- Reset distribuido suportado via `SCAN + DEL` limitado ao prefixo do limiter.

## Arquivos alterados

- `packages/shared/rate-limiter/src/index.ts`
- `packages/shared/rate-limiter/src/rate-limiter.test.ts`
- `packages/shared/config/src/index.ts`
- `packages/shared/config/src/config.test.ts`
- `apps/api/src/index.ts`
- `apps/api/src/server.ts`
- `apps/api/src/server.test.ts`
- `tests/integration/rate-limiting.test.ts`

## Validacoes executadas

Executado com sucesso:

- `pnpm --filter @cvg-his-v2/shared-rate-limiter build`
- `pnpm --filter @cvg-his-v2/shared-rate-limiter test`
- `pnpm --filter @cvg-his-v2/shared-config build`
- `pnpm --filter @cvg-his-v2/shared-config test`
- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/api build`
- `pnpm --filter @cvg-his-v2/api test`

Resultado:

- `shared-rate-limiter`: `PASS`
- `shared-config`: `PASS`
- `api typecheck`: `PASS`
- `api build`: `PASS`
- `api test`: `50/50 PASS`

Limitacao encontrada:

- `pnpm exec vitest run tests/integration/rate-limiting.test.ts` nao executa hoje porque o `vitest.config.ts` do repositorio inclui apenas `packages/db/src/**/*.test.ts`, `packages/tenant-context/src/**/*.test.ts` e `tests/unit/**/*.test.ts`.
- O arquivo `tests/integration/rate-limiting.test.ts` foi atualizado para o novo contrato async, mas nao entrou na malha de execucao padrao do Vitest atual.

## Riscos remanescentes

- Durante fallback, o bucket em memoria nao compartilha estado com Redis. Isso preserva disponibilidade, mas reduz consistencia distribuida enquanto o Redis estiver fora.
- O cliente Redis atual e propositalmente minimo e focado no limiter. Ainda nao ha pooling, healthcheck dedicado ou metricas especificas por operacao.
- O runtime distribuido foi aplicado apenas ao auth limiter. Outros estados ainda continuam locais em partes do programa.
- `apps/api/src/server.ts` continua concentrando muita responsabilidade; o limiter entrou sem extracao estrutural maior para respeitar o escopo.

## Proximos passos

1. Extrair a composicao do auth limiter de `apps/api/src/server.ts` para um bootstrap proprio de runtime.
2. Adicionar metricas explicitas para `rate_limiter_backend`, `rate_limiter_fallback_total` e latencia/erro de Redis.
3. Expandir o backend Redis para outros pontos de estado compartilhado planejados em runtime enterprise.
4. Introduzir feature flag para habilitar o backend Redis por ambiente/tenant com rollout gradual.
5. Ajustar o `vitest.config.ts` ou criar projeto dedicado de integracao para que `tests/integration/rate-limiting.test.ts` rode na esteira padrao.

## Melhorias recomendadas

- Substituir o cliente RESP minimo por um adaptador interno mais reutilizavel quando Redis passar a suportar outras capacidades do runtime.
- Registrar alertas operacionais quando `fallbackActive=true` por janela prolongada.
- Cobrir reconexao e flapping de Redis com testes adicionais de resiliencia.
- Consolidar configuracao Redis compartilhada em `shared-config` para evitar proliferacao de chaves por modulo.
