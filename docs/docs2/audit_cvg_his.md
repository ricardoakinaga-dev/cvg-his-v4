# Relatório de Auditoria — `modulo_cvg_his`

**Data:** 15 de março de 2026  
**Auditor:** Antigravity (IA)  
**Escopo:** Análise estática completa de código, arquitetura, segurança e qualidade do módulo `modulo_cvg_his` do sistema CVG VetOS HIS.

---

## Sumário Executivo

O `modulo_cvg_his` é um sistema de HIS (Hospital Information System) veterinário construído como monorepo TypeScript com arquitetura multi-camada. A base de código demonstra maturidade de design significativa, especialmente nos padrões arquiteturais e de segurança, mas possui defeitos críticos na camada de autenticação que devem ser corrigidos antes de qualquer ambiente de produção.

| Categoria | Nota |
|---|---|
| Arquitetura Geral | ✅ Muito Boa |
| Segurança (Auth) | 🔴 Crítica — requer correção imediata |
| Separação de Responsabilidades | ✅ Excelente |
| Qualidade do Código | ✅ Boa |
| Tratamento de Erros | ✅ Muito Bom |
| Cobertura de Testes | ⚠️ Incompleta |
| Configuração e Deploy | ⚠️ Parcialmente adequada |

---

## 1. Estrutura do Módulo

```
modulo_cvg_his/
├── apps/
│   ├── his-api/       # Backend Fastify (REST API)
│   ├── his-web/       # Frontend Next.js 14
│   └── his-worker/    # Worker BullMQ (tarefas assíncronas)
└── packages/
    ├── audit/         # Sistema de auditoria
    ├── config/        # Configurações base
    ├── contracts/     # Contratos de API compartilhados
    ├── db/            # Schema Drizzle ORM + migrations
    ├── domain/        # Regras de domínio e DTOs
    ├── events/        # Eventos do sistema
    └── rbac/          # Controle de acesso baseado em roles
```

**Stack:** TypeScript 5.7, Fastify 5, Next.js 14, BullMQ 5, Drizzle ORM, Vitest, pnpm workspaces.

---

## 2. Qualidades Identificadas ✅

### 2.1 Arquitetura e Design

- **Monorepo bem estruturado:** pnpm workspaces com separação clara entre `apps/` e `packages/`. Cada responsabilidade tem seu próprio pacote.
- **Separação de camadas consistente:** todos os módulos seguem o padrão `routes → service → repo`, sem violações de camada observadas.
- **Padrão Result Type:** os services retornam tipos discriminados (`kind: 'created'`, `kind: 'not_found'`, etc.) em vez de lançar exceções para casos de negócio — excelente para legibilidade e testabilidade.
- **Design por Injeção de Dependência:** todos os services aceitam dependências opcionais (`repo`, `appendAudit`), permitindo fácil mock em testes.
- **Multi-tenancy via Tenant Scoping:** `tenantGuardrail.ts` e o `requireAccountId()` garantem que toda operação está limitada ao `account_id` do ator autenticado, prevenindo cross-tenant leaks.

### 2.2 Segurança

- **JWT implementado do zero com segurança:** `auth/service.ts` usa `timingSafeEqual` (resistente a timing attacks), valida `alg: 'HS256'`, `iss`, `aud` e `exp` corretamente.
- **Redação de tokens nos logs:** `logger.ts` redige `authorization` e `cookie` headers em todos os logs de request — boa prática de privacidade.
- **Proxy HTTP com whitelist de paths:** `his-web` bloqueia headers de contexto (`x-account-id`, `x-role`, `x-user-id`) vindos do cliente e aceita apenas paths explicitamente permitidos.
- **Cookie httpOnly com Secure em produção:** `route.ts` de sessão configura corretamente `httpOnly: true` e `secure: process.env.NODE_ENV === 'production'`.
- **RBAC granular bem definido:** 45 permissões canônicas cobrindo todos os recursos. Mapeamento de roles (admin, vet, enfermagem, recepcao) claro e auditável.
- **Proteção contra BullMQ name injection:** validação explícita que nomes de fila não contêm `:` para evitar erros de chave Redis.

