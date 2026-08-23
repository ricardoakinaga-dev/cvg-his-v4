# CVG-002B2B — checkpoint de recovery, DLQ/observabilidade e barreira HTTP→PostgreSQL

**Data:** 22 de agosto de 2026, após a execução dos testes da sessão
**Branch:** `agent/sync-v4-full-program`
**Estado:** implementação local verificada em fatias limitadas; `CVG-002B2B` permanece `IN_PROGRESS/PARTIAL`.

Este artefato é o ponto de retomada para a próxima sessão. Ele registra somente evidência observada no workspace e no PostgreSQL descartável; não promove o ERP, o provider sintético ou a API key database para produção.

## Incrementos implementados

- O repositório de delivery mantém `claimNext` compatível e expõe a extensão aditiva `claimNextWithPromotion`. Promoções automáticas de `attempts >= max_attempts` para `reconciliation_required` retornam a contagem na mesma UoW tenant-scoped.
- O consumer PIX emite evento estruturado `pix_provider_settlement.delivery_outcome`, classifica somente códigos de falha allowlisted, registra métricas Prometheus agregadas sem tenant/delivery/event/worker/error-code labels e trata telemetria como best-effort.
- O caminho de exaustão é observável mesmo sem claim: `PIX_SETTLEMENT_ATTEMPTS_EXHAUSTED`, `source=attempts_exhausted`, evento terminal e incremento agregado por promoção. Contagem inválida é rejeitada fail-closed.
- O teste de recovery usa dois `pg.Pool` independentes: A obtém lease curto e encerra o pool antes de B1/CAS; B espera a expiração, obtém novo token/lease version, rejeita a execução fenced de A, aplica o mesmo B1 uma vez e não cria segunda receipt nem nova idempotência.
- A integração HTTP→PostgreSQL cria `pix_transactions` attempt-linked com `DatabasePixTransactionRepository`, observa o registro em outra conexão, confirma via HTTP real com API key e prova `410` sem gateway/outbox; uma chave de outra conta recebe `404` opaco; um PIX direto sem `payment_attempt_id` mantém `200`, uma chamada ao gateway e um outbox confirmado.
- O teste de principal de serviço deixou de ser vacuoso: reconstrói o estado pré-`0112` dentro de uma transação rollback-only, reaplica a migration e valida backfill/defaults, além dos negativos RLS para usuários e mappings cross-tenant.
- Foram adicionados os negativos de rota cross-account para o `410` e o teste unitário direto de transação aninhada, comprovando uma conexão, um `BEGIN/COMMIT` e o mesmo client/ALS.

## Evidência executada

| Escopo | Resultado | Comando principal |
| --- | ---: | --- |
| worker completo | **54/54** | `pnpm --filter @cvg-his-v2/worker test` |
| shared transaction context | **4/4** | `node --test packages/shared/database/dist/tenant-transaction-context.test.js` |
| API payments route | **4/4** | build da API + `node --test dist/routes/payments-routes.test.js` |
| worker PostgreSQL fencing/restart | **6/6** | `vitest run tests/integration/database/pix-provider-settlement-consumer.test.ts` |
| service principals/RLS | **5/5** | `vitest run tests/integration/database/pix-service-principals.test.ts` |
| HTTP→PostgreSQL legacy boundary | **3/3** | `vitest run tests/integration/pix-legacy-confirmation-http-postgres.test.ts` |
| API keys module | **10/10** | `pnpm --filter @cvg-his-v2/module-api-keys test` |
| OpenAPI | **PASS** | `pnpm validate:openapi` — 335 paths/386 schemas |
| secret scan | **PASS** | `pnpm security:secrets` |
| diff check | **PASS** | `git diff --check` |

## Limitações e achados que a próxima sessão deve preservar

- A prova de restart simula a perda de processo/worker encerrando o pool A depois do claim. Ela comprova fence, lease expiry e takeover em pools distintos, mas não é um `SIGKILL` de processo real nem uma matriz completa de falhas durante cada escrita B1.
- O redrive continua sendo um primitive interno, bounded e auditado. Ainda não existe endpoint operacional, fila DLQ dedicada, runbook de reprocessamento, alertas/traces ou dashboard de reconciliação.
- O teste HTTP usa um adaptador PostgreSQL de API keys porque o `DatabaseApiKeyRepository` atual faz `JSON.parse(row.permissions)` apesar de o driver `pg` devolver JSONB como array, e a validação inicial ocorre antes de existir contexto tenant para `withTenantQuery`. Portanto a barreira HTTP→PostgreSQL está provada, mas o caminho padrão de autenticação database-backed continua um gap de produção a corrigir.
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

Próximo gap local: corrigir o contrato de autenticação API-key pré-contexto sem relaxar RLS, adicionar DLQ/runbook/alertas, executar as regressões B1/B2a/ingress/HTTP e abrir o gate B2c separadamente. Não marcar `CVG-002B2B`, `CVG-002` ou o ERP geral como concluídos.
