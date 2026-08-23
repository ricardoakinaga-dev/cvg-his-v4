# Handoff da sessão atual — CVG-HIS v4

**Data:** 23 de agosto de 2026, 12:21 BRT
**Objetivo:** preservar o estado reproduzível para continuar em outra sessão.
**Conclusão:** documentação reconciliada; o ERP continua `IN_PROGRESS/PARTIAL`.

## Retomada imediata

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git fetch origin agent/sync-v4-full-program
git status --short
git log -1 --oneline
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

O branch local e o remoto estavam alinhados em `6ae674d8ab0a11ffa6a2674cb0e175175833d4bd` durante esta reconciliação. O único caminho fora do commit é o cache gerado e user-owned:
`packages/design-system/tsconfig.vue.tsbuildinfo`. Ele deve permanecer fora de stage, commit, limpeza ou reversão.

## Estado canônico

- Tarefa ativa: `CVG-002C6` — jornada clínica-financeira inpatient.
- Estado: `BUILD / VERIFY`, `IN_PROGRESS / PARTIAL`; próximo gate: `VERIFIED`.
- Quality Bar: congelado, sem promoção global.
- Fonte operacional: [`state.json`](../.agent/state.json), [`backlog.json`](../.agent/backlog.json), [`premium-enterprise-mvp.md`](../.agent/plans/premium-enterprise-mvp.md) e [`state.md`](../.gauntlet/state.md).
- Precedência documental: comportamento executado/testes e estado persistido → código/contratos → camada ativa de agosto → arquitetura/ADRs → auditorias antigas → Vetus → `docs2/`. A regra está em [`README.md`](README.md).

## O que já foi feito e possui evidência limitada

As fatias abaixo estão publicadas e não devem ser refeitas sem uma regressão nova:

- PIX/B1/B2a/B2b: ingestão, worker, fencing, restart/SIGKILL bounded, DLQ operacional, principal mínimo e rate-limit fail-closed.
- `CVG-002C`: diária inpatient idempotente, cobrança e rollback entre billing e diária.
- `CVG-002C2/C3/C4/C5`: recibo de caixa HTTP/UoW, cobrança diária HTTP, isolamento A/B, auditoria após rollback e alta que fecha a stay.
- `CVG-002C6`: preço assistencial separado do custo, consumo inpatient com `billing_item` de origem `inventory_consumption`, replay/concurrency, trigger de integridade stay/encounter/pós-alta e `inventory.consumption.created` no outbox ativo.
- C6-NEXT close→receipt: `closeReason` persistido pela migration `0119`, lock/idempotência/auditoria/outbox do close, rollback de encounter/timeline/scheduling/cache e recibo com journal balanceado.

Evidência focal recente, sempre limitada ao escopo do teste:

| Verificação | Resultado |
| --- | ---: |
| Close → receipt HTTP/PostgreSQL | 5/5 |
| Inventory charge capture HTTP/PostgreSQL | 3/3 |
| Event catalog / contratos | 1/1 e 43/43 |
| RLS estrutural | 153/154 tabelas protegidas; 1 exceção documentada |
| OpenAPI estrutural | 337 paths, 40 tags, 390 schemas |
| Checker canônico | 11 PASS, 1 WARN histórico de ownership, 0 FAIL |
| `git diff --check` | PASS |

Esses números não significam paridade, produção, certificação fiscal ou release.

## Auditoria independente desta retomada

A decisão foi `REJECT` para a jornada ERP completa. Ainda não existe um único teste público HTTP/PostgreSQL que execute e prove, no mesmo episódio:

`admissão → handoff/permanência → consumo de estoque → diária → alta → billing → recebimento → caixa/ledger → auditoria/outbox`.

O teste de inventário e o teste close→receipt continuam provas separadas. A revisão também registrou:

- a prova de RLS do slice ainda precisa usar uma role sem `BYPASSRLS`, não somente o usuário de testes administrativo;
- replay/concurrency existem nas fatias, mas falta conflito de payload e convergência da jornada inteira;
- faltam failpoints depois de cada escrita, restart cross-domain e reconciliação observável;
- o walkthrough da SPA chega à comanda, mas ainda encontra cobrança não persistida no fluxo clínico; configurações administrativas e alguns relatórios continuam placeholders/estados parciais;
- Redis failover/clock-skew real, provedores, paridade Vetus, WCAG, target operations, cobertura, deploy/restore e release continuam gates separados.

Os relatórios completos e a matriz de mercado permanecem em [`2026-08-22-auditoria-integral-e-pesquisa-erp.md`](2026-08-22-auditoria-integral-e-pesquisa-erp.md) e [`.agent/artifacts/market-benchmark.md`](../.agent/artifacts/market-benchmark.md). Claims de fornecedores não são evidência do CVG-HIS.

### Bloqueio de segurança encontrado na auditoria final

