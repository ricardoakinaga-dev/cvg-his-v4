# CVG-002C6 — runtime role, restart e reconciliação (2026-08-23)

## Gate

**GREEN bounded / não promover produção.** Este artefato registra somente a
fronteira clínica-financeira inpatient executada em PostgreSQL descartável com
login runtime real. O ERP, a Quality Bar global e os gates externos continuam
`IN_PROGRESS/PARTIAL`.

## Evidência reproduzível

Todos os comandos foram executados no workspace `/home/ricardo/cvg-his-v4`:

```text
pnpm exec vitest run tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts --config vitest.integration.config.ts --reporter=dot
→ 5/5 PASS

pnpm exec vitest run tests/integration/process/inpatient-clinical-financial-restart.test.ts --config vitest.integration.config.ts --reporter=verbose
→ 1/1 PASS

pnpm exec vitest run tests/unit/infra/runtime-role-grants.test.ts --config vitest.config.ts --reporter=dot
→ 10/10 PASS

pnpm exec tsc --noEmit -p packages/db/tsconfig.json
→ PASS

sh -n infra/postgres/init-runtime-role.sh && git diff --check
→ PASS
```

Regressões independentes já verificadas nesta continuação:

```text
production-like-runtime-bootstrap.test.ts → 6/6 PASS
runtime-role-sensitive-acl.test.ts        → 1/1 PASS
pix-provider-event-ingress.test.ts       → 11/11 PASS
```

## O que o gate prova

- O serviço HTTP inicia usando um papel LOGIN API criado para o teste com
  `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`;
  `current_user` é o papel API, `rolsuper = false` e `rolbypassrls = false`.
- A reconciliação concede a função auxiliar
  `app.assert_encounter_cash_receipt_consistent(uuid, boolean)` somente aos
  papéis API e worker; `PUBLIC` não possui `EXECUTE`.
- A migration `0120_cash_receipt_consistency_search_path.sql` fixa a resolução
  da função em `pg_catalog, public, app, pg_temp`, deixando `pg_temp` depois das
  relações canônicas. Antes dela, o teste de sombra foi reproduzivelmente RED:
  uma tabela temporária podia fazer um recebimento falso ser aceito.
- A vertical HTTP executa admissão → handoff/ack → stay → consumo de estoque
  com charge capture → diária/billing → billing-open → alta → close → receipt.
  Ela também cobre replay/conflict, corrida de billing, rollback de close,
  isolamento entre tenants e headers falsificados.
- A reconciliação por registro confirma os vínculos e valores exatos: consumo
  `quantity = 2`, custo `50`, billing item `80`, estoque final `8`; diária
  `quantity = 1`, `unit_amount = 180`; billing/financial account/receivable
  total `260`; receipt/payment/cash/journal `260` com débito igual a crédito.
- O teste de restart confirma consumo confirmado antes de parar o runtime,
  rebootstrap limpo, replay idempotente com resposta idêntica e conclusão da
  jornada sem duplicar consumo, billing, receivable, payment, cash movement,
  journal ou linhas.
- O teardown executa `REASSIGN OWNED`/`DROP OWNED` no banco alvo e revoga a
  membership `cvg_installer` antes de remover os papéis.

## Limites e residual obrigatório

- O restart é controlado no mesmo processo (`stopRuntime()` + rebootstrap),
  não é um processo filho morto por `SIGKILL`.
- Só há um failpoint transacional demonstrado no close; ainda falta uma matriz
  completa em admission, inventory capture, daily billing, discharge, close e
  receipt/journal.
- O papel worker é validado por ACL, mas ainda não executa a jornada completa
  como processo independente.
- O init script e o template Helm mantêm uma cópia declarativa da ACL; há
  teste textual e execução da reconciliação, mas falta prova de equivalência
  aplicada por um release Helm real.
- Permanecem fora deste gate: RLS/`FORCE ROW LEVEL SECURITY` global,
  hidratação assíncrona cross-instance, callback ghost, Redis/failover,
  providers PIX, Vetus/paridade, SPA/B2c, WCAG, cobertura, observabilidade,
  deploy/restore/rollback, target operations e release.

## Arquivos principais

- `packages/db/migrations/0120_cash_receipt_consistency_search_path.sql`
- `packages/db/src/runtime-role-policy.ts`
- `packages/db/src/reconcile-runtime-roles.ts`
- `infra/postgres/init-runtime-role.sh`
- `infra/helm/cvg-his-v2/templates/postgres-runtime-role-configmap.yaml`
- `tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts`
- `tests/integration/process/inpatient-clinical-financial-restart.test.ts`
- `tests/unit/infra/runtime-role-grants.test.ts`

O arquivo user-owned `packages/design-system/tsconfig.vue.tsbuildinfo` foi
preservado fora do stage.
