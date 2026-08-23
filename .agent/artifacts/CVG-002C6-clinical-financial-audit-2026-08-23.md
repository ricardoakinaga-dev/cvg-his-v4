# CVG-002C6 — auditoria da jornada clínica-financeira

**Data:** 23 de agosto de 2026
**Tipo:** handoff + evidência de implementação bounded
**Programa:** `CVG-002` / `CVG-002C2`
**Status:** slice CVG-002C6 implementado e verificado; parent continua
`IN_PROGRESS/PARTIAL`.

## Objetivo do registro

Preservar para outra sessão o resultado da leitura integral do corpus, da
auditoria independente da jornada e da pesquisa de mercado, sem transformar
documentação ou existência de rota em evidência de paridade ou release.

## Inventário observado antes deste registro

- `docs/`: 1.450 arquivos;
- textuais/binários: 1.194 / 256;
- bytes totais: 53.810.236;
- JSON analisados: 129;
- assinaturas PNG reconhecidas: 255;
- gzip validado: PASS.

A inclusão deste artefato e do handoff altera naturalmente a contagem futura.
O inventário histórico e a precedência estão em
`.agent/artifacts/document-corpus-audit.md` e `docs/README.md`.

## Decisão independente

**REJECT para a jornada completa.** O código possui slices úteis, mas não uma
prova única contra PostgreSQL real ligando atendimento/internação, consumo,
charge capture, alta, recebimento, ledger, auditoria e outbox sob a mesma
semântica de tenant, replay, concorrência e rollback.

## Evidência apontada

| Fronteira | Evidência atual | Limite |
| --- | --- | --- |
| admission/stay | `apps/api/src/routes/inpatient-routes.ts` | não fecha billing/receipt em uma jornada |
| handoff/permanência | `apps/api/src/server.ts` e teste de handoff | prova isolada |
| consumo | `apps/api/src/routes/inventory-routes.ts` e `packages/modules/inventory/src/index.ts` | não cria item financeiro/outbox |
| diária/billing | `apps/api/src/routes/inpatient-routes.ts` | fonte `inpatient_daily_charge`, não `inventory_consumption` |
| discharge | `apps/api/src/routes/discharges-routes.ts` | unidade clínica/auditável separada |
| cash receipt | `apps/api/src/encounter-cash-receipt-repository.ts` | não recebe consumo como origem |

## Qualidade mínima para o próximo RED

O teste sugerido é
`tests/integration/database/inpatient-inventory-charge-capture-http-postgres.test.ts`.
Ele deve usar endpoints públicos, bearer real, PostgreSQL descartável e dois
tenants. O primeiro RED precisa expor a ausência de charge capture de consumo
sem depender de provider externo. O GREEN só pode ser aceito depois de
demonstrar:

- consumo e movimento de lote únicos e tenant-scoped;
- item de billing originado deterministicamente pelo consumo;
- replay same-key idêntico, conflito de payload e corrida distinct-key;
- rollback em cada boundary de escrita;
- discharge posterior e receipt com settlement, journal, audit e outbox
  correlacionados;
- negação opaca para o tenant B em recursos de A.

Preço de venda, custo, catálogo e charge capture são decisão de domínio; o
teste deve deixar a lacuna explícita em vez de escolher silenciosamente um
preço incorreto.

## Atualização de execução — CVG-002C6 (23/08/2026)

O RED foi executado e falhou pela ausência de captura financeira: a primeira
execução HTTP/PostgreSQL passou o consumo clínico, mas encontrou
`billingItems=0` e `billingRecords=0` enquanto o consumo/movimento/idempotência
já estavam persistidos. A implementação foi então publicada no commit
`ef4ee2d` (`feat: capture inpatient inventory charges`).

### GREEN bounded comprovado

- `POST /inventory/consumptions` agora exige uma stay inpatient tenantizada e
  com o mesmo encounter antes de consumir estoque;
- o item de estoque tem `chargeUnitPriceAmount` separado de
  `unitCostAmount`, nullable para itens ainda não precificados e estritamente
  positivo quando configurado;
