# RELATORIO EXECUTOR 24 — 2026-04-10 — CORRECAO BUILD @cvg-his/db TS2769

## 1. Identificacao

- **Executor**: EXECUTOR 24
- **Data**: 2026-04-10
- **Missao**: Corrigir o build quebrado de `@cvg-his/db`, resolvendo a falha `TS2769`
- **Objetivo**: Remover o bloqueio tecnico estrutural pendente no workspace
- **Escopo executado**: Reproducao da falha, identificacao da causa raiz, correcao do seed, validacao do build

---

## 2. Fontes consultadas em /docs/Enterprise

- `9998-STATUS-BUILD-08042026.md` — estado build atual
- `RELATORIO-EXECUTOR-21-2026-04-10-0057.md` — missao anterior (fragilidade operacional API)

---

## 3. Estado inicial encontrado

### Falha Reproduzida

**Comando**: `pnpm --filter @cvg-his/db run build`

**Erro completo**:

```
src/seed.ts(196,6): error TS2769: No overload matches this call.
  Overload 1 of 2, '(value: { name: string | SQL<...>; slug: string | SQL<...>; tenantId: string | SQL<...>; id?: string | ...; createdAt?: SQL<...>; updatedAt?: SQL<...>; isActive?: boolean | ... }): PgInsertBase<...>', gave the following error.
    Argument of type '{ slug: string; name: string; }' is not assignable to parameter of type '...'.
      Property 'tenantId' is missing in type '{ slug: string; name: string; }' but required in type '...'.
```

**Arquivo/linha**: `packages/db/src/seed.ts:196`

### Analise da Causa Raiz

O schema de `accounts` (`packages/db/src/schema/accounts.ts`) foi atualizado para incluir `tenantId` como campo `NOT NULL` com foreign key para `tenants.id`:

```ts
tenantId: uuid('tenant_id')
  .notNull()
  .references(() => tenants.id, { onDelete: 'cascade' }),
```

Porem, a funcao `ensureDefaultAccountAndUnit()` em `seed.ts` nao foi atualizada para fornecer o `tenantId` obrigatorio ao inserir uma account. O seed tenta:

```ts
await db.insert(accounts).values({
  slug: DEFAULT_ACCOUNT_SLUG,
  name: 'Conta padrao'
  // FALTANDO: tenantId
});
```

O seed foi escrito antes da refatoracao multi-tenancy (onda 1) e nunca foi atualizado para refletir a nova obrigatoriedade de `tenantId` na tabela `accounts`.

### Riscos e Bloqueios

- **Risco**: Build de `@cvg-his/db` falhava, impedindo `pnpm build` completo de funcionar
- **Impacto em cascading**: Nenhum (API nao depende diretamente de @cvg-his/db, mas @cvg-his/audit sim)
- **Bloqueio**: Nenhum — a correcao foi direta uma vez identificada a causa

---

## 4. O que foi entregue

### Correcao Aplicada

**Arquivo alterado**: `packages/db/src/seed.ts`

**Mudancas**:

1. **Linha 7**: Adicionado `tenants` ao import do schema:

   ```ts
   import {
     accounts,
     permissions,
     rolePermissions,
     roles,
     tenants, // ADICIONADO
     units,
     userRoles,
     users
   } from './schema/index.js';
   ```

2. **Linha 16**: Adicionado constante para slug do tenant padrao:

   ```ts
   const DEFAULT_TENANT_SLUG = 'default';
   const DEFAULT_ACCOUNT_SLUG = 'default';
   const DEFAULT_UNIT_CODE = 'hq';
   ```

3. **Linhas 193-232** (`ensureDefaultAccountAndUnit`): Modificado para criar tenant padrao ANTES da account:

   ```ts
   // Cria tenant padrao primeiro
   await db
     .insert(tenants)
     .values({
       slug: DEFAULT_TENANT_SLUG,
       name: 'Tenant padrao'
     })
     .onConflictDoNothing({ target: tenants.slug });

   const [tenant] = await db
     .select({ id: tenants.id })
     .from(tenants)
     .where(eq(tenants.slug, DEFAULT_TENANT_SLUG))
     .limit(1);

   if (!tenant) throw new Error('Failed to ensure default tenant');

   // Usa tenant.id na account
   await db
     .insert(accounts)
     .values({
       tenantId: tenant.id, // ADICIONADO
       slug: DEFAULT_ACCOUNT_SLUG,
       name: 'Conta padrao'
     })
     .onConflictDoNothing({ target: accounts.slug });
   ```