Uma revisão de segurança read-only, confirmada por uma segunda revisão
independente, encontrou um risco `HIGH/P0` que deve preceder a próxima fatia
clínica: com `NODE_ENV=staging`/`stage`, banco indisponível ou schema
incompleto pode haver fallback para repositórios em memória (ou modo misto)
enquanto o servidor continua aceitando rotas mutáveis. O worker possui
assimetria semelhante e pode entrar no loop sem UoW durável. Isso remove as
garantias de durabilidade, RLS, idempotência, auditoria e consistência entre
réplicas; `/ready` em 503 não desfaz o fato de o processo já estar escutando.

Também ficaram registrados como riscos separados WebAuthn process-local e a
política de auditoria com possíveis `account_id` nulos. A retomada deve
primeiro escrever REDs de startup fail-closed para `production`, `staging` e
`stage`, schema/role ausentes e health/readiness; só depois retomar o RED
vertical clínico-financeiro. Nenhuma credencial, provedor ou ambiente de
produção foi acessado nesta auditoria.

## Próxima ação obrigatória

1. Escrever REDs de startup fail-closed para `staging`/`stage` com DB indisponível, schema incompleto, role insegura e modo misto; bloquear rotas mutáveis e separar `/health` de `/ready` corretamente.
2. Criar o RED novo da jornada vertical completa, preferencialmente em `tests/integration/database/inpatient-inventory-close-receipt-vertical-http-postgres.test.ts`, sem semear billing/receipt final.
3. Exercitar admission/handoff/stay, consumo com charge capture, diária, alta, close e cash receipt usando HTTP real, PostgreSQL descartável, dois tenants e uma role `NOBYPASSRLS`.
4. Cobrir replay da mesma chave, payload divergente, corrida de chaves distintas, reinício e failpoints após cada escrita; consultar clínica, estoque, billing, caixa, journal, audit, outbox e idempotência.
5. Só promover os slices se o RED/GREEN deixar ausência de órfãos, duplicatas, fallback inseguro e vazamentos demonstrada; depois executar a mesma jornada pela SPA real.

Não reabrir PIX/DLQ, diária, alta ou close bounded sem um defeito/regressão nova. Não usar fallback em memória como evidência de durabilidade e não marcar `CVG-002C6`, `CVG-002` ou o ERP como concluídos.

## Arquivos de continuidade

- [`2026-08-23-checkpoint-continuacao.md`](2026-08-23-checkpoint-continuacao.md)
- [`2026-08-23-handoff-cvg-002c6-clinical-financial-audit.md`](2026-08-23-handoff-cvg-002c6-clinical-financial-audit.md)
- [`../.agent/artifacts/CVG-002C6-clinical-financial-audit-2026-08-23.md`](../.agent/artifacts/CVG-002C6-clinical-financial-audit-2026-08-23.md)
- [`../.agent/state.json`](../.agent/state.json)
- [`../.agent/backlog.json`](../.agent/backlog.json)
- [`../.gauntlet/state.md`](../.gauntlet/state.md)

Esta página é um handoff de continuidade, não uma declaração de prontidão operacional.

## Publicação

Este handoff e a reconciliação documental foram publicados em
`d355513e82fc0a51b7e4e39e2a93ed3d9daf154d`
(`docs: save current session handoff`) no branch
`origin/agent/sync-v4-full-program`. O `fetch` posterior confirmou
`HEAD == origin`; somente o cache user-owned do design-system permanece fora
do commit.

O adendo de segurança e a reconciliação final desta sessão foram publicados em
`6caecfde57a8c50941de3eac5d76d66da04f827b` (`docs: record staging fail-closed
security gap`), também alinhado ao remoto após `git fetch`.

## Implementação local posterior — startup fail-closed (23/08/2026)

O finding `HIGH/P0` foi tratado em uma fatia local e independente antes de
retomar o RED clínico. O classificador production-like agora é compartilhado
por config/API/worker e reconhece `production`, `prod`, `staging` e `stage`.
Além disso, a política é monotônica: `NODE_ENV` do processo, ambiente explícito
do bootstrap e as flags `DATABASE_REQUIRE_RLS_ROLE`/
`DATABASE_REQUIRE_SCHEMA` só podem elevar a exigência, nunca rebaixá-la por
`environment: 'development'`.

API e worker recusam URL ausente, PostgreSQL indisponível, role insegura,
schema de garantias incompleto e qualquer erro que produziria repositório
`Map`, modo misto ou worker sem UoW. A API lança antes de chegar ao `listen`; o
worker lança antes do loop. RED/GREEN, arquivos, limites e próximos gates estão
em [`.agent/artifacts/CVG-001-startup-fail-closed-2026-08-23.md`](../.agent/artifacts/CVG-001-startup-fail-closed-2026-08-23.md).

Evidência executada:

