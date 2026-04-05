# RLS — Guia de Uso para Desenvolvedores

## Visao Geral

Row-Level Security (RLS) foi implementado no PostgreSQL para garantir isolamento cross-tenant no nivel do banco. Todas as operacoes de leitura e escrita sao automaticamente filtradas pelo `account_id` do tenant corrente.

## Como Funciona

### Variavel de Sessao

O RLS usa a variavel de sessao `app.current_account_id` para identificar qual tenant esta fazendo a operacao:

```sql
SET app.current_account_id = 'uuid-do-account';
SELECT * FROM owners;  -- So retorna owners deste account
```

### Policies

Cada tabela protegida tem uma policy `FOR ALL` que:

- **USING**: filtra SELECT, UPDATE, DELETE — so ve/modifica dados do account corrente
- **WITH CHECK**: filtra INSERT — so permite inserir dados do account corrente

## Uso na Aplicacao

### 1. Com Pool direto (recomendado para transacoes)

```typescript
import { pool, withTenantContext } from '@cvg-his-v2/db';

const owners = await withTenantContext(pool, accountId, async (client) => {
  const result = await client.query('SELECT * FROM owners');
  return result.rows;
});
```

### 2. Setando contexto manualmente

```typescript
import { pool, setSessionAccountId } from '@cvg-his-v2/db';

const client = await pool.connect();
try {
  await client.query('BEGIN');
  await setSessionAccountId(client, accountId);

  // Todas as queries aqui sao filtradas por account_id
  const result = await client.query('SELECT * FROM patients');

  await client.query('COMMIT');
} finally {
  client.release();
}
```

### 3. Com tenant-context do app

```typescript
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import { pool, setSessionAccountId } from '@cvg-his-v2/db';

// No middleware da API:
const tenantCtx = {
  tenantId: '...',
  accountId: principal.user.accountId,
  userId: principal.user.id,
  correlationId: '...'
};

await runWithTenantContext(tenantCtx, async () => {
  const client = await pool.connect();
  try {
    await setSessionAccountId(client, tenantCtx.accountId);
    // queries com RLS ativo
  } finally {
    client.release();
  }
});
```

## Auditoria

### Verificar status do RLS

```sql
-- View com status de todas as tabelas
SELECT * FROM app.rls_status;

-- Resumo quantitativo
SELECT * FROM app.rls_summary();

-- Verificar se tabela especifica tem RLS
SELECT app.is_rls_enabled('owners');
```

### Via TypeScript

```typescript
import { pool, getRlsSummary, checkRlsEnabled } from '@cvg-his-v2/db';

const client = await pool.connect();
const summary = await getRlsSummary(client);
console.log(summary);
// { totalTables: 64, rlsEnabled: 50, rlsDisabled: 14, tablesWithPolicies: 50 }

const isEnabled = await checkRlsEnabled(client, 'owners');
console.log(isEnabled); // true
```

## Tabelas Protegidas (50)

### Core

- `owners`, `patients`, `encounters`, `appointments`, `users`
- `products`, `services`, `staff`, `units`, `wards`, `beds`
- `documents`, `clinical_notes`, `clinical_note_versions`

### Financeiro

- `payments`, `cash_registers`, `cash_movements`
- `counter_sales`, `counter_sale_items`, `counter_sale_payments`
- `quotes`, `quote_items`
- `encounter_billing_items`, `encounter_financial_accounts`
- `encounter_receivables`, `encounter_receivable_payments`

### Clinico

- `exam_orders`, `exam_results`
- `inpatient_stays`, `medication_orders`, `medication_order_schedules`
- `medication_administrations`
- `encounter_documents`

### Operacional

- `alerts`, `notifications`, `notification_jobs`
- `protocols`, `protocol_versions`, `protocol_snapshots`, `protocol_references`
- `shift_handovers`, `shift_handover_items`
- `professional_availability`, `appointment_type_configs`

### Estoque

- `stock_items`, `stock_lots`, `stock_movements`

### Governanca

- `access_teams`, `access_sectors`

### Audit

- `audit_events` (policy especial: permite null account_id)

## Tabelas NAO Protegidas (14)

### Globais (nao precisam de RLS)

- `tenants`, `accounts` — protegidas por acesso de plataforma
- `roles`, `permissions` — definicoes globais

### Join tables (isolamento indireto)

- `role_permissions`, `user_roles`
- `access_team_memberships`, `access_sector_memberships`
- `access_user_permissions`, `access_team_permissions`, `access_sector_permissions`

### Text-based (pendentes de migracao para uuid)

- `triage_records`, `triage_record_versions`, `scheduling_queue_entries`

## Rollback

Em caso de emergencia, execute o revert migration:

```bash
psql -f packages/db/migrations/0003_rls_core_tables.revert.sql
```

⚠️ **Atencao**: Reverter RLS remove a protecao cross-tenant no nivel do banco. A aplicacao deve ter fallback de filtragem por `account_id` em todas as queries.

## Trade-offs e Decisoes

1. **account_id vs tenant_id**: Usamos `account_id` como chave de RLS porque ja existe em 50+ tabelas. O mapeamento `account -> tenant` e feito via `accounts.tenant_id`.

2. **SET LOCAL vs SET**: Usamos `SET LOCAL` dentro de transacoes para garantir que o contexto seja resetado automaticamente no COMMIT/ROLLBACK.

3. **SECURITY DEFINER**: As funcoes `app.*` sao `SECURITY DEFINER` para que possam ler a variavel de sessao mesmo quando o usuario de aplicacao nao tem permissao direta.

4. **audit_events nullable**: `audit_events.account_id` e nullable (onDelete: set null). A policy permite leitura de eventos sem account apenas quando o contexto tambem e NULL.
