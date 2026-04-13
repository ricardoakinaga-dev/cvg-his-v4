# 0205 - Relatório Rotas DB e Alinhamento Sessions Audit

**Status:** canônico  
**Data:** 2026-04-12  
**Escopo:** validação de rotas com banco real, verificação de migration no deploy e correção do desalinhamento `sessions`/`audit`

---

## 1. Objetivo

Este relatório fecha dois pontos:

- garantir que as rotas documentadas existam no runtime com banco real
- corrigir o risco residual encontrado no harness entre runtime DB e schema vivo para `sessions` e `audit`

---

## 2. Evidência executada

Comandos executados:

- `pnpm vitest run tests/integration/api-routes-db.test.ts --config vitest.config.ts`
- `pnpm vitest run tests/integration/deploy-migrations-contract.test.ts packages/modules/audit/src/audit.test.ts --config vitest.config.ts`

Resultado:

- `tests/integration/api-routes-db.test.ts`: `PASS` com `3` testes
- `tests/integration/deploy-migrations-contract.test.ts`: `PASS` com `3` testes
- `packages/modules/audit/src/audit.test.ts`: `PASS` com `16` testes

---

## 3. Correção aplicada

### 3.1 Audit

Problema real:

- `AuditService` gerava `eventId` no formato `audit_*`
- `audit_events.id` no banco canônico é `uuid`
- o runtime também podia enviar `actorId` e `accountId` legados como `user_admin` e `acc_cvg_demo`, incompatíveis com colunas FK UUID

Correção:

- `packages/modules/audit/src/index.ts`
  - `eventId` agora é `UUID` via `randomUUID()`
- `packages/modules/audit/src/repositories/database-audit.repository.ts`
  - colunas relacionais `account_id` e `actor_user_id` só recebem valor quando o ID é UUID válido
  - quando o runtime entrega IDs legados, eles são preservados em `metadata.legacyAccountId` e `metadata.legacyActorId`
  - `metadata.module` passou a registrar o módulo de origem
  - leitura de auditoria recompõe `actorId`, `accountId` e `module` a partir do row + metadata

Efeito:

- eventos de auditoria voltam a persistir no banco canônico sem perder rastreabilidade do runtime legado

### 3.2 Sessions

Problema real:

- o bootstrap em modo banco instanciava `DatabaseSessionRepository`
- esse repositório depende de uma tabela `sessions`
- a tabela `sessions` não existe nas migrations canônicas de `packages/db`

Correção:

- `apps/api/src/bootstrap.ts`
  - em modo DB, `session` passa a usar `InMemorySessionRepository`
  - `audit` continua em repositório real de banco
  - o bootstrap agora loga explicitamente que `sessionPersistence` está em `in-memory-fallback`

Efeito:

- o runtime deixa de prometer persistência em banco para sessões sem tabela canônica
- o erro estrutural some do harness e do deploy DB-backed

---

## 4. Cobertura adicionada

`tests/integration/api-routes-db.test.ts` agora prova:

- bootstrap DB com `session` em fallback de memória
- bootstrap DB com `audit` persistido em banco
- gravação real de `audit_events` após login
- preservação de `legacyAccountId` e `legacyActorId` em `metadata`
- persistência HTTP + DB para `webhooks`
- cobertura ampla de OpenAPI vs runtime sem rotas documentadas faltando

`tests/integration/deploy-migrations-contract.test.ts` continua provando:

- `infra/scripts/cutover-v2.sh` executa migration antes de subir serviços
- setup de testes aplica migration antes de seed
- `drizzle_migrations` contém exatamente os arquivos oficiais de `packages/db/migrations`

---

## 5. Conclusão

O risco residual foi tratado com uma decisão operacional explícita:

- `audit`: compatível com schema vivo e persistindo em banco
- `sessions`: fallback em memória até existir tabela canônica migrada

Estado após a correção:

- rotas documentadas cobertas contra runtime real: `OK`
- contrato de migration/deploy: `OK`
- persistência de auditoria no banco canônico: `OK`
- incompatibilidade estrutural de sessão com schema vivo: mitigada no bootstrap, sem mascarar a ausência da tabela

Próximo passo recomendado:

- criar uma superfície canônica de sessão em `packages/db` se a exigência de persistência cross-instance para autenticação passar a ser obrigatória
