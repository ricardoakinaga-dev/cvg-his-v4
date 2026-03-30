# Estratégia de Migrations — CVG-HIS-V2

**Data:** 2026-03-30
**Versão:** 1.0

---

## 1. Propósito

Este documento define a estratégia de versionamento e aplicação de mudanças de banco de dados no CVG-HIS-V2, garantindo:

- Idempotência em ambientes de produção
- Reversibilidade quando necessário
- Rastreabilidade de esquema
- Automação de deploy

---

## 2. Localização das Migrations

Todas as migrations oficiais do V2 estão em:

```
packages/shared/database/src/migrations/
```

Cada migration é um arquivo `.sql` com nome prefixado por número ordinal:

```
001_initial_schema.sql
002_entry_revisions.sql
003_advanced_care_persistence.sql
004_clinical_entry_governance.sql
005_sectors_beds.sql
...
```

---

## 3. Nomenclatura e Ordenação

- **Prefixos numéricos** obrigatórios: `001`, `002`, `003`, ... até `999`
- Usar **underscore** após o número: `001_descricao.sql`
- Descrição em **inglês**, concisa, separada por hífens: `initial_schema`, `add_versioning_for_patients`
- Ordenação é **sempre crescente** — não pule números a menos que tenha justificativa documentada em ADR

---

## 4. Conteúdo de uma Migration

Toda migration deve ser:

- **Idempotente:** pode ser aplicada múltiplas vezes sem erro
- **Retrocompatível:** não quebra dados existentes (usar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc.)
- **Rastreável:** incluir comentário no topo com:
  ```sql
  -- Migration: 005_sectors_beds.sql
  -- Author: <nome ou equipe>
  -- Date: 2026-03-30
  -- Purpose: Adiciona tabelas sectors e beds e colunas de internação
  -- Issues: <link para ticket ou ADR, se houver>
  ```
- **Transacional:** envolver operações críticas em `BEGIN; ... COMMIT;` (PostgreSQL)

---

## 5. Aplicação em Produção

### 5.1 Ordem de Aplicação

Aplicar **sempre** em ordem crescente. Exemplo:

```bash
psql "$DATABASE_URL" -f packages/shared/database/src/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f packages/shared/database/src/migrations/002_entry_revisions.sql
psql "$DATABASE_URL" -f packages/shared/database/src/migrations/003_advanced_care_persistence.sql
psql "$DATABASE_URL" -f packages/shared/database/src/migrations/004_clinical_entry_governance.sql
# ...
```

### 5.2 Durante o Deploy

As migrations DEVEM ser aplicadas **antes** de subir a API (conforme `130-instalacao-publicacao-cvg-his-v2-real.md` e `131-checklist-cutover-servidor.md`).

No script `cutover-v2.sh`, a aplicação de migrations é etapa obrigatória.

### 5.3 Verificação Pós-Aplicação

Após aplicar, validar:

```bash
psql "$DATABASE_URL" -c '\dt'  # listar tabelas
psql "$DATABASE_URL" -c '\d sectors'  # ver estrutura da tabela nova
```

---

## 6. Rollback de Migrations

### 6.1 Política

- Nem toda migration suporta rollback automático.
- Para **mudanças destrutivas** (DROP TABLE, DROP COLUMN), **sempre** forneça bloco de rollback no mesmo arquivo, comentado:

```sql
-- ROLLBACK: DROP TABLE IF EXISTS sectors;
```

- Para mudanças não destrutivas (ADD COLUMN, CREATE INDEX), rollback pode ser desnecessário.

### 6.2 Procedimento de Rollback Manual

Se preciso reverter uma migration:

1. Identificar a migration número
2. Executar comandos de rollback na ordem reversa
3. Registrar no log de auditoria

---

## 7. Criação de Nova Migration

### 7.1 Passos

1. **Criar arquivo** com número sequencial + descrição:
   ```
   packages/shared/database/src/migrations/006_add_user_settings.sql
   ```
2. **Conteúdo idempotente** (exemplo):
   ```sql
   BEGIN;

   CREATE TABLE IF NOT EXISTS user_settings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     settings JSONB NOT NULL DEFAULT '{}',
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );

   CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

   -- Trigger para updated_at
   CREATE OR REPLACE FUNCTION set_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER trg_user_settings_updated_at
     BEFORE UPDATE ON user_settings
     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

   COMMIT;
   ```
3. **Documentar** em comentário no topo (autor, data, propósito)
4. **Atualizar documentação** se necessário (ex: `docs/data-foundation.md`)

### 7.2 Validação

Antes decommitar:

- Testar em banco de desenvolvimento limpo
- Testar idempotência (rodar duas vezes)
- Garantir que não causa erro em ambiente com dados existentes

---

## 8. Controle de Versão do Schema

- O **número do arquivo** é a ordem de aplicação.
- **Nunca reordenar** arquivos existentes.
- **Nunca modificar** migrations já aplicadas em produção — criar nova migration para alterações.
- Manter histórico de aplicação em produção via logs ou tabela `schema_migrations` (opcional, mas recomendado):

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL
);
```

Inserir registro após aplicar:

```sql
INSERT INTO schema_migrations (version, description) VALUES (6, 'add_user_settings')
  ON CONFLICT (version) DO NOTHING;
```

---

## 9. Integração com Docker Build

Durante o `docker build` do API, o passo `pnpm install` não deve aplicar migrations. A aplicação de migrations é **etapa de deploy**, não de build.

O `Dockerfile` da API não deve conter `RUN psql ...` — isso é responsabilidade do operador ou do script de cutover.

---

## 10. Ambientes

- **Development:** migrations aplicadas automaticamente via `pnpm staging:bootstrap` ou similar
- **Staging:** aplicar manualmente ou via CI antes de subir a API
- **Production:** aplicar **sempre** antes de subir a API, validar health depois

---

## 11. Monitoração Pós-Migration

Após aplicar migrations:

1. Verificar logs da API por erros de conexão ou schema
2. Validar health check ainda `productionReady: true`
3. Executar smoke tests básicos

---

## 12. Exemplo de Workflow Completo

```bash
# 1. Build das imagens
docker compose -f docker-compose.v2.yml build

# 2. Aplicar migrations (ordenadas)
for f in packages/shared/database/src/migrations/*.sql; do
  echo "Applying $f"
  psql "$DATABASE_URL" -f "$f"
done

# 3. Subir stack V2
docker compose -f docker-compose.v2.yml up -d

# 4. Validar health
curl -s http://127.0.0.1:3001/health | jq '.productionReady'

# 5. Smoke tests
./infra/scripts/smoke-tests.sh  # se existir
```

---

## 13. Referências

- `docs/130-instalacao-publicacao-cvg-his-v2-real.md` — Seção 6 (Banco de dados do V2 real)
- `docs/131-checklist-cutover-servidor.md` — Passo 7 (Aplicar schema)
- `docs/150-release-rollback-procedure-enterprise.md` — Seção 6 (Migrations)
- `INSTALACAO_V2_OPENCLAW.md` — Migrations oficiais listadas

---

## 14. Change Log

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-03-30 | 1.0 | Documento inicial — define estratégia de migrations idempotentes, ordenação, rollback, e integração com deploy |
