# Plano: Próximos Passos — Feature Flags

**Data:** 2026-04-14  
**Escopo:** Feature Flags (onda 2 em diante, conforme backlog `0319`)  
**Fonte:** `docs/Enterprise/0319-BACKLOG-OPERACIONAL-FEATURE-FLAGS-2026-04-13.md`

---

## 1. Status Atual

### Construído ✅

| Componente | Status | Evidência |
|---|---|---|
| Package `@cvg-his-v2/shared-feature-flags` | ✅ DONE | Tipos (`FlagDefinition`, `FeatureFlagProvider`, `FlagDecision`), `FeatureFlagRegistry`, `createEnvFeatureFlagProvider`, validações |
| Integração `shared-config` | ✅ DONE | `FEATURE_FLAGS_PROVIDER` (schema Zod `'env'`), `API_FEATURE_FLAGS`, `WORKER_FEATURE_FLAGS` em `config/index.ts` |
| API bootstrap | ✅ DONE | `createApiFeatureFlags` chamada em `createApiServer` (`server.ts:188`), 4 flags registradas |
| Worker bootstrap | ✅ DONE | `createWorkerFeatureFlags` em `feature-flags.ts`, 2 flags (`runtime.distributed_state`, `notifications.whatsapp`) |
| Consumo em handlers | ✅ DONE | `auth.webauthn.enabled` em 4 rotas, `auth.oidc.enabled` em 3 rotas (`server.ts`) |

### Pendente ❌

| Componente | Status | Impacto |
|---|---|---|
| Schema de banco para flags | ❌ TODO | Não há persistência, governança via env var only |
| Provider database-backed | ❌ TODO | Flags não podem ser alteradas sem redeploy |
| Rotas administrativas `/flags/*` | ❌ TODO | Administradores não conseguem operar flags |
| Auditoria de mudanças | ❌ TODO | Não há evidência de quem mudou o quê |
| Métricas e alertas do provider | ❌ TODO | Fallback e erro não são visíveis |
| Rollout percentual / kill switch | ❌ TODO | Suporte a `%` e allowlist não existe |
| Cache TTL no provider env | ❌ TODO | Provider evalua a cada chamada sem cache |

---

## 2. Próximos Passos Recomendados (ordem por dependência)

### Passo 1 — Provider Canonico Database-Backed (Onda 2)

**Por que primeiro:** Todas as ondas seguintes (governança, observação, adoção real) dependem de um provider que não seja só leitura de env.

**Escopo:**
1. Criar schema `feature_flags` em `packages/db/src/schema/`:
   - `id`, `key` (unique), `description`, `owner`, `default_value`, `enabled`, `scopes`, `expires_at`, `created_at`, `updated_at`
2. Criar tabela `feature_flag_overrides`:
   - `id`, `flag_id` (FK), `environment`, `account_id`, `percentage`, `allowed_users`, `enabled`, `created_at`
3. Criar `DatabaseFeatureFlagProvider` em `packages/shared/feature-flags/src/providers/`
4. Interface: `FeatureFlagProvider` implementado com leitura em DB + fallback env
5. Wiring em `shared-config`: quando `FEATURE_FLAGS_PROVIDER=database`, usar o novo provider

**Critério de pronto:**
- `createDatabaseFeatureFlagProvider(db, envProviderFallback)` retorna `FeatureFlagProvider`
- AvaliaçãoConsulta DB → cache in-memory TTL 60s → fallback para env
- Kill switch: se DB falhar, volta ao provider env sem exceção

---

### Passo 2 — Rotas Administrativas (Onda 4)

**Escopo:**
1. `GET /feature-flags` — lista todas as flags com definition + overrides
2. `POST /feature-flags` — criar flag (owner, desc, default, scopes, expires)
3. `PUT /feature-flags/:key` — atualizar flag
4. `DELETE /feature-flags/:key` — soft delete (ou marcar `enabled=false`)
5. `GET /feature-flags/:key/evaluate?environment=&accountId=` — avaliar flag

**Segurança:**
- `POST/PUT/DELETE` requerem permissão `flags:admin`
- `GET` open para qualquer authenticated
- Auditoria: todo write vai para `audit_events`

**Critério de pronto:**
- Administrador consegue alterar flag via API sem mexer em env
- Resposta inclui owner, expiresAt,Scopes, evaluation atual

---

### Passo 3 — Observabilidade e Métricas (Onda 6 / Onda 5)

**Escopo:**
1. Em `metrics.ts`, adicionar counters:
   - `feature_flag_evaluations_total{flag, provider, result}`
   - `feature_flag_fallback_total{flag}`
   - `feature_flag_error_total{flag, provider}`
2. Log estruturado: toda avaliação registra flag key, provider, reason, enabled, duration_ms
3. Health endpoint incluir status do provider de flags

**Critério de pronto:**
- Métricas aparecem em `/metrics`
- Dashboards podem plotar fallback rate por flag
- Alerta configurável: fallback rate > 5% em janela de 5min

---

### Passo 4 — Rollout Percentual e Kill Switch (Onda 2 continuação)

**Escopo:**
1. Implementar `percentage` em `feature_flag_overrides`
2. Hash determinístico `accountId + flagKey` → % → decide enabled
3. `allowed_users` como allowlist explícito (override percentual)
4. Kill switch: flag com `enabled=false` em DB ignora semua evaluation

**Critério de pronto:**
- Teste: 100 accounts com same override → mesma distribuição em 3 execuções
- Kill switch verified: desativar flag em DB desativa para todos mesmo com cache

---

### Passo 5 — Adoção Real (Onda 5 / Onda 7)

**Escopo:**
1. Migrar as flags existentes de env var para DB:
   - `auth.oidc.enabled`
   - `auth.webauthn.enabled`
   - `runtime.distributed_state.enabled`
   - `fiscal.backoffice.enabled`
   - `notifications.whatsapp.provider_enabled`
2. Manter provider env como fallback para cada uma
3. Popular `feature_flags` table com as definitions atuais
4. Remover flags de `API_FEATURE_FLAGS`/`WORKER_FEATURE_FLAGS` gradualmente

**Critério de pronto:**
- Flags continuam funcionando com provider env fallback
- Flags passam a ser gerenciáveis via `/feature-flags`
- `IMP-203` fechável com evidência

---

## 3. Roadmap Simplificado

```
Agora ──▶ [Passo 1] ──▶ [Passo 2] ──▶ [Passo 4] ──▶ [Passo 5]
          DB-backed      Rotas       Rollout %    Adoção real
          provider       admin        Kill switch    flags em DB
                         + auditoria

          [Passo 3] Observabilidade roda em paralelo após passo 2
```

**Estimativa:** Passos 1–4 = 2–3 sprints. Passo 5 = 1 sprint. Passo 3 pode rodar em paralelo.

---

## 4. Definição de Pronto Geral

O sistema de feature flags será considerado **DONE** quando:

1. ✅ Flags podem ser criadas, alteradas e desativadas via API sem redeploy
2. ✅ Toda mudança de flag gera evento de auditoria
3. ✅ Provider tem fallback seguro (DB → env → default)
4. ✅ Métricas de fallback/erro estão visíveis em `/metrics`
5. ✅ Rollout percentual e kill switch funcionam
6. ✅ Pelo menos 5 flags reais estão sendo gerenciadas via API
7. ✅ `server.ts` não é mais o único ponto de avaliação de flags
