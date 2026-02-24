# Segurança do CVG-HIS

> **Última Atualização:** 2026-02-24
> **Versão:** 0.1.0

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Autorização (RBAC)](#autorização-rbac)
4. [Multi-Tenancy](#multi-tenancy)
5. [Validação de Dados](#validação-de-dados)
6. [Proteção contra Ataques](#proteção-contra-ataques)
7. [Auditoria](#auditoria)
8. [Configurações de Segurança](#configurações-de-segurança)
9. [Recomendações](#recomendações)

---

## Visão Geral

O CVG-HIS implementa múltiplas camadas de segurança para proteger dados sensíveis de saúde veterinária.

### Princípios de Segurança

1. **Defense in Depth**: Múltiplas camadas de proteção
2. **Least Privilege**: Acesso mínimo necessário
3. **Fail Secure**: Erros negam acesso por padrão
4. **Audit Everything**: Registro de todas as operações

---

## Autenticação

### JWT (JSON Web Token)

O sistema utiliza JWT para autenticação stateless:

```typescript
// Estrutura do Token
{
  accountId: string,      // Tenant ID
  userId: string,         // Usuário
  unitId?: string,        // Unidade (opcional)
  role: string,           // Role principal
  roles: string[],        // Todos os roles
  permissions: string[],  // Permissões explícitas
  iss: string,           // Issuer
  aud: string,           // Audience
  exp: number,           // Expiration
  iat: number            // Issued at
}
```

### Implementação

```typescript
// apps/his-api/src/modules/auth/service.ts

// Geração do token
export function signJwt(payload: JwtPayload, options: JwtSignOptions): string {
  const { jwtSecret, jwtIssuer, jwtAudience, expiresIn = 8 * 60 * 60 } = options;
  
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    iss: jwtIssuer,
    aud: jwtAudience,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn
  };
  
  // Assinatura HMAC-SHA256
  const signature = createHmac('sha256', jwtSecret).update(content).digest();
  return `${content}.${signature}`;
}
```

### Validação do Token

```typescript
// Validações realizadas:
// 1. Estrutura (3 partes)
// 2. Algoritmo (HS256)
// 3. Assinatura (timing-safe comparison)
// 4. Expiração
// 5. Issuer
// 6. Audience
```

### Métodos de Login

| Método | Endpoint | Uso |
|--------|----------|-----|
| Email/Password | `POST /auth/login` | Usuários humanos |
| API Key | `POST /auth/login` | Integrações |
| Dev Login | `POST /auth/dev-login` | Desenvolvimento (bloqueado em produção) |

### Configuração

```bash
# Variáveis de ambiente obrigatórias
JWT_SECRET=your-secret-key-min-32-chars
JWT_ISSUER=cvg-his
JWT_AUDIENCE=cvg-his-api
```

---

## Autorização (RBAC)

### Estrutura de Roles

```typescript
// packages/rbac/src/permissions.ts

export const ROLE_PERMISSIONS = {
  admin: CANONICAL_PERMISSIONS,  // Todas as permissões
  vet: [
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.PATIENT_WRITE,
    PERMISSIONS.ENCOUNTER_READ,
    PERMISSIONS.ENCOUNTER_WRITE,
    PERMISSIONS.MEDORDER_READ,
    PERMISSIONS.MEDORDER_WRITE,
    // ... ~60 permissões
  ],
  enfermagem: [
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.MEDADMIN_READ,
    PERMISSIONS.MEDADMIN_WRITE,
    // ... ~30 permissões
  ],
  recepcao: [
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.PATIENT_WRITE,
    PERMISSIONS.OWNER_READ,
    PERMISSIONS.OWNER_WRITE,
    // ... ~25 permissões
  ]
};
```

### Middleware de Permissão

```typescript
// apps/his-api/src/middlewares/requirePermission.ts

export function requirePermission(permission: string): preHandlerHookHandler {
  return async (request, reply) => {
    const actor = request.requestContext.actor;

    if (!actor?.accountId) {
      return reply.status(401).send({ 
        message: 'Missing or invalid actor context' 
      });
    }

    const permissions = actor.permissions ?? [];
    if (!permissions.includes('*') && !permissions.includes(permission)) {
      return reply.status(403).send({ 
        message: `Missing required permission: ${permission}` 
      });
    }
  };
}
```

### Uso nas Rotas

```typescript
// Proteção de endpoint
app.get('/admin/users', {
  preHandler: requirePermission('admin.usuarios.read')
}, handler);

// Múltiplas permissões
app.post('/patients', {
  preHandler: requirePermission('patient.write')
}, handler);
```

### Frontend

```typescript
// Hook de permissão
const canDelete = usePermission('patient.delete');

// Componente condicional
<Can permission="patient.delete">
  <DeleteButton />
</Can>
```

---

## Multi-Tenancy

### Isolamento de Dados

Todas as tabelas possuem `account_id` para isolamento:

```sql
CREATE TABLE patients (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL,  -- Tenant ID
  name text NOT NULL,
  -- ...
);

CREATE INDEX idx_patients_account ON patients(account_id);
```

### Tenant Guardrail

```typescript
// apps/his-api/src/lib/tenantGuardrail.ts

export class MissingTenantContextError extends Error {
  statusCode = 401;
}

export class TenantMismatchError extends Error {
  statusCode = 403;
}

export function requireAccountId(request: FastifyRequest): string {
  const actor = request.requestContext.actor;
  if (!actor?.accountId) {
    throw new MissingTenantContextError();
  }
  return actor.accountId;
}

export function requireTenantMatch(
  request: FastifyRequest,
  resourceAccountId: string
): void {
  const actorAccountId = requireAccountId(request);
  if (actorAccountId !== resourceAccountId) {
    throw new TenantMismatchError('Cross-tenant access denied');
  }
}
```

### Testes de Cross-Tenant

```typescript
// apps/his-api/src/modules/__tests__/crossTenant.test.ts

describe('Cross-Tenant Access Prevention', () => {
  it('should throw TenantMismatchError on cross-tenant access', async () => {
    const mockRequest = {
      requestContext: {
        actor: { accountId: 'tenant-a' }
      }
    };
    
    expect(() => requireTenantMatch(mockRequest, 'tenant-b'))
      .toThrow(TenantMismatchError);
  });
});
```

---

## Validação de Dados

### Zod Schemas

Todos os inputs são validados com Zod:

```typescript
// packages/domain/src/medication.ts

export const MedicationOrderCreateSchema = z.object({
  patientId: z.string().uuid(),
  medicationName: requiredTextSchema,
  doseValue: z.coerce.number().positive(),
  doseUnit: requiredTextSchema,
  route: MedicationRouteSchema,
  frequencyType: MedicationFrequencyTypeSchema,
  startAt: isoDateTimeSchema
}).superRefine((payload, ctx) => {
  // Validações customizadas
  if (!payload.stayId && !payload.encounterId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'stayId or encounterId is required'
    });
  }
});
```

### Validação nas Rotas

```typescript
app.post('/medication-orders', {
  schema: { body: MedicationOrderCreateSchema }
}, handler);
```

### Sanitização

```typescript
// Trim automático de strings
const requiredTextSchema = z.string()
  .transform(trim)
  .pipe(z.string().min(1));

// Normalização de valores opcionais
const optionalTextSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const normalized = trim(value);
  return normalized.length === 0 ? undefined : normalized;
}, z.string().min(1).optional());
```

---

## Proteção contra Ataques

### SQL Injection

**Proteção**: Drizzle ORM com queries parametrizadas

```typescript
// Seguro - parâmetros são escapados automaticamente
const patients = await db.select()
  .from(patientsTable)
  .where(eq(patientsTable.accountId, accountId));
```

### XSS (Cross-Site Scripting)

**Proteção**: React escape automático + Content Security Policy

```typescript
// React escapa automaticamente
<div>{userInput}</div>

// Nunca usar dangerouslySetInnerHTML com input do usuário
```

### CSRF (Cross-Site Request Forgery)

**Status**: Avaliar necessidade
**Recomendação**: Implementar CSRF tokens para formulários

### Timing Attacks

**Proteção**: Comparação timing-safe em JWT

```typescript
// apps/his-api/src/modules/auth/service.ts
if (!timingSafeEqual(expectedSignature, providedSignature)) {
  return undefined;
}
```

### CORS

```typescript
// apps/his-api/src/server.ts
await app.register(cors, {
  origin: app.env.NODE_ENV === 'development'
});
```

---

## Auditoria

### Registro de Eventos

```typescript
// packages/audit/src/audit.ts

export type AuditEvent = {
  accountId: string;
  actorUserId?: string;
  roles?: string[];
  action: string;
  entityType: string;
  entityId: string;
  beforeJson: unknown;
  afterJson: unknown;
  reason?: string;
  requestId: string;
};
```

### Uso

```typescript
await appendAudit({
  accountId: actor.accountId,
  actorUserId: actor.userId,
  roles: actor.roles,
  action: 'MedicationOrderCreated',
  entityType: 'medication_order',
  entityId: order.id,
  beforeJson: null,
  afterJson: order,
  requestId: context.requestContext.requestId
});
```

### Eventos Auditados

| Ação | Descrição |
|------|-----------|
| UserLogin | Login de usuário |
| UserCreated | Criação de usuário |
| MedicationOrderCreated | Prescrição criada |
| MedicationOrderStopped | Prescrição interrompida |
| MedicationAdministrationRecorded | Administração registrada |
| EncounterClosed | Atendimento fechado |
| PatientDischarged | Paciente recebeu alta |

---

## Configurações de Segurança

### Variáveis de Ambiente

```bash
# Obrigatórias
JWT_SECRET=your-secret-key-min-32-chars
JWT_ISSUER=cvg-his
JWT_AUDIENCE=cvg-his-api
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Opcionais
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
ADMIN_ACCOUNT_ID=uuid
ADMIN_USER_ID=uuid
```

### Headers de Segurança

```typescript
// Recomendado adicionar:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
// - Content-Security-Policy
// - Strict-Transport-Security (HTTPS)
```

### Cookies

```typescript
// Cookie de sessão HttpOnly
// apps/his-web/src/lib/auth.ts
document.cookie = `${AUTH_STORAGE_KEY}=${encoded}; path=/; SameSite=Strict`;
```

---

## Recomendações

### Alta Prioridade

1. **Hash de Senha**: Substituir SHA256 por bcrypt/argon2
   ```typescript
   // Atual (não ideal)
   createHash('sha256').update(password).digest('hex');
   
   // Recomendado
   await bcrypt.hash(password, 12);
   ```

2. **Rate Limiting**: Implementar para prevenir brute force
   ```typescript
   // Usar @fastify/rate-limit
   await app.register(rateLimit, {
     max: 100,
     timeWindow: '1 minute'
   });
   ```

3. **Refresh Tokens**: Implementar rotação de tokens

### Média Prioridade

1. **CSRF Protection**: Adicionar tokens para formulários
2. **MFA**: Autenticação de dois fatores para admin
3. **Session Invalidation**: Revogação de tokens ativos

### Baixa Prioridade

1. **Password Policy**: Forçar senhas fortes
2. **Login History**: Histórico de acessos
3. **IP Whitelist**: Para integrações

---

## Checklist de Segurança

- [x] Autenticação JWT
- [x] RBAC com permissões granulares
- [x] Multi-tenancy com isolamento
- [x] Validação de input com Zod
- [x] Proteção contra SQL Injection
- [x] Proteção contra XSS
- [x] Auditoria de operações
- [x] Logs de erro
- [ ] Hash de senha com bcrypt
- [ ] Rate limiting
- [ ] CSRF protection
- [ ] Refresh tokens
- [ ] MFA
- [ ] Security headers completos

---

*Documentação atualizada em 2026-02-24*