**Caracteristicas da correcao**:

- Minimima: apenas o necessario para satisfazer o tipo
- Preserva o contrato: mesmo fluxo logico, apenas com step adicional de tenant
- OnConflictDoNothing: idem potencia existente, safe para reruns
- Sem relaxamento de tipos: nenhuma mudanca de `any`, `as`, ou desabilitacao de strict

---

## 5. Estado final da entrega

### Impacto no Build de `@cvg-his/db`

| Metrica                                            | Antes         | Depois            |
| -------------------------------------------------- | ------------- | ----------------- |
| `pnpm --filter @cvg-his/db run build`              | FAIL (TS2769) | **PASS (exit 0)** |
| `pnpm --filter @cvg-his-v2/module-audit run build` | PASS          | **PASS**          |
| `pnpm --filter @cvg-his-v2/api run test`           | 36/36         | **36/36**         |

### Baseline Operacional Apos Correcao

- `@cvg-his/db` agora builda sem erros
- `pnpm build` completo do workspace volta a ser executavel (antes era bloqueado por este pacote)
- Dependentes (`@cvg-his/audit`) continuam buildando normalmente
- API tests mantidos em 36/36

---

## 6. Validacoes executadas

### Comandos Rodados

| Comando                                            | Resultado         |
| -------------------------------------------------- | ----------------- |
| `pnpm --filter @cvg-his/db run build`              | **PASS (exit 0)** |
| `pnpm --filter @cvg-his-v2/module-audit run build` | **PASS (exit 0)** |
| `pnpm --filter @cvg-his-v2/api run test`           | **36/36 PASS**    |

### Verificacao de Dist

Arquivos de saida verificados em `packages/db/dist/`:

- `seed.js`, `seed.d.ts`, `seed.js.map`
- `schema/` directory
- `connection.js`, `index.js`, `migrate.js`, `rls.js`
- Todos presentes e validos

---

## 7. Pendencias, limites ou bloqueios

| Item                       | Status        | Observacao                               |
| -------------------------- | ------------- | ---------------------------------------- |
| `@cvg-his/db` build error  | **RESOLVIDO** | TS2769 corrigido                         |
| DB integration tests (214) | **BLOQUEADO** | PostgreSQL indisponivel — infraestrutura |
| Nenhuma pendencia nova     | —             | —                                        |

---

## 8. Proximos passos recomendados

1. **IMEDIATO**: Nenhum — o build error foi corrigido
2. **CORTO PRAZO**: Considerar adicionar step de validacao no CI que executa `pnpm --filter @cvg-his/db run build` para garantir que o pacote nao volte a quebrar
3. **COVERAGE**: DB integration tests requerem PostgreSQL em ambiente — ja classificado como infraestrutura

---

## 9. Recomendacoes do executor

### Para Evitar Recorrencia

A causa do bug foi uma desincronizacao entre schema e seed apos a refatoracao multi-tenancy. Para evitar que isso aconteca novamente:

1. **Seed como parte do build check**: Incluir `pnpm --filter @cvg-his/db run build` no gate de build do CI
2. **Revisao de seed apos mudancas de schema**: Qualquer alteracao em schema que adicione campo NOT NULL sem default deve trigger revisao do seed
3. **Documentacao do contrato de seed**: Criar comentario no seed.ts indicando que `accounts` requer `tenantId` devido ao multi-tenancy

---

## 10. Status final da missao

**Concluida**

**Resumo**: O build error TS2769 em `@cvg-his/db` foi corrigido. A causa raiz — seed desatualizado que nao fornecia `tenantId` ao inserir `accounts` apos a refatoracao multi-tenancy — foi documentada e corrigida com a menor mudanca segura possivel. Build validado com sucesso. Documentacao Enterprise atualizada.

---

_Executor 24 — 2026-04-10_
