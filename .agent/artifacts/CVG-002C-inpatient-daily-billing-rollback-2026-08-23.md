# CVG-002C — rollback de diária clínica e item de billing

## Escopo

Esta fatia fecha somente a fronteira `POST /inpatient/:stayId/daily-charges/:chargeId/bill`.
Ela não certifica a jornada completa de admissão até recebimento, nem a SPA,
paridade Vetus, provedores, WCAG, operações alvo ou release.

## RED → GREEN

O RED inicial foi adicionado em `apps/api/src/routes/inpatient-routes.test.ts`:
o endpoint ignorava o `runCommand` injetado e executava `billing.addItem` e
`markDailyChargeBilled` fora da fronteira de comando. A execução inicial falhou
com `commandCalls 0 !== 1`.

O GREEN implementado:

- `InpatientRoutesHandlers` aceita `runCommand?: TenantCommandRunner`;
- o servidor injeta `runTenantCommand` na rota de internação;
- cobrança de diária usa a operação `inpatient.daily-charges.bill`;
- `billing.addItem`, vínculo da diária, espera de persistência e auditoria
  `writeAndWait` ficam dentro da mesma operação;
- falha do comando reidrata os caches de Billing e Inpatient a partir do estado
  confirmado no PostgreSQL, evitando retry sobre item/diária fantasma.

## Evidência executável

- `pnpm exec tsx --test apps/api/src/routes/inpatient-routes.test.ts` — 12/12;
  inclui o seam transacional e a recuperação dos caches após rollback.
- `TEST_DB_SUFFIX=inpatient_daily_charge_rollback_after_cache pnpm exec vitest run tests/integration/database/inpatient-daily-charge-billing-rollback.test.ts --config vitest.integration.config.ts --reporter=verbose` — 1/1 em PostgreSQL descartável com migrations 0000..0116.
- `pnpm --filter @cvg-his-v2/module-billing test` — 16/16.
- `pnpm --filter @cvg-his-v2/module-inpatient test` — 17/17.
- `pnpm --filter @cvg-his-v2/api run typecheck` — PASS, incluindo builds dos
  módulos dependentes.
- `git diff --check` — PASS.

O cenário PostgreSQL injeta falha imediatamente após `billing.addItem` dentro de
`createTenantUnitOfWork(getPool())`. A consulta final confirmou:

```text
billing_items=0
billing_records=0
inpatient_daily_charges.billing_record_id=NULL
inpatient_daily_charges.status=pending
```

## Decisões e limitações

- A idempotência por origem da migration `0115` continua necessária; esta fatia
  prova atomicidade/rollback, não a concorrência HTTP completa.
- O `runTenantCommand` depende de `Idempotency-Key` em ambientes production-like;
  testes unitários continuam usando fallback direto para preservar mocks.
- O cache é uma otimização local; PostgreSQL continua a autoridade após falha.
- O teste usa provider nenhum e banco descartável; não há mutação externa.
- O próximo slice deve encadear admissão → handoff/permanência → consumo de
  estoque → cutoff de alta → item/recebimento/ledger/audit/outbox, além de
  uma matriz RLS A/B e replay/concurrency HTTP real.

## Revisão independente pós-publicação

Não foi encontrado P0. Permanecem dois pontos de continuidade:

- **P1:** falta uma integração HTTP usando o `runTenantCommand` real com
  `Idempotency-Key`; a prova atual chama a UoW diretamente e os fallbacks de
  teste/desenvolvimento podem permitir execução fora da transação quando o
  header não está presente.
- **P2:** o cache em memória de auditoria pode registrar o evento antes de uma
  falha tardia e sobreviver ao rollback do banco. Avaliar invalidação/reload no
  `catch` ou publicação do evento em cache somente depois do commit.

Esses itens são limites conhecidos, não uma promoção de prontidão. O próximo
RED deve provar a rota HTTP, replay, concorrência e isolamento entre tenants.
