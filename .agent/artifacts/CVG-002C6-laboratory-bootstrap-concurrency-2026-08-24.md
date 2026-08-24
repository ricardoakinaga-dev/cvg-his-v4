# CVG-002C6 — bootstrap concorrente do catálogo laboratorial — 2026-08-24

## Escopo e decisão

Esta rodada fecha um risco P1/P0 local de inicialização horizontal: duas APIs
reais podiam observar um catálogo vazio, executar três `INSERT`s determinísticos
e uma delas morrer em `laboratory_equipment_pkey`. O resultado é **GREEN
bounded** para `QB-LAB-BOOT-01`, `QB-LAB-BOOT-02`, `QB-LAB-BOOT-03` e
`QB-LAB-REG-01`. Não promove `CVG-002C6`, o ERP, produção, paridade,
operações ou release.

## Implementação

- `packages/modules/diagnostics/src/repositories/database-laboratory-catalog.repository.ts`
  remove o sentinel `SELECT`/`return` e sempre tenta hidratar os três catálogos;
  cada lote usa `onConflictDoNothing({ target: table.id })` sobre o ID
  determinístico `${accountId}:${sourceId}`.
- `tests/integration/process/laboratory-catalog-bootstrap-concurrency.test.ts`
  inicia dois `apps/api/test-fixtures/api-process.ts` reais em PIDs/portas
  distintas, recompila `@cvg-his-v2/module-diagnostics` antes do spawn (o
  processo resolve `dist/index.js`), usa PostgreSQL efêmero e roles
  `LOGIN NOSUPERUSER NOBYPASSRLS`, observa uma barreira advisory exclusiva da
  conta A, valida `/health`, GETs autenticados A/B, SQL de contagem/IDs exatos,
  preserva um item customizado e repara o default removido.
- Nenhuma migração foi necessária; o schema já usa a PK determinística sem
  outras constraints únicas nesses três catálogos.

## RED → GREEN

RED real, antes da correção:

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=lab_catalog_bootstrap_red2 \
pnpm exec vitest run tests/integration/process/laboratory-catalog-bootstrap-concurrency.test.ts \
  --config vitest.integration.config.ts --reporter=verbose --no-cache \
  --no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000
exit 1 — duplicate key na inserção determinística de laboratory_equipment sob duas PIDs
```

GREEN final após a correção e formatação:

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=lab_catalog_bootstrap_final \
pnpm exec vitest run tests/integration/process/laboratory-catalog-bootstrap-concurrency.test.ts \
  --config vitest.integration.config.ts --reporter=dot --no-cache \
  --no-file-parallelism --hookTimeout=120000 --teardownTimeout=120000
1 file / 1 test passed, exit 0, 66.64s total (47.75s de teste)
```

## Crítica independente

A primeira crítica rejeitou a evidência porque a barreira global podia sincronizar
contas diferentes. O teste foi corrigido para pausar somente quando
`NEW.account_id = accountA` e o `waitForBootstrapContention` filtra exatamente
`(classid=41673,objid=1)`. A segunda crítica independente aprovou:

- BOOT-01: dois PIDs/portas, contenção na mesma conta e readiness HTTP 200 em
  modo `database`, sem crash/timeout;
- BOOT-02: 4 equipamentos, 6 report types, 6 reference values, conjunto exato
  de IDs por conta e leitura A/B;
- BOOT-03: reparo do default removido sem duplicar nem sobrescrever o custom;
- REG-01: aprovado após a execução fresca da suíte processual completa abaixo.

## Regressão processual

```text
pnpm test:critical:process
exit 0 — 6/6 arquivos, seis bancos efêmeros distintos, execução serial
```

Execução observada no suffix `critical_process_2617258_pjqibl`:

| Processo | Resultado | Duração Vitest |
|---|---:|---:|
| `inpatient-domain-sigkill.test.ts` | 4/4 | 82.41s |
| `inpatient-clinical-financial-restart.test.ts` | 1/1 | 39.48s |
| `inpatient-cash-receipt-sigkill.test.ts` | 1/1 | 60.57s |
| `inpatient-cash-receipt-concurrency.test.ts` | 1/1 | 40.54s |
| `pix-provider-settlement-sigkill.test.ts` | 5/5 | 117.19s |
| `worker-runtime-entrypoint.test.ts` | 1/1 | 55.11s |

As durações reportadas somam 395.30s. A regressão focada de cash receipt
concurrency também passou anteriormente em `receipt_concurrency_lab_regression`
(1/1, 40.34s).

## Checks e limites

- `pnpm typecheck`: exit 0 (workspace completo);
- ESLint dos dois arquivos: exit 0;
- Prettier dos dois arquivos: exit 0;
- Secretlint direto nos dois arquivos: exit 0;
- `git diff --check`: exit 0;
- `node --check` do artefato `dist` compilado: exit 0.

O teste é um limite comportamental `NODE_ENV=test`, com dados/roles/bancos
descartáveis. Ainda não prova Helm/cluster, produção, Redis/provider, webhook,
RLS/FORCE RLS global, DR/RPO, paridade Vetus, UX/WCAG, cobertura, operações ou
release. O cache de usuário
`packages/design-system/tsconfig.vue.tsbuildinfo` permanece fora do stage.
