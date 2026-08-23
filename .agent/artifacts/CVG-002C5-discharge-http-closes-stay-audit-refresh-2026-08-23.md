# CVG-002C5 — alta HTTP fecha internação e reidrata auditoria

**Data:** 23 de agosto de 2026
**Programa:** `CVG-002` / `CVG-002C2`
**Branch:** `agent/sync-v4-full-program`
**Implementação:** `db73cb72ac5d36e24030651959cdcc18ec1d82d9` — `fix: close inpatient stay on discharge and preserve audit cache`

## Escopo congelado

Esta fatia fecha somente a fronteira HTTP/PostgreSQL de alta. O quality bar
aceito para ela é:

1. dois tenants, dois tokens bearer e autoridade derivada do token, ignorando
   headers `x-tenant-id`/`x-account-id` falsificados;
2. alta inpatient fecha a `inpatient_stay` ativa na mesma transação do
   `discharge`, registra auditoria e bloqueia nova diária;
3. replay com a mesma `Idempotency-Key` retorna o mesmo corpo e uma chave
   divergente não cria uma segunda alta;
4. rollback tardio não deixa alta, fechamento, auditoria, idempotência ou
   entrada de cache fantasma;
5. alta não-inpatient também rejeita `encounterId` de outra conta;
6. duas instâncias concorrentes convergem para um único discharge e a corrida
   de índice único retorna `409`, não `500`;
7. a reidratação de auditoria não trunca a conta no limite histórico default
   de 100 eventos.

O artefato não certifica a jornada ERP completa.

## RED → GREEN

- O RED HTTP inicial deixou a stay `admitted` após `POST /discharges`, aceitou
  rollback como `201` e permitiu alta `ambulatory` cross-tenant.
- O RED do cache inseriu 101 eventos commitados e um evento revertido; a
  implementação anterior retornou somente 100.
- O RED do runner mostrou que, sem chave de idempotência, o servidor poderia
  cair em persistência direta mesmo com repositórios SQL.

O GREEN introduziu:

- guarda de encounter por conta para todos os tipos de alta;
- comando tenant-aware que cria discharge, fecha stay e aguarda persistência e
  auditoria na mesma UoW;
- fallback `tenantTransaction` explícito para runtime SQL sem `unitOfWork`,
  mantendo o caminho em memória sem banco para testes locais;
- limpeza de caches por identidade em rollback e reidratação fora do escopo
  transacional apenas quando nenhuma identidade já foi obtida;
- `AuditRepository.listForCacheRefresh` sem o truncamento de 100 linhas,
  filtrado por conta no repositório PostgreSQL;
- conversão da violação única `discharges_account_encounter_unique` em
  `ConflictError`/HTTP 409;
- OpenAPI alinhado ao comportamento de alta e aos campos clínicos de
  `CreateDischargeRequest`/`UpdateDischargeRequest`.

## Evidência executada

```text
HTTP PostgreSQL discharge, rollback, A/B, non-inpatient guard and two-instance race: 5/5
AuditService + module-discharges: 31/31
Daily-charge HTTP + cash-receipt HTTP regressions: 6/6
Tenant-command compiled tests: 5/5
API build: PASS
API typecheck: PASS
module-audit, module-discharges, module-inpatient typecheck: PASS
OpenAPI YAML structural parse: PASS
Prettier targeted checks: PASS
git diff --check: PASS
```

Os testes PostgreSQL criaram bancos efêmeros, executaram migrations `0000` a
`0116` e não usaram credenciais de provider nem sistemas externos.

## Arquivos centrais

- `apps/api/src/routes/discharges-routes.ts`
- `apps/api/src/server.ts`
- `apps/api/src/index.ts`
- `apps/api/src/helpers/tenant-command.ts`
- `apps/api/src/openapi.yaml`
- `packages/modules/discharges/src/index.ts`
- `packages/modules/inpatient/src/index.ts`
- `packages/modules/audit/src/index.ts`
- `packages/modules/audit/src/repositories/database-audit.repository.ts`
- `tests/integration/database/inpatient-discharge-http-postgres.test.ts`

## Revisão independente

A revisão de seguimento confirmou que os achados HIGH de autorização e corrida
de cache foram fechados no caminho com UoW. O risco de persistência parcial sem
UoW foi resolvido com `tenantTransaction`; a corrida de chaves distintas foi
exercitada com dois listeners HTTP e convergiu para `201` + `409`.

## Limites preservados

- `listForCacheRefresh` evita o limite de 100, mas ainda materializa a fatia
  inteira de uma conta; paginação/cursor continua follow-up operacional.
- A jornada única admissão → handoff/permanência → inventário → alta → billing
  → recebimento/ledger/auditoria/outbox ainda não existe como prova vertical.
- Redis failover entre processos, provider real, SPA/B2c, paridade Vetus,
  WCAG, operações target-like, cobertura global e release continuam abertos.
- O cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo` fica
  fora do stage e do commit.
