# 500 — Módulo Access Control

## Objetivo

Prover avaliação de autorização baseada em perfis de acesso (RBAC) para todos os módulos do CVG-HIS-V2. O módulo mantém um catálogo base de permissões e papéis, hidrata customizações persistidas quando disponíveis, constrói perfis efetivos por usuário/grupo/setor e valida requisições contra esses perfis.

## Superfície funcional real

- `listPermissions()` — retorna catálogo de permissões (`PermissionDefinition[]`) vindo do catálogo canônico ou do banco quando hidratado.
- `listRoles()` — retorna roles legadas (`admin`, `reception`, `nurse`, `veterinarian`, `finance`, `inventory`, `auditor`) ou o catálogo persistido quando disponível.
- `createProfile(context: AccessContext)` — calcula permissões efetivas por usuário/conta quando `userId` e `accountId` estão presentes; caso contrário, agrega permissões pelas roles.
- `getEffectivePermissions()` — resolve permissões por usuário considerando grant direto, setor, grupo/equipe e role legada.
- `createTeam()` / `updateTeam()` — cria e mantém grupos de acesso.
- `createSector()` / `updateSector()` — cria e mantém setores organizacionais de acesso.
- `replaceUserTeams()` / `replaceUserSectors()` / `replaceLegacyRoles()` — mantém vínculos de usuário.
- `setPermissionAssignment()` — aplica `allow`, `deny` ou `inherit` para usuário, grupo/equipe ou setor.
- `assertAuthorized(input: PolicyEvaluationInput)` — valida 3 regras:
  1. Usuário deve ter `status === "active"` (lança `ForbiddenError`).
  2. `permissionCode` deve estar presente no `access.permissionCodes` (lança `ForbiddenError`).
  3. Se `accountId` for informado, `actor.accountId` deve coincidir (bloqueio cross-account).
- Exporta `DatabaseAccessControlRepository` com interface para roles, permissions, role-permission, user-role, grupos de acesso, setores, memberships e grants via SQL raw com `pg` pool.

## Principais dependências

- `@cvg-his-v2/shared-errors` — `ForbiddenError`
- `@cvg-his-v2/shared-types` — tipos `PermissionId`, `PermissionDefinition`, `RoleId`, `RoleDefinition`, `UserSummary`, `AccessProfile`
- `@cvg-his-v2/shared-database` — `getPool()` (usado pelo repositório)
- `packages/rbac/` — pacote separado com catálogo canônico alternativo de permissões/roles (referência histórica, não mais fonte de verdade)

## Regras de negócio relevantes

- A autorização fina é por rotina/permissão, não por setor fixo do fluxo operacional.
- Usuário individual pode receber `allow` ou `deny` e isso prevalece sobre herança.
- Setor organizacional e grupo/equipe podem conceder ou negar permissões herdadas.
- Roles/grupos pré-configurados são modelos iniciais editáveis para onboarding, não fonte fixa de autorização.
- `assertAuthorized` rejeita usuários inativos, permissões ausentes e acesso cross-account.
- O repositório `DatabaseAccessControlRepository` suporta operações de roles, permissões, mapeamento role-permission, user-role, grupos, setores, memberships e grants.

## Riscos atuais

- **Validação fim a fim pendente**: o runtime injeta `DatabaseAccessControlRepository` e chama `hydrateFromDatabase`, mas ainda falta validação operacional curta cobrindo grant persistido, permissão efetiva e bloqueio real em endpoint protegido.
- **Sem validação de existência de role**: `createProfile` ignora roles inexistentes sem log ou erro.
- **Sem granularidade por recurso**: Permissões são por módulo (ex: `patients.read`), não por instância de recurso (ex: patient ID específico).

## Dual RBAC — Resolvido (Ciclo 1)

O dual RBAC foi reconciliado no Ciclo 1 de fechamento (doc 550):

- Seed atualizado para usar os mesmos role codes do AccessControlService (`admin`, `veterinarian`, `nurse`, `reception`, `finance`, `inventory`, `auditor`).
- Permissões no seed agora usam a mesma convenção do AccessControlService (plural + `read`/`manage`).
- `packages/rbac/` permanece como referência histórica mas não é mais a fonte de verdade para seeds.
- Seed e AccessControlService agora compartilham o mesmo vocabulário de roles e permissões.

## Situação de persistência

- **Catálogo base de permissões/roles**: existe em memória como fallback.
- **Hidratação por banco**: `AccessControlService.hydrateFromDatabase(accountId)` carrega roles, permissions, grupos, setores, memberships e grants quando há repositório.
- **Repositório**: `DatabaseAccessControlRepository` usa `pg` raw SQL com `getPool()`.
- **Tabelas principais**: `roles`, `permissions`, `role_permissions`, `user_roles`, `access_teams`, `access_sectors`, `access_team_memberships`, `access_sector_memberships`, `access_user_permissions`, `access_team_permissions`, `access_sector_permissions`.

## Situação de testes

- Arquivo de teste: `packages/modules/access-control/src/access-control.test.ts` (1 arquivo).

## Gaps para nível enterprise

1. Validar em banco real a cadeia completa usuário -> grupo/setor -> grant -> permissão efetiva -> endpoint protegido.
2. Adicionar CRUD administrativo de roles e permissões, se a operação exigir criação de rotinas novas fora do catálogo base.
3. Log/erro quando role inexistente é solicitado em `createProfile`.
4. Adicionar permissões com escopo de recurso quando necessário (ex: recurso específico, unidade, caixa, agenda).
5. Adicionar cache/expiração de perfis de acesso, com invalidação após alteração de grant.
6. Adicionar auditoria explícita de decisões de autorização `allow`/`deny` com contexto de usuário, fonte e rotina.
7. Integrar a UI de cadastro de usuário com a matriz de permissões para deixar claro que perfil/setor inicial não substitui grants finos.
8. Definir grupos pré-configurados editáveis para implantação inicial, sem bloquear criação de novos grupos de acesso pela operação.
