# CVG-002C6 — auditoria da jornada clínica-financeira

**Data:** 23 de agosto de 2026
**Tipo:** handoff read-only / preparação de RED
**Programa:** `CVG-002` / `CVG-002C2`
**Status:** não implementado; parent continua `IN_PROGRESS/PARTIAL`.

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

## Não-gates

Este artefato não promove `CVG-002C2`, `CVG-002B2B`, `CVG-002`, o ERP, provider,
SPA, paridade Vetus, WCAG, target operations, cobertura ou release. O cache
`packages/design-system/tsconfig.vue.tsbuildinfo` permanece fora do escopo.
