# CVG-002C6 — ACL do worker, processo real e SIGKILL (2026-08-23, 17:46 BRT)

## Gate

**GREEN bounded / não promover produção.** Este artefato registra a fronteira
de execução do entrypoint real do worker sob PostgreSQL descartável e role de
runtime sem `SUPERUSER`/`BYPASSRLS`. Ele não certifica readiness de produção nem
o worker completo do ERP; a barra global continua `IN_PROGRESS/PARTIAL`.

## RED → correção → GREEN

O novo teste de processo começou RED por uma violação real da política de ACL:
o worker iniciado com a role `NOBYPASSRLS` abortava antes do loop com
`forbiddenTablePrivileges=6`. Depois da primeira revogação, ainda restavam duas
permissões DML em tabelas de instalação/governança, porque a regra de segurança
classifica qualquer mutação nessas tabelas como proibida para o worker. A
correção final revoga `INSERT, UPDATE, DELETE, TRUNCATE` em todas as tabelas do
catálogo de mutações do instalador, mantendo `SELECT` para o worker.

O mesmo catálogo agora é aplicado nas três superfícies:

- `packages/db/src/reconcile-runtime-roles.ts` após o grant amplo das tabelas
  RLS;
- `infra/postgres/init-runtime-role.sh` na inicialização do banco;
- `infra/helm/cvg-his-v2/templates/postgres-runtime-role-configmap.yaml` no
  caminho declarativo de instalação.

O teste unitário também exige que o catálogo permaneça alinhado ao contrato
`API_GLOBAL_TABLE_MUTATIONS` e que a revogação ocorra depois do grant amplo.

## Evidência reproduzível

Comandos executados no workspace `/home/ricardo/cvg-his-v4`:

```text
pnpm exec vitest run tests/integration/process/worker-runtime-entrypoint.test.ts \
  --config vitest.integration.config.ts --reporter=dot
→ 1/1 PASS

pnpm exec vitest run tests/unit/infra/runtime-role-grants.test.ts \
  --config vitest.config.ts --reporter=dot
→ 11/11 PASS

pnpm exec tsc --noEmit -p packages/db/tsconfig.json
→ PASS

pnpm exec prettier --check \
  packages/db/src/runtime-role-policy.ts \
  packages/db/src/reconcile-runtime-roles.ts \
  tests/unit/infra/runtime-role-grants.test.ts \
  tests/integration/process/worker-runtime-entrypoint.test.ts
→ PASS

sh -n infra/postgres/init-runtime-role.sh && git diff --check
→ PASS

pnpm audit --audit-level=high
→ No known vulnerabilities found
```

O teste de processo cria banco e roles efêmeros, aplica as migrations, semeia
uma conta, reconcilia ACL e inicia `apps/worker/src/index.ts` como processo
filho real. Ele verifica:

1. `/live` responde com liveness verdadeira;
2. `/metrics` demonstra `ticksCompleted > 0`, ou seja, o loop executou sob a
   role restrita;
3. `/health` confirma banco saudável, modo de persistência `database` e
   `worker.state = degraded`;
4. o primeiro processo é encerrado com `SIGKILL`;
5. o mesmo worker reinicia na mesma porta, volta a executar ticks e encerra
   limpo com `SIGTERM` (`code = 0`, `signal = null`);
6. a saída não contém crash nem a violação de role observada no RED.

Após a revisão independente, o teste foi fortalecido para consultar
`inspectWorkerMutationPrivileges()` incondicionalmente no primeiro e no
segundo processo e exigir uma lista vazia. Também consulta `/ready` e exige o
status HTTP `503`, `readiness.ready = false` e o detalhe dos consumidores
ausentes. Assim, o resultado GREEN mede positivamente a ausência das mutações
proibidas e o limite de readiness degradada.

## Limite honesto de readiness

O `health` permanece degradado porque o entrypoint atual cria o event bus, mas
não registra os consumidores de produção `payments`, `billing` e `webhooks`.
Isso é um residual de composição, não uma falha escondida pelo teste. Não foi
adicionado um consumidor no-op para transformar `503` em falso GREEN. O próximo
gate precisa decidir e implementar a composição real dos handlers do worker e
então repetir o teste com readiness e processamento de eventos verificáveis.

## Próxima ação exata

Registrar handlers reais (ou aprovar um manifesto de worker explicitamente
diferente) para `payments`, `billing` e `webhooks`, com revisão de dependências,
UoW, leases e idempotência. Depois executar a matriz de failpoints em cada
boundary clínico-financeiro, repetir o cenário em child process com
`SIGKILL`/restart e provar equivalência aplicada entre reconciler, init script e
Helm. Permanecem separados os gates de RLS/FORCE RLS global, hidratação
cross-instance, Redis/providers, SPA/paridade Vetus, WCAG, cobertura,
operações, deploy/restore e release.

O arquivo user-owned `packages/design-system/tsconfig.vue.tsbuildinfo` foi
preservado fora do stage.

## Revisão independente

O revisor repetiu a leitura do diff e da execução após o reforço da medição e
aprovou o gate como **APPROVE bounded**, sem Critical/High. A aprovação confirma
que a consulta positiva de privilégios ocorre antes e depois do restart e que
`/ready` observa o `503` degradado real. O residual Medium é deliberado: sem
consumidores registrados, não há prova de processamento de eventos nem de
readiness operacional completa.
