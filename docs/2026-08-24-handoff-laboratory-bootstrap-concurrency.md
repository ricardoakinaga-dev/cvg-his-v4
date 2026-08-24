# Handoff — bootstrap concorrente do catálogo laboratorial — 2026-08-24

## Estado para a próxima sessão

O maior risco local de inicialização horizontal do catálogo laboratorial está
**GREEN bounded**. Duas instâncias reais da API iniciadas ao mesmo tempo contra
o mesmo PostgreSQL/conta chegaram a readiness, hidrataram catálogos A/B sem
`duplicate key`, preservaram dados customizados e repararam um default removido.

O estado global não mudou: `CVG-002C6`, ERP, produção, paridade, operações e
release continuam `IN_PROGRESS/PARTIAL`. Leia primeiro este documento e o
artefato [`../.agent/artifacts/CVG-002C6-laboratory-bootstrap-concurrency-2026-08-24.md`](../.agent/artifacts/CVG-002C6-laboratory-bootstrap-concurrency-2026-08-24.md),
depois o runner crítico e os handoffs de cash receipt.

## Implementação publicada nesta rodada

- [`../packages/modules/diagnostics/src/repositories/database-laboratory-catalog.repository.ts`](../packages/modules/diagnostics/src/repositories/database-laboratory-catalog.repository.ts): remove o check-then-act parcial e hidrata as três coleções com `ON CONFLICT DO NOTHING` na PK determinística por conta;
- [`../tests/integration/process/laboratory-catalog-bootstrap-concurrency.test.ts`](../tests/integration/process/laboratory-catalog-bootstrap-concurrency.test.ts): processo real A/B, build explícito do pacote `dist`, barreira advisory vinculada à conta A, readiness, isolamento, IDs exatos, reparo e cleanup;
- nenhuma migração/schema foi alterada.

## Evidência real

RED capturado com duas PIDs colidindo na inserção determinística de equipamento:
`lab_catalog_bootstrap_red2`, exit 1.

GREEN final depois da correção/formatação:

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=lab_catalog_bootstrap_final \
pnpm exec vitest run tests/integration/process/laboratory-catalog-bootstrap-concurrency.test.ts \
  --config vitest.integration.config.ts --reporter=dot --no-cache \
  --no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000
```

Resultado: **1/1, exit 0, 66,64 s**. O conjunto validado foi 4 equipamentos,
6 tipos de laudo e 6 valores de referência por conta; o item customizado de A
permaneceu intacto e o default removido foi restaurado uma única vez.

A crítica independente final aprovou `QB-LAB-BOOT-01/02/03`. A primeira
crítica havia rejeitado uma barreira global; o teste agora pausa somente para
`accountA` e observa a chave advisory `(41673, 1)`, fechando essa falsa
possibilidade de sincronizar contas diferentes.

## Regressão e checks

`pnpm test:critical:process` terminou **exit 0, 6/6**, serial e com bancos
efêmeros distintos: inpatient-domain 4/4, restart 1/1, cash receipt SIGKILL
1/1, cash receipt concurrency 1/1, PIX settlement 5/5 e worker 1/1. As
durações Vitest observadas foram 82,41s, 39,48s, 60,57s, 40,54s, 117,19s e
55,11s (395,30s somados). A execução focada de cash receipt concurrency também
passou 1/1 em 40,34s.

Typecheck global, ESLint, Prettier, Secretlint, `node --check` do `dist` e
`git diff --check` passaram. O processo compilado resolve
`@cvg-his-v2/module-diagnostics` de `dist/index.js`; por isso o teste executa o
build antes de iniciar os filhos.

## Limites e retomada

- A prova é bounded a `NODE_ENV=test`, PostgreSQL/roles descartáveis e processo
  real local; não é certificação de produção, cluster ou Helm.
- Continuam abertos Redis/provider, PIX PostgreSQL/RLS adicional, webhook
  retry/DLQ/lease fencing, RLS/FORCE RLS global, DR/RPO, paridade Vetus,
  SPA/E2E/UX/WCAG, cobertura, operações e release.
- O teste novo ainda é uma prova processual dedicada; a decisão de incorporá-lo
  no manifesto `test:critical:process` deve considerar o custo adicional (~67 s)
  e permanecer explícita.
- Preserve o cache do usuário
  `packages/design-system/tsconfig.vue.tsbuildinfo` fora do stage.

### Próximo passo recomendado

1. Ler este handoff, o artefato, `.agent/state.json`, `.agent/backlog.json`,
   `.agent/verification.jsonl` e `.agent/execution-log.jsonl`.
2. Manter o runner crítico e os testes de bootstrap como gates bounded; decidir
   a inclusão no CI sem alterar a fase foundational.
3. Executar Helm lint/template em runner autorizado e seguir para PIX
   PostgreSQL/RLS e webhook HTTP retry/DLQ/lease fencing.

## Publicação

O commit `08a9885dd6bbfd0dcbadd648d8eb330c95cfb9a6`
(`test: harden laboratory catalog bootstrap concurrency`) foi enviado para
`origin/agent/sync-v4-full-program`; o fetch confirmou o mesmo SHA em `HEAD` e
no remoto. O cache `packages/design-system/tsconfig.vue.tsbuildinfo` é o único
path dirty e permanece fora do stage. Este handoff não é declaração de
produção ou release.
