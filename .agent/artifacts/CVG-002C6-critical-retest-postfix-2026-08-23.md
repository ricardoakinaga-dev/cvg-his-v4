# CVG-002C6 — reteste crítico pós-fix (23/08/2026)

## Escopo

Registrar o resultado integral imediatamente posterior à migration 0123 e à
serialização do harness. Esta evidência é local, descartável e não promove o
ERP, a Quality Bar, produção ou qualquer gate externo.

## Comando executado

```bash
REQUIRE_TEST_DB=1 pnpm exec vitest run \
  tests/integration/database tests/integration/setup \
  tests/integration/foundational.test.ts \
  --config vitest.integration.config.ts --reporter=dot \
  --no-cache --no-file-parallelism \
  --hookTimeout=120000 --teardownTimeout=120000
```

Ambiente: PostgreSQL descartável novo
`cvg_his_v2_test_3393394_3393515`; migrations `0000`–`0123` aplicadas; 172
tabelas, 43 enums e 456 FKs; sem seed administrativo porque
`ADMIN_EMAIL`/`ADMIN_PASSWORD` não estavam configurados. O teardown terminou
sem timeout de hook reportado.

## Resultado observado

```text
Test Files 1 failed | 27 passed (28)
Tests      1 failed | 386 passed (387)
Duration   646.58s
exit       1
```

A única falha foi:

```text
tests/integration/database/pix-service-principals.test.ts
  PIX service principal persistence
  > backfills and defaults existing and new users to interactive human principals
error: insert or update on table "users" violates foreign key constraint
       "users_account_id_accounts_id_fk"
```

O erro é levantado durante a aplicação da migration de service principals,
na linha em que o teste chama `servicePrincipalMigration`, depois de inserir o
fixture novo. O mesmo arquivo PIX passa isoladamente em banco novo (5/5), e a
sequência provider → PIX passa 11/11. Isso classifica a divergência atual como
contaminação/isolamento do harness ou fixture anterior até que uma reprodução
mínima prove outra causa; não autoriza remover FK, apagar órfãos ou relaxar a
migration 0112.

## Decisão e próxima ação

- `QB-REL-CRITICAL-HARNESS`: `PARTIAL/FAIL`; ainda não há 387/387.
- `CVG-002C6`, ERP, readiness, segurança global, produção e release continuam
  `IN_PROGRESS/PARTIAL`.
- Preservar a saída bruta e reproduzir a menor sequência de arquivos que deixa
  usuário órfão antes do PIX (começar por suites que fazem `TRUNCATE accounts
  CASCADE` ou alteram schema). Corrigir a causa de isolamento no teste que a
  introduz, mantendo o teste de backfill como prova de FK e defaults.
- Em seguida executar novamente o focused PIX/provider, o full critical com os
  dois timeouts e obter nova crítica independente sobre vacuidade, constraints,
  isolamento tenant e teardown.

O cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo` permanece
fora do stage, commit e limpeza.
