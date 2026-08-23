# CVG-002B2B — checkpoint de recovery, DLQ/observabilidade e barreira HTTP→PostgreSQL

**Data:** 23 de agosto de 2026, após a execução dos testes da sessão
**Branch:** `agent/sync-v4-full-program`
**Estado:** implementação `62db87e` publicada e verificada em fatias limitadas; `CVG-002B2B` permanece `IN_PROGRESS/PARTIAL`.

Este artefato é o ponto de retomada para a próxima sessão. A implementação desta continuação foi publicada em `62db87e` e a documentação/ledgers em `8d226d0`. Ele registra somente evidência observada no workspace e no PostgreSQL descartável; não promove o ERP, o provider sintético ou a API key database para produção.

## Incrementos implementados

- O repositório de delivery mantém `claimNext` compatível e expõe a extensão aditiva `claimNextWithPromotion`. Promoções automáticas de `attempts >= max_attempts` para `reconciliation_required` retornam a contagem na mesma UoW tenant-scoped.
- O consumer PIX emite evento estruturado `pix_provider_settlement.delivery_outcome`, classifica somente códigos de falha allowlisted, registra métricas Prometheus agregadas sem tenant/delivery/event/worker/error-code labels e trata telemetria como best-effort.
- O caminho de exaustão é observável mesmo sem claim: `PIX_SETTLEMENT_ATTEMPTS_EXHAUSTED`, `source=attempts_exhausted`, evento terminal e incremento agregado por promoção. Contagem inválida é rejeitada fail-closed.
- O teste de recovery usa dois `pg.Pool` independentes: A obtém lease curto e encerra o pool antes de B1/CAS; B espera a expiração, obtém novo token/lease version, rejeita a execução fenced de A, aplica o mesmo B1 uma vez e não cria segunda receipt nem nova idempotência.
- A integração HTTP→PostgreSQL cria `pix_transactions` attempt-linked com `DatabasePixTransactionRepository`, observa o registro em outra conexão, confirma via HTTP real com API key e prova `410` sem gateway/outbox; uma chave de outra conta recebe `404` opaco; um PIX direto sem `payment_attempt_id` mantém `200`, uma chamada ao gateway e um outbox confirmado.
- O teste de principal de serviço deixou de ser vacuoso: reconstrói o estado pré-`0112` dentro de uma transação rollback-only, reaplica a migration e valida backfill/defaults, além dos negativos RLS para usuários e mappings cross-tenant.
- Foram adicionados os negativos de rota cross-account para o `410` e o teste unitário direto de transação aninhada, comprovando uma conexão, um `BEGIN/COMMIT` e o mesmo client/ALS.
- A migration `0113_api_key_auth_boundary.sql` criou a capability `cvg_api_key_auth` sem login/inherit/bypass RLS e sem memberships, tenantizou uso/rate-limit, adicionou o lookup exato `app.resolve_active_api_key` e o probe booleano/null `app.is_pix_transaction_owned_by` sem devolver `account_id` estrangeiro.
- O mapper de API key passou a validar JSONB nativo do `pg`, o worker perdeu qualquer privilégio nas três tabelas de credenciais e as rotas extraídas passaram a aplicar rate limit antes de atualizar `last_used_at`.
- O rate limit PostgreSQL agora consome atomicamente (update-if-below-limit + insert-on-conflict retry); a integração HTTP concorrente prova oito chamadas, duas aceitas e seis `429`.
- O cutover e o Compose agora executam reconciliação de roles depois da migration, garantindo o `EXECUTE` API-only das funções criadas em `0113`.

## Evidência executada

| Escopo | Resultado | Comando principal |
| --- | ---: | --- |
| worker completo | **54/54** | `pnpm --filter @cvg-his-v2/worker test` |
| shared transaction context | **4/4** | `node --test packages/shared/database/dist/tenant-transaction-context.test.js` |
| API payments route | **4/4** | build da API + `node --test dist/routes/payments-routes.test.js` |
| worker PostgreSQL fencing/restart | **6/6** | `vitest run tests/integration/database/pix-provider-settlement-consumer.test.ts` |
| service principals/RLS | **5/5** | `vitest run tests/integration/database/pix-service-principals.test.ts` |
| HTTP→PostgreSQL legacy/rate-limit boundary | **4/4** | `vitest run tests/integration/pix-legacy-confirmation-http-postgres.test.ts` |
| API keys module | **13/13** | `vitest run packages/modules/api-keys/src/api-keys.test.ts` |
| API-key mapper | **3/3** | `vitest run packages/modules/api-keys/src/repositories/database-api-key.repository.test.ts` |
| Auth helper rate-limit | **2/2** | `tsx --test apps/api/src/helpers/auth-helpers.test.ts` |
| Runtime ACL/RLS | **1/1** | `vitest run tests/integration/rls/runtime-role-sensitive-acl.test.ts` |
| OpenAPI / RLS / secret scan / diff check | **PASS** | OpenAPI 335 paths/386 schemas; RLS 153/154; secret scan and diff check |
| secret scan | **PASS** | `pnpm security:secrets` |
| diff check | **PASS** | `git diff --check` |

## Limitações e achados que a próxima sessão deve preservar

- A prova de restart simula a perda de processo/worker encerrando o pool A depois do claim. Ela comprova fence, lease expiry e takeover em pools distintos, mas não é um `SIGKILL` de processo real nem uma matriz completa de falhas durante cada escrita B1.
- O redrive continua sendo um primitive interno, bounded e auditado. Ainda não existe endpoint operacional, fila DLQ dedicada, runbook de reprocessamento, alertas/traces ou dashboard de reconciliação.
- O teste HTTP agora usa o `DatabaseApiKeyRepository` real, sem adapter, depois do lookup `SECURITY DEFINER` pré-contexto e do mapper JSONB estrito. A prova é local/descartável e não equivale a produção; ainda falta homologação externa e rotação real de credenciais.
- O rate limit agora é atomicamente consumido no PostgreSQL e coberto sob concorrência HTTP, mas não há ainda benchmark multi-réplica nem política operacional de limites por parceiro.
- O código usa somente `local-pix` sintético; provider real, credenciais, homologação fiscal, deploy, produção e aceite de risco exigem autoridade humana.
- B2c/SPA/E2E, estoque/laboratório/internação ponta a ponta, paridade Vetus (`11/11 + 3/3`), WCAG, performance e certificação operacional continuam fora deste checkpoint.
- O cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo` permanece deliberadamente fora dos commits.

## Retomada

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

Próximo gap local: adicionar DLQ/runbook/alertas, executar as regressões B1/B2a/ingress/HTTP completas e abrir o gate B2c separadamente. Não marcar `CVG-002B2B`, `CVG-002` ou o ERP geral como concluídos.
