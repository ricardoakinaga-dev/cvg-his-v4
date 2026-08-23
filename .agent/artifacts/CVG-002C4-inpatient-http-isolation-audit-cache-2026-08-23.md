# CVG-002C4 — isolamento HTTP da internação e recuperação do cache de auditoria

**Data:** 23 de agosto de 2026
**Programa:** `CVG-002` / `CVG-002C2`
**Branch:** `agent/sync-v4-full-program`
**Implementação:** `c647db1` — `fix: harden inpatient tenant isolation and audit rollback cache`

## Objetivo limitado

Fechar duas lacunas apontadas na revisão da cobrança diária HTTP:

1. provar com dois tokens reais que leituras, escritas e idempotência da
   internação seguem a conta derivada do bearer token, mesmo quando os headers
   `x-tenant-id` e `x-account-id` tentam apontar para a conta A;
2. remover do cache quente do `AuditService` um evento escrito antes de um
   rollback tardio da UoW, sem consultar o cliente PostgreSQL já abortado.

Este artefato não certifica a jornada clínica-financeira completa nem o ERP.

## RED → GREEN

O RED da rota adicionou uma expectativa de `audit.refreshFromDatabase(...)` no
catch de uma falha tardia. Contra a implementação anterior, a suíte de rota
passou `12/13` e falhou no novo seam (`0 !== 1`). O GREEN:

- adiciona `AuditService.refreshFromDatabase(accountId?)`, que reidrata as
  linhas commitadas da conta e conserva eventos de outras contas;
- agenda a reidratação quando a rota ainda está dentro do contexto da UoW;
- usa `runWithoutDatabaseTransactionScope(...)` para que o callback agendado
  não herde o `AsyncLocalStorage` cujo cliente já sofreu rollback;
- mantém o caminho síncrono para chamadores unitários sem UoW externa;
- adiciona teste com o `AuditService` real: um `bill_daily_charge` inserido no
  cache antes da exceção deixa de aparecer depois do rollback.

## Prova HTTP A/B

O teste PostgreSQL efêmero
`tests/integration/database/inpatient-daily-charge-bill-http-postgres.test.ts`
semeia uma conta A e uma conta B, autentica os dois usuários e usa o token B
com headers falsificados da conta A. A matriz passou `4/4`:

- B fatura a própria diária com `200`, billing item e idempotência sob B;
- a worklist de B contém a diária de B e não a diária pendente de A;
- a leitura da stay de A com token B retorna `404`;
- a tentativa de faturar a diária pendente de A com token B retorna `404`, sem
  billing item, alteração de status ou linha de idempotência estrangeira.

As consultas SQL finais confirmam `foreignBillingItems=1`,
`foreignChargeStatus='billed'`, `primaryBillingItems=0`,
`primaryChargeStatus='pending'`, uma idempotência concluída em B e zero linhas
para a tentativa negada.

## Evidência executada

```text
route unit/source tests: 14/14
AuditService: 19/19
module-inpatient: 17/17
module-billing: 16/16
HTTP PostgreSQL A/B: 4/4
rollback + idempotency regressions: 3/3
API/shared-database/module-audit typecheck: PASS
API build: PASS
Prettier, git diff --check: PASS
```

Os testes de integração usaram bases PostgreSQL efêmeras e não tocaram
produção, credenciais ou provedores externos. O cache gerado e user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` ficou fora do commit.

## Limites e retomada

- `AuditRepository.list` conserva o limite padrão de 100 eventos; uma futura
  revisão pode introduzir uma leitura paginada/`listAll` para reidratação sem
  truncamento em contas com histórico maior.
- O slice não fecha admissão, handoff/permanência, consumo de estoque, alta,
  recebimento/ledger, outbox, SPA/B2c, paridade Vetus, WCAG, provider real,
  Redis failover entre processos, operações target-like, cobertura global ou
  release.
- O estado canônico permanece `IN_PROGRESS/PARTIAL`; a próxima fatia é a
  jornada admissão → handoff/permanência → inventário → alta → billing →
  recebimento/ledger/auditoria/outbox com replay, concorrência, failpoints e
  RLS.
