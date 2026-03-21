# Fase 4 - Gestão Administrativa de Usuários, Papéis e Permissões

## Objetivo da fase
Entregar o CRUD administrativo inicial de IAM para operação real do CVG-HIS, com backend protegido como fonte de verdade, auditoria de mudanças sensíveis e superfície mínima de administração no frontend.

## Status
- Concluída com backend funcional, telas administrativas mínimas e cobertura de teste focada em abuso de privilégio.

## Itens concluídos

### 1. Backend administrativo de IAM
- criado módulo `adminIam` no backend com rotas protegidas por permissão:
  - `GET /admin/iam/users`
  - `POST /admin/iam/users`
  - `GET /admin/iam/users/:id`
  - `PATCH /admin/iam/users/:id`
  - `POST /admin/iam/users/:id/reset-password`
  - `PUT /admin/iam/users/:id/roles`
  - `GET /admin/iam/users/:id/sessions`
  - `GET /admin/iam/roles`
  - `POST /admin/iam/roles`
  - `GET /admin/iam/roles/:id`
  - `PATCH /admin/iam/roles/:id`
  - `GET /admin/iam/permissions`
  - `PUT /admin/iam/roles/:id/permissions`
  - `POST /admin/iam/sessions/:id/revoke`

### 2. CRUD administrativo de usuários
- listagem paginada com filtros por busca e ativo/inativo;
- criação de usuário com senha inicial segura e exigência opcional de troca;
- edição administrativa de e-mail, username, nome, unidade, status e flag de troca de senha;
- redefinição administrativa de senha com limpeza de bloqueio/tentativas;
- substituição de papéis do usuário;
- listagem de sessões do usuário e revogação administrativa.

### 3. CRUD administrativo de papéis
- listagem de papéis com contagem de usuários e permissões;
- criação de novos papéis;
- edição de nome e descrição;
- carregamento do detalhe do papel com permissões associadas;
- substituição integral da matriz de permissões por papel.

### 4. Auditoria de operações sensíveis
- auditados no backend:
  - `user.created`
  - `user.updated`
  - `user.disabled`
  - `user.password.reset`
  - `user.roles.updated`
  - `role.created`
  - `role.updated`
  - `role.permissions.updated`
  - `session.revoked`
- as rotas passaram o `requestId` real do request context para os eventos de auditoria, melhorando correlação operacional.

### 5. Medidas contra autoelevação indevida
- bloqueio de alteração dos próprios privilégios ou auto desativação;
- bloqueio de edição da definição de um papel atualmente atribuído ao próprio ator;
- essas regras foram centralizadas no service administrativo, não no frontend.

### 6. Frontend administrativo mínimo
- criada navegação administrativa em `Configurações`:
  - `Usuários`
  - `Papéis e Permissões`
- criadas telas:
  - `/settings/users`
  - `/settings/users/[id]`
  - `/settings/roles`
- o frontend consome apenas os endpoints protegidos do backend e usa permissões só como reflexo de UX.

## Itens não concluídos
- não foi implementado CRUD de permissões como catálogo editável; nesta fase a gestão é de atribuição por papel;
- não houve ainda UI para escopos (`access_scopes` / `user_scope_assignments`);
- permissões especiais diretamente no usuário continuam fora do MVP atual;
- não foi criada tela dedicada para leitura de audit logs nesta fase;
- a experiência administrativa ainda não tem busca avançada, paginação de papéis e refinamentos de UX.

## Decisões técnicas
- manter o backend como autoridade total de autorização e auditoria;
- reutilizar o catálogo relacional já criado nas fases anteriores sem introduzir papel hardcoded;
- usar substituição integral de relações (`user_roles`, `role_permissions`) para simplificar consistência inicial do CRUD;
- mover o hash de senha administrativa para o módulo administrativo, reduzindo acoplamento com as rotas públicas de auth;
- reaproveitar `requestContext.requestId` nas ações auditadas para rastreabilidade entre API, logs e auditoria.

## Estruturas criadas ou alteradas

### Backend
- criado:
  - `apps/his-api/src/modules/adminIam/schemas.ts`
  - `apps/his-api/src/modules/adminIam/service.ts`
  - `apps/his-api/src/modules/adminIam/routes.ts`
  - `apps/his-api/src/modules/adminIam/routes.test.ts`
- alterado:
  - `apps/his-api/src/routes/index.ts`