- o consumo inpatient cria um `billing_item` `supply` com
  `source_entity_type=inventory_consumption`, preço determinístico e índice
  parcial único por conta/origem;
- consumo, movimento, billing item/record e as auditorias ficam no mesmo
  comando/UoW HTTP; falhas reidratam os caches depois do rollback;
- o CAS de estoque emite conflito estruturado e reidrata/re tenta uma vez,
  permitindo duas chaves distintas concorrentes sem saldo perdido;
- a função de trigger SQL mantém o cutoff pós-alta e agora rejeita stay
  inexistente (`23503`), encounter incompatível (`23514`) e referência de
  stay de outro tenant como “não encontrada”.

### Evidência executada

| Verificação | Resultado |
| --- | ---: |
| `inpatient-inventory-charge-capture-http-postgres.test.ts` | 3/3 |
| `inpatient-discharge-cutoff.test.ts` | 4/4 |
| `@cvg-his-v2/module-inventory` | 21/21 + typecheck |
| `@cvg-his-v2/module-billing` | 16/16 + typecheck |
| shared contracts / API typecheck | PASS |
| OpenAPI | 337 paths / 390 schemas |
| `pnpm audit --audit-level=high` | sem vulnerabilidades conhecidas |
| `git diff --cached --check` antes do commit | PASS |

O teste HTTP prova replay same-key, duas chaves distintas com `201/201`, três
consumos/movimentos/billing items, total faturado `240`, saldo `4`, rejeição
opaca A/B e ausência de mutação para item sem preço. O teste SQL de cutoff
prova também stay inexistente, encounter divergente e referência cross-tenant.

### Limites honestos para a retomada

Este é um incremento bounded, não a jornada clínica-financeira completa. O
endpoint ainda não fecha discharge, cash receipt, journal ou outbox na mesma
jornada pública; o teste C6 não declara evento de outbox por consumo. Também
permanece sem teste dedicado de conflito de payload para a mesma
`Idempotency-Key`, CRUD unitário específico do novo preço e rollback/failpoint
em cada escrita. O Quality Bar, CVG-002C6, CVG-002, CVG-002B2B e o ERP geral
continuam `IN_PROGRESS/PARTIAL`; provider, Redis failover real, SPA/B2c,
paridade Vetus, WCAG, target operations, cobertura, deploy/restore e release
continuam gates separados.

## Não-gates

Este artefato não promove `CVG-002C2`, `CVG-002B2B`, `CVG-002`, o ERP, provider,
SPA, paridade Vetus, WCAG, target operations, cobertura ou release. O cache
`packages/design-system/tsconfig.vue.tsbuildinfo` permanece fora do escopo.

## Publicação

O código bounded está em `ef4ee2d` e a reconciliação documental foi publicada
em `e480952`. `git fetch` confirmou `HEAD == origin/agent/sync-v4-full-program`
em `e480952bb8ec55f288ab48f8982f0510b9f9d05d`; o checker canônico ficou em
11 PASS, 1 WARN histórico e 0 FAIL. O cache user-owned de tsbuildinfo ficou
fora do commit.

## C6-NEXT — fechamento público transacional até recebimento (23/08/2026)

### RED observado

O novo teste
`tests/integration/database/inpatient-clinical-financial-close-receipt-http-postgres.test.ts`
foi escrito contra HTTP real e PostgreSQL efêmero. Antes do GREEN, o close
reproduzia a ausência de `outbox_events` para `encounter.closed` e a corrida
de chaves distintas retornava dois `200`, apesar de o recebimento isolado já
estar coberto.

### GREEN executado

O `POST /encounters/:id/close` agora:

- valida o payload canônico obrigatório `closeReason`;
- bloqueia a linha do encounter dentro da transação para que a segunda chave
  concorrente observe `closed` e receba `409`;
- aguarda update e timeline antes de auditar;
- grava auditoria e outbox `encounter.closed` no mesmo UoW, removendo o evento
  do cache se a transação falhar e reidratando o cache após o rollback;