- API bootstrap: **18/18**;
- shared-config: **40/40**;
- worker: **62 testes**, cinco suites, todos PASS;
- API package: **331/331**;
- typecheck/build e `git diff --check`: PASS;
- revisão independente posterior: **PASS** para o escopo fail-closed, sem
  bypass restante; schema/role via doubles e harness process-level são
  recomendações não bloqueantes deste patch.

O ERP, `CVG-001`, `CVG-002C6` e a Quality Bar continuam
`IN_PROGRESS/PARTIAL`. Ainda não há certificação de PostgreSQL alvo com schema
parcial/role `NOBYPASSRLS`, nem jornada clínica-financeira única, failpoints,
restart/reconciliação, SPA, Redis, providers, paridade, WCAG, coverage,
operações, deploy/restore ou release. O próximo gate segue sendo o RED vertical
admissão → handoff/stay → inventário → diária → alta → close → receipt.

## Publicação do gate fail-closed

O commit `620791e61a275af47974ad5dae4d5b5848b53406` (`fix: fail closed in
production-like bootstrap`) foi enviado para
`origin/agent/sync-v4-full-program`. O `fetch` posterior confirmou igualdade
entre `HEAD` e o remoto. O único caminho local fora do commit continua sendo
`packages/design-system/tsconfig.vue.tsbuildinfo`, preservado fora do stage.

## Checkpoint mais recente — harness real de bootstrap (23/08/2026, 16:35 BRT)

O gate de defesa de inicialização foi ampliado e publicado em
`25d7aa209fffeda7ce566d6a237f39b76d609be5` (`test: prove production-like
bootstrap boundaries`). O teste usa PostgreSQL descartável real, roles de
login restritas com `NOSUPERUSER`/`NOBYPASSRLS`, uma role superuser insegura,
schema com `public.inbox_events` renomeada e subprocessos dos entrypoints
reais da API e do worker sob `NODE_ENV=staging`.

Evidência fresca: `production-like-runtime-bootstrap.test.ts` passou **6/6**.
O API e o worker rejeitam role insegura e schema de delivery incompleto; com
PostgreSQL recusado, nenhum entrypoint emite `listening`, abre health listener
ou entra no loop de worker. O artefato reproduzível é
[`.agent/artifacts/CVG-001-runtime-bootstrap-harness-2026-08-23.md`](../.agent/artifacts/CVG-001-runtime-bootstrap-harness-2026-08-23.md).

Este resultado é GREEN apenas no limite de startup. Não certifica ACL/RLS
global, `FORCE ROW LEVEL SECURITY` em todas as tabelas, falha fatal pós-start,
durabilidade de instalação/sessão nem deploy alvo.

## RED vertical retomado — admissão até recebimento

O novo teste
[`inpatient-clinical-financial-vertical-http-postgres.test.ts`](../tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts)
foi executado contra PostgreSQL descartável com dois tenants, duas instâncias
HTTP, replay/conflito de idempotência, corrida de diária, failpoint de close e
spoofing de headers. Após a revisão independente, o fixture abriu o billing
via `PATCH /billing/:encounterId/status` público, corrigiu casts `::text` e
usou bearer A contra recurso B. O resultado corrigido passou **4/4** e cobre
admissão → handoff/ack → consumo de estoque → diária/billing → billing-open →
alta → close → receipt, além de ledger/reconciliation e isolamento A/B.

O artefato reproduzível é
[`.agent/artifacts/CVG-002C6-vertical-http-red-green-2026-08-23.md`](../.agent/artifacts/CVG-002C6-vertical-http-red-green-2026-08-23.md).
Este é GREEN bounded de HTTP/PostgreSQL; não certifica todas as mutações sob
role clínica `NOBYPASSRLS`, SIGKILL/restart entre boundaries, failpoints
cross-domain completos, `FORCE ROW LEVEL SECURITY` global, hidratação
cross-instance ou qualquer gate externo. A jornada/Quality Bar continua
`IN_PROGRESS/PARTIAL`.

Próxima ação exata: obter a revisão independente final do 4/4 e então elevar
o mesmo fluxo para role runtime `NOBYPASSRLS`, failpoints/restart e
reconciliação completa antes de qualquer promoção.

## Publicação do checkpoint vertical

O teste, artefato e atualização documental foram publicados no commit
`d25151d96b1f7f0a17e3e08122d263507ec0353d` (`test: prove inpatient clinical
financial vertical`) em `origin/agent/sync-v4-full-program`. O `fetch` posterior
confirmou `HEAD == origin`. O único dirty path continua sendo o cache
user-owned `packages/design-system/tsconfig.vue.tsbuildinfo`, mantido fora do
stage.

O ponteiro documental mais recente desta sessão é o commit
`7d57225ce1936f174eae5c4012ea69accac94519` (`docs: publish vertical
checkpoint`); após o push, `HEAD == origin/agent/sync-v4-full-program`.
