# CVG-002C6 — processo filho/SIGKILL bounded

**Data:** 23 de agosto de 2026
**Tarefa:** `CVG-002C6`
**Resultado:** `GREEN bounded`; não promove a jornada clínica-financeira nem o ERP

## Escopo

O fixture [`apps/worker/test-fixtures/inpatient-domain-process.ts`](../../apps/worker/test-fixtures/inpatient-domain-process.ts)
é um processo Node filho real. Ele faz claim de um evento outbox com lease,
executa o comando HTTP de consumo de inventário e permite morte controlada em:

- `after_claim` — antes da mutação clínica/financeira;
- `after_domain_command_before_cas` — depois do consumo HTTP e antes do CAS de
  conclusão do outbox.

O teste [`tests/integration/process/inpatient-domain-sigkill.test.ts`](../../tests/integration/process/inpatient-domain-sigkill.test.ts)
mata o primeiro PID com `SIGKILL`, espera a lease expirar, inicia um segundo
processo e verifica takeover, replay idempotente e reconciliação SQL.

O harness cria duas roles de runtime distintas (`API` e `worker`), ambas
`LOGIN NOSUPERUSER NOBYPASSRLS`, e verifica `current_user`, `rolsuper=false` e
`rolbypassrls=false` no processo HTTP e nos dois PIDs filhos. O seed e as
asserções administrativas continuam usando a conexão de teste separada.

## Evidência

```text
REQUIRE_TEST_DB=1 pnpm exec vitest run \
  tests/integration/process/inpatient-domain-sigkill.test.ts \
  --config vitest.integration.config.ts \
  --reporter=dot \
  --no-cache \
  --no-file-parallelism \
  --hookTimeout=120000 \
  --teardownTimeout=120000

1 arquivo, 2 testes, 2 passed, exit 0, 81,65 s
```

RED inicial: a prova falhava porque o fixture de processo ainda não existia.
GREEN: os dois cenários passaram; o resultado final confirma 1 consumo, estoque
`10 → 8`, billing item de `80`, duas auditorias, um outbox derivado com
`sourceEntityId` correto, 1 request de idempotência `completed` com operação,
hash de 64 caracteres e resposta HTTP `201` decodificada, outbox original
`completed` e duas tentativas de entrega.

ESLint, Prettier e `git diff --check` passaram nos arquivos alterados.

Revisão independente read-only: **ACCEPT para esta prova bounded**. A crítica
confirmou processo/PIDs reais, `SIGKILL`, expiração/takeover de lease, replay
idempotente, completion e reconciliação persistida sob roles sem bypass de RLS;
não encontrou vacuidade relevante nem regressão no contrato outbox/UoW.

## Limitações e próximos gates

- bounded a um tenant e a uma fixture; não é uma prova A/B cross-tenant ou de
  spoofing;
- usa a API no processo do harness; apenas os workers são processos filhos;
- o evento é uma fixture de processo, não um consumer inpatient de produção;
- não cobre a jornada inteira, SPA, todos os failpoints, takeover com o processo
  A ainda vivo após B assumir, rebootstrap/hidratação de uma segunda API ou
  reconciliação de dois tenants;
- `billing_items.source_entity_id` e o valor canônico completo do `request_hash`
  ainda não têm asserção explícita;
- o teste ainda é um gate focal, fora do `pnpm test:critical`, e seu `TRUNCATE
  TABLE accounts CASCADE` depende de `fileParallelism=false`.

Próximo gate: adicionar stale-owner fencing com A vivo, ampliar a matriz para
discharge/close/receipt, failpoints cross-domain, dois tenants/hidratação e
incorporar este cenário ao CI crítico antes de qualquer promoção.