### 2.3 Auditoria e Observabilidade

- **Trilha de auditoria completa:** todas as operações de escrita (`create`, `close`, `admit`, `discharge`, `transfer`) registram antes/depois em `audit_events` com diff JSON automático.
- **Logging estruturado (JSON):** his-worker usa logs JSON em todos os handlers. his-api usa Fastify logger com `messageKey` e `base.service`.
- **Request ID propagado:** `x-request-id` é gerado no proxy e propagado para o upstream e para os logs de audit — facilita rastreamento end-to-end.
- **Leader Lock para Cron distribuído:** `his-worker` implementa distributed leader election via Redis para garantir que o cron de `medication-overdue` roda em apenas uma instância quando há múltiplos workers.

### 2.4 Resiliência e Operações

- **Retry com backoff exponencial:** todas as filas BullMQ têm `attempts: 5` (handover, protocol) ou `attempts: 3` (medication overdue) com `backoff.type: 'exponential'`.
- **Graceful shutdown:** his-worker captura `SIGINT`/`SIGTERM`, fecha workers, libera leader lock e fecha conexões PostgreSQL/Redis de forma ordenada.
- **Migrations antes de subir:** `his-api` executa migrations antes de ouvir na porta, garantindo schema consistente.
- **Validação de env com Zod:** his-worker valida todas as variáveis de ambiente na inicialização com schema Zod. Falha rápido com mensagens claras.

### 2.5 Experiência do Desenvolvedor

- **`.env.example` presente e documentado** com todos os campos necessários.
- **Workspace scripts centralizados:** `pnpm -r run lint`, `pnpm -r run test`, `pnpm -r run build` no root.
- **Múltiplos checklists de operação** (DEPLOY_CHECKLIST, PATIENT_SAFETY_CHECKLIST, etc.) documentando procedimentos.
- **Contratos compartilhados:** pacote `contracts/` com tipos comuns entre frontend e backend, evitando drift de interface.

---

## 3. Defeitos Identificados 🔴⚠️

### 🔴 CRÍTICO — Credenciais Hardcoded no Sistema de Autenticação

