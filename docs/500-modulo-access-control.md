# 500 — Módulo Access Control

## Objetivo

Prover avaliação de autorização baseada em perfis de acesso (RBAC) para todos os módulos do CVG-HIS-V2. O módulo expõe um catálogo imutável de permissões e papéis, constrói perfis de acesso a partir de roles e valida requisições contra esses perfis.

## Superfície funcional real

- `listPermissions()` — retorna catálogo estático de 32 permissões (`PermissionDefinition[]`), cada uma com `id`, `code`, `module` e `description`.
- `listRoles()` — retorna catálogo estático de 7 roles (`RoleDefinition[]`): `admin`, `reception`, `nurse`, `veterinarian`, `finance`, `inventory`, `auditor`.
- `createProfile(context: AccessContext)` — agrega permissões de múltiplas roles e produz um `AccessProfile` com `roleCodes`, `permissionCodes` (ordenados) e `capabilities` (prefixo `cap:`).
- `assertAuthorized(input: PolicyEvaluationInput)` — valida 3 regras:
  1. Usuário deve ter `status === "active"` (lança `ForbiddenError`).
  2. `permissionCode` deve estar presente no `access.permissionCodes` (lança `ForbiddenError`).
  3. Se `accountId` for informado, `actor.accountId` deve coincidir (bloqueio cross-account).
- Exporta `DatabaseAccessControlRepository` com interface completa (roles, permissions, role-permission mapping, user-role mapping via SQL raw com `pg` pool).

## Principais dependências

- `@cvg-his-v2/shared-errors` — `ForbiddenError`
- `@cvg-his-v2/shared-types` — tipos `PermissionId`, `PermissionDefinition`, `RoleId`, `RoleDefinition`, `UserSummary`, `AccessProfile`
- `@cvg-his-v2/shared-database` — `getPool()` (usado pelo repositório)
- `packages/rbac/` — pacote separado com catálogo canônico alternativo de permissões/roles (referência histórica, não mais fonte de verdade)

## Regras de negócio relevantes

- Catálogo de permissões e roles é **hardcoded** como `const` arrays — não há CRUD dinâmico via serviço.
- `createProfile` ignora roles desconhecidas (silenciosamente, via `continue`) — não lança erro.
- `assertAuthorized` rejeita usuários inativos, permissões ausentes e acesso cross-account.
- O repositório `DatabaseAccessControlRepository` suporta operações completas de CRUD para roles, permissões, mapeamento role-permission e user-role, usando tabelas `roles`, `permissions`, `role_permissions`, `user_roles`.

## Riscos atuais

- **Repositório não utilizado pelo serviço**: `DatabaseAccessControlRepository` é exportado mas nunca injetado ou usado por `AccessControlService`. O serviço opera 100% em memória com catálogos estáticos. O repositório é código morto na prática.
- **Sem validação de existência de role**: `createProfile` ignora roles inexistentes sem log ou erro.
- **Sem granularidade por recurso**: Permissões são por módulo (ex: `patients.read`), não por instância de recurso (ex: patient ID específico).

## Dual RBAC — Resolvido (Ciclo 1)

O dual RBAC foi reconciliado no Ciclo 1 de fechamento (doc 550):

- Seed atualizado para usar os mesmos role codes do AccessControlService (`admin`, `veterinarian`, `nurse`, `reception`, `finance`, `inventory`, `auditor`).
- Permissões no seed agora usam a mesma convenção do AccessControlService (plural + `read`/`manage`).
- `packages/rbac/` permanece como referência histórica mas não é mais a fonte de verdade para seeds.
- Seed e AccessControlService agora compartilham o mesmo vocabulário de roles e permissões.

## Situação de persistência

- **Catálogo de permissões/roles**: 100% em memória (arrays `const`).
- **Repositório**: `DatabaseAccessControlRepository` existe e usa `pg` raw SQL com `getPool()`, mas **não é injetado** em `AccessControlService`. Tabelas esperadas: `roles`, `permissions`, `role_permissions`, `user_roles`.

## Situação de testes

- Arquivo de teste: `packages/modules/access-control/src/access-control.test.ts` (1 arquivo).

## Gaps para nível enterprise

1. Injetar `DatabaseAccessControlRepository` no serviço para permitir roles/permissões dinâmicas via DB.
2. Adicionar CRUD de roles e permissões via API (hoje o serviço só expõe `list*` e `createProfile`).
3. Log/erro quando role inexistente é solicitado em `createProfile`.
4. Adicionar permissões com escopo de recurso (resource-level authorization).
5. Adicionar cache de perfis de acesso (hoje `createProfile` recalcula a cada chamada).
6. Adicionar auditoria de decisões de autorização (allow/deny com contexto).
