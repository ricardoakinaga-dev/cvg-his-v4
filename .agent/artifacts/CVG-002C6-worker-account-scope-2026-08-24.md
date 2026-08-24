# CVG-002C6 — escopo obrigatório de contas do worker (2026-08-24)

## Diagnóstico P0

`apps/worker/src/bootstrap.ts` recusa iniciar em ambientes production-like
quando `WORKER_ACCOUNT_IDS`/`WORKER_ACCOUNT_ID` está ausente. O chart Helm,
porém, não injetava essa variável no Deployment do worker. Compose já tinha o
contrato, mas staging/prod podiam entrar em crash-loop por falta de escopo.

## TDD e implementação

O guard foi escrito primeiro no validador estático:

```text
pnpm validate:helm
Error: values.yaml must define worker.accountIds.secretKey for the production worker scope
exit 1
```

Depois o contrato foi implementado nos arquivos Helm:

- `values.yaml` declara `worker.accountIds.secretKey` e mantém
  `existingSecret` vazio por padrão;
- `values.staging.yaml` referencia
  `cvg-his-v2-staging-worker-secrets`;
- `values.prod.yaml` referencia `cvg-his-v2-prod-worker-secrets`;
- `values.schema.json` exige `worker.accountIds.secretKey`;
- `templates/worker-deployment.yaml` injeta `WORKER_ACCOUNT_IDS` por
  `secretKeyRef` obrigatório (`optional: false`) em staging/prod;
- `templates/_helpers.tpl` resolve o nome do Secret sem materializar segredo;
- `infra/scripts/validate-helm.mjs` exige o contrato nos overlays e, quando
  Helm estiver disponível, confere o Secret/key renderizado. Em dev a variável
  permanece ausente para permitir descoberta local de contas.

Nenhum ID de conta ou credencial foi adicionado ao Git.

## GREEN e verificações

```text
pnpm validate:helm       -> PASS (Helm não instalado; validação estática dev/staging/prod)
node --check infra/scripts/validate-helm.mjs -> PASS
values.schema.json parse -> PASS
pnpm security:secrets    -> PASS
git diff --check         -> PASS
```

O `pnpm typecheck` completo passou nos 70 projetos escopados, incluindo API,
worker, SPA e módulos compartilhados.

## Operação exigida fora do repositório

O operador deve criar/atualizar os Secrets no namespace de cada ambiente, sem
registrar o valor em values ou logs:

```bash
kubectl -n <namespace> create secret generic cvg-his-v2-staging-worker-secrets \
  --from-literal=WORKER_ACCOUNT_IDS='<account-id-1,account-id-2>' \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n <namespace> create secret generic cvg-his-v2-prod-worker-secrets \
  --from-literal=WORKER_ACCOUNT_IDS='<account-id-1,account-id-2>' \
  --dry-run=client -o yaml | kubectl apply -f -
```

Após aplicar o chart, conferir rollout/readiness e logs do worker. A ausência
do Secret deve impedir startup; isso é fail-closed e esperado.

## Limites e próximo gate

- O ambiente desta sessão não possui o binário `helm`; a validação de template
  renderizado e `helm lint` ainda precisa rodar no CI/runner de deploy.
- Não há cluster, credenciais de produção ou provedor externo autorizado; este
  artefato não promove produção, DR/RPO, release ou ERP.
- O próximo gate P0 recomendado é uma prova de processo filho com `SIGKILL`
  durante cash receipt, entre a escrita financeira e auditoria/outbox, seguida
  de restart, replay idempotente, payload divergente `409` e isolamento A/B.
- Permanecem abertos RLS/FORCE RLS global, DR/restore/failover, comparação de
  checksum de migrations, CI de deploy, hardening de imagens, PIX/webhook,
  Vetus/paridade, SPA/WCAG, coverage e readiness operacional.

## Retomada

Leia este artefato, `docs/2026-08-24-handoff-worker-account-scope.md`,
`.agent/state.json` (`CVG-002C6`), `.agent/backlog.json` e o último commit
publicado (`c93d672a47ad1bdb391c4af8a8963c012fd4219b`). Preserve sempre o cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` fora do stage.
