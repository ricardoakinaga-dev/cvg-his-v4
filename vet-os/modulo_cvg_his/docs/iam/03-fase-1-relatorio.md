# Fase 1 - Fundação de Identidade e Modelo de Acesso

## Objetivo da fase
Criar a base estrutural de autenticação e autorização do CVG-HIS sem quebrar a arquitetura atual do monorepo.

## Status
- Concluída com entregáveis centrais implementados.

## Itens concluídos
- expansão do schema de `users` com campos de prontidão para segurança operacional:
  - `username`
  - `must_change_password`
  - `failed_login_attempts`
  - `locked_until`
  - `last_login_at`
  - `password_changed_at`
- criação de tabela de sessões autenticadas:
  - `auth_sessions`
- criação de tabela de catálogo de escopos:
  - `access_scopes`
- criação de tabela de vínculo usuário-escopo:
  - `user_scope_assignments`
- criação da migration `0029_iam_foundation.sql`
- atualização do catálogo compartilhado de permissões em `packages/rbac`
- expansão do catálogo de papéis hospitalares iniciais:
  - `superadmin`
  - `diretoria`
  - `coordenacao_medica`
  - `veterinario`
  - `residente`
  - `laboratorio`
  - `imagem`
  - `farmacia_estoque`
  - `financeiro`
  - `administrativo`
- inclusão das permissões faltantes usadas por rotas existentes:
  - `alerts.write`
  - `partner.read`
  - `partner.write`
- inclusão de permissões administrativas e futuras de IAM:
  - `users.*`
  - `roles.*`
  - `permissions.*`
  - `sessions.*`
  - `access_scope.*`
- reforço do seed:
  - hash de senha migrado para `scrypt`
  - `username` inicial para admin
  - vínculo do usuário inicial com `admin` e `superadmin`
  - seed continua idempotente
- criação de serviço base de IAM em `apps/his-api/src/modules/iam/service.ts`
- criação de schemas/DTOs base em `apps/his-api/src/modules/iam/schemas.ts`
- primeira integração da autenticação ao modelo relacional:
  - login por e-mail passou a resolver usuário, roles e permissões reais via banco
  - login por e-mail passou a criar registro em `auth_sessions`
  - login bem-sucedido passa a atualizar `last_login_at`
  - token JWT agora já pode carregar `sessionId`
- auditoria inicial de login:
  - `auth.login.success`
  - `auth.login.failed` para falha com usuário reconhecido

## Itens não concluídos
- revogação efetiva de sessão em cada request ainda não foi implementada
- logout persistido ainda não foi implementado
- lockout por tentativas repetidas ainda não foi aplicado em runtime
- reset/recuperação de senha ainda não foi implementado
- CRUD administrativo de usuários, roles e permissões ainda não foi implementado
- resolução de permissões por escopo ainda não está aplicada no middleware

## Decisões técnicas
- o banco passa a ser a fonte de verdade para roles e permissões do login por e-mail;
- o pacote `packages/rbac` foi mantido como catálogo compartilhado e base de compatibilidade;
- o middleware atual de permissões foi preservado para evitar regressão nos módulos existentes;
- `auth_sessions` foi criada já na Fase 1 para viabilizar logout, revogação e inventário de sessões na Fase 2;
- a migração de hash foi feita com fallback no login para não quebrar credenciais legadas já existentes.

## Estruturas criadas ou alteradas

### Schema / banco
- `packages/db/src/schema/users.ts`
- `packages/db/src/schema/auth_sessions.ts`
- `packages/db/src/schema/access_scopes.ts`
- `packages/db/src/schema/user_scope_assignments.ts`
- `packages/db/src/schema/index.ts`

### Migrations
- `packages/db/migrations/0029_iam_foundation.sql`
- `packages/db/migrations/meta/_journal.json`

### Seeds
- `packages/db/src/seed.ts`

### Backend
- `apps/his-api/src/modules/iam/schemas.ts`
- `apps/his-api/src/modules/iam/service.ts`
- `apps/his-api/src/modules/auth/service.ts`
- `apps/his-api/src/modules/auth/routes.ts`
- `apps/his-api/src/modules/auth/routes.test.ts`

### Catálogo RBAC
- `packages/rbac/src/permissions.ts`

## Arquivos modificados
- `apps/his-api/src/modules/auth/routes.test.ts`
- `apps/his-api/src/modules/auth/routes.ts`
- `apps/his-api/src/modules/auth/service.ts`
- `apps/his-api/src/modules/iam/schemas.ts`
- `apps/his-api/src/modules/iam/service.ts`
- `packages/db/migrations/0029_iam_foundation.sql`
- `packages/db/migrations/meta/_journal.json`
- `packages/db/src/schema/access_scopes.ts`
- `packages/db/src/schema/auth_sessions.ts`
- `packages/db/src/schema/index.ts`
- `packages/db/src/schema/user_scope_assignments.ts`
- `packages/db/src/schema/users.ts`
- `packages/db/src/seed.ts`
- `packages/rbac/src/permissions.ts`

## Migrações criadas
- `0029_iam_foundation.sql`

## Seeds criadas ou alteradas
- `packages/db/src/seed.ts`

## Endpoints criados ou alterados
- alterado:
  - `POST /auth/login`
    - agora resolve roles e permissões a partir do banco para login por e-mail
    - agora cria sessão persistida em `auth_sessions`
    - agora registra auditoria de sucesso/falha parcial
- compatibilidade mantida:
  - `POST /auth/dev-login`
  - `POST /auth/verify`
  - `GET /auth/me`

## Telas criadas ou alteradas
- nenhuma tela alterada nesta fase

## Testes criados ou alterados
- alterado:
  - `apps/his-api/src/modules/auth/routes.test.ts`

## Validação executada
- `corepack pnpm --filter @cvg-his/db build` ✅
- `corepack pnpm --filter @cvg-his/his-api build` ✅
- `corepack pnpm --filter @cvg-his/his-api exec vitest run src/modules/auth/routes.test.ts` ✅

## Riscos
- o `_journal.json` de migrations já demonstrava desalinhamento prévio com arquivos `0024` a `0028`; isso foi preservado e documentado, não corrigido nesta fase para evitar efeito colateral amplo;
- a autorização em runtime ainda usa permissões presentes no token, então revogação imediata de sessão/perfil ainda depende da próxima fase;
- o catálogo expandido de papéis é inicial e precisará ajuste fino com o comportamento real dos módulos hospitalares.

## Débitos técnicos
- auditar falha de login para usuário inexistente ainda exige estratégia segura para account inexistente ou tabela específica de eventos de autenticação;
- `requirePermission` ainda não verifica escopos;
- o frontend ainda não consome `sessionId` nem catálogo administrativo de IAM;
- faltam APIs administrativas de usuários, papéis, permissões e sessões.

## Dependências da próxima fase
- usar `auth_sessions` para implementar logout e expiração real;
- expor endpoint de sessão atual e iniciar inventário de sessões;
- reforçar política de tentativa/bloqueio;
- padronizar claims mínimas e preparar revogação.

## Próximos passos
- implementar Fase 2 com login/sessão completos, logout e auditoria de sessão;
- adicionar controle de expiração e preparação para revogação;
- iniciar mecanismos de bloqueio por tentativas e recuperação de senha;
- manter compatibilidade do frontend enquanto ele passa a refletir a sessão real.
