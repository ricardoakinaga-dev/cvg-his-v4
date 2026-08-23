# CVG-002C3 — HTTP/UoW da cobrança diária de internação

## Escopo

Esta fatia fecha somente a fronteira publicada de
`POST /inpatient/:stayId/daily-charges/:chargeId/bill`. Ela não promove a
jornada clínica-financeira completa, o ERP, paridade Vetus, produção ou
release.

## Implementação

- A rota mantém replays de uma diária já faturada dentro de `runCommand`,
  preservando a fronteira tenant-aware e a idempotência do wrapper HTTP.
- O `catch` de falhas de comando não tenta consultar PostgreSQL usando uma
  transação HTTP já abortada. Quando existe um escopo transacional externo, a
  reidratação de `InpatientService` e `BillingService` é adiada para depois do
  rollback; fora desse escopo, a atualização continua síncrona para preservar
  os contratos unitários.
- A reidratação lê primeiro o estado commitado e só substitui os caches quentes
  depois que as leituras terminam, evitando que uma falha parcial esvazie o
  processo.

Arquivos principais:

- `apps/api/src/routes/inpatient-routes.ts`
- `apps/api/src/routes/inpatient-routes.test.ts`
- `packages/modules/billing/src/index.ts`
- `packages/modules/inpatient/src/index.ts`
- `tests/integration/database/inpatient-daily-charge-bill-http-postgres.test.ts`

## Evidência reproduzida

```text
API build: PASS
rota compilada: 13/13
module-inpatient: 17/17
module-billing: 16/16
HTTP/PostgreSQL: 3/3
git diff --check: PASS
```

A integração real autenticou o tenant descartável e comprovou:

1. primeiro POST `200`, replay com a mesma `Idempotency-Key` devolvendo o
   mesmo resultado e chave divergente retornando `409` sem segunda cobrança;
2. failpoint PostgreSQL entre a criação do item de billing e a marcação da
   diária revertendo item/registro, deixando a diária `pending`, sem vínculo e
   sem idempotência concluída;
3. duas requisições concorrentes com a mesma chave convergindo para uma única
   linha de billing e uma única linha de idempotência.

O teste usa constraint temporária apenas no banco descartável para forçar o
   rollback. Não há limpeza destrutiva de tabelas append-only em ambiente
   persistente.

## Limites e retomada

Ainda faltam a matriz HTTP A/B específica da internação, inspeção dedicada do
cache de auditoria em falha tardia e a jornada admissão → handoff/permanência →
estoque → alta → billing → recebimento/ledger/auditoria/outbox com PostgreSQL,
RLS, replay, concorrência e failpoints. Redis failover entre processos,
provider real, SPA/B2c, paridade Vetus, WCAG, operações alvo, cobertura global e
release continuam gates separados.

Publicação do código: `9a93ebc` (`fix: harden inpatient daily-charge HTTP
billing`) em `origin/agent/sync-v4-full-program`. O arquivo
`packages/design-system/tsconfig.vue.tsbuildinfo` é cache user-owned e deve
continuar fora de commits.
