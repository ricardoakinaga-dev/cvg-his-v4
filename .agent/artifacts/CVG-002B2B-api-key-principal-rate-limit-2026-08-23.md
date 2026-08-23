# CVG-002B2B — principal mínimo e rate limit distribuído

**Data:** 23/08/2026

**Estado:** PASS limitado; `CVG-002B2B` continua `IN_PROGRESS/PARTIAL`
**Escopo:** fronteira pré-contexto de API key, política de indisponibilidade do
rate limiter e regressões locais do slice PIX. Nenhuma credencial de provider,
ambiente alvo ou sistema de produção foi usado.

## Decisões executadas

1. O caminho de autenticação usa `ApiKeyAuthenticationPrincipal`, uma projeção
   mínima de oito campos (`id`, `accountId`, `keyHash`, `permissions`,
   `rateLimit`, `rateLimitWindow`, `expiresAt`, `isActive`). O modelo largo de
   administração não atravessa a capability pré-contexto.
2. A migration `0113_api_key_auth_boundary.sql` concede ao role
   `cvg_api_key_auth` somente essas oito colunas e reduz o retorno de
   `app.resolve_active_api_key` ao mesmo contrato. O worker continua sem acesso
   às tabelas/capability de API key.
3. Quando o estado distribuído é exigido e Redis falha ou não está configurado,
   o runtime fica em `rateLimiterMode=fail-closed` e `productionReady=false`.
   O helper devolve erro sanitizado `503 RATE_LIMIT_UNAVAILABLE`; não há
   fallback silencioso para contador em memória por processo.

## Evidência fresca

| Verificação | Resultado |
| --- | ---: |
| Mapper de principal API key | 4/4 |
| Contrato estático da migration/GRANT/RETURNS TABLE | 1/1 |
| ACL/RLS do resolver sob PostgreSQL descartável | 1/1 |
| HTTP→PostgreSQL com duas instâncias e uma janela compartilhada | 4/4; 2×201 e 6×429 em 8 requests concorrentes |
| Política operacional de modo Redis/fail-closed | 22/22 |
| Auth helper: falha de storage → 503 sem `last_used_at` | 3/3 |
| API server regressão compilada | 36/36 |
| Module PIX unit | 8/8 |
| Regressão B1 command | 17/17 |
| Regressão B2a request+dispatch | 33/33 |
| Ingress PostgreSQL | 11/11 |
| Callback HTTP PostgreSQL | 13/13 |
| Builds types/module/api | PASS |

Comandos principais executados:

```text
pnpm --filter @cvg-his-v2/module-pix run test
pnpm vitest run tests/integration/database/pix-provider-settlement-consumer.test.ts \
  tests/integration/database/pix-payment-dispatch.test.ts \
  tests/integration/database/pix-provider-event-ingress.test.ts \
  --config vitest.integration.config.ts
pnpm vitest run tests/integration/pix-provider-webhook-http.test.ts \
  --config vitest.integration.config.ts
pnpm vitest run tests/integration/database/pix-payment-attempt-command.test.ts \
  --config vitest.integration.config.ts
```

## Limitações e próximo gate

Os testes são locais e usam PostgreSQL efêmero e `local-pix` sintético. A
janela compartilhada foi exercitada em dois listeners HTTP no mesmo processo e
no mesmo banco; isso prova concorrência contra storage comum, mas não equivale
a dois processos/hosts independentes. Continua faltando uma política/benchmark
de clock skew, failover e Redis real em múltiplas réplicas. A matriz de
SIGKILL/restart de processo ainda não foi executada; takeover por pool/lease não
é equivalente a matar o processo.

Também permanecem fora desta fatia: provider homologado, SPA/B2c, paridade
Vetus (`0/11` geral e `0/3` clínica), WCAG, deploy/restore/failover em target,
SLOs e release. O próximo gate local é provar SIGKILL/restart, repetir as
regressões bounded quando necessário e só então reavaliar `VERIFIED` sem
promover o ERP geral.

## Revisão independente

Uma revisão read-only separada aprovou o slice sem bloqueadores. Ela confirmou
o `GRANT`/`RETURNS TABLE` de oito campos, o mapper/tipo, o `503` sanitizado sem
`last_used_at`, a concorrência `2×201`/`6×429` e a coerência de state/backlog/
verification. A única observação não bloqueante é que os dois listeners HTTP
compartilham o mesmo processo/runtime; portanto a prova não substitui a matriz
de processos independentes, SIGKILL/restart e failover Redis já mantida como
gap.

## Publicação

Esta fatia e seu controle documental foram publicados no commit
`099ac2a1ff5f1ed9f74812d2466dccb42681737d` em
`origin/agent/sync-v4-full-program`. O cache
`packages/design-system/tsconfig.vue.tsbuildinfo` permaneceu fora do commit.
