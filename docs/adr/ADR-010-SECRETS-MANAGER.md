# ADR-010 — Secrets Manager com HashiCorp Vault

**Data**: 2026-04-14
**Status**: Aprovado
**Contexto**: Implementar manager dedicado para segredos do CVG-HIS V2 — decisão de provider

---

## Decisão

O CVG-HIS V2 adotará **HashiCorp Vault (self-hosted)** como Secrets Manager dedicado.

**Provider implementado:** `VaultSecretsProvider` (AppRole auth + KV-v2 secrets engine)
**Fallback:** `EnvSecretsProvider` — mantém comportamento atual (leitura de `process.env`)
**Gate:** `VAULT_ENABLED=1` ativa Vault; caso contrário usa fallback

---

## Justificativa

| Critério | HashiCorp Vault | AWS Secrets Manager | Azure Key Vault |
|---------|-----------------|---------------------|-----------------|
| Self-hosted | ✅ (full control) | ❌ (cloud only) | ❌ (cloud only) |
| AppRole auth | ✅ (machine-to-machine ideal) | IAM Role | Managed Identity |
| KV-v2 secrets engine | ✅ (primeira escolha) | ✅ | ✅ |
| Rotação automática | ✅ (via Agent Sidecar) | ✅ (native) | ✅ |
| Audit de acesso | ✅ (Vault audit log) | ✅ (CloudTrail) | ✅ |
| Licença | Mozilla Public License 2.0 | AWS invoice | Azure invoice |
| Acoplamento cloud | Nenhum | AWS-only | Azure-only |

**Por que Vault self-hosted over cloud-native:**
- Infraestrutura pode ser multi-cloud ou on-premises
- Não acopla a nenhuma cloud provider específica
- AppRole é superior para workloads containers (vs IAM role precisa de metadata service)
- Equipe já familiarizada com Vault (politica 0195 menciona Vault)

---

## Arquitetura

```
packages/secrets/
  src/
    index.ts              # createSecretsManager() factory
    types.ts              # SecretsManager, SecretDescriptor
    providers/
      env-secrets.provider.ts     # fallback
      vault-secrets.provider.ts  # Vault AppRole + KV-v2
```

### Interface

```typescript
export interface SecretsManager {
  readonly provider: 'vault' | 'env';
  get(secret: SecretDescriptor): Promise<string>;
  getMany(secrets: readonly SecretDescriptor[]): Promise<Record<string, string>>;
  health(): Promise<boolean>;
}

type SecretDescriptor = {
  readonly key: string;           // env var fallback name
  readonly path: string;          // Vault KV-v2 path: 'cvg-his-v2/production/api'
  readonly version?: number;       // optional for Vault
  readonly required?: boolean;    // throw if missing
};
```

---

## Configuração

```bash
# .env — para development/local (comportamento atual)
AUTH_SECRET=your-secret-here
PAGARME_API_KEY=your-key-here
...

# .env — para produção com Vault
VAULT_ENABLED=1
VAULT_URL=https://vault.cvg.com:8200
VAULT_ROLE_ID=approle-role-id
VAULT_SECRET_ID=approle-secret-id
VAULT_SECRET_PATH_PREFIX=secret/data/cvg-his-v2
```

**Inventário de segredos gerenciados:**

| Chave env | Vault path |
|-----------|-----------|
| `AUTH_SECRET` | `secret/data/cvg-his-v2/production/api` |
| `MFA_SECRET_ENCRYPTION_KEY` | `secret/data/cvg-his-v2/production/mfa` |
| `DATABASE_URL` | `secret/data/cvg-his-v2/production/database` |
| `REDIS_URL` | `secret/data/cvg-his-v2/production/redis` |
| `OIDC_CLIENT_SECRET` | `secret/data/cvg-his-v2/production/oidc` |
| `WHATSAPP_API_KEY` | `secret/data/cvg-his-v2/production/whatsapp` |
| `PAGARME_API_KEY` | `secret/data/cvg-his-v2/production/pagarme` |
| `PAGARME_PIX_KEY` | `secret/data/cvg-his-v2/production/pagarme` |

---

## Fluxo de Inicialização

```
loadApiConfig()
  → process.env (parse VAULT_* vars)
  → createSecretsManager({ vaultEnabled, vaultUrl, vaultRoleId, vaultSecretId })
      → if vaultEnabled && all Vault vars set → VaultSecretsProvider
      → else → EnvSecretsProvider (fallback)
  → secretsManager instance passed to createApiServer()
  → logged: { provider: 'vault'|'env', vaultEnabled: bool }
```

---

## AppRole Authentication Flow

1. `POST /v1/auth/approle/login` com `{ role_id, secret_id }`
2. Recebe `client_token` com TTL de 5 minutos (default)
3. Token cacheado com expiração
4. Em cada read: usa token cacheado se válido; renova se expirado
5. Retry com backoff em falhas transitórias

---

## Health Check

`GET /health` inclui:

```json
{
  "dependencies": {
    "secretsManager": {
      "state": "configured",
      "detail": "vault"
    }
  }
}
```

`GET /ready` falha se `secretsManager.health()` retornar `false` (quando Vault configurado).

---

## Validação

1. `pnpm --filter @cvg-his-v2/secrets typecheck` — package compila ✅
2. `pnpm --filter @cvg-his-v2/api typecheck` — API compila ✅
3. `VAULT_ENABLED=0` (dev default): comportamento inalterado ✅
4. `VAULT_ENABLED=1` + Vault acessível: secrets lidos do Vault

---

## Não coberto nesta iteração

- Rotação automática (requer Vault Agent Sidecar + runbook)
- Scanning em runtime (coberto por `pnpm security:secrets` pre-commit)
- AWS SM / GCP SM (escolha foi Vault self-hosted)

---

## Consequências

### Positivas

- Secrets nunca mais em plaintext no repositório
- Audit trail de acesso a cada segredo via Vault audit log
- Rotação gerenciada via política 0195 + Vault
- Fallback seguro: funciona sem Vault (dev/local)

### Negativas

- Requer infraestrutura Vault em produção
- AppRole credentials (role_id + secret_id) precisam ser provisionados antes do deploy
- Latência adicional de ~10-50ms por startup (primeira chamada Vault)

---

## Data de Implementação

GAP-04: implementado em 2026-04-14
