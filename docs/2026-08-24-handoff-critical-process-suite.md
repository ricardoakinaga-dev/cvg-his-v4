# Handoff — suíte crítica serial de processos — 2026-08-24

## Estado para a próxima sessão

O gate P1 de proteção contra regressões processuais foi implementado e
executado como **GREEN bounded**. O novo comando `test:critical:process` roda
serialmente os seis limites reais de processo, dá a cada arquivo um banco
PostgreSQL efêmero distinto e para no primeiro filho que falhar. A execução
real passou `6/6` arquivos, exit `0`, com `390,91 s` somados nos relatórios do
Vitest.

O estado global não mudou: `CVG-002C6`, ERP, produção, paridade, operações e
release continuam `IN_PROGRESS/PARTIAL`. O artefato reproduzível está em
[`../.agent/artifacts/CVG-002C6-critical-process-suite-2026-08-24.md`](../.agent/artifacts/CVG-002C6-critical-process-suite-2026-08-24.md).

## Implementação publicada nesta rodada

- [`../package.json`](../package.json): `test:critical:process` e integração
  posterior ao mesmo `test:critical`, mantendo intacta a fase de
  banco/setup/foundational;
- [`../infra/scripts/run-critical-process-suite.mjs`](../infra/scripts/run-critical-process-suite.mjs):
  manifesto explícito, `spawnSync` serial, banco efêmero/suffix por arquivo,
  `--no-file-parallelism`, hooks/teardowns de 120 s e fail-fast;
- os seis testes processuais já existentes, sem alteração nesta rodada.

## RED → GREEN e crítica

RED conhecido: antes da implementação, `pnpm test:critical:process` não existia
e retornava exit `254`. O Builder validou `--list`, `--dry-run`, JSON,
`node --check`, Prettier, ESLint, secrets e diff-check. A crítica independente
retornou **APPROVE** para os quatro critérios da Quality Bar; o único residual
P2 é que o runner confia no teardown global de cada teste e não encaminha
SIGTERM/SIGINT por conta própria.

## Execução real

```text
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=critical_process_lead_final_$(date +%s)_$$ \
pnpm test:critical:process

exit 0
```

| Ordem | Arquivo                                        | Resultado |  Duração |
| ----: | ---------------------------------------------- | --------: | -------: |
|     1 | `inpatient-domain-sigkill.test.ts`             |       4/4 |  78,28 s |
|     2 | `inpatient-clinical-financial-restart.test.ts` |       1/1 |  39,19 s |
|     3 | `inpatient-cash-receipt-sigkill.test.ts`       |       1/1 |  60,26 s |
|     4 | `inpatient-cash-receipt-concurrency.test.ts`   |       1/1 |  40,67 s |
|     5 | `pix-provider-settlement-sigkill.test.ts`      |       5/5 | 117,31 s |
|     6 | `worker-runtime-entrypoint.test.ts`            |       1/1 |  55,20 s |

Cada filho usou um suffix diferente (`..._01_` a `..._06_`), e o próximo só
começou após o teardown do anterior. O cache
`packages/design-system/tsconfig.vue.tsbuildinfo` ficou fora do stage.

## Limites e retomada

- O `test:critical` completo não foi repetido depois do wiring, porque a fase
  de banco/setup/foundational é um harness separado e longo; ela permanece
  textualmente preservada no script, enquanto a fase processual foi executada
  integralmente por este handoff.
- A prova usa `NODE_ENV=test`; não é validação de produção-like, Helm, cluster,
  provider, Redis, webhook, DR/RPO, RLS/FORCE RLS global, paridade Vetus, UX,
  WCAG, cobertura, operações ou release.
- O bootstrap simultâneo de réplicas ainda pode colidir em dados laboratoriais;
  isso é uma lacuna separada do runner e passa a ser o próximo maior alvo
  local.

### Retomada recomendada

1. Ler este handoff, o artefato, `docs/2026-08-24-handoff-cash-receipt-concurrency.md`,
   o handoff SIGKILL, `.agent/state.json`, `.agent/backlog.json` e os últimos
   ledgers.
2. Preservar `test:critical:process` como gate serial e decidir, com base em
   custo/CI, se a fase processual deve ter timeout de processo próprio e
   forwarding de sinais.
3. Atacar a inicialização simultânea do catálogo laboratorial com RED/GREEN
   contra dois processos reais, sem mascarar a falha com serialização.
4. Depois executar Helm lint/template em runner autorizado e seguir para PIX
   PostgreSQL/RLS e webhook retry/DLQ/lease fencing.

## Publicação

O commit desta rodada e a reconciliação do ponteiro remoto devem ser registrados
abaixo após o push. O handoff não é uma declaração de produção ou release.