### Frontend
- criado:
  - `apps/his-web/src/app/settings/users/page.tsx`
  - `apps/his-web/src/app/settings/users/[id]/page.tsx`
  - `apps/his-web/src/app/settings/roles/page.tsx`
- alterado:
  - `apps/his-web/src/lib/api.ts`
  - `apps/his-web/src/config/navigation.ts`

## Arquivos modificados
- `apps/his-api/src/modules/adminIam/schemas.ts`
- `apps/his-api/src/modules/adminIam/service.ts`
- `apps/his-api/src/modules/adminIam/routes.ts`
- `apps/his-api/src/modules/adminIam/routes.test.ts`
- `apps/his-api/src/routes/index.ts`
- `apps/his-web/src/lib/api.ts`
- `apps/his-web/src/config/navigation.ts`
- `apps/his-web/src/app/settings/users/page.tsx`
- `apps/his-web/src/app/settings/users/[id]/page.tsx`
- `apps/his-web/src/app/settings/roles/page.tsx`

## Migrações criadas
- nenhuma nova migration nesta fase

## Seeds criadas ou alteradas
- nenhuma seed adicional nesta fase

## Endpoints criados ou alterados
- criados:
  - `GET /admin/iam/users`
  - `POST /admin/iam/users`
  - `GET /admin/iam/users/:id`
  - `PATCH /admin/iam/users/:id`
  - `POST /admin/iam/users/:id/reset-password`
  - `PUT /admin/iam/users/:id/roles`
  - `GET /admin/iam/users/:id/sessions`
  - `GET /admin/iam/roles`
  - `POST /admin/iam/roles`
  - `GET /admin/iam/roles/:id`
  - `PATCH /admin/iam/roles/:id`
  - `GET /admin/iam/permissions`
  - `PUT /admin/iam/roles/:id/permissions`
  - `POST /admin/iam/sessions/:id/revoke`

## Telas criadas ou alteradas
- criadas:
  - `/settings/users`
  - `/settings/users/[id]`
  - `/settings/roles`
- alterada:
  - navegação principal para expor administração IAM conforme permissão

## Testes criados
- `apps/his-api/src/modules/adminIam/routes.test.ts`
  - valida bloqueio de autoalteração de privilégios
  - valida bloqueio de edição do próprio papel efetivo

## Validação executada
- `corepack pnpm --filter @cvg-his/his-api exec vitest run src/modules/adminIam/routes.test.ts src/modules/auth/routes.test.ts src/middlewares/requirePermission.security.test.ts` ✅
- `corepack pnpm --filter @cvg-his/his-api build` ✅
- `corepack pnpm --filter @cvg-his/his-web build` ✅

## Medidas contra abuso de privilégio
- o usuário não pode trocar os próprios papéis;
- o usuário não pode se auto desativar pela operação administrativa;
- o usuário não pode alterar permissões do papel atualmente atribuído à própria conta;
- a revogação de sessão e reset administrativo de senha são auditados no backend.

## Riscos
- a substituição integral de papéis/permissões exige atenção em ambiente multiadmin para evitar sobrescrita concorrente;
- ainda não há política de aprovação dupla para resets e mudanças críticas;
- falta UI para escopos, então a fase ainda opera majoritariamente em RBAC puro;
- o build web atual do projeto continua pulando validação de tipos/lint no `next build`, então a checagem principal segue sendo a compilação/execução funcional já validada.

## Débitos técnicos
- encapsular melhor serialização/normalização de respostas administrativas;
- adicionar testes para fluxo feliz de criação/edição e revogação de sessão;
- introduzir operações transacionais explícitas para troca simultânea de metadados e relações;
- criar tela de auditoria administrativa e visualização de sessões por dispositivo.

## Dependências da próxima fase
- aplicar regras hospitalares iniciais por perfil e módulo real;
- integrar melhor permissões com módulos clínicos, assistenciais, estoque e financeiro;
- começar a usar escopos para setor/unidade/contexto;
- ampliar auditoria para recursos hospitalares sensíveis.

## Próximos passos
- iniciar Fase 5 com matriz hospitalar inicial por perfil;
- reforçar separação entre leitura e escrita em contextos clínicos;
- revisar permissões default para recepção, veterinário, residente, enfermagem, laboratório, imagem, estoque/farmácia, financeiro e administrativo;
- preparar backlog pós-MVP com MFA, supervisão, assinatura clínica e break-glass.
