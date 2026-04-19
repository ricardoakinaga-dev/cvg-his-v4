# 0325 — Catálogo Operacional de Feature Flags

**Taxonomia:** `OPERACIONAL`
**Papel no sistema documental:** catalogo vivo da superficie operacional de feature flags e sua governanca minima
**Ler em conjunto com:** `README.md`, `0335-RELATORIO-AUDITORIA-EXTREMA-WORKSPACE-2026-04-19.md`, `100-ROADMAP-VISAO-GERAL.md`, `200-BACKLOG-MASTER.md`

**Data:** 2026-04-14
**PR:** PR-FF-12 (EP-FF-05 — Governança Operacional)
**Status:** ✅ DONE

---

## Resumo

PR-FF-12 implementa o catálogo operacional de feature flags com documentação e endpoint de leitura (`GET /flags`). O endpoint retorna o inventário completo de flags com `owner`, `default` e `expiração`.

---

## Endpoint de Catálogo

### `GET /flags` — Listar todas as flags da conta

**Permissão:** `flags.read`

**Resposta:**
```json
{
  "items": [
    {
      "key": "auth.oidc.enabled",
      "owner": "security-auth",
      "description": "Controls OIDC login rollout in the API runtime.",
      "defaultValue": false,
      "scopes": ["environment", "account"],
      "expiresAt": "2026-12-31T00:00:00.000Z",
      "auditRequired": true,
      "tags": ["auth", "oidc", "rollout"],
      "metadata": {}
    }
  ],
  "total": 4
}
```

### `GET /flags/:key` — Obter flag específica

**Permissão:** `flags.read`

### `POST /flags` — Criar nova flag

**Permissão:** `flags.admin`

**Body:**
```json
{
  "key": "module.feature.enabled",
  "owner": "team-name",
  "description": "Description of the flag purpose",
  "defaultValue": false,
  "scopes": ["environment", "account"],
  "expiresAt": "2026-12-31T00:00:00.000Z",
  "auditRequired": true,
  "tags": ["rollout"]
}
```

### `PATCH /flags/:key` — Atualizar flag

**Permissão:** `flags.admin`

### `DELETE /flags/:key` — Desabilitar flag (via override)

**Permissão:** `flags.admin`

### `GET /flags/:key/evaluate` — Avaliar flag para contexto atual

**Permissão:** `flags.read`

### `POST /flags/:key/overrides` — Criar/Atualizar override

**Permissão:** `flags.admin`

### `GET /flags/:key/overrides` — Listar overrides

**Permissão:** `flags.read`

---

## Flags Catalogadas (Seed Data)

| Key | Owner | Default | Expira | Tags |
|-----|-------|---------|--------|------|
| `auth.oidc.enabled` | security-auth | `false` | 2026-12-31 | auth, oidc, rollout |
| `auth.webauthn.enabled` | security-auth | `false` | 2026-12-31 | auth, mfa, webauthn, rollout |
| `runtime.distributed_state.enabled` | platform-runtime | `false` | 2026-12-31 | runtime, redis, rollout |
| `fiscal.backoffice.enabled` | erp-fiscal | `false` | 2026-12-31 | fiscal, erp, rollout |

---

## Campos Obrigatórios por Flag

Conforme as regras operacionais do backlog `0319`:

- `owner` — equipe ou pessoa responsável pela flag
- `description` — descrição clara do propósito
- `defaultValue` — valor default quando nenhum override existe
- `scopes` — escopos de avaliação (`global`, `environment`, `tenant`, `account`, `user`)
- `expiresAt` — data de expiração (obrigatório para flags de rollout)

---

## Validação

```bash
pnpm --filter @cvg-his-v2/api typecheck
pnpm --filter @cvg-his-v2/api build
```

---

## Rascunho de Testes

### Teste: GET /flags retorna inventário completo

```typescript
test('GET /flags returns flag inventory with owner, default and expiration', async () => {
  const server = createServerWithFeatureFlags();
  const accessToken = await login(server, 'admin');

  const response = await performRequest(server, {
    method: 'GET',
    url: '/flags',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 200);
  const body = response.bodyJson<{ items: unknown[]; total: number }>();
  assert.ok(body.items.length > 0, 'Should have at least one flag');

  // Verifica campos obrigatórios
  const flag = body.items[0] as Record<string, unknown>;
  assert.ok(flag.key, 'Should have key');
  assert.ok(flag.owner, 'Should have owner');
  assert.ok(flag.defaultValue !== undefined, 'Should have defaultValue');
  assert.ok(flag.expiresAt, 'Should have expiresAt');
});
```

---

## Dependências

- PR-FF-04 ✅: Schema e persistência (`packages/db/src/schema/feature_flags.ts`)
- PR-FF-05 ✅: Provider `database` (`createDatabaseFeatureFlagProvider`)
- PR-FF-07 ✅: Integração no bootstrap da API
- PR-FF-10 ✅: Rotas administrativas (`handleFeatureFlagsRoutes`)

---

##进阶后续

PR-FF-12 fecha o critério de aceite da Onda 4 (Governança Operacional):
- ✅ administradores conseguem operar flags com segurança
- ✅ toda alteração fica registrada (via audit)
- ✅ existe catálogo oficial consultável (`GET /flags`)
- ✅ mudanças de rollout não dependem de acesso informal ao código