**Arquivo:** [`apps/his-api/src/modules/auth/routes.ts`](file:///home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/apps/his-api/src/modules/auth/routes.ts) — Linhas 85-119

```typescript
// PROBLEMA 1: Comparação de senha em texto plano sem hash
if (loginData.email !== adminEmail || loginData.password !== adminPassword) {
  // ...
}

// PROBLEMA 2: Dev key literal hardcoded no código
if (loginData.key === 'dev-key-super-secret-32-chars-minimum') {
  // ...
}

// PROBLEMA 3: UUID de admin estático/fixo
payload = {
  accountId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000001',
  // ...
};
```

**Impacto:** Senha armazenada em texto plano no env (sem bcrypt/argon2). API key hardcoded literal no código-fonte. UUIDs de admin estáticos facilitam ataques dirigidos. Não há autenticação real contra banco de dados.

**Correção:** Implementar hash de senha (bcrypt/argon2), buscar usuários/api keys no banco de dados, remover UUIDs estáticos.

---

### 🔴 CRÍTICO — SQL Raw Inline no Service de Medicações

**Arquivo:** [`apps/his-api/src/modules/medicationAdministrations/service.ts`](file:///home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/apps/his-api/src/modules/medicationAdministrations/service.ts) — Linhas 178-186

```typescript
// Acesso direto ao $client com SQL raw DENTRO do service
const orderInfoResult = await context.db.$client.query(
  `select mo.medication_name, p.name as patient_name
   from medication_orders mo
   join patients p on p.id = mo.patient_id and p.account_id = mo.account_id
   where mo.id = $1 and mo.account_id = $2`,
  [input.orderId, actor.accountId]
);
```

**Impacto:** Viola a separação de camadas (SQL no service, não no repo). Dificulta testes unitários. Mistura dialeto SQL com lógica de negócio.

**Correção:** Mover esta query para `medicationAdministrations/repo.ts` como método tipado.

---

### ⚠️ ALTO — `InpatientStayStatus` Não Importado em `inpatient/service.ts`

**Arquivo:** [`apps/his-api/src/modules/inpatient/service.ts`](file:///home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/apps/his-api/src/modules/inpatient/service.ts) — Linha 302

```typescript
async list(query: {
  page: number;
  pageSize: number;
  status?: InpatientStayStatus; // ← Tipo usado sem import explícito
  wardId?: string;
})
```

**Impacto:** Potencial erro de compilação em modo strict ou ao se mover o arquivo. Indica que o tipo pode estar vazando implicitamente via inferência.

---

### ⚠️ ALTO — `package/config` Praticamente Vazio

**Arquivo:** [`packages/config/src/index.ts`](file:///home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/packages/config/src/index.ts)

O pacote tem apenas 10 linhas e exporta um objeto `defaultConfig` trivial. A configuração real de cada app é feita de forma independente com schemas Zod diferentes. O pacote não agrega valor real e cria uma dependência de workspace desnecessária.

---

### ⚠️ ALTO — `withTenantFilter` é Dead Code

**Arquivo:** [`apps/his-api/src/lib/tenantGuardrail.ts`](file:///home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/apps/his-api/src/lib/tenantGuardrail.ts) — Linhas 90-97

```typescript
export function withTenantFilter(
  query: string,
  accountId: string,
  existingWhereClause: boolean = false
): { query: string; accountId: string } {
  // This is a helper for documentation purposes
  // Actual query building should be done in the repo layer
  return { query, accountId }; // NÃO FAZ NADA
}
```

**Impacto:** Função exportada que não tem implementação real. Pode enganar consumidores que achem que ela aplica algum filtro.

---

### ⚠️ MÉDIO — `resetCache` Exposta Globalmente para Testes

**Arquivo:** [`apps/his-web/src/app/api/proxy/[...path]/route.ts`](file:///home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/apps/his-web/src/app/api/proxy/%5B...path%5D/route.ts) — Linhas 87-89

```typescript
if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).__resetProxyCache = resetCache;
}
```

**Impacto:** Expõe função de reset de cache no objeto global em todos os ambientes (inclusive produção). Padrão de teste que vazou para código de produção.

**Correção:** Remover ou condicionar exclusivamente a `process.env.NODE_ENV !== 'production'`.

---

### ⚠️ MÉDIO — Senha Admin Comparada sem Timing-Safe Equal

**Arquivo:** [`apps/his-api/src/modules/auth/routes.ts`](file:///home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/apps/his-api/src/modules/auth/routes.ts) — Linha 85

```typescript
if (loginData.email !== adminEmail || loginData.password !== adminPassword) {
```

Enquanto o JWT é validado com `timingSafeEqual`, a comparação de senha usa `!==` de string — vulnerável a timing attacks.

---

### ⚠️ MÉDIO — `his-web` usa `file:` path em vez de `workspace:*`

**Arquivo:** [`apps/his-web/package.json`](file:///home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/apps/his-web/package.json) — Linhas 15-16

```json
"@cvg-his/contracts": "file:../../packages/contracts",
"@cvg-his/rbac": "file:../../packages/rbac",
```

Os demais apps usam `workspace:*`. O uso de `file:` cria cópia física em vez de link simbólico, podendo gerar versões desatualizadas dos pacotes no `his-web`.

---

### ⚠️ MÉDIO — `ADMIN_PASSWORD=change-me` no `.env.example`

**Arquivo:** [`.env.example`](file:///home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/.env.example)

```
JWT_SECRET=change-me
ADMIN_PASSWORD=change-me
```

Senhas placeholder `change-me` sem nenhum enforcement de que devem ser trocadas antes de produção. Risco elevado de deploy com credenciais padrão.

---

### ⚠️ BAIXO — Cobertura de Testes Incompleta

- `his-worker` não tem nenhum teste (`vitest run --passWithNoTests`).
- Módulos como `bedmap`, `beds`, `handovers` têm apenas routes sem testes.
- `packages/config` e `packages/events` sem cobertura.
- Os testes existentes estão concentrados em `encounters`, `clinicalNotes`, `documents` e `requirePermission`.

---

### ⚠️ BAIXO — Múltiplos Patches Grandes na Raiz do Projeto

```
mar-hardening.patch (2.7MB), pr-saf-03.patch (2.9MB), 
phase3-inpatient-stays.patch (1.6MB), contract-gate.patch (1.4MB)
```

Arquivos `.patch` grandes commitados na raiz do projeto. Estes são artefatos temporários de desenvolvimento que não devem estar no repositório final — poluem o workspace e aumentam o tamanho do clone.

---

### ⚠️ BAIXO — `start` usa `tsx` em vez de binário compilado

**Arquivo:** [`apps/his-api/package.json`](file:///home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/apps/his-api/package.json)

```json
"start": "tsx src/index.ts"
```

O script `start` (usado em produção) executa TypeScript via `tsx` sem compilação. O correto seria `node dist/index.js`. Impacta performance e resolve um `.js` diferente do `tsc -p tsconfig.json` que o `build` produz.

---

## 4. Análise por Módulo

| Módulo | Status | Observação |
|---|---|---|
| `his-api/auth` | 🔴 Crítico | Auth real não implementada |
| `his-api/encounters` | ✅ Excelente | Padrão service/repo/audit exemplar |
| `his-api/inpatient` | ✅ Muito Bom | Lógica de leitos robusta |
| `his-api/medicationAdministrations` | ⚠️ Bom | SQL inline no service |
| `his-api/lib (errors, logger, queues)` | ✅ Excelente | Tratamento de erros bem estratificado |
| `his-api/tenantGuardrail` | ✅ Bom | Dead code em `withTenantFilter` |
| `his-web/proxy` | ✅ Muito Bom | Allowlist robusta + headers protegidos |
| `his-web/session` | ✅ Muito Bom | Cookie seguro e bem configurado |
| `his-worker` | ✅ Excelente | Leader lock, graceful shutdown, retry |
| `packages/rbac` | ✅ Excelente | RBAC clara e extensível |
| `packages/audit` | ✅ Excelente | Diff automático e fallback de FK |
| `packages/config` | ⚠️ Fraco | Praticamente vazio, pouco útil |

---

## 5. Prioridades de Correção

| Prioridade | Item | Esforço |
|---|---|---|
| 🔴 P0 | Implementar autenticação real (hash de senha, busca em DB) | Alto |
| 🔴 P0 | Remover dev API key hardcoded do código | Baixo |
| 🔴 P0 | Remover UUIDs estáticos de admin | Baixo |
| ⚠️ P1 | Mover SQL raw de `medicationAdministrations/service.ts` para repo | Médio |
| ⚠️ P1 | Corrigir `his-web/package.json` para usar `workspace:*` | Baixo |
| ⚠️ P1 | Remover/condicionar `globalThis.__resetProxyCache` | Baixo |
| ⚠️ P2 | Ampliar testes do his-worker e outros módulos sem cobertura | Alto |
| ⚠️ P2 | Excluir arquivos `.patch` do repositório (`.gitignore`) | Baixo |
| ⚠️ P2 | Corrigir script `start` para usar `node dist/index.js` | Baixo |
| ⚠️ P2 | Remover ou implementar `withTenantFilter` | Baixo |
| ⚠️ P3 | Adicionar timingSafeEqual na comparação de senha admin | Baixo |
| ⚠️ P3 | Avaliar consolidar/remover `packages/config` | Médio |
