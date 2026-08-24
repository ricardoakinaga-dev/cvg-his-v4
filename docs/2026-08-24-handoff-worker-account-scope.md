# Handoff de retomada — worker production-like e próximo failpoint

**Data:** 24 de agosto de 2026 (BRT)
**Repositório:** `/home/ricardo/cvg-his-v4`
**Branch:** `agent/sync-v4-full-program`
**Estado:** `BUILD/VERIFY`, `IN_PROGRESS/PARTIAL`

Este é o ponteiro executável para a próxima sessão. Ele registra o P0 de
deploy encontrado nesta auditoria e não declara produção, paridade, ERP ou
release prontos.

## Publicação atual

Implementação e handoff foram publicados no commit
`c93d672a47ad1bdb391c4af8a8963c012fd4219b` (`fix: enforce worker account
scope in Helm`). O fetch confirmou o mesmo SHA em
`origin/agent/sync-v4-full-program`; apenas o cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` permanece fora do stage.

## Retomada em cinco minutos

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git fetch origin agent/sync-v4-full-program
git status --short
git log -1 --oneline
git rev-parse HEAD
git rev-parse origin/agent/sync-v4-full-program
git diff --check
```

Leia, nesta ordem:

1. este handoff;
2. [`../.agent/artifacts/CVG-002C6-worker-account-scope-2026-08-24.md`](../.agent/artifacts/CVG-002C6-worker-account-scope-2026-08-24.md);
3. [`../.agent/state.json`](../.agent/state.json), tarefa `CVG-002C6`;
4. [`../.agent/backlog.json`](../.agent/backlog.json);
5. [`2026-08-23-auditoria-documental-global-e-handoff.md`](2026-08-23-auditoria-documental-global-e-handoff.md);
6. o último artefato de hidratação cross-instance e os últimos registros dos
   ledgers JSONL.

O único caminho local que pode aparecer dirty é o cache user-owned
[`../packages/design-system/tsconfig.vue.tsbuildinfo`](../packages/design-system/tsconfig.vue.tsbuildinfo).
Não adicionar, reverter, limpar ou fazer stage desse arquivo.

## O que foi feito nesta sessão

O worker aborta em ambientes production-like sem `WORKER_ACCOUNT_IDS`, mas o
chart Helm não fornecia essa variável. O contrato agora está fail-closed:

- staging usa `cvg-his-v2-staging-worker-secrets`;
- produção usa `cvg-his-v2-prod-worker-secrets`;
- ambos usam a chave `WORKER_ACCOUNT_IDS` e `optional: false`;
- a configuração vive em `worker.accountIds`, não no ConfigMap;
- dev não recebe escopo fixo, preservando descoberta local;
- o validador estático e o caminho renderizado com Helm verificam a presença,
  nome e chave do Secret;
- nenhum ID real foi versionado.

Detalhes e comando de criação operacional estão no
[`artefato do escopo de contas`](../.agent/artifacts/CVG-002C6-worker-account-scope-2026-08-24.md).

## Evidência

RED intencional antes da implementação:

```text
pnpm validate:helm
exit 1 — values.yaml must define worker.accountIds.secretKey for the production worker scope
```

GREEN após a implementação:

```text
pnpm validate:helm       -> PASS (validação estática; Helm ausente no runner)
node --check ...         -> PASS
values.schema.json parse -> PASS
pnpm security:secrets    -> PASS
git diff --check         -> PASS
```

O `pnpm typecheck` completo passou nos 70 projetos escopados. A ausência do
binário Helm é
uma limitação explícita: `helm lint` e `helm template` precisam rodar no CI ou
runner que possua Helm antes de um deploy real.

## Próxima sequência obrigatória

1. Confirmar `pnpm typecheck` e a reconciliação final do commit remoto.
2. Em ambiente com Helm, executar `helm lint` e `helm template` para dev,
   staging e prod; criar os Secrets apenas no cluster autorizado e conferir
   rollout/readiness.
3. Implementar a prova P0 de `SIGKILL` real do processo API durante cash
   receipt: zero graph parcial após a morte, restart/replay idempotente,
   payload divergente `409`, journal balanceado e isolamento de tenant B.
4. Depois expandir os failpoints de discharge/close/receipt e avaliar hidratação
   concorrente (P2), antes de PIX PostgreSQL/RLS e webhook retry/DLQ/fencing.

Não promover `CVG-002C6`, o ERP, `QB-PARITY-01`, `QB-OPS-01`, produção ou
release. Permanecem explicitamente `IN_PROGRESS/PARTIAL` os gaps de RLS/FORCE
RLS global, DR/RPO, checksum de migrations, CI de deploy, imagens, Redis,
provider, SPA/WCAG, Vetus/paridade, coverage, operações e release.