- mantém replay/conflict pelo envelope HTTP/UoW já aplicado pelo dispatcher.

O contrato Zod foi alinhado a `closeReason` obrigatório/estrito e o OpenAPI
passou a declarar `Idempotency-Key` e `409`.

### Evidência fresca

| Verificação | Resultado |
| --- | ---: |
| `inpatient-clinical-financial-close-receipt-http-postgres.test.ts` | **4/4** |
| close replay/conflito same-key | **200/200/409** |
| corrida de chaves distintas | **200/409**, uma timeline/audit/outbox |
| receipt após close | **201 + replay 201**, billing settled, payment, caixa e journal debit=credit=125.50 |
| tenant B / headers falsos | **404**, sem mutação de A |
| API typecheck | **PASS** |
| contracts `src/__tests__/contracts.test.ts` | **43/43** |
| `pnpm validate:openapi` | **337 paths / 390 schemas** |
| `git diff --check` | **PASS** |

### Limites e próxima ação

O teste usa billing mínimo semeado para provar a costura close→receipt; não
certifica admissão/handoff nem cria outbox para o consumo de inventário. Ainda
faltam failpoints por escrita, outbox do C6 inventory, rollback tardio
cross-domain, cursor de auditoria e uma jornada única admission→consumo→alta→
receipt. O próximo RED deve cobrir a ausência de outbox no
`POST /inventory/consumptions`, preservando este close/receipt como regressão.

O Quality Bar, `CVG-002C6`, `CVG-002` e o ERP continuam
`IN_PROGRESS/PARTIAL`; nenhum gate externo, de produção ou release foi
promovido.

## Hardening local — closeReason, rollback e inventory outbox (23/08/2026)

O review classificou como HIGH a ausência de persistência de `closeReason` e
rollback incompleto da timeline/cache; MEDIUMs foram o ID tardio de auditoria
e o OpenAPI subespecificado. O patch adiciona `0119_encounter_close_reason`,
atualiza os dois schemas Drizzle e o repositório, implementa
`snapshotState`/`restoreState`, captura o audit ID antes do `await` e alinha o
contrato público.

`inpatient-clinical-financial-close-receipt-http-postgres.test.ts` passou
**5/5** com PostgreSQL efêmero e duas instâncias. O failpoint de constraint
retorna `500` sem encounter/timeline/audit/outbox/idempotência persistidos e
GET posterior confirma status aberto; o caso feliz confirma `close_reason` no
SQL, além de replay/conflict, corrida, receipt/journal e tenant B.

O evento `inventory.consumption.created` foi catalogado e appendado no mesmo
UoW do consumo inpatient, billing e auditoria. O repositório CAS reutiliza o
transaction context ativo. A integração de charge capture passou **3/3** e
verifica três outbox events. O primeiro run expôs `201/409` na corrida; após a
correção de transação interna, a assertiva original `201/201` voltou a passar.

Typechecks API/encounters/inventory/event-bus, contracts `43/43` e OpenAPI
`337/390` passaram. Este registro ainda aguarda review final, checker, audit,
diff check, commit e push. A jornada maior permanece `REJECT` e
`IN_PROGRESS/PARTIAL`, com failpoints/restart cross-domain, admission/handoff,
paginação, Redis, providers, SPA/B2c, paridade, WCAG, operações, cobertura,
deploy/restore e release como gates separados.

### Boundary adicional — scheduling e fail-closed

O rollback do close agora restaura também `QueueEntrySummary` e o appointment
ligado, além de agendar `SchedulingService.hydrateFromDatabase()` fora do
escopo transacional. Para o risco de outbox omitido em runners alternativos,
`POST /inventory/consumptions` recusa mutação PostgreSQL sem
`getTenantTransactionContext()` com `503 TRANSACTION_REQUIRED`; em memória o
fallback segue permitido. O único residual de consistência é a hidratação
posterior best-effort para alterações externas concorrentes, explicitamente
fora do bounded proof.
